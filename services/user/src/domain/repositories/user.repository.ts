import { User } from '../entities/user.entity';

/**
 * Repository interface for User entity operations
 * Follows Repository pattern for DDD architecture
 */
export interface UserRepository {
  /**
   * Find a user by their unique identifier
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find a user by their email address
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find all users in a household
   */
  findByHouseholdId(householdId: string): Promise<User[]>;

  /**
   * Find users with pending deletion requests
   */
  findPendingDeletion(): Promise<User[]>;

  /**
   * Create a new user entity (not persisted)
   */
  create(data: Partial<User>): User;

  /**
   * Save a user entity to the database
   */
  save(user: User): Promise<User>;

  /**
   * Update an existing user
   */
  update(id: string, data: Partial<User>): Promise<User>;

  /**
   * Delete a user permanently (hard delete)
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a user exists by email
   */
  existsByEmail(email: string): Promise<boolean>;
}

export const USER_REPOSITORY = 'UserRepository';
