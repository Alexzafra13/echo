# Echo Music Server

Servidor de streaming de música autoalojado.

## Instalación

```bash
mkdir echo && cd echo
curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml
docker compose up -d
```

Abre http://localhost:4567 y sigue el asistente.

## Configurar música

Edita `docker-compose.yml` para añadir tu carpeta de música:

```yaml
volumes:
  - ./data:/app/data
  - /tu/ruta/musica:/music:ro
```

## Desarrollo

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm setup      # Instala todo y configura BD
pnpm dev:all    # Inicia frontend + backend
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `pnpm setup` | Setup inicial |
| `pnpm dev:all` | Desarrollo |
| `pnpm db:reset` | Reset BD |
| `pnpm docker:dev` | Levantar DB/Redis |

## Docs

- [Desarrollo](docs/development.md)
- [Configuración](docs/configuration.md)
- [Backups](docs/backup.md)

## Stack

- **Backend:** NestJS, Prisma, PostgreSQL, Redis
- **Frontend:** React, Vite, Zustand

## Licencia

ISC
