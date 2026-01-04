# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy service and shared package files
COPY services/user/package.json ./services/user/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY services/user/ ./services/user/

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build

# Build user service
WORKDIR /app/services/user
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy service and shared package files
COPY services/user/package.json ./services/user/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built assets
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/user/dist ./services/user/dist

# Copy keys directory (if exists)
COPY --chown=nestjs:nodejs services/user/keys ./services/user/keys

# Switch to non-root user
USER nestjs

# Set working directory to service
WORKDIR /app/services/user

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the service
CMD ["node", "dist/main.js"]
