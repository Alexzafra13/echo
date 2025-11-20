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

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S echoapp -u 1001

WORKDIR /app

# Copy workspace configuration
COPY --chown=echoapp:nodejs pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY --chown=echoapp:nodejs server/package.json ./server/

# Install ONLY production dependencies using pnpm deploy
# This creates a clean production install without dev dependencies
RUN pnpm --filter=echo-server-backend deploy --prod --legacy .

# Copy Prisma schema and generate client for Alpine
COPY --chown=echoapp:nodejs server/prisma ./prisma
RUN npx prisma@6.17.1 generate

# Copy built files from builder stage
COPY --from=builder --chown=echoapp:nodejs /build/server/dist ./dist
COPY --from=builder --chown=echoapp:nodejs /build/frontend/dist ./frontend/dist

# Copy scripts (entrypoint + admin reset)
COPY --chown=echoapp:nodejs server/scripts/docker-entrypoint.sh /usr/local/bin/
COPY --chown=echoapp:nodejs server/scripts/reset-admin-password.js ./scripts/

# Fix line endings and permissions
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Create directories with proper permissions
RUN mkdir -p /app/uploads/music /app/uploads/covers /app/storage /app/config /app/logs && \
    chown -R echoapp:nodejs /app/uploads /app/storage /app/config /app/logs

# Create wrapper script (inline - no temp files needed)
RUN printf '#!/bin/sh\n\
set -e\n\
chown -R echoapp:nodejs /app/config /app/uploads /app/logs 2>/dev/null || true\n\
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
