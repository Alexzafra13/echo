# Echo Frontend

Interfaz web para Echo Music Server.

## Comandos

```bash
pnpm dev          # Desarrollo
pnpm build        # Build
pnpm preview      # Preview
pnpm lint         # ESLint (con --fix)
pnpm test         # Tests (Vitest)
pnpm test:ui      # Tests con interfaz
pnpm test:cov     # Tests con cobertura
pnpm e2e          # Tests E2E (Playwright)
pnpm e2e:ui       # Playwright en modo UI
pnpm e2e:headed   # Playwright con navegador visible
pnpm e2e:debug    # Playwright en modo debug
pnpm e2e:report   # Abre el último informe de Playwright
```

## Estructura

```
src/
├── features/   # Módulos (auth, player, home, playlists, admin...)
├── shared/     # Componentes, hooks, services, store
└── app/        # Root, routing
```

## Stack

React, Vite, TypeScript, Tanstack Query, Zustand, Wouter
