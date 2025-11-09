# Análisis Comparativo: Echo vs Jellyfin - Sistema de Imágenes

## Problema Actual

**El usuario reporta**: Las imágenes de artistas no se actualizan visualmente cuando se seleccionan desde Fanart.tv, PERO los avatares de usuario sí funcionan correctamente.

**Causa raíz identificada**: El usuario está aplicando **la misma imagen repetidamente** (misma URL de Fanart.tv, mismo tamaño de archivo: 339329 bytes). El sistema funciona correctamente, pero no hay cambio visual porque es la misma imagen.

---

## Comparación Arquitectura: Echo vs Jellyfin

### 1. Almacenamiento en Disco

#### Echo Actual ✅ BIEN
```
storage/
├── metadata/
│   └── artists/
│       └── {artistId}/
│           ├── profile-small.jpg
│           ├── profile-medium.jpg
│           ├── profile-large.jpg
│           ├── background.jpg
│           ├── banner.jpg
│           └── logo.jpg
└── users/
    └── {userId}/
        └── avatar.jpg
```

**Ventajas**:
- Estructura clara por entidad
- Nombres descriptivos

**Desventajas**:
- Sin bucketing (performance degradation con miles de artistas)
- No almacena imágenes junto con archivos de música

#### Jellyfin ✅ MEJOR
```
# Opción 1: Junto con el Media
Music/
└── Artist Name/
    ├── folder.jpg       # Profile/Poster
    ├── fanart.jpg       # Background
    ├── banner.jpg
    ├── logo.png
    └── Album/
        ├── cover.jpg
        └── tracks...

# Opción 2: Metadata Central con Bucketing
data/metadata/library/
├── ab/
│   └── ab123456789.../ # ID-based folder
│       ├── folder.jpg
│       ├── fanart.jpg
│       └── ...
├── cd/
│   └── cd987654321.../
```

**Ventajas**:
- Bucketing previene degradación de performance
- Imágenes junto con media (prioridad local)
- Fallback a metadata centralizada

---

### 2. Esquema de Base de Datos

#### Echo Actual ⚠️ NECESITA MEJORA

**Artistas** (Líneas 86-91 schema.prisma):
```prisma
model Artist {
  smallImageUrl          String?   // Solo nombre de archivo
  mediumImageUrl         String?
  largeImageUrl          String?
  backgroundImageUrl     String?
  bannerImageUrl         String?
  logoImageUrl           String?
  externalInfoUpdatedAt  DateTime? // Cache busting GLOBAL
}
```

**Problemas**:
1. ❌ Solo guarda nombres de archivo, sin metadata
2. ❌ No distingue entre imágenes locales vs externas
3. ❌ `externalInfoUpdatedAt` es GLOBAL (no por imagen)
4. ❌ Sin Width/Height/BlurHash
5. ❌ Sin `lastModified` por imagen

**Álbumes** (Líneas 162-164 schema.prisma) ✅ MEJOR:
```prisma
model Album {
  coverArtPath         String?  // Local cover from disk ✅
  externalCoverPath    String?  // External (Fanart, etc.) ✅
  externalCoverSource  String?  // Provider name ✅
}
```

**Usuarios** ✅ EXCELENTE:
```prisma
model User {
  avatarPath        String?    // ✅ Ruta completa
  avatarMimeType    String?    // ✅ MIME type
  avatarSize        BigInt?    // ✅ Tamaño
  avatarUpdatedAt   DateTime?  // ✅ Timestamp específico
}
```

**POR ESO LOS AVATARES FUNCIONAN**: Tienen campos dedicados con metadata completa.

#### Jellyfin ✅ MEJOR

```csharp
public class BaseItem {
    public ItemImageInfo[] ImageInfos { get; set; }
}

public class ItemImageInfo {
    public string Path { get; set; }          // Ruta completa
    public DateTime DateModified { get; set; } // Por imagen ✅
    public ImageType Type { get; set; }       // Primary, Art, Backdrop, Banner, Logo...
    public int? Width { get; set; }
    public int? Height { get; set; }
    public string BlurHash { get; set; }       // Progressive loading
}
```

**Ventajas**:
- Array flexible de imágenes
- Metadata completa por imagen
- Timestamp independiente por imagen
- Soporte nativo para múltiples backdrops

---

### 3. Estrategia de Cache

#### Echo Actual ⚠️ PROBLEMA IDENTIFICADO

**Backend** (`image.service.ts`):
```typescript
private readonly imageCache = new Map<string, ImageResult>();
private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

invalidateArtistCache(artistId: string): void {
  // Borra el cache...
  this.imageCache.delete(cacheKey);
}

// PERO inmediatamente después:
async getArtistImage(...) {
  // Recachea por 5 minutos
  this.cacheImageResult(cacheKey, imageResult);
}
```

**Frontend**:
```typescript
// URL con timestamp
const url = getArtistImageUrl(id, 'background', timestamp); // ?v=1762692666979

// Problema: Si aplicas LA MISMA imagen de Fanart.tv, el navegador
// sirve del cache porque el contenido binario es idéntico
```

#### Jellyfin ✅ MEJOR

**Tag-based Cache Invalidation**:
```csharp
// Cuando imagen se actualiza:
item.UpdateToRepositoryAsync(ItemUpdateType.ImageUpdate, ...)
// ↑ Esto actualiza el "tag" del item

// URL incluye el tag:
GET /Items/{itemId}/Images/{imageType}?tag={unique-tag}
// Si tag cambia → nueva URL → browser refetch forzado
```

**Server-side**:
- AsyncKeyedLocker para serializar requests por URL
- 10-second cache para downloads (no para servir)
- Content-type validation

---

### 4. Estrategia de Descarga

#### Echo Actual ⚠️ REACTIVO

```typescript
// Solo descarga cuando el USUARIO hace clic en "Aplicar"
applyAvatar(avatarUrl, provider, type) {
  await downloadImage(avatarUrl);  // Download on-demand
  await saveToStorage(path);
  await updateDatabase();
  emitWebSocketEvent();
}
```

**Problemas**:
- No descarga durante escaneo de biblioteca
- Imágenes locales del disco NO se detectan/usan
- Siempre depende de APIs externas

#### Jellyfin ✅ PROACTIVO

**Durante Library Scan**:
```csharp
1. LocalImageProvider (Order: 0) - EJECUTA PRIMERO
   - Escanea carpeta del media
   - Detecta: folder.jpg, fanart.jpg, logo.png, etc.
   - Naming conventions por tipo de media

2. MetadataRefresh
   - Descarga imágenes faltantes de providers
   - Respeta configuración de fetchers
   - Lock-aware (items bloqueados skip remote)

3. InternalMetadataFolderImageProvider (Order: 1000) - ÚLTIMO
   - Fallback para imágenes ya descargadas
```

---

### 5. Priorización de Imágenes

#### Echo Actual ❌ NO IMPLEMENTADO

- No detecta imágenes locales junto al media
- Solo imágenes externas descargadas manualmente
- No hay lógica de prioridad

#### Jellyfin ✅ IMPLEMENTADO

**Priority Order**:
```
1. Local images WITH media (folder.jpg, fanart.jpg...)
2. Remote providers (Fanart.tv, Last.fm, MusicBrainz...)
3. Internal metadata folder (backups/downloads previos)
```

**Naming Conventions**:
```
Music:  "folder" > "poster" > "cover" > "jacket" > "albumart"
Videos: "poster" > "folder" > "cover" > "default" > "movie"
```

---

## Propuestas de Mejora para Echo

### 1. **INMEDIATO**: Mejorar Modelo de Artistas

**Aplicar el mismo patrón que Álbumes y Usuarios**:

```prisma
model Artist {
  // Profile Images: Local vs External
  profileImagePath        String?   @map("profile_image_path")        // Local (de carpeta del artista)
  externalProfilePath     String?   @map("external_profile_path")     // External (Fanart, Last.fm)
  externalProfileSource   String?   @map("external_profile_source")
  profileImageUpdatedAt   DateTime? @map("profile_image_updated_at")   // ✅ POR IMAGEN

  // Background: Local vs External
  backgroundImagePath     String?   @map("background_image_path")     // Local
  externalBackgroundPath  String?   @map("external_background_path")  // External
  externalBackgroundSource String?  @map("external_background_source")
  backgroundUpdatedAt     DateTime? @map("background_updated_at")      // ✅ POR IMAGEN

  // Banner: Local vs External
  bannerImagePath         String?   @map("banner_image_path")
  externalBannerPath      String?   @map("external_banner_path")
  externalBannerSource    String?   @map("external_banner_source")
  bannerUpdatedAt         DateTime? @map("banner_updated_at")          // ✅ POR IMAGEN

  // Logo: Local vs External
  logoImagePath           String?   @map("logo_image_path")
  externalLogoPath        String?   @map("external_logo_path")
  externalLogoSource      String?   @map("external_logo_source")
  logoUpdatedAt           DateTime? @map("logo_updated_at")            // ✅ POR IMAGEN

  // ELIMINAR:
  // smallImageUrl, mediumImageUrl, largeImageUrl - redundantes
  // externalInfoUpdatedAt - reemplazar por timestamps específicos
}
```

**Migración**:
```sql
-- Migrar datos existentes
UPDATE artists
SET
  external_background_path = background_image_url,
  background_updated_at = external_info_updated_at,
  external_logo_path = logo_image_url,
  logo_updated_at = external_info_updated_at,
  external_banner_path = banner_image_url,
  banner_updated_at = external_info_updated_at,
  external_profile_path = COALESCE(large_image_url, medium_image_url, small_image_url),
  profile_image_updated_at = external_info_updated_at
WHERE background_image_url IS NOT NULL
   OR logo_image_url IS NOT NULL
   OR banner_image_url IS NOT NULL
   OR large_image_url IS NOT NULL;

-- Luego drop columnas viejas
ALTER TABLE artists
  DROP COLUMN small_image_url,
  DROP COLUMN medium_image_url,
  DROP COLUMN large_image_url,
  DROP COLUMN background_image_url,
  DROP COLUMN banner_image_url,
  DROP COLUMN logo_image_url,
  DROP COLUMN external_info_updated_at;
```

### 2. **CORTO PLAZO**: LocalImageProvider durante Scan

**Detectar imágenes locales durante library scan**:

```typescript
// Durante escaneo de carpeta de artista
async scanArtistFolder(artistPath: string, artistId: string) {
  const imageFiles = await findImageFiles(artistPath);

  // Naming conventions
  const mappings = {
    'folder.jpg': 'profile',
    'fanart.jpg': 'background',
    'banner.jpg': 'banner',
    'logo.png': 'logo',
  };

  for (const [filename, imageType] of Object.entries(mappings)) {
    const foundFile = imageFiles.find(f =>
      path.basename(f).toLowerCase() === filename
    );

    if (foundFile) {
      await artist.update({
        [`${imageType}ImagePath`]: foundFile,
        [`${imageType}UpdatedAt`]: new Date(stats.mtime),
      });
    }
  }
}
```

### 3. **CORTO PLAZO**: Prioridad Local > Externo

**Modificar `image.service.ts`**:

```typescript
async getArtistImage(artistId: string, type: ImageType): Promise<ImageResult> {
  const artist = await this.prisma.artist.findUnique({ where: { id: artistId }});

  // PRIORIDAD 1: Local image
  const localPath = artist[`${type}ImagePath`];
  if (localPath && await fs.exists(localPath)) {
    return this.getImageFileInfo(localPath);
  }

  // PRIORIDAD 2: External image
  const externalPath = artist[`external${capitalize(type)}Path`];
  if (externalPath) {
    const fullPath = path.join(
      await storage.getArtistMetadataPath(artistId),
      externalPath
    );
    if (await fs.exists(fullPath)) {
      return this.getImageFileInfo(fullPath);
    }
  }

  throw new NotFoundException(`No ${type} image for artist ${artistId}`);
}
```

### 4. **MEDIO PLAZO**: Tag-based Cache Busting

**En lugar de `?v=timestamp`, usar `?tag=hash`**:

```typescript
// Generar tag único por imagen
function getImageTag(imagePath: string, updatedAt: Date): string {
  return createHash('md5')
    .update(`${imagePath}:${updatedAt.getTime()}`)
    .digest('hex')
    .substring(0, 8);
}

// URL con tag
const url = `/api/images/artists/${id}/${type}?tag=${tag}`;
// Si imagen cambia → tag diferente → nueva URL → browser refetch
```

### 5. **LARGO PLAZO**: ID-based Bucketing

**Para evitar degradación con miles de artistas**:

```typescript
function getArtistMetadataPath(artistId: string): string {
  const bucket = artistId.substring(0, 2);
  return path.join(
    storageRoot,
    'metadata',
    'artists',
    bucket,      // ← Bucketing
    artistId
  );
}

// Ejemplo:
// 8f2c57b6... → storage/metadata/artists/8f/8f2c57b6.../
// ab123456... → storage/metadata/artists/ab/ab123456.../
```

---

## Diagnóstico del Problema Actual

### ¿Por qué los avatares de usuario funcionan?

```prisma
model User {
  avatarPath        String?    // ✅ Ruta completa
  avatarUpdatedAt   DateTime?  // ✅ Timestamp específico
}
```

1. Campo dedicado `avatarUpdatedAt` ✅
2. Metadata completa (MIME, size) ✅
3. Ruta completa almacenada ✅
4. Cache invalidation específico ✅

### ¿Por qué las imágenes de artistas no funcionan?

```prisma
model Artist {
  backgroundImageUrl    String?   // ❌ Solo nombre archivo
  externalInfoUpdatedAt DateTime? // ❌ Timestamp GLOBAL
}
```

1. Solo nombre de archivo (no ruta completa) ❌
2. `externalInfoUpdatedAt` es GLOBAL (todas las imágenes usan mismo timestamp) ❌
3. Sin metadata individual por imagen ❌
4. **PERO EL PRINCIPAL PROBLEMA**: Usuario aplica la misma imagen repetidamente

**Evidencia de los logs**:
```
[ImageDownloadService] Downloading: billy-talent-4e9ae7830c7b4.jpg
[ImageDownloadService] Downloaded: 339329 bytes

// Usuario aplica "otra" imagen...

[ImageDownloadService] Downloading: billy-talent-4e9ae7830c7b4.jpg  ← MISMA URL
[ImageDownloadService] Downloaded: 339329 bytes  ← MISMO TAMAÑO
```

---

## Recomendaciones Priorizadas

### 🔴 **CRÍTICO** (Hacer ya)
1. Verificar que estás seleccionando imágenes DIFERENTES en Fanart.tv
2. Migrar modelo Artist para tener campos separados local/externo con timestamps por imagen
3. Actualizar `image.service.ts` para usar timestamps específicos

### 🟡 **IMPORTANTE** (Próxima semana)
4. Implementar LocalImageProvider durante library scan
5. Añadir prioridad Local > External
6. Cambiar a tag-based cache busting

### 🟢 **MEJORA** (Cuando haya tiempo)
7. ID-based bucketing
8. BlurHash para progressive loading
9. Width/Height en metadata
10. Soporte para múltiples backdrops

---

## Conclusión

**El sistema actual funciona**, pero tiene limitaciones arquitectónicas comparado con Jellyfin:

1. ✅ **Lo que funciona**: Backend, WebSocket, React Query, descarga de imágenes
2. ⚠️ **Lo que falta**: Timestamps por imagen, local image detection, priorización
3. ❌ **El problema reportado**: Usuario aplica la misma imagen → no hay cambio visual

**Próximo paso recomendado**: Migrar el modelo de Artist para replicar el patrón exitoso de User y Album, con campos dedicados y timestamps específicos por tipo de imagen.
