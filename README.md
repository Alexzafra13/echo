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
- Node.js >= 18
- pnpm >= 10
- Docker & Docker Compose

### Installation

```bash
# Clone repository
git clone https://github.com/Alexzafra13/echo.git
cd echo

# Backend setup
cd server
pnpm install
cp .env.development.example .env
docker-compose up -d
pnpm db:migrate
pnpm start:dev

# Frontend setup (in another terminal)
cd frontend
pnpm install
pnpm dev
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

### Backend (server/)
```bash
pnpm start:dev        # Development mode
pnpm build           # Build for production
pnpm test            # Run tests
pnpm db:migrate      # Run database migrations
pnpm db:studio       # Open Prisma Studio
docker-compose up -d # Start services
```

### Frontend (frontend/)
```bash
pnpm dev             # Development mode
pnpm build           # Build for production
pnpm preview         # Preview production build
pnpm test            # Run tests
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
