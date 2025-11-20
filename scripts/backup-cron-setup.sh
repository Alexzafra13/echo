#!/bin/bash
# ============================================
# Echo Music Server - Setup Automated Backups
# ============================================
# Configura backups automáticos usando cron
#
# Uso:
#   sudo ./scripts/backup-cron-setup.sh
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}⏰ Echo Music Server - Setup Automated Backups${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar que no se está ejecutando como root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ No ejecutes este script como root${NC}"
    echo "   Ejecuta: ./scripts/backup-cron-setup.sh"
    echo "   El script pedirá permisos sudo cuando sea necesario"
    exit 1
fi

# Obtener ruta absoluta del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup-database.sh"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/backup-cron.log"

echo -e "${BLUE}📁 Proyecto detectado en: $PROJECT_DIR${NC}"
echo ""

# Verificar que el script de backup existe
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}❌ No se encuentra el script de backup: $BACKUP_SCRIPT${NC}"
    exit 1
fi

# Crear directorio de logs
mkdir -p "$LOG_DIR"

# Menú de frecuencia
echo -e "${YELLOW}¿Con qué frecuencia quieres hacer backups?${NC}"
echo ""
echo "  1) Diario a las 2:00 AM  (recomendado para producción)"
echo "  2) Semanal los domingos a las 3:00 AM  (recomendado para hogar)"
echo "  3) Cada 6 horas  (máxima protección)"
echo "  4) Mensual el día 1 a las 4:00 AM  (mínimo)"
echo "  5) Personalizado"
echo ""
read -p "Selecciona una opción [1-5]: " OPTION

case $OPTION in
    1)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="diario a las 2:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 3 * * 0"
        DESCRIPTION="semanal los domingos a las 3:00 AM"
        ;;
    3)
        CRON_SCHEDULE="0 */6 * * *"
        DESCRIPTION="cada 6 horas"
        ;;
    4)
        CRON_SCHEDULE="0 4 1 * *"
        DESCRIPTION="mensual el día 1 a las 4:00 AM"
        ;;
    5)
        echo ""
        echo "Formato cron: MINUTO HORA DIA MES DIA_SEMANA"
        echo "Ejemplos:"
        echo "  0 2 * * *       = Diario a las 2:00 AM"
        echo "  0 3 * * 0       = Domingos a las 3:00 AM"
        echo "  */30 * * * *    = Cada 30 minutos"
        echo ""
        read -p "Ingresa tu expresión cron: " CRON_SCHEDULE
        DESCRIPTION="personalizado: $CRON_SCHEDULE"
        ;;
    *)
        echo -e "${RED}❌ Opción inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Configuración seleccionada: $DESCRIPTION${NC}"
echo ""

# Crear entrada de cron
CRON_ENTRY="$CRON_SCHEDULE cd $PROJECT_DIR && $BACKUP_SCRIPT >> $LOG_FILE 2>&1"

# Verificar si ya existe una entrada para este proyecto
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo -e "${YELLOW}⚠️  Ya existe una tarea cron para backups de Echo${NC}"
    echo ""
    echo "Entrada actual:"
    crontab -l 2>/dev/null | grep "$BACKUP_SCRIPT"
    echo ""
    read -p "¿Reemplazar con la nueva configuración? [s/N]: " REPLACE

    if [[ ! "$REPLACE" =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}❌ Cancelado${NC}"
        exit 0
    fi

    # Remover entrada anterior
    crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
    echo -e "${GREEN}✅ Entrada anterior removida${NC}"
fi

# Agregar nueva entrada
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo ""
echo -e "${GREEN}✅ Backup automático configurado exitosamente!${NC}"
echo ""
echo -e "${BLUE}📋 Resumen:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏰ Frecuencia: $DESCRIPTION"
echo "📁 Directorio: $PROJECT_DIR"
echo "📜 Script: $BACKUP_SCRIPT"
echo "📝 Logs: $LOG_FILE"
echo ""

# Configurar retención de backups
echo -e "${YELLOW}¿Cuántos backups quieres mantener?${NC}"
echo ""
echo "  1) 7 backups  (última semana)"
echo "  2) 14 backups  (últimas 2 semanas)"
echo "  3) 30 backups  (último mes - recomendado)"
echo "  4) 90 backups  (3 meses)"
echo "  5) Ilimitado (no borrar backups antiguos)"
echo ""
read -p "Selecciona una opción [1-5]: " RETENTION_OPTION

case $RETENTION_OPTION in
    1) RETENTION_DAYS=7 ;;
    2) RETENTION_DAYS=14 ;;
    3) RETENTION_DAYS=30 ;;
    4) RETENTION_DAYS=90 ;;
    5) RETENTION_DAYS=0 ;;
    *)
        echo -e "${RED}❌ Opción inválida, usando 30 días por defecto${NC}"
        RETENTION_DAYS=30
        ;;
esac

if [ "$RETENTION_DAYS" -gt 0 ]; then
    # Crear script de limpieza
    CLEANUP_SCRIPT="$PROJECT_DIR/scripts/.backup-cleanup.sh"
    cat > "$CLEANUP_SCRIPT" <<EOF
#!/bin/bash
# Auto-generated cleanup script
BACKUP_DIR="$PROJECT_DIR/backups"
RETENTION_DAYS=$RETENTION_DAYS

if [ -d "\$BACKUP_DIR" ]; then
    echo "🧹 Limpiando backups antiguos (>$RETENTION_DAYS días)..."
    find "\$BACKUP_DIR" -name "backup_*" -type d -mtime +\$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null
    echo "✅ Limpieza completada"
fi
EOF
    chmod +x "$CLEANUP_SCRIPT"

    # Agregar limpieza al cron (ejecutar después del backup)
    CLEANUP_HOUR=$(($(echo $CRON_SCHEDULE | cut -d' ' -f2) + 1))
    CLEANUP_CRON="0 $CLEANUP_HOUR * * * $CLEANUP_SCRIPT >> $LOG_FILE 2>&1"
    (crontab -l 2>/dev/null | grep -v "$CLEANUP_SCRIPT"; echo "$CLEANUP_CRON") | crontab -

    echo ""
    echo -e "${GREEN}✅ Limpieza automática configurada (mantener $RETENTION_DAYS días)${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Los backups se mantendrán indefinidamente${NC}"
    echo "   Recuerda limpiar manualmente de vez en cuando"
fi

echo ""
echo -e "${BLUE}📋 Comandos útiles:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Ver tareas cron:"
echo "  crontab -l"
echo ""
echo "Ver logs de backups:"
echo "  tail -f $LOG_FILE"
echo ""
echo "Probar backup manual:"
echo "  $BACKUP_SCRIPT"
echo ""
echo "Desactivar backups automáticos:"
echo "  crontab -e  (y comentar/borrar las líneas de backup)"
echo ""
echo -e "${GREEN}✅ Setup completado!${NC}"
echo ""
echo -e "${YELLOW}💡 TIP: El primer backup se ejecutará según el horario configurado${NC}"
echo "   Para probar ahora mismo: $BACKUP_SCRIPT"
echo ""
