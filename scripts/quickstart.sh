#!/bin/bash
# ============================================
# Echo Music Server - Quickstart
# ============================================
# Un solo script para levantar todo el entorno de desarrollo
# Uso: ./scripts/quickstart.sh
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  ███████╗ ██████╗██╗  ██╗ ██████╗ "
echo "  ██╔════╝██╔════╝██║  ██║██╔═══██╗"
echo "  █████╗  ██║     ███████║██║   ██║"
echo "  ██╔══╝  ██║     ██╔══██║██║   ██║"
echo "  ███████╗╚██████╗██║  ██║╚██████╔╝"
echo "  ╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ "
echo -e "${NC}"
echo -e "${YELLOW}Music Server - Development Setup${NC}"
echo ""

# Verificar requisitos
echo -e "${BLUE}[1/5]${NC} Verificando requisitos..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js no encontrado. Instala Node.js >= 22${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo -e "${RED}✗ Node.js $NODE_VERSION encontrado. Se requiere >= 22${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"

if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}  → Instalando pnpm...${NC}"
    npm install -g pnpm
fi
echo -e "  ${GREEN}✓${NC} pnpm $(pnpm -v)"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker no encontrado. Instala Docker Desktop${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)"

if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Docker no está corriendo. Inicia Docker Desktop${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker está corriendo"
echo ""

# Instalar dependencias
echo -e "${BLUE}[2/5]${NC} Instalando dependencias..."
pnpm install --silent
echo -e "  ${GREEN}✓${NC} Dependencias instaladas"
echo ""

# Levantar PostgreSQL y Redis
echo -e "${BLUE}[3/5]${NC} Levantando PostgreSQL y Redis..."
docker compose -f docker-compose.dev.yml up -d --quiet-pull 2>/dev/null
echo -e "  ${GREEN}✓${NC} Contenedores iniciados"

# Esperar a que estén listos
echo -e "  → Esperando a que PostgreSQL esté listo..."
until docker exec echo-postgres-dev pg_isready -U music_user -d music_db &> /dev/null; do
    sleep 1
done
echo -e "  ${GREEN}✓${NC} PostgreSQL listo"

echo -e "  → Esperando a que Redis esté listo..."
until docker exec echo-redis-dev redis-cli --pass dev_redis_password ping 2>/dev/null | grep -q PONG; do
    sleep 1
done
echo -e "  ${GREEN}✓${NC} Redis listo"
echo ""

# Generar .env y crear carpetas
echo -e "${BLUE}[4/5]${NC} Configurando entorno..."
cd api
node scripts/generate-env.js
mkdir -p uploads/covers uploads/metadata
echo -e "  ${GREEN}✓${NC} Carpetas uploads creadas"
cd ..
echo ""

# Migraciones (Drizzle)
echo -e "${BLUE}[5/5]${NC} Aplicando schema a la base de datos..."
cd api
pnpm db:push
cd ..
echo -e "  ${GREEN}✓${NC} Base de datos lista"
echo ""

# Resumen
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup completado!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "Para iniciar desarrollo:"
echo -e "  ${YELLOW}pnpm dev:all${NC}"
echo ""
echo -e "URLs:"
echo -e "  Frontend: ${BLUE}http://localhost:5173${NC}"
echo -e "  Backend:  ${BLUE}http://localhost:3000${NC}"
echo -e "  Swagger:  ${BLUE}http://localhost:3000/api/docs${NC}"
echo ""
