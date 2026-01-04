/**
 * Contract Tests for POST /auth/device/token
 *
 * Tests the device token polling endpoint for CLI authentication.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { DeviceCode, DeviceCodeStatus } from '../../src/domain/entities/device-code.entity';

describe('POST /auth/device/token (Contract)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let deviceCode: DeviceCode;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // Create a device code for testing
    const deviceCodeRepo = dataSource.getRepository(DeviceCode);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    deviceCode = deviceCodeRepo.create({
      deviceCode: `test-device-${Date.now()}`,
      userCode: 'TEST-1234',
      clientId: 'akimi-cli',
      expiresAt,
      status: DeviceCodeStatus.PENDING,
      interval: 5,
    });
    deviceCode = await deviceCodeRepo.save(deviceCode);
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM device_codes WHERE device_code = $1', [deviceCode?.deviceCode]);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Pending Authorization', () => {
    it('should return authorization_pending error when not yet authorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode.deviceCode,
          client_id: 'akimi-cli',
        })
        .expect(400);

      expect(response.body.error).toBe('authorization_pending');
    });
  });

  describe('Successful Authorization', () => {
    it('should return tokens when device is authorized', async () => {
      // Authorize the device code
      const deviceCodeRepo = dataSource.getRepository(DeviceCode);
      await deviceCodeRepo.update(deviceCode.id, {
        status: DeviceCodeStatus.AUTHORIZED,
        userId: 'test-user-id',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode.deviceCode,
          client_id: 'akimi-cli',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        access_token: expect.any(String),
        token_type: 'Bearer',
        expires_in: expect.any(Number),
        refresh_token: expect.any(String),
      });
    });
  });

  describe('Error Cases', () => {
    it('should return expired_token error for expired device code', async () => {
      // Set device code as expired
      const deviceCodeRepo = dataSource.getRepository(DeviceCode);
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 1);
      await deviceCodeRepo.update(deviceCode.id, { expiresAt: pastDate });

      const response = await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode.deviceCode,
          client_id: 'akimi-cli',
        })
        .expect(400);

      expect(response.body.error).toBe('expired_token');
    });

    it('should return access_denied error when user denies authorization', async () => {
      // Mark device code as denied
      const deviceCodeRepo = dataSource.getRepository(DeviceCode);
      await deviceCodeRepo.update(deviceCode.id, { status: DeviceCodeStatus.DENIED });

      const response = await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode.deviceCode,
          client_id: 'akimi-cli',
        })
        .expect(400);

      expect(response.body.error).toBe('access_denied');
    });

    it('should return invalid_grant for non-existent device code', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: 'nonexistent-code',
          client_id: 'akimi-cli',
        })
        .expect(400);

      expect(response.body.error).toBe('invalid_grant');
    });

    it('should return slow_down error for too fast polling', async () => {
      // First request
      await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode.deviceCode,
          client_id: 'akimi-cli',
        });

      // Immediate second request (should be rate limited)
      const response = await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode.deviceCode,
          client_id: 'akimi-cli',
        })
        .expect(400);

      expect(response.body.error).toBe('slow_down');
    });

    it('should return unsupported_grant_type for wrong grant type', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'authorization_code',
          device_code: deviceCode.deviceCode,
          client_id: 'akimi-cli',
        })
        .expect(400);

      expect(response.body.error).toBe('unsupported_grant_type');
    });
  });

  describe('Contract Shape', () => {
    it('should return proper OAuth 2.0 error response shape', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode.deviceCode,
          client_id: 'akimi-cli',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      // error_description is optional but recommended
    });
  });
});
