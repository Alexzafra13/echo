import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccessTokenController } from './access-token.controller';
import { FederationTokenService } from '../domain/services';
import { RemoteServerService } from '../infrastructure/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';
import { getLoggerToken } from 'nestjs-pino';
import { User } from '@infrastructure/database/schema';
import { FederationAccessToken, ConnectedServer } from '../domain/types';

describe('AccessTokenController', () => {
  let controller: AccessTokenController;
  let tokenService: jest.Mocked<FederationTokenService>;
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
      controllers: [AccessTokenController],
      providers: [
        {
          provide: getLoggerToken(AccessTokenController.name),
          useValue: mockLogger,
        },
        {
          provide: FederationTokenService,
          useValue: {
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
          },
        },
        {
          provide: FEDERATION_REPOSITORY,
          useValue: {
            findFederationAccessTokenById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AccessTokenController>(AccessTokenController);
    tokenService = module.get(FederationTokenService);
    remoteServerService = module.get(RemoteServerService);
    repository = module.get(FEDERATION_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
});
