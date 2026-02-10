# Backups

## Data Structure

```
echo/
├── data/                    # Configuration and metadata
│   ├── setup.json          # Setup wizard state
│   ├── secrets.env         # JWT secrets
│   ├── metadata/           # Artist/album images
│   ├── covers/             # Cover art
│   └── uploads/            # User uploads
└── postgres_data (volume)   # Database
```

## What to Back Up

| Component | Priority | Contents |
|-----------|----------|----------|
| PostgreSQL | High | Users, playlists, ratings, play history |
| `./data/` | Medium | Covers, metadata, configuration |
| Redis | Low | Cache only (regenerated automatically) |

## Manual Backup

### Database
```bash
# Export
docker exec echo-postgres pg_dump -U echo echo > backup.sql

# Restore
cat backup.sql | docker exec -i echo-postgres psql -U echo echo
```

### Data folder
```bash
# Export
tar czf data-backup.tar.gz ./data

# Restore
tar xzf data-backup.tar.gz
```

## Automated Backup (cron)

```bash
# Edit crontab
crontab -e

# Daily backup at 3am
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
- `docker volume rm postgres_data`
- `docker volume prune`

## Restore a Backup

```bash
# 1. Stop services
docker compose down

# 2. Restore database
docker compose up -d postgres
cat backup.sql | docker exec -i echo-postgres psql -U echo echo

# 3. Restore data
tar xzf data-backup.tar.gz

# 4. Restart everything
docker compose up -d
```

## Migrate to Another Server

```bash
# Source server
docker exec echo-postgres pg_dump -U echo echo > backup.sql
tar czf data.tar.gz ./data
scp backup.sql data.tar.gz user@new-server:/path/to/echo/

# Destination server
docker compose up -d postgres
cat backup.sql | docker exec -i echo-postgres psql -U echo echo
tar xzf data.tar.gz
docker compose up -d
```
