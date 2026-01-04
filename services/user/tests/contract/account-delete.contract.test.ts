/**
 * Contract Tests for POST /account/delete
 *
 * Tests the account deletion request endpoint per spec.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtService } from '../../src/infrastructure/auth/jwt.service';
import { DataSource } from 'typeorm';
import { User } from '../../src/domain/entities/user.entity';

describe('POST /account/delete (Contract)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let dataSource: DataSource;
  let testUser: User;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // Create test user
    const userRepo = dataSource.getRepository(User);
    testUser = userRepo.create({
      email: `test-${Date.now()}@example.com`,
      displayName: 'Test User',
      status: 'active',
    });
    testUser = await userRepo.save(testUser);

    // Generate access token
    const tokenPair = await jwtService.generateTokenPair({
      sub: testUser.id,
      email: testUser.email,
      householdId: null,
    });
    accessToken = tokenPair.accessToken;
  });

  afterEach(async () => {
    // Clean up test data
    await dataSource.query('DELETE FROM auth_events WHERE user_id = $1', [testUser?.id]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [testUser?.id]);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Success Cases', () => {
    it('should accept deletion request and return 202 Accepted', async () => {
      const response = await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      expect(response.body).toMatchObject({
        message: expect.stringContaining('scheduled for deletion'),
        deletionScheduledAt: expect.any(String),
        gracePeriodDays: 30,
      });
    });

    it('should set deletion_scheduled_at to 30 days from now', async () => {
      const beforeRequest = new Date();

      const response = await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      const scheduledDate = new Date(response.body.deletionScheduledAt);
      const expectedDate = new Date(beforeRequest);
      expectedDate.setDate(expectedDate.getDate() + 30);

      // Allow 1 minute tolerance
      expect(Math.abs(scheduledDate.getTime() - expectedDate.getTime())).toBeLessThan(60000);
    });

    it('should update user status to pending_deletion', async () => {
      await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      const userRepo = dataSource.getRepository(User);
      const updatedUser = await userRepo.findOne({ where: { id: testUser.id } });

      expect(updatedUser?.status).toBe('pending_deletion');
      expect(updatedUser?.deletionScheduledAt).toBeDefined();
    });
  });

  describe('Error Cases', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/account/delete')
        .expect(401);
    });

    it('should return 409 if deletion already requested', async () => {
      // First request
      await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      // Second request should conflict
      const response = await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(response.body.message).toContain('already scheduled');
    });
  });

  describe('Contract Shape', () => {
    it('should return proper response shape', async () => {
      const response = await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('deletionScheduledAt');
      expect(response.body).toHaveProperty('gracePeriodDays');
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.gracePeriodDays).toBe('number');
    });
  });
});
