# Echo - Music Streaming Platform

Plataforma de streaming de música con NestJS (backend) y React (frontend).

## 🚀 Inicio Rápido

### Requisitos
- Node.js >= 22
- pnpm >= 10
- Docker Desktop

### Instalación (Primera Vez)

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm quickstart
```

Accede en:
- Frontend: http://localhost:5173
- Backend: http://localhost:4567/api

### Si Ya Tienes el Proyecto

```bash
git pull
pnpm install
pnpm docker:dev
pnpm db:migrate
pnpm dev:all
```

## 📦 Comandos Principales

```bash
# Desarrollo
pnpm dev              # Solo backend
pnpm dev:all          # Backend + Frontend

# Build
pnpm build            # Frontend + Backend

# Docker (PostgreSQL + Redis)
pnpm docker:dev       # Levantar servicios
pnpm docker:dev:down  # Detener servicios

# Base de Datos
pnpm db:migrate       # Aplicar migraciones
pnpm db:reset         # Reset completo (drop + migrate + seed)
pnpm db:generate      # Generar Prisma Client

# Producción
pnpm docker:build     # Build imagen full-stack
pnpm docker:up        # Deploy
pnpm docker:down      # Detener

# Utilidades
pnpm clean            # Limpiar builds
```

## 🛠️ Stack

**Backend:** NestJS, Prisma, PostgreSQL, Redis, BullMQ, JWT

**Frontend:** React 18, Vite, Tanstack Query, Zustand

## 🐛 Problemas Comunes

**Error de migración:**
```bash
pnpm db:reset
```

**No conecta a la BD:**
```bash
pnpm docker:dev:down
pnpm docker:dev
sleep 5
pnpm db:migrate
```

**Empezar desde cero:**
```bash
pnpm clean
pnpm install
pnpm docker:dev
pnpm db:reset
pnpm dev:all
```

## 📚 Documentación

- [server/](./server) - Documentación del backend
- [frontend/](./frontend) - Documentación del frontend
- [DOCKER.md](./DOCKER.md) - Deploy en producción

## 📄 Licencia

ISC
