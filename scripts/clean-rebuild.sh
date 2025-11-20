#!/bin/bash
# ============================================
# Echo Music Server - Clean Rebuild Script
# ============================================
# Use this script when you need a completely fresh build
# (e.g., after major changes or when cache issues occur)

set -e

echo "🧹 Echo Music Server - Clean Rebuild"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stop and remove all containers
echo "1️⃣  Stopping containers..."
docker compose -f docker-compose.simple.yml down -v

# Remove old images
echo ""
echo "2️⃣  Removing old Echo images..."
docker rmi $(docker images | grep 'echo-music-server' | awk '{print $3}') 2>/dev/null || echo "   No old images to remove"

# Clean Docker build cache (optional - uncomment if needed)
# echo ""
# echo "3️⃣  Cleaning Docker build cache..."
# docker builder prune -f

echo ""
echo "3️⃣  Rebuilding from scratch..."
docker compose -f docker-compose.simple.yml up --build --force-recreate -d

echo ""
echo "4️⃣  Waiting for services to start..."
sleep 10

echo ""
echo "5️⃣  Checking container status..."
docker compose -f docker-compose.simple.yml ps

echo ""
echo "✅ Rebuild complete!"
echo ""
echo "📋 View logs:"
echo "   docker compose -f docker-compose.simple.yml logs -f echo-app"
echo ""
echo "🌐 Access the app:"
echo "   http://localhost:4567"
echo ""
echo "⚠️  IMPORTANT: Clear your browser cache!"
echo "   Chrome/Edge: Ctrl+Shift+R (Cmd+Shift+R on Mac)"
echo "   Or use Incognito mode: Ctrl+Shift+N"
echo ""
