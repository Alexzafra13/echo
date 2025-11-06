-- Migration script to convert artist image URLs from local file paths to API URLs
-- Converts file:///C:/Users/.../storage/metadata/artists/{id}/profile-*.jpg to /api/images/artists/{id}/profile-*

UPDATE artists
SET
  small_image_url = CONCAT('/api/images/artists/', id, '/profile-small')
WHERE small_image_url IS NOT NULL
  AND small_image_url NOT LIKE '/api/%';

UPDATE artists
SET
  medium_image_url = CONCAT('/api/images/artists/', id, '/profile-medium')
WHERE medium_image_url IS NOT NULL
  AND medium_image_url NOT LIKE '/api/%';

UPDATE artists
SET
  large_image_url = CONCAT('/api/images/artists/', id, '/profile-large')
WHERE large_image_url IS NOT NULL
  AND large_image_url NOT LIKE '/api/%';

UPDATE artists
SET
  background_image_url = CONCAT('/api/images/artists/', id, '/background')
WHERE background_image_url IS NOT NULL
  AND background_image_url NOT LIKE '/api/%';

UPDATE artists
SET
  banner_image_url = CONCAT('/api/images/artists/', id, '/banner')
WHERE banner_image_url IS NOT NULL
  AND banner_image_url NOT LIKE '/api/%';

UPDATE artists
SET
  logo_image_url = CONCAT('/api/images/artists/', id, '/logo')
WHERE logo_image_url IS NOT NULL
  AND logo_image_url NOT LIKE '/api/%';

-- Show results
SELECT
  id,
  name,
  small_image_url,
  medium_image_url,
  large_image_url,
  background_image_url,
  banner_image_url,
  logo_image_url
FROM artists
WHERE small_image_url IS NOT NULL
   OR medium_image_url IS NOT NULL
   OR large_image_url IS NOT NULL
LIMIT 10;
