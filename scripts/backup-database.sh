#!/usr/bin/env bash

# ============================================
# Echo Music Server - Database Backup Script
# ============================================
# This script creates a backup of your PostgreSQL database
#
# Usage:
#   ./scripts/backup-database.sh                    # Interactive mode
#   ./scripts/backup-database.sh --auto             # Auto mode (for cron)
#   ./scripts/backup-database.sh --restore FILE     # Restore from backup
#
# Setup automatic daily backups (3 AM):
#   crontab -e
#   0 3 * * * /path/to/echo/scripts/backup-database.sh --auto
#
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
POSTGRES_USER="${POSTGRES_USER:-echo}"
POSTGRES_DB="${POSTGRES_DB:-echo}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
AUTO_MODE=false
RESTORE_MODE=false
RESTORE_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --auto)
      AUTO_MODE=true
      shift
      ;;
    --restore)
      RESTORE_MODE=true
      RESTORE_FILE="$2"
      shift 2
      ;;
    --compose-file)
      COMPOSE_FILE="$2"
      shift 2
      ;;
    --backup-dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --retention-days)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --auto                 Run in automatic mode (no prompts)"
      echo "  --restore FILE         Restore from backup file"
      echo "  --compose-file FILE    Docker compose file (default: docker-compose.simple.yml)"
      echo "  --backup-dir DIR       Backup directory (default: ./backups)"
      echo "  --retention-days N     Keep backups for N days (default: 7)"
      echo "  --help                 Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                       # Create backup (interactive)"
      echo "  $0 --auto                                # Create backup (auto mode)"
      echo "  $0 --restore backups/backup-20240101.sql.gz"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Functions
log_info() {
  if [ "$AUTO_MODE" = false ]; then
    echo -e "${BLUE}ℹ️  $1${NC}"
  fi
}

log_success() {
  if [ "$AUTO_MODE" = false ]; then
    echo -e "${GREEN}✅ $1${NC}"
  else
    echo "✅ $1"
  fi
}

log_error() {
  echo -e "${RED}❌ ERROR: $1${NC}" >&2
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if Docker is running
check_docker() {
  if ! docker info &> /dev/null; then
    log_error "Docker is not running. Please start Docker first."
    exit 1
  fi
}

# Check if containers are running
check_containers() {
  if ! docker compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
    log_error "PostgreSQL container is not running."
    log_info "Start it with: docker compose -f $COMPOSE_FILE up -d"
    exit 1
  fi
}

# Create backup directory
ensure_backup_dir() {
  if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    log_success "Created backup directory: $BACKUP_DIR"
  fi
}

# Backup database
backup_database() {
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="$BACKUP_DIR/echo-db-backup-${timestamp}.sql.gz"

  log_info "Starting database backup..."
  log_info "Compose file: $COMPOSE_FILE"
  log_info "Database: $POSTGRES_DB"
  log_info "Output: $backup_file"
  echo ""

  # Create backup
  if docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --format=plain --no-owner --no-acl | gzip > "$backup_file"; then

    local size=$(du -h "$backup_file" | cut -f1)
    log_success "Backup completed successfully!"
    log_success "File: $backup_file"
    log_success "Size: $size"

    # Clean old backups
    cleanup_old_backups

  else
    log_error "Backup failed!"
    rm -f "$backup_file"
    exit 1
  fi
}

# Restore database
restore_database() {
  if [ ! -f "$RESTORE_FILE" ]; then
    log_error "Backup file not found: $RESTORE_FILE"
    exit 1
  fi

  log_warning "This will OVERWRITE your current database!"
  echo ""

  if [ "$AUTO_MODE" = false ]; then
    read -p "Are you sure you want to restore from $RESTORE_FILE? (yes/NO): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
      echo "Restore cancelled."
      exit 0
    fi
  fi

  log_info "Restoring database from: $RESTORE_FILE"
  echo ""

  # Decompress and restore
  if gunzip -c "$RESTORE_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"; then

    log_success "Database restored successfully!"

  else
    log_error "Restore failed!"
    exit 1
  fi
}

# Clean up old backups
cleanup_old_backups() {
  log_info "Cleaning up backups older than $RETENTION_DAYS days..."

  local count=$(find "$BACKUP_DIR" -name "echo-db-backup-*.sql.gz" -type f -mtime +$RETENTION_DAYS | wc -l)

  if [ "$count" -gt 0 ]; then
    find "$BACKUP_DIR" -name "echo-db-backup-*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    log_success "Deleted $count old backup(s)"
  else
    log_info "No old backups to clean"
  fi

  # List remaining backups
  local remaining=$(find "$BACKUP_DIR" -name "echo-db-backup-*.sql.gz" -type f | wc -l)
  log_info "Total backups: $remaining"
}

# List backups
list_backups() {
  if [ ! -d "$BACKUP_DIR" ]; then
    log_info "No backups directory found."
    return
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Available Backups"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ -z "$(ls -A "$BACKUP_DIR"/echo-db-backup-*.sql.gz 2>/dev/null)" ]; then
    echo "  No backups found"
  else
    ls -lh "$BACKUP_DIR"/echo-db-backup-*.sql.gz | awk '{print "  " $9 " (" $5 ", " $6 " " $7 ")"}'
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# Main
main() {
  if [ "$AUTO_MODE" = false ]; then
    echo -e "${BLUE}"
    echo "═══════════════════════════════════════════════════════"
    echo "  🎵 Echo Music Server - Database Backup"
    echo "═══════════════════════════════════════════════════════"
    echo -e "${NC}"
    echo ""
  fi

  check_docker
  check_containers
  ensure_backup_dir

  if [ "$RESTORE_MODE" = true ]; then
    restore_database
  else
    backup_database

    if [ "$AUTO_MODE" = false ]; then
      list_backups
    fi
  fi

  echo ""
  log_success "Done! 🎵"
}

main
