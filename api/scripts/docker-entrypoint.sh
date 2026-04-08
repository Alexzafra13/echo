#!/bin/sh
set -e

echo "🚀 Starting Echo Music Server..."
echo ""

# ============================================
# 0. Setup Data Directory (Navidrome-style)
# ============================================
DATA_DIR="${DATA_PATH:-/app/data}"
SECRETS_FILE="$DATA_DIR/secrets.env"
SETUP_FILE="$DATA_DIR/setup.json"

# Create data directory structure
mkdir -p "$DATA_DIR"
mkdir -p "$DATA_DIR/metadata"
mkdir -p "$DATA_DIR/covers"
mkdir -p "$DATA_DIR/uploads"
mkdir -p "$DATA_DIR/logs"

echo "📁 Data directory: $DATA_DIR"

# ============================================
# 1. Secrets Management
# ============================================
# Secrets come from .env via docker-compose environment variables.
# For backwards compatibility, also check secrets.env from data volume.
# If JWT secrets are missing from both sources, auto-generate them.

if [ -f "$SECRETS_FILE" ] && { [ -z "$JWT_SECRET" ] || [ -z "$JWT_REFRESH_SECRET" ]; }; then
  echo "ℹ️  Loading secrets from $SECRETS_FILE (legacy)"
  set -a
  . "$SECRETS_FILE"
  set +a
fi

# Auto-generate JWT secrets if still missing (e.g. user didn't run install.sh)
if [ -z "$JWT_SECRET" ] || [ -z "$JWT_REFRESH_SECRET" ]; then
  echo "🔐 JWT secrets not found — generating..."
  JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')
  JWT_REFRESH_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')
  export JWT_SECRET JWT_REFRESH_SECRET

  # Persist for next restart
  cat > "$SECRETS_FILE" << EOF
# Auto-generated secrets — $(date -u +"%Y-%m-%d %H:%M:%S UTC")
JWT_SECRET="$JWT_SECRET"
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
EOF
  chmod 600 "$SECRETS_FILE"
  echo "✅ JWT secrets generated and saved to $SECRETS_FILE"
fi

echo "✅ Secrets loaded"

# ============================================
# 2. Wait for Dependencies
# ============================================
echo ""
echo "⏳ Waiting for PostgreSQL..."
until nc -z -v -w30 postgres 5432 2>/dev/null; do
  echo "   Waiting for database connection..."
  sleep 1
done
echo "✅ PostgreSQL is ready!"

echo "⏳ Waiting for Redis..."
until nc -z -v -w30 redis 6379 2>/dev/null; do
  echo "   Waiting for Redis connection..."
  sleep 1
done
echo "✅ Redis is ready!"
echo ""

# ============================================
# 3. Database Migrations (Drizzle)
# ============================================
# Use lightweight migration script (drizzle-orm only, no drizzle-kit needed)
# This saves ~30MB in the Docker image
node scripts/run-migrations.js

# ============================================
# 4. Check Setup Status
# ============================================
echo ""
if [ -f "$SETUP_FILE" ]; then
  SETUP_COMPLETED=$(cat "$SETUP_FILE" | grep -o '"completed":true' || echo "")
  if [ -n "$SETUP_COMPLETED" ]; then
    echo "✅ Setup completed previously"
  else
    echo "📋 Setup wizard pending - complete at http://localhost:${PORT:-4567}"
  fi
else
  echo "🆕 First run detected!"
  echo "📋 Complete the setup wizard at http://localhost:${PORT:-4567}"
fi

echo ""
echo "✅ Initialization complete!"
echo ""

# ============================================
# 5. Start Application
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎵 Echo Music Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Environment: ${NODE_ENV:-production}"
echo "   Port: ${PORT:-4567}"
echo "   Data: $DATA_DIR"
echo ""
echo "   Access your server at:"
echo "   → http://localhost:${PORT:-4567}"
echo ""
if [ ! -f "$SETUP_FILE" ] || [ -z "$(cat "$SETUP_FILE" 2>/dev/null | grep -o '"completed":true')" ]; then
  echo "   ⚠️  FIRST RUN: Complete setup wizard to create admin account"
  echo ""
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the application
exec node dist/src/main.js
