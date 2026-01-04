# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy package files for dependency installation
COPY packages/shared/package.json ./packages/shared/
COPY services/nutrition/package.json ./services/nutrition/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared/ ./packages/shared/
COPY services/nutrition/ ./services/nutrition/

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build

# Build nutrition service
WORKDIR /app/services/nutrition
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy package files
COPY packages/shared/package.json ./packages/shared/
COPY services/nutrition/package.json ./services/nutrition/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/nutrition/dist ./services/nutrition/dist

# Change ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

WORKDIR /app/services/nutrition

EXPOSE 3002

CMD ["node", "dist/main.js"]
