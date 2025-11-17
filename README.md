# Echo - Music Streaming Platform

Plataforma de streaming de música con NestJS (backend) y React (frontend).

## 🚀 Inicio Rápido

### Requisitos
- Node.js >= 22
- pnpm >= 10
- Docker Desktop (debe estar corriendo)

### Instalación (Primera Vez)

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm quickstart
```

Accede en:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000 (desarrollo) o http://localhost:4567 (producción)
- API Docs: http://localhost:3000/api/docs

**Credenciales por defecto:**
- Usuario: `admin`
- Contraseña: `admin123`

### Si Ya Tienes el Proyecto

```bash
git pull
pnpm install
pnpm docker:dev
pnpm db:migrate
pnpm dev:all
```

### ⚠️ Si Tienes Problemas (Solución Definitiva)

Si encuentras errores de base de datos, conexión o configuración:

```bash
pnpm reset
```

Este script limpiará TODO (Docker, base de datos, configuración) y volverá a inicializar el proyecto desde cero. Es especialmente útil cuando:
- El backend no se conecta a la base de datos
- Ves errores como "database music_user does not exist"
- El frontend no puede conectarse al backend
- Después de hacer cambios en la configuración de Docker

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
pnpm reset            # Reset COMPLETO (Docker + DB + Config) - Solución definitiva
pnpm clean            # Limpiar builds
```

## 🛠️ Stack

**Backend:** NestJS, Prisma, PostgreSQL, Redis, BullMQ, JWT

**Frontend:** React 18, Vite, Tanstack Query, Zustand

## 🔧 Configuración de Puertos

| Servicio | Desarrollo | Producción (Docker) |
|----------|-----------|---------------------|
| Frontend | 5173 | 4567 (integrado con backend) |
| Backend | 3000 | 4567 |
| PostgreSQL | 5432 (expuesto) | 5432 (interno) |
| Redis | 6379 (expuesto) | 6379 (interno) |

**Desarrollo:** Frontend y Backend corren por separado en diferentes puertos.
**Producción:** Un solo contenedor sirve tanto el frontend como el backend en el puerto 4567.

## 🐛 Problemas Comunes

**Error de conexión frontend → backend:**
```bash
# Verifica que el backend esté en puerto 3000 en desarrollo
curl http://localhost:3000/api/health
```

**Error de migración:**
```bash
cd server
pnpm db:reset
```

**No conecta a la BD:**
```bash
# Verifica que Docker esté corriendo
docker ps | grep echo

# Si no hay contenedores, levántalos:
pnpm docker:dev

# Espera 5 segundos y ejecuta migraciones:
sleep 5
cd server && pnpm db:migrate
```

**La base de datos "music_user" no existe:**
```bash
# Este error indica configuración corrupta. Usa el script de reset:
pnpm reset
```

**Empezar desde cero (recomendado si tienes problemas):**
```bash
pnpm reset
```

## 📚 Documentación

- [server/](./server) - Documentación del backend
- [frontend/](./frontend) - Documentación del frontend
- [DOCKER.md](./DOCKER.md) - Deploy en producción

## 📄 Licencia

ISC
