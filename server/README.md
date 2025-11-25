# Echo Server (Backend)

API REST + WebSocket para Echo Music Server.

## Stack

- NestJS 10
- Prisma (PostgreSQL)
- Redis + BullMQ
- Socket.io

## Estructura

```
src/
├── features/          # Módulos por funcionalidad
│   ├── auth/         # Autenticación JWT
│   ├── users/        # Gestión usuarios
│   ├── albums/       # Álbumes
│   ├── artists/      # Artistas
│   ├── tracks/       # Canciones
│   ├── playlists/    # Playlists
│   ├── scanner/      # Escaneo biblioteca
│   ├── streaming/    # Streaming audio
│   ├── admin/        # Panel administración
│   └── setup/        # Setup wizard
├── shared/           # Utilidades compartidas
└── infrastructure/   # DB, Cache, Queue
```

## Comandos

```bash
pnpm dev          # Desarrollo con hot-reload
pnpm build        # Build producción
pnpm start:prod   # Ejecutar build
pnpm db:reset     # Reset base de datos
pnpm db:migrate   # Aplicar migraciones
pnpm db:generate  # Generar cliente Prisma
```

## API Docs

Swagger disponible en: http://localhost:3000/api/docs

## Variables de entorno

Ver `server/.env.example` para configuración completa.
