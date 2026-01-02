# Technology Research & Decisions

**Feature**: 家庭用在庫管理システム (Household Inventory Management)
**Date**: 2026-01-01
**Context**: Multi-platform inventory tracking with offline sync and household sharing

## Research Areas

### 1. Offline-First Mobile Architecture

**Decision**: SQLite + AsyncStorage + Background Sync Queue

**Rationale**:
- **SQLite** (via expo-sqlite): Relational database on-device for complex queries (filtering, search)
- **AsyncStorage**: Simple key-value store for sync queue metadata and user preferences
- **Background Sync**: Queue pending operations, sync on connectivity restore using exponential backoff

**Alternatives Considered**:
- **WatermelonDB**: Too heavy for simple inventory tracking, adds unnecessary complexity
- **Realm**: Good option but SQLite is lighter and more familiar to team
- **IndexedDB** (for potential web offline): Deferred to future iteration; web remains online-only per spec

**Implementation Pattern**:
```typescript
// Mobile: Write to local SQLite first, then queue for sync
await localDb.insert(item);
await syncQueue.enqueue({ type: 'CREATE_ITEM', payload: item });
await syncService.trySync(); // Opportunistic immediate sync
```

**References**:
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Offline-First Design Patterns](https://offlinefirst.org/)

---

### 2. Last Write Wins (LWW) Conflict Resolution

**Decision**: Timestamp-based LWW with client-generated timestamps

**Rationale**:
- Simplest conflict resolution strategy (per spec clarification)
- Acceptable for inventory data where perfect consistency isn't critical
- Each device uses server-synchronized time for timestamps
- Server rejects writes with timestamps older than current version

**Alternatives Considered**:
- **CRDTs**: Overcomplicated for inventory use case, harder to reason about
- **Manual conflict resolution**: Poor UX, user shouldn't resolve inventory conflicts
- **Operational Transform**: Unnecessary complexity for simple CRUD operations

**Implementation Pattern**:
```typescript
// Server-side conflict check
if (incomingItem.updatedAt <= existingItem.updatedAt) {
  throw new ConflictError('Stale update detected');
}
// Client notification on overwrite
if (syncResult.conflicts.length > 0) {
  showNotification('Your changes were overwritten by a newer update');
}
```

**Edge Cases Handled**:
- Clock skew: Server provides time offset on auth, clients adjust local timestamps
- Rapid updates: 1ms timestamp resolution prevents same-second collisions
- Network partition: Sync queue preserves operation order, conflicts resolved on reconnect

**References**:
- [Understanding Last-Write-Wins Registers](https://martin.kleppmann.com/2020/12/02/bloom-clocks.html)
- [Distributed Systems: Conflict Resolution](https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html)

---

### 3. Multi-Tenancy Strategy for Household Sharing

**Decision**: Shared-schema multi-tenancy with household_id discriminator

**Rationale**:
- **Shared schema**: Single `inventory_items` table with `household_id` foreign key
- **Row-level security**: PostgreSQL RLS policies enforce household isolation
- **Performance**: Single table index scan faster than schema-per-tenant or database-per-tenant
- **Simplicity**: Easier migrations, backups, monitoring

**Alternatives Considered**:
- **Schema-per-household**: Overkill for small user base, complicates migrations
- **Database-per-household**: Extreme isolation unnecessary for inventory data
- **Separate tables (users_items vs households_items)**: Code duplication, harder to query

**Implementation Pattern**:
```sql
-- PostgreSQL Row-Level Security (RLS)
CREATE POLICY household_isolation ON inventory_items
  USING (household_id = current_setting('app.household_id')::uuid);

-- Application sets context per request
SET LOCAL app.household_id = '<household-id-from-jwt>';
```

**Security Considerations**:
- JWT contains `household_id` claim (or null for personal mode)
- Middleware validates household membership before setting RLS context
- Index on `(household_id, created_at)` optimizes filtered queries

**References**:
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-Tenancy Architectures](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/overview)

---

### 4. Duplicate Item Handling (Same Name + Expiration Date)

**Decision**: Composite unique constraint + ON CONFLICT DO UPDATE

**Rationale**:
- Database-enforced uniqueness on `(household_id, name, expiration_date)`
- Automatic quantity summation via `ON CONFLICT` clause
- Prevents race conditions in concurrent adds
- Transparent to clients (idempotent POST requests)

**Alternatives Considered**:
- **Application-level check**: Race condition prone, requires distributed locking
- **Always create separate**: Violates spec requirement for same-date merging
- **UUID-based deduplication**: Doesn't handle cross-device duplicate entry

**Implementation Pattern**:
```sql
-- Table definition
CREATE UNIQUE INDEX idx_inventory_unique
  ON inventory_items(household_id, LOWER(name), expiration_date);

-- Upsert logic
INSERT INTO inventory_items (household_id, name, quantity, expiration_date)
VALUES ($1, $2, $3, $4)
ON CONFLICT (household_id, LOWER(name), expiration_date)
DO UPDATE SET quantity = inventory_items.quantity + EXCLUDED.quantity;
```

**Edge Cases**:
- **Case-insensitive names**: Use `LOWER(name)` in index to treat "Apple" == "apple"
- **Null expiration dates**: Handled as distinct value (non-perishables)
- **Different units**: Out of scope for v1, assume same unit for duplicate merge

**References**:
- [PostgreSQL UPSERT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT)
- [Handling Race Conditions with DB Constraints](https://www.citusdata.com/blog/2016/08/12/count-performance/)

---

### 5. Image Upload & Storage

**Decision**: Direct-to-S3 upload with presigned URLs (deferred to v1.1)

**Rationale**:
- **V1 scope**: Images are optional, deprioritized to focus on core CRUD
- **Future approach**: Client requests presigned S3 URL from API, uploads directly to avoid proxy overhead
- **Storage**: AWS S3 or compatible (MinIO for local dev)
- **Processing**: Optional: Resize with Lambda/Sharp before storing

**Alternatives Considered**:
- **Upload via API**: Wastes backend bandwidth, blocks request threads
- **Base64 in database**: Terrible performance, bloated DB size
- **Third-party CDN**: Adds external dependency, cost

**Deferred Decision Justification**:
- Spec marks images as "optional (任意)"
- V1 focuses on text-based inventory tracking
- Can add image support without schema migration (add `image_url` column later)

**References**:
- [Presigned URLs with S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [Image Upload Best Practices](https://web.dev/fast/#optimize-your-images)

---

### 6. API Design: REST vs GraphQL

**Decision**: RESTful API with OpenAPI 3.0 specification

**Rationale**:
- **Constitution alignment**: Constitution mentions REST as default for microservices
- **Simplicity**: CRUD operations map naturally to REST verbs
- **Tooling**: OpenAPI generates client SDKs, Pact contracts, API docs
- **Caching**: HTTP caching headers work out-of-box with REST

**Alternatives Considered**:
- **GraphQL**: Overfetching not a concern for simple inventory DTOs, adds complexity
- **gRPC**: Better for service-to-service, but harder for web/mobile clients
- **tRPC**: TypeScript-only, locks out non-TS future clients

**API Style Guide**:
```
GET    /v1/inventory/items           - List items (query params: category, search, household_id)
POST   /v1/inventory/items           - Create item (with upsert logic)
GET    /v1/inventory/items/:id       - Get single item
PATCH  /v1/inventory/items/:id       - Update item (partial update)
DELETE /v1/inventory/items/:id       - Delete item
POST   /v1/inventory/sync            - Batch sync endpoint for offline changes
GET    /v1/households/:id/members    - List household members
POST   /v1/households/:id/invitations - Invite member
```

**References**:
- [RESTful API Design Best Practices](https://restfulapi.net/)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)

---

### 7. Mobile State Management

**Decision**: React Query (TanStack Query) + Zustand

**Rationale**:
- **React Query**: Server state management (caching, revalidation, optimistic updates)
- **Zustand**: Local UI state (filters, search, offline queue status)
- **Lightweight**: Both libraries are minimal, play well together
- **TypeScript**: Excellent type inference

**Alternatives Considered**:
- **Redux Toolkit**: Too heavyweight for simple inventory app
- **MobX**: Less idiomatic in React ecosystem
- **Jotai/Recoil**: Similar to Zustand but less adoption

**Implementation Pattern**:
```typescript
// React Query for server state
const { data: items } = useQuery(['inventory'], fetchItems);

// Zustand for UI state
const useFilterStore = create((set) => ({
  category: null,
  setCategory: (cat) => set({ category: cat }),
}));
```

**References**:
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand GitHub](https://github.com/pmndrs/zustand)

---

### 8. CLI Framework & UX

**Decision**: Commander.js + Inquirer.js + Chalk

**Rationale**:
- **Commander.js**: Argument parsing, subcommands, help generation
- **Inquirer.js**: Interactive prompts for missing args (better UX than error messages)
- **Chalk**: Colored output for readability

**CLI Command Structure**:
```bash
akimi-inventory list [--category <cat>] [--search <term>]
akimi-inventory add [--interactive]
akimi-inventory update <id> --quantity <num>
akimi-inventory delete <id>
akimi-inventory sync  # Manual sync trigger
```

**Alternatives Considered**:
- **Yargs**: Similar to Commander, less mainstream
- **oclif**: Overcomplicated for simple CLI
- **Prompts**: Alternative to Inquirer, less feature-rich

**Configuration**:
- API endpoint stored in `~/.akimi/config.json`
- JWT token cached after login command

**References**:
- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Building Great CLI Experiences](https://clig.dev/)

---

### 9. Testing Strategy Breakdown

**Decision**: 4-layer testing pyramid aligned with constitution

**Test Layers**:

1. **Unit Tests (Jest)**
   - Domain logic: Expiration calculation, merge rules, conflict detection
   - Use cases: Business rules isolated from infrastructure
   - Coverage target: 90%+ for domain layer

2. **Contract Tests (Pact)**
   - API consumer contracts (web, mobile, CLI)
   - Verify request/response schemas
   - Run in CI against provider (nutrition service)

3. **Integration Tests (Supertest + Testcontainers)**
   - Full API endpoint tests with real PostgreSQL (Docker)
   - Auth middleware, database transactions, RLS policies
   - Coverage target: 100% of happy paths, critical error paths

4. **E2E Tests (Playwright + Detox)**
   - **Web**: Playwright for user journeys (add item → list → search)
   - **Mobile**: Detox for mobile-specific flows (offline → sync)
   - Run against staging environment

**CI Pipeline Stages**:
```
1. Lint & Type Check
2. Unit Tests (parallel)
3. Contract Tests (Pact Broker)
4. Integration Tests (Testcontainers)
5. E2E Tests (staging deploy → test → teardown)
```

**References**:
- [Test Pyramid by Martin Fowler](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Pact Documentation](https://docs.pact.io/)
- [Testcontainers for Node.js](https://node.testcontainers.org/)

---

### 10. Performance Optimization Strategies

**Decision**: Progressive optimization based on measurable bottlenecks

**Initial Optimizations** (V1):
1. **Database Indexing**:
   - `(household_id, created_at DESC)` for list queries
   - `(household_id, expiration_date)` for near-expiry filtering
   - `(household_id, LOWER(name))` for search

2. **API Response Pagination**:
   - Cursor-based pagination for list endpoint
   - Default page size: 50 items, max: 200

3. **Mobile List Rendering**:
   - React Native FlatList with `getItemLayout` for virtualization
   - Memoize list item components

**Deferred Optimizations** (V1.1+):
- Redis caching for frequently accessed items
- Full-text search with PostgreSQL tsvector (if simple LIKE % insufficient)
- Image CDN integration
- Service worker caching for web app

**Monitoring**:
- Track p95 latency per endpoint
- Alert if sync queue depth > 100 items
- Monitor SQLite database size on mobile

**References**:
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [React Native Performance](https://reactnative.dev/docs/performance)

---

## Summary of Key Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **Offline Storage** | SQLite + AsyncStorage | Relational queries, battle-tested |
| **Conflict Resolution** | Last Write Wins (timestamp) | Simple, acceptable for inventory domain |
| **Multi-Tenancy** | Shared schema + RLS | Performance, simplicity |
| **Duplicate Handling** | Unique constraint + UPSERT | Database-enforced, race-free |
| **API Style** | REST + OpenAPI | Constitution alignment, tooling |
| **State Management** | React Query + Zustand | Lightweight, idiomatic |
| **CLI Framework** | Commander + Inquirer | Feature-rich, good UX |
| **Testing** | 4-layer pyramid | Constitution compliance |

All decisions align with constitution principles and prioritize simplicity over premature optimization.
