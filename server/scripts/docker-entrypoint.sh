#!/bin/sh
set -e

echo "🚀 Starting Echo Music Server..."
echo ""

# ============================================
# 0. Auto-generate JWT Secrets (Jellyfin-style)
# ============================================
CONFIG_DIR="/app/config"
SECRETS_FILE="$CONFIG_DIR/secrets.env"

# Create config directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

# Generate secrets if they don't exist OR if they're empty (FIRST RUN ONLY)
if [ ! -f "$SECRETS_FILE" ] || [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = '""' ] || [ "$JWT_SECRET" = "''" ]; then
  echo "🔐 Generating secure JWT secrets..."

  # Generate cryptographically secure secrets
  JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')
  JWT_REFRESH_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')

  # Save to persistent volume (without 'export' keyword - will be handled by set -a)
  cat > "$SECRETS_FILE" << EOF
# Auto-generated JWT secrets (DO NOT EDIT MANUALLY)
# Generated on: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
JWT_SECRET="$JWT_SECRET"
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
EOF

  echo "✅ Secure JWT secrets generated and saved to $SECRETS_FILE"
  echo ""
else
  echo "ℹ️  Using existing JWT secrets from $SECRETS_FILE"
  echo ""
fi

# Load secrets into environment
# Source the file to load variables into current shell
set -a  # Automatically export all variables
. "$SECRETS_FILE"
set +a

# Verify secrets are loaded
if [ -z "$JWT_SECRET" ] || [ -z "$JWT_REFRESH_SECRET" ]; then
  echo "❌ ERROR: JWT secrets failed to load from $SECRETS_FILE"
  echo "   JWT_SECRET length: ${#JWT_SECRET}"
  echo "   JWT_REFRESH_SECRET length: ${#JWT_REFRESH_SECRET}"
  exit 1
fi

echo "✅ JWT secrets loaded successfully (${#JWT_SECRET} and ${#JWT_REFRESH_SECRET} characters)"

# ============================================
# 1. Wait for Dependencies
# ============================================
echo "⏳ Waiting for PostgreSQL..."
until nc -z -v -w30 postgres 5432; do
  echo "   Waiting for database connection..."
  sleep 1
done
echo "✅ PostgreSQL is ready!"
echo ""

echo "⏳ Waiting for Redis..."
until nc -z -v -w30 redis 6379; do
  echo "   Waiting for Redis connection..."
  sleep 1
done
echo "✅ Redis is ready!"
echo ""

# ============================================
# 2. Database Migrations & Seed
# ============================================
echo "🔄 Running database migrations..."

# Run migrations using npx (Prisma CLI installed temporarily)
if npx prisma@6.17.1 migrate deploy; then
  echo "✅ Database migrations completed!"

  # Seed database with default settings (idempotent - safe to run multiple times)
  echo ""
  echo "🌱 Seeding database with default settings..."
  if npx tsx prisma/seed.ts 2>/dev/null; then
    echo "✅ Database seeded successfully!"
  else
    echo "⚠️  Seed failed (may be normal if already seeded)"
  fi

  # Always ensure admin user exists (create if missing, update if exists)
  echo ""
  echo "🔐 Ensuring admin user exists..."
  if node scripts/reset-admin-password.js 2>/dev/null; then
    echo ""
  else
    echo "⚠️  Could not ensure admin user - create manually with: pnpm admin:reset"
    echo ""
  fi
else
  echo "⚠️  Migrations failed, but continuing..."
fi

echo ""
echo "✅ Initialization complete!"
echo ""

# ============================================
# 4. Start Application
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎵 Echo Music Server - Starting"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Environment: ${NODE_ENV:-production}"
echo "   Listening on: ${HOST:-0.0.0.0}:${PORT:-4567}"
echo ""
echo "   Access your server at:"
echo "   → http://localhost:${PORT:-4567} (local)"
echo "   → http://<YOUR_SERVER_IP>:${PORT:-4567} (network)"
echo ""
echo "   API Documentation:"
echo "   → http://localhost:${PORT:-4567}/api/docs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the application
exec node dist/src/main.js
