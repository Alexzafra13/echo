-- Script para poblar orderAlbumName y orderAlbumArtistName en álbumes existentes
-- Este script normaliza los nombres para ordenamiento alfabético

-- Función para remover acentos (PostgreSQL)
CREATE OR REPLACE FUNCTION remove_accents(text) RETURNS text AS $$
  SELECT translate(
    $1,
    'áàâãäåāăąÁÀÂÃÄÅĀĂĄéèêëēĕėęěÉÈÊËĒĔĖĘĚíìîïĩīĭįıÍÌÎÏĨĪĬĮİóòôõöōŏőøÓÒÔÕÖŌŎŐØúùûüũūŭůűųÚÙÛÜŨŪŬŮŰŲýÿÝŸñÑçÇ',
    'aaaaaaaaaaaaaaaaaaeeeeeeeeeeeeeeeeiiiiiiiiiiiiiiiioooooooooooooooooouuuuuuuuuuuuuuuuuuyyyynncc'
  );
$$ LANGUAGE SQL IMMUTABLE STRICT;

-- Función para remover artículos comunes
CREATE OR REPLACE FUNCTION remove_articles(text) RETURNS text AS $$
  SELECT CASE
    -- Artículos en inglés (case insensitive)
    WHEN LOWER($1) ~ '^the ' THEN SUBSTRING($1 FROM 5)
    WHEN LOWER($1) ~ '^a ' THEN SUBSTRING($1 FROM 3)
    WHEN LOWER($1) ~ '^an ' THEN SUBSTRING($1 FROM 4)
    -- Artículos en español
    WHEN LOWER($1) ~ '^el ' THEN SUBSTRING($1 FROM 4)
    WHEN LOWER($1) ~ '^la ' THEN SUBSTRING($1 FROM 4)
    WHEN LOWER($1) ~ '^los ' THEN SUBSTRING($1 FROM 5)
    WHEN LOWER($1) ~ '^las ' THEN SUBSTRING($1 FROM 5)
    WHEN LOWER($1) ~ '^un ' THEN SUBSTRING($1 FROM 4)
    WHEN LOWER($1) ~ '^una ' THEN SUBSTRING($1 FROM 5)
    ELSE $1
  END;
$$ LANGUAGE SQL IMMUTABLE STRICT;

-- Actualizar orderAlbumName para todos los álbumes
UPDATE albums
SET order_album_name = LOWER(remove_accents(remove_articles(COALESCE(title, ''))))
WHERE order_album_name IS NULL OR order_album_name = '';

-- Actualizar orderAlbumArtistName basado en el artista asociado
UPDATE albums a
SET order_album_artist_name = LOWER(remove_accents(remove_articles(COALESCE(ar.name, ''))))
FROM artists ar
WHERE a.artist_id = ar.id
  AND (a.order_album_artist_name IS NULL OR a.order_album_artist_name = '');

-- Actualizar orderArtistName para todos los artistas
UPDATE artists
SET order_artist_name = LOWER(remove_accents(remove_articles(COALESCE(name, ''))))
WHERE order_artist_name IS NULL OR order_artist_name = '';

-- Verificar resultados
DO $$
DECLARE
  album_count INTEGER;
  artist_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO album_count FROM albums WHERE order_album_name IS NOT NULL;
  SELECT COUNT(*) INTO artist_count FROM artists WHERE order_artist_name IS NOT NULL;

  RAISE NOTICE '✓ Actualización completada:';
  RAISE NOTICE '  - % álbumes actualizados', album_count;
  RAISE NOTICE '  - % artistas actualizados', artist_count;
END $$;
