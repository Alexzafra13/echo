-- Check what URLs are stored in the database for artists
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
ORDER BY name
LIMIT 10;
