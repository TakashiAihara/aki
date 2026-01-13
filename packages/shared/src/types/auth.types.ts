/**
 * JWT Payload structure for Aki access tokens
 */
export interface JwtPayload {
  /** User UUID (subject) */
  sub: string;

  /** User email for display purposes */
  email: string;

  /** Household UUID if user is a member */
  householdId?: string;

  /** User role */
  role: 'user' | 'admin';

  /** Issued at timestamp (Unix epoch seconds) */
  iat: number;

  /** Expiration timestamp (Unix epoch seconds) */
  exp: number;

  /** Unique token ID for revocation tracking */
  jti: string;
}

/**
 * Token pair returned after successful authentication
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // Access token expiry in seconds
}

/**
 * OAuth provider types
 */
export type OAuthProviderType = 'google' | 'apple';

/**
 * OAuth callback data structure
 */
export interface OAuthCallbackData {
  provider: OAuthProviderType;
  providerUserId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Device flow response for CLI authentication
 */
export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresIn: number;
  interval: number;
}

/**
 * Device flow token polling errors
 */
export type DeviceTokenError =
  | 'authorization_pending'
  | 'slow_down'
  | 'expired_token'
  | 'access_denied';
