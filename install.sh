#!/bin/sh
# ============================================
# Echo Music Server — Quick Install
# ============================================
# Downloads docker-compose.yml and starts the server.
# Everything is auto-configured, no .env needed.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/Alexzafra13/echo/main/install.sh | sh
# ============================================

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎵 Echo Music Server — Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Check Docker ───────────────────────────
command -v docker >/dev/null 2>&1 || {
  echo "❌ Docker is not installed."
  echo "   Install it from: https://docs.docker.com/get-docker/"
  exit 1
}

# ── Download docker-compose.yml ────────────
if [ ! -f "docker-compose.yml" ]; then
  echo "📥 Downloading docker-compose.yml..."
  if command -v curl >/dev/null 2>&1; then
    curl -sSL -o docker-compose.yml \
      "https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO docker-compose.yml \
      "https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml"
  else
    echo "❌ Neither curl nor wget found."
    exit 1
  fi
  echo "✅ docker-compose.yml downloaded"
else
  echo "ℹ️  docker-compose.yml already exists"
fi

# ── Optional: generate .env with custom passwords ──
# Only if user wants extra security (not required)
if [ "$1" = "--secure" ] && [ ! -f ".env" ]; then
  echo ""
  echo "🔐 Generating custom passwords..."
  gen_pw() { head -c 32 /dev/urandom | base64 | tr -d '\n/+=@' | cut -c1-40; }
  cat > .env << EOF
POSTGRES_PASSWORD=$(gen_pw)
REDIS_PASSWORD=$(gen_pw)
EOF
  chmod 600 .env
  echo "✅ .env created with secure passwords"
fi

# ── Start ──────────────────────────────────
echo ""
echo "🚀 Starting Echo..."
echo ""

if docker compose version >/dev/null 2>&1; then
  docker compose up -d
else
  docker-compose up -d
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Echo is running!"
echo ""
echo "  Open: http://localhost:${ECHO_PORT:-4567}"
echo ""
echo "  Complete the setup wizard to create"
echo "  your admin account."
echo ""
echo "  Logs: docker compose logs -f echo"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
