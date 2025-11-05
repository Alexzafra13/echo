-- Ver álbum recién escaneado
SELECT 
  id,
  name,
  "mbzAlbumId",
  "externalCoverPath",
  "externalCoverSource",
  "externalInfoUpdatedAt"
FROM albums
WHERE name LIKE '%DONDE QUIERO ESTAR%'
ORDER BY "createdAt" DESC
LIMIT 1;
