#!/bin/sh
set -e

echo "🚀 Starting Echo Music Server..."
echo ""

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
# 2. Database Setup
# ============================================
echo "🔄 Setting up database..."

# Generate Prisma Client first
echo "   📦 Generating Prisma Client..."
npx prisma generate || {
  echo "⚠️  Prisma generate failed, but continuing..."
}

# Check if database is empty (first run)
FIRST_RUN=false
if ! npx prisma db execute --stdin <<< "SELECT 1 FROM \"User\" LIMIT 1;" > /dev/null 2>&1; then
  echo "   🆕 First run detected - initializing database..."
  FIRST_RUN=true
fi

# Run migrations
echo "   🔄 Running database migrations..."
npx prisma migrate deploy || {
  echo "⚠️  Migration failed, but continuing..."
}

# ============================================
# 3. Seed Database (First Run Only)
# ============================================
if [ "$FIRST_RUN" = true ]; then
  echo ""
  echo "🌱 Creating initial admin user..."

  # Run seed to create admin user
  if npx prisma db seed; then
    echo "✅ Admin user created successfully!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔐 IMPORTANT: Default Credentials"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo ""
    echo "⚠️  CHANGE THIS PASSWORD IMMEDIATELY!"
    echo "   You'll be prompted on first login."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
  else
    echo "⚠️  Seed failed - you may need to create a user manually"
  fi
else
  echo "   ℹ️  Database already initialized, skipping seed"
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
