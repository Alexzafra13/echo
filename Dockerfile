# syntax=docker/dockerfile:1
# ============================================
# ECHO MUSIC SERVER - OPTIMIZED BUILD
# ============================================
# Single container with Backend + Frontend
# Using BuildKit cache for faster rebuilds
#
# Platforms: linux/amd64, linux/arm64
# Compatible: Linux, Raspberry Pi 3/4/5,
#             Synology NAS (DSM 7.2+), macOS, Windows
# ============================================

# ----------------------------------------
# Stage 1: Build Everything
# ----------------------------------------
FROM node:22-alpine AS builder

# Enable corepack for pnpm (built into Node 22)
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

WORKDIR /build

# Copy workspace configuration first (better cache)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY web/package.json ./web/
COPY api/package.json ./api/

# Install ALL dependencies with BuildKit cache for faster rebuilds
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Build Frontend
WORKDIR /build/web
COPY web/ ./
# Verify proxy code exists before building (checks utils and player directories)
RUN grep -rq "getProxiedStreamUrl" src/features/player/ && echo "✓ Proxy code found in source" || (echo "✗ Proxy code NOT found!" && exit 1)
RUN pnpm build
# Verify built JS has proxy code
RUN grep -q "radio/stream/proxy" dist/assets/*.js && echo "✓ Proxy code found in build" || echo "⚠ Proxy code not in build (might be minified differently)"

# Build Backend
WORKDIR /build/api
COPY api/ ./
RUN pnpm build

# ----------------------------------------
# Stage 2: Production Dependencies Only
# ----------------------------------------
FROM node:22-alpine AS deps

# Enable corepack
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

WORKDIR /deps

# Copy workspace config
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY api/package.json ./api/

# Install production dependencies WITHOUT optional deps (ffmpeg-static, @ffprobe-installer/ffprobe)
# These are only needed for local dev; in Docker we use system ffmpeg from apk
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm --filter=echo-api deploy --prod --no-optional --legacy /prod

# Clean up unnecessary files from node_modules
RUN find /prod/node_modules -type f \( \
    -name "*.md" -o \
    -name "*.ts" -o \
    -name "*.map" -o \
    -name "LICENSE*" -o \
    -name "CHANGELOG*" -o \
    -name "README*" -o \
    -name ".npmignore" -o \
    -name ".eslintrc*" -o \
    -name "tsconfig.json" \
    \) -delete 2>/dev/null || true && \
    find /prod/node_modules -type d -name ".git" -exec rm -rf {} + 2>/dev/null || true && \
    find /prod/node_modules -type d -empty -delete 2>/dev/null || true

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

# Install runtime dependencies in single layer
# FFmpeg: audio analysis (LUFS) and format conversion
RUN apk add --no-cache \
    netcat-openbsd \
    dumb-init \
    su-exec \
    ffmpeg

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D echoapp

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=echoapp:nodejs /prod/node_modules ./node_modules

# Copy only migration SQL files (no TypeScript schemas needed at runtime)
# This saves ~1MB and avoids shipping source code
COPY --from=builder --chown=echoapp:nodejs /build/api/drizzle ./drizzle

# Copy built application files
COPY --from=builder --chown=echoapp:nodejs /build/api/dist ./dist
COPY --from=builder --chown=echoapp:nodejs /build/web/dist ./web/dist

# Copy scripts (entrypoint + migration runner + admin reset)
COPY --chown=echoapp:nodejs api/scripts/docker-entrypoint.sh /usr/local/bin/
COPY --chown=echoapp:nodejs api/scripts/run-migrations.js ./scripts/
COPY --chown=echoapp:nodejs api/scripts/reset-admin-password.js ./scripts/

# Fix line endings and permissions
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Create unified data directory
RUN mkdir -p /app/data/metadata /app/data/covers /app/data/uploads /app/data/logs && \
    chown -R echoapp:nodejs /app/data

# Create wrapper script for proper permissions
RUN printf '#!/bin/sh\nset -e\n\n# Fix data directory permissions\nchown -R echoapp:nodejs /app/data 2>/dev/null || true\n\nexec su-exec echoapp /usr/local/bin/docker-entrypoint.sh "$@"\n' \
    > /entrypoint-wrapper.sh && chmod +x /entrypoint-wrapper.sh

# Default port
ENV PORT=4567
EXPOSE ${PORT}

# Health check (wget is included in alpine, much lighter than spawning node ~30MB)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-4567}/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["/entrypoint-wrapper.sh"]
