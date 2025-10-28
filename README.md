# Echo - Music Streaming Platform

Full-stack music streaming application with hexagonal architecture backend (NestJS) and modern React frontend.

## 📁 Project Structure

```
echo/
├── server/          # Backend - NestJS with Hexagonal Architecture
└── frontend/        # Frontend - React + TypeScript + Vite
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 22
- pnpm >= 10
- Docker & Docker Compose (Docker Desktop para Windows)

### Automated Setup (Recommended)

El proyecto incluye un script de setup que instala todo automáticamente:

```bash
# Clone repository
git clone https://github.com/Alexzafra13/echo.git
cd echo

# Setup automático (Linux/macOS/Git Bash)
pnpm install:first

# Windows (PowerShell nativo)
pnpm install:first:windows
```

El script automáticamente:
- ✅ Verifica requisitos (Node.js, pnpm, Docker)
- ✅ Instala dependencias del backend y frontend
- ✅ Configura variables de entorno (.env)
- ✅ Levanta Docker (PostgreSQL + Redis)
- ✅ Genera cliente Prisma
- ✅ Ejecuta migraciones de Prisma
- ✅ Deja todo listo para trabajar

**Opciones disponibles:**
```bash
pnpm install:first -- --skip-frontend    # Solo backend
pnpm install:first -- --skip-docker      # Sin Docker
pnpm install:first -- --skip-backend     # Solo frontend
```

### Manual Setup

Si prefieres instalarlo manualmente:

```bash
# Backend
cd server
pnpm install
cp .env.development.example .env
docker-compose up -d
pnpm db:migrate
pnpm start:dev

# Frontend (en otra terminal)
cd frontend
pnpm install
pnpm dev
```

### Iniciar Desarrollo

Después del setup, puedes usar estos comandos desde el **ROOT**:

```bash
pnpm dev              # Inicia solo backend
pnpm dev:all          # Inicia backend + frontend en paralelo
pnpm dev:server       # Solo backend
pnpm dev:frontend     # Solo frontend
pnpm docker:dev       # Levantar PostgreSQL + Redis (desarrollo)
pnpm docker:dev:down  # Detener servicios de desarrollo
```

### Access

- **Backend API**: http://localhost:4567/api (Swagger docs)
- **Frontend**: http://localhost:5173

## 🐳 Docker Deployment (Production)

Echo follows the **Jellyfin/Navidrome architecture**: a single container serves both API and frontend, perfect for self-hosting.

### Quick Deploy

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your settings (JWT secrets, music path, etc.)

# 2. Build and run
pnpm docker:build
pnpm docker:up

# 3. Access at http://localhost:4567
```

### Architecture

```
Single Container (echo-app)
├── Frontend (React) - served as static files
├── Backend (NestJS) - API + streaming
├── PostgreSQL - database
└── Redis - cache
```

**Benefits:**
- ✅ Simple deployment - one command
- ✅ Self-contained - everything in one image
- ✅ Automatic migrations on startup
- ✅ Production-ready with health checks
- ✅ Minimal resource usage

**Docker Commands:**
```bash
pnpm docker:build      # Build full-stack image
pnpm docker:up         # Start all services
pnpm docker:down       # Stop all services
pnpm docker:logs       # View application logs
pnpm docker:restart    # Restart the app
```

See [DOCKER.md](./DOCKER.md) for full documentation including:
- Production deployment guide
- Reverse proxy setup (Nginx/Caddy)
- Volume management
- Backup strategies
- Troubleshooting

## 📚 Documentation

### Main
- [DOCKER.md](./DOCKER.md) - **Full-stack Docker deployment** (Jellyfin-style)

### Backend (server/)
- [DEPLOYMENT.md](./server/DEPLOYMENT.md) - Production deployment guide
- [DOCKER.md](./server/DOCKER.md) - Backend-only Docker usage
- [DOCKER_COMPOSE_INFO.md](./server/DOCKER_COMPOSE_INFO.md) - Docker Compose guide
- [ENVIRONMENTS.md](./server/ENVIRONMENTS.md) - Environment configuration

### Frontend (frontend/)
- [README.md](./frontend/README.md) - Frontend documentation

## 🛠️ Tech Stack

### Backend
- **NestJS** - Framework with Hexagonal Architecture
- **Fastify** - High-performance HTTP server
- **Prisma** - ORM with PostgreSQL
- **Redis** - Cache & Queue (BullMQ)
- **JWT** - Authentication
- **Docker** - Containerization

### Frontend
- **React 18** - UI Library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Wouter** - Lightweight routing
- **Zustand** - State management
- **Tanstack Query** - Data fetching & caching
- **React Hook Form + Zod** - Form handling & validation
- **CSS Modules** - Styling with design system
- **Axios** - HTTP client with interceptors

## 🎯 Features

- ✅ **Authentication** - JWT with roles (user/admin)
- ✅ **Music Library** - Albums, Artists, Tracks
- ✅ **Playlists** - Create, edit, manage playlists
- ✅ **Scanner** - Automatic music file scanning with metadata
- ✅ **Streaming** - Audio streaming
- ✅ **Admin Panel** - User management
- ✅ **Cache** - Redis caching layer
- ✅ **Tests** - Unit & E2E tests

## 📦 Scripts

### Root (Monorepo)
```bash
# Setup
pnpm install:first         # Instalación inicial automatizada (Linux/macOS/Git Bash)
pnpm install:first:windows # Setup para Windows PowerShell

# Development
pnpm dev                # Solo backend
pnpm dev:all            # Backend + Frontend en paralelo
pnpm dev:server         # Solo backend
pnpm dev:frontend       # Solo frontend

# Build
pnpm build              # Build frontend + backend (en orden)
pnpm build:server       # Build del backend
pnpm build:frontend     # Build del frontend

# Testing
pnpm test               # Tests del backend
pnpm test:server        # Tests del backend
pnpm test:frontend      # Tests del frontend

# Docker Development (solo DB + Redis)
pnpm docker:dev         # Levantar PostgreSQL + Redis
pnpm docker:dev:down    # Detener servicios

# Docker Production (full-stack)
pnpm docker:build       # Build imagen full-stack
pnpm docker:up          # Levantar todo (app + DB + Redis)
pnpm docker:down        # Detener todo
pnpm docker:logs        # Ver logs de la app
pnpm docker:restart     # Reiniciar la app

# Utilities
pnpm install:all        # Instalar todas las dependencias
pnpm clean              # Limpiar node_modules y builds
pnpm lint:server        # Lint del backend
pnpm lint:frontend      # Lint del frontend
pnpm format:server      # Format del backend
pnpm format:frontend    # Format del frontend
```

### Backend (server/)
```bash
pnpm start:dev          # Development mode
pnpm build              # Build for production
pnpm test               # Run tests
pnpm db:migrate         # Run database migrations
pnpm db:studio          # Open Prisma Studio
```

### Frontend (frontend/)
```bash
pnpm dev                # Development mode
pnpm build              # Build for production
pnpm preview            # Preview production build
```

## 🏗️ Architecture

### Backend (Hexagonal Architecture)
```
server/src/
├── features/              # Feature modules
│   ├── auth/             # Authentication
│   ├── users/            # User management
│   ├── albums/           # Albums
│   ├── artists/          # Artists
│   ├── tracks/           # Tracks
│   ├── playlists/        # Playlists
│   └── scanner/          # Music scanner
├── infrastructure/        # Technical services
└── shared/               # Shared code
```

### Frontend (Feature-based)
```
frontend/src/
├── app/                  # App initialization
├── features/             # Feature modules
│   └── auth/            # Authentication feature
├── shared/              # Shared components
│   ├── components/ui/   # Base UI components
│   └── styles/          # Design system
└── assets/              # Static assets
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

ISC

## 🎵 Happy Coding!
