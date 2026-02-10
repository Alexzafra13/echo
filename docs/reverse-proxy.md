# Reverse Proxy

HTTPS configuration to expose Echo on the internet.

> **Note:** A reverse proxy is **optional**. Echo works directly at `http://localhost:4567` for local/LAN use.

## Requirements

Echo needs the reverse proxy to support:
- **WebSocket** (for real-time sync)
- **X-Forwarded-\* headers** (for HTTPS detection)

## Caddy (simplest)

Automatic SSL, minimal configuration.

### Install
```bash
# Debian/Ubuntu
sudo apt install caddy

# Or with Docker
docker run -d -p 80:80 -p 443:443 -v caddy_data:/data caddy
```

### Configure
```bash
# /etc/caddy/Caddyfile
music.yourdomain.com {
    reverse_proxy localhost:4567
}
```

```bash
sudo systemctl reload caddy
```

---

## Nginx

More control, manual SSL setup.

### Install
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

### Configure

```bash
# Copy example config
sudo cp nginx/echo.conf /etc/nginx/sites-available/echo
sudo ln -s /etc/nginx/sites-available/echo /etc/nginx/sites-enabled/

# Edit domain
sudo nano /etc/nginx/sites-available/echo
# Replace music.yourdomain.com with your domain
```

### Get SSL certificate
```bash
sudo certbot --nginx -d music.yourdomain.com
```

### Reload
```bash
sudo nginx -t && sudo systemctl reload nginx
```

<details>
<summary><b>Full nginx/echo.conf</b></summary>

```nginx
# HTTP -> HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name music.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name music.yourdomain.com;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/music.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/music.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 100M;

    # Proxy to Echo
    location / {
        proxy_pass http://localhost:4567;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    location ~ /\. {
        deny all;
    }
}
```

</details>

---

## Traefik

Ideal if you already use Traefik with other Docker services.

### docker-compose.yml with Traefik

```yaml
services:
  echo:
    image: ghcr.io/alexzafra13/echo:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.echo.rule=Host(`music.yourdomain.com`)"
      - "traefik.http.routers.echo.tls=true"
      - "traefik.http.routers.echo.tls.certresolver=letsencrypt"
      - "traefik.http.services.echo.loadbalancer.server.port=4567"
    networks:
      - traefik
      - echo-network
    # ... rest of your configuration

networks:
  traefik:
    external: true
  echo-network:
```

---

## Cloudflare Tunnel

No open ports needed, SSL included.

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create echo

# Configure
cat > ~/.cloudflared/config.yml << EOF
tunnel: echo
credentials-file: /root/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: music.yourdomain.com
    service: http://localhost:4567
  - service: http_status:404
EOF

# Run
cloudflared tunnel run echo
```

---

## Verify Setup

After configuring the reverse proxy:

```bash
# Verify HTTPS
curl -I https://music.yourdomain.com

# Verify WebSocket
curl -I -H "Upgrade: websocket" -H "Connection: Upgrade" https://music.yourdomain.com

# Verify headers
curl -s -D - https://music.yourdomain.com -o /dev/null | grep -i strict
```

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| WebSocket won't connect | Missing upgrade proxy | Add `Upgrade` and `Connection` headers |
| Mixed Content (HTTP/HTTPS) | HTTP radio on HTTPS page | Echo handles this automatically with internal proxy |
| 502 Bad Gateway | Echo is not running | `docker compose logs echo` |
| Invalid certificate | Domain not pointing to server | Check DNS records |
