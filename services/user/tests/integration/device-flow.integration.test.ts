/**
 * Integration Tests for OAuth 2.0 Device Flow
 *
 * Tests the complete device authorization flow for CLI authentication.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserStatus } from '../../src/domain/entities/user.entity';
import { DeviceCode, DeviceCodeStatus } from '../../src/domain/entities/device-code.entity';
import { JwtService } from '../../src/infrastructure/auth/jwt.service';

describe('Device Flow (Integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let testUser: User;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  beforeEach(async () => {
    // Create test user
    const userRepo = dataSource.getRepository(User);
    testUser = userRepo.create({
      email: `test-${Date.now()}@example.com`,
      displayName: 'Test User',
      status: UserStatus.ACTIVE,
    });
    testUser = await userRepo.save(testUser);

    // Generate access token
    const tokenPair = await jwtService.generateTokenPair(
      testUser.id,
      testUser.email,
      undefined,
    );
    accessToken = tokenPair.accessToken;
  });

  afterEach(async () => {
    // Clean up
    await dataSource.query('DELETE FROM device_codes WHERE user_id = $1', [testUser?.id]);
    await dataSource.query('DELETE FROM auth_events WHERE user_id = $1', [testUser?.id]);
    await dataSource.query('DELETE FROM refresh_tokens WHERE user_id = $1', [testUser?.id]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [testUser?.id]);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Device Flow', () => {
    it('should complete full device authorization flow', async () => {
      // Step 1: Request device code
      const deviceCodeResponse = await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({ client_id: 'aki-cli' })
        .expect(200);

      const { device_code, user_code } = deviceCodeResponse.body;

      expect(user_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

      // Step 2: Initial poll should return authorization_pending
      const pendingResponse = await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code,
          client_id: 'aki-cli',
        })
        .expect(400);

      expect(pendingResponse.body.error).toBe('authorization_pending');

      // Step 3: User authorizes (simulated - in real flow this would be via web)
      await request(app.getHttpServer())
        .post('/auth/device/authorize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ user_code })
        .expect(200);

      // Step 4: Wait for polling interval then poll again
      await new Promise((resolve) => setTimeout(resolve, 100)); // Short wait for test

      // Update last_polled_at to allow immediate poll in test
      const deviceCodeRepo = dataSource.getRepository(DeviceCode);
      await deviceCodeRepo.update(
        { deviceCode: device_code },
        { lastPolledAt: new Date(Date.now() - 6000) }, // 6 seconds ago
      );

      const tokenResponse = await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code,
          client_id: 'aki-cli',
        })
        .expect(200);

      expect(tokenResponse.body).toMatchObject({
        access_token: expect.any(String),
        token_type: 'Bearer',
        expires_in: expect.any(Number),
        refresh_token: expect.any(String),
      });
    });

    it('should allow user to deny authorization', async () => {
      // Step 1: Request device code
      const deviceCodeResponse = await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({ client_id: 'aki-cli' })
        .expect(200);

      const { device_code, user_code } = deviceCodeResponse.body;

      // Step 2: User denies
      await request(app.getHttpServer())
        .post('/auth/device/deny')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ user_code })
        .expect(200);

      // Step 3: Poll should return access_denied
      // Update last_polled_at to allow immediate poll
      const deviceCodeRepo = dataSource.getRepository(DeviceCode);
      await deviceCodeRepo.update(
        { deviceCode: device_code },
        { lastPolledAt: new Date(Date.now() - 6000) },
      );

      const tokenResponse = await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code,
          client_id: 'aki-cli',
        })
        .expect(400);

      expect(tokenResponse.body.error).toBe('access_denied');
    });
  });

  describe('Device Code Expiration', () => {
    it('should expire device codes after 15 minutes', async () => {
      // Create device code
      const deviceCodeResponse = await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({ client_id: 'aki-cli' })
        .expect(200);

      const { device_code } = deviceCodeResponse.body;

      // Manually expire the device code
      const deviceCodeRepo = dataSource.getRepository(DeviceCode);
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 1);
      await deviceCodeRepo.update(
        { deviceCode: device_code },
        { expiresAt: pastDate, lastPolledAt: new Date(Date.now() - 6000) },
      );

      // Poll should return expired_token
      const tokenResponse = await request(app.getHttpServer())
        .post('/auth/device/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code,
          client_id: 'aki-cli',
        })
        .expect(400);

      expect(tokenResponse.body.error).toBe('expired_token');
    });
  });

  describe('User Code Lookup', () => {
    it('should return device code info when user enters valid code', async () => {
      // Create device code
      const deviceCodeResponse = await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({ client_id: 'aki-cli' })
        .expect(200);

      const { user_code } = deviceCodeResponse.body;

      // Look up the user code
      const lookupResponse = await request(app.getHttpServer())
        .get(`/auth/device/verify?code=${user_code}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(lookupResponse.body).toMatchObject({
        client_id: 'aki-cli',
        user_code,
        status: 'pending',
      });
    });

    it('should return 404 for invalid user code', async () => {
      await request(app.getHttpServer())
        .get('/auth/device/verify?code=INVALID-CODE')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('CLI Display', () => {
    it('should return human-readable verification URI', async () => {
      const deviceCodeResponse = await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({ client_id: 'aki-cli' })
        .expect(200);

      // Verification URI should be user-friendly
      expect(deviceCodeResponse.body.verification_uri).toMatch(/^https?:\/\//);
      expect(deviceCodeResponse.body.verification_uri_complete).toContain('code=');
    });
  });
});
