import { AlbumMapper } from './album.mapper';
import { Album } from '../../domain/entities/album.entity';
import { Album as AlbumDb } from '@infrastructure/database/schema/albums';

type AlbumWithRelations = AlbumDb & {
  artist?: { name: string } | null;
};

describe('AlbumMapper', () => {
  const mockDbAlbum = {
    id: 'album-1',
    name: 'Abbey Road',
    artistId: 'artist-1',
    albumArtistId: 'artist-1',
    coverArtPath: '/covers/abbey.jpg',
    year: 1969,
    releaseDate: '1969-09-26',
    compilation: false,
    songCount: 17,
    duration: 2836,
    size: BigInt(500000000),
    description: 'Classic album',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
    artist: { name: 'The Beatles' },
  };

  describe('toDomain', () => {
    it('should convert DB album to domain Album', () => {
      const album = AlbumMapper.toDomain(mockDbAlbum as unknown as AlbumWithRelations);

      expect(album).toBeInstanceOf(Album);
      expect(album.id).toBe('album-1');
      expect(album.name).toBe('Abbey Road');
      expect(album.artistId).toBe('artist-1');
      expect(album.artistName).toBe('The Beatles');
      expect(album.year).toBe(1969);
      expect(album.compilation).toBe(false);
      expect(album.songCount).toBe(17);
      expect(album.size).toBe(500000000);
    });

    it('should handle null optional fields', () => {
      const album = AlbumMapper.toDomain({
        ...mockDbAlbum,
        artistId: null,
        albumArtistId: null,
        coverArtPath: null,
        year: null,
        releaseDate: null,
        description: null,
        artist: null,
      } as unknown as AlbumWithRelations);

      expect(album.artistId).toBeUndefined();
      expect(album.coverArtPath).toBeUndefined();
      expect(album.year).toBeUndefined();
      expect(album.releaseDate).toBeUndefined();
      expect(album.description).toBeUndefined();
      expect(album.artistName).toBeUndefined();
    });

    it('should convert releaseDate string to Date', () => {
      const album = AlbumMapper.toDomain(mockDbAlbum as unknown as AlbumWithRelations);
      expect(album.releaseDate).toBeInstanceOf(Date);
    });

    it('should default songCount and duration to 0 when null', () => {
      const album = AlbumMapper.toDomain({
        ...mockDbAlbum,
        songCount: null,
        duration: null,
        size: null,
      } as unknown as AlbumWithRelations);

      expect(album.songCount).toBe(0);
      expect(album.duration).toBe(0);
      expect(album.size).toBe(0);
    });
  });

  describe('toPersistence', () => {
    it('should convert domain album to persistence format', () => {
      const album = AlbumMapper.toDomain(mockDbAlbum as unknown as AlbumWithRelations);
      const persistence = AlbumMapper.toPersistence(album);

      expect(persistence.id).toBe('album-1');
      expect(persistence.name).toBe('Abbey Road');
      expect(persistence.artistId).toBe('artist-1');
      expect(persistence.compilation).toBe(false);
      expect(persistence.songCount).toBe(17);
    });

    it('should convert undefined optional fields to null', () => {
      const album = AlbumMapper.toDomain({
        ...mockDbAlbum,
        artistId: null,
        coverArtPath: null,
        year: null,
        releaseDate: null,
        description: null,
        artist: null,
      } as unknown as AlbumWithRelations);
      const persistence = AlbumMapper.toPersistence(album);

      expect(persistence.artistId).toBeNull();
      expect(persistence.coverArtPath).toBeNull();
      expect(persistence.year).toBeNull();
      expect(persistence.releaseDate).toBeNull();
      expect(persistence.description).toBeNull();
    });
  });

  describe('toDomainArray', () => {
    it('should convert array of DB albums to domain albums', () => {
      const albums = AlbumMapper.toDomainArray([
        mockDbAlbum,
        mockDbAlbum,
      ] as unknown as AlbumWithRelations[]);
      expect(albums).toHaveLength(2);
      expect(albums[0]).toBeInstanceOf(Album);
      expect(albums[1]).toBeInstanceOf(Album);
    });

    it('should handle empty array', () => {
      const albums = AlbumMapper.toDomainArray([]);
      expect(albums).toEqual([]);
    });
  });
});
