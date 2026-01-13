/**
 * Unit Tests for DeviceFlowUseCase
 *
 * Tests device flow business logic in isolation.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeviceFlowUseCase } from '../../src/application/auth/device-flow.usecase';
import { DeviceCode, DeviceCodeStatus } from '../../src/domain/entities/device-code.entity';
import { JwtService } from '../../src/infrastructure/auth/jwt.service';
import { RefreshTokenService } from '../../src/application/auth/refresh-token.service';
import { AuthEventService } from '../../src/application/auth/auth-event.service';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('DeviceFlowUseCase', () => {
  let useCase: DeviceFlowUseCase;
  let mockDeviceCodeRepository: Partial<Repository<DeviceCode>>;
  let mockJwtService: Partial<JwtService>;
  let mockRefreshTokenService: Partial<RefreshTokenService>;
  let mockAuthEventService: Partial<AuthEventService>;
  let mockConfigService: Partial<ConfigService>;

  const validClientIds = ['aki-cli'];

  beforeEach(async () => {
    mockDeviceCodeRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    mockJwtService = {
      generateTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
      }),
    };

    mockRefreshTokenService = {
      storeRefreshToken: jest.fn().mockResolvedValue({}),
    };

    mockAuthEventService = {
      logLoginSuccess: jest.fn().mockResolvedValue({}),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'APP_URL') return 'https://aki.app';
        if (key === 'DEVICE_FLOW_CLIENT_IDS') return 'aki-cli';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceFlowUseCase,
        {
          provide: getRepositoryToken(DeviceCode),
          useValue: mockDeviceCodeRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
        {
          provide: AuthEventService,
          useValue: mockAuthEventService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    useCase = module.get<DeviceFlowUseCase>(DeviceFlowUseCase);
  });

  describe('requestDeviceCode', () => {
    it('should generate device code and user code', async () => {
      (mockDeviceCodeRepository.create as jest.Mock).mockReturnValue({
        id: '1',
        deviceCode: 'device-code',
        userCode: 'ABCD-1234',
      });
      (mockDeviceCodeRepository.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await useCase.requestDeviceCode('aki-cli');

      expect(result.device_code).toBeDefined();
      expect(result.user_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(result.expires_in).toBe(900);
      expect(result.interval).toBe(5);
    });

    it('should reject invalid client_id', async () => {
      await expect(useCase.requestDeviceCode('invalid-client')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include verification URIs', async () => {
      (mockDeviceCodeRepository.create as jest.Mock).mockReturnValue({
        id: '1',
        deviceCode: 'device-code',
        userCode: 'ABCD-1234',
      });
      (mockDeviceCodeRepository.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await useCase.requestDeviceCode('aki-cli');

      expect(result.verification_uri).toBe('https://aki.app/auth/device');
      expect(result.verification_uri_complete).toContain(result.user_code);
    });
  });

  describe('pollForToken', () => {
    const mockDeviceCode: Partial<DeviceCode> = {
      id: '1',
      deviceCode: 'test-device-code',
      userCode: 'TEST-1234',
      clientId: 'aki-cli',
      status: DeviceCodeStatus.PENDING,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      interval: 5,
      lastPolledAt: null,
    };

    it('should return authorization_pending for pending device code', async () => {
      (mockDeviceCodeRepository.findOne as jest.Mock).mockResolvedValue({ ...mockDeviceCode });

      await expect(
        useCase.pollForToken('test-device-code', 'aki-cli'),
      ).rejects.toMatchObject({
        response: { error: 'authorization_pending' },
      });
    });

    it('should return tokens when authorized', async () => {
      const authorizedCode = {
        ...mockDeviceCode,
        status: DeviceCodeStatus.AUTHORIZED,
        userId: 'user-123',
        lastPolledAt: new Date(Date.now() - 6000), // 6 seconds ago
      };
      (mockDeviceCodeRepository.findOne as jest.Mock).mockResolvedValue(authorizedCode);

      const result = await useCase.pollForToken('test-device-code', 'aki-cli');

      expect(result.access_token).toBeDefined();
      expect(result.token_type).toBe('Bearer');
      expect(result.refresh_token).toBeDefined();
    });

    it('should return expired_token for expired device code', async () => {
      const expiredCode = {
        ...mockDeviceCode,
        expiresAt: new Date(Date.now() - 1000),
        lastPolledAt: new Date(Date.now() - 6000),
      };
      (mockDeviceCodeRepository.findOne as jest.Mock).mockResolvedValue(expiredCode);

      await expect(
        useCase.pollForToken('test-device-code', 'aki-cli'),
      ).rejects.toMatchObject({
        response: { error: 'expired_token' },
      });
    });

    it('should return access_denied for denied device code', async () => {
      const deniedCode = {
        ...mockDeviceCode,
        status: DeviceCodeStatus.DENIED,
        lastPolledAt: new Date(Date.now() - 6000),
      };
      (mockDeviceCodeRepository.findOne as jest.Mock).mockResolvedValue(deniedCode);

      await expect(
        useCase.pollForToken('test-device-code', 'aki-cli'),
      ).rejects.toMatchObject({
        response: { error: 'access_denied' },
      });
    });

    it('should return slow_down for too fast polling', async () => {
      const recentlyPolled = {
        ...mockDeviceCode,
        lastPolledAt: new Date(), // Just now
      };
      (mockDeviceCodeRepository.findOne as jest.Mock).mockResolvedValue(recentlyPolled);

      await expect(
        useCase.pollForToken('test-device-code', 'aki-cli'),
      ).rejects.toMatchObject({
        response: { error: 'slow_down' },
      });
    });

    it('should return invalid_grant for non-existent device code', async () => {
      (mockDeviceCodeRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        useCase.pollForToken('nonexistent', 'aki-cli'),
      ).rejects.toMatchObject({
        response: { error: 'invalid_grant' },
      });
    });
  });

  describe('authorizeDevice', () => {
    const mockDeviceCode: Partial<DeviceCode> = {
      id: '1',
      deviceCode: 'test-device-code',
      userCode: 'TEST-1234',
      clientId: 'aki-cli',
      status: DeviceCodeStatus.PENDING,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };

    it('should authorize device code', async () => {
      (mockDeviceCodeRepository.findOne as jest.Mock).mockResolvedValue({ ...mockDeviceCode });

      await useCase.authorizeDevice('TEST-1234', 'user-123');

      expect(mockDeviceCodeRepository.update).toHaveBeenCalledWith(
        mockDeviceCode.id,
        expect.objectContaining({
          status: DeviceCodeStatus.AUTHORIZED,
          userId: 'user-123',
        }),
      );
    });

    it('should throw NotFoundException for invalid user code', async () => {
      (mockDeviceCodeRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        useCase.authorizeDevice('INVALID-CODE', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for expired device code', async () => {
      const expiredCode = {
        ...mockDeviceCode,
        expiresAt: new Date(Date.now() - 1000),
      };
      (mockDeviceCodeRepository.findOne as jest.Mock).mockResolvedValue(expiredCode);

      await expect(
        useCase.authorizeDevice('TEST-1234', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('denyDevice', () => {
    it('should deny device code', async () => {
      const mockCode = {
        id: '1',
        userCode: 'TEST-1234',
        status: DeviceCodeStatus.PENDING,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };
      (mockDeviceCodeRepository.findOne as jest.Mock).mockResolvedValue(mockCode);

      await useCase.denyDevice('TEST-1234');

      expect(mockDeviceCodeRepository.update).toHaveBeenCalledWith(
        mockCode.id,
        expect.objectContaining({
          status: DeviceCodeStatus.DENIED,
        }),
      );
    });
  });

  describe('user code generation', () => {
    it('should generate user-friendly 8-character codes', async () => {
      (mockDeviceCodeRepository.create as jest.Mock).mockReturnValue({
        id: '1',
        deviceCode: 'device-code',
        userCode: 'ABCD-1234',
      });
      (mockDeviceCodeRepository.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await useCase.requestDeviceCode('aki-cli');

      // Format: XXXX-XXXX (8 chars + hyphen)
      expect(result.user_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(result.user_code.replace('-', '')).toHaveLength(8);
    });

    it('should exclude ambiguous characters from user codes', async () => {
      (mockDeviceCodeRepository.create as jest.Mock).mockReturnValue({
        id: '1',
        deviceCode: 'device-code',
        userCode: 'ABCD-1234',
      });
      (mockDeviceCodeRepository.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      // Generate multiple codes to check for ambiguous chars
      for (let i = 0; i < 10; i++) {
        const result = await useCase.requestDeviceCode('aki-cli');
        const code = result.user_code.replace('-', '');

        // Should not contain 0, O, 1, I, L (ambiguous)
        expect(code).not.toMatch(/[0O1IL]/);
      }
    });
  });
});
