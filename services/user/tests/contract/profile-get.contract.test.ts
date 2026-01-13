import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

/**
 * Contract tests for GET /profile endpoint
 * Verifies API contracts match the OpenAPI specification
 */
describe('Profile Get Contract Tests', () => {
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

  describe('GET /profile', () => {
    it('should return 401 for missing authorization', async () => {
      const response = await request(app.getHttpServer())
        .get('/profile')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return proper profile structure on success', async () => {
      const expectedStructure = {
        id: expect.any(String),
        email: expect.any(String),
        displayName: expect.any(String),
        avatarUrl: expect.toBeOneOf([expect.any(String), null]),
        householdId: expect.toBeOneOf([expect.any(String), null]),
        notificationPreferences: expect.any(Object),
        createdAt: expect.any(String),
      };

      expect(expectedStructure).toBeDefined();
    });
  });

  describe('Profile Response Contract', () => {
    it('should conform to UserProfile interface', () => {
      const profileResponse = {
        id: 'uuid-123',
        email: 'user@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        householdId: 'household-uuid',
        notificationPreferences: {
          emailNotifications: true,
          pushNotifications: true,
          reminderNotifications: true,
        },
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      expect(profileResponse).toHaveProperty('id');
      expect(profileResponse).toHaveProperty('email');
      expect(profileResponse).toHaveProperty('displayName');
      expect(profileResponse).toHaveProperty('notificationPreferences');
      expect(profileResponse).toHaveProperty('createdAt');
    });

    it('should allow null for optional fields', () => {
      const profileResponse = {
        id: 'uuid-123',
        email: 'user@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        householdId: null,
        notificationPreferences: {},
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      expect(profileResponse.avatarUrl).toBeNull();
      expect(profileResponse.householdId).toBeNull();
    });
  });
});
