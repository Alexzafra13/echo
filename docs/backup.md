# Backups

## Data Structure

Echo keeps everything persistent in two Docker named volumes (declared at the bottom of `docker-compose.yml`):

```
echo_data (mounted at /app/data)
├── setup.json          # Setup wizard state
├── secrets.env         # JWT secrets
├── metadata/           # Artist/album images
├── covers/             # Cover art
├── uploads/            # User uploads
└── logs/               # Application logs
postgres_data            # Database
```

Docker prefixes volume names with the compose project name (the folder that holds `docker-compose.yml`), so with the Quick Start layout the volumes are `echo_echo_data` and `echo_postgres_data`. Check the real names with `docker volume ls`.

## What to Back Up

| Component          | Priority | Contents                                     |
| ------------------ | -------- | -------------------------------------------- |
| PostgreSQL         | High     | Users, playlists, ratings, play history      |
| `echo_data` volume | Medium   | Covers, metadata, configuration, JWT secrets |
| Redis              | Low      | Cache only (regenerated automatically)       |

## Manual Backup

### Database

`scripts/backup-database.sh` wraps `pg_dump` and keeps compressed, timestamped dumps in `./backups`, deleting those older than 7 days. Run it from the folder that contains `docker-compose.yml` while the containers are up:

```bash
./scripts/backup-database.sh                      # Interactive
./scripts/backup-database.sh --auto               # No prompts (for cron)
./scripts/backup-database.sh --restore backups/echo-db-backup-20240101_030000.sql.gz
./scripts/backup-database.sh --help               # --backup-dir, --retention-days, --compose-file
```

If you only downloaded `docker-compose.yml`, grab the script with `curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/scripts/backup-database.sh` and `chmod +x` it.

Or by hand:

```bash
# Export
docker exec echo-postgres pg_dump -U echo echo > backup.sql

# Restore
cat backup.sql | docker exec -i echo-postgres psql -U echo echo
```

### Data volume

Use a throwaway container to archive the volume contents into the current folder (replace `echo_echo_data` with the name shown by `docker volume ls`):

```bash
# Export
docker run --rm -v echo_echo_data:/data -v "$(pwd)":/backup alpine \
  tar czf /backup/echo-data.tar.gz -C /data .

# Restore
docker run --rm -v echo_echo_data:/data -v "$(pwd)":/backup alpine \
  tar xzf /backup/echo-data.tar.gz -C /data
```

## Automated Backup (cron)

```bash
# Edit crontab
crontab -e

# Daily database backup at 3am (keeps 7 days)
0 3 * * * cd /path/to/echo && ./scripts/backup-database.sh --auto

# Or with pg_dump directly
0 3 * * * cd /path/to/echo && docker exec echo-postgres pg_dump -U echo echo > backups/db-$(date +\%Y\%m\%d).sql
```

## Safe Operations

Operations that **keep** your data:

- `docker compose restart`
- `docker compose down` (without `-v`)
- `docker compose up --build`
- Updating the image

Operations that **delete** data:

- `docker compose down -v`
- `docker volume rm echo_echo_data` / `docker volume rm echo_postgres_data`
- `docker volume prune`

## Restore a Backup

```bash
# 1. Stop services
docker compose down

# 2. Restore database
docker compose up -d postgres
cat backup.sql | docker exec -i echo-postgres psql -U echo echo

# 3. Restore data volume
docker run --rm -v echo_echo_data:/data -v "$(pwd)":/backup alpine \
  tar xzf /backup/echo-data.tar.gz -C /data

# 4. Restart everything
docker compose up -d
```

## Migrate to Another Server

```bash
# Source server
docker exec echo-postgres pg_dump -U echo echo > backup.sql
docker run --rm -v echo_echo_data:/data -v "$(pwd)":/backup alpine \
  tar czf /backup/echo-data.tar.gz -C /data .
scp backup.sql echo-data.tar.gz user@new-server:/path/to/echo/

# Destination server
docker compose up -d postgres
cat backup.sql | docker exec -i echo-postgres psql -U echo echo
docker run --rm -v echo_echo_data:/data -v "$(pwd)":/backup alpine \
  tar xzf /backup/echo-data.tar.gz -C /data
docker compose up -d
```
