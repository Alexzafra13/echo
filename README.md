# Echo - Music Streaming Platform

Plataforma de streaming de música full-stack con arquitectura hexagonal (NestJS) y frontend moderno (React).

## 📁 Estructura

```
echo/
├── server/          # Backend - NestJS con Arquitectura Hexagonal
├── frontend/        # Frontend - React + TypeScript + Vite
└── scripts/         # Scripts de automatización
```

## 🚀 Inicio Rápido

### Requisitos
- Node.js >= 22
- pnpm >= 10
- Docker & Docker Compose

### Un Solo Comando (Instalar + Levantar)

```bash
# Linux/macOS/Git Bash
pnpm quickstart

# Windows PowerShell
pnpm quickstart:windows
```

Este comando instala dependencias, configura el entorno, levanta Docker (PostgreSQL + Redis), ejecuta migraciones y arranca backend + frontend automáticamente.

**Acceso:**
- Backend: http://localhost:4567/api
- Frontend: http://localhost:5173
- API Docs: http://localhost:4567/api/docs

### Instalación Manual

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo

# Setup automático
pnpm install:first            # Linux/macOS/Git Bash
pnpm install:first:windows    # Windows PowerShell

# Levantar servicios
pnpm dev:all                  # Backend + Frontend
```

## 📦 Comandos Principales

### Desarrollo
```bash
pnpm dev                # Backend
pnpm dev:all            # Backend + Frontend en paralelo
pnpm dev:server         # Solo backend
pnpm dev:frontend       # Solo frontend
```

### Build
```bash
pnpm build              # Frontend + Backend (en orden)
pnpm build:server       # Solo backend
pnpm build:frontend     # Solo frontend
```

### Base de Datos
```bash
pnpm db:migrate         # Ejecutar migraciones
pnpm db:seed            # Poblar BD con datos de prueba
pnpm db:reset           # Reset completo (drop + migrate + seed)
pnpm db:studio          # Abrir Prisma Studio
```

### Docker Desarrollo (Solo PostgreSQL + Redis)
```bash
pnpm docker:dev         # Levantar servicios
pnpm docker:dev:down    # Detener servicios
pnpm docker:dev:logs    # Ver logs
```

### Docker Producción (Full-stack)
```bash
pnpm docker:build       # Build imagen full-stack
pnpm docker:up          # Levantar todo (app + DB + Redis)
pnpm docker:down        # Detener todo
pnpm docker:logs        # Ver logs de la app
pnpm docker:restart     # Reiniciar app
pnpm docker:health      # Verificar salud de servicios
```

### Deploy
```bash
pnpm deploy:build       # Build optimizado para producción
pnpm deploy:push        # Push imagen a registry
pnpm deploy:prod        # Build + Push + Deploy
```

### Testing
```bash
pnpm test               # Tests del backend
pnpm test:server        # Tests del backend
pnpm test:frontend      # Tests del frontend
pnpm test:e2e           # Tests E2E del backend
pnpm test:cov           # Tests con coverage
```

### Utilidades
```bash
pnpm clean              # Limpiar node_modules y builds
pnpm lint               # Lint todo el proyecto
pnpm format             # Format todo el proyecto
pnpm logs:server        # Ver logs del servidor
pnpm logs:db            # Ver logs de PostgreSQL
pnpm logs:redis         # Ver logs de Redis
```

## 🐳 Deploy en Producción

Echo usa arquitectura **Jellyfin/Navidrome**: un solo contenedor sirve API + frontend.

```bash
# 1. Configurar entorno
cp .env.example .env
# Edita .env con tus configuraciones

# 2. Build y deploy
pnpm deploy:prod

# 3. Accede en http://tu-servidor:4567
```

**Características:**
- ✅ Contenedor único auto-contenido
- ✅ Migraciones automáticas en startup
- ✅ Health checks integrados
- ✅ Mínimo uso de recursos

Ver [DOCKER.md](./DOCKER.md) para documentación completa.

## 🛠️ Stack Tecnológico

**Backend:** NestJS, Fastify, Prisma, PostgreSQL, Redis, BullMQ, JWT, Pino

**Frontend:** React 18, TypeScript, Vite, Tanstack Query, Zustand, React Hook Form, Zod

## 🎯 Características

- ✅ Autenticación JWT con roles (user/admin)
- ✅ Biblioteca de música (Álbumes, Artistas, Tracks)
- ✅ Playlists personalizables
- ✅ Scanner automático de archivos con metadata
- ✅ Enriquecimiento externo (Last.fm, Fanart.tv, Cover Art Archive)
- ✅ Streaming de audio con soporte Range requests
- ✅ Daily Wave Mix (regeneración automática diaria)
- ✅ Cache Redis en múltiples capas
- ✅ Panel de administración
- ✅ WebSocket para progreso en tiempo real
- ✅ Tests unitarios y E2E

## 📚 Documentación Detallada

- [DOCKER.md](./DOCKER.md) - Deploy full-stack (Jellyfin-style)
- [server/DEPLOYMENT.md](./server/DEPLOYMENT.md) - Guía de producción
- [server/ENVIRONMENTS.md](./server/ENVIRONMENTS.md) - Configuración de entorno
- [server/DOCKER_COMPOSE_INFO.md](./server/DOCKER_COMPOSE_INFO.md) - Docker Compose
- [frontend/README.md](./frontend/README.md) - Frontend

## 🌐 Metadata Externa (Opcional)

Echo puede enriquecer tu biblioteca con metadata de servicios externos:

**Servicios Soportados:**
- **Cover Art Archive** - Portadas de álbumes (sin API key)
- **Last.fm** - Biografías de artistas (API key gratuita)
- **Fanart.tv** - Fondos HD, banners, logos (API key gratuita)

**Setup (5 minutos):**

```bash
cd server
cp .env.example .env

# Obtener API keys (gratis):
# - Last.fm: https://www.last.fm/api/account/create
# - Fanart.tv: https://fanart.tv/get-an-api-key/

# Añadir a .env:
LASTFM_API_KEY=tu_key_aqui
LASTFM_ENABLED=true
FANART_API_KEY=tu_key_aqui
FANART_ENABLED=true
COVERART_ENABLED=true
```

Ver [server/src/features/external-metadata/README.md](./server/src/features/external-metadata/README.md) para documentación completa.

## 🐛 Troubleshooting

**"Frontend not found" en consola del backend:**
- Normal en desarrollo. Frontend se sirve desde Vite (localhost:5173), backend desde localhost:4567

**Error de conexión a DB:**
```bash
pnpm docker:dev:down && pnpm docker:dev
cd server && pnpm db:migrate
```

**Errores de Prisma Client:**
```bash
cd server && pnpm db:generate
pnpm build
```

**Limpiar todo y empezar de nuevo:**
```bash
pnpm clean
pnpm install:all
pnpm docker:dev
cd server && pnpm db:migrate && pnpm db:seed
pnpm dev:all
```

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

ISC

---

**¿Necesitas más ayuda?** Revisa la documentación en `/server` y `/frontend` o abre un issue.
