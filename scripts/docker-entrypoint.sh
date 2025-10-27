#!/bin/sh
set -e

echo "🚀 Starting Echo Music Server..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until nc -z -v -w30 postgres 5432; do
  echo "Waiting for database connection..."
  sleep 1
done
echo "✅ PostgreSQL is ready!"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
until nc -z -v -w30 redis 6379; do
  echo "Waiting for Redis connection..."
  sleep 1
done
echo "✅ Redis is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy || {
  echo "⚠️  Migration failed, but continuing..."
}

# Generate Prisma Client (if not already generated)
echo "🔄 Generating Prisma Client..."
npx prisma generate || {
  echo "⚠️  Prisma generate failed, but continuing..."
}

echo "✅ Initialization complete!"
echo ""
echo "🎵 Starting Echo Music Server..."
echo "📍 Environment: ${NODE_ENV:-production}"
echo "🌐 Listening on: ${HOST:-0.0.0.0}:${PORT:-4567}"
echo ""
echo "Access your server at:"
echo "  - http://localhost:${PORT:-4567} (from this machine)"
echo "  - http://<SERVER_IP>:${PORT:-4567} (from network)"
echo ""

# Start the application
exec node dist/src/main.js
