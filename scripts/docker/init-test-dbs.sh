#!/bin/sh
set -e

echo "Creando bases de datos de test..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname=postgres <<-EOSQL
    CREATE DATABASE music_server_test_0;
    GRANT ALL PRIVILEGES ON DATABASE music_server_test_0 TO music_admin;
    
    CREATE DATABASE music_server_test_1;
    GRANT ALL PRIVILEGES ON DATABASE music_server_test_1 TO music_admin;
    
    CREATE DATABASE music_server_test_2;
    GRANT ALL PRIVILEGES ON DATABASE music_server_test_2 TO music_admin;
    
    CREATE DATABASE music_server_test_3;
    GRANT ALL PRIVILEGES ON DATABASE music_server_test_3 TO music_admin;
EOSQL

echo "Bases de datos de test creadas exitosamente"
