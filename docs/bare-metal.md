# Linux Installation (without Docker)

Install Echo directly on Linux without Docker. Supports Debian/Ubuntu, Fedora/RHEL, and Arch Linux.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/Alexzafra13/echo/main/scripts/install.sh | sudo bash
```

The script will:

1. Detect your distribution
2. Check system requirements (architecture, disk space, RAM)
3. Install Node.js 22, PostgreSQL, Redis, and FFmpeg
4. Create a system user (`echo`)
5. Build the application
6. Generate secure passwords and JWT secrets
7. Run database migrations
8. Create and start a systemd service

Once complete, open **http://localhost:4567** and follow the setup wizard to create your admin account.

## Requirements

| Requirement | Minimum |
|-------------|---------|
| OS | Debian 11+, Ubuntu 20.04+, Fedora 38+, Arch Linux |
| Architecture | x86_64 or aarch64 (ARM64) |
| Disk space | 1 GB free |
| RAM | 1 GB (2 GB recommended) |

## Update

```bash
sudo /opt/echo/scripts/install.sh --update
```

This pulls the latest code, rebuilds, runs new migrations, and restarts the service. Your data and configuration are preserved.

## Uninstall

```bash
sudo /opt/echo/scripts/install.sh --uninstall
```

This removes the application, systemd service, system user, and database. Your music and data directory (`/var/lib/echo`) are preserved.

## Managing the Service

```bash
sudo systemctl status echo        # Check status
sudo systemctl restart echo       # Restart
sudo systemctl stop echo          # Stop
sudo journalctl -u echo -f        # View logs
```

## File Locations

| Path | Description |
|------|-------------|
| `/opt/echo` | Application files |
| `/opt/echo/api/.env` | Configuration |
| `/var/lib/echo` | Data (covers, metadata, uploads) |
| `/srv/music` | Default music directory |

## Music Library

By default, the installer creates `/srv/music` and configures the following allowed paths:

- `/srv/music`
- `/mnt`
- `/media`

Copy or symlink your music into any of these locations. To add custom paths, edit `/opt/echo/api/.env`:

```bash
LIBRARY_PATH=/srv/music
ALLOWED_MUSIC_PATHS=/srv/music,/mnt,/media,/home/user/Music
```

Then restart: `sudo systemctl restart echo`

## Configuration

Edit `/opt/echo/api/.env` to change settings. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4567` | Server port |
| `DATABASE_URL` | auto-configured | PostgreSQL connection string |
| `REDIS_HOST` | `localhost` | Redis host |
| `LIBRARY_PATH` | `/srv/music` | Primary music directory |
| `ALLOWED_MUSIC_PATHS` | `/srv/music,/mnt,/media` | Directories the scanner can access |
| `CORS_ORIGINS` | auto-detected | Set explicitly if behind a reverse proxy |

After editing, restart the service: `sudo systemctl restart echo`

## Reverse Proxy

If you want HTTPS access, see the [Reverse Proxy](reverse-proxy.md) guide. When using a reverse proxy, set `CORS_ORIGINS` explicitly:

```bash
CORS_ORIGINS=https://music.yourdomain.com
```

## Troubleshooting

**Service won't start:**
```bash
sudo journalctl -u echo --no-pager -n 50
```

**Database connection issues:**
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT 1"
```

**Redis connection issues:**
```bash
sudo systemctl status redis-server   # Debian/Ubuntu
sudo systemctl status redis           # Fedora/Arch
```

**Rebuild from scratch** (keeps data):
```bash
sudo systemctl stop echo
cd /opt/echo
sudo -u echo pnpm install
sudo -u echo pnpm build
sudo systemctl start echo
```
