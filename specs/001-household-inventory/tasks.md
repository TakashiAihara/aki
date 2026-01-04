# Tasks: 家庭用在庫管理システム (Household Inventory Management)

**Input**: Design documents from `/specs/001-household-inventory/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓
**Dependency**: `002-user-auth` (User Service with authentication and household management)

**Tests**: Included per constitution (Test-Driven Development is NON-NEGOTIABLE)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md monorepo structure:
- **Backend**: `services/nutrition/src/`
- **Web**: `apps/web/src/app/inventory/`
- **Mobile**: `apps/mobile/src/`
- **CLI**: `apps/cli/src/`
- **Shared types**: `packages/shared/src/nutrition/`
- **Tests**: `services/nutrition/tests/`, `apps/*/tests/`

---

## Phase 1: Setup (Nutrition Service Infrastructure)

**Purpose**: Initialize Nutrition microservice structure

- [ ] T001 Initialize Nutrition Service NestJS project in `services/nutrition/`
- [ ] T002 [P] Add nutrition types to shared package in `packages/shared/src/nutrition/`
- [ ] T003 [P] Configure TypeScript strict mode in `services/nutrition/tsconfig.json`
- [ ] T004 [P] Configure ESLint and Prettier in `services/nutrition/.eslintrc.js`
- [ ] T005 [P] Configure Jest testing framework in `services/nutrition/jest.config.js`
- [ ] T006 [P] Add Nutrition Service to docker-compose in `docker-compose.yml`
- [ ] T007 Configure TypeORM module in `services/nutrition/src/infrastructure/persistence/typeorm.config.ts`
- [ ] T008 [P] Implement health check endpoint in `services/nutrition/src/presentation/controllers/health.controller.ts`
- [ ] T009 [P] Configure JWT authentication (reuse from user service) in `services/nutrition/src/infrastructure/auth/`

---

## Phase 2: Database Schema & Entities

**Purpose**: Create database schema and domain entities

### Entities

- [ ] T010 [P] Create Category entity in `services/nutrition/src/domain/entities/category.entity.ts`
- [ ] T011 [P] Create StorageLocation entity in `services/nutrition/src/domain/entities/storage-location.entity.ts`
- [ ] T012 Create InventoryItem entity in `services/nutrition/src/domain/entities/inventory-item.entity.ts`

### Migrations

- [ ] T013 Generate initial migration for categories and storage_locations in `services/nutrition/migrations/`
- [ ] T014 Generate migration for inventory_items table with indexes
- [ ] T015 [P] Add seed data for categories (野菜, 果物, 肉類, etc.)
- [ ] T016 [P] Add seed data for storage locations (冷蔵庫, 冷凍庫, etc.)
- [ ] T017 Run migrations and verify schema

### Repositories

- [ ] T018 [P] Create CategoryRepository interface and implementation
- [ ] T019 [P] Create StorageLocationRepository interface and implementation
- [ ] T020 Create InventoryItemRepository interface in `services/nutrition/src/domain/repositories/`
- [ ] T021 Implement InventoryItemRepository with TypeORM

**Checkpoint**: Database schema ready

---

## Phase 3: User Story 1 - 在庫アイテムの追加と閲覧 (Priority: P1)

**Goal**: Users can add and view inventory items

**Independent Test**: Add item → verify in list → view detail

### Tests for US1

- [ ] T022 [P] [US1] Contract test for POST /inventory/items in `services/nutrition/tests/contract/`
- [ ] T023 [P] [US1] Contract test for GET /inventory/items (list)
- [ ] T024 [P] [US1] Contract test for GET /inventory/items/:id (detail)
- [ ] T025 [P] [US1] Integration test for item creation flow
- [ ] T026 [P] [US1] Unit test for AddItemUseCase

### Implementation for US1

- [ ] T027 [US1] Implement AddItemUseCase in `services/nutrition/src/application/inventory/add-item.usecase.ts`
- [ ] T028 [US1] Implement GetItemUseCase for single item retrieval
- [ ] T029 [US1] Implement ListItemsUseCase with pagination
- [ ] T030 [US1] Create inventory DTOs in `services/nutrition/src/presentation/dto/inventory.dto.ts`
- [ ] T031 [US1] Create InventoryController in `services/nutrition/src/presentation/controllers/inventory.controller.ts`
- [ ] T032 [US1] Implement duplicate merge logic (same name + expiration → merge quantities)
- [ ] T033 [US1] Wire up InventoryModule in `services/nutrition/src/inventory.module.ts`

**Checkpoint**: US1 complete - Basic CRUD working

---

## Phase 4: User Story 2 - 在庫アイテムの更新と削除 (Priority: P2)

**Goal**: Users can update and delete inventory items

**Independent Test**: Update quantity → verify change → delete → verify removed

### Tests for US2

- [ ] T034 [P] [US2] Contract test for PATCH /inventory/items/:id
- [ ] T035 [P] [US2] Contract test for DELETE /inventory/items/:id
- [ ] T036 [P] [US2] Integration test for item update/delete lifecycle
- [ ] T037 [P] [US2] Unit test for UpdateItemUseCase
- [ ] T038 [P] [US2] Unit test for DeleteItemUseCase

### Implementation for US2

- [ ] T039 [US2] Implement UpdateItemUseCase in `services/nutrition/src/application/inventory/update-item.usecase.ts`
- [ ] T040 [US2] Implement DeleteItemUseCase
- [ ] T041 [US2] Add update/delete endpoints to InventoryController
- [ ] T042 [US2] Implement is_depleted auto-flag (quantity = 0 → depleted)
- [ ] T043 [US2] Add updated_by and updated_at tracking

**Checkpoint**: US2 complete - Full item lifecycle

---

## Phase 5: User Story 3 - 検索とフィルタリング (Priority: P3)

**Goal**: Users can search and filter inventory items

**Independent Test**: Search by name → filter by category → filter by expiration

### Tests for US3

- [ ] T044 [P] [US3] Contract test for GET /inventory/items?search=...
- [ ] T045 [P] [US3] Contract test for GET /inventory/items?category=...
- [ ] T046 [P] [US3] Contract test for GET /inventory/items?expiring_soon=true
- [ ] T047 [P] [US3] Integration test for search/filter combinations
- [ ] T048 [P] [US3] Unit test for search query builder

### Implementation for US3

- [ ] T049 [US3] Add search query parameter (name partial match)
- [ ] T050 [US3] Add category filter parameter
- [ ] T051 [US3] Add storage_location filter parameter
- [ ] T052 [US3] Add expiring_soon filter (within 3 days)
- [ ] T053 [US3] Add include_depleted filter (default false)
- [ ] T054 [US3] Implement cursor-based pagination

**Checkpoint**: US3 complete - Search and filtering functional

---

## Phase 6: Reference Data API

**Purpose**: API endpoints for categories and storage locations

- [ ] T055 [P] Contract test for GET /categories
- [ ] T056 [P] Contract test for GET /storage-locations
- [ ] T057 Implement CategoriesController in `services/nutrition/src/presentation/controllers/categories.controller.ts`
- [ ] T058 Implement StorageLocationsController
- [ ] T059 Add caching for reference data (Redis, 1 hour TTL)

---

## Phase 7: User Story 4 - Web Application (Priority: P4)

**Goal**: Web interface for inventory management

**Independent Test**: Access web → add item → view list → update → delete

### Tests for Web

- [ ] T060 [P] [US4] E2E test for inventory list page with Playwright
- [ ] T061 [P] [US4] E2E test for add item flow
- [ ] T062 [P] [US4] E2E test for edit/delete item

### Implementation for Web

- [ ] T063 [US4] Create inventory API client in `apps/web/src/lib/api/inventory.ts`
- [ ] T064 [US4] Create inventory list page in `apps/web/src/app/inventory/page.tsx`
- [ ] T065 [US4] Create add item page in `apps/web/src/app/inventory/add/page.tsx`
- [ ] T066 [US4] Create item detail/edit page in `apps/web/src/app/inventory/[id]/page.tsx`
- [ ] T067 [US4] Implement search/filter UI components
- [ ] T068 [US4] Add expiration date warning badges
- [ ] T069 [US4] Add depleted item visual styling

**Checkpoint**: US4 Web complete - Full web interface

---

## Phase 8: CLI Application

**Goal**: Command-line interface for inventory management

### CLI Setup

- [ ] T070 Initialize CLI project in `apps/cli/`
- [ ] T071 [P] Configure Commander.js
- [ ] T072 [P] Implement API client for CLI in `apps/cli/src/api-client.ts`
- [ ] T073 Implement authentication (device flow integration)

### CLI Commands

- [ ] T074 [P] Implement `akimi inventory list` command
- [ ] T075 [P] Implement `akimi inventory add` command
- [ ] T076 [P] Implement `akimi inventory update` command
- [ ] T077 [P] Implement `akimi inventory delete` command
- [ ] T078 [P] Implement `akimi inventory search` command
- [ ] T079 Add colorized output for expiration warnings

**Checkpoint**: CLI complete

---

## Phase 9: Mobile Application Foundation

**Goal**: React Native app setup with offline support

### Mobile Setup

- [ ] T080 Initialize React Native/Expo project in `apps/mobile/`
- [ ] T081 [P] Configure navigation (React Navigation)
- [ ] T082 [P] Configure state management (Zustand or Redux)
- [ ] T083 Configure SQLite for local storage (offline)

### Mobile Screens

- [ ] T084 [US4] Create InventoryListScreen in `apps/mobile/src/screens/inventory/`
- [ ] T085 [US4] Create AddItemScreen
- [ ] T086 [US4] Create ItemDetailScreen
- [ ] T087 [US4] Implement search/filter UI

### Offline Sync

- [ ] T088 Implement offline queue service in `apps/mobile/src/services/offline-sync.service.ts`
- [ ] T089 Contract test for POST /inventory/sync
- [ ] T090 Implement SyncOfflineChangesUseCase in backend
- [ ] T091 Add sync endpoint to InventoryController
- [ ] T092 Implement Last Write Wins conflict resolution
- [ ] T093 Add conflict notification UI in mobile app

**Checkpoint**: Mobile MVP complete with offline sync

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Security hardening, observability, documentation

### Security

- [ ] T094 [P] Implement Row-Level Security (RLS) policies
- [ ] T095 [P] Add CORS configuration for nutrition service
- [ ] T096 [P] Add Helmet middleware
- [ ] T097 Audit all endpoints for proper auth guards

### Observability

- [ ] T098 [P] Add OpenTelemetry tracing
- [ ] T099 [P] Create Grafana dashboard for nutrition service
- [ ] T100 Add request ID middleware

### Documentation

- [ ] T101 [P] Generate Swagger/OpenAPI documentation
- [ ] T102 [P] Create Dockerfile for nutrition service
- [ ] T103 [P] Add docker-compose service definitions
- [ ] T104 Update quickstart.md with final setup instructions
- [ ] T105 Run full test suite and verify coverage >80%

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──► Phase 2 (Database) ──► Phase 3 (US1: Add/View)
                                                      │
                                           ┌──────────┴──────────┐
                                           ▼                     ▼
                                    Phase 4 (US2)         Phase 5 (US3)
                                           │                     │
                                           └──────────┬──────────┘
                                                      ▼
                                              Phase 6 (Reference)
                                                      │
                              ┌───────────────────────┼───────────────────────┐
                              ▼                       ▼                       ▼
                      Phase 7 (Web)            Phase 8 (CLI)           Phase 9 (Mobile)
                              │                       │                       │
                              └───────────────────────┴───────────────────────┘
                                                      │
                                                      ▼
                                              Phase 10 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (Add/View) | Database | - |
| US2 (Update/Delete) | US1 | US3 |
| US3 (Search/Filter) | US1 | US2 |
| US4 (Multi-platform) | US1-3 | - |

---

## Parallel Opportunities

### Phase 2 Parallelization

```
# Launch entities in parallel:
T010 Category entity
T011 StorageLocation entity

# Launch repositories in parallel:
T018 CategoryRepository
T019 StorageLocationRepository
```

### US1-3 Test Parallelization

```
# All contract tests can run in parallel:
T022 POST /inventory/items
T023 GET /inventory/items
T024 GET /inventory/items/:id
T034 PATCH /inventory/items/:id
T035 DELETE /inventory/items/:id
```

### Client Platform Parallelization

After backend is complete, with multiple developers:
```
Developer A: Phase 7 (Web)
Developer B: Phase 8 (CLI)
Developer C: Phase 9 (Mobile)
```

---

## Implementation Strategy

### MVP First (Backend + Web)

1. Complete Phase 1: Setup
2. Complete Phase 2: Database
3. Complete Phase 3: US1 (Add/View)
4. **VALIDATE**: Test add/view end-to-end
5. Complete Phase 4: US2 (Update/Delete)
6. Complete Phase 5: US3 (Search/Filter)
7. Complete Phase 6: Reference Data
8. Complete Phase 7: Web Application
9. **MVP READY**: Backend + Web functional

### Full Feature Delivery

1. MVP complete (Backend + Web)
2. Add Phase 8: CLI
3. Add Phase 9: Mobile with Offline Sync
4. Phase 10: Polish & Hardening
5. **V1.0 READY**: All platforms complete

---

## Task Summary

| Phase | Focus | Task Count | Parallel Tasks |
|-------|-------|------------|----------------|
| 1 | Setup | 9 | 6 |
| 2 | Database | 12 | 6 |
| 3 | US1: Add/View | 12 | 5 |
| 4 | US2: Update/Delete | 10 | 5 |
| 5 | US3: Search/Filter | 11 | 5 |
| 6 | Reference Data | 5 | 2 |
| 7 | Web App | 10 | 3 |
| 8 | CLI | 10 | 5 |
| 9 | Mobile + Sync | 14 | 3 |
| 10 | Polish | 12 | 7 |
| **Total** | | **105** | **47 (45%)** |

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story
- Each user story is independently testable after completion
- TDD required: verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Dependency on 002-user-auth**: JWT authentication, household_id from token
