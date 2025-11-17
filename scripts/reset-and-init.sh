#!/usr/bin/env bash

# ==============================================
# Echo Monorepo - Reset e Inicialización Completa
# ==============================================
# Este script limpia TODO y vuelve a inicializar el proyecto
# Úsalo cuando tengas problemas de configuración o base de datos
#
# Uso: bash scripts/reset-and-init.sh

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

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Detect docker compose command
get_docker_compose_cmd() {
  if docker compose version &> /dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose &> /dev/null; then
    echo "docker-compose"
  else
    echo ""
  fi
}

DOCKER_COMPOSE_CMD=$(get_docker_compose_cmd)

# Start
print_header "ECHO - RESET E INICIALIZACIÓN COMPLETA"

print_warning "Este script va a:"
echo "  1. Parar y eliminar todos los contenedores Docker de Echo"
echo "  2. Eliminar volúmenes de Docker (base de datos será recreada)"
echo "  3. Verificar configuración (.env)"
echo "  4. Levantar servicios Docker"
echo "  5. Ejecutar migraciones de base de datos"
echo "  6. Ejecutar seed (crear usuario admin)"
echo ""
read -p "¿Continuar? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  print_info "Operación cancelada"
  exit 0
fi

echo ""

# ==============================================
# 1. Limpiar Docker
# ==============================================
print_header "1. Limpiando contenedores Docker existentes"

cd server

if [ -z "$DOCKER_COMPOSE_CMD" ]; then
  print_error "Docker Compose no está disponible"
  print_info "Instala Docker y Docker Compose antes de continuar"
  exit 1
fi

print_info "Deteniendo contenedores..."
$DOCKER_COMPOSE_CMD -f docker-compose.yml down -v 2>/dev/null || print_warning "No hay contenedores corriendo"

# Intentar también con el docker-compose.dev.yml del root
cd ..
print_info "Limpiando docker-compose.dev.yml..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml down -v 2>/dev/null || print_warning "No hay contenedores dev corriendo"

print_success "Contenedores y volúmenes eliminados"

echo ""

# ==============================================
# 2. Verificar archivo .env
# ==============================================
print_header "2. Verificando configuración (.env)"

cd server

if [ ! -f ".env" ]; then
  print_warning "No existe .env, generando con valores seguros automáticamente..."

  if node scripts/generate-env.js; then
    print_success "Archivo .env generado con secrets seguros"
    print_info "JWT secrets y configuración creados automáticamente"
  else
    print_error "Error al generar .env automáticamente"
    print_warning "Intentando método alternativo..."

    # Fallback: copiar desde example
    if [ -f ".env.development.example" ]; then
      cp .env.development.example .env
      print_warning "Se copió .env.development.example (menos seguro)"
    else
      print_error "No se pudo crear .env"
      exit 1
    fi
  fi
else
  print_success ".env ya existe"
fi

# Verificar que tenga la configuración correcta
if grep -q "music_user:music_password@localhost:5432/music_db" .env; then
  print_success "Configuración de base de datos correcta"
else
  print_warning "La configuración de .env puede no coincidir con docker-compose.dev.yml"
  print_info "Esperado: postgresql://music_user:music_password@localhost:5432/music_db"
fi

cd ..

echo ""

# ==============================================
# 3. Levantar Docker
# ==============================================
print_header "3. Levantando servicios Docker (PostgreSQL + Redis)"

print_info "Ejecutando: $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml up -d"

if $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml up -d; then
  print_success "Servicios Docker levantados"

  print_info "Esperando a que PostgreSQL esté listo (10 segundos)..."
  sleep 10

  # Verificar que PostgreSQL esté corriendo
  if docker ps | grep -q "echo-postgres-dev"; then
    print_success "PostgreSQL está corriendo"
  else
    print_error "PostgreSQL no está corriendo"
    print_info "Verifica con: docker ps"
    exit 1
  fi

  # Verificar que Redis esté corriendo
  if docker ps | grep -q "echo-redis-dev"; then
    print_success "Redis está corriendo"
  else
    print_error "Redis no está corriendo"
    print_info "Verifica con: docker ps"
    exit 1
  fi
else
  print_error "Error al levantar Docker"
  exit 1
fi

echo ""

# ==============================================
# 4. Instalar dependencias (si es necesario)
# ==============================================
print_header "4. Verificando dependencias"

cd server

if [ ! -d "node_modules" ] || [ ! -d "node_modules/.prisma" ]; then
  print_warning "node_modules no existe o Prisma no está generado"
  print_info "Ejecutando: pnpm install"
  pnpm install
  print_success "Dependencias instaladas"
else
  print_success "Dependencias ya instaladas"
fi

echo ""

# ==============================================
# 5. Generar cliente Prisma
# ==============================================
print_header "5. Generando cliente Prisma"

print_info "Ejecutando: pnpm db:generate"
if pnpm db:generate; then
  print_success "Cliente Prisma generado"
else
  print_error "Error al generar cliente Prisma"
  exit 1
fi

echo ""

# ==============================================
# 6. Ejecutar migraciones
# ==============================================
print_header "6. Ejecutando migraciones de base de datos"

print_info "Esperando 2 segundos adicionales para que PostgreSQL esté 100% listo..."
sleep 2

print_info "Ejecutando: pnpm prisma migrate reset --force"
print_warning "Esto recreará la base de datos desde cero"

if pnpm prisma migrate reset --force; then
  print_success "Base de datos migrada correctamente"
  print_info "Usuario admin creado automáticamente por el seed"
else
  print_error "Error al ejecutar migraciones"
  print_info "Intentando con migrate deploy..."

  if pnpm prisma migrate deploy; then
    print_success "Migraciones aplicadas con deploy"

    # Ejecutar seed manualmente
    print_info "Ejecutando seed manualmente..."
    if pnpm db:seed; then
      print_success "Seed ejecutado correctamente"
    else
      print_warning "El seed falló, pero las migraciones están OK"
    fi
  else
    print_error "No se pudieron aplicar las migraciones"
    print_info "Verifica que PostgreSQL esté corriendo: docker ps"
    print_info "Verifica la configuración en .env"
    exit 1
  fi
fi

cd ..

echo ""

# ==============================================
# Finalización
# ==============================================
print_header "✅ Reset e Inicialización Completados"

echo -e "${GREEN}"
echo "¡Todo listo! Tu proyecto está limpio y configurado."
echo ""
echo "Credenciales del usuario admin:"
echo "  Username: admin"
echo "  Password: admin123"
echo "  (Deberás cambiar la contraseña en el primer login)"
echo ""
echo "Comandos disponibles:"
echo ""
echo "  Desarrollo (recomendado):"
echo "    pnpm dev:all             # Backend + Frontend en paralelo"
echo "    pnpm dev                 # Solo backend"
echo ""
echo "  URLs:"
echo "    Backend:  http://localhost:3000"
echo "    API Docs: http://localhost:3000/api/docs"
echo "    Frontend: http://localhost:5173"
echo ""
echo "  Gestión Docker:"
echo "    pnpm docker:dev          # Levantar PostgreSQL + Redis"
echo "    pnpm docker:dev:down     # Detener servicios"
echo "    docker ps                # Ver contenedores corriendo"
echo ""
echo "  Base de datos:"
echo "    cd server && pnpm db:studio    # Abrir Prisma Studio"
echo "    cd server && pnpm db:seed      # Re-ejecutar seed"
echo -e "${NC}"

print_success "¡Happy coding! 🎵"
