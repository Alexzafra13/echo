# 🖼️ Sistema de Gestión de Imágenes - Documentación

## 📋 Resumen

El sistema de imágenes funciona exactamente como esperabas:

### **Para ÁLBUMES**
- **Primero**: Usa la imagen que viene del disco (`coverArtPath`)
- **Si sustituyes**: Descarga de Fanart y guarda en `externalCoverPath`
- **Prioridad**: Externa > Local

### **Para ARTISTAS**
- **No hay imágenes por defecto**: Se descargan siempre de fuentes externas
- **Avatar/Background/Banner/Logo**: Se descargan de Fanart.tv o Last.fm
- **Si sustituyes**: Sobreescribe el archivo anterior

---

## 🗄️ Estructura de Base de Datos (LIMPIA)

### **Tabla `albums`**

```sql
-- ✅ Campos de imágenes (SOLO LOS NECESARIOS):
coverArtPath          VARCHAR(512)  -- Imagen LOCAL del disco/embebida
externalCoverPath     VARCHAR(512)  -- Imagen EXTERNA descargada (Fanart, etc.)
externalCoverSource   VARCHAR(50)   -- Proveedor (fanart, lastfm, musicbrainz)
externalInfoUpdatedAt TIMESTAMP     -- Para cache busting

-- ❌ ELIMINADOS (campos basura que nunca se usaban):
-- coverArtId
-- smallImageUrl
-- mediumImageUrl
-- largeImageUrl
```

### **Tabla `artists`**

```sql
-- ✅ Imágenes de perfil (3 tamaños):
smallImageUrl         VARCHAR(512)  -- Perfil pequeño (64x64)
mediumImageUrl        VARCHAR(512)  -- Perfil mediano (174x174)
largeImageUrl         VARCHAR(512)  -- Perfil grande (300x300+)

-- ✅ Imágenes decorativas:
backgroundImageUrl    VARCHAR(512)  -- Fondo HD (1920x1080+)
bannerImageUrl        VARCHAR(512)  -- Banner (1000x185+)
logoImageUrl          VARCHAR(512)  -- Logo con transparencia

-- ✅ Metadata:
externalInfoUpdatedAt TIMESTAMP     -- Para cache busting
biographySource       VARCHAR(50)   -- Fuente de biografía
```

---

## 📂 Estructura de Almacenamiento

```
storage/
├── metadata/
│   ├── artists/{artistId}/
│   │   ├── profile-small.jpg     ← Avatar pequeño
│   │   ├── profile-medium.jpg    ← Avatar mediano
│   │   ├── profile-large.jpg     ← Avatar grande
│   │   ├── background.jpg        ← Fondo HD
│   │   ├── banner.png            ← Banner
│   │   └── logo.png              ← Logo
│   │
│   └── albums/{albumId}/
│       └── cover.jpg             ← Portada EXTERNA
│
└── defaults/
    └── album-cover-default.png   ← Imagen por defecto

music/
└── Artist/
    └── Album/
        ├── cover.jpg             ← Portada LOCAL (opcional)
        └── 01 - Song.mp3
```

---

## 🔄 Flujo de Selección de Imagen (Tipo Jellyfin)

### **1️⃣ Usuario abre un artista/álbum**
```
Frontend: GET /api/artists/:id
         o GET /api/albums/:id
```

### **2️⃣ Sistema busca imágenes disponibles**
```
Admin: GET /admin/metadata/artist/:id/avatars/search
      o GET /admin/metadata/album/:id/covers/search

Backend consulta:
- Fanart.tv (backgrounds, banners, logos, covers)
- Last.fm (perfiles, biografías)
- Cover Art Archive (portadas oficiales)
```

### **3️⃣ Sistema muestra previsualizaciones**
```typescript
// Frontend muestra miniaturas desde URLs externas (NO descargadas aún)
avatars = [
  {
    url: "https://assets.fanart.tv/fanart/music/...",
    thumbnailUrl: "https://assets.fanart.tv/preview/music/...",
    provider: "fanart",
    type: "background",
    width: 1920,
    height: 1080
  },
  // ...más opciones
]
```

### **4️⃣ Usuario selecciona una imagen**
```
Frontend: POST /admin/metadata/artist/avatars/apply
{
  artistId: "xxx",
  avatarUrl: "https://assets.fanart.tv/...",
  provider: "fanart",
  type: "background"
}
```

### **5️⃣ Servidor descarga y guarda**
```typescript
// Backend (ApplyArtistAvatarUseCase):
1. Elimina imagen antigua del mismo tipo
   if (artist.backgroundImageUrl) {
     await fs.unlink(`storage/metadata/artists/${id}/background.jpg`);
   }

2. Descarga nueva imagen
   await imageDownload.downloadAndSave(
     "https://assets.fanart.tv/...",
     "storage/metadata/artists/${id}/background.jpg"
   );

3. Actualiza BD
   await prisma.artist.update({
     data: {
       backgroundImageUrl: "background.jpg",  // Solo nombre de archivo
       externalInfoUpdatedAt: new Date()      // Timestamp para cache busting
     }
   });
```

### **6️⃣ Servidor actualiza referencias**
```typescript
// Invalida cachés:
imageService.invalidateArtistCache(artistId);
redis.del(`artist:${artistId}`);

// Emite evento WebSocket:
metadataGateway.emitArtistImagesUpdated({
  artistId,
  imageType: "background",
  updatedAt: new Date()
});
```

### **7️⃣ Cliente actualiza vista**
```typescript
// Frontend recibe WebSocket event y refetch automático
useArtistMetadataSync(artistId);  // Hook escucha WebSocket

// React Query refetch:
queryClient.invalidateQueries(['artist', artistId]);

// Nueva URL con cache busting:
backgroundUrl = `/api/images/artists/${id}/background?v=1699999999`
```

---

## 🎯 Priorización de Imágenes

### **Álbumes**:
```typescript
// ImageService.getAlbumCover() línea 135
const coverPath = album.externalCoverPath || album.coverArtPath;

// Prioridad:
// 1. externalCoverPath (Fanart, Last.fm) ← EXTERNA
// 2. coverArtPath (disco)                ← LOCAL
// 3. defaults/album-cover-default.png    ← DEFECTO
```

### **Artistas (Avatar de perfil)**:
```typescript
// Frontend ArtistDetailPage línea 69-73
const profileUrl =
  artist.largeImageUrl ||      // 1. Grande (300x300+)
  artist.mediumImageUrl ||     // 2. Mediana (174x174)
  artist.smallImageUrl ||      // 3. Pequeña (64x64)
  null;                        // 4. Usar iniciales del nombre
```

### **Artistas (Fondo de hero)**:
```typescript
// Frontend ArtistDetailPage línea 58-60
const backgroundUrl =
  artistImages.background?.exists ? getUrl('background') :  // 1. Fondo HD
  artistImages.banner?.exists ? getUrl('banner') :          // 2. Banner
  artistAlbums[0]?.coverImage;                              // 3. Portada del álbum
```

---

## 🔧 Cache Busting

Todas las URLs de imágenes incluyen un timestamp para forzar actualización:

```typescript
// Backend - ArtistResponseDto línea 81-86
const timestamp = artist.externalInfoUpdatedAt || artist.updatedAt;
const v = new Date(timestamp).getTime();

smallImageUrl = `/api/images/artists/${id}/profile-small?v=${v}`;
```

**Resultado**:
```
/api/images/artists/123/background?v=1699364748291
                                      ↑
                        Cambia cuando se actualiza la imagen
                        → Navegador descarga nueva versión
```

---

## ✅ Verificación del Sistema

### **Test 1: Álbum con portada local**
```sql
-- BD:
coverArtPath = "/music/Artist/Album/cover.jpg"
externalCoverPath = NULL

-- Sistema usa: coverArtPath ✓
```

### **Test 2: Álbum con portada sustituida**
```sql
-- BD (antes de sustituir):
coverArtPath = "/music/Artist/Album/cover.jpg"
externalCoverPath = NULL

-- Usuario aplica imagen de Fanart:
POST /admin/metadata/album/covers/apply

-- BD (después):
coverArtPath = "/music/Artist/Album/cover.jpg"          ← NO SE TOCA
externalCoverPath = "/storage/metadata/albums/xxx/cover.jpg"  ← NUEVA
externalCoverSource = "fanart"
externalInfoUpdatedAt = 2025-11-09 12:34:56

-- Sistema usa: externalCoverPath ✓ (tiene prioridad)
```

### **Test 3: Artista sin imágenes**
```sql
-- BD:
smallImageUrl = NULL
mediumImageUrl = NULL
largeImageUrl = NULL
backgroundImageUrl = NULL

-- Frontend muestra: Iniciales del nombre ✓
```

### **Test 4: Artista con imagen aplicada**
```sql
-- Usuario aplica background de Fanart:
POST /admin/metadata/artist/avatars/apply

-- BD:
backgroundImageUrl = "background.jpg"
externalInfoUpdatedAt = 2025-11-09 12:34:56

-- Sistema sirve:
GET /api/images/artists/xxx/background?v=1699364096000 ✓
```

---

## 📝 Comandos para Aplicar Cambios

### **1. Aplicar migración de BD**:
```bash
cd server
npx prisma migrate deploy
```

### **2. Regenerar cliente Prisma**:
```bash
npx prisma generate
```

### **3. Verificar schema**:
```bash
npx prisma format
npx prisma validate
```

### **4. (Opcional) Aplicar migración manualmente**:
Si Prisma falla, puedes ejecutar SQL directamente:
```sql
-- Conectar a PostgreSQL y ejecutar:
ALTER TABLE "albums" DROP COLUMN IF EXISTS "cover_art_id";
ALTER TABLE "albums" DROP COLUMN IF EXISTS "small_image_url";
ALTER TABLE "albums" DROP COLUMN IF EXISTS "medium_image_url";
ALTER TABLE "albums" DROP COLUMN IF EXISTS "large_image_url";
```

---

## 🎉 Resumen de Cambios

### ✅ **Lo que se MANTIENE** (funciona correctamente):
- Sistema de priorización (Externa > Local)
- Flujo de selección tipo Jellyfin
- Cache busting con `externalInfoUpdatedAt`
- WebSocket para actualización en tiempo real
- Invalidación de caché (local + Redis)

### 🧹 **Lo que se LIMPIA** (campos basura eliminados):
- `albums.coverArtId` → ❌ NUNCA SE USABA
- `albums.smallImageUrl` → ❌ NUNCA SE USABA
- `albums.mediumImageUrl` → ❌ NUNCA SE USABA
- `albums.largeImageUrl` → ❌ NUNCA SE USABA

### 📐 **Resultado**:
- **Schema más limpio**: Solo campos que realmente se usan
- **Lógica más clara**: coverArtPath (local) vs externalCoverPath (externa)
- **Mantenimiento más fácil**: Menos confusión, menos campos

---

## 🚀 Próximos Pasos

1. ✅ Aplicar migración de BD
2. ✅ Verificar que el código compila
3. ✅ Probar flujo de sustitución de imágenes
4. ✅ Verificar cache busting en navegador

**El sistema ya funciona como esperabas, solo hemos limpiado lo que sobraba.**
