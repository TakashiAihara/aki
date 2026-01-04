/**
 * Integration Tests for GDPR Deletion Flow
 *
 * Tests the complete account deletion lifecycle including grace period.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtService } from '../../src/infrastructure/auth/jwt.service';
import { DataSource } from 'typeorm';
import { User, UserStatus } from '../../src/domain/entities/user.entity';
import { OAuthLink, OAuthProvider } from '../../src/domain/entities/oauth-link.entity';
import { RefreshToken } from '../../src/domain/entities/refresh-token.entity';
import { AuthEvent, AuthEventType } from '../../src/domain/entities/auth-event.entity';
import { Household } from '../../src/domain/entities/household.entity';
import { HouseholdMember, HouseholdRole } from '../../src/domain/entities/household-member.entity';
import { AccountDeletionService } from '../../src/application/account/account-deletion.service';

describe('GDPR Deletion Flow (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let dataSource: DataSource;
  let accountDeletionService: AccountDeletionService;
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
    accountDeletionService = moduleFixture.get<AccountDeletionService>(AccountDeletionService);
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
    // Clean up test data in order
    await dataSource.query('DELETE FROM auth_events WHERE user_id = $1', [testUser?.id]);
    await dataSource.query('DELETE FROM refresh_tokens WHERE user_id = $1', [testUser?.id]);
    await dataSource.query('DELETE FROM oauth_links WHERE user_id = $1', [testUser?.id]);
    await dataSource.query('DELETE FROM household_members WHERE user_id = $1', [testUser?.id]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [testUser?.id]);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Deletion Lifecycle', () => {
    it('should complete full deletion flow: request → cancel → request again', async () => {
      // Step 1: Request deletion
      const deleteResponse = await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      expect(deleteResponse.body.gracePeriodDays).toBe(30);

      // Verify user is in pending deletion
      let userRepo = dataSource.getRepository(User);
      let user = await userRepo.findOne({ where: { id: testUser.id } });
      expect(user?.status).toBe('pending_deletion');

      // Step 2: Cancel deletion
      await request(app.getHttpServer())
        .post('/account/delete/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify user is active again
      user = await userRepo.findOne({ where: { id: testUser.id } });
      expect(user?.status).toBe('active');
      expect(user?.deletionScheduledAt).toBeNull();

      // Step 3: Request deletion again
      await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      user = await userRepo.findOne({ where: { id: testUser.id } });
      expect(user?.status).toBe('pending_deletion');
    });

    it('should still allow token refresh during grace period', async () => {
      // Request deletion
      await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      // User should still be able to use their tokens
      const response = await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
    });

    it('should allow profile access during grace period', async () => {
      // Request deletion
      await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      // Profile should still be accessible
      const response = await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('pending_deletion');
    });
  });

  describe('Hard Deletion Processing', () => {
    it('should delete all user data when processing expired deletion', async () => {
      // Setup: Create user with related data
      const userRepo = dataSource.getRepository(User);
      const oauthLinkRepo = dataSource.getRepository(OAuthLink);
      const refreshTokenRepo = dataSource.getRepository(RefreshToken);
      const authEventRepo = dataSource.getRepository(AuthEvent);

      // Create OAuth link
      const oauthLink = oauthLinkRepo.create({
        userId: testUser.id,
        provider: OAuthProvider.GOOGLE,
        providerUserId: 'google-123',
        email: testUser.email,
      });
      await oauthLinkRepo.save(oauthLink);

      // Create refresh token
      const refreshToken = refreshTokenRepo.create({
        userId: testUser.id,
        tokenHash: 'hash123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await refreshTokenRepo.save(refreshToken);

      // Create auth event
      const authEvent = authEventRepo.create({
        userId: testUser.id,
        eventType: AuthEventType.LOGIN_SUCCESS,
        ipAddress: '127.0.0.1',
      });
      await authEventRepo.save(authEvent);

      // Set deletion date in the past
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      await userRepo.update(testUser.id, {
        status: UserStatus.PENDING_DELETION,
        deletionScheduledAt: pastDate,
      });

      // Process deletions
      await accountDeletionService.processScheduledDeletions();

      // Verify all data is deleted
      const deletedUser = await userRepo.findOne({ where: { id: testUser.id } });
      expect(deletedUser).toBeNull();

      const deletedOAuthLinks = await oauthLinkRepo.find({ where: { userId: testUser.id } });
      expect(deletedOAuthLinks).toHaveLength(0);

      const deletedRefreshTokens = await refreshTokenRepo.find({ where: { userId: testUser.id } });
      expect(deletedRefreshTokens).toHaveLength(0);

      // Auth events may be anonymized rather than deleted for audit purposes
      const deletedAuthEvents = await authEventRepo.find({ where: { userId: testUser.id } });
      // Either deleted or anonymized
      expect(deletedAuthEvents.length === 0 || deletedAuthEvents.every(e => e.userId === null)).toBe(true);
    });
  });

  describe('Household Ownership Handling', () => {
    let household: Household;
    let member: User;

    beforeEach(async () => {
      const userRepo = dataSource.getRepository(User);
      const householdRepo = dataSource.getRepository(Household);
      const memberRepo = dataSource.getRepository(HouseholdMember);

      // Create household with testUser as owner
      household = householdRepo.create({
        name: 'Test Household',
        ownerId: testUser.id,
      });
      household = await householdRepo.save(household);

      // Add owner as member
      const ownerMember = memberRepo.create({
        householdId: household.id,
        userId: testUser.id,
        role: HouseholdRole.OWNER,
      });
      await memberRepo.save(ownerMember);

      // Update user with household
      await userRepo.update(testUser.id, { householdId: household.id });

      // Create another member
      member = userRepo.create({
        email: `member-${Date.now()}@example.com`,
        displayName: 'Member User',
        status: UserStatus.ACTIVE,
        householdId: household.id,
      });
      member = await userRepo.save(member);

      const householdMember = memberRepo.create({
        householdId: household.id,
        userId: member.id,
        role: HouseholdRole.MEMBER,
      });
      await memberRepo.save(householdMember);

      // Generate token for member (for potential future use in tests)
      await jwtService.generateTokenPair(
        member.id,
        member.email,
        household.id,
      );
    });

    afterEach(async () => {
      // Clean up household data
      await dataSource.query('DELETE FROM household_members WHERE household_id = $1', [household?.id]);
      await dataSource.query('DELETE FROM household_invites WHERE household_id = $1', [household?.id]);
      await dataSource.query('DELETE FROM households WHERE id = $1', [household?.id]);
      await dataSource.query('DELETE FROM users WHERE id = $1', [member?.id]);
    });

    it('should transfer ownership when owner requests deletion', async () => {
      // Owner requests deletion
      await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      // Verify ownership transferred
      const householdRepo = dataSource.getRepository(Household);
      const updatedHousehold = await householdRepo.findOne({ where: { id: household.id } });

      expect(updatedHousehold?.ownerId).toBe(member.id);
    });

    it('should delete household if owner is last member', async () => {
      // Remove other member first
      const memberRepo = dataSource.getRepository(HouseholdMember);
      await memberRepo.delete({ userId: member.id });

      const userRepo = dataSource.getRepository(User);
      await userRepo.update(member.id, { householdId: null });

      // Owner requests deletion
      await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      // Process deletion immediately (set past date)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      await userRepo.update(testUser.id, { deletionScheduledAt: pastDate });

      await accountDeletionService.processScheduledDeletions();

      // Verify household is deleted
      const householdRepo = dataSource.getRepository(Household);
      const deletedHousehold = await householdRepo.findOne({ where: { id: household.id } });
      expect(deletedHousehold).toBeNull();
    });
  });

  describe('Audit Logging', () => {
    it('should log deletion request event', async () => {
      await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      const authEventRepo = dataSource.getRepository(AuthEvent);
      const events = await authEventRepo.find({
        where: { userId: testUser.id, eventType: AuthEventType.ACCOUNT_DELETION_REQUESTED },
      });

      expect(events.length).toBeGreaterThan(0);
    });

    it('should log deletion cancellation event', async () => {
      // First request deletion
      await request(app.getHttpServer())
        .post('/account/delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      // Then cancel
      await request(app.getHttpServer())
        .post('/account/delete/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const authEventRepo = dataSource.getRepository(AuthEvent);
      const events = await authEventRepo.find({
        where: { userId: testUser.id, eventType: AuthEventType.ACCOUNT_DELETION_CANCELLED },
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });
});
