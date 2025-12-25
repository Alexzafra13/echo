import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { FederationController } from './federation.controller';
import { FederationTokenService, RemoteServerService } from '../domain/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';
import { StreamTokenService } from '@features/streaming/infrastructure/services/stream-token.service';
import { getLoggerToken } from 'nestjs-pino';
import { User, ConnectedServer, FederationToken, FederationAccessToken } from '@infrastructure/database/schema';

describe('FederationController', () => {
  let controller: FederationController;
  let tokenService: jest.Mocked<FederationTokenService>;
  let remoteServerService: jest.Mocked<RemoteServerService>;
  let repository: jest.Mocked<IFederationRepository>;
  let streamTokenService: jest.Mocked<StreamTokenService>;

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

  const mockFederationToken: FederationToken = {
    id: 'token-1',
    token: 'ABCD-1234-EFGH-5678',
    createdByUserId: 'user-1',
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

  const mockAccessToken: FederationAccessToken = {
    id: 'access-1',
    token: 'long-access-token',
    ownerId: 'user-1',
    serverName: 'Remote Server',
    serverUrl: 'https://remote.example.com',
    permissions: { canBrowse: true, canStream: true, canDownload: false },
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

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FederationController],
      providers: [
        {
          provide: getLoggerToken(FederationController.name),
          useValue: mockLogger,
        },
        {
          provide: FederationTokenService,
          useValue: {
            generateInvitationToken: jest.fn(),
            getUserInvitationTokens: jest.fn(),
            deleteInvitationToken: jest.fn(),
            getUserAccessTokens: jest.fn(),
            revokeAccessToken: jest.fn(),
            deleteAccessToken: jest.fn(),
            reactivateAccessToken: jest.fn(),
            updateAccessTokenPermissions: jest.fn(),
            getPendingMutualRequests: jest.fn(),
            getAccessTokenById: jest.fn(),
            approveMutualRequest: jest.fn(),
            rejectMutualRequest: jest.fn(),
          },
        },
        {
          provide: RemoteServerService,
          useValue: {
            connectToServer: jest.fn(),
            syncServerStats: jest.fn(),
            disconnectFromServer: jest.fn(),
            checkAllServersHealth: jest.fn(),
            pingServer: jest.fn(),
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
            findFederationTokenById: jest.fn(),
            findFederationAccessTokenById: jest.fn(),
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

    controller = module.get<FederationController>(FederationController);
    tokenService = module.get(FederationTokenService);
    remoteServerService = module.get(RemoteServerService);
    repository = module.get(FEDERATION_REPOSITORY);
    streamTokenService = module.get(StreamTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Invitation Tokens', () => {
    describe('createInvitationToken', () => {
      it('should create an invitation token', async () => {
        tokenService.generateInvitationToken.mockResolvedValue(mockFederationToken);

        const result = await controller.createInvitationToken(mockUser, {
          name: 'Test Token',
          expiresInDays: 7,
          maxUses: 1,
        });

        expect(result).toEqual({
          id: mockFederationToken.id,
          token: mockFederationToken.token,
          name: mockFederationToken.name,
          expiresAt: mockFederationToken.expiresAt,
          maxUses: mockFederationToken.maxUses,
          currentUses: mockFederationToken.currentUses,
          isUsed: mockFederationToken.isUsed,
          createdAt: mockFederationToken.createdAt,
        });
        expect(tokenService.generateInvitationToken).toHaveBeenCalledWith(
          mockUser.id,
          'Test Token',
          7,
          1,
        );
      });
    });

    describe('getInvitationTokens', () => {
      it('should return user invitation tokens', async () => {
        tokenService.getUserInvitationTokens.mockResolvedValue([mockFederationToken]);

        const result = await controller.getInvitationTokens(mockUser);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(mockFederationToken.id);
        expect(tokenService.getUserInvitationTokens).toHaveBeenCalledWith(mockUser.id);
      });
    });

    describe('deleteInvitationToken', () => {
      it('should delete an invitation token', async () => {
        repository.findFederationTokenById.mockResolvedValue(mockFederationToken);
        tokenService.deleteInvitationToken.mockResolvedValue(undefined);

        await controller.deleteInvitationToken(mockUser, 'token-1');

        expect(tokenService.deleteInvitationToken).toHaveBeenCalledWith('token-1');
      });

      it('should throw NotFoundException if token not found', async () => {
        repository.findFederationTokenById.mockResolvedValue(null);

        await expect(controller.deleteInvitationToken(mockUser, 'non-existent'))
          .rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException if user does not own token', async () => {
        repository.findFederationTokenById.mockResolvedValue({
          ...mockFederationToken,
          createdByUserId: 'other-user',
        });

        await expect(controller.deleteInvitationToken(mockUser, 'token-1'))
          .rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('Connected Servers', () => {
    describe('connectToServer', () => {
      it('should connect to a server', async () => {
        remoteServerService.connectToServer.mockResolvedValue(mockConnectedServer);

        const result = await controller.connectToServer(mockUser, {
          serverUrl: 'https://test.example.com',
          invitationToken: 'ABCD-1234-EFGH-5678',
          serverName: 'Test Server',
          requestMutual: false,
        });

        expect(result.id).toBe(mockConnectedServer.id);
        expect(result.name).toBe(mockConnectedServer.name);
        expect(remoteServerService.connectToServer).toHaveBeenCalledWith(
          mockUser.id,
          'https://test.example.com',
          'ABCD-1234-EFGH-5678',
          'Test Server',
          undefined,
          false,
        );
      });
    });

    describe('getConnectedServers', () => {
      it('should return connected servers', async () => {
        repository.findConnectedServersByUserId.mockResolvedValue([mockConnectedServer]);

        const result = await controller.getConnectedServers(mockUser);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(mockConnectedServer.id);
      });
    });

    describe('getConnectedServer', () => {
      it('should return a specific server', async () => {
        repository.findConnectedServerById.mockResolvedValue(mockConnectedServer);

        const result = await controller.getConnectedServer(mockUser, 'server-1');

        expect(result.id).toBe(mockConnectedServer.id);
      });

      it('should throw NotFoundException if server not found', async () => {
        repository.findConnectedServerById.mockResolvedValue(null);

        await expect(controller.getConnectedServer(mockUser, 'non-existent'))
          .rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException if user does not own server', async () => {
        repository.findConnectedServerById.mockResolvedValue({
          ...mockConnectedServer,
          userId: 'other-user',
        });

        await expect(controller.getConnectedServer(mockUser, 'server-1'))
          .rejects.toThrow(ForbiddenException);
      });
    });

    describe('syncServer', () => {
      it('should sync server stats', async () => {
        repository.findConnectedServerById.mockResolvedValue(mockConnectedServer);
        remoteServerService.syncServerStats.mockResolvedValue(mockConnectedServer);

        const result = await controller.syncServer(mockUser, 'server-1');

        expect(result.id).toBe(mockConnectedServer.id);
        expect(remoteServerService.syncServerStats).toHaveBeenCalledWith(mockConnectedServer);
      });
    });

    describe('disconnectFromServer', () => {
      it('should disconnect from a server', async () => {
        repository.findConnectedServerById.mockResolvedValue(mockConnectedServer);
        remoteServerService.disconnectFromServer.mockResolvedValue(undefined);

        await controller.disconnectFromServer(mockUser, 'server-1');

        expect(remoteServerService.disconnectFromServer).toHaveBeenCalledWith('server-1');
      });
    });

    describe('checkServersHealth', () => {
      it('should check health of all servers', async () => {
        remoteServerService.checkAllServersHealth.mockResolvedValue([mockConnectedServer]);

        const result = await controller.checkServersHealth(mockUser);

        expect(result).toHaveLength(1);
        expect(remoteServerService.checkAllServersHealth).toHaveBeenCalledWith(mockUser.id);
      });
    });

    describe('checkServerHealth', () => {
      it('should check health of a specific server', async () => {
        repository.findConnectedServerById.mockResolvedValue(mockConnectedServer);
        remoteServerService.pingServer.mockResolvedValue(undefined);

        const result = await controller.checkServerHealth(mockUser, 'server-1');

        expect(result.id).toBe(mockConnectedServer.id);
        expect(remoteServerService.pingServer).toHaveBeenCalledWith(mockConnectedServer);
      });
    });
  });

  describe('Shared Libraries', () => {
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
  });

  describe('Remote Library', () => {
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

  describe('Access Tokens', () => {
    describe('getAccessTokens', () => {
      it('should return user access tokens', async () => {
        tokenService.getUserAccessTokens.mockResolvedValue([mockAccessToken]);

        const result = await controller.getAccessTokens(mockUser);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(mockAccessToken.id);
        expect(result[0].serverName).toBe(mockAccessToken.serverName);
      });
    });

    describe('revokeOrDeleteAccessToken', () => {
      it('should revoke access token by default', async () => {
        repository.findFederationAccessTokenById.mockResolvedValue(mockAccessToken);
        tokenService.revokeAccessToken.mockResolvedValue(undefined);

        await controller.revokeOrDeleteAccessToken(mockUser, 'access-1');

        expect(tokenService.revokeAccessToken).toHaveBeenCalledWith('access-1');
        expect(tokenService.deleteAccessToken).not.toHaveBeenCalled();
      });

      it('should delete permanently when permanent=true', async () => {
        repository.findFederationAccessTokenById.mockResolvedValue(mockAccessToken);
        tokenService.deleteAccessToken.mockResolvedValue(undefined);

        await controller.revokeOrDeleteAccessToken(mockUser, 'access-1', 'true');

        expect(tokenService.deleteAccessToken).toHaveBeenCalledWith('access-1');
        expect(tokenService.revokeAccessToken).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException if token not found', async () => {
        repository.findFederationAccessTokenById.mockResolvedValue(null);

        await expect(controller.revokeOrDeleteAccessToken(mockUser, 'non-existent'))
          .rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException if user does not own token', async () => {
        repository.findFederationAccessTokenById.mockResolvedValue({
          ...mockAccessToken,
          ownerId: 'other-user',
        });

        await expect(controller.revokeOrDeleteAccessToken(mockUser, 'access-1'))
          .rejects.toThrow(ForbiddenException);
      });
    });

    describe('reactivateAccessToken', () => {
      it('should reactivate access token', async () => {
        repository.findFederationAccessTokenById.mockResolvedValue(mockAccessToken);
        tokenService.reactivateAccessToken.mockResolvedValue(mockAccessToken);

        const result = await controller.reactivateAccessToken(mockUser, 'access-1');

        expect(result.id).toBe(mockAccessToken.id);
        expect(result.isActive).toBe(mockAccessToken.isActive);
      });

      it('should throw NotFoundException if reactivation fails', async () => {
        repository.findFederationAccessTokenById.mockResolvedValue(mockAccessToken);
        tokenService.reactivateAccessToken.mockResolvedValue(null);

        await expect(controller.reactivateAccessToken(mockUser, 'access-1'))
          .rejects.toThrow(NotFoundException);
      });
    });

    describe('updateAccessTokenPermissions', () => {
      it('should update permissions', async () => {
        const updatedToken = { ...mockAccessToken, permissions: { canBrowse: true, canStream: false, canDownload: false } };
        repository.findFederationAccessTokenById.mockResolvedValue(mockAccessToken);
        tokenService.updateAccessTokenPermissions.mockResolvedValue(updatedToken);

        const result = await controller.updateAccessTokenPermissions(mockUser, 'access-1', {
          canStream: false,
        });

        expect(tokenService.updateAccessTokenPermissions).toHaveBeenCalledWith('access-1', { canStream: false });
        expect(result.permissions.canStream).toBe(false);
      });
    });
  });

  describe('Mutual Federation', () => {
    describe('getPendingMutualRequests', () => {
      it('should return pending mutual requests', async () => {
        const pendingToken = { ...mockAccessToken, mutualStatus: 'pending' as const };
        tokenService.getPendingMutualRequests.mockResolvedValue([pendingToken]);

        const result = await controller.getPendingMutualRequests(mockUser);

        expect(result).toHaveLength(1);
        expect(result[0].mutualStatus).toBe('pending');
      });
    });

    describe('approveMutualRequest', () => {
      it('should approve mutual request and connect to server', async () => {
        const pendingToken = {
          ...mockAccessToken,
          mutualStatus: 'pending' as const,
          mutualInvitationToken: 'WXYZ-5678',
          serverUrl: 'https://remote.example.com',
        };
        tokenService.getAccessTokenById.mockResolvedValue(pendingToken);
        tokenService.approveMutualRequest.mockResolvedValue(true);
        remoteServerService.connectToServer.mockResolvedValue(mockConnectedServer);

        const result = await controller.approveMutualRequest(mockUser, 'access-1');

        expect(result.id).toBe(mockConnectedServer.id);
        expect(tokenService.approveMutualRequest).toHaveBeenCalledWith('access-1');
        expect(remoteServerService.connectToServer).toHaveBeenCalledWith(
          mockUser.id,
          pendingToken.serverUrl,
          pendingToken.mutualInvitationToken,
          pendingToken.serverName,
        );
      });

      it('should throw NotFoundException if no pending request', async () => {
        tokenService.getAccessTokenById.mockResolvedValue({
          ...mockAccessToken,
          mutualStatus: 'none',
        });

        await expect(controller.approveMutualRequest(mockUser, 'access-1'))
          .rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException if user does not own token', async () => {
        tokenService.getAccessTokenById.mockResolvedValue({
          ...mockAccessToken,
          ownerId: 'other-user',
        });

        await expect(controller.approveMutualRequest(mockUser, 'access-1'))
          .rejects.toThrow(ForbiddenException);
      });
    });

    describe('rejectMutualRequest', () => {
      it('should reject mutual request', async () => {
        tokenService.getAccessTokenById.mockResolvedValue(mockAccessToken);
        tokenService.rejectMutualRequest.mockResolvedValue(undefined);

        await controller.rejectMutualRequest(mockUser, 'access-1');

        expect(tokenService.rejectMutualRequest).toHaveBeenCalledWith('access-1');
      });
    });
  });

  describe('Private helper: getServerWithOwnershipCheck', () => {
    it('should be tested through public methods that use it', async () => {
      // This private method is tested through getConnectedServer, syncServer, etc.
      repository.findConnectedServerById.mockResolvedValue(null);

      await expect(controller.getConnectedServer(mockUser, 'non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
