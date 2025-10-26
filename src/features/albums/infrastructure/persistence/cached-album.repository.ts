import { Injectable } from '@nestjs/common';
import { RedisService } from '@infrastructure/cache/redis.service';
import { Album } from '../../domain/entities/album.entity';
import { IAlbumRepository } from '../../domain/ports/album-repository.port';
import { PrismaAlbumRepository } from './album.repository';

/**
 * CachedAlbumRepository - Decorator Pattern con Redis Cache
 *
 * Implementa IAlbumRepository (mismo contrato que PrismaAlbumRepository)
 * Agrega caching transparente sin que el dominio lo sepa
 *
 * Patrón Cache-Aside:
 * 1. Check cache
 * 2. If miss → fetch from DB
 * 3. Store in cache
 * 4. Return data
 *
 * Ventajas:
 * - Domain layer NO cambia (sigue usando IAlbumRepository)
 * - Use cases NO cambian
 * - Solo cambiamos provider en AlbumsModule
 * - Cache transparente
 */
@Injectable()
export class CachedAlbumRepository implements IAlbumRepository {
  private readonly CACHE_TTL = parseInt(process.env.CACHE_ALBUM_TTL || '3600');
  private readonly KEY_PREFIX = 'album:';
  private readonly LIST_KEY_PREFIX = 'albums:';

  constructor(
    private readonly baseRepository: PrismaAlbumRepository,
    private readonly cache: RedisService,
  ) {}

  /**
   * Busca álbum por ID con cache
   */
  async findById(id: string): Promise<Album | null> {
    const cacheKey = `${this.KEY_PREFIX}${id}`;

    // 1. Check cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return Album.fromPrimitives ? Album.fromPrimitives(cached) : cached;
    }

    console.log(`❌ Cache MISS: ${cacheKey}`);

    // 2. Fetch from DB
    const album = await this.baseRepository.findById(id);

    // 3. Store in cache
    if (album) {
      const primitives = album.toPrimitives ? album.toPrimitives() : album;
      await this.cache.set(cacheKey, primitives, this.CACHE_TTL);
    }

    return album;
  }

  /**
   * Obtiene todos los álbumes
   * NOTA: Lista paginada NO se cachea (varía mucho)
   */
  async findAll(skip: number, take: number): Promise<Album[]> {
    // No cacheamos listas paginadas porque hay muchas combinaciones
    return this.baseRepository.findAll(skip, take);
  }

  /**
   * Busca álbumes por nombre
   * No se cachea por la variabilidad de búsquedas
   */
  async search(name: string, skip: number, take: number): Promise<Album[]> {
    return this.baseRepository.search(name, skip, take);
  }

  /**
   * Obtiene álbumes de un artista
   * Cachea la lista completa por artista
   */
  async findByArtistId(
    artistId: string,
    skip: number,
    take: number,
  ): Promise<Album[]> {
    const cacheKey = `${this.LIST_KEY_PREFIX}artist:${artistId}:${skip}:${take}`;

    // Check cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return cached.map((item: any) =>
        Album.fromPrimitives ? Album.fromPrimitives(item) : item,
      );
    }

    console.log(`❌ Cache MISS: ${cacheKey}`);

    // Fetch from DB
    const albums = await this.baseRepository.findByArtistId(
      artistId,
      skip,
      take,
    );

    // Store in cache
    if (albums.length > 0) {
      const primitives = albums.map((a) =>
        a.toPrimitives ? a.toPrimitives() : a,
      );
      await this.cache.set(cacheKey, primitives, this.CACHE_TTL);
    }

    return albums;
  }

  /**
   * Obtiene álbumes recientes
   * Cachea con TTL corto
   */
  async findRecent(take: number): Promise<Album[]> {
    const cacheKey = `${this.LIST_KEY_PREFIX}recent:${take}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return cached.map((item: any) =>
        Album.fromPrimitives ? Album.fromPrimitives(item) : item,
      );
    }

    const albums = await this.baseRepository.findRecent(take);

    if (albums.length > 0) {
      const primitives = albums.map((a) =>
        a.toPrimitives ? a.toPrimitives() : a,
      );
      // TTL más corto para listas "recent"
      await this.cache.set(cacheKey, primitives, 300); // 5 minutos
    }

    return albums;
  }

  /**
   * Obtiene álbumes más reproducidos
   */
  async findMostPlayed(take: number): Promise<Album[]> {
    const cacheKey = `${this.LIST_KEY_PREFIX}most-played:${take}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return cached.map((item: any) =>
        Album.fromPrimitives ? Album.fromPrimitives(item) : item,
      );
    }

    const albums = await this.baseRepository.findMostPlayed(take);

    if (albums.length > 0) {
      const primitives = albums.map((a) =>
        a.toPrimitives ? a.toPrimitives() : a,
      );
      await this.cache.set(cacheKey, primitives, 600); // 10 minutos
    }

    return albums;
  }

  /**
   * Cuenta total de álbumes
   * Cache con TTL largo
   */
  async count(): Promise<number> {
    const cacheKey = `${this.LIST_KEY_PREFIX}count`;

    const cached = await this.cache.get(cacheKey);
    if (cached !== null) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return cached;
    }

    const count = await this.baseRepository.count();
    await this.cache.set(cacheKey, count, 1800); // 30 minutos

    return count;
  }

  /**
   * Crea álbum e invalida cache
   */
  async create(album: Album): Promise<Album> {
    const created = await this.baseRepository.create(album);

    // Invalidar cache de listas
    await this.invalidateListCaches();

    return created;
  }

  /**
   * Actualiza álbum e invalida cache
   */
  async update(id: string, album: Partial<Album>): Promise<Album | null> {
    const updated = await this.baseRepository.update(id, album);

    if (updated) {
      // Invalidar cache del álbum específico
      await this.cache.del(`${this.KEY_PREFIX}${id}`);

      // Invalidar cache de listas
      await this.invalidateListCaches();
    }

    return updated;
  }

  /**
   * Elimina álbum e invalida cache
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await this.baseRepository.delete(id);

    if (deleted) {
      await this.cache.del(`${this.KEY_PREFIX}${id}`);
      await this.invalidateListCaches();
    }

    return deleted;
  }

  /**
   * Invalida todas las listas en cache
   * Se llama cuando hay escrituras (create, update, delete)
   */
  private async invalidateListCaches(): Promise<void> {
    // En Redis, podemos usar pattern matching para borrar múltiples keys
    // Por simplicidad, borramos las keys más comunes
    await Promise.all([
      this.cache.del(`${this.LIST_KEY_PREFIX}recent:*`),
      this.cache.del(`${this.LIST_KEY_PREFIX}most-played:*`),
      this.cache.del(`${this.LIST_KEY_PREFIX}count`),
    ]);
  }
}
