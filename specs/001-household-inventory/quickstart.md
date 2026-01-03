# Developer Quickstart Guide

**Feature**: 家庭用在庫管理システム (Household Inventory Management)
**Audience**: Developers implementing or testing this feature
**Prerequisites**: Node.js 20+, pnpm, Docker, PostgreSQL client

## Table of Contents

1. [Repository Setup](#repository-setup)
2. [Database Setup](#database-setup)
3. [Backend Service](#backend-service)
4. [Web App](#web-app)
5. [Mobile App](#mobile-app)
6. [CLI Tool](#cli-tool)
7. [Running Tests](#running-tests)
8. [Common Development Tasks](#common-development-tasks)

---

## Repository Setup

### 1. Clone and Install Dependencies

```bash
# Clone the monorepo (if not already done)
cd /path/to/akimi

# Install all dependencies using pnpm workspaces
pnpm install

# Verify installation
pnpm --version  # Should be 8.x or higher
```

### 2. Environment Configuration

Create environment files for each application:

**Backend** (`services/nutrition/.env`):
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://akimi:password@localhost:5432/nutrition
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-dev-jwt-secret-change-in-production
CORS_ORIGIN=http://localhost:3000,exp://192.168.1.100:19000
LOG_LEVEL=debug
```

**Web** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/v1
NEXT_PUBLIC_ENV=development
```

**Mobile** (`apps/mobile/.env`):
```env
API_URL=http://localhost:3001/v1  # Or use ngrok for physical device testing
ENV=development
```

**CLI** (`apps/cli/.env`):
```env
API_URL=http://localhost:3001/v1
```

---

## Database Setup

### Option A: Docker Compose (Recommended)

**File**: `docker-compose.dev.yml` (create in repo root)

```yaml
version: '3.8'
services:
  postgres-nutrition:
    image: postgres:16-alpine
    container_name: akimi-nutrition-db
    environment:
      POSTGRES_DB: nutrition
      POSTGRES_USER: akimi
      POSTGRES_PASSWORD: password
    ports:
      - '5432:5432'
    volumes:
      - nutrition-db-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: akimi-redis
    ports:
      - '6379:6379'

volumes:
  nutrition-db-data:
```

```bash
# Start databases
docker-compose -f docker-compose.dev.yml up -d

# Verify
docker ps | grep akimi
psql postgresql://akimi:password@localhost:5432/nutrition -c "SELECT version();"
```

### Option B: Local PostgreSQL Installation

```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt install postgresql-16
sudo systemctl start postgresql

# Create database and user
createdb nutrition
psql -d nutrition -c "CREATE USER akimi WITH PASSWORD 'password';"
psql -d nutrition -c "GRANT ALL PRIVILEGES ON DATABASE nutrition TO akimi;"
```

### Run Migrations

```bash
# Navigate to nutrition service
cd services/nutrition

# Run migrations (using TypeORM)
pnpm run migration:run

# Seed reference data (categories, storage locations)
pnpm run seed:ref-data

# Verify
psql postgresql://akimi:password@localhost:5432/nutrition -c "\dt"
# Should show: inventory_items, households, categories, storage_locations
```

---

## Backend Service

### Start Nutrition Service

```bash
cd services/nutrition

# Development mode with hot reload
pnpm run start:dev

# Service should be running at http://localhost:3001
# Health check: curl http://localhost:3001/health
```

### Verify API

```bash
# Get categories (no auth required for reference data)
curl http://localhost:3001/v1/categories

# Test authentication (requires user service running)
# For now, generate a test JWT:
pnpm run generate:test-jwt
# Copy token and test protected endpoint:
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/v1/inventory/items
```

### API Documentation

OpenAPI spec served at: `http://localhost:3001/api-docs`

---

## Web App

### Start Next.js Development Server

```bash
cd apps/web

# Start dev server
pnpm run dev

# Open browser: http://localhost:3000/inventory
```

### Directory Structure

```
apps/web/src/app/inventory/
├── page.tsx              # Inventory list (GET /inventory/items)
├── add/
│   └── page.tsx          # Add item form (POST /inventory/items)
└── [id]/
    └── page.tsx          # Item detail/edit (GET/PATCH /inventory/items/:id)
```

### Key Libraries

- **Next.js 14**: App router, Server Components
- **React Query**: Server state management, caching
- **Shadcn UI**: Component library (if used)
- **Zod**: Form validation

---

## Mobile App

### Prerequisites

```bash
# Install Expo CLI globally
npm install -g expo-cli

# For iOS development (macOS only)
xcode-select --install

# For Android development
# Install Android Studio and set ANDROID_HOME
```

### Start Expo Development Server

```bash
cd apps/mobile

# Start Expo
pnpm run start

# Options:
# - Press 'i' for iOS simulator (macOS only)
# - Press 'a' for Android emulator (requires Android Studio)
# - Scan QR code with Expo Go app on physical device
```

### Offline Testing

Mobile app includes offline-first architecture:

```bash
# Enable offline mode in app (toggle in Settings or dev menu)
# 1. Add items while offline
# 2. Check SQLite database: pnpm run sqlite:inspect
# 3. Turn network back on
# 4. Observe sync queue processing
```

### Key Libraries

- **Expo 50**: React Native framework
- **expo-sqlite**: Local database
- **@tanstack/react-query**: Server state + offline sync
- **zustand**: Local UI state
- **react-navigation**: Routing

---

## CLI Tool

### Build and Install CLI

```bash
cd apps/cli

# Build CLI
pnpm run build

# Install globally (symlink)
pnpm link --global

# Verify installation
akimi-inventory --version
```

### Usage

```bash
# Configure API endpoint (first time)
akimi-inventory config set-api http://localhost:3001/v1

# Login (requires user service)
akimi-inventory login

# List inventory
akimi-inventory list

# Add item (interactive)
akimi-inventory add --interactive

# Add item (direct)
akimi-inventory add --name "りんご" --quantity 5 --unit "個" \
  --expiration 2026-01-15 --category "果物"

# Update item
akimi-inventory update <item-id> --quantity 3

# Delete item
akimi-inventory delete <item-id>

# Sync (manual trigger)
akimi-inventory sync
```

---

## Running Tests

### Unit Tests

```bash
# Backend unit tests
cd services/nutrition
pnpm test                 # Run all tests
pnpm test:watch          # Watch mode
pnpm test:cov            # With coverage

# Shared package tests
cd packages/shared
pnpm test
```

### Integration Tests

```bash
# Backend integration tests (uses Testcontainers)
cd services/nutrition
pnpm test:integration

# Requires Docker running
# Will spin up PostgreSQL container automatically
```

### Contract Tests

```bash
# Provider tests (backend)
cd services/nutrition
pnpm test:pact:provider

# Consumer tests (web client)
cd apps/web
pnpm test:pact:consumer

# Publish contracts to Pact Broker (CI only)
pnpm test:pact:publish
```

### E2E Tests

```bash
# Web E2E (Playwright)
cd tests/e2e/web
pnpm test                 # Headless
pnpm test:ui             # Interactive mode
pnpm test:debug          # Debug mode

# Mobile E2E (Detox)
cd tests/e2e/mobile
pnpm test:ios            # iOS simulator
pnpm test:android        # Android emulator
```

---

## Common Development Tasks

### Add a New Category

```sql
-- Connect to database
psql postgresql://akimi:password@localhost:5432/nutrition

-- Insert category
INSERT INTO categories (id, name, icon, sort_order)
VALUES (gen_random_uuid(), '新カテゴリ', '🆕', 100);
```

### Generate TypeScript Types from Database

```bash
cd services/nutrition
pnpm run typeorm:generate-types
```

### Reset Database

```bash
cd services/nutrition

# Drop and recreate
pnpm run migration:drop  # WARNING: Deletes all data
pnpm run migration:run
pnpm run seed:ref-data
```

### Test Offline Sync (Mobile)

```bash
# 1. Start mobile app with network
# 2. Add item → syncs immediately
# 3. Enable airplane mode
# 4. Add/update items → queued locally
# 5. Disable airplane mode
# 6. Observe sync queue drain

# Check sync queue in SQLite
cd apps/mobile
pnpm run sqlite:inspect
sqlite> SELECT * FROM sync_queue;
```

### Simulate Conflict (Last Write Wins)

```bash
# Terminal 1: Update item A
curl -X PATCH http://localhost:3001/v1/inventory/items/<id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 10, "updatedAt": "2026-01-01T10:00:00Z"}'

# Terminal 2: Update same item A (stale timestamp)
curl -X PATCH http://localhost:3001/v1/inventory/items/<id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 5, "updatedAt": "2026-01-01T09:59:00Z"}'

# Expect 409 Conflict response
```

### View Logs

```bash
# Backend logs (structured JSON)
cd services/nutrition
tail -f logs/app.log | jq .

# Or use pino-pretty for human-readable format
pnpm run start:dev | pino-pretty
```

### Generate Test Data

```bash
cd services/nutrition

# Seed 100 random inventory items for testing
pnpm run seed:test-data --items 100
```

---

## Troubleshooting

### Issue: Database connection refused

**Solution**:
```bash
# Check PostgreSQL is running
docker ps | grep postgres  # If using Docker
# OR
brew services list | grep postgresql  # If local install

# Verify connection
psql postgresql://akimi:password@localhost:5432/nutrition
```

### Issue: Port 3001 already in use

**Solution**:
```bash
# Find process using port
lsof -i :3001
# Kill process or change PORT in .env
```

### Issue: Mobile app can't reach API (physical device)

**Solution**:
```bash
# Use ngrok to expose local API
ngrok http 3001

# Update mobile .env with ngrok URL
API_URL=https://abc123.ngrok.io/v1
```

### Issue: TypeORM migrations fail

**Solution**:
```bash
# Check migration files exist
ls services/nutrition/src/migrations/

# Manual SQL execution
psql postgresql://akimi:password@localhost:5432/nutrition \
  -f services/nutrition/src/migrations/001_create_inventory_schema.sql
```

---

## Next Steps

1. **Read the spec**: [spec.md](./spec.md) for full requirements
2. **Review data model**: [data-model.md](./data-model.md) for schema details
3. **Explore API**: [contracts/inventory-api.yaml](./contracts/inventory-api.yaml) for endpoints
4. **Start implementing**: See [tasks.md](./tasks.md) (generated by `/speckit.tasks`)

---

## Useful Commands Reference

```bash
# Monorepo commands (from repo root)
pnpm install                  # Install all dependencies
pnpm run build               # Build all packages
pnpm run test                # Run all tests
pnpm run lint                # Lint all packages
pnpm run format              # Format with Prettier

# Service-specific commands
cd services/nutrition
pnpm run start:dev           # Dev server
pnpm run build               # Production build
pnpm run test                # Unit tests
pnpm run migration:run       # Run DB migrations

# App-specific commands
cd apps/web
pnpm run dev                 # Next.js dev server
pnpm run build               # Production build
pnpm run lint                # ESLint check

cd apps/mobile
pnpm run start               # Expo dev server
pnpm run ios                 # iOS simulator
pnpm run android             # Android emulator
```

---

## Support

- **Specification Issues**: Comment on the PR or create issue referencing `specs/001-household-inventory/`
- **Technical Questions**: Ask in `#nutrition-service` Slack channel
- **Bug Reports**: GitHub Issues with `nutrition` and `inventory` labels
