# Implementation Plan: User Authentication Service

**Branch**: `002-user-auth` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-user-auth/spec.md`

## Summary

Implement OAuth 2.0 authentication service supporting Google and Apple Sign In, with JWT token issuance, user profile management, household membership, and GDPR-compliant account deletion. This service is the P0 (highest priority) foundation that all other Akimi microservices depend on.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 20 LTS
**Primary Dependencies**: NestJS 10 (backend), Passport.js (OAuth strategies), jose (JWT library)
**Storage**: PostgreSQL 16 (user data, refresh tokens, households), Redis 7 (token blacklist, rate limiting)
**Testing**: Jest 29 (unit), Supertest (API integration), Pact (contract), Playwright (E2E web OAuth flow)
**Target Platform**: Linux server (Docker/Kubernetes), API Gateway integration
**Project Type**: Microservice (part of larger monorepo)
**Performance Goals**: p95 < 200ms for token validation, p95 < 500ms for OAuth callback processing
**Constraints**: GDPR compliance, zero password storage, OAuth 2.0 Device Flow for CLI
**Scale/Scope**: 10,000 concurrent authenticated users, 4 platforms (Web, iOS, Android, CLI)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Specification-Driven Development
- **Status**: PASS
- **Evidence**: spec.md complete with 7 user stories, 32 functional requirements, 10 success criteria
- **Approval**: Spec created and validated with quality checklist

### ✅ II. Test-Driven Development
- **Status**: READY
- **Evidence**: Testing strategy defined (Jest unit, Supertest integration, Pact contract, Playwright E2E)
- **Plan**: Write tests before implementation for all authentication flows

### ✅ III. Domain-Driven Design (DDD)
- **Status**: PASS
- **Evidence**: User Service is defined as independent bounded context per constitution
- **Entities**: User, OAuthLink, RefreshToken, Household, HouseholdMember, HouseholdInvite

### ✅ IV. Microservices Architecture
- **Status**: PASS
- **Evidence**: User Service has independent database (PostgreSQL), communicates via JWT validation
- **Integration**: Other services validate JWTs independently; no synchronous calls to User Service

### ✅ V. Monorepo & TypeScript
- **Status**: PASS
- **Evidence**: Service located at `services/user/`, TypeScript with strict mode
- **Shared**: Common types in `packages/shared/`, reusable OAuth strategies

### ✅ VI. Observability & Monitoring
- **Status**: PLANNED
- **Evidence**: FR-030 requires logging all auth events, health check endpoint planned
- **Implementation**: Structured JSON logging, distributed tracing headers

### ✅ VII. Security & Privacy
- **Status**: PASS
- **Evidence**:
  - OAuth 2.0 only (Google + Apple), no email/password (FR-001, FR-002)
  - JWT for sessions (FR-003, FR-005)
  - Token encryption at rest (FR-029)
  - GDPR deletion with 30-day grace period (FR-021-024)
  - Rate limiting (FR-031)
  - CSRF protection via state parameter (FR-032)

## Project Structure

### Documentation (this feature)

```text
specs/002-user-auth/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI spec)
│   └── user-api.yaml
├── checklists/
│   └── requirements.md  # Quality checklist (complete)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
services/user/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   ├── oauth-link.entity.ts
│   │   │   ├── refresh-token.entity.ts
│   │   │   ├── household.entity.ts
│   │   │   ├── household-member.entity.ts
│   │   │   └── household-invite.entity.ts
│   │   ├── repositories/          # Repository interfaces
│   │   └── services/              # Domain services
│   ├── application/
│   │   ├── auth/                  # Auth use cases
│   │   │   ├── google-oauth.usecase.ts
│   │   │   ├── apple-signin.usecase.ts
│   │   │   ├── device-flow.usecase.ts
│   │   │   ├── token-refresh.usecase.ts
│   │   │   └── logout.usecase.ts
│   │   ├── profile/               # Profile use cases
│   │   └── household/             # Household use cases
│   ├── infrastructure/
│   │   ├── persistence/           # TypeORM repositories
│   │   ├── auth/                  # Passport strategies
│   │   │   ├── google.strategy.ts
│   │   │   ├── apple.strategy.ts
│   │   │   └── jwt.strategy.ts
│   │   ├── cache/                 # Redis integration
│   │   └── logging/               # Structured logging
│   ├── presentation/
│   │   ├── controllers/           # REST controllers
│   │   │   ├── auth.controller.ts
│   │   │   ├── profile.controller.ts
│   │   │   └── household.controller.ts
│   │   ├── guards/                # Auth guards
│   │   └── dto/                   # Request/Response DTOs
│   └── main.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
├── Dockerfile
└── package.json

packages/shared/
├── src/
│   ├── types/
│   │   ├── user.types.ts          # User-related types
│   │   └── auth.types.ts          # JWT payload types
│   └── utils/
│       └── jwt-validation.ts      # Shared JWT validation logic
└── package.json

apps/api-gateway/
├── src/
│   └── middleware/
│       └── jwt-auth.middleware.ts # Gateway JWT validation
└── package.json
```

**Structure Decision**: Monorepo microservice structure following DDD layered architecture. User Service is the first service in `services/` directory. Shared JWT validation utilities go in `packages/shared/` for use by API Gateway and other services.

## Complexity Tracking

> No constitution violations. All principles followed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | N/A | N/A |
