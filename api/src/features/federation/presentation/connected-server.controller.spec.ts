import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConnectedServerController } from './connected-server.controller';
import { RemoteServerService } from '../infrastructure/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';
import { getLoggerToken } from 'nestjs-pino';
import { User } from '@infrastructure/database/schema';
import { ConnectedServer } from '../domain/types';

describe('ConnectedServerController', () => {
  let controller: ConnectedServerController;
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
      controllers: [ConnectedServerController],
      providers: [
        {
          provide: getLoggerToken(ConnectedServerController.name),
          useValue: mockLogger,
        },
        {
          provide: RemoteServerService,
          useValue: {
            connectToServer: jest.fn(),
            syncServerStats: jest.fn(),
            disconnectFromServer: jest.fn(),
            checkAllServersHealth: jest.fn(),
            pingServer: jest.fn(),
          },
        },
        {
          provide: FEDERATION_REPOSITORY,
          useValue: {
            findConnectedServerById: jest.fn(),
            findConnectedServersByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ConnectedServerController>(ConnectedServerController);
    remoteServerService = module.get(RemoteServerService);
    repository = module.get(FEDERATION_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
