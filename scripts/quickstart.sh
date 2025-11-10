#!/usr/bin/env bash

# ==============================================
# Echo Monorepo - Script de Quickstart Completo
# ==============================================
# Instala TODO y levanta el proyecto completo
# Compatible con: Linux, macOS, Windows (Git Bash)
# Uso: ./scripts/quickstart.sh

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# ==============================================
# 1. Ejecutar Setup Completo
# ==============================================
print_header "ECHO QUICKSTART - Instalación y Arranque Completo"

print_info "Ejecutando instalación completa..."
echo ""

# Ejecutar el script de setup
if [ -f "scripts/setup.sh" ]; then
  bash scripts/setup.sh
else
  print_error "No se encuentra scripts/setup.sh"
  exit 1
fi

echo ""

# ==============================================
# 2. Verificar que todo está instalado
# ==============================================
print_header "Verificando instalación"

# Verificar que Docker esté corriendo
if docker ps | grep -q "echo-postgres-dev"; then
  print_success "PostgreSQL está corriendo"
else
  print_error "PostgreSQL no está corriendo. Ejecuta: pnpm docker:dev"
  exit 1
fi

if docker ps | grep -q "echo-redis-dev"; then
  print_success "Redis está corriendo"
else
  print_error "Redis no está corriendo. Ejecuta: pnpm docker:dev"
  exit 1
fi

# Verificar que las dependencias estén instaladas
if [ -d "server/node_modules" ]; then
  print_success "Dependencias del backend instaladas"
else
  print_error "Dependencias del backend no instaladas"
  exit 1
fi

if [ -d "frontend/node_modules" ]; then
  print_success "Dependencias del frontend instaladas"
else
  print_error "Dependencias del frontend no instaladas"
  exit 1
fi

echo ""

# ==============================================
# 3. Levantar Aplicación Completa
# ==============================================
print_header "Levantando aplicación completa"

print_info "Iniciando backend y frontend en paralelo..."
print_info "Backend: http://localhost:4567"
print_info "Frontend: http://localhost:5173"
echo ""
print_info "Presiona Ctrl+C para detener ambos servicios"
echo ""

# Dar un segundo para que se vea el mensaje
sleep 2

# Ejecutar dev:all (backend + frontend en paralelo)
pnpm dev:all
