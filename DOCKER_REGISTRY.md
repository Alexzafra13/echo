# 🐳 Docker Image Registry Guide

## GitHub Container Registry (GHCR)

This project automatically builds and publishes Docker images to GitHub Container Registry.

---

## 📦 Image Location

```
ghcr.io/alexzafra13/echo:latest
```

**Format:**
```
ghcr.io/<USERNAME>/<REPOSITORY>:<TAG>
```

---

## 🏷️ Available Tags

### Automatic Tags (GitHub Actions)

| Tag Pattern | When Created | Example | Use For |
|-------------|--------------|---------|---------|
| `latest` | Push to main/master | `ghcr.io/alexzafra13/echo:latest` | Production |
| `v<major>.<minor>.<patch>` | Git tag | `ghcr.io/alexzafra13/echo:v1.0.0` | Specific version |
| `v<major>.<minor>` | Git tag | `ghcr.io/alexzafra13/echo:v1.0` | Minor version |
| `v<major>` | Git tag | `ghcr.io/alexzafra13/echo:v1` | Major version |
| `<branch>-<sha>` | Any branch | `ghcr.io/alexzafra13/echo:main-abc1234` | Testing |

### Examples:
```bash
# Latest stable
ghcr.io/alexzafra13/echo:latest

# Specific version (recommended for production)
ghcr.io/alexzafra13/echo:v1.2.3

# Major version (auto-updates minor/patch)
ghcr.io/alexzafra13/echo:v1

# Specific commit
ghcr.io/alexzafra13/echo:main-a1b2c3d
```

---

## 🚀 Using Pre-built Images

### Option 1: Pull and Run Directly

```bash
# Login to GHCR (public images don't need this)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull image
docker pull ghcr.io/alexzafra13/echo:latest

# Run
docker run -p 4567:4567 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_HOST="redis" \
  ghcr.io/alexzafra13/echo:latest
```

### Option 2: Use in Docker Compose (Recommended)

Create `docker-compose.ghcr.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: music_admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: music_server
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U music_admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: ghcr.io/alexzafra13/echo:latest  # ✨ Pre-built image
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://music_admin:${POSTGRES_PASSWORD}@postgres:5432/music_server
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      NODE_ENV: production
      PORT: 4567
      HOST: 0.0.0.0
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    ports:
      - "4567:4567"
    volumes:
      - music_data:/app/uploads/music
      - covers_data:/app/uploads/covers

volumes:
  postgres_data:
  redis_data:
  music_data:
  covers_data:
```

**Usage:**
```bash
# Create .env file
cp .env.production.example .env

# Edit with your values
nano .env

# Start services (NO BUILD NEEDED!)
docker-compose -f docker-compose.ghcr.yml up -d
```

---

## 🔄 Publishing New Versions

### Automatic (Recommended)

GitHub Actions automatically builds and publishes when you:

#### 1. Push to main/master → Creates `latest` tag
```bash
git add .
git commit -m "feat: new feature"
git push origin main
```

#### 2. Create Git Tag → Creates versioned tag
```bash
# Create version tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# This creates:
# - ghcr.io/alexzafra13/echo:v1.0.0
# - ghcr.io/alexzafra13/echo:v1.0
# - ghcr.io/alexzafra13/echo:v1
```

### Manual (if needed)

```bash
# Build locally
docker build -t ghcr.io/alexzafra13/echo:v1.0.0 .

# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u alexzafra13 --password-stdin

# Push
docker push ghcr.io/alexzafra13/echo:v1.0.0
```

---

## 📋 Multi-Architecture Support

Images are built for multiple architectures:
- ✅ `linux/amd64` - Intel/AMD 64-bit (most servers)
- ✅ `linux/arm64` - ARM 64-bit (Raspberry Pi 4, Mac M1/M2)

Docker automatically pulls the correct architecture for your system.

---

## 🔐 Image Access

### Public Repository (Default)
Anyone can pull images without authentication:
```bash
docker pull ghcr.io/alexzafra13/echo:latest
```

### Private Repository
If you make the package private, users need authentication:
```bash
# Create Personal Access Token (PAT) with read:packages scope
# Settings → Developer settings → Personal access tokens → Generate new token

# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull
docker pull ghcr.io/alexzafra13/echo:latest
```

---

## 🎯 Recommended Workflow

### Development
```bash
# Build locally
docker-compose -f docker-compose.dev.yml up -d --build
```

### Staging/Testing
```bash
# Use latest image
docker-compose -f docker-compose.ghcr.yml pull
docker-compose -f docker-compose.ghcr.yml up -d
```

### Production
```bash
# Use specific version (pinned)
# Edit docker-compose.ghcr.yml:
#   image: ghcr.io/alexzafra13/echo:v1.2.3

docker-compose -f docker-compose.ghcr.yml pull
docker-compose -f docker-compose.ghcr.yml up -d
```

---

## 🏗️ Build Process

GitHub Actions workflow (`.github/workflows/docker-publish.yml`):

1. **Checkout** - Get latest code
2. **Setup Buildx** - Multi-platform builds
3. **Login** - Authenticate with GHCR
4. **Metadata** - Generate tags and labels
5. **Build** - Multi-arch build (amd64, arm64)
6. **Push** - Upload to GHCR
7. **Cache** - Speed up future builds

---

## 📊 Image Information

View image details:
```bash
# Inspect image
docker inspect ghcr.io/alexzafra13/echo:latest

# View labels
docker inspect ghcr.io/alexzafra13/echo:latest \
  --format='{{json .Config.Labels}}' | jq

# Check size
docker images ghcr.io/alexzafra13/echo

# View layers
docker history ghcr.io/alexzafra13/echo:latest
```

---

## 🔧 Troubleshooting

### "unauthorized: unauthenticated"
```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### "manifest unknown"
```bash
# Tag doesn't exist yet
# Check available tags at:
# https://github.com/Alexzafra13/echo/pkgs/container/echo
```

### "pull access denied"
```bash
# Repository is private - need authentication
# Or check if package exists and is public
```

### Build fails in GitHub Actions
```bash
# Check workflow logs:
# GitHub → Actions → Build and Push Docker Image → View logs

# Common issues:
# - Missing secrets (JWT_SECRET, etc.)
# - Dockerfile syntax errors
# - Out of disk space
```

---

## 📚 Additional Resources

- [GitHub Container Registry Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Multi-platform Builds](https://docs.docker.com/build/building/multi-platform/)
- [Semantic Versioning](https://semver.org/)

---

## ✅ Benefits of Using GHCR

1. **Fast Deployments** - No build time, just pull and run
2. **Consistent Environments** - Same image everywhere
3. **Version Control** - Pin to specific versions
4. **Multi-arch** - Works on different CPU architectures
5. **Free** - Unlimited public images
6. **Integrated** - Part of your GitHub repository
7. **Secure** - Automatic vulnerability scanning
8. **CI/CD Ready** - Automatic builds on every commit/tag
