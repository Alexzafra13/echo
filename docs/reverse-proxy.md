# Reverse Proxy

Configuración para exponer Echo con HTTPS en internet.

> **Nota:** El reverse proxy es **opcional**. Echo funciona directamente en `http://localhost:4567` para uso local/LAN.

## Requisitos

Echo necesita que el reverse proxy soporte:
- **SSE (Server-Sent Events)** (para sincronización en tiempo real)
- **Headers X-Forwarded-*** (para detectar HTTPS)

## Caddy (más simple)

SSL automático, configuración mínima.

### Instalación
```bash
# Debian/Ubuntu
sudo apt install caddy

# O con Docker
docker run -d -p 80:80 -p 443:443 -v caddy_data:/data caddy
```

### Configuración
```bash
# /etc/caddy/Caddyfile
music.tudominio.com {
    reverse_proxy localhost:4567
}
```

```bash
sudo systemctl reload caddy
```

---

## Nginx

Más control, configuración manual de SSL.

### Instalación
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

### Configuración

```bash
# Copiar configuración de ejemplo
sudo cp nginx/echo.conf /etc/nginx/sites-available/echo
sudo ln -s /etc/nginx/sites-available/echo /etc/nginx/sites-enabled/

# Editar dominio
sudo nano /etc/nginx/sites-available/echo
# Cambiar music.tudominio.com por tu dominio
```

### Obtener certificado SSL
```bash
sudo certbot --nginx -d music.tudominio.com
```

### Reiniciar
```bash
sudo nginx -t && sudo systemctl reload nginx
```

<details>
<summary><b>nginx/echo.conf completo</b></summary>

```nginx
# HTTP -> HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name music.tudominio.com;

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
    server_name music.tudominio.com;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/music.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/music.tudominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 100M;

    # Proxy a Echo
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

Ideal si ya usas Traefik con otros servicios Docker.

### docker-compose.yml con Traefik

```yaml
services:
  echo:
    image: ghcr.io/alexzafra13/echo:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.echo.rule=Host(`music.tudominio.com`)"
      - "traefik.http.routers.echo.tls=true"
      - "traefik.http.routers.echo.tls.certresolver=letsencrypt"
      - "traefik.http.services.echo.loadbalancer.server.port=4567"
    networks:
      - traefik
      - echo-network
    # ... resto de la configuración

networks:
  traefik:
    external: true
  echo-network:
```

---

## Cloudflare Tunnel

Sin abrir puertos, SSL incluido.

```bash
# Instalar cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Autenticar
cloudflared tunnel login

# Crear túnel
cloudflared tunnel create echo

# Configurar
cat > ~/.cloudflared/config.yml << EOF
tunnel: echo
credentials-file: /root/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: music.tudominio.com
    service: http://localhost:4567
  - service: http_status:404
EOF

# Ejecutar
cloudflared tunnel run echo
```

---

## Verificar configuración

Después de configurar el reverse proxy:

```bash
# Verificar HTTPS
curl -I https://music.tudominio.com

# Verificar SSE (Server-Sent Events)
curl -N -H "Accept: text/event-stream" https://music.tudominio.com/api/system/health/stream

# Verificar headers
curl -s -D - https://music.tudominio.com -o /dev/null | grep -i strict
```

## Solución de problemas

| Problema | Causa | Solución |
|----------|-------|----------|
| SSE no funciona | Buffering activo | Añadir `proxy_buffering off;` en nginx |
| Mixed Content (HTTP/HTTPS) | Radio HTTP en página HTTPS | Echo lo maneja automáticamente con proxy interno |
| 502 Bad Gateway | Echo no está corriendo | `docker compose logs echo` |
| Certificado inválido | Dominio no apunta al servidor | Verificar DNS |
