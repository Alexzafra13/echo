#!/bin/sh
# Validates that all migration SQL files are registered in the drizzle journal
# Run this in CI to prevent unregistered migrations from being deployed

set -e

DRIZZLE_DIR="$(dirname "$0")/../drizzle"
JOURNAL_FILE="$DRIZZLE_DIR/meta/_journal.json"

if [ ! -f "$JOURNAL_FILE" ]; then
  echo "❌ Journal file not found: $JOURNAL_FILE"
  exit 1
fi

errors=0

# Get all SQL migration files (excluding meta folder)
for sql_file in "$DRIZZLE_DIR"/*.sql; do
  if [ -f "$sql_file" ]; then
    # Extract the tag (filename without .sql extension)
    filename=$(basename "$sql_file" .sql)

    # Check if this tag exists in the journal
    if ! grep -q "\"tag\": \"$filename\"" "$JOURNAL_FILE"; then
      echo "❌ Migration not registered in journal: $filename"
      errors=$((errors + 1))
    else
      echo "✓ $filename"
    fi
  fi
done

if [ $errors -gt 0 ]; then
  echo ""
  echo "❌ Found $errors unregistered migration(s)!"
  echo "   Run 'npx drizzle-kit generate' or manually add entries to $JOURNAL_FILE"
  exit 1
fi

echo ""
echo "✅ All migrations are properly registered in the journal"
