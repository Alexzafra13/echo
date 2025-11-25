# Backups

## Estructura de datos

```
echo/
├── data/                    # Configuración y metadatos
│   ├── setup.json          # Estado setup wizard
│   ├── secrets.env         # JWT secrets
│   ├── metadata/           # Imágenes artistas/álbumes
│   ├── covers/             # Carátulas
│   └── uploads/            # Subidas usuarios
└── postgres_data (volume)   # Base de datos
```

## Qué hacer backup

| Componente | Criticidad | Contenido |
|------------|------------|-----------|
| PostgreSQL | Alta | Usuarios, playlists, ratings, historial |
| `./data/` | Media | Covers, metadatos, configuración |
| Redis | Baja | Solo caché (se regenera) |

## Backup manual

### Base de datos
```bash
# Exportar
docker exec echo-postgres pg_dump -U echo echo > backup.sql

# Restaurar
cat backup.sql | docker exec -i echo-postgres psql -U echo echo
```

### Carpeta data
```bash
# Exportar
tar czf data-backup.tar.gz ./data

# Restaurar
tar xzf data-backup.tar.gz
```

## Backup automático (cron)

```bash
# Editar crontab
crontab -e

# Backup diario a las 3am
0 3 * * * cd /ruta/echo && docker exec echo-postgres pg_dump -U echo echo > backups/db-$(date +\%Y\%m\%d).sql
```

## Datos seguros

Operaciones que **mantienen** los datos:
- `docker compose restart`
- `docker compose down` (sin `-v`)
- `docker compose up --build`
- Actualizar imagen

Operaciones que **borran** datos:
- `docker compose down -v`
- `docker volume rm postgres_data`
- `docker volume prune`

## Restaurar backup

```bash
# 1. Parar servicios
docker compose down

# 2. Restaurar base de datos
docker compose up -d postgres
cat backup.sql | docker exec -i echo-postgres psql -U echo echo

# 3. Restaurar data
tar xzf data-backup.tar.gz

# 4. Reiniciar todo
docker compose up -d
```

## Migrar a otro servidor

```bash
# Servidor origen
docker exec echo-postgres pg_dump -U echo echo > backup.sql
tar czf data.tar.gz ./data
scp backup.sql data.tar.gz usuario@nuevo-servidor:/ruta/echo/

# Servidor destino
docker compose up -d postgres
cat backup.sql | docker exec -i echo-postgres psql -U echo echo
tar xzf data.tar.gz
docker compose up -d
```
