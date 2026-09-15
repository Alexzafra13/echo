# Echo Server

Backend API para Echo Music Server.

## Comandos

```bash
pnpm dev               # Desarrollo (hot-reload)
pnpm build             # Build
pnpm start             # Ejecutar
pnpm lint              # ESLint (con --fix)
pnpm setup:env         # Genera .env (lo hace pnpm quickstart)
pnpm db:generate       # Genera una migración a partir del schema
pnpm db:migrate        # Migraciones
pnpm db:push           # Sincroniza el schema sin migración (solo dev)
pnpm db:reset          # Reset BD
pnpm db:studio         # Drizzle Studio
pnpm test              # Tests
pnpm test:unit         # Tests unitarios
pnpm test:integration  # Tests de integración (necesita BD y Redis)
pnpm test:e2e          # Tests E2E de la API
pnpm test:all          # unit + integration + e2e
pnpm test:watch        # Tests en modo watch
pnpm test:cov          # Tests con cobertura
pnpm swagger:generate  # Regenera swagger.json en la raíz del repo
```

## Estructura

```
src/
├── features/       # Módulos (auth, albums, artists, tracks, scanner...)
├── shared/         # Utilidades compartidas
└── infrastructure/ # DB, Cache, Queue
```

## API

Swagger: http://localhost:3000/api/docs

## Configuración

Ver `.env.example`
