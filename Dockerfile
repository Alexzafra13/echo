# ============================================
# ECHO MUSIC SERVER - FULL-STACK BUILD
# ============================================
# Single container with Backend + Frontend (Jellyfin-style)
# Multi-stage build for optimal image size (~250MB)
# ============================================

# ----------------------------------------
# Stage 1: Build Frontend
# ----------------------------------------
FROM node:22-alpine AS frontend-builder

WORKDIR /build

# Install pnpm globally
RUN npm install -g pnpm@10.18.3

# Copy workspace configuration files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json* ./

# Copy package.json files for workspace packages
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/

# Install ALL workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source code
COPY frontend/ ./frontend/

# Build frontend for production
WORKDIR /build/frontend
RUN pnpm build

# ----------------------------------------
# Stage 2: Backend Dependencies
# ----------------------------------------
FROM node:22-alpine AS backend-dependencies

WORKDIR /build

# Install pnpm globally
RUN npm install -g pnpm@10.18.3

# Copy workspace configuration files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json* ./

# Copy package.json files for workspace packages
COPY server/package.json ./server/
COPY frontend/package.json ./frontend/

# Copy prisma schema (needed for dependency installation)
COPY server/prisma ./server/prisma/

# Install ALL workspace dependencies (pnpm will install for all workspace packages)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
WORKDIR /build/server
RUN pnpm db:generate || PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 pnpm db:generate

WORKDIR /build

# ----------------------------------------
# Stage 3: Build Backend
# ----------------------------------------
FROM node:22-alpine AS backend-builder

WORKDIR /build/server

# Install pnpm globally
RUN npm install -g pnpm@10.18.3

# Copy workspace files and node_modules from previous stage
COPY --from=backend-dependencies /build/node_modules /build/node_modules
COPY --from=backend-dependencies /build/server/node_modules ./node_modules
COPY --from=backend-dependencies /build/server/prisma ./prisma
COPY --from=backend-dependencies /build/pnpm-workspace.yaml /build/
COPY --from=backend-dependencies /build/package.json* /build/

# Copy backend source code
COPY server/ ./

# IMPORTANT: Copy entrypoint script to a safe location BEFORE pnpm prune
# (pnpm prune might delete the scripts/ directory)
RUN cp -p scripts/docker-entrypoint.sh /tmp/docker-entrypoint.sh

# Build the backend application
RUN pnpm build

# NOTE: We don't run pnpm prune in workspace mode as it can break dependencies
# The frozen-lockfile install already optimized the dependencies

# ----------------------------------------
# Stage 4: Production Runtime
# ----------------------------------------
FROM node:22-alpine AS production

# Metadata
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=latest

LABEL org.opencontainers.image.title="Echo Music Server" \
      org.opencontainers.image.description="Self-hosted music streaming platform (Full-stack single container)" \
      org.opencontainers.image.vendor="Echo" \
      org.opencontainers.image.source="https://github.com/Alexzafra13/echo" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}"

# Set production environment
ENV NODE_ENV=production

# Install runtime dependencies for health checks and signal handling
# netcat-openbsd: for database connection checks
# dumb-init: proper signal handling (PID 1)
RUN apk add --no-cache netcat-openbsd dumb-init

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S echoapp -u 1001

WORKDIR /app

# Copy server files for installation
COPY --chown=echoapp:nodejs server/package.json ./
COPY --chown=echoapp:nodejs pnpm-lock.yaml ./
COPY --from=backend-builder --chown=echoapp:nodejs /build/server/prisma ./prisma

# Install production dependencies (clean install without devDependencies)
RUN pnpm install --prod

# Copy pre-generated Prisma Client (NO prisma generate here!)
# This was already generated in backend-dependencies stage
COPY --from=backend-dependencies --chown=echoapp:nodejs /build/server/node_modules/@prisma ./node_modules/@prisma

# Copy built files
COPY --from=backend-builder --chown=echoapp:nodejs /build/server/dist ./dist
COPY --from=frontend-builder --chown=echoapp:nodejs /build/frontend/dist ./frontend/dist

# Copy entrypoint script from /tmp where we saved it before pnpm prune
COPY --from=backend-builder /tmp/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Fix Windows line endings (CRLF → LF) - critical for script execution
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

# Create upload directories with proper permissions
RUN mkdir -p /app/uploads/music /app/uploads/covers && \
    chown -R echoapp:nodejs /app/uploads

# Create config directory with proper permissions (for JWT secrets generation)
RUN mkdir -p /app/config && \
    chown -R echoapp:nodejs /app/config

# Install su-exec for running as non-root user after fixing permissions
RUN apk add --no-cache su-exec

# Create wrapper script to fix volume permissions then run as echoapp
RUN echo '#!/bin/sh' > /entrypoint-wrapper.sh && \
    echo 'set -e' >> /entrypoint-wrapper.sh && \
    echo '# Fix permissions for volumes (may be owned by root on Windows Docker Desktop)' >> /entrypoint-wrapper.sh && \
    echo 'chown -R echoapp:nodejs /app/config /app/uploads /app/logs 2>/dev/null || true' >> /entrypoint-wrapper.sh && \
    echo '# Execute main entrypoint as echoapp user' >> /entrypoint-wrapper.sh && \
    echo 'exec su-exec echoapp /usr/local/bin/docker-entrypoint.sh "$@"' >> /entrypoint-wrapper.sh && \
    sed -i 's/\r$//' /entrypoint-wrapper.sh && \
    chmod +x /entrypoint-wrapper.sh

# Stay as root (wrapper will switch to echoapp after fixing permissions)

# Default port (configurable via environment)
ENV PORT=4567
EXPOSE ${PORT}

# Health check with dynamic port support
# Extended start period (60s) to allow time for database migrations
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "const port = process.env.PORT || 4567; require('http').get('http://localhost:' + port + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init for proper signal handling (graceful shutdown)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application using wrapper script
# (fixes volume permissions, then runs entrypoint as echoapp)
CMD ["/entrypoint-wrapper.sh"]
