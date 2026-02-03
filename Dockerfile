# syntax=docker/dockerfile:1
# ============================================
# ECHO MUSIC SERVER - OPTIMIZED BUILD
# ============================================
# Single container with Backend + Frontend
# Using BuildKit cache for faster rebuilds
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

# Install production dependencies with cache + deploy
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm --filter=echo-api deploy --prod --legacy /prod

# Clean up unnecessary files from node_modules (~20-30MB savings)
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
# Stage 3: Download ML Models
# ----------------------------------------
FROM alpine:3.20 AS models

# Download stem separation models from GitHub releases
# htdemucs.onnx (~2.5MB) - model structure
# htdemucs.onnx.data (~160MB) - model weights
RUN apk add --no-cache curl && \
    mkdir -p /models && \
    echo "Downloading htdemucs.onnx..." && \
    curl -L \
      --retry 5 \
      --retry-delay 3 \
      --retry-all-errors \
      --connect-timeout 30 \
      --max-time 300 \
      -o /models/htdemucs.onnx \
      "https://github.com/Alexzafra13/echo/releases/download/models-v1.0.0/htdemucs.onnx" && \
    echo "Downloading htdemucs.onnx.data..." && \
    curl -L \
      --retry 5 \
      --retry-delay 3 \
      --retry-all-errors \
      --connect-timeout 30 \
      --max-time 900 \
      -o /models/htdemucs.onnx.data \
      "https://github.com/Alexzafra13/echo/releases/download/models-v1.0.0/htdemucs.onnx.data" && \
    ls -lh /models/

# ----------------------------------------
# Stage 4: Minimal Production Runtime
# ----------------------------------------
# Using Debian slim instead of Alpine for glibc compatibility
# (onnxruntime-node requires glibc, not musl)
FROM node:22-slim AS production

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
# FFmpeg: audio analysis (LUFS) and stem separation
# Using apt for Debian slim image
RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    dumb-init \
    gosu \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/sh -m echoapp

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

# Create unified data directory and models directory
RUN mkdir -p /app/data/metadata /app/data/covers /app/data/uploads /app/data/logs /app/models && \
    chown -R echoapp:nodejs /app/data /app/models

# Copy ML models from models stage (included in image like FFmpeg)
COPY --from=models --chown=echoapp:nodejs /models/htdemucs.onnx /app/models/
COPY --from=models --chown=echoapp:nodejs /models/htdemucs.onnx.data /app/models/

# Create wrapper script for proper permissions
# Using gosu instead of su-exec (Debian equivalent)
RUN printf '#!/bin/sh\nset -e\nchown -R echoapp:nodejs /app/data /app/models 2>/dev/null || true\nexec gosu echoapp /usr/local/bin/docker-entrypoint.sh "$@"\n' \
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
