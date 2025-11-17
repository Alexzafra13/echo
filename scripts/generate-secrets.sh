#!/usr/bin/env bash

# ============================================
# Generate Secure Secrets for Production
# ============================================
# This script generates cryptographically secure JWT secrets
# Similar to how Jellyfin handles configuration

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "=================================================="
echo "  Echo - Generate Production Secrets"
echo "=================================================="
echo -e "${NC}"
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
  echo -e "${YELLOW}⚠️  openssl not found. Using fallback method...${NC}"
  # Fallback: use /dev/urandom
  JWT_SECRET=$(head -c 64 /dev/urandom | base64)
  JWT_REFRESH_SECRET=$(head -c 64 /dev/urandom | base64)
else
  # Generate secure random secrets
  JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
  JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
fi

echo -e "${GREEN}✅ Secure secrets generated!${NC}"
echo ""
echo "Copy these values to your .env file:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}JWT_SECRET=${NC}"
echo "$JWT_SECRET"
echo ""
echo -e "${BLUE}JWT_REFRESH_SECRET=${NC}"
echo "$JWT_REFRESH_SECRET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⚠️  Keep these secrets private!${NC}"
echo "   Do not commit them to git."
echo ""

# Option to write to .env file
read -p "Do you want to automatically update .env file? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if [ -f ".env" ]; then
    # Backup existing .env
    cp .env .env.backup
    echo "✅ Backup created: .env.backup"

    # Update secrets in .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
      sed -i '' "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" .env
    else
      # Linux
      sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
      sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" .env
    fi

    echo "✅ .env file updated with new secrets!"
  else
    echo "⚠️  .env file not found. Please create it from .env.example first."
    exit 1
  fi
fi

echo ""
echo "Done! 🎵"
