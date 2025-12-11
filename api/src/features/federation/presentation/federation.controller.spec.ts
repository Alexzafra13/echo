import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { FederationController } from './federation.controller';
import { FederationTokenService, RemoteServerService } from '../domain/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { User, ConnectedServer, FederationToken, FederationAccessToken } from '@infrastructure/database/schema';
import { getLoggerToken } from 'nestjs-pino';

// Mock user
const mockUser: Partial<User> = {
  id: 'user-123',
  username: 'testuser',
  isAdmin: false,
};

const mockOtherUser: Partial<User> = {
  id: 'user-456',
  username: 'otheruser',
  isAdmin: false,
};

// Mock connected server
const mockServer: ConnectedServer = {
  id: 'server-123',
  userId: 'user-123', // Owned by mockUser
  name: 'Test Server',
  baseUrl: 'https://test.example.com',
  authToken: 'auth-token',
  isActive: true,
  isOnline: true,
  lastOnlineAt: new Date(),
  lastCheckedAt: new Date(),
  remoteAlbumCount: 100,
  remoteTrackCount: 500,
  remoteArtistCount: 50,
  lastSyncAt: new Date(),
  lastErrorAt: null,
  lastError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock federation token
const mockFederationToken: FederationToken = {
  id: 'token-123',
  createdByUserId: 'user-123', // Owned by mockUser
  token: 'ABCD-1234-EFGH-5678',
  name: 'Test Token',
  isUsed: false,
  usedByServerName: null,
  usedByIp: null,
  usedAt: null,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  maxUses: 1,
  currentUses: 0,
  createdAt: new Date(),
};

// Mock access token
const mockAccessToken: FederationAccessToken = {
  id: 'access-123',
  ownerId: 'user-123', // Owned by mockUser
  token: 'access-token-value',
  serverName: 'Remote Server',
  serverUrl: 'https://remote.example.com',
  permissions: { canBrowse: true, canStream: true, canDownload: false },
  isActive: true,
  lastUsedAt: null,
  lastUsedIp: null,
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('FederationController', () => {
  let controller: FederationController;
  let mockTokenService: jest.Mocked<Partial<FederationTokenService>>;
  let mockRemoteServerService: jest.Mocked<Partial<RemoteServerService>>;
  let mockRepository: jest.Mocked<Partial<IFederationRepository>>;
  let mockLogger: { info: jest.Mock; error: jest.Mock; warn: jest.Mock };

  beforeEach(async () => {
    mockTokenService = {
      generateInvitationToken: jest.fn(),
      getUserInvitationTokens: jest.fn(),
      deleteInvitationToken: jest.fn(),
      getUserAccessTokens: jest.fn(),
      revokeAccessToken: jest.fn(),
    };

    mockRemoteServerService = {
      connectToServer: jest.fn(),
      syncServerStats: jest.fn(),
      disconnectFromServer: jest.fn(),
      checkAllServersHealth: jest.fn(),
      pingServer: jest.fn(),
      getRemoteLibrary: jest.fn(),
      getRemoteAlbums: jest.fn(),
      getRemoteAlbum: jest.fn(),
    };

    mockRepository = {
      findConnectedServerById: jest.fn(),
      findConnectedServersByUserId: jest.fn(),
      findFederationTokenById: jest.fn(),
      findFederationAccessTokenById: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FederationController],
      providers: [
        {
          provide: FederationTokenService,
          useValue: mockTokenService,
        },
        {
          provide: RemoteServerService,
          useValue: mockRemoteServerService,
        },
        {
          provide: FEDERATION_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: getLoggerToken(FederationController.name),
          useValue: mockLogger,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<FederationController>(FederationController);
  });

  // ============================================
  // Server Operations - Ownership Verification
  // ============================================

  describe('getConnectedServer', () => {
    it('should return server when user owns it', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);

      const result = await controller.getConnectedServer(mockUser as User, 'server-123');

      expect(result.id).toBe('server-123');
      expect(result.name).toBe('Test Server');
    });

    it('should throw NotFoundException when server does not exist', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(null);

      await expect(
        controller.getConnectedServer(mockUser as User, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the server', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);

      await expect(
        controller.getConnectedServer(mockOtherUser as User, 'server-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('syncServer', () => {
    it('should sync server when user owns it', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);
      mockRemoteServerService.syncServerStats!.mockResolvedValue(mockServer);

      const result = await controller.syncServer(mockUser as User, 'server-123');

      expect(result.id).toBe('server-123');
      expect(mockRemoteServerService.syncServerStats).toHaveBeenCalledWith(mockServer);
    });

    it('should throw ForbiddenException when user does not own the server', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);

      await expect(
        controller.syncServer(mockOtherUser as User, 'server-123'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRemoteServerService.syncServerStats).not.toHaveBeenCalled();
    });
  });

  describe('disconnectFromServer', () => {
    it('should disconnect when user owns the server', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);
      mockRemoteServerService.disconnectFromServer!.mockResolvedValue(true);

      await controller.disconnectFromServer(mockUser as User, 'server-123');

      expect(mockRemoteServerService.disconnectFromServer).toHaveBeenCalledWith('server-123');
    });

    it('should throw ForbiddenException when user does not own the server', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);

      await expect(
        controller.disconnectFromServer(mockOtherUser as User, 'server-123'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRemoteServerService.disconnectFromServer).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when server does not exist', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(null);

      await expect(
        controller.disconnectFromServer(mockUser as User, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkServerHealth', () => {
    it('should check health when user owns the server', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);
      mockRemoteServerService.pingServer!.mockResolvedValue(true);

      const result = await controller.checkServerHealth(mockUser as User, 'server-123');

      expect(result.id).toBe('server-123');
      expect(mockRemoteServerService.pingServer).toHaveBeenCalledWith(mockServer);
    });

    it('should throw ForbiddenException when user does not own the server', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);

      await expect(
        controller.checkServerHealth(mockOtherUser as User, 'server-123'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRemoteServerService.pingServer).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Remote Library Operations - Ownership Verification
  // ============================================

  describe('getRemoteLibrary', () => {
    it('should get library when user owns the server', async () => {
      const mockLibrary = {
        albums: [],
        totalAlbums: 100,
        totalTracks: 500,
        totalArtists: 50,
      };

      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);
      mockRemoteServerService.getRemoteLibrary!.mockResolvedValue(mockLibrary);

      const result = await controller.getRemoteLibrary(
        mockUser as User,
        'server-123',
        { page: 1, limit: 50 },
      );

      expect(result).toEqual(mockLibrary);
      expect(mockRemoteServerService.getRemoteLibrary).toHaveBeenCalledWith(mockServer, 1, 50);
    });

    it('should throw ForbiddenException when user does not own the server', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);

      await expect(
        controller.getRemoteLibrary(mockOtherUser as User, 'server-123', { page: 1, limit: 50 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getRemoteAlbums', () => {
    it('should get albums when user owns the server', async () => {
      const mockAlbums = { albums: [], total: 0 };

      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);
      mockRemoteServerService.getRemoteAlbums!.mockResolvedValue(mockAlbums);

      const result = await controller.getRemoteAlbums(
        mockUser as User,
        'server-123',
        { page: 1, limit: 50 },
      );

      expect(result).toEqual(mockAlbums);
    });

    it('should throw ForbiddenException when user does not own the server', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);

      await expect(
        controller.getRemoteAlbums(mockOtherUser as User, 'server-123', { page: 1, limit: 50 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getRemoteAlbum', () => {
    it('should get album when user owns the server', async () => {
      const mockAlbum = {
        id: 'album-123',
        name: 'Test Album',
        artistName: 'Artist',
        artistId: 'artist-123',
        songCount: 10,
        duration: 3600,
        size: 1000000,
        tracks: [],
      };

      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);
      mockRemoteServerService.getRemoteAlbum!.mockResolvedValue(mockAlbum);

      const result = await controller.getRemoteAlbum(
        mockUser as User,
        'server-123',
        'album-123',
      );

      expect(result).toEqual(mockAlbum);
    });

    it('should throw ForbiddenException when user does not own the server', async () => {
      mockRepository.findConnectedServerById!.mockResolvedValue(mockServer);

      await expect(
        controller.getRemoteAlbum(mockOtherUser as User, 'server-123', 'album-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // Token Operations - Ownership Verification
  // ============================================

  describe('deleteInvitationToken', () => {
    it('should delete token when user owns it', async () => {
      mockRepository.findFederationTokenById!.mockResolvedValue(mockFederationToken);
      mockTokenService.deleteInvitationToken!.mockResolvedValue(true);

      await controller.deleteInvitationToken(mockUser as User, 'token-123');

      expect(mockTokenService.deleteInvitationToken).toHaveBeenCalledWith('token-123');
    });

    it('should throw NotFoundException when token does not exist', async () => {
      mockRepository.findFederationTokenById!.mockResolvedValue(null);

      await expect(
        controller.deleteInvitationToken(mockUser as User, 'non-existent'),
      ).rejects.toThrow(NotFoundException);

      expect(mockTokenService.deleteInvitationToken).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own the token', async () => {
      mockRepository.findFederationTokenById!.mockResolvedValue(mockFederationToken);

      await expect(
        controller.deleteInvitationToken(mockOtherUser as User, 'token-123'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockTokenService.deleteInvitationToken).not.toHaveBeenCalled();
    });
  });

  describe('revokeAccessToken', () => {
    it('should revoke token when user owns it', async () => {
      mockRepository.findFederationAccessTokenById!.mockResolvedValue(mockAccessToken);
      mockTokenService.revokeAccessToken!.mockResolvedValue(true);

      await controller.revokeAccessToken(mockUser as User, 'access-123');

      expect(mockTokenService.revokeAccessToken).toHaveBeenCalledWith('access-123');
    });

    it('should throw NotFoundException when token does not exist', async () => {
      mockRepository.findFederationAccessTokenById!.mockResolvedValue(null);

      await expect(
        controller.revokeAccessToken(mockUser as User, 'non-existent'),
      ).rejects.toThrow(NotFoundException);

      expect(mockTokenService.revokeAccessToken).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own the token', async () => {
      mockRepository.findFederationAccessTokenById!.mockResolvedValue(mockAccessToken);

      await expect(
        controller.revokeAccessToken(mockOtherUser as User, 'access-123'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockTokenService.revokeAccessToken).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // List Operations
  // ============================================

  describe('getConnectedServers', () => {
    it('should return servers owned by the user', async () => {
      mockRepository.findConnectedServersByUserId!.mockResolvedValue([mockServer]);

      const result = await controller.getConnectedServers(mockUser as User);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('server-123');
      expect(mockRepository.findConnectedServersByUserId).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getInvitationTokens', () => {
    it('should return tokens owned by the user', async () => {
      mockTokenService.getUserInvitationTokens!.mockResolvedValue([mockFederationToken]);

      const result = await controller.getInvitationTokens(mockUser as User);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('token-123');
      expect(mockTokenService.getUserInvitationTokens).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getAccessTokens', () => {
    it('should return access tokens owned by the user', async () => {
      mockTokenService.getUserAccessTokens!.mockResolvedValue([mockAccessToken]);

      const result = await controller.getAccessTokens(mockUser as User);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('access-123');
      expect(mockTokenService.getUserAccessTokens).toHaveBeenCalledWith('user-123');
    });
  });
});
