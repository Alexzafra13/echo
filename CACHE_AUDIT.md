# Auditoría del Sistema de Caché de Imágenes

**Fecha**: 2025-11-08
**Contexto**: Investigación de problemas con caché de imágenes que impiden la actualización de avatares y carátulas

---

## 1. PROBLEMAS IDENTIFICADOS

### 1.1 Caché en Memoria sin Persistencia
**Ubicación**: `server/src/features/external-metadata/application/services/image.service.ts:46`

```typescript
private readonly imageCache = new Map<string, ImageResult>();
private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
```

**Problema**:
- Caché en memoria simple usando `Map<>` de JavaScript
- **CRÍTICO**: El caché NO se comparte entre múltiples instancias del servidor
- Si se reinicia el servidor, se pierde toda la caché
- No hay sincronización entre workers/instancias

**Impacto en Producción**:
- ❌ No funciona con PM2/cluster mode
- ❌ No funciona con múltiples contenedores Docker
- ❌ No funciona con Kubernetes (múltiples pods)
- ❌ Cada instancia tiene su propia caché desincronizada

### 1.2 TTL con `setTimeout`
**Ubicación**: `server/src/features/external-metadata/application/services/image.service.ts:422-432`

```typescript
private cacheImageResult(key: string, result: ImageResult): void {
  this.imageCache.set(key, result);

  // Invalidar caché después del TTL
  setTimeout(() => {
    this.imageCache.delete(key);
    this.logger.debug(`Cache expired for ${key}`);
  }, this.CACHE_TTL_MS);

  this.logger.debug(`Cached ${key} for ${this.CACHE_TTL_MS}ms`);
}
```

**Problemas**:
1. **Memory Leaks**: Cada vez que se cachea una imagen, se crea un `setTimeout` que permanece en memoria
2. Si la misma imagen se cachea múltiples veces antes de expirar, se crean múltiples `setTimeout` que nunca se limpian
3. No se puede cancelar el timeout si se invalida manualmente la caché

**Ejemplo del Problema**:
```typescript
// Primera solicitud - crea setTimeout #1
cacheImageResult('artist:123:background', imageData);

// Segunda solicitud (30s después) - crea setTimeout #2
cacheImageResult('artist:123:background', imageData);

// Resultado: 2 timeouts corriendo para la misma clave
// El primero no se cancela nunca
```

### 1.3 Falta de Invalidación Automática
**Ubicación**: `server/src/features/admin/domain/use-cases/`

**Problema Actual (RESUELTO con commit 1de6029)**:
- Los use-cases no llamaban a `invalidateArtistCache()` o `invalidateAlbumCache()`
- Las imágenes se actualizaban en disco pero el servidor seguía sirviendo las antiguas desde caché

**Estado Actual**:
```typescript
// apply-artist-avatar.use-case.ts:138-140
this.imageService.invalidateArtistCache(input.artistId);
this.logger.debug(`Invalidated image cache for artist ${input.artistId}`);

// apply-album-cover.use-case.ts:103-105
this.imageService.invalidateAlbumCache(input.albumId);
this.logger.debug(`Invalidated image cache for album ${input.albumId}`);
```

✅ **SOLUCIONADO**: Ahora se invalida correctamente al aplicar nuevas imágenes

### 1.4 Problema de Compilación TypeScript
**Problema Detectado**:
- Los cambios en archivos `.ts` no siempre se recompilan correctamente en modo watch
- Causa confusión porque el código fuente está correcto pero el JS compilado está desactualizado

**Solución Aplicada**:
```bash
rm -rf dist/src/features/admin/domain/use-cases/apply-artist-avatar
rm -rf dist/src/features/admin/domain/use-cases/apply-album-cover
# Reiniciar servidor para forzar recompilación
```

---

## 2. ARQUITECTURA ACTUAL DEL CACHÉ

### Flujo de Servicio de Imágenes

```
┌─────────────────────────────────────────────────────────────┐
│                    ImagesController                          │
│  GET /api/images/artists/:id/:type                          │
│  GET /api/images/albums/:id/cover                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   ImageService                               │
│                                                              │
│  1. Check in-memory cache (Map)                             │
│     ├─ HIT:  Return cached ImageResult                      │
│     └─ MISS: Continue to step 2                             │
│                                                              │
│  2. Query database (Prisma)                                 │
│     ├─ Artist: Get image URLs                               │
│     └─ Album:  Get cover path                               │
│                                                              │
│  3. Read file from disk                                     │
│     └─ Get size, mimeType, lastModified                     │
│                                                              │
│  4. Cache result with 5min TTL                              │
│     └─ Store in Map + create setTimeout                     │
│                                                              │
│  5. Return ImageResult                                      │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               HTTP Response Headers                          │
│  Cache-Control: public, max-age=31536000, immutable        │
│  ETag: "<timestamp>"                                        │
│  Last-Modified: <date>                                      │
└─────────────────────────────────────────────────────────────┘
```

### Doble Caché Actual

1. **Server-Side Cache (ImageService)**:
   - En memoria (Map)
   - TTL: 5 minutos
   - Scope: Por instancia del servidor

2. **Client-Side Cache (Browser)**:
   - HTTP Cache
   - max-age: 1 año (immutable)
   - Invalidación: URL versioning con `?v=timestamp`

---

## 3. MEJORES PRÁCTICAS RECOMENDADAS

### 3.1 Usar Redis para Caché Distribuido

**Por qué**:
- ✅ Compartido entre todas las instancias
- ✅ Sobrevive reinicios del servidor
- ✅ TTL nativo (no memory leaks)
- ✅ Listo para producción escalable

**Implementación**:

```typescript
// cache/redis-cache.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ImageResult } from '../types';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly TTL_SECONDS = 300; // 5 minutos

  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;

      this.logger.debug(`Cache hit: ${key}`);
      return JSON.parse(cached);
    } catch (error) {
      this.logger.error(`Cache read error for ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds || this.TTL_SECONDS;
      await this.redis.setex(key, ttl, JSON.stringify(value));
      this.logger.debug(`Cached ${key} for ${ttl}s`);
    } catch (error) {
      this.logger.error(`Cache write error for ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`Cache invalidated: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return;

      await this.redis.del(...keys);
      this.logger.debug(`Invalidated ${keys.length} keys matching ${pattern}`);
    } catch (error) {
      this.logger.error(`Cache pattern delete error for ${pattern}:`, error);
    }
  }
}
```

**Uso en ImageService**:

```typescript
@Injectable()
export class ImageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async getArtistImage(
    artistId: string,
    imageType: ArtistImageType,
  ): Promise<ImageResult> {
    const cacheKey = `image:artist:${artistId}:${imageType}`;

    // Check cache
    const cached = await this.cache.get<ImageResult>(cacheKey);
    if (cached) return cached;

    // ... fetch from DB and disk ...

    // Cache result
    await this.cache.set(cacheKey, imageResult);
    return imageResult;
  }

  async invalidateArtistCache(artistId: string): Promise<void> {
    // Invalidate all image types for this artist
    await this.cache.delPattern(`image:artist:${artistId}:*`);
    this.logger.debug(`Invalidated all cache for artist ${artistId}`);
  }
}
```

### 3.2 Caché de Dos Niveles (L1 + L2)

Para máximo rendimiento, combinar caché en memoria (L1) con Redis (L2):

```typescript
@Injectable()
export class TwoLevelCacheService {
  private readonly l1Cache = new LRUCache<string, any>({
    max: 500, // Máximo 500 items en memoria
    ttl: 60 * 1000, // 1 minuto en L1
  });

  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    // Check L1 (memory)
    let value = this.l1Cache.get(key);
    if (value) {
      this.logger.debug(`L1 cache hit: ${key}`);
      return value;
    }

    // Check L2 (Redis)
    const cached = await this.redis.get(key);
    if (cached) {
      value = JSON.parse(cached);
      this.l1Cache.set(key, value); // Promote to L1
      this.logger.debug(`L2 cache hit: ${key}`);
      return value;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.l1Cache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(key: string): Promise<void> {
    this.l1Cache.delete(key);
    await this.redis.del(key);
  }
}
```

### 3.3 Invalidación por Eventos

Usar eventos de NestJS para invalidar automáticamente:

```typescript
// events/image-updated.event.ts
export class ImageUpdatedEvent {
  constructor(
    public readonly entityType: 'artist' | 'album' | 'user',
    public readonly entityId: string,
    public readonly imageType?: string,
  ) {}
}

// use-cases/apply-artist-avatar.use-case.ts
@Injectable()
export class ApplyArtistAvatarUseCase {
  constructor(
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: ApplyArtistAvatarInput): Promise<ApplyArtistAvatarOutput> {
    // ... download and save image ...

    // Emit event for cache invalidation
    this.eventEmitter.emit(
      'image.updated',
      new ImageUpdatedEvent('artist', input.artistId, input.type),
    );

    return result;
  }
}

// listeners/cache-invalidation.listener.ts
@Injectable()
export class CacheInvalidationListener {
  constructor(private readonly cacheService: RedisCacheService) {}

  @OnEvent('image.updated')
  async handleImageUpdated(event: ImageUpdatedEvent): Promise<void> {
    const pattern = `image:${event.entityType}:${event.entityId}:*`;
    await this.cacheService.delPattern(pattern);
  }
}
```

### 3.4 Configuración por Entorno

```typescript
// config/cache.config.ts
export const cacheConfig = () => ({
  cache: {
    driver: process.env.CACHE_DRIVER || 'redis', // 'memory' | 'redis'
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // seconds
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_CACHE_DB || '1', 10),
    },
  },
});
```

### 3.5 Monitoreo y Métricas

```typescript
@Injectable()
export class CacheMetricsService {
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  recordEviction(): void {
    this.evictions++;
  }

  getMetrics() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: hitRate.toFixed(2) + '%',
      total,
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
}
```

---

## 4. PLAN DE MIGRACIÓN A PRODUCCIÓN

### Fase 1: Preparación (Desarrollo)
1. ✅ Implementar invalidación manual (COMPLETADO)
2. ⏳ Migrar de Map a Redis
3. ⏳ Agregar tests de integración para caché
4. ⏳ Configurar variables de entorno

### Fase 2: Staging
1. Desplegar con Redis
2. Monitorear hit rate y performance
3. Validar invalidación de caché
4. Load testing

### Fase 3: Producción
1. Configurar Redis con persistencia (AOF + RDB)
2. Configurar Redis Sentinel para HA
3. Monitoreo con Prometheus/Grafana
4. Alertas para cache misses > 50%

---

## 5. CHECKLIST PARA PRODUCCIÓN

### Configuración
- [ ] Redis configurado con persistencia
- [ ] Redis Sentinel/Cluster para alta disponibilidad
- [ ] Variables de entorno documentadas
- [ ] Secrets management (Redis password)

### Código
- [ ] Migracion de Map a Redis completada
- [ ] Eliminados setTimeout (memory leaks)
- [ ] Tests de integración para caché
- [ ] Logging estructurado para debugging

### Monitoreo
- [ ] Métricas de hit rate en Prometheus
- [ ] Alertas para cache misses altos
- [ ] Dashboard de rendimiento de caché
- [ ] Health checks de Redis

### Documentación
- [ ] Guía de troubleshooting de caché
- [ ] Runbook para invalidación manual
- [ ] Arquitectura de caché documentada
- [ ] Procedimientos de disaster recovery

---

## 6. COMANDOS ÚTILES

### Desarrollo Local
```bash
# Ver estado de Redis
docker exec -it echo-redis redis-cli INFO

# Ver todas las claves de caché
docker exec -it echo-redis redis-cli KEYS "image:*"

# Invalidar toda la caché
docker exec -it echo-redis redis-cli FLUSHDB

# Monitorear operaciones en tiempo real
docker exec -it echo-redis redis-cli MONITOR
```

### Producción
```bash
# Ver hit rate de Redis
redis-cli INFO stats | grep hit

# Ver uso de memoria
redis-cli INFO memory

# Backup manual
redis-cli BGSAVE

# Ver claves más grandes
redis-cli --bigkeys
```

---

## 7. CONCLUSIONES

### Problemas Críticos para Producción
1. ❌ **Caché en memoria no es escalable** - Bloqueante para multi-instancia
2. ❌ **Memory leaks con setTimeout** - Degrada performance con el tiempo
3. ✅ **Invalidación manual implementada** - Funcionando

### Prioridad de Mejoras
1. **CRÍTICO**: Migrar a Redis (elimina todos los problemas de escalabilidad)
2. **ALTO**: Eliminar setTimeout (soluciona memory leaks)
3. **MEDIO**: Implementar monitoreo de métricas
4. **BAJO**: Caché de dos niveles (optimización)

### Recomendación Final
**Migrar a Redis ANTES de producción**. El sistema actual funcionará en desarrollo con una sola instancia, pero fallará en producción con múltiples instancias/contenedores.

