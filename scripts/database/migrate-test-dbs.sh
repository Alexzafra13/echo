#!/bin/bash
set -e

echo "Aplicando migraciones a las 4 BDs de test..."

# Obtener todos los archivos SQL de las migraciones
MIGRATION_FILES=$(find prisma/migrations -name "migration.sql" | sort)

for i in {0..3}; do
  echo "Migrando music_server_test_$i..."
  
  for migration_file in $MIGRATION_FILES; do
    echo "  Aplicando: $migration_file"
    docker exec -i music-server-db psql -U music_admin -d music_server_test_$i < "$migration_file"
  done
done

echo "✅ Migraciones aplicadas a todas las BDs de test"
