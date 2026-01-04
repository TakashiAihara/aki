/**
 * Contract Tests for POST /account/delete/cancel
 *
 * Tests the account deletion cancellation endpoint per spec.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtService } from '../../src/infrastructure/auth/jwt.service';
import { DataSource } from 'typeorm';
import { User } from '../../src/domain/entities/user.entity';

describe('POST /account/delete/cancel (Contract)', () => {
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
    // Create test user with pending deletion
    const userRepo = dataSource.getRepository(User);
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    testUser = userRepo.create({
      email: `test-${Date.now()}@example.com`,
      displayName: 'Test User',
      status: 'pending_deletion',
      deletionScheduledAt: deletionDate,
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
    it('should cancel deletion request and return 200 OK', async () => {
      const response = await request(app.getHttpServer())
        .post('/account/delete/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: expect.stringContaining('cancelled'),
      });
    });

    it('should restore user status to active', async () => {
      await request(app.getHttpServer())
        .post('/account/delete/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const userRepo = dataSource.getRepository(User);
      const updatedUser = await userRepo.findOne({ where: { id: testUser.id } });

      expect(updatedUser?.status).toBe('active');
      expect(updatedUser?.deletionScheduledAt).toBeNull();
    });

    it('should clear deletion_scheduled_at', async () => {
      await request(app.getHttpServer())
        .post('/account/delete/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const userRepo = dataSource.getRepository(User);
      const updatedUser = await userRepo.findOne({ where: { id: testUser.id } });

      expect(updatedUser?.deletionScheduledAt).toBeNull();
    });
  });

  describe('Error Cases', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/account/delete/cancel')
        .expect(401);
    });

    it('should return 409 if no deletion is pending', async () => {
      // First cancel the deletion
      await request(app.getHttpServer())
        .post('/account/delete/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Second cancel should conflict
      const response = await request(app.getHttpServer())
        .post('/account/delete/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(response.body.message).toContain('not scheduled');
    });

    it('should return 409 for active user without pending deletion', async () => {
      // Create active user
      const userRepo = dataSource.getRepository(User);
      const activeUser = userRepo.create({
        email: `active-${Date.now()}@example.com`,
        displayName: 'Active User',
        status: 'active',
      });
      await userRepo.save(activeUser);

      const tokenPair = await jwtService.generateTokenPair({
        sub: activeUser.id,
        email: activeUser.email,
        householdId: null,
      });

      const response = await request(app.getHttpServer())
        .post('/account/delete/cancel')
        .set('Authorization', `Bearer ${tokenPair.accessToken}`)
        .expect(409);

      expect(response.body.message).toContain('not scheduled');

      // Clean up
      await dataSource.query('DELETE FROM users WHERE id = $1', [activeUser.id]);
    });
  });

  describe('Contract Shape', () => {
    it('should return proper response shape', async () => {
      const response = await request(app.getHttpServer())
        .post('/account/delete/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });
  });
});
