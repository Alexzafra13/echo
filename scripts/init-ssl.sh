#!/bin/bash
# ============================================
# Echo Music Server - SSL Certificate Setup
# ============================================
# This script initializes SSL certificates using Let's Encrypt
# Run this BEFORE starting docker-compose.production.yml
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================
# Check prerequisites
# ============================================
print_info "Checking prerequisites..."

# Check if .env exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    print_info "Creating .env from .env.example..."
    cp .env.example .env
    print_warning "Please edit .env and set your DOMAIN variable!"
    print_info "Run: nano .env"
    exit 1
fi

# Load .env
source .env

# Check if DOMAIN is set
if [ -z "$DOMAIN" ]; then
    print_error "DOMAIN not set in .env!"
    print_info "Add this line to .env:"
    echo "DOMAIN=music.yourdomain.com"
    exit 1
fi

# Check if EMAIL is set
if [ -z "$SSL_EMAIL" ]; then
    print_error "SSL_EMAIL not set in .env!"
    print_info "Add this line to .env:"
    echo "SSL_EMAIL=your@email.com"
    exit 1
fi

print_success "Domain: $DOMAIN"
print_success "Email: $SSL_EMAIL"

# ============================================
# Check if domain resolves to this server
# ============================================
print_info "Checking DNS resolution..."

SERVER_IP=$(curl -s https://api.ipify.org)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

print_info "Your server IP: $SERVER_IP"
print_info "Domain resolves to: $DOMAIN_IP"

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    print_warning "Domain does not resolve to this server!"
    print_warning "Make sure your domain DNS points to: $SERVER_IP"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ============================================
# Create directories
# ============================================
print_info "Creating certificate directories..."

mkdir -p nginx/certbot/conf
mkdir -p nginx/certbot/www

print_success "Directories created"

# ============================================
# Generate temporary self-signed certificate
# ============================================
print_info "Generating temporary self-signed certificate..."

CERT_PATH="nginx/certbot/conf/live/$DOMAIN"
mkdir -p "$CERT_PATH"

if [ ! -f "$CERT_PATH/fullchain.pem" ]; then
    openssl req -x509 -nodes -newkey rsa:2048 \
        -days 1 \
        -keyout "$CERT_PATH/privkey.pem" \
        -out "$CERT_PATH/fullchain.pem" \
        -subj "/CN=$DOMAIN"

    print_success "Temporary certificate created"
else
    print_info "Certificate already exists, skipping"
fi

# ============================================
# Start Nginx temporarily (HTTP only)
# ============================================
print_info "Starting Nginx for certificate validation..."

# Create temporary Nginx config for HTTP-01 challenge
cat > nginx/http-only.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Echo Music Server - Certificate validation in progress';
        add_header Content-Type text/plain;
    }
}
EOF

# Start temporary Nginx container
docker run -d \
    --name echo-nginx-temp \
    -p 80:80 \
    -v "$(pwd)/nginx/http-only.conf:/etc/nginx/conf.d/default.conf:ro" \
    -v "$(pwd)/nginx/certbot/www:/var/www/certbot:ro" \
    nginx:alpine

print_success "Nginx started for validation"

# ============================================
# Request SSL certificate
# ============================================
print_info "Requesting SSL certificate from Let's Encrypt..."
print_warning "This may take a few minutes..."

docker run --rm \
    -v "$(pwd)/nginx/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/nginx/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $SSL_EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    print_success "SSL certificate obtained successfully!"
else
    print_error "Failed to obtain SSL certificate"
    print_info "Common issues:"
    print_info "1. Domain does not point to this server"
    print_info "2. Port 80 is not accessible from Internet"
    print_info "3. Firewall blocking traffic"

    # Cleanup
    docker stop echo-nginx-temp 2>/dev/null || true
    docker rm echo-nginx-temp 2>/dev/null || true

    exit 1
fi

# ============================================
# Cleanup temporary Nginx
# ============================================
print_info "Cleaning up..."

docker stop echo-nginx-temp
docker rm echo-nginx-temp
rm nginx/http-only.conf

print_success "Cleanup complete"

# ============================================
# Final instructions
# ============================================
echo ""
print_success "=========================================="
print_success "SSL Certificate Setup Complete!"
print_success "=========================================="
echo ""
print_info "Next steps:"
echo "  1. Start production server:"
echo "     docker compose -f docker-compose.production.yml up -d"
echo ""
echo "  2. Access your server:"
echo "     https://$DOMAIN"
echo ""
print_warning "Certificate will auto-renew every 12 hours"
print_info "Monitor renewal: docker compose -f docker-compose.production.yml logs certbot"
echo ""
