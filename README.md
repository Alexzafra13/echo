# Echo Music Server

Servidor de streaming de música autoalojado.

## Instalación con Docker

### Opción 1: Usar desde este repositorio

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
docker compose up -d
```

### Opción 2: Instalación limpia

```bash
mkdir echo && cd echo
curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml
docker compose up -d
```

Abre http://localhost:4567 y sigue el asistente.

### Configurar rutas de música

El `docker-compose.yml` incluye PostgreSQL, Redis y monta `/mnt` y `/media` por defecto.

Edita las rutas según tu servidor:

```yaml
services:
  echo:
    volumes:
      - ./data:/app/data          # Datos de la aplicación
      - /mnt:/mnt:ro              # Si tienes música en /mnt
      - /media:/media:ro          # Si tienes música en /media
      - /tu/ruta/musica:/music:ro # Añade tus rutas personalizadas
```

### Comandos útiles

```bash
docker compose up -d          # Levantar servidor
docker compose logs -f echo   # Ver logs en tiempo real
docker compose down           # Parar servidor
docker compose restart echo   # Reiniciar solo Echo
```

## Desarrollo

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm quickstart   # Instala todo automáticamente
pnpm dev:all      # Inicia frontend + backend
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `pnpm quickstart` | Setup inicial completo |
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
