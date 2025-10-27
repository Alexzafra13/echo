# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Echo Music Server.

## 📋 Available Workflows

### 1. `docker-publish.yml` - Build and Publish Docker Images

**Triggers:**
- ✅ Push to `main`/`master` branch
- ✅ New Git tags (`v*.*.*`)
- ✅ Pull requests (build only, no push)

**What it does:**
1. Builds Docker image for multiple architectures (amd64, arm64)
2. Pushes to GitHub Container Registry (ghcr.io)
3. Creates multiple tags automatically
4. Caches layers for faster builds

**Automatic Tags:**
```bash
# On push to main
ghcr.io/alexzafra13/echo:latest
ghcr.io/alexzafra13/echo:main-<commit-sha>

# On tag v1.2.3
ghcr.io/alexzafra13/echo:v1.2.3
ghcr.io/alexzafra13/echo:v1.2
ghcr.io/alexzafra13/echo:v1
```

**Multi-architecture support:**
- `linux/amd64` - x86_64 servers
- `linux/arm64` - ARM servers, Raspberry Pi 4, Mac M1/M2

---

### 2. `docker-test.yml` - Docker Build Tests

**Triggers:**
- ✅ Pull requests that modify Docker files

**What it does:**
1. Tests Docker build (doesn't push)
2. Validates docker-compose configurations
3. Ensures builds succeed before merge

---

## 🚀 How to Use

### Release a New Version

```bash
# 1. Update version in your code/changelog
# 2. Commit changes
git add .
git commit -m "chore: bump version to 1.0.0"

# 3. Create and push tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 4. GitHub Actions automatically:
#    - Builds multi-arch image
#    - Pushes to ghcr.io/alexzafra13/echo:v1.0.0
#    - Also tags as v1.0 and v1
```

### Update `latest` Tag

```bash
# Just push to main/master
git push origin main

# GitHub Actions automatically updates:
# ghcr.io/alexzafra13/echo:latest
```

---

## 🔐 Required Secrets

### Automatically Available:
- `GITHUB_TOKEN` - Provided by GitHub, no setup needed

### Optional (for advanced features):
- None required for basic functionality

---

## 📊 Monitoring Workflows

### View Workflow Status
1. Go to repository → **Actions** tab
2. Select workflow run
3. View logs for each step

### Check Published Images
1. Go to repository → **Packages**
2. Click on `echo` package
3. View all tags and metadata

---

## 🛠️ Customization

### Change Target Platforms

Edit `.github/workflows/docker-publish.yml`:
```yaml
platforms: linux/amd64,linux/arm64,linux/arm/v7
```

### Add Custom Tags

Edit `.github/workflows/docker-publish.yml`:
```yaml
tags: |
  type=semver,pattern={{version}}
  type=raw,value=stable
  type=raw,value=production
```

### Change Registry

Replace `ghcr.io` with another registry:
```yaml
env:
  REGISTRY: docker.io  # Docker Hub
  # or
  REGISTRY: registry.gitlab.com  # GitLab
```

---

## 🐛 Troubleshooting

### Build Fails

**Check:**
1. Workflow logs in Actions tab
2. Dockerfile syntax
3. Available disk space

**Common fixes:**
```bash
# Fix Dockerfile issues locally first
docker build -t test .

# Then push when it works
git push
```

### "permission denied" Error

**Fix:**
1. Go to Settings → Actions → General
2. Workflow permissions → Read and write permissions
3. Save

### Tags Not Created

**Check:**
```bash
# Ensure tag follows pattern v*.*.*
git tag -a v1.0.0 -m "Release"

# NOT: 1.0.0 (missing 'v')
# NOT: version-1.0.0 (wrong prefix)
```

---

## 📚 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Buildx](https://docs.docker.com/buildx/working-with-buildx/)
- [GHCR Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
