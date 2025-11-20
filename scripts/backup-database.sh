#!/bin/bash
# ============================================
# Echo Music Server - Database Backup Script
# ============================================
# Crea un backup completo de PostgreSQL y los volúmenes importantes
#
# Uso:
#   ./scripts/backup-database.sh
#
# El backup se guarda en: ./backups/backup_YYYY-MM-DD_HH-MM-SS/
# ============================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  Echo Music Server - Database Backup${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar que el contenedor de postgres esté corriendo
if ! docker ps | grep -q echo-postgres; then
    echo -e "${RED}❌ Error: El contenedor echo-postgres no está corriendo${NC}"
    echo "   Inicia los servicios con: docker compose -f docker-compose.simple.yml up -d"
    exit 1
fi

# Crear directorio de backups
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

mkdir -p "$BACKUP_PATH"

echo -e "${YELLOW}📁 Creando backup en: $BACKUP_PATH${NC}"
echo ""

# Obtener credenciales de la base de datos
POSTGRES_USER=$(docker inspect echo-postgres | grep -A 10 '"Env"' | grep POSTGRES_USER | cut -d'=' -f2 | tr -d '",' || echo "music_admin")
POSTGRES_DB=$(docker inspect echo-postgres | grep -A 10 '"Env"' | grep POSTGRES_DB | cut -d'=' -f2 | tr -d '",' || echo "music_server")

# 1. Backup de PostgreSQL (dump SQL)
echo -e "${GREEN}1️⃣  Haciendo backup de PostgreSQL...${NC}"
docker exec echo-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c -b -v -f "/tmp/backup.dump" 2>&1 | grep -v "^pg_dump:"
docker cp echo-postgres:/tmp/backup.dump "$BACKUP_PATH/postgres_dump.backup"
docker exec echo-postgres rm /tmp/backup.dump
echo -e "   ✅ PostgreSQL dump guardado: postgres_dump.backup"
echo ""

# 2. Backup de PostgreSQL (SQL plano - más fácil de restaurar)
echo -e "${GREEN}2️⃣  Creando backup SQL plano...${NC}"
docker exec echo-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_PATH/postgres_dump.sql"
echo -e "   ✅ SQL plano guardado: postgres_dump.sql"
echo ""

# 3. Backup del volumen de uploads (covers, avatars)
echo -e "${GREEN}3️⃣  Haciendo backup de uploads (covers, avatars)...${NC}"
if docker volume inspect echo-uploads > /dev/null 2>&1; then
    docker run --rm \
        -v echo-uploads:/source:ro \
        -v "$(pwd)/$BACKUP_PATH":/backup \
        alpine \
        tar czf /backup/uploads.tar.gz -C /source .
    echo -e "   ✅ Uploads backup guardado: uploads.tar.gz"
else
    echo -e "   ⚠️  Volumen echo-uploads no existe, saltando..."
fi
echo ""

# 4. Backup del volumen de config (JWT secrets)
echo -e "${GREEN}4️⃣  Haciendo backup de configuración (JWT secrets)...${NC}"
if docker volume inspect echo-config > /dev/null 2>&1; then
    docker run --rm \
        -v echo-config:/source:ro \
        -v "$(pwd)/$BACKUP_PATH":/backup \
        alpine \
        tar czf /backup/config.tar.gz -C /source .
    echo -e "   ✅ Config backup guardado: config.tar.gz"
else
    echo -e "   ⚠️  Volumen echo-config no existe, saltando..."
fi
echo ""

# 5. Información del sistema
echo -e "${GREEN}5️⃣  Guardando información del sistema...${NC}"
cat > "$BACKUP_PATH/backup_info.txt" <<EOF
Echo Music Server - Backup Information
======================================
Backup Date: $(date)
Timestamp: $TIMESTAMP

Database:
---------
POSTGRES_USER: $POSTGRES_USER
POSTGRES_DB: $POSTGRES_DB

Docker Containers:
------------------
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" | grep echo)

Docker Volumes:
---------------
$(docker volume ls | grep echo)

Docker Images:
--------------
$(docker images | grep echo)

EOF
echo -e "   ✅ Info del sistema guardada: backup_info.txt"
echo ""

# Calcular tamaño del backup
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)

echo ""
echo -e "${GREEN}✅ Backup completado exitosamente!${NC}"
echo ""
echo -e "${BLUE}📊 Resumen:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Ubicación: $BACKUP_PATH"
echo "💾 Tamaño total: $BACKUP_SIZE"
echo ""
echo -e "${BLUE}📦 Contenido:${NC}"
ls -lh "$BACKUP_PATH" | tail -n +2 | awk '{printf "   %s  %s\n", $9, $5}'
echo ""

# Listar backups existentes
echo -e "${YELLOW}📚 Backups disponibles:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR" | grep -c "^backup_" || echo "0")
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        ls -1t "$BACKUP_DIR" | grep "^backup_" | head -5 | while read backup; do
            BACKUP_SIZE=$(du -sh "$BACKUP_DIR/$backup" | cut -f1)
            echo "   📦 $backup ($BACKUP_SIZE)"
        done
        if [ "$BACKUP_COUNT" -gt 5 ]; then
            echo "   ... y $(($BACKUP_COUNT - 5)) más"
        fi
    else
        echo "   (ninguno)"
    fi
else
    echo "   (ninguno)"
fi
echo ""

echo -e "${BLUE}🔄 Para restaurar este backup:${NC}"
echo "   ./scripts/restore-database.sh $BACKUP_PATH"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "   - Guarda este backup en un lugar seguro (USB, NAS, cloud)"
echo "   - Los backups NO sobreviven a 'docker-compose down -v'"
echo "   - Recomendado: Hacer backup antes de actualizar/rebuild"
echo ""
