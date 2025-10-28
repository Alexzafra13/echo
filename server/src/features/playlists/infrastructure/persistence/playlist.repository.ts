import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { IPlaylistRepository } from '../../domain/ports';
import { Playlist, PlaylistTrack } from '../../domain/entities';
import { Track } from '@features/tracks/domain/entities/track.entity';
import { PlaylistMapper } from '../mappers/playlist.mapper';
import { TrackMapper } from '@features/tracks/infrastructure/persistence/track.mapper';

@Injectable()
export class PrismaPlaylistRepository implements IPlaylistRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Playlist CRUD
  async findById(id: string): Promise<Playlist | null> {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
    });

    if (!playlist) {
      return null;
    }

    return PlaylistMapper.toDomain(playlist);
  }

  async findByOwnerId(ownerId: string, skip: number, take: number): Promise<Playlist[]> {
    const playlists = await this.prisma.playlist.findMany({
      where: { ownerId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return PlaylistMapper.toDomainArray(playlists);
  }

  async findPublic(skip: number, take: number): Promise<Playlist[]> {
    const playlists = await this.prisma.playlist.findMany({
      where: { public: true },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return PlaylistMapper.toDomainArray(playlists);
  }

  async search(name: string, skip: number, take: number): Promise<Playlist[]> {
    const playlists = await this.prisma.playlist.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return PlaylistMapper.toDomainArray(playlists);
  }

  async count(): Promise<number> {
    return this.prisma.playlist.count();
  }

  async countByOwnerId(ownerId: string): Promise<number> {
    return this.prisma.playlist.count({
      where: { ownerId },
    });
  }

  async create(playlist: Playlist): Promise<Playlist> {
    const data = PlaylistMapper.toPrisma(playlist);

    const created = await this.prisma.playlist.create({
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        coverImageUrl: data.coverImageUrl,
        duration: data.duration,
        size: data.size,
        ownerId: data.ownerId,
        public: data.public,
        songCount: data.songCount,
        path: data.path,
        sync: data.sync,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });

    return PlaylistMapper.toDomain(created);
  }

  async update(id: string, playlist: Partial<Playlist>): Promise<Playlist | null> {
    const props = playlist.toPrimitives ? playlist.toPrimitives() : (playlist as any);

    const updated = await this.prisma.playlist.update({
      where: { id },
      data: {
        name: props.name,
        description: props.description,
        coverImageUrl: props.coverImageUrl,
        duration: props.duration,
        size: props.size,
        public: props.public,
        songCount: props.songCount,
        updatedAt: new Date(),
      },
    });

    return PlaylistMapper.toDomain(updated);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.playlist.delete({
      where: { id },
    });

    return !!result;
  }

  // PlaylistTrack management
  async addTrack(playlistTrack: PlaylistTrack): Promise<PlaylistTrack> {
    const data = PlaylistMapper.playlistTrackToPrisma(playlistTrack);

    const created = await this.prisma.playlistTrack.create({
      data: {
        id: data.id,
        playlistId: data.playlistId,
        trackId: data.trackId,
        trackOrder: data.trackOrder,
        createdAt: data.createdAt,
      },
    });

    return PlaylistMapper.playlistTrackToDomain(created);
  }

  async removeTrack(playlistId: string, trackId: string): Promise<boolean> {
    const result = await this.prisma.playlistTrack.deleteMany({
      where: {
        playlistId,
        trackId,
      },
    });

    return result.count > 0;
  }

  async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    const playlistTracks = await this.prisma.playlistTrack.findMany({
      where: { playlistId },
      include: { track: true },
      orderBy: { trackOrder: 'asc' },
    });

    return playlistTracks.map((pt) => TrackMapper.toDomain(pt.track));
  }

  async reorderTracks(
    playlistId: string,
    trackOrders: Array<{ trackId: string; order: number }>,
  ): Promise<boolean> {
    // Usar transacción para actualizar todos los órdenes
    await this.prisma.$transaction(
      trackOrders.map((item) =>
        this.prisma.playlistTrack.updateMany({
          where: {
            playlistId,
            trackId: item.trackId,
          },
          data: {
            trackOrder: item.order,
          },
        }),
      ),
    );

    return true;
  }

  async isTrackInPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    const count = await this.prisma.playlistTrack.count({
      where: {
        playlistId,
        trackId,
      },
    });

    return count > 0;
  }
}
