# Echo Music Server

Servidor de streaming de música autoalojado.

## Instalación

### Opción A: Descargar con curl

```bash
mkdir echo && cd echo
curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml
```

### Opción B: Copiar manualmente

Copia el contenido del archivo [`docker-compose.yml`](docker-compose.yml) y guárdalo en una carpeta.

---

### Configurar rutas de música

Edita `docker-compose.yml` y busca la sección `>>> TU MÚSICA`:

```yaml
volumes:
  - ./data:/app/data

  # >>> TU MÚSICA - EDITA AQUÍ <<<
  - /home/tu-usuario/Musica:/music:ro
  - /mnt/nas/canciones:/nas:ro
```

### Iniciar

```bash
docker compose up -d
```

### Abrir

http://localhost:4567

---

## Comandos útiles

```bash
docker compose up -d              # Iniciar
docker compose down               # Parar
docker compose logs -f echo       # Ver logs
docker compose restart echo       # Reiniciar
docker compose pull && docker compose up -d   # Actualizar
```

## Configuración opcional

Crea un archivo `.env` junto al `docker-compose.yml`:

```bash
# Cambiar puerto
ECHO_PORT=8080

# Contraseñas personalizadas (recomendado en producción)
POSTGRES_PASSWORD=contraseña_segura
REDIS_PASSWORD=otra_contraseña
```

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [Configuración](docs/configuration.md) | Variables de entorno |
| [Reverse Proxy](docs/reverse-proxy.md) | HTTPS con Nginx/Caddy/Traefik |
| [Backups](docs/backup.md) | Backup y migración |
| [Desarrollo](docs/development.md) | Contribuir al proyecto |

## Stack

**Backend:** NestJS + Fastify + Drizzle + PostgreSQL + Redis
**Frontend:** React + Vite + Zustand

## Licencia

ISC
