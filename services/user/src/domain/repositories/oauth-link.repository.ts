import { OAuthLink, OAuthProvider } from '../entities/oauth-link.entity';

/**
 * Repository interface for OAuthLink entity operations
 * Manages OAuth provider connections to user accounts
 */
export interface OAuthLinkRepository {
  /**
   * Find an OAuth link by provider and provider user ID
   */
  findByProviderAndProviderId(
    provider: OAuthProvider,
    providerUserId: string,
  ): Promise<OAuthLink | null>;

  /**
   * Find all OAuth links for a user
   */
  findByUserId(userId: string): Promise<OAuthLink[]>;

  /**
   * Find a specific OAuth link for a user and provider
   */
  findByUserIdAndProvider(
    userId: string,
    provider: OAuthProvider,
  ): Promise<OAuthLink | null>;

  /**
   * Create a new OAuth link entity (not persisted)
   */
  create(data: Partial<OAuthLink>): OAuthLink;

  /**
   * Save an OAuth link to the database
   */
  save(link: OAuthLink): Promise<OAuthLink>;

  /**
   * Delete an OAuth link
   */
  delete(id: string): Promise<void>;

  /**
   * Delete all OAuth links for a user (used during account deletion)
   */
  deleteByUserId(userId: string): Promise<void>;

  /**
   * Count OAuth links for a user
   */
  countByUserId(userId: string): Promise<number>;
}

export const OAUTH_LINK_REPOSITORY = 'OAuthLinkRepository';
