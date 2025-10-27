# 🌍 Environment Configuration Guide

## Two Environments

### 🔧 **Development** (Local)
- **Port:** 3000
- **Host:** localhost
- **PostgreSQL:** Exposed on localhost:5432
- **Redis:** Exposed on localhost:6379
- **Use for:** Local development, debugging, testing

### 🚀 **Production** (Server)
- **Port:** 4567
- **Host:** 0.0.0.0 (accepts connections from any IP)
- **PostgreSQL:** Internal only (not exposed)
- **Redis:** Internal only (not exposed)
- **Use for:** Production deployment, real servers

---

## 📋 Quick Start

### Development (Local Machine)

```bash
# 1. Create environment file
cp .env.development.example .env

# 2. Start services
docker-compose -f docker-compose.dev.yml up -d --build

# 3. Access
# From your browser: http://localhost:3000
# Health check: curl http://localhost:3000/health
```

**What you get:**
- ✅ App on http://localhost:3000
- ✅ PostgreSQL accessible for debugging (localhost:5432)
- ✅ Redis accessible for debugging (localhost:6379)
- ✅ All logs visible
- ✅ Hot reload ready (if configured)

---

### Production (Server Deployment)

```bash
# 1. Create production environment file
cp .env.production.example .env.production

# 2. EDIT .env.production - CHANGE ALL PASSWORDS!
nano .env.production

# 3. Start services
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Access
# From server: http://localhost:4567
# From network: http://SERVER_IP:4567
# Health check: curl http://localhost:4567/health
```

**What you get:**
- ✅ App on http://SERVER_IP:4567 (accessible from network)
- ✅ PostgreSQL secured (internal only, not exposed)
- ✅ Redis secured (internal only, not exposed)
- ✅ Production optimizations
- ✅ Auto-migrations on startup

---

## 🔐 Security Differences

| Feature | Development | Production |
|---------|-------------|------------|
| **PostgreSQL** | Exposed on 5432 | Internal only |
| **Redis** | Exposed on 6379 | Internal only |
| **App Port** | 3000 (localhost) | 4567 (all interfaces) |
| **Passwords** | Simple/defaults | Strong/required |
| **CORS** | Allow all (*) | Specific domains |
| **SSL/TLS** | Not required | Recommended |
| **JWT Secrets** | Dev defaults | Must be changed |

---

## 🎯 Common Workflows

### Development → Production

```bash
# 1. Develop locally
docker-compose -f docker-compose.dev.yml up -d

# 2. Test your changes
# Make API calls to http://localhost:3000

# 3. Commit and push code
git add .
git commit -m "feat: your feature"
git push

# 4. On production server
git pull
docker-compose -f docker-compose.prod.yml up -d --build

# 5. Access from network
# http://YOUR_SERVER_IP:4567
```

---

## 🌐 Finding Your Server IP

### On the server (Linux/Mac):
```bash
# Get public IP
curl ifconfig.me

# Get local network IP
hostname -I | awk '{print $1}'

# Or
ip addr show | grep inet
```

### On Windows Server:
```powershell
# Get IP address
ipconfig | findstr IPv4
```

### From outside:
```bash
# Your public IP (what others use to connect)
curl https://api.ipify.org
```

---

## 📊 Port Configuration

### Why Port 4567 for Production?

| Port | Status | Reason |
|------|--------|--------|
| 3000 | ❌ Avoid | Too common (React, Node dev servers) |
| 8080 | ❌ Avoid | Very common (Tomcat, Jenkins) |
| 80/443 | ❌ Avoid | Reserved for HTTP/HTTPS (use nginx) |
| **4567** | ✅ **Perfect** | Rarely used, easy to remember |

---

## 🔧 Changing Ports

### Development Port (default: 3000)

Edit `docker-compose.dev.yml`:
```yaml
app:
  ports:
    - "3001:3000"  # Change left number (host port)
```

### Production Port (default: 4567)

Edit `docker-compose.prod.yml` AND `.env.production`:
```yaml
# docker-compose.prod.yml
app:
  environment:
    PORT: 4567  # Change this
  ports:
    - "4567:4567"  # Must match!
```

```env
# .env.production
PORT=4567
```

---

## 🚦 Accessing from Different Locations

### From the server itself:
```bash
curl http://localhost:4567/health
```

### From same network (LAN):
```bash
# Use private IP (192.168.x.x or 10.x.x.x)
curl http://192.168.1.100:4567/health
```

### From internet (WAN):
```bash
# Use public IP
curl http://YOUR_PUBLIC_IP:4567/health

# Configure firewall to allow port 4567
# Linux: sudo ufw allow 4567
# Windows: Add inbound rule in Windows Firewall
```

---

## 🔒 Firewall Configuration

### Linux (ufw):
```bash
# Allow production port
sudo ufw allow 4567/tcp

# Check status
sudo ufw status
```

### Linux (firewalld):
```bash
sudo firewall-cmd --permanent --add-port=4567/tcp
sudo firewall-cmd --reload
```

### Windows:
```powershell
# Open Windows Firewall
# Add inbound rule for port 4567
New-NetFirewallRule -DisplayName "Echo Music Server" -Direction Inbound -Protocol TCP -LocalPort 4567 -Action Allow
```

---

## 📝 Environment Variables Reference

### Must Change in Production:
- `JWT_SECRET` - Generate with: `openssl rand -base64 64`
- `JWT_REFRESH_SECRET` - Generate with: `openssl rand -base64 64`
- `POSTGRES_PASSWORD` - Strong password
- `REDIS_PASSWORD` - Strong password
- `CORS_ORIGINS` - Your frontend domain(s)

### Optional Configuration:
- `PORT` - Server port (default: 4567)
- `BCRYPT_ROUNDS` - Password hashing strength (default: 12)
- `CACHE_*_TTL` - Cache durations in seconds
- `JWT_EXPIRATION` - Token lifetime (default: 24h)

---

## 🐛 Troubleshooting

### "Can't connect to http://SERVER_IP:4567"

1. **Check if app is running:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. **Check firewall:**
   ```bash
   sudo ufw status
   # Should show: 4567/tcp ALLOW
   ```

3. **Check app logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs app
   ```

4. **Test from server itself:**
   ```bash
   curl http://localhost:4567/health
   # If this works but external doesn't, it's a firewall issue
   ```

### "Can't connect to database"

Development issue - PostgreSQL not exposed in production (this is correct).

### "CORS errors"

Update `.env.production`:
```env
CORS_ORIGINS=https://your-frontend-domain.com
```

---

## 🎓 Next Steps

After environment setup:
1. ✅ Test development environment locally
2. ✅ Deploy to production server
3. ✅ Configure firewall
4. ✅ Set up SSL/TLS (nginx recommended)
5. ✅ Configure domain name
6. ✅ Set up backups
7. ✅ Configure monitoring

See `DOCKER.md` for detailed Docker commands and `DEPLOYMENT.md` for production setup guide.
