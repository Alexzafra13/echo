# ============================================
# ECHO MUSIC SERVER - OPTIMIZED BUILD
# ============================================
# Single container with Backend + Frontend
# Target size: ~250-350MB
# ============================================

# ----------------------------------------
# Stage 1: Build Everything
# ----------------------------------------
FROM node:22-alpine AS builder

WORKDIR /build

# Install pnpm globally
RUN npm install -g pnpm@10.18.3

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy package.json files for all workspace packages
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
COPY server/prisma ./server/prisma/
COPY server/prisma.config.ts ./server/prisma.config.ts

# Install ALL dependencies (frontend + backend) in one go
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
WORKDIR /build/server
RUN pnpm db:generate

# Build Frontend
WORKDIR /build/frontend
COPY frontend/ ./
RUN pnpm build

# Build Backend
WORKDIR /build/server
COPY server/ ./
RUN pnpm build

# Compile seed script to JavaScript (so we don't need tsx in production)
RUN pnpm exec tsc prisma/seed-settings-only.ts --outDir dist/seed --esModuleInterop --module commonjs --skipLibCheck

# ----------------------------------------
# Stage 2: Production Dependencies Only
# ----------------------------------------
FROM node:22-alpine AS deps

WORKDIR /deps

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Copy workspace config for pnpm deploy
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server/package.json ./server/

# Install production dependencies only using pnpm deploy
# This creates a clean node_modules with only prod deps
RUN pnpm --filter=echo-server-backend deploy --prod --legacy /prod && \
    rm -rf ~/.pnpm-store ~/.npm /tmp/*

# Generate Prisma client (without config file to avoid parse errors)
COPY server/prisma /prod/prisma
WORKDIR /prod
RUN npx prisma@7 generate --schema=./prisma/schema.prisma && \
    rm -rf ~/.npm /tmp/*

# Now copy the config file for runtime migrations (ESM format)
COPY server/prisma.config.production.mjs /prod/prisma.config.mjs

# ----------------------------------------
# Stage 3: Minimal Production Runtime
# ----------------------------------------
FROM node:22-alpine AS production

# Metadata
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=latest

LABEL org.opencontainers.image.title="Echo Music Server" \
      org.opencontainers.image.description="Self-hosted music streaming platform" \
      org.opencontainers.image.vendor="Echo" \
      org.opencontainers.image.source="https://github.com/Alexzafra13/echo" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}"

# Set production environment
ENV NODE_ENV=production

# Install only essential runtime dependencies (no npm, pnpm, tsx needed)
RUN apk add --no-cache \
    netcat-openbsd \
    dumb-init \
    su-exec && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S echoapp -u 1001

WORKDIR /app

# Copy production node_modules from deps stage (includes generated Prisma client)
COPY --from=deps --chown=echoapp:nodejs /prod/node_modules ./node_modules

# Copy Prisma schema and production config (for migrations at runtime)
COPY --from=deps --chown=echoapp:nodejs /prod/prisma ./prisma
COPY --from=deps --chown=echoapp:nodejs /prod/prisma.config.mjs ./prisma.config.mjs

# Copy built application files
COPY --from=builder --chown=echoapp:nodejs /build/server/dist ./dist
COPY --from=builder --chown=echoapp:nodejs /build/frontend/dist ./frontend/dist

# Copy compiled seed script (JavaScript, no tsx needed)
COPY --from=builder --chown=echoapp:nodejs /build/server/dist/seed ./dist/seed

# Copy scripts
COPY --chown=echoapp:nodejs server/scripts/docker-entrypoint.sh /usr/local/bin/
COPY --chown=echoapp:nodejs server/scripts/reset-admin-password.js ./scripts/

# Fix line endings and permissions
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Create unified data directory (Navidrome-style)
RUN mkdir -p /app/data/metadata /app/data/covers /app/data/uploads /app/data/logs && \
    chown -R echoapp:nodejs /app/data

# Create wrapper script
RUN printf '#!/bin/sh\n\
set -e\n\
chown -R echoapp:nodejs /app/data 2>/dev/null || true\n\
exec su-exec echoapp /usr/local/bin/docker-entrypoint.sh "$@"\n' \
> /entrypoint-wrapper.sh && chmod +x /entrypoint-wrapper.sh

# Default port
ENV PORT=4567
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "const port = process.env.PORT || 4567; require('http').get('http://localhost:' + port + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["/entrypoint-wrapper.sh"]
