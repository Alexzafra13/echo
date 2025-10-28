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
pnpm setup

# Windows (PowerShell nativo)
pnpm setup:windows
```

El script automáticamente:
- ✅ Verifica requisitos (Node.js, pnpm, Docker)
- ✅ Instala dependencias del backend y frontend
- ✅ Configura variables de entorno (.env)
- ✅ Levanta Docker (PostgreSQL + Redis)
- ✅ Ejecuta migraciones de Prisma
- ✅ Deja todo listo para trabajar

**Opciones disponibles:**
```bash
pnpm setup --skip-frontend    # Solo backend
pnpm setup --skip-docker       # Sin Docker
pnpm setup --skip-backend      # Solo frontend
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
pnpm dev              # Inicia backend + frontend juntos
pnpm dev:server       # Solo backend
pnpm dev:frontend     # Solo frontend
pnpm docker:up        # Levantar PostgreSQL + Redis
pnpm docker:down      # Detener servicios
```

### Access

- **Backend API**: http://localhost:3000/api (Swagger docs)
- **Frontend**: http://localhost:5173

## 📚 Documentation

### Backend (server/)
- [DEPLOYMENT.md](./server/DEPLOYMENT.md) - Production deployment guide
- [DOCKER.md](./server/DOCKER.md) - Docker usage
- [DOCKER_COMPOSE_INFO.md](./server/DOCKER_COMPOSE_INFO.md) - Docker Compose guide
- [ENVIRONMENTS.md](./server/ENVIRONMENTS.md) - Environment configuration

### Frontend (frontend/)
- [README.md](./frontend/README.md) - Frontend documentation

## 🛠️ Tech Stack

### Backend
- **NestJS** - Framework with Hexagonal Architecture
- **Prisma** - ORM with PostgreSQL
- **Redis** - Cache & Queue (BullMQ)
- **JWT** - Authentication
- **Docker** - Containerization

### Frontend
- **React 18** - UI Library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **React Query** - Data fetching
- **CSS Modules** - Styling

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
pnpm setup              # Instalación inicial automatizada
pnpm setup:windows      # Setup para Windows PowerShell

# Development
pnpm dev                # Backend + Frontend en paralelo
pnpm dev:server         # Solo backend
pnpm dev:frontend       # Solo frontend

# Build
pnpm build              # Build de todo el proyecto
pnpm build:server       # Build del backend
pnpm build:frontend     # Build del frontend

# Testing
pnpm test:server        # Tests del backend
pnpm test:all           # Tests de todo el proyecto

# Docker
pnpm docker:up          # Levantar PostgreSQL + Redis
pnpm docker:down        # Detener servicios

# Utilities
pnpm install:all        # Instalar todas las dependencias
pnpm clean              # Limpiar node_modules y builds
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

## 🐳 Docker

### Development
```bash
# Services only (PostgreSQL + Redis)
cd server
docker-compose up -d

# Full stack
docker-compose -f docker-compose.full.yml up -d
```

### Production
```bash
cd server
docker-compose -f docker-compose.prod.yml up -d
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
