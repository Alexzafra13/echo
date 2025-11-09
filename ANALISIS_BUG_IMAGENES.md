# 🐛 Análisis Exhaustivo: Bug de Actualización de Imágenes

## 📝 Reporte del Usuario

> "Antes si intentaba desde la web cambiar el avatar por otra imagen que me ofrecía al final no se cambiaba. La sensación con las carátulas era que se quedaban las mismas que tenía, osea que no funcionaba."

**Síntomas**:
- Al seleccionar una imagen desde la web (Fanart.tv), **no se actualiza** la vista
- Las carátulas/avatares se **quedan igual** que antes
- Parece que el cambio no surte efecto

---

## 🔍 Análisis del Flujo Completo

### 1️⃣ **ESCANEO INICIAL** (Cuando se mete un disco)

#### **Backend** (`scan-processor.service.ts`):
```typescript
// Línea 357-360: Extrae cover del disco
const coverPath = await coverArtService.extractAndCacheCover(albumId, trackPath);

// Línea 372: Guarda en BD SOLO el nombre del archivo
coverArtPath: coverPath || undefined  // ej: "abc-123.jpg"
```

#### **CoverArtService**:
- Extrae cover embebida o externa (cover.jpg, folder.jpg, etc.)
- Guarda en: `uploads/covers/{albumId}.jpg`
- Devuelve: `"{albumId}.jpg"` (solo nombre)

**✅ CORRECTO**: Las covers iniciales se extraen y guardan bien.

---

### 2️⃣ **APLICAR IMAGEN EXTERNA** (Cuando usuario selecciona de Fanart)

#### **Backend** (`apply-album-cover.use-case.ts`):
```typescript
// Línea 74-84: Determina dónde guardar
if (saveInFolder && album.tracks.length > 0) {
  coverPath = path.join(albumFolder, 'cover.jpg');  // En carpeta del álbum
} else {
  coverPath = path.join(metadataPath, 'cover.jpg'); // En metadata storage
}

// Línea 88: Descarga imagen
await imageDownload.downloadAndSave(input.coverUrl, coverPath);

// Línea 101: Guarda RUTA COMPLETA en BD
externalCoverPath: coverPath  // ej: "/storage/metadata/albums/xxx/cover.jpg"
externalCoverSource: input.provider
externalInfoUpdatedAt: new Date()  // ← CRÍTICO para cache busting
```

#### **Backend** (`apply-artist-avatar.use-case.ts`):
```typescript
// Línea 54-77: Determina tipo y nombre de archivo
switch (input.type) {
  case 'background':
    filename = 'background.jpg';
    dbField = 'backgroundImageUrl';
    break;
  // ...
}

// Línea 82-93: Elimina imagen antigua
if (oldPath) {
  await fs.unlink(fullOldPath);
}

// Línea 97: Descarga nueva imagen
await imageDownload.downloadAndSave(input.avatarUrl, imagePath);

// Línea 119-123 o 140-152: Actualiza BD con SOLO NOMBRE
{
  smallImageUrl: 'profile-small.jpg',
  mediumImageUrl: 'profile-medium.jpg',
  largeImageUrl: filename,
  externalInfoUpdatedAt: new Date()  // ← CRÍTICO
}
```

**✅ CORRECTO**: Backend descarga, guarda, y actualiza BD correctamente.

---

### 3️⃣ **INVALIDACIÓN DE CACHÉ**

#### **Backend** (ambos use cases):
```typescript
// Invalidar caché local del ImageService
imageService.invalidateArtistCache(artistId);
imageService.invalidateAlbumCache(albumId);

// Invalidar caché de Redis
await redis.del(`artist:${artistId}`);
await redis.del(`album:${albumId}`);

// Emitir evento WebSocket
metadataGateway.emitArtistImagesUpdated({ ... });
metadataGateway.emitAlbumCoverUpdated({ ... });
```

**✅ CORRECTO**: El backend invalida correctamente todos los cachés.

---

### 4️⃣ **SERVIR IMÁGENES** (GET /api/images/albums/:id/cover)

#### **ImageService.getAlbumCover()**:
```typescript
// Línea 125-127: Lee de BD
const album = await prisma.album.findUnique({
  select: { externalCoverPath, coverArtPath }
});

// Línea 135: Priorización
const coverPath = album.externalCoverPath || album.coverArtPath;

// Línea 150-152: Construye ruta completa si es solo nombre
if (!coverPath.includes('/') && !coverPath.includes('\\')) {
  fullPath = `uploads/covers/${coverPath}`;
}

// Línea 156: Sirve archivo
imageResult = await getImageFileInfo(fullPath);
```

**✅ CORRECTO**: Prioriza `externalCoverPath` sobre `coverArtPath`.

---

### 5️⃣ **CONSTRUCCIÓN DE URLs EN EL DTO**

#### **AlbumResponseDto**:
```typescript
// Línea 79: Usa externalInfoUpdatedAt para cache busting
const timestamp = data.externalInfoUpdatedAt || data.updatedAt;
const version = new Date(timestamp).getTime();

// Línea 82: Construye URL con versión
coverUrl = `/api/images/albums/${data.id}/cover?v=${version}`;
```

**✅ CORRECTO**: El timestamp se actualiza y la URL incluye el parámetro `?v=`.

---

### 6️⃣ **WEBSOCKET Y SINCRONIZACIÓN**

#### **Backend** (MetadataEnrichmentGateway):
```typescript
// Línea 186: Emite evento global
this.server.emit('artist:images:updated', payload);

// Línea 212: Emite evento de álbum
this.server.emit('album:cover:updated', payload);
```

#### **Frontend** (useArtistMetadataSync):
```typescript
// Línea 85: Escucha evento
socket.on('artist:images:updated', handleArtistImagesUpdated);

// Línea 62-65: Invalida queries
queryClient.invalidateQueries({
  queryKey: ['artists', data.artistId],
  refetchType: 'active'  // Fuerza refetch
});
```

**✅ CORRECTO**: Los hooks escuchan y invalidan queries correctamente.

---

### 7️⃣ **RE-RENDER EN REACT**

#### **ArtistDetailPage**:
```typescript
// Línea 27: Hook de sincronización activo
useArtistMetadataSync(id);

// Línea 31: Query de artista
const { data: artist } = useArtist(id);

// Línea 49-54: Timestamp para cache busting
const artistTimestamp = artist?.externalInfoUpdatedAt || artist?.updatedAt;

// Línea 59: Construye URL con timestamp
const backgroundUrl = getArtistImageUrl(id, 'background', artistTimestamp);

// Línea 129: key fuerza re-render cuando URL cambia
<div
  key={backgroundUrl}
  className={styles.background}
  style={{ backgroundImage: `url(${backgroundUrl})` }}
/>
```

**✅ CORRECTO**: El key fuerza re-render, el timestamp se actualiza.

---

## 🚨 POSIBLES CAUSAS DEL BUG

A pesar de que TODO el flujo parece correcto en el código, el usuario reporta que **NO funciona**. Las posibles causas son:

### **CAUSA #1: React Query no refetch** (MÁS PROBABLE)
- El hook `useArtistMetadataSync` invalida queries
- Pero React Query podría no estar haciendo refetch si:
  - La query está en `staleTime` largo
  - No hay un componente activo montado
  - El `refetchType: 'active'` solo refetch queries activas

**Solución**: Forzar refetch inmediato, no solo invalidar.

### **CAUSA #2: WebSocket no conectado**
- Si el WebSocket no está conectado, los eventos no llegan
- El frontend no invalida queries
- No hay refetch

**Solución**: Verificar conexión de WebSocket, agregar logs.

### **CAUSA #3: Cache del navegador**
- Aunque la URL cambia (`?v=timestamp`), el navegador podría:
  - Tener cache muy agresivo
  - No respetar el parámetro de query

**Solución**: Agregar headers `Cache-Control: no-cache` a las imágenes.

### **CAUSA #4: Timestamp no se propaga**
- Si `externalInfoUpdatedAt` no se actualiza correctamente en BD
- O si el DTO no lo lee bien
- El timestamp en la URL no cambia
- El navegador sirve imagen cacheada

**Solución**: Verificar que el timestamp se actualiza y propaga.

### **CAUSA #5: React no detecta cambio**
- Si el objeto `artist` tiene la misma referencia
- React podría no detectar el cambio
- No re-renderiza

**Solución**: Asegurar que React Query devuelve un nuevo objeto.

---

## 🔧 PLAN DE ACCIÓN

### **PASO 1: Agregar logs exhaustivos**
Para diagnosticar exactamente dónde falla:

1. **Backend**: Logs en ApplyArtistAvatarUseCase:
   ```typescript
   this.logger.log(`Before update: externalInfoUpdatedAt = ${artist.externalInfoUpdatedAt}`);
   // ...update...
   this.logger.log(`After update: externalInfoUpdatedAt = ${updatedArtist.externalInfoUpdatedAt}`);
   this.logger.log(`WebSocket event emitted: artist:images:updated`);
   ```

2. **Frontend**: Logs en useArtistMetadataSync:
   ```typescript
   console.log('[WebSocket] Event received:', data);
   console.log('[React Query] Invalidating queries for artist:', data.artistId);
   console.log('[React Query] Refetch triggered');
   ```

3. **Frontend**: Logs en ArtistDetailPage:
   ```typescript
   console.log('[Artist] Data updated:', artist);
   console.log('[Artist] Timestamp:', artistTimestamp);
   console.log('[Artist] Background URL:', backgroundUrl);
   ```

### **PASO 2: Forzar refetch en lugar de solo invalidar**
Cambiar `useArtistMetadataSync` para forzar refetch:

```typescript
// En lugar de solo invalidar:
queryClient.invalidateQueries({
  queryKey: ['artists', data.artistId],
  refetchType: 'active'
});

// Forzar refetch inmediato:
queryClient.refetchQueries({
  queryKey: ['artists', data.artistId],
  type: 'active'
});
```

### **PASO 3: Agregar headers Cache-Control**
En el controlador de imágenes:

```typescript
@Get('artists/:id/:type')
async getArtistImage(@Res() res: Response) {
  // ...
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.sendFile(imagePath);
}
```

### **PASO 4: Verificar conexión WebSocket**
Agregar indicador visual en el frontend:

```typescript
const socket = useMetadataWebSocket();
const [isConnected, setIsConnected] = useState(false);

useEffect(() => {
  if (!socket) return;

  socket.on('connect', () => {
    console.log('[WebSocket] Connected');
    setIsConnected(true);
  });

  socket.on('disconnect', () => {
    console.log('[WebSocket] Disconnected');
    setIsConnected(false);
  });
}, [socket]);
```

### **PASO 5: Fallback manual refetch**
Si el WebSocket falla, refetch manual al cerrar modal:

```typescript
// En ArtistAvatarSelectorModal, después de éxito:
onSuccess: async () => {
  // Forzar refetch manual como fallback
  await queryClient.refetchQueries({
    queryKey: ['artists', artistId]
  });

  // Dar tiempo para que la imagen se descargue
  setTimeout(() => {
    queryClient.refetchQueries({ queryKey: ['artists', artistId] });
  }, 1000);

  onSuccess?.();
  onClose();
}
```

---

## 📊 DIAGNÓSTICO RECOMENDADO

1. **Verificar en consola del navegador**:
   - ¿Aparecen los logs de `[WebSocket] Event received:`?
   - ¿Aparecen los logs de `[React Query] Invalidating queries`?
   - ¿Cambia el timestamp en `[Artist] Timestamp:`?
   - ¿Cambia la URL en `[Artist] Background URL:`?

2. **Verificar en Network tab**:
   - Después de aplicar imagen, ¿hay un nuevo request a `/api/images/artists/...`?
   - ¿El parámetro `?v=` es diferente?
   - ¿El status es 200 o 304 (cache)?

3. **Verificar en backend logs**:
   - ¿Se ejecuta `Downloaded image to: ...`?
   - ¿Se ejecuta `Artist updated. externalInfoUpdatedAt is now: ...`?
   - ¿Se ejecuta `Artist images updated: ... - notified via WebSocket`?

---

## 🎯 SOLUCIÓN MÁS PROBABLE

El problema más probable es que **React Query no está haciendo refetch inmediato**. La solución es:

1. Cambiar `invalidateQueries` por `refetchQueries` en los hooks de sync
2. Agregar refetch manual en el callback `onSuccess` del modal como fallback
3. Agregar headers `Cache-Control: no-cache` a las imágenes

Esto garantizará que:
- El refetch se dispara inmediatamente (no espera a que la query sea accedida)
- Hay un fallback manual si el WebSocket falla
- El navegador no cachea las imágenes

