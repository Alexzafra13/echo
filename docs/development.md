# Development

## Requirements

- Node.js >= 22
- pnpm >= 10
- Docker (for PostgreSQL + Redis)

## Initial Setup

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm quickstart
```

`quickstart` verifies prerequisites, installs dependencies, starts PostgreSQL + Redis via Docker, generates `api/.env` with JWT secrets, and runs database migrations.

## Running

```bash
pnpm dev:all    # Frontend (5173) + Backend (3000)
```

After the first scan, your music library is available at http://localhost:5173.

API docs (Swagger): http://localhost:3000/api/docs

## Commands

### Monorepo (root)

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `pnpm quickstart`      | Full initial setup                   |
| `pnpm dev:all`         | Frontend + Backend concurrently      |
| `pnpm dev`             | Backend only                         |
| `pnpm build`           | Production build (web + api)         |
| `pnpm docker:dev`      | Start PostgreSQL + Redis             |
| `pnpm docker:dev:down` | Stop PostgreSQL + Redis              |
| `pnpm db:migrate`      | Run database migrations              |
| `pnpm db:reset`        | Reset database (destroys data)       |
| `pnpm clean`           | Remove all `node_modules` and `dist` |

### Backend (`api/`)

| Command                 | Description                            |
| ----------------------- | -------------------------------------- |
| `pnpm dev`              | Dev server with hot-reload             |
| `pnpm build`            | Production build                       |
| `pnpm test`             | Run all tests                          |
| `pnpm test:unit`        | Unit tests only                        |
| `pnpm test:integration` | Integration tests (needs DB)           |
| `pnpm test:e2e`         | End-to-end tests                       |
| `pnpm test:cov`         | Tests with coverage report             |
| `pnpm lint`             | ESLint                                 |
| `pnpm db:generate`      | Generate migration from schema changes |
| `pnpm db:migrate`       | Apply pending migrations               |
| `pnpm db:push`          | Sync schema directly (dev only)        |
| `pnpm db:studio`        | Open Drizzle Studio (DB browser)       |

### Frontend (`web/`)

| Command         | Description                |
| --------------- | -------------------------- |
| `pnpm dev`      | Dev server with hot-reload |
| `pnpm build`    | Production build           |
| `pnpm preview`  | Preview production build   |
| `pnpm test`     | Run tests (Vitest)         |
| `pnpm test:ui`  | Tests with browser UI      |
| `pnpm test:cov` | Tests with coverage        |
| `pnpm lint`     | ESLint                     |

## Database Migrations

After modifying any file in `api/src/infrastructure/database/schema/`:

```bash
cd api
pnpm db:generate    # Creates a new migration file in drizzle/
pnpm db:migrate     # Applies it to the database
```

Use `pnpm db:push` during development to sync schema without creating migration files. Use `pnpm db:generate` + `pnpm db:migrate` for changes that will be committed.

## Local Production Build

Test the Docker image locally:

```bash
pnpm docker:build   # Build multi-stage image
pnpm docker:up      # Run at http://localhost:4567
pnpm docker:logs    # View logs
pnpm docker:down    # Stop
```

## Dev Workflow

1. Create a feature branch
2. Run `pnpm dev:all`
3. Backend changes hot-reload automatically; frontend uses Vite HMR
4. Run tests before committing: `cd api && pnpm test && cd ../web && pnpm test`
5. Migrations: modify schema → `pnpm db:generate` → `pnpm db:migrate`
6. Open a Pull Request — CI runs lint, tests, and Docker build
