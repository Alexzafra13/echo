#!/bin/sh
set -e

echo "🚀 Starting Echo Music Server..."
echo ""

# ============================================
# 0. Setup Data Directory (Navidrome-style)
# ============================================
DATA_DIR="${DATA_PATH:-/app/data}"
SECRETS_FILE="$DATA_DIR/secrets.env"
SETUP_FILE="$DATA_DIR/setup.json"

# Create data directory structure
mkdir -p "$DATA_DIR"
mkdir -p "$DATA_DIR/metadata"
mkdir -p "$DATA_DIR/covers"
mkdir -p "$DATA_DIR/uploads"
mkdir -p "$DATA_DIR/logs"

echo "📁 Data directory: $DATA_DIR"

# ============================================
# 1. Auto-generate JWT Secrets (Jellyfin-style)
# ============================================
# Generate secrets if they don't exist OR if they're empty (FIRST RUN ONLY)
if [ ! -f "$SECRETS_FILE" ] || [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = '""' ] || [ "$JWT_SECRET" = "''" ]; then
  echo "🔐 Generating secure JWT secrets..."

  # Generate cryptographically secure secrets
  JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')
  JWT_REFRESH_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')

  # Save to persistent volume
  cat > "$SECRETS_FILE" << EOF
# Auto-generated JWT secrets (DO NOT EDIT MANUALLY)
# Generated on: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
JWT_SECRET="$JWT_SECRET"
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
EOF

  echo "✅ Secure JWT secrets generated"
  echo ""
else
  echo "ℹ️  Using existing JWT secrets"
  echo ""
fi

# Load secrets into environment
set -a
. "$SECRETS_FILE"
set +a

# Verify secrets are loaded
if [ -z "$JWT_SECRET" ] || [ -z "$JWT_REFRESH_SECRET" ]; then
  echo "❌ ERROR: JWT secrets failed to load from $SECRETS_FILE"
  exit 1
fi

echo "✅ JWT secrets loaded"

# ============================================
# 2. Wait for Dependencies
# ============================================
echo ""
echo "⏳ Waiting for PostgreSQL..."
until nc -z -v -w30 postgres 5432 2>/dev/null; do
  echo "   Waiting for database connection..."
  sleep 1
done
echo "✅ PostgreSQL is ready!"

echo "⏳ Waiting for Redis..."
until nc -z -v -w30 redis 6379 2>/dev/null; do
  echo "   Waiting for Redis connection..."
  sleep 1
done
echo "✅ Redis is ready!"
echo ""

# ============================================
# 3. Download ML Models (if not present)
# ============================================
MODELS_DIR="/app/models"
MODEL_FILE="$MODELS_DIR/htdemucs.onnx"
MODEL_URL="https://huggingface.co/webai-community/models/resolve/main/demucs.onnx"

mkdir -p "$MODELS_DIR"

if [ ! -f "$MODEL_FILE" ]; then
  echo "📥 Downloading stem separation model (~171MB)..."
  if command -v wget > /dev/null; then
    wget -q --show-progress -O "$MODEL_FILE" "$MODEL_URL" || echo "⚠️  Model download failed (stem separation will be unavailable)"
  elif command -v curl > /dev/null; then
    curl -L -o "$MODEL_FILE" "$MODEL_URL" || echo "⚠️  Model download failed (stem separation will be unavailable)"
  else
    echo "⚠️  No wget/curl available, skipping model download"
  fi

  if [ -f "$MODEL_FILE" ]; then
    echo "✅ Model downloaded successfully"
  fi
else
  echo "✅ ML model already present"
fi
echo ""

# ============================================
# 4. Database Migrations (Drizzle)
# ============================================
# Use lightweight migration script (drizzle-orm only, no drizzle-kit needed)
# This saves ~30MB in the Docker image
node scripts/run-migrations.js

# ============================================
# 5. Check Setup Status
# ============================================
echo ""
if [ -f "$SETUP_FILE" ]; then
  SETUP_COMPLETED=$(cat "$SETUP_FILE" | grep -o '"completed":true' || echo "")
  if [ -n "$SETUP_COMPLETED" ]; then
    echo "✅ Setup completed previously"
  else
    echo "📋 Setup wizard pending - complete at http://localhost:${PORT:-4567}"
  fi
else
  echo "🆕 First run detected!"
  echo "📋 Complete the setup wizard at http://localhost:${PORT:-4567}"
fi

echo ""
echo "✅ Initialization complete!"
echo ""

# ============================================
# 6. Start Application
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎵 Echo Music Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Environment: ${NODE_ENV:-production}"
echo "   Port: ${PORT:-4567}"
echo "   Data: $DATA_DIR"
echo ""
echo "   Access your server at:"
echo "   → http://localhost:${PORT:-4567}"
echo ""
if [ ! -f "$SETUP_FILE" ] || [ -z "$(cat "$SETUP_FILE" 2>/dev/null | grep -o '"completed":true')" ]; then
  echo "   ⚠️  FIRST RUN: Complete setup wizard to create admin account"
  echo ""
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the application
exec node dist/src/main.js
