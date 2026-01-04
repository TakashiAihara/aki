# Research: User Authentication Service

**Feature**: 002-user-auth
**Date**: 2026-01-03
**Status**: Complete

## Research Summary

This document captures technology decisions, best practices research, and pattern selections for the User Authentication Service implementation.

## Technology Decisions

### 1. OAuth 2.0 Provider Integration

| Area | Decision | Rationale |
|------|----------|-----------|
| **Google OAuth Library** | `@nestjs/passport` + `passport-google-oauth20` | Official NestJS integration, well-maintained, TypeScript support |
| **Apple Sign In Library** | `passport-apple` + custom JWT verification | Apple requires custom identity token verification; passport-apple handles flow |
| **OAuth State Management** | Signed state parameter with Redis TTL | Prevents CSRF, state stored in Redis with 10-minute expiry |

**Alternatives Considered**:
- `google-auth-library`: Lower-level, requires more boilerplate
- Custom OAuth implementation: Not recommended, security-sensitive code

### 2. JWT Token Strategy

| Area | Decision | Rationale |
|------|----------|-----------|
| **JWT Library** | `jose` (v5+) | Modern, TypeScript-native, supports Ed25519, FIPS-compliant |
| **Algorithm** | RS256 (RSA) | Asymmetric allows public key distribution to other services |
| **Access Token Expiry** | 15 minutes | Balances security (short-lived) with UX (not too frequent refresh) |
| **Refresh Token Storage** | PostgreSQL (hashed) | Persistent, queryable for revocation, audit trail |
| **Token Rotation** | Sliding expiration (7 days) | Each refresh extends validity, inactive sessions expire |

**Alternatives Considered**:
- `jsonwebtoken`: Popular but older, less TypeScript-friendly
- HS256 (symmetric): Simpler but requires sharing secret with all services
- Ed25519: Faster but less universal support in older clients

### 3. JWT Payload Structure

```typescript
interface JwtPayload {
  sub: string;           // User UUID
  email: string;         // User email (for display)
  household_id?: string; // Household UUID (if member)
  role: 'user' | 'admin';
  iat: number;           // Issued at
  exp: number;           // Expiration
  jti: string;           // Unique token ID (for revocation)
}
```

**Design Rationale**:
- `household_id` included to avoid database lookup on every request
- `jti` enables token-level revocation via Redis blacklist
- Minimal claims to keep token size small (<1KB)

### 4. Refresh Token Flow

| Area | Decision | Rationale |
|------|----------|-----------|
| **Storage** | PostgreSQL `refresh_tokens` table | Audit trail, easy revocation by user/device |
| **Format** | 256-bit random (crypto.randomBytes) | Not a JWT, opaque to client |
| **Hashing** | SHA-256 (stored hash only) | Never store plaintext refresh tokens |
| **Rotation** | Issue new on each use | Mitigates token theft, enables sliding expiry |

**Flow**:
1. Client sends expired access token + refresh token
2. Server validates refresh token hash in DB
3. Server issues new access token + new refresh token
4. Old refresh token is deleted from DB

### 5. Device Authorization Flow (CLI)

| Area | Decision | Rationale |
|------|----------|-----------|
| **Implementation** | RFC 8628 Device Authorization Grant | Standard flow, works in terminal |
| **User Code Format** | `XXXX-XXXX` (8 alphanumeric, no ambiguous chars) | Easy to type, avoids 0/O, 1/l confusion |
| **Polling Interval** | 5 seconds | Balance between UX and server load |
| **Code Expiry** | 15 minutes | Enough time for user to authorize |

**Flow**:
1. CLI requests device code from `/auth/device/code`
2. User visits verification URL in browser
3. CLI polls `/auth/device/token` until authorized
4. Server returns access + refresh tokens

### 6. Database Schema Design

| Area | Decision | Rationale |
|------|----------|-----------|
| **ORM** | TypeORM 0.3 | NestJS integration, migration support, TypeScript |
| **Primary Keys** | UUIDv7 | Time-ordered for index efficiency, globally unique |
| **Soft Delete** | `deletion_requested_at` timestamp | 30-day GDPR grace period |
| **Indexes** | Covering indexes on lookup patterns | Fast authentication, profile fetch |

**Alternatives Considered**:
- Prisma: Excellent DX but less flexible for complex queries
- Drizzle: Newer, smaller ecosystem

### 7. Rate Limiting

| Area | Decision | Rationale |
|------|----------|-----------|
| **Implementation** | `@nestjs/throttler` + Redis | Distributed rate limiting across instances |
| **Auth Endpoints** | 10 req/min per IP | Prevents brute force on OAuth callbacks |
| **Token Endpoints** | 60 req/min per user | Allows legitimate refresh cycles |
| **Device Flow Polling** | 12 req/min per device_code | Per RFC 8628 recommendation |

### 8. Logging & Audit

| Area | Decision | Rationale |
|------|----------|-----------|
| **Format** | Structured JSON (Winston) | Parseable by log aggregators |
| **Auth Events** | Dedicated `auth_events` table | GDPR audit trail, security analysis |
| **Sensitive Data** | PII masking (email → `u***@domain.com`) | Logs safe to share with third parties |

**Event Types**:
- `LOGIN_SUCCESS`, `LOGIN_FAILURE`
- `TOKEN_REFRESH`, `TOKEN_REVOKE`
- `ACCOUNT_DELETION_REQUESTED`, `ACCOUNT_DELETION_CANCELLED`, `ACCOUNT_DELETED`
- `HOUSEHOLD_CREATED`, `HOUSEHOLD_JOINED`, `HOUSEHOLD_LEFT`

### 9. Multi-Platform OAuth Callbacks

| Platform | Callback Strategy | Notes |
|----------|-------------------|-------|
| **Web** | Standard redirect to `/auth/callback/google` | Session cookie for state |
| **iOS** | Universal Links + deep link | ASWebAuthenticationSession handles |
| **Android** | Custom URL scheme + Chrome Custom Tabs | `aki://auth/callback` |
| **CLI** | Device Flow (no callback) | Browser-based authorization, CLI polls |

### 10. GDPR Compliance Implementation

| Requirement | Implementation | Evidence |
|-------------|----------------|----------|
| **Right to Erasure** | `/account/delete` endpoint + 30-day grace | FR-021, FR-022 |
| **Data Portability** | `/account/export` returns JSON of all user data | Future enhancement |
| **Consent** | OAuth providers handle initial consent | Minimal data collection |
| **Deletion Job** | Scheduled task runs daily at 02:00 UTC | Checks `deletion_requested_at + 30 days` |

**Deletion Cascade**:
1. User requests deletion → `deletion_requested_at` set
2. Immediate logout (all refresh tokens revoked)
3. After 30 days: Hard delete User, OAuthLinks, RefreshTokens
4. Household ownership transferred or household deleted
5. Audit log entry created (anonymized)

## Best Practices Applied

### Security
- ✅ No password storage (OAuth only)
- ✅ Refresh token rotation on each use
- ✅ State parameter for CSRF protection
- ✅ Token encryption at rest (AES-256 for refresh tokens in DB)
- ✅ Rate limiting on all auth endpoints
- ✅ JWT blacklist for immediate revocation

### Performance
- ✅ JWT validation without database lookup (asymmetric keys)
- ✅ Redis for token blacklist (O(1) lookup)
- ✅ Covering indexes on hot paths
- ✅ Connection pooling for PostgreSQL

### Maintainability
- ✅ DDD layered architecture
- ✅ Dependency injection via NestJS
- ✅ Clear separation of OAuth strategies
- ✅ Comprehensive logging for debugging

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| OAuth provider outage | High | Low | Existing sessions continue to work; display maintenance message for new logins |
| JWT secret compromise | Critical | Very Low | Key rotation capability, short access token lifetime |
| Refresh token theft | High | Low | Rotation invalidates stolen tokens after one use |
| Apple private relay issues | Medium | Low | Use Apple's stable `sub` claim, not email |

## Open Questions (Resolved)

1. **Q: Should we support linking multiple OAuth providers to one account?**
   A: Yes, documented in edge cases. If email matches, offer to link.

2. **Q: What happens to household on owner deletion?**
   A: Ownership transfers to next senior member; if none, household deleted.

3. **Q: How long to keep audit logs?**
   A: 90 days for standard logs, 7 years for financial/compliance events (future).
