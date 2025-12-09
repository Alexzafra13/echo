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
# 3. Database Migrations (Drizzle)
# ============================================
echo "🔄 Running database migrations..."

# Check if this is a database that was set up with drizzle-kit push (no migrations tracking)
# If users table exists but migrations table is empty, we need to baseline
SCHEMA_EXISTS=$(node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1 FROM users LIMIT 1')
  .then(() => { console.log('yes'); pool.end(); })
  .catch(() => { console.log('no'); pool.end(); });
" 2>/dev/null || echo "no")

if [ "$SCHEMA_EXISTS" = "yes" ]; then
  # Check if migrations are tracked
  MIGRATION_COUNT=$(node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) as c FROM \"__drizzle_migrations\"')
  .then(r => { console.log(r.rows[0].c); pool.end(); })
  .catch(() => { console.log('0'); pool.end(); });
" 2>/dev/null || echo "0")

  if [ "$MIGRATION_COUNT" = "0" ] || [ -z "$MIGRATION_COUNT" ]; then
    echo "📋 Existing database without migration tracking - baselining..."
    # Insert migration tags as hashes (drizzle-kit format)
    node -e "
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function baseline() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS \"__drizzle_migrations\" (id SERIAL PRIMARY KEY, hash TEXT NOT NULL, created_at BIGINT NOT NULL)');
    const journal = JSON.parse(fs.readFileSync(path.join('/app', 'drizzle/meta/_journal.json'), 'utf8'));
    for (const e of journal.entries) {
      await pool.query('INSERT INTO \"__drizzle_migrations\" (hash, created_at) VALUES (\$1, \$2) ON CONFLICT DO NOTHING', [e.tag, e.when]);
      console.log('  ✓ ' + e.tag);
    }
    console.log('✅ Baseline complete');
  } catch (err) { console.error('Error:', err.message); }
  finally { await pool.end(); }
}
baseline();
"
  fi
fi

# Run drizzle-kit migrate
if npx drizzle-kit migrate --config=drizzle.config.js 2>&1; then
  echo "✅ Database migrations applied!"
else
  echo "⚠️ Migration returned non-zero (may be OK if schema exists)"
fi

# ============================================
# 4. Check Setup Status
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
# 5. Start Application
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
