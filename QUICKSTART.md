# 🚀 Echo Music Server - Quick Start

Deploy your own music streaming server in 3 minutes!

## Prerequisites

- Docker & Docker Compose installed
- Music collection (MP3, FLAC, M4A, etc.)

## Installation (3 Steps)

### 1. Create Configuration File

```bash
cat > .env << 'EOF'
# Where is your music stored?
MUSIC_PATH=/path/to/your/music

# Secure passwords (generate random ones)
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
EOF
```

**Change `/path/to/your/music`** to your actual music folder:
- Linux: `/mnt/music` or `/home/user/Music`
- Windows: `C:/Users/YourName/Music`
- macOS: `/Users/YourName/Music`

### 2. Start Echo

```bash
docker compose -f docker-compose.ghcr.yml up -d
```

That's it! Echo will:
- ✅ Download the latest image
- ✅ Create database
- ✅ Generate secure JWT secrets automatically
- ✅ Create admin user
- ✅ Start the server

### 3. Access Your Server

Open in browser: **http://YOUR_SERVER_IP:4567**

**Default credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ You'll be asked to change the password on first login.

## First Steps After Login

### 1. Scan Your Music Library

1. Go to **Settings** (⚙️ icon)
2. Click **Library Scanner**
3. Click **Start Scan**
4. Wait for scan to complete

### 2. Enjoy Your Music!

- Browse by Albums, Artists, or Tracks
- Create playlists
- Stream anywhere

## Optional: External Metadata (Album Art, Artist Info)

Echo can fetch high-quality album covers and artist information:

1. Go to **Settings** → **Metadata**
2. Enable providers:
   - **Cover Art Archive**: Free, no API key needed ✅
   - **Last.fm**: Requires free API key
   - **Fanart.tv**: Requires API key
3. Click **Enrich** on any artist/album

## Troubleshooting

### Music not found?

Check your `MUSIC_PATH` in `.env`:
```bash
# Verify the path exists
ls -la /path/to/your/music

# Check if Echo can see your music
docker exec echo-app ls -la /music
```

### Check database contents

```bash
# See how many tracks were scanned
docker exec -it echo-postgres psql -U music_admin -d music_server -c "SELECT COUNT(*) FROM \"Track\";"

# See albums
docker exec -it echo-postgres psql -U music_admin -d music_server -c "SELECT COUNT(*) FROM \"Album\";"

# See artists
docker exec -it echo-postgres psql -U music_admin -d music_server -c "SELECT COUNT(*) FROM \"Artist\";"
```

### View logs

```bash
# Application logs
docker logs echo-app

# Database logs
docker logs echo-postgres

# All logs
docker compose -f docker-compose.ghcr.yml logs -f
```

### Reset everything

```bash
docker compose -f docker-compose.ghcr.yml down -v
# This deletes all data! Your music files are safe (read-only)
```

## Advanced Configuration

See [.env.example](.env.example) for all available options:
- Custom ports
- CORS origins
- Cache settings
- External database
- And more...

## Need Help?

- 📖 Documentation: [README.md](README.md)
- 🐛 Issues: https://github.com/Alexzafra13/echo/issues
- 💬 Discussions: https://github.com/Alexzafra13/echo/discussions

---

**Made with ❤️ by the Echo team**
