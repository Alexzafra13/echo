#!/usr/bin/env bash

# ==============================================
# Echo Monorepo - Script de Instalación Inicial
# ==============================================
# Compatible con: Linux, macOS, Windows (Git Bash)
# Uso: ./scripts/setup.sh [--skip-docker] [--skip-frontend] [--skip-backend]

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
SKIP_DOCKER=false
SKIP_FRONTEND=false
SKIP_BACKEND=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-docker)
      SKIP_DOCKER=true
      shift
      ;;
    --skip-frontend)
      SKIP_FRONTEND=true
      shift
      ;;
    --skip-backend)
      SKIP_BACKEND=true
      shift
      ;;
    --help)
      echo "Uso: pnpm install:first [opciones]"
      echo ""
      echo "Opciones:"
      echo "  --skip-docker     No levantar Docker"
      echo "  --skip-frontend   No instalar frontend"
      echo "  --skip-backend    No instalar backend"
      echo "  --help            Mostrar esta ayuda"
      exit 0
      ;;
    *)
      echo "Opción desconocida: $1"
      echo "Usa --help para ver las opciones disponibles"
      exit 1
      ;;
  esac
done

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

check_command() {
  if command -v $1 &> /dev/null; then
    print_success "$1 está instalado"
    return 0
  else
    print_error "$1 NO está instalado"
    return 1
  fi
}

# Start
print_header "ECHO MONOREPO - Instalación Inicial"

# ==============================================
# 1. Verificar Requisitos
# ==============================================
print_header "1. Verificando Requisitos"

HAS_ERROR=false

# Node.js
if check_command node; then
  NODE_VERSION=$(node -v)
  print_info "Versión: $NODE_VERSION"

  # Verificar versión mínima (Node >= 22)
  MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$MAJOR_VERSION" -lt 22 ]; then
    print_warning "Se requiere Node.js >= 22. Tienes: $NODE_VERSION"
    HAS_ERROR=true
  fi
else
  HAS_ERROR=true
  print_error "Instala Node.js >= 22 desde: https://nodejs.org"
fi

# pnpm
if check_command pnpm; then
  PNPM_VERSION=$(pnpm -v)
  print_info "Versión: $PNPM_VERSION"
else
  HAS_ERROR=true
  print_error "Instala pnpm con: npm install -g pnpm"
fi

# Docker (solo si no se skipea)
if [ "$SKIP_DOCKER" = false ]; then
  if check_command docker; then
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | tr -d ',')
    print_info "Versión: $DOCKER_VERSION"

    # Verificar que Docker esté corriendo
    if docker ps &> /dev/null; then
      print_success "Docker está corriendo"
    else
      print_warning "Docker NO está corriendo. Inícialo antes de continuar."
      HAS_ERROR=true
    fi
  else
    HAS_ERROR=true
    print_error "Instala Docker desde: https://docker.com"
  fi
fi

if [ "$HAS_ERROR" = true ]; then
  print_error "Faltan requisitos. Instálalos y vuelve a ejecutar el script."
  exit 1
fi

echo ""

# ==============================================
# 2. Instalar Dependencias del Backend
# ==============================================
if [ "$SKIP_BACKEND" = false ]; then
  print_header "2. Instalando Dependencias del Backend"

  if [ -d "server" ] && [ -f "server/package.json" ]; then
    print_info "Navegando a: server/"
    cd server

    print_info "Ejecutando: pnpm install"
    pnpm install
    print_success "Dependencias del backend instaladas"

    cd ..
  else
    print_error "No se encuentra la carpeta server/ o package.json"
    exit 1
  fi
else
  print_info "Skipping backend installation (--skip-backend)"
fi

echo ""

# ==============================================
# 3. Configurar Variables de Entorno (Backend)
# ==============================================
if [ "$SKIP_BACKEND" = false ]; then
  print_header "3. Configurando Variables de Entorno (Backend)"

  cd server

  if [ ! -f ".env" ]; then
    if [ -f ".env.development.example" ]; then
      print_info "Copiando .env.development.example a .env"
      cp .env.development.example .env
      print_success "Archivo .env creado"
      print_warning "IMPORTANTE: Revisa el archivo server/.env y ajusta si es necesario"
    else
      print_error "No se encuentra server/.env.development.example"
      cd ..
      exit 1
    fi
  else
    print_info "server/.env ya existe, no se sobrescribe"

    # Verificar que tenga localhost
    if grep -q "localhost:5432" .env; then
      print_success ".env configurado correctamente (usa localhost)"
    elif grep -q "postgres:5432" .env; then
      print_warning ".env usa 'postgres' como host. Para desarrollo local, cambia a 'localhost'"
      print_info "Línea correcta: DATABASE_URL=postgresql://...@localhost:5432/..."
    fi
  fi

  cd ..
fi

echo ""

# ==============================================
# 4. Levantar Docker (PostgreSQL + Redis)
# ==============================================
if [ "$SKIP_DOCKER" = false ] && [ "$SKIP_BACKEND" = false ]; then
  print_header "4. Levantando Servicios Docker"

  cd server

  print_info "Ejecutando: docker-compose up -d"

  if docker-compose up -d; then
    print_success "Servicios Docker levantados"

    # Esperar a que PostgreSQL esté listo
    print_info "Esperando a que PostgreSQL esté listo..."
    sleep 5

    # Verificar que los contenedores estén corriendo
    if docker ps | grep -q "echo-postgres-dev"; then
      print_success "PostgreSQL está corriendo"
    else
      print_error "PostgreSQL no está corriendo"
      cd ..
      exit 1
    fi

    if docker ps | grep -q "echo-redis-dev"; then
      print_success "Redis está corriendo"
    else
      print_error "Redis no está corriendo"
      cd ..
      exit 1
    fi
  else
    print_error "Error al levantar Docker"
    cd ..
    exit 1
  fi

  cd ..
else
  if [ "$SKIP_DOCKER" = true ]; then
    print_info "Skipping Docker (--skip-docker)"
  fi
fi

echo ""

# ==============================================
# 5. Generar Cliente Prisma
# ==============================================
if [ "$SKIP_BACKEND" = false ]; then
  print_header "5. Generando Cliente Prisma"

  cd server

  print_info "Ejecutando: pnpm db:generate"
  if pnpm db:generate; then
    print_success "Cliente Prisma generado"
  else
    print_error "Error al generar cliente Prisma"
    cd ..
    exit 1
  fi

  cd ..
else
  print_info "Skipping Prisma generation (--skip-backend)"
fi

echo ""

# ==============================================
# 6. Ejecutar Migraciones
# ==============================================
if [ "$SKIP_BACKEND" = false ] && [ "$SKIP_DOCKER" = false ]; then
  print_header "6. Ejecutando Migraciones de Base de Datos"

  cd server

  print_info "Ejecutando: pnpm db:migrate"

  # Dar un poco más de tiempo para que PostgreSQL esté 100% listo
  sleep 2

  if pnpm db:migrate; then
    print_success "Migraciones ejecutadas correctamente"
  else
    print_error "Error al ejecutar migraciones"
    print_info "Posible solución: Verifica que Docker esté corriendo y que .env tenga 'localhost'"
    cd ..
    exit 1
  fi

  cd ..
else
  print_info "Skipping migrations"
fi

echo ""

# ==============================================
# 7. Ejecutar Seed (Crear Usuario Admin)
# ==============================================
if [ "$SKIP_BACKEND" = false ] && [ "$SKIP_DOCKER" = false ]; then
  print_header "7. Ejecutando Seed de Base de Datos"

  cd server

  print_info "Ejecutando: pnpm db:seed"

  if pnpm db:seed; then
    print_success "Seed ejecutado correctamente"
    print_info "Usuario admin creado: admin / admin123"
  else
    print_warning "El seed falló o el usuario ya existe"
  fi

  cd ..
else
  print_info "Skipping seed"
fi

echo ""

# ==============================================
# 8. Instalar Frontend
# ==============================================
if [ "$SKIP_FRONTEND" = false ]; then
  print_header "7. Instalando Dependencias del Frontend"

  if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    print_info "Navegando a: frontend/"
    cd frontend

    print_info "Ejecutando: pnpm install"
    pnpm install
    print_success "Dependencias del frontend instaladas"

    cd ..
  else
    print_warning "No se encuentra la carpeta frontend/ o package.json"
  fi
else
  print_info "Skipping frontend installation (--skip-frontend)"
fi

echo ""

# ==============================================
# Finalización
# ==============================================
print_header "✓ Instalación Completada"

echo -e "${GREEN}"
echo "¡Todo listo! Ahora puedes:"
echo ""
echo "  Comandos desde el ROOT:"
echo "    pnpm dev                 # Inicia solo backend"
echo "    pnpm dev:all             # Inicia backend + frontend en paralelo"
echo "    pnpm dev:server          # Solo servidor de desarrollo"
echo "    pnpm dev:frontend        # Solo frontend"
echo "    pnpm build               # Build frontend + backend"
echo "    pnpm test                # Tests del backend"
echo ""
echo "  Backend (desde /server):"
echo "    cd server"
echo "    pnpm dev                 # Servidor en http://localhost:4567"
echo "    pnpm test                # Tests"
echo "    pnpm db:studio           # Prisma Studio"
echo ""

if [ "$SKIP_FRONTEND" = false ]; then
  echo "  Frontend (desde /frontend):"
  echo "    cd frontend"
  echo "    pnpm dev                 # Frontend en http://localhost:5173"
  echo ""
fi

echo "  Docker (Desarrollo):"
echo "    pnpm docker:dev          # Levantar PostgreSQL + Redis"
echo "    pnpm docker:dev:down     # Detener servicios"
echo ""
echo "  Docker (Producción - Full Stack):"
echo "    pnpm docker:build        # Build imagen completa"
echo "    pnpm docker:up           # Levantar todo"
echo "    pnpm docker:down         # Detener todo"
echo ""
echo "  Documentación:"
echo "    README.md                # Guía general del monorepo"
echo "    DOCKER.md                # Despliegue Docker full-stack"
echo "    server/DOCKER_COMPOSE_INFO.md  # Guía de Docker del server"
echo -e "${NC}"

print_info "Backend API: http://localhost:4567/api"

if [ "$SKIP_FRONTEND" = false ]; then
  print_info "Frontend Dev: http://localhost:5173"
fi

echo ""
print_success "¡Happy coding! 🎵"
