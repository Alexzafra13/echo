#!/usr/bin/env bash

# ==============================================
# Echo - Script para Resetear Base de Datos
# ==============================================
# Uso: ./scripts/reset-db.sh

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo -e "${BLUE}"
  echo "=================================================="
  echo "  $1"
  echo "=================================================="
  echo -e "${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

print_header "RESETEAR BASE DE DATOS"

print_warning "Esto eliminará TODOS los datos de la base de datos"
read -p "¿Estás seguro? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  print_info "Operación cancelada"
  exit 0
fi

cd server

print_info "Reseteando base de datos con Prisma..."
pnpm prisma migrate reset --force

print_success "Base de datos reseteada"
print_info "Usuario admin creado: admin / admin123"

cd ..

echo ""
print_success "¡Listo! Base de datos limpia y migrada"
