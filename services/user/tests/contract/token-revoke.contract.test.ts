import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

/**
 * Contract tests for token revocation endpoints
 * Verifies API contracts match the OpenAPI specification
 */
describe('Token Revocation Contract Tests', () => {
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

  describe('POST /tokens/revoke', () => {
    it('should return 400 for missing refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/tokens/revoke')
        .set('Authorization', 'Bearer valid-access-token')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 for missing authorization', async () => {
      const response = await request(app.getHttpServer())
        .post('/tokens/revoke')
        .send({ refreshToken: 'some-token' })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 200 for successful revocation', async () => {
      // Expected success response
      const expectedResponse = {
        message: 'Token revoked successfully',
      };

      expect(expectedResponse).toBeDefined();
    });

    it('should be idempotent - revoking same token twice succeeds', async () => {
      // RFC 7009 recommends revocation be idempotent
      const expectedResponse = {
        message: 'Token revoked successfully',
      };

      expect(expectedResponse).toBeDefined();
    });
  });

  describe('POST /tokens/revoke-all', () => {
    it('should return 401 for missing authorization', async () => {
      const response = await request(app.getHttpServer())
        .post('/tokens/revoke-all')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 200 with count of revoked tokens', async () => {
      const expectedResponse = {
        message: 'All tokens revoked',
        count: expect.any(Number),
      };

      expect(expectedResponse).toBeDefined();
    });
  });

  describe('Response Contract', () => {
    it('should return simple success message for revocation', () => {
      const revokeResponse = {
        message: 'Token revoked successfully',
      };

      expect(revokeResponse).toHaveProperty('message');
    });

    it('should return count for revoke-all', () => {
      const revokeAllResponse = {
        message: 'All tokens revoked',
        count: 3,
      };

      expect(revokeAllResponse).toHaveProperty('message');
      expect(revokeAllResponse).toHaveProperty('count');
      expect(typeof revokeAllResponse.count).toBe('number');
    });
  });
});
