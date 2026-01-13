# Aki CLI (Command Line Interface)

The official command line interface for the Aki Household Inventory Management system.

## Features

- **Authentication**: Login via Google/Apple using OAuth 2.0 Device Flow
- **Inventory Management**:
  - List items with filtering (search, category, location)
  - Add new items (interactive mode available)
  - Update quantities and details
  - Delete items
  - Check expiring items
- **Offline Support**: (Planned)

## Installation

```bash
# Build and link locally
pnpm install
pnpm build
pnpm link --global

# Verify
aki --version
```

## Usage

### Authentication

```bash
# Login
aki auth login

# Check status
aki auth status

# Logout
aki auth logout
```

### Inventory

```bash
# List all items
aki inventory list

# Search items
aki inventory list --search "apple"

# List expiring items (within 3 days)
aki inventory expiring

# Add item (interactive)
aki inventory add -i

# Add item (quick)
aki inventory add --name "Milk" --quantity 1 --unit "L" --category "dairy" --expiration "2024-01-01"
```

## Configuration

Configuration is stored in your system's default config directory (e.g., `~/.config/aki-cli/config.json` or `%APPDATA%\aki-cli\config.json`).
