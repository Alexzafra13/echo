# ============================================
# MULTI-STAGE DOCKER BUILD FOR PRODUCTION
# ============================================

# ----------------------------------------
# Stage 1: Dependencies
# ----------------------------------------
FROM node:22-alpine AS dependencies

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies (production only)
RUN pnpm install --frozen-lockfile --prod=false

# Generate Prisma Client
RUN pnpm db:generate || PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 pnpm db:generate

# ----------------------------------------
# Stage 2: Builder
# ----------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# ----------------------------------------
# Stage 3: Production
# ----------------------------------------
FROM node:22-alpine AS production

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Create upload directories
RUN mkdir -p /app/uploads/music /app/uploads/covers && \
    chown -R nestjs:nodejs /app/uploads

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/src/main.js"]
