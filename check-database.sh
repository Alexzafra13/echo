#!/bin/bash
# ============================================
# Echo Music Server - Database Check
# ============================================
# Quick script to verify your library was scanned correctly

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Echo Music Server - Database Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if containers are running
if ! docker ps | grep -q echo-postgres; then
    echo "❌ PostgreSQL container is not running!"
    echo "   Start with: docker compose -f docker-compose.ghcr.yml up -d"
    exit 1
fi

echo "✅ PostgreSQL container is running"
echo ""

# Get counts
echo "📊 Library Statistics:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TRACKS=$(docker exec -it echo-postgres psql -U music_admin -d music_server -t -c "SELECT COUNT(*) FROM \"Track\";" | tr -d ' \r\n')
ALBUMS=$(docker exec -it echo-postgres psql -U music_admin -d music_server -t -c "SELECT COUNT(*) FROM \"Album\";" | tr -d ' \r\n')
ARTISTS=$(docker exec -it echo-postgres psql -U music_admin -d music_server -t -c "SELECT COUNT(*) FROM \"Artist\";" | tr -d ' \r\n')
GENRES=$(docker exec -it echo-postgres psql -U music_admin -d music_server -t -c "SELECT COUNT(*) FROM \"Genre\";" | tr -d ' \r\n')

echo "🎵 Tracks:  $TRACKS"
echo "💿 Albums:  $ALBUMS"
echo "🎤 Artists: $ARTISTS"
echo "🎭 Genres:  $GENRES"
echo ""

if [ "$TRACKS" -eq 0 ]; then
    echo "⚠️  No tracks found in database!"
    echo ""
    echo "Possible causes:"
    echo "1. Library scan hasn't been run yet"
    echo "   → Go to Settings → Library Scanner → Start Scan"
    echo ""
    echo "2. Music path is incorrect"
    echo "   → Check MUSIC_PATH in .env file"
    echo "   → Verify: docker exec echo-app ls -la /music"
    echo ""
    echo "3. No supported audio files in your music folder"
    echo "   → Supported: MP3, FLAC, M4A, AAC, OGG, OPUS, WAV"
    echo ""
else
    echo "✅ Library scanned successfully!"
    echo ""
    echo "📝 Sample Data:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    echo ""
    echo "🎤 Top 5 Artists (by track count):"
    docker exec -it echo-postgres psql -U music_admin -d music_server -c "SELECT name, \"songCount\" FROM \"Artist\" ORDER BY \"songCount\" DESC LIMIT 5;"

    echo ""
    echo "💿 Recent Albums:"
    docker exec -it echo-postgres psql -U music_admin -d music_server -c "SELECT name, year, \"songCount\" FROM \"Album\" ORDER BY \"createdAt\" DESC LIMIT 5;"

    echo ""
    echo "🎵 Sample Tracks:"
    docker exec -it echo-postgres psql -U music_admin -d music_server -c "SELECT title, \"artistName\", \"albumName\" FROM \"Track\" LIMIT 5;"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Database check complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
