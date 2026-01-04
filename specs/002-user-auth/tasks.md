# Tasks: User Authentication Service

**Input**: Design documents from `/specs/002-user-auth/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Included per constitution (Test-Driven Development is NON-NEGOTIABLE)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md monorepo structure:
- **Backend**: `services/user/src/`
- **Shared types**: `packages/shared/src/`
- **Tests**: `services/user/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and NestJS service structure

- [x] T001 Create monorepo structure with pnpm workspace in `pnpm-workspace.yaml`
- [x] T002 Initialize User Service NestJS project in `services/user/`
- [x] T003 [P] Initialize shared types package in `packages/shared/`
- [x] T004 [P] Configure TypeScript strict mode in `services/user/tsconfig.json`
- [x] T005 [P] Configure ESLint and Prettier in `services/user/.eslintrc.js`
- [x] T006 [P] Create Docker Compose for local PostgreSQL and Redis in `docker-compose.yml`
- [x] T007 [P] Configure Jest testing framework in `services/user/jest.config.js`
- [x] T008 Generate RSA key pair for JWT signing in `services/user/keys/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Setup

- [x] T009 Configure TypeORM module in `services/user/src/infrastructure/persistence/typeorm.config.ts`
- [x] T010 [P] Create User entity in `services/user/src/domain/entities/user.entity.ts`
- [x] T011 [P] Create OAuthLink entity in `services/user/src/domain/entities/oauth-link.entity.ts`
- [x] T012 [P] Create RefreshToken entity in `services/user/src/domain/entities/refresh-token.entity.ts`
- [x] T013 [P] Create AuthEvent entity in `services/user/src/domain/entities/auth-event.entity.ts`
- [x] T014 Generate initial database migration in `services/user/migrations/`
- [x] T015 Run migration and verify schema

### Infrastructure Services

- [x] T016 [P] Configure Redis module in `services/user/src/infrastructure/cache/redis.module.ts`
- [x] T017 [P] Implement structured logging service in `services/user/src/infrastructure/logging/logger.service.ts`
- [x] T018 [P] Create rate limiting module using @nestjs/throttler in `services/user/src/infrastructure/rate-limit/`
- [x] T019 Implement health check endpoint in `services/user/src/presentation/controllers/health.controller.ts`

### Shared Types & JWT Foundation

- [x] T020 [P] Define JwtPayload interface in `packages/shared/src/types/auth.types.ts`
- [x] T021 [P] Define User types and DTOs in `packages/shared/src/types/user.types.ts`
- [x] T022 Implement JWT service (sign/verify) in `services/user/src/infrastructure/auth/jwt.service.ts`
- [x] T023 Implement JWT strategy for Passport in `services/user/src/infrastructure/auth/jwt.strategy.ts`
- [x] T024 Create JwtAuthGuard in `services/user/src/presentation/guards/jwt-auth.guard.ts`

### Auth Event Logging

- [x] T025 Implement AuthEventService for audit logging in `services/user/src/application/auth/auth-event.service.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Google Sign-In (Priority: P1) 🎯 MVP

**Goal**: Users can sign in with Google account and receive JWT tokens

**Independent Test**: Initiate Google OAuth flow → receive callback → verify JWT issued and user created

### Tests for User Story 1

- [x] T026 [P] [US1] Contract test for POST /auth/google/callback in `services/user/tests/contract/google-auth.contract.test.ts`
- [x] T027 [P] [US1] Integration test for Google OAuth flow in `services/user/tests/integration/google-auth.integration.test.ts`
- [x] T028 [P] [US1] Unit test for GoogleOAuthUseCase in `services/user/tests/unit/google-oauth.usecase.test.ts`

### Implementation for User Story 1

- [x] T029 [P] [US1] Create UserRepository interface in `services/user/src/domain/repositories/user.repository.ts`
- [x] T030 [P] [US1] Create OAuthLinkRepository interface in `services/user/src/domain/repositories/oauth-link.repository.ts`
- [x] T031 [P] [US1] Implement TypeORM UserRepository in `services/user/src/infrastructure/persistence/user.repository.impl.ts`
- [x] T032 [P] [US1] Implement TypeORM OAuthLinkRepository in `services/user/src/infrastructure/persistence/oauth-link.repository.impl.ts`
- [x] T033 [US1] Configure Google Passport strategy in `services/user/src/infrastructure/auth/google.strategy.ts`
- [x] T034 [US1] Implement GoogleOAuthUseCase (create/link user, issue tokens) in `services/user/src/application/auth/google-oauth.usecase.ts`
- [x] T035 [US1] Create token response DTOs in `services/user/src/presentation/dto/token.dto.ts`
- [x] T036 [US1] Implement AuthController with Google endpoints in `services/user/src/presentation/controllers/auth.controller.ts`
- [x] T037 [US1] Add OAuth state validation (CSRF protection) in `services/user/src/infrastructure/auth/oauth-state.service.ts`
- [x] T038 [US1] Wire up AuthModule with all Google OAuth components in `services/user/src/auth.module.ts`

**Checkpoint**: User Story 1 complete - Google sign-in functional and tested

---

## Phase 4: User Story 2 - Apple Sign-In (Priority: P1)

**Goal**: Users can sign in with Apple ID and receive JWT tokens

**Independent Test**: Initiate Apple Sign In → receive callback → verify JWT issued (handle private relay email)

### Tests for User Story 2

- [x] T039 [P] [US2] Contract test for POST /auth/apple/callback in `services/user/tests/contract/apple-auth.contract.test.ts`
- [x] T040 [P] [US2] Integration test for Apple Sign In flow in `services/user/tests/integration/apple-auth.integration.test.ts`
- [x] T041 [P] [US2] Unit test for AppleSignInUseCase in `services/user/tests/unit/apple-signin.usecase.test.ts`

### Implementation for User Story 2

- [x] T042 [US2] Configure Apple Passport strategy in `services/user/src/infrastructure/auth/apple.strategy.ts`
- [x] T043 [US2] Implement Apple identity token verification in `services/user/src/infrastructure/auth/apple-token.service.ts`
- [x] T044 [US2] Implement AppleSignInUseCase in `services/user/src/application/auth/apple-signin.usecase.ts`
- [x] T045 [US2] Add Apple callback endpoint to AuthController in `services/user/src/presentation/controllers/auth.controller.ts`
- [x] T046 [US2] Handle private relay email edge case in AppleSignInUseCase

**Checkpoint**: User Story 2 complete - Apple Sign In functional and tested

---

## Phase 5: User Story 3 - Token Refresh & Session (Priority: P1)

**Goal**: Users maintain sessions via automatic token refresh

**Independent Test**: Issue short-lived token → make request with expired token + refresh token → receive new tokens

### Tests for User Story 3

- [x] T047 [P] [US3] Contract test for POST /tokens/refresh in `services/user/tests/contract/token-refresh.contract.test.ts`
- [x] T048 [P] [US3] Contract test for POST /tokens/revoke in `services/user/tests/contract/token-revoke.contract.test.ts`
- [x] T049 [P] [US3] Integration test for token lifecycle in `services/user/tests/integration/token-lifecycle.integration.test.ts`
- [x] T050 [P] [US3] Unit test for TokenRefreshUseCase in `services/user/tests/unit/token-refresh.usecase.test.ts`

### Implementation for User Story 3

- [x] T051 [P] [US3] Create RefreshTokenRepository interface in `services/user/src/domain/repositories/refresh-token.repository.ts`
- [x] T052 [US3] Implement TypeORM RefreshTokenRepository in `services/user/src/infrastructure/persistence/refresh-token.repository.impl.ts`
- [x] T053 [US3] Implement RefreshTokenService (hash, store, rotate) in `services/user/src/application/auth/refresh-token.service.ts`
- [x] T054 [US3] Implement TokenRefreshUseCase in `services/user/src/application/auth/token-refresh.usecase.ts`
- [x] T055 [US3] Implement LogoutUseCase (single token revoke) in `services/user/src/application/auth/logout.usecase.ts`
- [x] T056 [US3] Create TokenController with refresh/revoke endpoints in `services/user/src/presentation/controllers/token.controller.ts`
- [x] T057 [US3] Implement token blacklist in Redis in `services/user/src/infrastructure/cache/token-blacklist.service.ts`
- [x] T058 [US3] Add revoke-all endpoint for logout everywhere in TokenController

**Checkpoint**: User Story 3 complete - Token refresh and revocation functional

---

## Phase 6: User Story 4 - Profile Management (Priority: P2)

**Goal**: Users can view and update their profile information

**Independent Test**: Get profile → update display_name → verify persistence across sessions

### Tests for User Story 4

- [x] T059 [P] [US4] Contract test for GET /profile in `services/user/tests/contract/profile-get.contract.test.ts`
- [x] T060 [P] [US4] Contract test for PATCH /profile in `services/user/tests/contract/profile-update.contract.test.ts`
- [x] T061 [P] [US4] Integration test for profile sync across sessions in `services/user/tests/integration/profile-sync.integration.test.ts`
- [x] T062 [P] [US4] Unit test for ProfileService in `services/user/tests/unit/profile.service.test.ts`

### Implementation for User Story 4

- [x] T063 [US4] Implement ProfileService in `services/user/src/application/profile/profile.service.ts`
- [x] T064 [US4] Create profile DTOs (request/response) in `services/user/src/presentation/dto/profile.dto.ts`
- [x] T065 [US4] Create ProfileController in `services/user/src/presentation/controllers/profile.controller.ts`
- [x] T066 [US4] Add display_name validation (1-100 chars, allowed characters) in ProfileService
- [x] T067 [US4] Add GET /profile/oauth-links endpoint to ProfileController

**Checkpoint**: User Story 4 complete - Profile management functional

---

## Phase 7: User Story 5 - Household Management (Priority: P2)

**Goal**: Users can create/join households and manage membership

**Independent Test**: Create household → generate invite → second user joins → verify shared membership

### Tests for User Story 5

- [x] T068 [P] [US5] Contract test for POST /household in `services/user/tests/contract/household-create.contract.test.ts`
- [x] T069 [P] [US5] Contract test for POST /household/join in `services/user/tests/contract/household-join.contract.test.ts`
- [x] T070 [P] [US5] Contract test for POST /household/invites in `services/user/tests/contract/household-invite.contract.test.ts`
- [x] T071 [P] [US5] Integration test for household lifecycle in `services/user/tests/integration/household-lifecycle.integration.test.ts`
- [x] T072 [P] [US5] Unit test for HouseholdService in `services/user/tests/unit/household.service.test.ts`

### Implementation for User Story 5

- [x] T073 [P] [US5] Create Household entity in `services/user/src/domain/entities/household.entity.ts`
- [x] T074 [P] [US5] Create HouseholdMember entity in `services/user/src/domain/entities/household-member.entity.ts`
- [x] T075 [P] [US5] Create HouseholdInvite entity in `services/user/src/domain/entities/household-invite.entity.ts`
- [x] T076 Generate household migration in `services/user/migrations/`
- [x] T077 [P] [US5] Create HouseholdRepository interface in `services/user/src/domain/repositories/household.repository.ts`
- [x] T078 [US5] Implement TypeORM HouseholdRepository in `services/user/src/infrastructure/persistence/household.repository.impl.ts`
- [x] T079 [US5] Implement HouseholdService (create, join, leave, invite) in `services/user/src/application/household/household.service.ts`
- [x] T080 [US5] Implement invite code generation (8 char, no ambiguous chars) in HouseholdService
- [x] T081 [US5] Create household DTOs in `services/user/src/presentation/dto/household.dto.ts`
- [x] T082 [US5] Create HouseholdController in `services/user/src/presentation/controllers/household.controller.ts`
- [x] T083 [US5] Implement ownership transfer logic in HouseholdService
- [x] T084 [US5] Add member removal endpoint (owner only) to HouseholdController
- [x] T085 [US5] Enforce single household membership per user

**Checkpoint**: User Story 5 complete - Household management functional

---

## Phase 8: User Story 6 - Account Deletion/GDPR (Priority: P2)

**Goal**: Users can request account deletion with 30-day grace period

**Independent Test**: Request deletion → verify grace period set → cancel → verify restored → wait 30 days → verify hard delete

### Tests for User Story 6

- [x] T086 [P] [US6] Contract test for POST /account/delete in `services/user/tests/contract/account-delete.contract.test.ts`
- [x] T087 [P] [US6] Contract test for POST /account/delete/cancel in `services/user/tests/contract/account-delete-cancel.contract.test.ts`
- [x] T088 [P] [US6] Integration test for GDPR deletion flow in `services/user/tests/integration/gdpr-deletion.integration.test.ts`
- [x] T089 [P] [US6] Unit test for AccountDeletionService in `services/user/tests/unit/account-deletion.service.test.ts`

### Implementation for User Story 6

- [x] T090 [US6] Implement AccountDeletionService (request, cancel, process) in `services/user/src/application/account/account-deletion.service.ts`
- [x] T091 [US6] Create account DTOs in `services/user/src/presentation/dto/account.dto.ts`
- [x] T092 [US6] Create AccountController with delete endpoints in `services/user/src/presentation/controllers/account.controller.ts`
- [x] T093 [US6] Implement scheduled deletion job in `services/user/src/infrastructure/jobs/deletion-processor.job.ts`
- [x] T094 [US6] Configure NestJS scheduler for daily deletion check at 02:00 UTC
- [x] T095 [US6] Handle household ownership transfer on account deletion
- [x] T096 [US6] Log all deletion events to AuthEvent table

**Checkpoint**: User Story 6 complete - GDPR-compliant account deletion functional

---

## Phase 9: User Story 7 - CLI Authentication (Priority: P3)

**Goal**: CLI users can authenticate via OAuth 2.0 Device Flow

**Independent Test**: Request device code → display URL + user code → poll → authorize in browser → receive tokens

### Tests for User Story 7

- [x] T097 [P] [US7] Contract test for POST /auth/device/code in `services/user/tests/contract/device-code.contract.test.ts`
- [x] T098 [P] [US7] Contract test for POST /auth/device/token in `services/user/tests/contract/device-token.contract.test.ts`
- [x] T099 [P] [US7] Integration test for device flow in `services/user/tests/integration/device-flow.integration.test.ts`
- [x] T100 [P] [US7] Unit test for DeviceFlowUseCase in `services/user/tests/unit/device-flow.usecase.test.ts`

### Implementation for User Story 7

- [x] T101 [P] [US7] Create DeviceCode entity in `services/user/src/domain/entities/device-code.entity.ts`
- [x] T102 Generate device_code migration in `services/user/migrations/`
- [x] T103 [US7] Implement DeviceFlowUseCase in `services/user/src/application/auth/device-flow.usecase.ts`
- [x] T104 [US7] Generate user-friendly device codes (XXXX-XXXX format) in DeviceFlowUseCase
- [x] T105 [US7] Add device code endpoints to AuthController
- [x] T106 [US7] Create device authorization web page in `services/user/src/presentation/views/device-auth.html`
- [x] T107 [US7] Implement device code expiration (15 min) and polling rate limit (5s interval)

**Checkpoint**: User Story 7 complete - CLI device flow authentication functional

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Security Hardening

- [x] T108 [P] Implement AES-256 encryption for refresh tokens at rest in RefreshTokenRepository
- [x] T109 [P] Add CORS configuration in `services/user/src/main.ts`
- [x] T110 [P] Add Helmet middleware for security headers
- [x] T111 Audit all endpoints for proper auth guards

### Observability

- [x] T112 [P] Add OpenTelemetry tracing in `services/user/src/infrastructure/tracing/`
- [x] T113 [P] Create Grafana dashboard config in `services/user/monitoring/`
- [x] T114 Add request ID middleware for distributed tracing

### Documentation & DevEx

- [x] T115 [P] Generate Swagger/OpenAPI from decorators in NestJS
- [x] T116 [P] Create Dockerfile in `services/user/Dockerfile`
- [x] T117 [P] Add docker-compose service definitions
- [x] T118 Update quickstart.md with final setup instructions
- [x] T119 Run full test suite and verify coverage >80%

### Cleanup Jobs

- [x] T120 [P] Implement expired refresh token cleanup job
- [x] T121 [P] Implement expired invite code cleanup job
- [x] T122 [P] Implement auth event retention cleanup job (90 days)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──► Phase 2 (Foundational) ──┬──► Phase 3 (US1: Google) ─┐
                                              │                           │
                                              ├──► Phase 4 (US2: Apple) ──┤
                                              │                           │
                                              └──► Phase 5 (US3: Token) ──┤
                                                                          │
                                       ┌──────────────────────────────────┘
                                       │
                                       ├──► Phase 6 (US4: Profile)
                                       │
                                       ├──► Phase 7 (US5: Household)
                                       │
                                       ├──► Phase 8 (US6: GDPR)
                                       │
                                       └──► Phase 9 (US7: CLI)
                                                      │
                                                      ▼
                                              Phase 10 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (Google) | Foundational | US2, US3 |
| US2 (Apple) | Foundational | US1, US3 |
| US3 (Token) | Foundational | US1, US2 |
| US4 (Profile) | US1 or US2 (need auth) | US5, US6, US7 |
| US5 (Household) | US1 or US2 (need auth) | US4, US6, US7 |
| US6 (GDPR) | US1 or US2 (need auth) | US4, US5, US7 |
| US7 (CLI) | US1 (uses Google for device auth) | US4, US5, US6 |

### Within Each User Story

1. Tests MUST be written and FAIL before implementation (TDD)
2. Entities/Models before repositories
3. Repositories before services/use cases
4. Services before controllers
5. Integration tests verify story is complete

---

## Parallel Opportunities

### Phase 2 Parallelization

```
# Launch all entities in parallel:
T010 User entity
T011 OAuthLink entity
T012 RefreshToken entity
T013 AuthEvent entity

# Launch infrastructure modules in parallel:
T016 Redis module
T017 Logger service
T018 Rate limiting
T019 Health endpoint

# Launch shared types in parallel:
T020 JwtPayload types
T021 User types
```

### User Story 1 (Google Auth) Parallelization

```
# Launch tests in parallel:
T026 Contract test
T027 Integration test
T028 Unit test

# Launch repositories in parallel:
T029 UserRepository interface
T030 OAuthLinkRepository interface
T031 UserRepository implementation
T032 OAuthLinkRepository implementation
```

### Multi-Story Parallelization

After Phase 2, with multiple developers:
```
Developer A: US1 (Google) → US4 (Profile) → US7 (CLI)
Developer B: US2 (Apple) → US5 (Household)
Developer C: US3 (Token) → US6 (GDPR) → Polish
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only) 🎯

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (Google Sign-In)
4. **VALIDATE**: Test Google auth end-to-end
5. Complete Phase 4: User Story 2 (Apple Sign-In)
6. Complete Phase 5: User Story 3 (Token Refresh)
7. **MVP READY**: Basic authentication functional

### Full Feature Delivery

1. MVP complete (US1-3)
2. Add US4: Profile Management
3. Add US5: Household Management
4. Add US6: GDPR Deletion
5. Add US7: CLI Authentication
6. Phase 10: Polish & Hardening
7. **V1.0 READY**: All features complete

### Suggested MVP Scope

For fastest time-to-value, implement only:
- Phase 1: Setup
- Phase 2: Foundational
- Phase 3: User Story 1 (Google Sign-In)
- Phase 5: User Story 3 (Token Refresh)

This delivers functional authentication in minimum tasks.

---

## Task Summary

| Phase | Story | Task Count | Parallel Tasks |
|-------|-------|------------|----------------|
| 1 | Setup | 8 | 5 |
| 2 | Foundational | 17 | 10 |
| 3 | US1: Google | 13 | 8 |
| 4 | US2: Apple | 8 | 3 |
| 5 | US3: Token | 12 | 5 |
| 6 | US4: Profile | 9 | 4 |
| 7 | US5: Household | 18 | 7 |
| 8 | US6: GDPR | 11 | 4 |
| 9 | US7: CLI | 11 | 5 |
| 10 | Polish | 15 | 11 |
| **Total** | | **122** | **62 (51%)** |

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story
- Each user story is independently testable after completion
- TDD required: verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
