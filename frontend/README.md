# Echo Frontend

Interfaz web para Echo Music Server.

## Stack

- React 18
- Vite
- TypeScript
- Tanstack Query
- Zustand
- Wouter (routing)

## Estructura

```
src/
├── features/          # Módulos por funcionalidad
│   ├── auth/         # Login, registro
│   ├── player/       # Reproductor
│   ├── library/      # Biblioteca musical
│   ├── playlists/    # Playlists
│   ├── admin/        # Panel administración
│   └── setup/        # Setup wizard
├── shared/           # Componentes compartidos
│   ├── components/   # UI components
│   ├── hooks/        # Custom hooks
│   ├── services/     # API client
│   └── store/        # Estado global (Zustand)
└── app/              # App root, routing
```

## Comandos

```bash
pnpm dev      # Desarrollo con hot-reload
pnpm build    # Build producción
pnpm preview  # Preview del build
```

## Variables de entorno

```bash
VITE_API_URL=/api   # URL base API (default: /api)
```

En desarrollo, Vite hace proxy a `localhost:3000`.
En producción, el backend sirve el frontend estático.
