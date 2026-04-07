# Echo Server

Backend API para Echo Music Server.

## Comandos

```bash
pnpm dev          # Desarrollo
pnpm build        # Build
pnpm start        # Ejecutar
pnpm db:reset     # Reset BD
pnpm db:migrate   # Migraciones
pnpm db:studio    # Drizzle Studio
pnpm test         # Tests
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
