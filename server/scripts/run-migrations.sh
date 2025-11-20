#!/bin/sh
# ============================================
# Run database migrations inside the container
# ============================================
# This script is useful if you need to manually
# run migrations after the container is running
#
# Usage:
#   docker exec echo-app /app/scripts/run-migrations.sh
# ============================================

set -e

echo "🔄 Running database migrations..."
echo ""

# Check if Prisma CLI is available
if command -v prisma >/dev/null 2>&1; then
    echo "✅ Prisma CLI found, running migrations..."
    prisma migrate deploy
    echo "✅ Migrations completed!"
elif [ -f "./node_modules/.bin/prisma" ]; then
    echo "✅ Prisma CLI found in node_modules, running migrations..."
    ./node_modules/.bin/prisma migrate deploy
    echo "✅ Migrations completed!"
else
    echo "⚠️  Prisma CLI not available in production build"
    echo "   Migrations should be run during deployment, not at runtime"
    echo ""
    echo "   To run migrations, use one of these methods:"
    echo "   1. Run from host: docker exec echo-app npx prisma migrate deploy"
    echo "   2. Include Prisma in production dependencies"
    echo "   3. Use a separate migration container/job"
    exit 1
fi
