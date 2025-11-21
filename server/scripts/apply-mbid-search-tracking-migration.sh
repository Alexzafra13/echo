#!/bin/bash

# Script to apply the MBID search tracking migration
# This adds the mbidSearchedAt field to Artist, Album, and Track tables

set -e

echo "🔄 Applying MBID search tracking migration..."

# Change to server directory
cd "$(dirname "$0")/.."

# Step 1: Apply the database migration
echo "📊 Step 1: Applying database migration..."
if command -v psql &> /dev/null; then
    # If psql is available, try to apply directly
    if [ -f ".env" ]; then
        source .env
        psql "$DATABASE_URL" -f prisma/migrations/20251121_add_mbid_search_tracking/migration.sql
        echo "✅ Migration applied directly via psql"
    else
        echo "⚠️  .env file not found, trying Prisma migrate deploy..."
        npx prisma migrate deploy
    fi
else
    echo "📦 Using Prisma migrate deploy..."
    npx prisma migrate deploy
fi

# Step 2: Regenerate Prisma client
echo "🔧 Step 2: Regenerating Prisma client..."
npx prisma generate

echo "✅ Migration completed successfully!"
echo ""
echo "The following fields have been added:"
echo "  - Artist.mbidSearchedAt"
echo "  - Album.mbidSearchedAt"
echo "  - Track.mbidSearchedAt"
echo ""
echo "These fields track when MusicBrainz ID searches were attempted,"
echo "preventing redundant searches and respecting API rate limits."
