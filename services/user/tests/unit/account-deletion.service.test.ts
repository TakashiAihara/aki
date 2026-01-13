/**
 * Unit Tests for AccountDeletionService
 *
 * Tests account deletion business logic in isolation.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AccountDeletionService } from '../../src/application/account/account-deletion.service';
import { USER_REPOSITORY } from '../../src/domain/repositories/user.repository';
import { HOUSEHOLD_REPOSITORY } from '../../src/domain/repositories/household.repository';
import { AuthEventService } from '../../src/application/auth/auth-event.service';
import { User, UserStatus } from '../../src/domain/entities/user.entity';
import { Household } from '../../src/domain/entities/household.entity';
import { HouseholdMember, HouseholdRole } from '../../src/domain/entities/household-member.entity';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';

describe('AccountDeletionService', () => {
  let service: AccountDeletionService;
  let mockUserRepository: any;
  let mockHouseholdRepository: any;
  let mockAuthEventService: any;
  let mockDataSource: any;
  let mockEntityManager: any;
  let mockQueryRunner: any;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    status: UserStatus.ACTIVE,
    householdId: null,
    deletionScheduledAt: null,
  };

  beforeEach(async () => {
    mockEntityManager = {
      update: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: mockEntityManager,
    };

    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockHouseholdRepository = {
      findById: jest.fn(),
      findMembersByHouseholdId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      deleteMember: jest.fn(),
    };

    mockAuthEventService = {
      logDeletionRequested: jest.fn().mockResolvedValue({}),
      logDeletionCancelled: jest.fn().mockResolvedValue({}),
      logDeletionProcessed: jest.fn().mockResolvedValue({}),
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn(),
        findOne: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountDeletionService,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: HOUSEHOLD_REPOSITORY,
          useValue: mockHouseholdRepository,
        },
        {
          provide: AuthEventService,
          useValue: mockAuthEventService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AccountDeletionService>(AccountDeletionService);
  });

  describe('requestDeletion', () => {
    it('should schedule deletion 30 days from now', async () => {
      mockUserRepository.findById.mockResolvedValue({ ...mockUser });
      mockUserRepository.save.mockImplementation((user: User) => Promise.resolve(user));

      const beforeRequest = new Date();
      const result = await service.requestDeletion('user-123', '127.0.0.1');
      const afterRequest = new Date();

      expect(result.gracePeriodDays).toBe(30);

      const scheduledDate = new Date(result.deletionScheduledAt);
      const expectedMinDate = new Date(beforeRequest);
      expectedMinDate.setDate(expectedMinDate.getDate() + 30);
      const expectedMaxDate = new Date(afterRequest);
      expectedMaxDate.setDate(expectedMaxDate.getDate() + 30);

      expect(scheduledDate.getTime()).toBeGreaterThanOrEqual(expectedMinDate.getTime() - 1000);
      expect(scheduledDate.getTime()).toBeLessThanOrEqual(expectedMaxDate.getTime() + 1000);
    });

    it('should update user status to pending_deletion', async () => {
      mockUserRepository.findById.mockResolvedValue({ ...mockUser });
      mockUserRepository.save.mockImplementation((user: User) => Promise.resolve(user));

      await service.requestDeletion('user-123', '127.0.0.1');

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.PENDING_DELETION,
        })
      );
    });

    it('should throw ConflictException if deletion already requested', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...mockUser,
        status: UserStatus.PENDING_DELETION,
        deletionScheduledAt: new Date(),
      });

      await expect(service.requestDeletion('user-123', '127.0.0.1'))
        .rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.requestDeletion('nonexistent', '127.0.0.1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should log deletion request event', async () => {
      mockUserRepository.findById.mockResolvedValue({ ...mockUser });
      mockUserRepository.save.mockImplementation((user: User) => Promise.resolve(user));

      await service.requestDeletion('user-123', '127.0.0.1');

      expect(mockAuthEventService.logDeletionRequested).toHaveBeenCalledWith(
        'user-123',
        '127.0.0.1',
        undefined
      );
    });

    it('should transfer household ownership if user is owner', async () => {
      const userWithHousehold = {
        ...mockUser,
        householdId: 'household-123',
      };
      mockUserRepository.findById.mockResolvedValue(userWithHousehold);
      mockUserRepository.save.mockImplementation((user: User) => Promise.resolve(user));

      const mockHousehold: Partial<Household> = {
        id: 'household-123',
        ownerId: 'user-123',
      };
      mockHouseholdRepository.findById.mockResolvedValue(mockHousehold);

      const mockMembers: Partial<HouseholdMember>[] = [
        { userId: 'user-123', role: HouseholdRole.OWNER },
        { userId: 'member-456', role: HouseholdRole.MEMBER },
      ];
      mockHouseholdRepository.findMembersByHouseholdId.mockResolvedValue(mockMembers);
      mockHouseholdRepository.save.mockResolvedValue({});

      await service.requestDeletion('user-123', '127.0.0.1');

      expect(mockHouseholdRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: 'member-456',
        })
      );
    });
  });

  describe('cancelDeletion', () => {
    it('should restore user status to active', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...mockUser,
        status: UserStatus.PENDING_DELETION,
        deletionScheduledAt: new Date(),
      });
      mockUserRepository.save.mockImplementation((user: User) => Promise.resolve(user));

      await service.cancelDeletion('user-123', '127.0.0.1');

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.ACTIVE,
          deletionScheduledAt: null,
        })
      );
    });

    it('should throw ConflictException if no deletion pending', async () => {
      mockUserRepository.findById.mockResolvedValue({ ...mockUser });

      await expect(service.cancelDeletion('user-123', '127.0.0.1'))
        .rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.cancelDeletion('nonexistent', '127.0.0.1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should log cancellation event', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...mockUser,
        status: UserStatus.PENDING_DELETION,
        deletionScheduledAt: new Date(),
      });
      mockUserRepository.save.mockImplementation((user: User) => Promise.resolve(user));

      await service.cancelDeletion('user-123', '127.0.0.1');

      expect(mockAuthEventService.logDeletionCancelled).toHaveBeenCalledWith(
        'user-123',
        '127.0.0.1',
        undefined
      );
    });
  });

  describe('processScheduledDeletions', () => {
    it('should process users with expired deletion dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const usersToDelete = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          status: UserStatus.PENDING_DELETION,
          deletionScheduledAt: pastDate,
          householdId: null,
        },
      ];

      const userRepoMock = {
        find: jest.fn().mockResolvedValue(usersToDelete),
      };
      mockDataSource.getRepository.mockReturnValue(userRepoMock);

      // Mock transaction manager
      mockEntityManager.findOne.mockResolvedValue(usersToDelete[0]);
      mockEntityManager.delete.mockResolvedValue({});

      await service.processScheduledDeletions();

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle errors and rollback transaction', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const usersToDelete = [
        {
          id: 'user-1',
          deletionScheduledAt: pastDate,
          householdId: null,
        },
      ];

      const userRepoMock = {
        find: jest.fn().mockResolvedValue(usersToDelete),
      };
      mockDataSource.getRepository.mockReturnValue(userRepoMock);

      mockEntityManager.findOne.mockResolvedValue(usersToDelete[0]);
      mockEntityManager.delete.mockRejectedValue(new Error('Database error'));

      await service.processScheduledDeletions();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should delete all related user data', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const userToDelete = {
        id: 'user-1',
        email: 'user1@example.com',
        status: UserStatus.PENDING_DELETION,
        deletionScheduledAt: pastDate,
        householdId: null,
      };

      const userRepoMock = {
        find: jest.fn().mockResolvedValue([userToDelete]),
      };
      mockDataSource.getRepository.mockReturnValue(userRepoMock);
      mockEntityManager.findOne.mockResolvedValue(userToDelete);

      await service.processScheduledDeletions();

      // Should delete in order: tokens, oauth links, auth events (or anonymize), user
      expect(mockEntityManager.delete).toHaveBeenCalled();
    });
  });

  describe('grace period calculation', () => {
    it('should return exactly 30 days', () => {
      const gracePeriod = (service as any).calculateGracePeriod();
      expect(gracePeriod).toBe(30);
    });
  });
});
