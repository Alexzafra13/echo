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
echo "🎵 Starting application..."

# Start the application
exec node dist/src/main.js
