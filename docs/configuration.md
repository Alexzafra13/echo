# Configuration

## Environment Variables

### Production (.env)

`docker-compose.yml` reads an optional `.env` file placed next to it. Only three values come from it; everything else is fixed in the compose file or generated on first start:

```bash
# Echo port (default: 4567)
ECHO_PORT=4567

# Database and cache passwords (internal services, never exposed)
POSTGRES_PASSWORD=your_secure_password
REDIS_PASSWORD=another_secure_password
```

| Variable            | Default               | Description                |
| ------------------- | --------------------- | -------------------------- |
| `ECHO_PORT`         | `4567`                | Port published on the host |
| `POSTGRES_PASSWORD` | `echo-internal-db`    | PostgreSQL password        |
| `REDIS_PASSWORD`    | `echo-internal-cache` | Redis password             |

> No `.env` is required. Without one, PostgreSQL and Redis use the built-in passwords above (they are only reachable inside the Docker network), and the container generates the JWT secrets on first start into `/app/data/secrets.env`. `./install.sh --secure` writes a `.env` with random passwords for you.

The PostgreSQL user and database name are fixed to `echo` in `docker-compose.yml`; they cannot be changed through `.env`.

### Container Variables

These are read by Echo itself. `docker-compose.yml` already sets `NODE_ENV`, `DATABASE_URL`, `REDIS_HOST`, `REDIS_PASSWORD` and `DATA_PATH`. To set any other variable, add it to the `environment:` block of the `echo` service (a `.env` entry is not enough, compose does not forward it):

```yaml
services:
  echo:
    environment:
      CORS_ORIGINS: https://music.yourdomain.com
      PUID: 1000
      PGID: 1000
```

| Variable                            | Default                     | Description                                                                                                                                                          |
| ----------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                              | `4567`                      | Port Echo listens on inside the container (`ECHO_PORT` maps to it)                                                                                                   |
| `DATA_PATH`                         | `/app/data`                 | Persistent data: secrets, covers, metadata, uploads, logs                                                                                                            |
| `PUID` / `PGID`                     | `1001`                      | User/group ID the container runs as (NAS permission mapping)                                                                                                         |
| `CORS_ORIGINS`                      | auto-detected               | Comma-separated allowed origins. Set it when serving Echo from a domain behind a reverse proxy                                                                       |
| `LIBRARY_PATH`                      | `/music`                    | Primary music directory inside the container                                                                                                                         |
| `MUSIC_LIBRARY_PATH`                | `/music`                    | Music directory used by library maintenance and by portable metadata storage                                                                                         |
| `ALLOWED_MUSIC_PATHS`               | none                        | Comma-separated extra directories the scanner and streamer may read, besides `LIBRARY_PATH`, `DATA_PATH` and the library path chosen in the admin panel              |
| `AUTO_SCAN`                         | `true`                      | Watch the library and scan new files automatically (can also be disabled in the admin panel)                                                                         |
| `LOG_LEVEL`                         | `info`                      | `fatal`, `error`, `warn`, `info`, `debug` or `trace` (`debug` when `NODE_ENV` is not `production`)                                                                   |
| `LUFS_CONCURRENCY`                  | half the CPU cores (max 12) | Parallel loudness analysis jobs; lower it on low-memory devices                                                                                                      |
| `DJ_ANALYSIS_CONCURRENCY`           | half the CPU cores (max 12) | Parallel DJ (tempo/energy) analysis workers                                                                                                                          |
| `STREAM_TIMEOUT_MS`                 | `600000`                    | Idle timeout for audio and video streams, in milliseconds                                                                                                            |
| `MAX_UPLOAD_SIZE`                   | `10485760`                  | Maximum upload size in bytes (avatars, covers), 10 MB                                                                                                                |
| `METADATA_STORAGE_MODE`             | `centralized`               | `centralized` keeps artist/album images under `DATA_PATH/metadata`; `portable` stores them in `MUSIC_LIBRARY_PATH/.echo-metadata`. Overrides the admin panel setting |
| `METADATA_STORAGE_PATH`             | `DATA_PATH/metadata`        | Directory for centralized metadata images                                                                                                                            |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | auto-generated              | Only set them to share secrets between instances; otherwise they are generated into `DATA_PATH/secrets.env` (min. 32 characters)                                     |

### Development (api/.env)

Generated by `pnpm quickstart` (`api/scripts/generate-env.js`) with values that match `docker-compose.dev.yml`:

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://music_user:music_password@localhost:5432/music_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=dev_redis_password
JWT_SECRET=<auto-generated>
JWT_REFRESH_SECRET=<auto-generated>
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
UPLOAD_PATH=./uploads
COVERS_PATH=./uploads/covers
```

`UPLOAD_PATH` and `COVERS_PATH` only matter outside Docker, where `DATA_PATH` is not set: they point uploads and cover art at a local folder instead of `/app/data`. All the container variables above can be added to `api/.env` as well.

## Volumes

| Volume                  | Description              | Backup           |
| ----------------------- | ------------------------ | ---------------- |
| `echo_data`             | Covers, metadata, config | Yes              |
| `postgres_data`         | Database                 | Yes              |
| `redis_data`            | Cache                    | No (regenerated) |
| `/your/music:/music:ro` | Music (read-only)        | No               |

## Ports

| Port | Service    | Environment           |
| ---- | ---------- | --------------------- |
| 4567 | Echo       | Production            |
| 5173 | Frontend   | Development           |
| 3000 | Backend    | Development           |
| 5432 | PostgreSQL | Development (exposed) |
| 6379 | Redis      | Development (exposed) |

> In production, PostgreSQL and Redis are not exposed (only accessible within the Docker network).

## Music Paths

Add read-only volumes in `docker-compose.yml`:

```yaml
services:
  echo:
    volumes:
      - echo_data:/app/data
      - /home/user/Music:/music:ro # Linux
      - /volume1/music:/music:ro # Synology NAS
      - /media/usb-drive:/usb:ro # USB drive
```

Paths will appear in the admin panel for library configuration.

## NAS Permissions (PUID/PGID)

On Synology, QNAP, and other NAS devices, file permissions may not match the container user. Set `PUID` and `PGID` to match your NAS user:

```bash
# Find your IDs on the NAS:
id $(whoami)
# uid=1000(youruser) gid=1000(users)
```

Then in `docker-compose.yml`:

```yaml
services:
  echo:
    environment:
      PUID: 1000
      PGID: 1000
```

If not set, the container defaults to UID/GID 1001.

## Docker Tuning

The default `docker-compose.yml` includes settings optimized for NAS and low-memory devices:

| Setting               | Value                                 | Why                                                    |
| --------------------- | ------------------------------------- | ------------------------------------------------------ |
| PostgreSQL `shm_size` | `256m`                                | Prevents shared memory crashes during library scanning |
| Redis `maxmemory`     | `128mb`                               | Caps memory usage with LRU eviction                    |
| Log rotation          | `10m × 3` (Echo), `5m × 3` (PG/Redis) | Prevents filling up disk with logs                     |
| `stop_grace_period`   | `15s`                                 | Clean shutdown on NAS power events                     |

These are already configured in the default `docker-compose.yml` — no action needed unless you want to adjust them.

## Security

- **JWT secrets** — Auto-generated in `/app/data/secrets.env` on first run
- **Passwords** — Use unique values in `.env` for production
- **Music** — Mounted as read-only (`:ro`)
- **Docker network** — PostgreSQL/Redis isolated, not exposed
