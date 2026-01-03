# Data Model

**Feature**: 家庭用在庫管理システム (Household Inventory Management)
**Bounded Context**: Nutrition
**Database**: PostgreSQL 16

## Entity Relationship Diagram

```
┌─────────────────┐
│     User        │
│  (from User BC) │
└────────┬────────┘
         │
         │ 0..1
         ▼
    ┌────────────────────┐
    │    Household       │◄──────┐
    │                    │       │
    │ - id (PK)          │       │
    │ - name             │       │
    │ - created_by       │       │
    │ - invite_code      │       │
    │ - created_at       │       │
    └────────┬───────────┘       │
             │                   │
             │ 1                 │ household_id
             ▼                   │
    ┌────────────────────┐       │
    │  InventoryItem     │───────┘
    │                    │
    │ - id (PK)          │
    │ - household_id (FK)│
    │ - name             │
    │ - quantity         │
    │ - unit             │
    │ - expiration_date  │
    │ - category_id (FK) │
    │ - storage_loc_id   │
    │ - image_url        │
    │ - notes            │
    │ - is_depleted      │
    │ - created_by       │
    │ - created_at       │
    │ - updated_at       │
    │ - updated_by       │
    └────────┬───────────┘
             │
             │ N
             ▼
    ┌────────────────────┐
    │     Category       │
    │                    │
    │ - id (PK)          │
    │ - name             │
    │ - icon             │
    │ - sort_order       │
    └────────────────────┘

    ┌────────────────────┐
    │  StorageLocation   │
    │                    │
    │ - id (PK)          │
    │ - name             │
    │ - sort_order       │
    └────────────────────┘
```

## Entities

### 1. Household (Aggregate Root)

Represents a group of users sharing inventory. Individual mode users have `household_id = NULL`.

**Table**: `households`

| Column        | Type      | Constraints                  | Description                          |
|---------------|-----------|------------------------------|--------------------------------------|
| id            | UUID      | PRIMARY KEY                  | Unique household identifier          |
| name          | VARCHAR(100) | NOT NULL                  | Household display name               |
| created_by    | UUID      | NOT NULL, FK → users(id)     | User who created the household       |
| invite_code   | VARCHAR(12) | UNIQUE, NOT NULL           | 12-char alphanumeric invite code     |
| created_at    | TIMESTAMP | NOT NULL, DEFAULT NOW()      | Creation timestamp                   |

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_households_invite_code ON households(invite_code)`

**Business Rules**:
- Invite codes are case-insensitive (store as uppercase)
- Generated on creation using `nanoid(12)` or similar
- No explicit "members" table initially (household_id on users table)

**Domain Events**:
- `HouseholdCreated(householdId, createdBy, name)`
- `MemberInvited(householdId, invitedBy, inviteCode)`

---

### 2. InventoryItem (Aggregate Root)

Represents a single inventory item (food or household product).

**Table**: `inventory_items`

| Column         | Type         | Constraints                                      | Description                              |
|----------------|--------------|--------------------------------------------------|------------------------------------------|
| id             | UUID         | PRIMARY KEY                                      | Unique item identifier                   |
| household_id   | UUID         | FK → households(id), NULL for personal inventory | Household this item belongs to           |
| name           | VARCHAR(200) | NOT NULL                                         | Item name (e.g., "りんご")                |
| quantity       | DECIMAL(10,2)| NOT NULL, CHECK (quantity >= 0)                  | Current quantity                         |
| unit           | VARCHAR(20)  | NOT NULL                                         | Unit of measurement (個, kg, L, etc.)     |
| expiration_date| DATE         | NULL                                             | Expiration/best-before date              |
| category_id    | UUID         | FK → categories(id)                              | Category classification                  |
| storage_location_id | UUID    | FK → storage_locations(id), NULL                 | Where item is stored                     |
| image_url      | VARCHAR(500) | NULL                                             | S3 URL for item image (future)           |
| notes          | TEXT         | NULL                                             | User notes/memo                          |
| is_depleted    | BOOLEAN      | NOT NULL, DEFAULT FALSE                          | True if quantity == 0                    |
| created_by     | UUID         | NOT NULL, FK → users(id)                         | User who created this item               |
| created_at     | TIMESTAMP    | NOT NULL, DEFAULT NOW()                          | Creation timestamp                       |
| updated_at     | TIMESTAMP    | NOT NULL, DEFAULT NOW()                          | Last update timestamp                    |
| updated_by     | UUID         | NOT NULL, FK → users(id)                         | User who last updated                    |

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX idx_inventory_household_created ON inventory_items(household_id, created_at DESC)`
- `INDEX idx_inventory_household_expiration ON inventory_items(household_id, expiration_date) WHERE expiration_date IS NOT NULL`
- `INDEX idx_inventory_search ON inventory_items(household_id, LOWER(name))` (for search)
- `UNIQUE INDEX idx_inventory_unique ON inventory_items(household_id, LOWER(name), expiration_date)` (for merge logic)

**Constraints**:
```sql
CHECK (quantity >= 0)  -- Cannot have negative inventory
CHECK (is_depleted = (quantity = 0))  -- Depleted flag must match quantity
```

**Triggers**:
```sql
-- Auto-set is_depleted flag
CREATE TRIGGER trg_inventory_depleted
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_depleted_flag();

-- Auto-update updated_at
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_timestamp();
```

**Business Rules**:
1. **Uniqueness**: Items with same `(household_id, name, expiration_date)` are considered duplicates
   - Handled via `ON CONFLICT` upsert: merge quantities
2. **Expiration Status**:
   - `is_expired = (expiration_date < CURRENT_DATE)`
   - `is_expiring_soon = (expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days')`
3. **Depleted Items**:
   - When quantity reaches 0, `is_depleted = TRUE`
   - Depleted items remain in database for purchase history
   - Can be filtered out in list view with `WHERE is_depleted = FALSE`

**Domain Events**:
- `ItemAdded(itemId, householdId, name, userId)`
- `ItemUpdated(itemId, householdId, changes, userId)`
- `ItemDeleted(itemId, householdId, userId)`
- `ItemDepleted(itemId, householdId, name)` (when quantity → 0)
- `ItemRestocked(itemId, householdId, newQuantity)` (when quantity 0 → N)

---

### 3. Category (Value Object / Reference Data)

Predefined categories for item classification.

**Table**: `categories`

| Column     | Type        | Constraints                 | Description                    |
|------------|-------------|-----------------------------|--------------------------------|
| id         | UUID        | PRIMARY KEY                 | Category identifier            |
| name       | VARCHAR(50) | UNIQUE, NOT NULL            | Category name (野菜, 果物, etc.) |
| icon       | VARCHAR(50) | NULL                        | Icon name or emoji             |
| sort_order | INTEGER     | NOT NULL, DEFAULT 0         | Display order                  |

**Seed Data** (inserted on migration):
```
野菜 (Vegetables)
果物 (Fruits)
肉類 (Meat)
魚類 (Seafood)
乳製品 (Dairy)
調味料 (Condiments)
飲料 (Beverages)
日用品 (Household Products)
その他 (Other)
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_categories_name ON categories(name)`
- `INDEX idx_categories_sort ON categories(sort_order)`

**Business Rules**:
- Categories are system-managed (no user creation in V1)
- Soft delete not needed (categories are stable)

---

### 4. StorageLocation (Value Object / Reference Data)

Predefined storage locations.

**Table**: `storage_locations`

| Column     | Type        | Constraints                 | Description                  |
|------------|-------------|-----------------------------|------------------------------|
| id         | UUID        | PRIMARY KEY                 | Location identifier          |
| name       | VARCHAR(50) | UNIQUE, NOT NULL            | Location name (冷蔵庫, etc.)  |
| sort_order | INTEGER     | NOT NULL, DEFAULT 0         | Display order                |

**Seed Data**:
```
冷蔵庫 (Refrigerator)
冷凍庫 (Freezer)
パントリー (Pantry)
棚 (Shelf)
その他 (Other)
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_storage_name ON storage_locations(name)`

---

## Row-Level Security (RLS) Policies

PostgreSQL RLS enforces household isolation at the database level.

```sql
-- Enable RLS on inventory_items
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access items in their household (or personal items)
CREATE POLICY inventory_household_isolation ON inventory_items
  FOR ALL
  USING (
    household_id = current_setting('app.household_id', TRUE)::UUID
    OR (household_id IS NULL AND current_setting('app.user_id', TRUE)::UUID = created_by)
  );

-- Application sets context per request (from JWT claims)
SET LOCAL app.household_id = '<household-id-from-jwt>';
SET LOCAL app.user_id = '<user-id-from-jwt>';
```

**Security Notes**:
- RLS prevents cross-household data leakage even if application logic has bugs
- Middleware validates JWT claims before setting RLS context
- Personal inventory (`household_id = NULL`) is only visible to the owner

---

## Migration Strategy

**Version**: V1.0.0 - Initial Schema

**Migration File**: `001_create_inventory_schema.sql`

```sql
-- Create tables in dependency order
CREATE TABLE households (...);
CREATE TABLE categories (...);
CREATE TABLE storage_locations (...);
CREATE TABLE inventory_items (...);

-- Insert seed data
INSERT INTO categories (id, name, icon, sort_order) VALUES (...);
INSERT INTO storage_locations (id, name, sort_order) VALUES (...);

-- Create indexes
CREATE INDEX idx_inventory_household_created ...;

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_household_isolation ...;

-- Create triggers
CREATE TRIGGER trg_inventory_depleted ...;
```

**Rollback Plan**:
```sql
DROP TABLE inventory_items CASCADE;
DROP TABLE storage_locations CASCADE;
DROP TABLE categories CASCADE;
DROP TABLE households CASCADE;
```

---

## Data Validation Rules

### Application-Level Validations

| Field           | Validation Rule                                                    |
|-----------------|--------------------------------------------------------------------|
| name            | Length: 1-200 chars, Required                                      |
| quantity        | Numeric, >= 0, Max 2 decimal places                                |
| unit            | Length: 1-20 chars, Required                                       |
| expiration_date | Valid date, Optional, Must be >= 1900-01-01, <= 2100-12-31        |
| category_id     | Must exist in categories table                                     |
| notes           | Length: 0-1000 chars                                               |
| household.name  | Length: 1-100 chars, Required                                      |
| invite_code     | Exactly 12 alphanumeric chars, case-insensitive                    |

### Business Logic Validations

1. **Duplicate Item Merge**:
   - If `(household_id, LOWER(name), expiration_date)` exists → merge quantities
   - Otherwise → create new item

2. **Expiration Date Logic**:
   - Null expiration allowed (non-perishables)
   - Expired items (`expiration_date < today`) shown with warning
   - Expiring soon (`expiration_date <= today + 3 days`) highlighted

3. **Depleted Items**:
   - Auto-set `is_depleted = TRUE` when `quantity = 0`
   - Can filter with `?include_depleted=false` query param

---

## Query Patterns

### Common Queries

**1. List user's inventory (personal or household)**:
```sql
SELECT * FROM inventory_items
WHERE household_id = $household_id  -- or NULL for personal
ORDER BY created_at DESC
LIMIT 50 OFFSET $cursor;
```

**2. Search by name**:
```sql
SELECT * FROM inventory_items
WHERE household_id = $household_id
  AND LOWER(name) LIKE LOWER($search_term || '%')
ORDER BY name;
```

**3. Filter by category**:
```sql
SELECT * FROM inventory_items
WHERE household_id = $household_id
  AND category_id = $category_id
ORDER BY expiration_date ASC NULLS LAST;
```

**4. Find expiring soon items**:
```sql
SELECT * FROM inventory_items
WHERE household_id = $household_id
  AND expiration_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days')
  AND is_depleted = FALSE
ORDER BY expiration_date ASC;
```

**5. Check for duplicates before insert**:
```sql
-- Handled by UNIQUE constraint + ON CONFLICT
INSERT INTO inventory_items (household_id, name, quantity, expiration_date, ...)
VALUES ($1, $2, $3, $4, ...)
ON CONFLICT (household_id, LOWER(name), expiration_date)
DO UPDATE SET quantity = inventory_items.quantity + EXCLUDED.quantity
RETURNING *;
```

---

## TypeScript Type Definitions

**Shared Types**: `packages/shared/src/nutrition/inventory-item.dto.ts`

```typescript
export interface InventoryItemDTO {
  id: string;                    // UUID
  householdId: string | null;    // UUID or null for personal
  name: string;
  quantity: number;
  unit: string;
  expirationDate: string | null; // ISO 8601 date
  categoryId: string;            // UUID
  storageLocationId: string | null;
  imageUrl: string | null;
  notes: string | null;
  isDepleted: boolean;
  createdBy: string;             // UUID
  createdAt: string;             // ISO 8601 datetime
  updatedAt: string;
  updatedBy: string;
}

export interface HouseholdDTO {
  id: string;
  name: string;
  createdBy: string;
  inviteCode: string;
  createdAt: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
}

export interface StorageLocationDTO {
  id: string;
  name: string;
  sortOrder: number;
}
```

---

## Performance Considerations

1. **Indexing Strategy**:
   - Composite index on `(household_id, created_at DESC)` for paginated list
   - Partial index on `expiration_date` (where NOT NULL) for expiring-soon queries
   - GIN index on `LOWER(name)` if full-text search needed later

2. **Query Optimization**:
   - Use cursor-based pagination (`created_at + id`) to avoid OFFSET slowness
   - Materialized view for "expiring soon" if query becomes slow (future)

3. **Connection Pooling**:
   - NestJS TypeORM connection pool: min 5, max 20
   - Prevent connection exhaustion under load

4. **Caching Strategy** (V1.1+):
   - Redis cache for categories/storage_locations (rarely change)
   - Cache inventory list per household with 30s TTL
   - Invalidate cache on writes

---

## Audit Trail (Future Enhancement)

**Deferred to V1.1**: Full audit log for household-shared inventory

**Approach**:
```sql
CREATE TABLE inventory_audit (
  id BIGSERIAL PRIMARY KEY,
  item_id UUID NOT NULL,
  action VARCHAR(10) NOT NULL,  -- INSERT, UPDATE, DELETE
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB
);
```

**Rationale for Deferring**:
- V1 tracks `updated_by` and `updated_at` (sufficient for basic history)
- Full audit trail adds write overhead
- Can add later without breaking changes
