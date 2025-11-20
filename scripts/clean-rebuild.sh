#!/bin/bash
# ============================================
# Echo Music Server - Clean Rebuild Script
# ============================================
# Use this script when you need a completely fresh build
# (e.g., after major changes or when cache issues occur)
#
# ⚠️  IMPORTANT: This script PRESERVES your data (users, playlists, etc.)
# To also delete all data, use: ./scripts/clean-rebuild.sh --delete-data
# ============================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Echo Music Server - Clean Rebuild${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar si se debe borrar volúmenes
DELETE_VOLUMES=false
if [ "$1" == "--delete-data" ] || [ "$1" == "-v" ]; then
    echo -e "${RED}⚠️  ADVERTENCIA: Se borrarán TODOS los datos (usuarios, playlists, configuraciones)${NC}"
    echo ""
    read -p "¿Estás SEGURO? Escribe 'BORRAR TODO' para confirmar: " CONFIRM
    if [ "$CONFIRM" == "BORRAR TODO" ]; then
        DELETE_VOLUMES=true
        echo ""
        echo -e "${RED}✅ Confirmado. Se borrarán todos los volúmenes.${NC}"
    else
        echo ""
        echo -e "${YELLOW}❌ Cancelado. No se borrarán los volúmenes.${NC}"
        echo ""
        exit 0
    fi
else
    echo -e "${GREEN}ℹ️  Los datos (usuarios, playlists, etc.) se MANTENDRÁN${NC}"
    echo -e "${YELLOW}   Para borrar también los datos, usa: ./scripts/clean-rebuild.sh --delete-data${NC}"
fi
echo ""

# Stop and remove all containers
echo -e "${GREEN}1️⃣  Stopping containers...${NC}"
if [ "$DELETE_VOLUMES" == true ]; then
    docker compose -f docker-compose.simple.yml down -v
    echo -e "   ${RED}🗑️  Volúmenes eliminados${NC}"
else
    docker compose -f docker-compose.simple.yml down
    echo -e "   ${GREEN}💾 Volúmenes preservados${NC}"
fi

# Remove old images
echo ""
echo -e "${GREEN}2️⃣  Removing old Echo images...${NC}"
docker rmi $(docker images | grep 'echo-music-server' | awk '{print $3}') 2>/dev/null || echo "   No old images to remove"

# Clean Docker build cache (optional - uncomment if needed)
# echo ""
# echo "3️⃣  Cleaning Docker build cache..."
# docker builder prune -f

echo ""
echo -e "${GREEN}3️⃣  Rebuilding from scratch...${NC}"
docker compose -f docker-compose.simple.yml up --build --force-recreate -d

echo ""
echo -e "${GREEN}4️⃣  Waiting for services to start...${NC}"
sleep 10

echo ""
echo -e "${GREEN}5️⃣  Checking container status...${NC}"
docker compose -f docker-compose.simple.yml ps

echo ""
echo -e "${GREEN}✅ Rebuild complete!${NC}"
echo ""
echo -e "${BLUE}📋 View logs:${NC}"
echo "   docker compose -f docker-compose.simple.yml logs -f echo-app"
echo ""
echo -e "${BLUE}🌐 Access the app:${NC}"
echo "   http://localhost:4567"
echo ""

if [ "$DELETE_VOLUMES" == true ]; then
    echo -e "${RED}⚠️  DATOS BORRADOS: Deberás crear nuevos usuarios${NC}"
    echo "   Usuario admin: admin / admin123"
    echo ""
else
    echo -e "${GREEN}💾 TUS DATOS SE MANTUVIERON:${NC}"
    echo "   ✅ Usuarios, playlists, favoritos intactos"
    echo "   ✅ Covers y configuraciones preservadas"
    echo "   ℹ️  Puedes iniciar sesión normalmente"
    echo ""
fi

echo -e "${YELLOW}⚠️  IMPORTANT: Clear your browser cache!${NC}"
echo "   Chrome/Edge: Ctrl+Shift+R (Cmd+Shift+R on Mac)"
echo "   Or use Incognito mode: Ctrl+Shift+N"
echo ""

if [ "$DELETE_VOLUMES" == false ]; then
    echo -e "${BLUE}💡 TIP: Haz backups regulares de tu base de datos:${NC}"
    echo "   ./scripts/backup-database.sh"
    echo ""
fi
