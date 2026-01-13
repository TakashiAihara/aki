import { RefreshToken } from '../entities/refresh-token.entity';

/**
 * Repository interface for RefreshToken entity operations
 */
export interface RefreshTokenRepository {
  /**
   * Find a refresh token by its hash
   */
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;

  /**
   * Find all refresh tokens for a user
   */
  findByUserId(userId: string): Promise<RefreshToken[]>;

  /**
   * Find all active (non-revoked, non-expired) tokens for a user
   */
  findActiveByUserId(userId: string): Promise<RefreshToken[]>;

  /**
   * Create a new refresh token entity (not persisted)
   */
  create(data: Partial<RefreshToken>): RefreshToken;

  /**
   * Save a refresh token to the database
   */
  save(token: RefreshToken): Promise<RefreshToken>;

  /**
   * Update a refresh token
   */
  update(id: string, data: Partial<RefreshToken>): Promise<RefreshToken>;

  /**
   * Delete a refresh token by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Delete all refresh tokens for a user
   */
  deleteByUserId(userId: string): Promise<void>;

  /**
   * Delete all expired tokens
   */
  deleteExpired(): Promise<number>;

  /**
   * Revoke a token by its hash
   */
  revokeByHash(tokenHash: string): Promise<boolean>;

  /**
   * Revoke all tokens for a user
   */
  revokeAllByUserId(userId: string): Promise<number>;
}

export const REFRESH_TOKEN_REPOSITORY = 'RefreshTokenRepository';
