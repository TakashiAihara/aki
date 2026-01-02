# Implementation Plan: 家庭用在庫管理システム (Household Inventory Management)

**Branch**: `001-household-inventory` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-household-inventory/spec.md`

## Summary

Basic household inventory management system enabling users to track food items and household products across iOS, Android, Web, and CLI platforms. Core features include item CRUD operations, search/filtering, multi-user household sharing, and offline sync for mobile apps. This feature implements the foundation of the Nutrition bounded context, focusing on inventory tracking before extending to meal planning and nutrition analysis in future iterations.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 20 LTS
**Primary Dependencies**: NestJS 10 (backend), Next.js 14 (web), Expo/React Native 0.73 (mobile), Commander.js (CLI)
**Storage**: PostgreSQL 16 (primary data), Redis 7 (caching, offline sync queue)
**Testing**: Jest 29 (unit), Supertest (API integration), Pact (contract), Playwright (E2E web), Detox (E2E mobile)
**Target Platform**: Multi-platform - iOS 15+, Android 10+, Modern browsers, Linux/macOS/Windows (CLI), Docker containers (backend)
**Project Type**: Microservice + Multi-platform clients (Mobile + Web + CLI)
**Performance Goals**: <200ms p95 API latency, <2s list rendering (500 items), <5s cross-platform sync
**Constraints**: Offline-first mobile apps, 100 concurrent users (initial), Last Write Wins conflict resolution
**Scale/Scope**: ~15 API endpoints, 5 entities, 4 client platforms, 1 microservice

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Specification-Driven Development
- **Status**: PASS
- **Evidence**: spec.md complete with 4 prioritized user stories, 23 functional requirements, 8 success criteria
- **Clarifications**: 5 critical decisions resolved via /speckit.clarify (zero-qty handling, duplicate items, expired display, household sharing, conflict resolution)

### ✅ II. Test-Driven Development
- **Status**: PASS
- **Requirements**:
  - Contract tests for all 15 API endpoints (Pact)
  - Integration tests for 4 user stories (Supertest + Playwright/Detox)
  - Unit tests for domain logic (inventory merge, expiration detection, conflict resolution)
- **Coverage Target**: 80%+ per constitution

### ✅ III. Domain-Driven Design
- **Status**: PASS
- **Bounded Context**: Nutrition (食材管理、在庫管理、賞味期限管理)
- **Aggregates**: InventoryItem (root), Household (root)
- **Value Objects**: Category, StorageLocation, ExpirationStatus
- **Domain Events**: ItemAdded, ItemUpdated, ItemDeleted, ItemDepleted, HouseholdCreated, MemberInvited
- **Rationale**: Inventory management is a subdomain of Nutrition context. Clean separation from future Diet and Meal Planning contexts.

### ✅ IV. Microservices Architecture
- **Status**: PASS
- **Service**: `services/nutrition` (new microservice)
- **Database**: Dedicated PostgreSQL instance for nutrition service
- **Communication**: REST API via API Gateway, future event bus for cross-service integration (e.g., Diet service consuming inventory data)
- **Independence**: Fully deployable independently, no hard dependencies on other services yet

### ✅ V. Monorepo & TypeScript
- **Status**: PASS
- **Structure**:
  - `services/nutrition/` - Inventory management microservice
  - `apps/web/` - Next.js web app (shared with other features)
  - `apps/mobile/` - React Native app (shared with other features)
  - `apps/cli/` - CLI tool (new, inventory-focused initially)
  - `packages/shared/` - Common types (InventoryDTO, HouseholdDTO)
- **Package Manager**: pnpm (per constitution)
- **Type Safety**: Full TypeScript across all layers

### ✅ VI. Observability & Monitoring
- **Status**: PASS
- **Requirements**:
  - Structured JSON logging (Winston)
  - `/health` endpoint on nutrition service
  - Distributed tracing for cross-platform sync operations
  - Error-level logging for sync conflicts, invitation failures
  - Metrics: API latency, sync queue depth, conflict rate

### ✅ VII. Security & Privacy
- **Status**: PASS
- **Authentication**: JWT + OAuth 2.0 (email/password initially, per spec assumptions)
- **Authorization**: User-scoped inventory, household-scoped for shared mode
- **Data Encryption**: TLS in transit, at-rest encryption for PostgreSQL
- **Privacy**: User data isolated by userId/householdId, no cross-household data leakage
- **Compliance**: GDPR-ready (data retention policy, explicit deletion)

### Gate Evaluation Summary

**Overall Status**: ✅ ALL GATES PASS

No constitution violations. This feature aligns perfectly with the Akimi architecture:
- Fits cleanly into Nutrition bounded context
- Extends existing monorepo without introducing new patterns
- Follows established NestJS + Next.js + React Native stack
- Implements required testing strategy (TDD)
- Maintains security and privacy standards

## Project Structure

### Documentation (this feature)

```text
specs/001-household-inventory/
├── plan.md              # This file
├── spec.md              # Feature specification (complete)
├── research.md          # Technology research & decisions (Phase 0 output)
├── data-model.md        # Entity models & relationships (Phase 1 output)
├── quickstart.md        # Developer setup guide (Phase 1 output)
├── contracts/           # API contracts (Phase 1 output)
│   ├── inventory-api.yaml      # OpenAPI 3.0 spec
│   └── pact/                   # Pact consumer contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist (complete)
└── tasks.md             # Implementation tasks (Phase 2 - /speckit.tasks)
```

### Source Code (repository root)

```text
akimi/
├── services/
│   └── nutrition/                    # NEW: Nutrition microservice
│       ├── src/
│       │   ├── inventory/            # Inventory module
│       │   │   ├── domain/           # Domain entities
│       │   │   │   ├── inventory-item.entity.ts
│       │   │   │   ├── household.entity.ts
│       │   │   │   └── category.entity.ts
│       │   │   ├── application/      # Use cases
│       │   │   │   ├── add-item.usecase.ts
│       │   │   │   ├── update-item.usecase.ts
│       │   │   │   ├── sync-offline-changes.usecase.ts
│       │   │   │   └── create-household.usecase.ts
│       │   │   ├── infrastructure/   # Persistence
│       │   │   │   ├── inventory.repository.ts
│       │   │   │   └── household.repository.ts
│       │   │   └── interface/        # Controllers
│       │   │       ├── inventory.controller.ts
│       │   │       └── household.controller.ts
│       │   ├── shared/               # Shared utilities
│       │   └── main.ts
│       ├── test/
│       │   ├── unit/
│       │   ├── integration/
│       │   └── contract/
│       ├── Dockerfile
│       └── package.json
│
├── apps/
│   ├── web/                          # EXISTING: Next.js app
│   │   └── src/
│   │       └── app/
│   │           └── inventory/        # NEW: Inventory pages
│   │               ├── page.tsx      # List view
│   │               ├── add/page.tsx  # Add item
│   │               └── [id]/page.tsx # Item detail
│   │
│   ├── mobile/                       # EXISTING: React Native app
│   │   └── src/
│   │       ├── screens/
│   │       │   └── inventory/        # NEW: Inventory screens
│   │       │       ├── InventoryListScreen.tsx
│   │       │       ├── AddItemScreen.tsx
│   │       │       └── ItemDetailScreen.tsx
│   │       └── services/
│   │           ├── offline-sync.service.ts  # NEW
│   │           └── inventory-api.service.ts # NEW
│   │
│   └── cli/                          # NEW: CLI application
│       ├── src/
│       │   ├── commands/
│       │   │   ├── list.ts
│       │   │   ├── add.ts
│       │   │   ├── update.ts
│       │   │   └── delete.ts
│       │   ├── api-client.ts
│       │   └── index.ts
│       ├── bin/
│       │   └── akimi-inventory
│       └── package.json
│
├── packages/
│   └── shared/                       # EXISTING: Shared types
│       └── src/
│           └── nutrition/            # NEW: Nutrition domain types
│               ├── inventory-item.dto.ts
│               ├── household.dto.ts
│               └── sync-queue.dto.ts
│
└── tests/
    └── e2e/
        ├── web/                      # NEW: Web E2E tests
        │   └── inventory.spec.ts
        └── mobile/                   # NEW: Mobile E2E tests
            └── inventory.spec.ts
```

**Structure Decision**: Multi-platform microservice implementation following constitution's monorepo pattern. The nutrition service implements the Nutrition bounded context. All clients (web, mobile, CLI) share the backend API. Mobile apps include offline-first architecture with local persistence and sync queue. This aligns with Option 3 (Mobile + API) but extended with Web and CLI clients.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. All constitution principles satisfied.
