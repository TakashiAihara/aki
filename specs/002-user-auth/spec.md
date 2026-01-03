# Feature Specification: User Authentication Service

**Feature Branch**: `002-user-auth`
**Created**: 2026-01-03
**Status**: Draft
**Input**: User description: "Google OAuthとApple Sign Inによるユーザー認証サービス。JWT発行、ユーザープロフィール管理、household_id管理、アカウント削除機能を提供。全マイクロサービスの認証基盤。iOS/Android/Web/CLI対応。GDPR準拠。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initial Sign-In with Google (Priority: P1)

A new user opens the Akimi app on any platform and signs in using their existing Google account. Upon successful authentication, they are issued a JWT token and can immediately access Akimi services.

**Why this priority**: This is the foundation of the entire system. Without authentication, no other features can be accessed. Google OAuth covers the widest user base (Android, Web, iOS).

**Independent Test**: Can be fully tested by initiating Google OAuth flow, receiving callback, and verifying JWT issuance. Delivers immediate access to the platform.

**Acceptance Scenarios**:

1. **Given** a user with a Google account has never used Akimi, **When** they tap "Sign in with Google" and authorize access, **Then** a new user account is created, a JWT is issued, and they are redirected to the home screen.
2. **Given** a user with an existing Akimi account linked to Google, **When** they sign in with Google, **Then** they receive a valid JWT and access their existing profile.
3. **Given** a user attempts Google sign-in, **When** the OAuth flow fails (user denies, network error), **Then** an appropriate error message is displayed and no account/session is created.

---

### User Story 2 - Initial Sign-In with Apple (Priority: P1)

An iOS user opens the Akimi app and signs in using Apple Sign In. Upon successful authentication, they receive a JWT token with full access to their account.

**Why this priority**: Apple Sign In is required for iOS App Store compliance when offering social sign-in. Critical for iOS user adoption.

**Independent Test**: Can be fully tested by initiating Apple Sign In flow on iOS/Web, receiving callback, and verifying JWT issuance.

**Acceptance Scenarios**:

1. **Given** a user with an Apple ID has never used Akimi on iOS, **When** they tap "Sign in with Apple" and authenticate via Face ID/Touch ID/passcode, **Then** a new user account is created (using Apple's provided email or private relay), a JWT is issued, and they access the home screen.
2. **Given** an existing Akimi user linked to Apple ID, **When** they sign in with Apple, **Then** they receive a valid JWT and access their existing profile.
3. **Given** a user uses "Hide My Email" option in Apple Sign In, **When** account is created, **Then** the system uses Apple's private relay email address correctly.

---

### User Story 3 - Token Refresh and Session Management (Priority: P1)

A user with an active session continues using the app. Their JWT token is automatically refreshed before expiration, ensuring uninterrupted access without re-authentication.

**Why this priority**: Essential for user experience. Users should not be logged out unexpectedly during active use.

**Independent Test**: Can be tested by issuing a short-lived token, simulating time passage, and verifying automatic refresh without user interaction.

**Acceptance Scenarios**:

1. **Given** a user has a valid JWT that will expire in 5 minutes, **When** they make an API request, **Then** a new JWT is issued transparently (refresh token flow).
2. **Given** a user has an expired JWT and valid refresh token, **When** they access the app, **Then** a new JWT is issued without requiring re-authentication.
3. **Given** a user has an expired refresh token, **When** they access the app, **Then** they are redirected to sign-in flow with a message indicating session expiration.

---

### User Story 4 - User Profile Management (Priority: P2)

An authenticated user views and updates their profile information (display name, avatar, notification preferences). Changes are persisted and reflected across all platforms.

**Why this priority**: Profile management enhances personalization but is not blocking for core functionality.

**Independent Test**: Can be tested by updating profile fields and verifying persistence across app restarts and multiple platforms.

**Acceptance Scenarios**:

1. **Given** an authenticated user is on the profile screen, **When** they update their display name and save, **Then** the new name is persisted and reflected in the UI immediately.
2. **Given** a user updates their profile on mobile, **When** they log in on web, **Then** they see the same updated profile information.
3. **Given** a user attempts to set an invalid display name (empty, exceeds 100 characters, contains prohibited characters), **When** they save, **Then** validation errors are displayed and the change is rejected.

---

### User Story 5 - Household Membership Management (Priority: P2)

A user creates or joins a household to share data (inventory, tasks) with family members. The household_id links multiple users for collaborative features.

**Why this priority**: Enables shared features (Nutrition Service inventory sharing) but can be implemented after individual authentication is working.

**Independent Test**: Can be tested by creating a household, generating invite codes, and verifying another user can join and access shared data.

**Acceptance Scenarios**:

1. **Given** an authenticated user with no household, **When** they create a new household, **Then** a household is created with them as owner, and a household_id is assigned to their profile.
2. **Given** a household owner, **When** they generate an invite code, **Then** a unique, time-limited code is created that can be shared.
3. **Given** a user with an invite code, **When** they join the household, **Then** they are added as a member and gain access to shared resources.
4. **Given** a household owner, **When** they remove a member, **Then** the member loses access to shared resources but retains their personal account.

---

### User Story 6 - Account Deletion (GDPR Compliance) (Priority: P2)

A user decides to delete their Akimi account. All personal data is permanently deleted, and their OAuth link is revoked. They can re-register with the same OAuth provider later.

**Why this priority**: GDPR compliance is legally required. Must be available before public launch but not blocking core auth development.

**Independent Test**: Can be tested by initiating account deletion, verifying data removal from database, and confirming the user can create a new account with the same OAuth provider.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the account settings screen, **When** they request account deletion and confirm, **Then** their account enters a 30-day grace period with immediate logout.
2. **Given** a user in the 30-day deletion grace period, **When** they sign in again, **Then** they can cancel the deletion request and restore their account.
3. **Given** the 30-day grace period has passed, **When** the deletion job runs, **Then** all personal data (profile, preferences, linked OAuth identifiers) is permanently deleted.
4. **Given** a user whose account was deleted, **When** they sign in with the same OAuth provider, **Then** a completely new account is created (no data recovery).

---

### User Story 7 - CLI Authentication (Priority: P3)

A developer or power user authenticates to Akimi via the command-line interface using device authorization flow (OAuth 2.0 Device Flow).

**Why this priority**: CLI support is valuable for developers and automation but has a smaller user base than mobile/web.

**Independent Test**: Can be tested by running CLI auth command, following device code URL on browser, and verifying JWT token storage locally.

**Acceptance Scenarios**:

1. **Given** a user runs `akimi auth login`, **When** the CLI initiates device flow, **Then** a URL and user code are displayed for browser authorization.
2. **Given** a user has authorized the device in their browser, **When** CLI polls for completion, **Then** a JWT is issued and securely stored in the local credential store.
3. **Given** a user runs `akimi auth logout`, **When** executed, **Then** the local JWT is deleted and the session is revoked server-side.

---

### Edge Cases

- What happens when a user tries to link both Google and Apple to the same account?
  - System should support multiple OAuth providers linked to one account. If the email matches an existing account, offer to link accounts.

- What happens when Apple's private relay email changes?
  - System uses Apple's stable user identifier (sub claim), not email, for account matching.

- What happens if a user is a member of multiple households?
  - User can belong to only one household at a time. They must leave current household before joining another.

- What happens when the OAuth provider is temporarily unavailable?
  - Users with existing refresh tokens can still access the app. New sign-ins will fail with a clear error message and retry option.

- What happens when JWT validation fails on API Gateway?
  - Request is rejected with 401 Unauthorized. Client should attempt token refresh before prompting re-authentication.

- What happens if a household owner deletes their account?
  - Ownership transfers to the next member (by join date). If no other members exist, household is deleted.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication Core**:
- **FR-001**: System MUST authenticate users exclusively via OAuth 2.0 providers (Google OAuth 2.0, Apple Sign In).
- **FR-002**: System MUST NOT implement email/password authentication.
- **FR-003**: System MUST issue JWT access tokens upon successful OAuth authentication.
- **FR-004**: System MUST issue refresh tokens for seamless session renewal.
- **FR-005**: System MUST validate JWT tokens on every protected API request.
- **FR-006**: System MUST support OAuth 2.0 Device Authorization Flow for CLI clients.

**Token Management**:
- **FR-007**: JWT access tokens MUST expire after 15 minutes.
- **FR-008**: Refresh tokens MUST expire after 7 days of inactivity.
- **FR-009**: System MUST allow token revocation (logout, account deletion, security events).
- **FR-010**: System MUST rotate refresh tokens on each use (sliding expiration).

**User Profile**:
- **FR-011**: System MUST store user profile (display name, avatar URL, email, notification preferences).
- **FR-012**: System MUST allow users to update their display name and avatar.
- **FR-013**: System MUST sync profile changes across all user sessions within 30 seconds.
- **FR-014**: Display names MUST be 1-100 characters, alphanumeric with spaces allowed.

**Household Management**:
- **FR-015**: System MUST allow users to create a household and become owner.
- **FR-016**: System MUST allow household owners to generate time-limited invite codes (valid for 7 days).
- **FR-017**: System MUST allow users to join a household using a valid invite code.
- **FR-018**: System MUST enforce single household membership per user.
- **FR-019**: System MUST allow household owners to remove members.
- **FR-020**: System MUST transfer ownership to next senior member when owner leaves/deletes account.

**Account Lifecycle**:
- **FR-021**: System MUST allow users to request account deletion (GDPR "Right to Erasure").
- **FR-022**: System MUST implement a 30-day grace period before permanent deletion.
- **FR-023**: System MUST allow cancellation of deletion request during grace period.
- **FR-024**: System MUST permanently delete all personal data after grace period.
- **FR-025**: System MUST revoke OAuth provider access tokens upon deletion.

**Multi-Platform Support**:
- **FR-026**: System MUST support Web (Next.js), iOS (React Native), Android (React Native), CLI (Commander.js).
- **FR-027**: JWT tokens MUST be platform-agnostic and usable across all clients.
- **FR-028**: System MUST provide platform-specific OAuth callback handlers.

**Security**:
- **FR-029**: System MUST encrypt all tokens at rest using AES-256.
- **FR-030**: System MUST log all authentication events (login, logout, token refresh, deletion request).
- **FR-031**: System MUST rate-limit authentication endpoints (max 10 attempts per minute per IP).
- **FR-032**: System MUST validate OAuth state parameters to prevent CSRF attacks.

### Key Entities

- **User**: Represents an authenticated user. Key attributes: id (UUID), email, display_name, avatar_url, created_at, updated_at, deletion_requested_at.
- **OAuthLink**: Links a user to an OAuth provider. Key attributes: user_id, provider (google/apple), provider_user_id, email, created_at.
- **RefreshToken**: Represents an active user session. Key attributes: token_hash, user_id, device_info, expires_at, created_at.
- **Household**: Represents a group of users sharing data. Key attributes: id (UUID), name, owner_id, created_at.
- **HouseholdMember**: Junction entity linking users to households. Key attributes: household_id, user_id, role (owner/member), joined_at.
- **HouseholdInvite**: Time-limited invitation. Key attributes: code, household_id, created_by, expires_at, used_by, used_at.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete OAuth sign-in (from tap to home screen) in under 10 seconds (excluding OAuth provider latency).
- **SC-002**: 99.9% of token refresh operations complete successfully without requiring re-authentication.
- **SC-003**: Profile updates are reflected across all user devices within 30 seconds.
- **SC-004**: System handles 10,000 concurrent authenticated users without authentication degradation.
- **SC-005**: Account deletion requests are processed within 30 days (GDPR compliance).
- **SC-006**: 100% of authentication events are logged with full audit trail.
- **SC-007**: Zero password-related security incidents (by design - no password storage).
- **SC-008**: CLI authentication completes within 60 seconds of user authorization in browser.
- **SC-009**: Household invite codes have 100% success rate when used within validity period.
- **SC-010**: All platforms (Web, iOS, Android, CLI) achieve feature parity for authentication flows.

## Assumptions

- OAuth providers (Google, Apple) maintain 99.9%+ uptime.
- Users have access to a modern browser for OAuth authorization (including CLI device flow).
- Email addresses from OAuth providers are verified by the provider before being passed to Akimi.
- Apple's private relay email system remains stable for account identification.
- JWT secret rotation will be managed via infrastructure (not application code).
- Rate limiting will be implemented at the API Gateway level, not within the User Service.

## Clarifications

*(To be filled during `/speckit.clarify` phase)*
