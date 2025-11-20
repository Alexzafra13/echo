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

# Generate secrets if they don't exist (FIRST RUN ONLY)
if [ ! -f "$SECRETS_FILE" ]; then
  echo "🔐 First run detected - generating secure JWT secrets..."

  # Generate cryptographically secure secrets
  JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')
  JWT_REFRESH_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')

  # Save to persistent volume
  cat > "$SECRETS_FILE" << EOF
# Auto-generated JWT secrets (DO NOT EDIT MANUALLY)
# Generated on: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
export JWT_SECRET="$JWT_SECRET"
export JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
EOF

  echo "✅ Secure JWT secrets generated and saved to $SECRETS_FILE"
  echo ""
else
  echo "ℹ️  Using existing JWT secrets from $SECRETS_FILE"
  echo ""
fi

# Load secrets into environment
. "$SECRETS_FILE"

# Export for Node.js application
export JWT_SECRET
export JWT_REFRESH_SECRET

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
# 2. Database Migrations
# ============================================
echo "🔄 Running database migrations..."

# Run migrations using npx (Prisma CLI installed temporarily)
if npx prisma@6.17.1 migrate deploy; then
  echo "✅ Database migrations completed!"
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
