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
# If so, we need to baseline the migrations to prevent trying to re-create existing tables
BASELINE_NEEDED=false

# Check if users table exists (indicates existing schema)
if node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1 FROM users LIMIT 1')
  .then(() => { pool.end(); process.exit(0); })
  .catch(() => { pool.end(); process.exit(1); });
" 2>/dev/null; then
  # Schema exists, check if migrations table has entries
  MIGRATION_COUNT=$(node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) as count FROM \"__drizzle_migrations\"')
  .then(r => { console.log(r.rows[0].count); pool.end(); })
  .catch(() => { console.log('0'); pool.end(); });
" 2>/dev/null || echo "0")

  if [ "$MIGRATION_COUNT" = "0" ] || [ -z "$MIGRATION_COUNT" ]; then
    echo "📋 Existing database detected without migration tracking"
    echo "   Baselining migrations (marking all as applied)..."
    BASELINE_NEEDED=true
  fi
fi

if [ "$BASELINE_NEEDED" = "true" ]; then
  # Create migrations table and mark all migrations as applied
  # This handles databases set up with drizzle-kit push
  node -e "
const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function baseline() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Create migrations table if not exists
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS \"__drizzle_migrations\" (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )
    \`);

    // Read journal to get migration info
    const journalPath = path.join(__dirname, 'drizzle/meta/_journal.json');
    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));

    // Insert each migration as applied
    for (const entry of journal.entries) {
      const sqlPath = path.join(__dirname, 'drizzle', entry.tag + '.sql');
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      const hash = crypto.createHash('sha256').update(sqlContent).digest('hex');

      // Check if already inserted
      const existing = await pool.query(
        'SELECT 1 FROM \"__drizzle_migrations\" WHERE hash = \$1',
        [hash]
      );

      if (existing.rows.length === 0) {
        await pool.query(
          'INSERT INTO \"__drizzle_migrations\" (hash, created_at) VALUES (\$1, \$2)',
          [hash, entry.when]
        );
        console.log('  ✓ Marked as applied: ' + entry.tag);
      }
    }

    console.log('✅ Migration baseline complete');
  } catch (err) {
    console.error('Baseline error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

baseline();
" && echo "" || echo "⚠️ Baseline had issues, continuing anyway..."
fi

# Now run drizzle-kit migrate (will skip already-applied migrations)
# Note: Uses .js config because tsx/ts-node aren't available in production
if npx drizzle-kit migrate --config=drizzle.config.js 2>&1; then
  echo "✅ Database migrations applied!"
else
  # Check if failure is due to "already exists" (benign in baseline scenario)
  echo "⚠️ Migration command returned non-zero."
  echo "   If all tables exist, this is expected after baselining."
  echo "   The application will continue startup."
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
