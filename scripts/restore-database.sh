#!/bin/bash
# ============================================
# Echo Music Server - Database Restore Script
# ============================================
# Restaura un backup de PostgreSQL y volúmenes
#
# Uso:
#   ./scripts/restore-database.sh ./backups/backup_2024-01-15_10-30-00
#
# ⚠️  ADVERTENCIA: Esto SOBRESCRIBIRÁ la base de datos actual
# ============================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Debes especificar el directorio del backup${NC}"
    echo ""
    echo "Uso:"
    echo "   ./scripts/restore-database.sh ./backups/backup_YYYY-MM-DD_HH-MM-SS"
    echo ""
    echo "Backups disponibles:"
    ls -1dt ./backups/backup_* 2>/dev/null | head -5 | while read backup; do
        BACKUP_SIZE=$(du -sh "$backup" | cut -f1)
        BACKUP_NAME=$(basename "$backup")
        echo "   📦 $BACKUP_NAME ($BACKUP_SIZE)"
    done
    exit 1
fi

BACKUP_PATH="$1"

if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}❌ Error: El directorio de backup no existe: $BACKUP_PATH${NC}"
    exit 1
fi

echo -e "${BLUE}🔄 Echo Music Server - Database Restore${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}📦 Backup a restaurar: $(basename $BACKUP_PATH)${NC}"
echo ""

# Mostrar contenido del backup
echo -e "${BLUE}📋 Contenido del backup:${NC}"
ls -lh "$BACKUP_PATH" | tail -n +2 | awk '{printf "   %s  %s\n", $9, $5}'
echo ""

# Confirmar con el usuario
echo -e "${RED}⚠️  ADVERTENCIA: Esto SOBRESCRIBIRÁ todos los datos actuales${NC}"
echo ""
read -p "¿Estás seguro de que quieres continuar? (escribe 'SI' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    echo ""
    echo -e "${YELLOW}❌ Restauración cancelada${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}✅ Confirmado. Iniciando restauración...${NC}"
echo ""

# Verificar que el contenedor de postgres esté corriendo
if ! docker ps | grep -q echo-postgres; then
    echo -e "${YELLOW}⚠️  El contenedor echo-postgres no está corriendo. Iniciando servicios...${NC}"
    docker compose -f docker-compose.yml up -d postgres
    echo "   Esperando a que PostgreSQL esté listo..."
    sleep 10
fi

# Obtener credenciales de la base de datos
POSTGRES_USER=$(docker inspect echo-postgres | grep -A 10 '"Env"' | grep POSTGRES_USER | cut -d'=' -f2 | tr -d '",' || echo "echo")
POSTGRES_DB=$(docker inspect echo-postgres | grep -A 10 '"Env"' | grep POSTGRES_DB | cut -d'=' -f2 | tr -d '",' || echo "echo")

# 1. Restaurar PostgreSQL
if [ -f "$BACKUP_PATH/postgres_dump.backup" ]; then
    echo -e "${GREEN}1️⃣  Restaurando PostgreSQL (formato binario)...${NC}"

    # Copiar backup al contenedor
    docker cp "$BACKUP_PATH/postgres_dump.backup" echo-postgres:/tmp/restore.dump

    # Eliminar conexiones activas
    docker exec echo-postgres psql -U "$POSTGRES_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();"

    # Restaurar
    docker exec echo-postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists -v /tmp/restore.dump 2>&1 | grep -v "^pg_restore:"

    # Limpiar
    docker exec echo-postgres rm /tmp/restore.dump

    echo -e "   ✅ Base de datos restaurada"
elif [ -f "$BACKUP_PATH/postgres_dump.sql" ]; then
    echo -e "${GREEN}1️⃣  Restaurando PostgreSQL (formato SQL)...${NC}"

    # Copiar backup al contenedor
    docker cp "$BACKUP_PATH/postgres_dump.sql" echo-postgres:/tmp/restore.sql

    # Eliminar conexiones activas
    docker exec echo-postgres psql -U "$POSTGRES_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();"

    # Restaurar
    docker exec echo-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/restore.sql

    # Limpiar
    docker exec echo-postgres rm /tmp/restore.sql

    echo -e "   ✅ Base de datos restaurada"
else
    echo -e "${RED}   ❌ No se encontró archivo de backup de PostgreSQL${NC}"
fi
echo ""

# 2. Restaurar uploads
if [ -f "$BACKUP_PATH/uploads.tar.gz" ]; then
    echo -e "${GREEN}2️⃣  Restaurando uploads (covers, avatars)...${NC}"

    # Detener echo-app para evitar escrituras concurrentes
    docker compose -f docker-compose.yml stop echo-app 2>/dev/null || true

    docker run --rm \
        -v echo-uploads:/target \
        -v "$(pwd)/$BACKUP_PATH":/backup:ro \
        alpine \
        sh -c "rm -rf /target/* && tar xzf /backup/uploads.tar.gz -C /target"

    echo -e "   ✅ Uploads restaurados"
else
    echo -e "${YELLOW}   ⚠️  No se encontró backup de uploads, saltando...${NC}"
fi
echo ""

# 3. Restaurar config
if [ -f "$BACKUP_PATH/config.tar.gz" ]; then
    echo -e "${GREEN}3️⃣  Restaurando configuración (JWT secrets)...${NC}"

    docker run --rm \
        -v echo-config:/target \
        -v "$(pwd)/$BACKUP_PATH":/backup:ro \
        alpine \
        sh -c "rm -rf /target/* && tar xzf /backup/config.tar.gz -C /target"

    echo -e "   ✅ Configuración restaurada"
else
    echo -e "${YELLOW}   ⚠️  No se encontró backup de config, saltando...${NC}"
fi
echo ""

# Reiniciar servicios
echo -e "${GREEN}4️⃣  Reiniciando servicios...${NC}"
docker compose -f docker-compose.yml restart
echo -e "   ✅ Servicios reiniciados"
echo ""

echo ""
echo -e "${GREEN}✅ Restauración completada exitosamente!${NC}"
echo ""
echo -e "${BLUE}📋 Siguiente paso:${NC}"
echo "   1. Verifica que la aplicación funcione: http://localhost:4567"
echo "   2. Inicia sesión con tus credenciales anteriores"
echo "   3. Verifica que tus playlists y favoritos estén presentes"
echo ""
echo -e "${YELLOW}⚠️  Si algo salió mal:${NC}"
echo "   - Revisa los logs: docker compose -f docker-compose.yml logs -f"
echo "   - El backup original sigue intacto en: $BACKUP_PATH"
echo ""
