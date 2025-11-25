# Echo Music Server

Servidor de streaming de música autoalojado. Estilo Jellyfin: plug-and-play.

## Instalación

```bash
mkdir echo && cd echo
curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml
docker compose up -d
```

Abre http://localhost:4567 y sigue el asistente de configuración.

## Configuración de música

Por defecto se montan `/mnt` y `/media`. Para otra ubicación, edita `docker-compose.yml`:

```yaml
volumes:
  - ./data:/app/data
  - /tu/ruta/musica:/music:ro
```

## Desarrollo

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm install
pnpm docker:dev    # PostgreSQL + Redis
pnpm dev:all       # Frontend + Backend
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Swagger: http://localhost:3000/api/docs

## Documentación

- [Desarrollo](docs/development.md) - Setup completo para desarrollo
- [Configuración](docs/configuration.md) - Variables de entorno
- [Backups](docs/backup.md) - Guía de backups

## Stack

**Backend:** NestJS, Prisma, PostgreSQL, Redis
**Frontend:** React, Vite, Tanstack Query, Zustand

## Licencia

ISC
