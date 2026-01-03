# Quickstart: User Authentication Service

**Feature**: 002-user-auth
**Date**: 2026-01-03

This guide helps developers set up and run the User Authentication Service locally.

## Prerequisites

- Node.js 20 LTS
- pnpm 8+
- Docker & Docker Compose (for PostgreSQL and Redis)
- Google Cloud Console account (for OAuth credentials)
- Apple Developer account (for Sign In with Apple)

## Environment Setup

### 1. Clone and Install

```bash
# From repository root
pnpm install

# Navigate to user service
cd services/user
```

### 2. Start Infrastructure

```bash
# From repository root
docker-compose up -d postgres redis

# Verify containers are running
docker-compose ps
```

### 3. Configure Environment Variables

Create `services/user/.env`:

```bash
# Database
DATABASE_URL=postgresql://akimi:akimi_dev@localhost:5432/akimi_user
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple Sign In
APPLE_CLIENT_ID=com.akimi.app
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY_PATH=./keys/apple-auth-key.p8

# Server
PORT=3001
NODE_ENV=development

# Callback URLs (for local dev)
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
APPLE_CALLBACK_URL=http://localhost:3001/auth/apple/callback
WEB_APP_URL=http://localhost:3000
```

### 4. Generate JWT Keys

```bash
# Create keys directory
mkdir -p services/user/keys

# Generate RSA key pair for JWT signing
openssl genrsa -out services/user/keys/private.pem 2048
openssl rsa -in services/user/keys/private.pem -pubout -out services/user/keys/public.pem

# Copy public key to shared package (for other services)
cp services/user/keys/public.pem packages/shared/keys/
```

### 5. Set Up OAuth Providers

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API" and "Google Identity Toolkit API"
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:3001/auth/google/callback` (dev)
   - `https://api.akimi.app/v1/user/auth/google/callback` (prod)
6. Copy Client ID and Secret to `.env`

#### Apple Sign In

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Register your App ID with "Sign In with Apple" capability
3. Create a Services ID for web authentication
4. Create a Key for Sign In with Apple
5. Download the `.p8` key file to `services/user/keys/apple-auth-key.p8`
6. Update `.env` with Team ID, Key ID, and Client ID

### 6. Run Database Migrations

```bash
cd services/user

# Generate migration from entities
pnpm run migration:generate -- -n InitialSchema

# Run migrations
pnpm run migration:run
```

### 7. Start the Service

```bash
# Development mode with hot reload
pnpm run start:dev

# Or production mode
pnpm run build && pnpm run start:prod
```

Service runs at `http://localhost:3001`

## Verify Installation

### Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

### Test Google OAuth Flow (Browser)

1. Open `http://localhost:3001/auth/google?redirect_uri=http://localhost:3000/auth/callback`
2. Complete Google sign-in
3. Verify redirect to web app with tokens

### Test Token Refresh

```bash
curl -X POST http://localhost:3001/tokens/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "your-refresh-token"}'
```

## Running Tests

```bash
cd services/user

# Unit tests
pnpm run test

# Integration tests (requires running DB)
pnpm run test:integration

# Contract tests
pnpm run test:contract

# All tests with coverage
pnpm run test:cov
```

## Project Structure

```
services/user/
├── src/
│   ├── domain/           # Business logic
│   │   ├── entities/     # TypeORM entities
│   │   ├── repositories/ # Repository interfaces
│   │   └── services/     # Domain services
│   ├── application/      # Use cases
│   │   ├── auth/         # Authentication use cases
│   │   ├── profile/      # Profile management
│   │   └── household/    # Household operations
│   ├── infrastructure/   # External integrations
│   │   ├── persistence/  # TypeORM repositories
│   │   ├── auth/         # Passport strategies
│   │   ├── cache/        # Redis client
│   │   └── logging/      # Winston logger
│   └── presentation/     # HTTP layer
│       ├── controllers/  # REST endpoints
│       ├── guards/       # Auth guards
│       └── dto/          # Request/Response DTOs
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
├── migrations/           # TypeORM migrations
├── keys/                 # JWT and OAuth keys (gitignored)
└── package.json
```

## Common Tasks

### Add a New OAuth Provider

1. Create strategy in `src/infrastructure/auth/`
2. Register in `src/app.module.ts`
3. Add callback route in `src/presentation/controllers/auth.controller.ts`
4. Update `OAuthLink` entity if needed
5. Add integration tests

### Modify JWT Claims

1. Update `JwtPayload` interface in `packages/shared/src/types/auth.types.ts`
2. Update token generation in `src/application/auth/token.service.ts`
3. Update JWT strategy validation
4. Run contract tests to verify no breaking changes

### Add Household Feature

1. Create use case in `src/application/household/`
2. Add controller endpoint in `src/presentation/controllers/household.controller.ts`
3. Update OpenAPI spec in `specs/002-user-auth/contracts/user-api.yaml`
4. Add tests

## Troubleshooting

### "Invalid OAuth state" error

- Redis may not be running. Check with `docker-compose ps`
- State token may have expired (10 min TTL)

### "JWT verification failed"

- Ensure public key is correctly copied to verifying services
- Check key algorithm matches (RS256)
- Verify token hasn't expired

### "Apple Sign In returns empty user"

- Apple only returns user info on first authorization
- Store user info immediately in callback handler
- For testing, revoke app permission in Apple ID settings

### Database connection failed

- Verify PostgreSQL container is running
- Check `DATABASE_URL` matches Docker Compose config
- Run `docker-compose logs postgres` for errors

## API Documentation

OpenAPI specification: `specs/002-user-auth/contracts/user-api.yaml`

View in Swagger UI:
```bash
# Install swagger-ui-express in dev dependencies
pnpm run docs:serve
# Opens at http://localhost:3001/api-docs
```

## Related Documentation

- [Feature Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)
- [Research Decisions](./research.md)
- [OpenAPI Contract](./contracts/user-api.yaml)
