-- Limpiar registros huérfanos de la base de datos
-- Estos son registros con isActive=false que ya no se usan

-- Ver cuántos registros huérfanos hay
SELECT
  (SELECT COUNT(*) FROM custom_artist_images WHERE is_active = false) as orphaned_artist_images,
  (SELECT COUNT(*) FROM custom_album_covers WHERE is_active = false) as orphaned_album_covers;

-- Eliminar imágenes de artistas inactivas
DELETE FROM custom_artist_images WHERE is_active = false;

-- Eliminar carátulas de álbumes inactivas
DELETE FROM custom_album_covers WHERE is_active = false;

-- Verificar que se eliminaron
SELECT
  (SELECT COUNT(*) FROM custom_artist_images WHERE is_active = false) as remaining_artist_images,
  (SELECT COUNT(*) FROM custom_album_covers WHERE is_active = false) as remaining_album_covers;
