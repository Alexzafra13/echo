import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { FederationPublicController } from './federation-public.controller';
import { FederationTokenService } from '../domain/services';
import { IFederationLibraryRepository, FEDERATION_LIBRARY_REPOSITORY } from '../domain/ports';
import { CoverArtService } from '@shared/services';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { getLoggerToken } from 'nestjs-pino';
import { FederationAccessToken } from '../domain/types';
import { FastifyReply } from 'fastify';
import { RequestWithFederationToken } from '@shared/types/request.types';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  createReadStream: jest.fn(),
  statSync: jest.fn(),
}));

describe('FederationPublicController', () => {
  let controller: FederationPublicController;
  let tokenService: jest.Mocked<FederationTokenService>;
  let libraryRepo: jest.Mocked<IFederationLibraryRepository>;
  let coverArtService: jest.Mocked<CoverArtService>;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockAccessToken: FederationAccessToken = {
    id: 'access-1',
    token: 'valid-access-token',
    ownerId: 'owner-1',
    serverName: 'Remote Server',
    serverUrl: 'https://remote.example.com',
    permissions: { canBrowse: true, canStream: true, canDownload: true },
    isActive: true,
    lastUsedAt: new Date(),
    lastUsedIp: null,
    expiresAt: null,
    mutualInvitationToken: null,
    mutualStatus: 'none',
    mutualRespondedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockRequest = (accessToken?: FederationAccessToken): RequestWithFederationToken =>
    ({
      ip: '192.168.1.1',
      federationAccessToken: accessToken,
    }) as unknown as RequestWithFederationToken;

  const createMockReply = (): FastifyReply => {
    const reply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      raw: {
        writeHead: jest.fn(),
        destroyed: false,
      },
    };
    return reply as unknown as FastifyReply;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FederationPublicController],
      providers: [
        {
          provide: getLoggerToken(FederationPublicController.name),
          useValue: mockLogger,
        },
        {
          provide: FederationTokenService,
          useValue: {
            useInvitationToken: jest.fn(),
            validateAccessToken: jest.fn(),
            revokeAccessToken: jest.fn(),
          },
        },
        {
          provide: FEDERATION_LIBRARY_REPOSITORY,
          useValue: {
            getCounts: jest.fn(),
            findAlbums: jest.fn(),
            findAlbumById: jest.fn(),
            findAlbumCoverPath: jest.fn(),
            findTrackPath: jest.fn(),
            findAlbumTracks: jest.fn(),
            findAlbumDjAnalysis: jest.fn(),
            findAlbumForExport: jest.fn(),
            findAlbumTracksForExport: jest.fn(),
            findAlbumForDownload: jest.fn(),
            findAlbumTrackPaths: jest.fn(),
          },
        },
        {
          provide: CoverArtService,
          useValue: {
            getCoverPath: jest.fn(),
          },
        },
        {
          provide: SettingsService,
          useValue: {
            getString: jest.fn().mockResolvedValue(''),
            set: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<FederationPublicController>(FederationPublicController);
    tokenService = module.get(FederationTokenService);
    libraryRepo = module.get(FEDERATION_LIBRARY_REPOSITORY);
    coverArtService = module.get(CoverArtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Connection endpoints
  // ============================================

  describe('connect', () => {
    it('should connect using valid invitation token', async () => {
      const dto = {
        invitationToken: 'ABCD-1234',
        serverName: 'Test Server',
        serverUrl: 'https://test.example.com',
      };

      tokenService.useInvitationToken.mockResolvedValue(mockAccessToken);
      libraryRepo.getCounts.mockResolvedValue({ albumCount: 10, trackCount: 100, artistCount: 5 });

      const request = createMockRequest();

      const result = await controller.connect(dto, request);

      expect(result.accessToken).toBe(mockAccessToken.token);
      expect(result.serverInfo).toBeDefined();
      expect(tokenService.useInvitationToken).toHaveBeenCalledWith(
        dto.invitationToken,
        dto.serverName,
        dto.serverUrl,
        request.ip,
        undefined
      );
    });

    it('should connect with mutual federation request', async () => {
      const dto = {
        invitationToken: 'ABCD-1234',
        serverName: 'Test Server',
        serverUrl: 'https://test.example.com',
        requestMutual: true,
        mutualInvitationToken: 'MUTUAL-TOKEN',
      };

      tokenService.useInvitationToken.mockResolvedValue(mockAccessToken);
      libraryRepo.getCounts.mockResolvedValue({ albumCount: 10, trackCount: 100, artistCount: 5 });

      const request = createMockRequest();

      await controller.connect(dto, request);

      expect(tokenService.useInvitationToken).toHaveBeenCalledWith(
        dto.invitationToken,
        dto.serverName,
        dto.serverUrl,
        request.ip,
        dto.mutualInvitationToken
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const dto = {
        invitationToken: 'INVALID',
        serverName: 'Test Server',
      };

      tokenService.useInvitationToken.mockResolvedValue(null);

      const request = createMockRequest();

      await expect(controller.connect(dto, request)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('ping', () => {
    it('should return ok with timestamp', async () => {
      const result = await controller.ping();

      expect(result.ok).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('getInfo', () => {
    it('should return server info', async () => {
      libraryRepo.getCounts.mockResolvedValue({
        albumCount: 100,
        trackCount: 500,
        artistCount: 50,
      });

      const result = await controller.getInfo();

      expect(result.name).toMatch(/^Echo Server #\d{4}$/);
      expect(result.version).toBe('1.0.0');
      expect(result.albumCount).toBe(100);
    });
  });

  describe('disconnect', () => {
    it('should revoke access token and return ok', async () => {
      tokenService.revokeAccessToken.mockResolvedValue(true);

      const request = createMockRequest(mockAccessToken);

      const result = await controller.disconnect(request);

      expect(result.ok).toBe(true);
      expect(tokenService.revokeAccessToken).toHaveBeenCalledWith(mockAccessToken.id);
    });
  });

  // ============================================
  // Library endpoints
  // ============================================

  describe('getLibrary', () => {
    it('should return library with albums', async () => {
      const mockAlbums = [
        {
          id: 'album-1',
          name: 'Test Album',
          year: 2023,
          songCount: 10,
          duration: 3600,
          size: 100000000,
          coverArtPath: 'cover.jpg',
          artistId: 'artist-1',
          artistName: 'Test Artist',
        },
      ];

      libraryRepo.findAlbums.mockResolvedValue({ albums: mockAlbums, total: 1 });
      libraryRepo.getCounts.mockResolvedValue({ albumCount: 1, trackCount: 10, artistCount: 1 });

      const request = createMockRequest(mockAccessToken);

      const result = await controller.getLibrary({ page: 1, limit: 50 }, request);

      expect(result.albums).toHaveLength(1);
      expect(result.albums[0].id).toBe('album-1');
      expect(result.albums[0].coverUrl).toBe('/api/federation/albums/album-1/cover');
      expect(result.totalAlbums).toBe(1);
    });

    it('should throw ForbiddenException without browse permission', async () => {
      const noPermToken = {
        ...mockAccessToken,
        permissions: { canBrowse: false, canStream: false, canDownload: false },
      };

      const request = createMockRequest(noPermToken);

      await expect(controller.getLibrary({}, request)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAlbums', () => {
    it('should return paginated albums', async () => {
      const mockAlbums = [
        {
          id: 'album-1',
          name: 'Test Album',
          year: 2023,
          songCount: 10,
          duration: 3600,
          size: 100000000,
          coverArtPath: null,
          artistId: 'artist-1',
          artistName: 'Test Artist',
        },
      ];

      libraryRepo.findAlbums.mockResolvedValue({ albums: mockAlbums, total: 50 });

      const request = createMockRequest(mockAccessToken);

      const result = await controller.getAlbums({ page: 1, limit: 20 }, request);

      expect(result.albums).toHaveLength(1);
      expect(result.albums[0].coverUrl).toBeUndefined();
      expect(result.total).toBe(50);
    });

    it('should throw ForbiddenException without browse permission', async () => {
      const noPermToken = {
        ...mockAccessToken,
        permissions: { canBrowse: false, canStream: true, canDownload: true },
      };

      const request = createMockRequest(noPermToken);

      await expect(controller.getAlbums({}, request)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAlbum', () => {
    it('should return album with tracks', async () => {
      const mockAlbum = {
        id: 'album-1',
        name: 'Test Album',
        year: 2023,
        songCount: 2,
        duration: 600,
        size: 50000000,
        coverArtPath: 'cover.jpg',
        artistId: 'artist-1',
        artistName: 'Test Artist',
      };

      const mockTracks = [
        {
          id: 'track-1',
          title: 'Track 1',
          trackNumber: 1,
          discNumber: 1,
          duration: 300,
          size: 25000000,
          bitRate: 320,
          suffix: 'mp3',
          artistId: 'artist-1',
          artistName: 'Test Artist',
          rgTrackGain: null,
          rgTrackPeak: null,
          rgAlbumGain: null,
          rgAlbumPeak: null,
          bpm: null,
          initialKey: null,
          outroStart: null,
          lufsAnalyzedAt: null,
          djStatus: null,
          djBpm: null,
          djKey: null,
          djCamelotKey: null,
          djEnergy: null,
          djDanceability: null,
          djAnalysisError: null,
          djAnalyzedAt: null,
        },
      ];

      libraryRepo.findAlbumById.mockResolvedValue(mockAlbum);
      libraryRepo.findAlbumTracks.mockResolvedValue(mockTracks);

      const request = createMockRequest(mockAccessToken);

      const result = await controller.getAlbum('album-1', request);

      expect(result.id).toBe('album-1');
      expect(result.tracks).toHaveLength(1);
      expect(result.coverUrl).toBe('/api/federation/albums/album-1/cover');
    });

    it('should throw NotFoundException for non-existent album', async () => {
      libraryRepo.findAlbumById.mockResolvedValue(null);

      const request = createMockRequest(mockAccessToken);

      await expect(controller.getAlbum('non-existent', request)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException without browse permission', async () => {
      const noPermToken = {
        ...mockAccessToken,
        permissions: { canBrowse: false, canStream: true, canDownload: false },
      };

      const request = createMockRequest(noPermToken);

      await expect(controller.getAlbum('album-1', request)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAlbumCover', () => {
    it('should return album cover', async () => {
      libraryRepo.findAlbumCoverPath.mockResolvedValue('cached-cover.jpg');
      coverArtService.getCoverPath.mockReturnValue('/path/to/cover.jpg');

      const mockStream = { pipe: jest.fn() };
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      const request = createMockRequest(mockAccessToken);
      const reply = createMockReply();

      await controller.getAlbumCover('album-1', reply, request);

      expect(reply.header).toHaveBeenCalledWith('Content-Type', expect.any(String));
      expect(reply.header).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
      expect(reply.send).toHaveBeenCalledWith(mockStream);
    });

    it('should return 404 when album has no cover', async () => {
      libraryRepo.findAlbumCoverPath.mockResolvedValue(null);

      const request = createMockRequest(mockAccessToken);
      const reply = createMockReply();

      await controller.getAlbumCover('album-1', reply, request);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Cover not found' });
    });

    it('should return 403 without browse permission', async () => {
      const noPermToken = {
        ...mockAccessToken,
        permissions: { canBrowse: false, canStream: false, canDownload: false },
      };

      const request = createMockRequest(noPermToken);
      const reply = createMockReply();

      await controller.getAlbumCover('album-1', reply, request);

      expect(reply.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================
  // Streaming endpoints
  // ============================================

  describe('streamTrack', () => {
    it('should stream track without range header', async () => {
      libraryRepo.findTrackPath.mockResolvedValue({ path: '/music/track.mp3', size: 5000000 });
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockStream = { pipe: jest.fn() };
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      const request = createMockRequest(mockAccessToken);
      const reply = createMockReply();

      await controller.streamTrack('track-1', undefined, reply, request);

      expect(reply.raw.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          'Content-Type': expect.any(String),
          'Content-Length': '5000000',
          'Accept-Ranges': 'bytes',
        })
      );
      expect(mockStream.pipe).toHaveBeenCalledWith(reply.raw);
    });

    it('should stream track with range header', async () => {
      libraryRepo.findTrackPath.mockResolvedValue({ path: '/music/track.mp3', size: 5000000 });
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockStream = { pipe: jest.fn() };
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      const request = createMockRequest(mockAccessToken);
      const reply = createMockReply();

      await controller.streamTrack('track-1', 'bytes=0-999999', reply, request);

      expect(reply.raw.writeHead).toHaveBeenCalledWith(
        206,
        expect.objectContaining({
          'Content-Range': 'bytes 0-999999/5000000',
          'Content-Length': '1000000',
        })
      );
    });

    it('should return 404 when track not found', async () => {
      libraryRepo.findTrackPath.mockResolvedValue(null);

      const request = createMockRequest(mockAccessToken);
      const reply = createMockReply();

      await controller.streamTrack('non-existent', undefined, reply, request);

      expect(reply.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 without stream permission', async () => {
      const noPermToken = {
        ...mockAccessToken,
        permissions: { canBrowse: true, canStream: false, canDownload: false },
      };

      const request = createMockRequest(noPermToken);
      const reply = createMockReply();

      await controller.streamTrack('track-1', undefined, reply, request);

      expect(reply.status).toHaveBeenCalledWith(403);
    });

    it('should return 416 for invalid range', async () => {
      libraryRepo.findTrackPath.mockResolvedValue({ path: '/music/track.mp3', size: 1000 });
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const request = createMockRequest(mockAccessToken);
      const reply = createMockReply();

      await controller.streamTrack('track-1', 'bytes=5000-6000', reply, request);

      expect(reply.status).toHaveBeenCalledWith(416);
    });
  });

  // ============================================
  // Download endpoints
  // ============================================

  describe('exportAlbumMetadata', () => {
    it('should export album metadata with tracks', async () => {
      const mockAlbum = {
        id: 'album-1',
        name: 'Test Album',
        year: 2023,
        releaseDate: '2023-01-01',
        originalDate: '2023-01-01',
        compilation: false,
        songCount: 1,
        duration: 300,
        size: 25000000,
        coverArtPath: 'cover.jpg',
        mbzAlbumId: 'mbz-123',
        mbzAlbumArtistId: 'mbz-artist',
        mbzAlbumType: 'Album',
        catalogNum: 'CAT-001',
        comment: 'Test comment',
        description: 'Test description',
        artistId: 'artist-1',
        artistName: 'Test Artist',
      };

      const mockTracks = [
        {
          id: 'track-1',
          title: 'Track 1',
          trackNumber: 1,
          discNumber: 1,
          discSubtitle: null,
          duration: 300,
          size: 25000000,
          bitRate: 320,
          channels: 2,
          suffix: 'mp3',
          year: 2023,
          date: '2023-01-01',
          originalDate: '2023-01-01',
          releaseDate: '2023-01-01',
          artistName: 'Test Artist',
          albumArtistName: 'Test Artist',
          comment: null,
          lyrics: null,
          bpm: null,
          rgAlbumGain: -6.5,
          rgAlbumPeak: 0.95,
          rgTrackGain: -5.2,
          rgTrackPeak: 0.92,
          lufsAnalyzedAt: new Date(),
          mbzTrackId: 'mbz-track',
          mbzAlbumId: 'mbz-album',
          mbzArtistId: 'mbz-artist',
          mbzAlbumArtistId: 'mbz-album-artist',
          mbzReleaseTrackId: 'mbz-release',
          catalogNum: 'CAT-001',
          path: '/music/artist/album/01-track.mp3',
          djStatus: null,
          djBpm: null,
          djKey: null,
          djCamelotKey: null,
          djEnergy: null,
          djDanceability: null,
          djAnalysisError: null,
          djAnalyzedAt: null,
        },
      ];

      libraryRepo.findAlbumForExport.mockResolvedValue(mockAlbum);
      libraryRepo.findAlbumTracksForExport.mockResolvedValue(mockTracks);

      const request = createMockRequest(mockAccessToken);

      const result = await controller.exportAlbumMetadata('album-1', request);

      expect(result.album.id).toBe('album-1');
      expect(result.album.mbzAlbumId).toBe('mbz-123');
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].rgAlbumGain).toBe(-6.5);
      expect(result.tracks[0].lufsAnalyzed).toBe(true);
    });

    it('should throw NotFoundException for non-existent album', async () => {
      libraryRepo.findAlbumForExport.mockResolvedValue(null);

      const request = createMockRequest(mockAccessToken);

      await expect(controller.exportAlbumMetadata('non-existent', request)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException without download permission', async () => {
      const noPermToken = {
        ...mockAccessToken,
        permissions: { canBrowse: true, canStream: true, canDownload: false },
      };

      const request = createMockRequest(noPermToken);

      await expect(controller.exportAlbumMetadata('album-1', request)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('downloadAlbum', () => {
    it('should return download URLs for album', async () => {
      libraryRepo.findAlbumForDownload.mockResolvedValue({
        id: 'album-1',
        name: 'Test Album',
        coverArtPath: 'cover.jpg',
        artistName: 'Test Artist',
      });

      libraryRepo.findAlbumTrackPaths.mockResolvedValue([
        {
          id: 'track-1',
          title: 'Track 1',
          path: '/music/artist/album/01-track.mp3',
          trackNumber: 1,
          discNumber: 1,
        },
      ]);

      const request = createMockRequest(mockAccessToken);
      const reply = createMockReply();

      await controller.downloadAlbum('album-1', reply, request);

      expect(reply.header).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            album: expect.objectContaining({ id: 'album-1' }),
            tracks: expect.any(Array),
          }),
          downloadUrls: expect.objectContaining({
            cover: '/api/federation/albums/album-1/cover',
            tracks: expect.any(Array),
          }),
        })
      );
    });

    it('should return 404 for non-existent album', async () => {
      libraryRepo.findAlbumForDownload.mockResolvedValue(null);

      const request = createMockRequest(mockAccessToken);
      const reply = createMockReply();

      await controller.downloadAlbum('non-existent', reply, request);

      expect(reply.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 without download permission', async () => {
      const noPermToken = {
        ...mockAccessToken,
        permissions: { canBrowse: true, canStream: true, canDownload: false },
      };

      const request = createMockRequest(noPermToken);
      const reply = createMockReply();

      await controller.downloadAlbum('album-1', reply, request);

      expect(reply.status).toHaveBeenCalledWith(403);
    });
  });
});
