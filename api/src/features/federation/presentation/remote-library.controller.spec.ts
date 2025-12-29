import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RemoteLibraryController } from './remote-library.controller';
import { RemoteServerService } from '../infrastructure/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';
import { StreamTokenService } from '@features/streaming/infrastructure/services/stream-token.service';
import { getLoggerToken } from 'nestjs-pino';
import { User } from '@infrastructure/database/schema';
import { ConnectedServer } from '../domain/types';

describe('RemoteLibraryController', () => {
  let controller: RemoteLibraryController;
  let remoteServerService: jest.Mocked<RemoteServerService>;
  let repository: jest.Mocked<IFederationRepository>;

  const mockUser: User = {
    id: 'user-1',
    username: 'testuser',
    passwordHash: 'hash',
    name: 'Test User',
    isActive: true,
    isAdmin: false,
    mustChangePassword: false,
    theme: 'dark',
    language: 'en',
    lastLoginAt: null,
    lastAccessAt: null,
    avatarPath: null,
    avatarMimeType: null,
    avatarSize: null,
    avatarUpdatedAt: null,
    isPublicProfile: false,
    showTopTracks: true,
    showTopArtists: true,
    showTopAlbums: true,
    showPlaylists: true,
    bio: null,
    homeSections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConnectedServer: ConnectedServer = {
    id: 'server-1',
    userId: 'user-1',
    name: 'Test Server',
    baseUrl: 'https://test.example.com',
    authToken: 'auth-token',
    isActive: true,
    isOnline: true,
    lastOnlineAt: new Date(),
    lastCheckedAt: new Date(),
    remoteAlbumCount: 100,
    remoteTrackCount: 1000,
    remoteArtistCount: 50,
    lastSyncAt: new Date(),
    lastErrorAt: null,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RemoteLibraryController],
      providers: [
        {
          provide: getLoggerToken(RemoteLibraryController.name),
          useValue: mockLogger,
        },
        {
          provide: RemoteServerService,
          useValue: {
            getRemoteLibrary: jest.fn(),
            getRemoteAlbums: jest.fn(),
            getRemoteAlbum: jest.fn(),
            getRemoteAlbumCover: jest.fn(),
            streamRemoteTrack: jest.fn(),
          },
        },
        {
          provide: FEDERATION_REPOSITORY,
          useValue: {
            findConnectedServerById: jest.fn(),
            findConnectedServersByUserId: jest.fn(),
          },
        },
        {
          provide: StreamTokenService,
          useValue: {
            validateToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RemoteLibraryController>(RemoteLibraryController);
    remoteServerService = module.get(RemoteServerService);
    repository = module.get(FEDERATION_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSharedAlbums', () => {
    it('should return shared albums from all servers', async () => {
      repository.findConnectedServersByUserId.mockResolvedValue([mockConnectedServer]);
      remoteServerService.getRemoteAlbums.mockResolvedValue({
        albums: [
          {
            id: 'album-1',
            name: 'Test Album',
            artistName: 'Test Artist',
            artistId: 'artist-1',
            songCount: 10,
            duration: 3600,
            size: 100000000,
            coverUrl: 'https://test.example.com/cover.jpg',
          },
        ],
        total: 1,
      });

      const result = await controller.getSharedAlbums(mockUser, { page: 1, limit: 20 });

      expect(result.albums).toHaveLength(1);
      expect(result.albums[0].serverId).toBe(mockConnectedServer.id);
      expect(result.albums[0].serverName).toBe(mockConnectedServer.name);
      expect(result.albums[0].coverUrl).toBe('/api/federation/servers/server-1/albums/album-1/cover');
    });

    it('should return empty when no servers connected', async () => {
      repository.findConnectedServersByUserId.mockResolvedValue([]);

      const result = await controller.getSharedAlbums(mockUser, {});

      expect(result.albums).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.serverCount).toBe(0);
    });
  });

  describe('getRemoteLibrary', () => {
    it('should return remote library', async () => {
      repository.findConnectedServerById.mockResolvedValue(mockConnectedServer);
      remoteServerService.getRemoteLibrary.mockResolvedValue({
        albums: [
          {
            id: 'album-1',
            name: 'Test Album',
            artistName: 'Test Artist',
            artistId: 'artist-1',
            songCount: 10,
            duration: 3600,
            size: 100000000,
            coverUrl: 'https://remote.example.com/cover.jpg',
          },
        ],
        totalAlbums: 1,
        totalTracks: 10,
        totalArtists: 1,
      });

      const result = await controller.getRemoteLibrary(mockUser, 'server-1', { page: 1, limit: 50 });

      expect(result.albums).toHaveLength(1);
      expect(result.albums[0].coverUrl).toBe('/api/federation/servers/server-1/albums/album-1/cover');
    });

    it('should throw NotFoundException if server not found', async () => {
      repository.findConnectedServerById.mockResolvedValue(null);

      await expect(controller.getRemoteLibrary(mockUser, 'non-existent', { page: 1 }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own server', async () => {
      repository.findConnectedServerById.mockResolvedValue({
        ...mockConnectedServer,
        userId: 'other-user',
      });

      await expect(controller.getRemoteLibrary(mockUser, 'server-1', { page: 1 }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('getRemoteAlbums', () => {
    it('should return remote albums with transformed cover URLs', async () => {
      repository.findConnectedServerById.mockResolvedValue(mockConnectedServer);
      remoteServerService.getRemoteAlbums.mockResolvedValue({
        albums: [
          {
            id: 'album-1',
            name: 'Test Album',
            artistName: 'Test Artist',
            artistId: 'artist-1',
            songCount: 10,
            duration: 3600,
            size: 100000000,
            coverUrl: 'https://remote.example.com/cover.jpg',
          },
        ],
        total: 1,
      });

      const result = await controller.getRemoteAlbums(mockUser, 'server-1', { page: 1, limit: 50 });

      expect(result.albums[0].coverUrl).toBe('/api/federation/servers/server-1/albums/album-1/cover');
    });
  });

  describe('getRemoteAlbum', () => {
    it('should return remote album with tracks', async () => {
      repository.findConnectedServerById.mockResolvedValue(mockConnectedServer);
      remoteServerService.getRemoteAlbum.mockResolvedValue({
        id: 'album-1',
        name: 'Test Album',
        artistName: 'Test Artist',
        artistId: 'artist-1',
        songCount: 10,
        duration: 3600,
        size: 100000000,
        coverUrl: 'https://remote.example.com/cover.jpg',
        tracks: [],
      });

      const result = await controller.getRemoteAlbum(mockUser, 'server-1', 'album-1');

      expect(result.id).toBe('album-1');
      expect(result.coverUrl).toBe('/api/federation/servers/server-1/albums/album-1/cover');
    });
  });
});
