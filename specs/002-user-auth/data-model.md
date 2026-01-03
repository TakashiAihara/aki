# Data Model: User Authentication Service

**Feature**: 002-user-auth
**Date**: 2026-01-03
**Database**: PostgreSQL 16

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌──────────────┐         ┌─────────────────┐         ┌─────────────────┐  │
│  │    User      │ 1    n  │   OAuthLink     │         │  RefreshToken   │  │
│  ├──────────────┤─────────├─────────────────┤         ├─────────────────┤  │
│  │ id (PK)      │         │ id (PK)         │         │ id (PK)         │  │
│  │ email        │         │ user_id (FK)    │─────────│ user_id (FK)    │──┤
│  │ display_name │         │ provider        │         │ token_hash      │  │
│  │ avatar_url   │         │ provider_uid    │         │ device_info     │  │
│  │ household_id │◄────────│ email           │         │ expires_at      │  │
│  │ created_at   │    │    │ created_at      │         │ created_at      │  │
│  │ updated_at   │    │    └─────────────────┘         └─────────────────┘  │
│  │ deleted_at   │    │                                                      │
│  └──────────────┘    │                                                      │
│         │            │                                                      │
│         │ 1          │ n                                                    │
│         │            │                                                      │
│         ▼            ▼                                                      │
│  ┌──────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐  │
│  │  Household   │ 1 │ HouseholdMember │   │     HouseholdInvite         │  │
│  ├──────────────┤───├─────────────────┤   ├─────────────────────────────┤  │
│  │ id (PK)      │   │ household_id(FK)│   │ id (PK)                     │  │
│  │ name         │───│ user_id (FK)    │   │ code                        │  │
│  │ owner_id(FK) │   │ role            │   │ household_id (FK)           │  │
│  │ created_at   │   │ joined_at       │   │ created_by (FK)             │  │
│  │ updated_at   │   └─────────────────┘   │ expires_at                  │  │
│  └──────────────┘                         │ used_by (FK, nullable)      │  │
│                                           │ used_at                     │  │
│                                           │ created_at                  │  │
│                                           └─────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          AuthEvent                                   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ id (PK) │ user_id (FK) │ event_type │ ip_address │ user_agent │ ... │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Entity Definitions

### User

Core user entity representing an authenticated account.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique user identifier (UUIDv7 recommended) |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Primary email from OAuth provider |
| display_name | VARCHAR(100) | NOT NULL | User-editable display name |
| avatar_url | VARCHAR(500) | NULL | Profile picture URL |
| household_id | UUID | FK → households.id, NULL | Current household membership |
| notification_preferences | JSONB | NOT NULL, DEFAULT '{}' | User notification settings |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last profile update |
| deletion_requested_at | TIMESTAMP | NULL | GDPR deletion request timestamp |

**Indexes**:
- `idx_users_email` UNIQUE on (email)
- `idx_users_household` on (household_id)
- `idx_users_deletion` on (deletion_requested_at) WHERE deletion_requested_at IS NOT NULL

### OAuthLink

Links a user to one or more OAuth providers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Link identifier |
| user_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Owner user |
| provider | VARCHAR(20) | NOT NULL, CHECK IN ('google', 'apple') | OAuth provider name |
| provider_user_id | VARCHAR(255) | NOT NULL | Provider's unique user ID (sub claim) |
| email | VARCHAR(255) | NOT NULL | Email from provider (may differ from user.email) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Link creation time |

**Indexes**:
- `idx_oauth_provider_uid` UNIQUE on (provider, provider_user_id)
- `idx_oauth_user` on (user_id)

### RefreshToken

Stores active refresh tokens for session management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Token record identifier |
| user_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Token owner |
| token_hash | VARCHAR(64) | NOT NULL, UNIQUE | SHA-256 hash of token |
| device_info | JSONB | NOT NULL, DEFAULT '{}' | Device/client metadata |
| expires_at | TIMESTAMP | NOT NULL | Token expiration (7 days from issue) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Token issue time |

**Indexes**:
- `idx_refresh_token_hash` UNIQUE on (token_hash)
- `idx_refresh_user` on (user_id)
- `idx_refresh_expires` on (expires_at) – for cleanup job

### Household

Represents a group of users sharing data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Household identifier |
| name | VARCHAR(100) | NOT NULL | Household display name |
| owner_id | UUID | FK → users.id, NOT NULL | Current owner |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes**:
- `idx_household_owner` on (owner_id)

### HouseholdMember

Junction table for household membership.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| household_id | UUID | PK (composite), FK → households.id, ON DELETE CASCADE | Household |
| user_id | UUID | PK (composite), FK → users.id, ON DELETE CASCADE | Member user |
| role | VARCHAR(20) | NOT NULL, CHECK IN ('owner', 'member') | Member role |
| joined_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Membership start time |

**Indexes**:
- Primary key on (household_id, user_id)
- `idx_member_user` on (user_id)

### HouseholdInvite

Time-limited invitation codes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Invite identifier |
| code | VARCHAR(20) | NOT NULL, UNIQUE | Invite code (e.g., "ABC123XY") |
| household_id | UUID | FK → households.id, NOT NULL, ON DELETE CASCADE | Target household |
| created_by | UUID | FK → users.id, NOT NULL | Invite creator |
| expires_at | TIMESTAMP | NOT NULL | Code expiration (7 days) |
| used_by | UUID | FK → users.id, NULL | User who used the code |
| used_at | TIMESTAMP | NULL | When code was used |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |

**Indexes**:
- `idx_invite_code` UNIQUE on (code)
- `idx_invite_household` on (household_id)
- `idx_invite_expires` on (expires_at) WHERE used_at IS NULL – for cleanup

### AuthEvent

Audit log for authentication events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Event identifier |
| user_id | UUID | FK → users.id, NULL, ON DELETE SET NULL | Related user (null for failed logins) |
| event_type | VARCHAR(50) | NOT NULL | Event type (see enum below) |
| ip_address | INET | NOT NULL | Client IP address |
| user_agent | VARCHAR(500) | NULL | Client user agent |
| metadata | JSONB | NOT NULL, DEFAULT '{}' | Additional event data |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Event timestamp |

**Event Types**:
- `LOGIN_SUCCESS`, `LOGIN_FAILURE`
- `TOKEN_REFRESH`, `TOKEN_REVOKE`, `TOKEN_REVOKE_ALL`
- `LOGOUT`
- `PROFILE_UPDATE`
- `ACCOUNT_DELETION_REQUESTED`, `ACCOUNT_DELETION_CANCELLED`, `ACCOUNT_DELETED`
- `HOUSEHOLD_CREATED`, `HOUSEHOLD_JOINED`, `HOUSEHOLD_LEFT`, `HOUSEHOLD_MEMBER_REMOVED`

**Indexes**:
- `idx_auth_event_user` on (user_id, created_at DESC)
- `idx_auth_event_type` on (event_type, created_at DESC)
- `idx_auth_event_time` on (created_at DESC) – for retention cleanup

## PostgreSQL Schema (DDL)

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    household_id UUID,
    notification_preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deletion_requested_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_household ON users(household_id);
CREATE INDEX idx_users_deletion ON users(deletion_requested_at)
    WHERE deletion_requested_at IS NOT NULL;

-- OAuth links table
CREATE TABLE oauth_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'apple')),
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_oauth_provider_uid UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_oauth_user ON oauth_links(user_id);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    device_info JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);

-- Households table
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_household_owner ON households(owner_id);

-- Add foreign key from users to households (circular reference)
ALTER TABLE users
    ADD CONSTRAINT fk_users_household
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL;

-- Household members table
CREATE TABLE household_members (
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    PRIMARY KEY (household_id, user_id)
);

CREATE INDEX idx_member_user ON household_members(user_id);

-- Household invites table
CREATE TABLE household_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_by UUID REFERENCES users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_invite_code UNIQUE (code)
);

CREATE INDEX idx_invite_household ON household_invites(household_id);
CREATE INDEX idx_invite_expires ON household_invites(expires_at)
    WHERE used_at IS NULL;

-- Auth events table (audit log)
CREATE TABLE auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address INET NOT NULL,
    user_agent VARCHAR(500),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_event_user ON auth_events(user_id, created_at DESC);
CREATE INDEX idx_auth_event_type ON auth_events(event_type, created_at DESC);
CREATE INDEX idx_auth_event_time ON auth_events(created_at DESC);

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_households_updated_at
    BEFORE UPDATE ON households
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## State Transitions

### User Account States

```
┌──────────────┐     OAuth Login     ┌──────────────┐
│   (none)     │ ─────────────────►  │    Active    │
└──────────────┘                     └──────────────┘
                                           │
                                           │ Request Deletion
                                           ▼
                                     ┌──────────────┐
                                     │  Pending     │
                                     │  Deletion    │
                                     └──────────────┘
                                        │       │
                        Cancel Request  │       │ 30 days pass
                        (Login again)   │       │
                                        ▼       ▼
                                 ┌──────────────┐  ┌──────────────┐
                                 │    Active    │  │   Deleted    │
                                 └──────────────┘  └──────────────┘
```

### Household Membership States

```
┌──────────────┐   Create Household   ┌──────────────┐
│ No Household │ ────────────────────►│    Owner     │
└──────────────┘                      └──────────────┘
       │                                    │
       │ Join via Invite                    │ Transfer/Leave
       ▼                                    ▼
┌──────────────┐                      ┌──────────────┐
│    Member    │ ◄────────────────────│   (Member)   │
└──────────────┘                      └──────────────┘
       │                                    │
       │ Leave/Removed                      │ Delete Account
       ▼                                    ▼
┌──────────────┐                      ┌──────────────┐
│ No Household │                      │ No Household │
└──────────────┘                      └──────────────┘
```

## Migration Strategy

### Initial Migration (V1)

1. Create all tables in dependency order:
   - `users` (without household_id FK)
   - `oauth_links`
   - `refresh_tokens`
   - `households`
   - Add `household_id` FK to `users`
   - `household_members`
   - `household_invites`
   - `auth_events`

2. Create all indexes

3. Create triggers

### Future Migrations

- **V2**: Add `phone_number` column to users (optional SMS verification)
- **V3**: Add `mfa_enabled` column for future MFA support
- **V4**: Add `preferences` JSONB for additional user settings

## Data Retention

| Entity | Retention Policy | Cleanup Frequency |
|--------|------------------|-------------------|
| Users | Until deletion requested + 30 days | Daily at 02:00 UTC |
| OAuthLinks | Cascade with user | - |
| RefreshTokens | Until `expires_at` passed | Hourly |
| Households | Until all members leave | Daily |
| HouseholdInvites | Until `expires_at` passed and unused | Daily |
| AuthEvents | 90 days | Weekly |

## Validation Rules

| Entity | Field | Validation |
|--------|-------|------------|
| User | display_name | 1-100 chars, alphanumeric + spaces + common punctuation |
| User | email | Valid email format, max 255 chars |
| User | avatar_url | Valid URL, max 500 chars, optional |
| Household | name | 1-100 chars, alphanumeric + spaces |
| HouseholdInvite | code | 8 chars, uppercase alphanumeric (no 0/O/1/I) |
