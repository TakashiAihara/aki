/**
 * Contract Tests for POST /auth/device/code
 *
 * Tests the device code request endpoint for CLI authentication.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('POST /auth/device/code (Contract)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    // Clean up device codes
    await dataSource.query('DELETE FROM device_codes WHERE device_code LIKE $1', ['test-%']);
    await app.close();
  });

  describe('Success Cases', () => {
    it('should return device code and user code', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({ client_id: 'akimi-cli' })
        .expect(200);

      expect(response.body).toMatchObject({
        device_code: expect.any(String),
        user_code: expect.stringMatching(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/),
        verification_uri: expect.stringContaining('/auth/device'),
        verification_uri_complete: expect.any(String),
        expires_in: expect.any(Number),
        interval: expect.any(Number),
      });
    });

    it('should return user code in XXXX-XXXX format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({ client_id: 'akimi-cli' })
        .expect(200);

      expect(response.body.user_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should return 15-minute expiration', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({ client_id: 'akimi-cli' })
        .expect(200);

      // 15 minutes = 900 seconds
      expect(response.body.expires_in).toBe(900);
    });

    it('should return 5-second polling interval', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({ client_id: 'akimi-cli' })
        .expect(200);

      expect(response.body.interval).toBe(5);
    });

    it('should include complete verification URI with user code', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({ client_id: 'akimi-cli' })
        .expect(200);

      expect(response.body.verification_uri_complete).toContain(response.body.user_code);
    });
  });

  describe('Error Cases', () => {
    it('should return 400 for missing client_id', async () => {
      await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({})
        .expect(400);
    });

    it('should return 400 for invalid client_id', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({ client_id: 'invalid-client' })
        .expect(400);

      expect(response.body.error).toBe('invalid_client');
    });
  });

  describe('Contract Shape', () => {
    it('should return proper OAuth 2.0 Device Authorization response shape', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/device/code')
        .send({ client_id: 'akimi-cli' })
        .expect(200);

      // Per RFC 8628
      expect(response.body).toHaveProperty('device_code');
      expect(response.body).toHaveProperty('user_code');
      expect(response.body).toHaveProperty('verification_uri');
      expect(response.body).toHaveProperty('expires_in');
      expect(response.body).toHaveProperty('interval');
    });
  });
});
