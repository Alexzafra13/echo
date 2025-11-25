# ============================================
# ECHO MUSIC SERVER - OPTIMIZED BUILD
# ============================================
# Single container with Backend + Frontend
# Optimized multi-stage build (~200-250MB)
# ============================================

# ----------------------------------------
# Stage 1: Dependencies & Build (Combined)
# ----------------------------------------
FROM node:22-alpine AS builder

WORKDIR /build

# Install pnpm globally (only once!)
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

# Generate Prisma Client (only needed for build, not for final image)
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

# ----------------------------------------
# Stage 2: Production Runtime
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

# Install runtime dependencies
RUN apk add --no-cache \
    netcat-openbsd \
    dumb-init \
    su-exec

# Install pnpm and tsx (for running TypeScript in seed)
RUN npm install -g pnpm@10.18.3 tsx@4.19.2

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S echoapp -u 1001

WORKDIR /app

# Copy workspace configuration to temporary location for pnpm deploy
COPY --chown=echoapp:nodejs pnpm-workspace.yaml pnpm-lock.yaml package.json /tmp/build/
COPY --chown=echoapp:nodejs server/package.json /tmp/build/server/

# Install ONLY production dependencies using pnpm deploy to /app
# pnpm deploy requires an empty directory, so we use /tmp/build for config
WORKDIR /tmp/build
RUN pnpm --filter=echo-server-backend deploy --prod --legacy /app

# Switch to final app directory
WORKDIR /app

# Copy Prisma schema and generated client from builder
# Both stages use node:22-alpine so the generated binaries are compatible
COPY --chown=echoapp:nodejs server/prisma ./prisma
COPY --from=builder --chown=echoapp:nodejs /build/server/node_modules/.prisma ./node_modules/.prisma

# Copy built files from builder stage
COPY --from=builder --chown=echoapp:nodejs /build/server/dist ./dist
COPY --from=builder --chown=echoapp:nodejs /build/frontend/dist ./frontend/dist

# Copy scripts (entrypoint + admin reset)
COPY --chown=echoapp:nodejs server/scripts/docker-entrypoint.sh /usr/local/bin/
COPY --chown=echoapp:nodejs server/scripts/reset-admin-password.js ./scripts/

# Fix line endings and permissions
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Create unified data directory (Navidrome-style)
# All persistent data in /app/data: secrets, metadata, covers, uploads, logs
RUN mkdir -p /app/data/metadata /app/data/covers /app/data/uploads /app/data/logs && \
    chown -R echoapp:nodejs /app/data

# Create wrapper script (inline - no temp files needed)
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
