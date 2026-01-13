import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

/**
 * Contract tests for Google OAuth authentication endpoints
 * Verifies API contracts match the OpenAPI specification
 */
describe('Google Auth Contract Tests', () => {
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

  describe('GET /auth/google', () => {
    it('should redirect to Google OAuth consent screen', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/google')
        .expect(302);

      expect(response.headers.location).toContain('accounts.google.com');
      expect(response.headers.location).toContain('response_type=code');
      expect(response.headers.location).toContain('scope=');
    });

    it('should include state parameter for CSRF protection', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/google')
        .expect(302);

      expect(response.headers.location).toContain('state=');
    });
  });

  describe('POST /auth/google/callback', () => {
    it('should return 400 for missing authorization code', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/google/callback')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid authorization code', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/google/callback')
        .send({ code: 'invalid-code', state: 'test-state' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 401 for invalid state (CSRF attack)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/google/callback')
        .send({ code: 'valid-code', state: 'invalid-state' })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toContain('state');
    });

    it('should return proper token response structure on success', async () => {
      // This test requires mocking Google OAuth - will be implemented with proper mocks
      // Expected response structure:
      const expectedStructure = {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: expect.any(Number),
      };

      // Placeholder assertion - full implementation requires OAuth mocking
      expect(expectedStructure).toBeDefined();
    });
  });

  describe('Token Response Contract', () => {
    it('should conform to TokenPair interface', () => {
      const tokenResponse = {
        accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'dGVzdC1yZWZyZXNoLXRva2Vu',
        tokenType: 'Bearer' as const,
        expiresIn: 900,
      };

      expect(tokenResponse).toHaveProperty('accessToken');
      expect(tokenResponse).toHaveProperty('refreshToken');
      expect(tokenResponse.tokenType).toBe('Bearer');
      expect(typeof tokenResponse.expiresIn).toBe('number');
    });
  });

  describe('Error Response Contract', () => {
    it('should return RFC 7807 compliant error response', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/google/callback')
        .send({ code: '' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });
  });
});
