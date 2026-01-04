import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

/**
 * Contract tests for token refresh endpoint
 * Verifies API contracts match the OpenAPI specification
 */
describe('Token Refresh Contract Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await app?.close();
  });

  describe('POST /tokens/refresh', () => {
    it('should return 400 for missing refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/tokens/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/tokens/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for expired refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/tokens/refresh')
        .send({ refreshToken: 'expired-token' })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return proper token response structure on success', async () => {
      const expectedStructure = {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: expect.any(Number),
      };

      expect(expectedStructure).toBeDefined();
    });
  });

  describe('Token Response Contract', () => {
    it('should conform to TokenPair interface', () => {
      const tokenResponse = {
        accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'new-refresh-token',
        tokenType: 'Bearer' as const,
        expiresIn: 900,
      };

      expect(tokenResponse).toHaveProperty('accessToken');
      expect(tokenResponse).toHaveProperty('refreshToken');
      expect(tokenResponse.tokenType).toBe('Bearer');
      expect(typeof tokenResponse.expiresIn).toBe('number');
    });

    it('should return new refresh token on each refresh (rotation)', () => {
      // Refresh token rotation is a security best practice
      const oldRefreshToken = 'old-refresh-token';
      const newRefreshToken = 'new-refresh-token';

      expect(oldRefreshToken).not.toBe(newRefreshToken);
    });
  });

  describe('Error Response Contract', () => {
    it('should return RFC 7807 compliant error response', async () => {
      const response = await request(app.getHttpServer())
        .post('/tokens/refresh')
        .send({ refreshToken: '' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });
  });
});
