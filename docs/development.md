# Development

## Requirements

- Node.js >= 22
- pnpm >= 10
- Docker

## Initial Setup

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm quickstart
```

The script:
1. Verifies Node.js >= 22, pnpm, Docker
2. Installs dependencies
3. Starts PostgreSQL + Redis
4. Generates `api/.env` with JWT secrets
5. Runs database migrations

## Running

```bash
pnpm dev:all    # Frontend (5173) + Backend (3000)
```

## Commands

### Monorepo (root)

| Command | Description |
|---------|-------------|
| `pnpm quickstart` | Full initial setup |
| `pnpm dev:all` | Frontend + Backend |
| `pnpm dev` | Backend only |
| `pnpm build` | Production build |
| `pnpm docker:dev` | Start DB + Redis |
| `pnpm docker:dev:down` | Stop DB + Redis |
| `pnpm db:reset` | Reset database |
| `pnpm db:migrate` | Run migrations |
| `pnpm clean` | Remove node_modules |

### Backend (api/)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev with hot-reload |
| `pnpm build` | Production build |
| `pnpm start` | Run build |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:push` | Sync schema |
| `pnpm test` | Run tests |
| `pnpm lint` | Linter |

### Frontend (web/)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev with hot-reload |
| `pnpm build` | Production build |
| `pnpm preview` | Preview build |
| `pnpm test` | Run tests |
| `pnpm lint` | Linter |

## Development URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |
| Drizzle Studio | `pnpm db:studio` |

## Project Structure

```
echo/
├── web/                      # React + Vite
│   └── src/
│       ├── app/              # Routing and providers
│       ├── features/         # Feature modules
│       └── shared/           # Shared components and utils
├── api/                      # NestJS + Fastify
│   └── src/
│       ├── features/         # Feature modules
│       ├── infrastructure/   # DB, cache, websocket
│       └── shared/           # Guards, decorators, utils
├── nginx/                    # Production proxy config
├── docs/                     # Documentation
├── docker-compose.yml        # Production
└── docker-compose.dev.yml    # DB/Redis for development
```

## Tech Stack

### Backend
- **Framework:** NestJS + Fastify
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Auth:** JWT (access + refresh tokens)
- **Validation:** class-validator
- **Docs:** Swagger/OpenAPI

### Frontend
- **Framework:** React 18
- **Build:** Vite
- **State:** Zustand
- **Data fetching:** TanStack Query
- **Routing:** Wouter
- **WebSocket:** Socket.io

## Local Production Build

```bash
pnpm docker:build   # Build image
pnpm docker:up      # Run
pnpm docker:logs    # View logs
pnpm docker:down    # Stop
```

Available at http://localhost:4567

## Tests

```bash
# Backend
cd api && pnpm test
pnpm test:cov       # With coverage

# Frontend
cd web && pnpm test
pnpm test:ui        # With UI
```

## Database Migrations

```bash
# Generate migration after schema changes
cd api
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Direct push (development only)
pnpm db:push
```
