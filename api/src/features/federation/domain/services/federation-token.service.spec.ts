import { FederationTokenService } from './federation-token.service';
import { IFederationRepository } from '../ports/federation.repository';
import { FederationToken, FederationAccessToken, FederationPermissions } from '@infrastructure/database/schema';

describe('FederationTokenService', () => {
  let service: FederationTokenService;
  let mockRepository: jest.Mocked<IFederationRepository>;

  const mockUserId = 'user-123';
  const mockTokenId = 'token-456';

  beforeEach(() => {
    mockRepository = {
      // Connected Servers
      createConnectedServer: jest.fn(),
      findConnectedServerById: jest.fn(),
      findConnectedServersByUserId: jest.fn(),
      findConnectedServerByUrl: jest.fn(),
      updateConnectedServer: jest.fn(),
      deleteConnectedServer: jest.fn(),
      // Federation Tokens
      createFederationToken: jest.fn(),
      findFederationTokenByToken: jest.fn(),
      findFederationTokenById: jest.fn(),
      findFederationTokensByUserId: jest.fn(),
      updateFederationToken: jest.fn(),
      deleteFederationToken: jest.fn(),
      deleteExpiredFederationTokens: jest.fn(),
      // Access Tokens
      createFederationAccessToken: jest.fn(),
      findFederationAccessTokenByToken: jest.fn(),
      findFederationAccessTokenById: jest.fn(),
      findFederationAccessTokensByOwnerId: jest.fn(),
      updateFederationAccessToken: jest.fn(),
      deleteFederationAccessToken: jest.fn(),
      revokeFederationAccessToken: jest.fn(),
      // Album Import
      createAlbumImport: jest.fn(),
      findAlbumImportById: jest.fn(),
      findAlbumImportsByUserId: jest.fn(),
      findPendingAlbumImports: jest.fn(),
      updateAlbumImport: jest.fn(),
      updateAlbumImportStatus: jest.fn(),
      deleteAlbumImport: jest.fn(),
    };

    service = new FederationTokenService(mockRepository);
  });

  describe('generateInvitationToken', () => {
    it('should generate a formatted invitation token', async () => {
      const mockToken: FederationToken = {
        id: mockTokenId,
        createdByUserId: mockUserId,
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

      mockRepository.createFederationToken.mockResolvedValue(mockToken);

      const result = await service.generateInvitationToken(mockUserId, 'Test Token');

      expect(result).toEqual(mockToken);
      expect(mockRepository.createFederationToken).toHaveBeenCalledWith(
        expect.objectContaining({
          createdByUserId: mockUserId,
          name: 'Test Token',
          maxUses: 1,
        }),
      );
    });

    it('should respect custom expiration and max uses', async () => {
      const mockToken: FederationToken = {
        id: mockTokenId,
        createdByUserId: mockUserId,
        token: 'ABCD-1234-EFGH-5678',
        name: null,
        isUsed: false,
        usedByServerName: null,
        usedByIp: null,
        usedAt: null,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxUses: 5,
        currentUses: 0,
        createdAt: new Date(),
      };

      mockRepository.createFederationToken.mockResolvedValue(mockToken);

      await service.generateInvitationToken(mockUserId, undefined, 14, 5);

      expect(mockRepository.createFederationToken).toHaveBeenCalledWith(
        expect.objectContaining({
          maxUses: 5,
        }),
      );
    });
  });

  describe('validateInvitationToken', () => {
    it('should return token if valid', async () => {
      const mockToken: FederationToken = {
        id: mockTokenId,
        createdByUserId: mockUserId,
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

      mockRepository.findFederationTokenByToken.mockResolvedValue(mockToken);

      const result = await service.validateInvitationToken('ABCD-1234-EFGH-5678');

      expect(result).toEqual(mockToken);
    });

    it('should return null if token not found', async () => {
      mockRepository.findFederationTokenByToken.mockResolvedValue(null);

      const result = await service.validateInvitationToken('INVALID-TOKEN');

      expect(result).toBeNull();
    });

    it('should return null if token is expired', async () => {
      const expiredToken: FederationToken = {
        id: mockTokenId,
        createdByUserId: mockUserId,
        token: 'ABCD-1234-EFGH-5678',
        name: 'Test Token',
        isUsed: false,
        usedByServerName: null,
        usedByIp: null,
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000), // Expired
        maxUses: 1,
        currentUses: 0,
        createdAt: new Date(),
      };

      mockRepository.findFederationTokenByToken.mockResolvedValue(expiredToken);

      const result = await service.validateInvitationToken('ABCD-1234-EFGH-5678');

      expect(result).toBeNull();
    });

    it('should return null if max uses reached', async () => {
      const usedToken: FederationToken = {
        id: mockTokenId,
        createdByUserId: mockUserId,
        token: 'ABCD-1234-EFGH-5678',
        name: 'Test Token',
        isUsed: true,
        usedByServerName: 'Server',
        usedByIp: '127.0.0.1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxUses: 1,
        currentUses: 1, // Max uses reached
        createdAt: new Date(),
      };

      mockRepository.findFederationTokenByToken.mockResolvedValue(usedToken);

      const result = await service.validateInvitationToken('ABCD-1234-EFGH-5678');

      expect(result).toBeNull();
    });
  });

  describe('useInvitationToken', () => {
    it('should create access token when invitation token is valid', async () => {
      const mockToken: FederationToken = {
        id: mockTokenId,
        createdByUserId: mockUserId,
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

      const mockAccessToken: FederationAccessToken = {
        id: 'access-token-123',
        ownerId: mockUserId,
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

      mockRepository.findFederationTokenByToken.mockResolvedValue(mockToken);
      mockRepository.updateFederationToken.mockResolvedValue(mockToken);
      mockRepository.createFederationAccessToken.mockResolvedValue(mockAccessToken);

      const result = await service.useInvitationToken(
        'ABCD-1234-EFGH-5678',
        'Remote Server',
        'https://remote.example.com',
        '192.168.1.1',
      );

      expect(result).toEqual(mockAccessToken);
      expect(mockRepository.updateFederationToken).toHaveBeenCalledWith(
        mockTokenId,
        expect.objectContaining({
          currentUses: 1,
          usedByServerName: 'Remote Server',
          usedByIp: '192.168.1.1',
        }),
      );
      expect(mockRepository.createFederationAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: mockUserId,
          serverName: 'Remote Server',
          serverUrl: 'https://remote.example.com',
          permissions: { canBrowse: true, canStream: true, canDownload: false },
        }),
      );
    });

    it('should return null if invitation token is invalid', async () => {
      mockRepository.findFederationTokenByToken.mockResolvedValue(null);

      const result = await service.useInvitationToken(
        'INVALID-TOKEN',
        'Remote Server',
      );

      expect(result).toBeNull();
      expect(mockRepository.createFederationAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('validateAccessToken', () => {
    it('should return token if valid and update lastUsedAt', async () => {
      const mockAccessToken: FederationAccessToken = {
        id: 'access-token-123',
        ownerId: mockUserId,
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

      mockRepository.findFederationAccessTokenByToken.mockResolvedValue(mockAccessToken);
      mockRepository.updateFederationAccessToken.mockResolvedValue(mockAccessToken);

      const result = await service.validateAccessToken('access-token-value');

      expect(result).toEqual(mockAccessToken);
      expect(mockRepository.updateFederationAccessToken).toHaveBeenCalledWith(
        'access-token-123',
        expect.objectContaining({ lastUsedAt: expect.any(Date) }),
      );
    });

    it('should return null if token not found', async () => {
      mockRepository.findFederationAccessTokenByToken.mockResolvedValue(null);

      const result = await service.validateAccessToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null if token is inactive', async () => {
      const inactiveToken: FederationAccessToken = {
        id: 'access-token-123',
        ownerId: mockUserId,
        token: 'access-token-value',
        serverName: 'Remote Server',
        serverUrl: null,
        permissions: { canBrowse: true, canStream: true, canDownload: false },
        isActive: false, // Inactive
        lastUsedAt: null,
        lastUsedIp: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findFederationAccessTokenByToken.mockResolvedValue(inactiveToken);

      const result = await service.validateAccessToken('access-token-value');

      expect(result).toBeNull();
    });

    it('should return null if token is expired', async () => {
      const expiredToken: FederationAccessToken = {
        id: 'access-token-123',
        ownerId: mockUserId,
        token: 'access-token-value',
        serverName: 'Remote Server',
        serverUrl: null,
        permissions: { canBrowse: true, canStream: true, canDownload: false },
        isActive: true,
        lastUsedAt: null,
        lastUsedIp: null,
        expiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findFederationAccessTokenByToken.mockResolvedValue(expiredToken);

      const result = await service.validateAccessToken('access-token-value');

      expect(result).toBeNull();
    });
  });

  describe('updateAccessTokenPermissions', () => {
    it('should update permissions correctly using findFederationAccessTokenById', async () => {
      const existingToken: FederationAccessToken = {
        id: 'access-token-123',
        ownerId: mockUserId,
        token: 'access-token-value',
        serverName: 'Remote Server',
        serverUrl: null,
        permissions: { canBrowse: true, canStream: true, canDownload: false },
        isActive: true,
        lastUsedAt: null,
        lastUsedIp: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedToken: FederationAccessToken = {
        ...existingToken,
        permissions: { canBrowse: true, canStream: true, canDownload: true },
      };

      mockRepository.findFederationAccessTokenById.mockResolvedValue(existingToken);
      mockRepository.updateFederationAccessToken.mockResolvedValue(updatedToken);

      const result = await service.updateAccessTokenPermissions('access-token-123', {
        canDownload: true,
      });

      expect(result).toEqual(updatedToken);
      expect(mockRepository.findFederationAccessTokenById).toHaveBeenCalledWith('access-token-123');
      expect(mockRepository.updateFederationAccessToken).toHaveBeenCalledWith('access-token-123', {
        permissions: { canBrowse: true, canStream: true, canDownload: true },
      });
    });

    it('should return null if access token not found', async () => {
      mockRepository.findFederationAccessTokenById.mockResolvedValue(null);

      const result = await service.updateAccessTokenPermissions('non-existent-id', {
        canDownload: true,
      });

      expect(result).toBeNull();
      expect(mockRepository.updateFederationAccessToken).not.toHaveBeenCalled();
    });

    it('should merge permissions correctly', async () => {
      const existingToken: FederationAccessToken = {
        id: 'access-token-123',
        ownerId: mockUserId,
        token: 'access-token-value',
        serverName: 'Remote Server',
        serverUrl: null,
        permissions: { canBrowse: true, canStream: false, canDownload: false },
        isActive: true,
        lastUsedAt: null,
        lastUsedIp: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findFederationAccessTokenById.mockResolvedValue(existingToken);
      mockRepository.updateFederationAccessToken.mockResolvedValue(existingToken);

      await service.updateAccessTokenPermissions('access-token-123', {
        canStream: true,
      });

      expect(mockRepository.updateFederationAccessToken).toHaveBeenCalledWith('access-token-123', {
        permissions: { canBrowse: true, canStream: true, canDownload: false },
      });
    });
  });

  describe('revokeAccessToken', () => {
    it('should call repository revoke method', async () => {
      mockRepository.revokeFederationAccessToken.mockResolvedValue(true);

      const result = await service.revokeAccessToken('access-token-123');

      expect(result).toBe(true);
      expect(mockRepository.revokeFederationAccessToken).toHaveBeenCalledWith('access-token-123');
    });
  });

  describe('deleteInvitationToken', () => {
    it('should call repository delete method', async () => {
      mockRepository.deleteFederationToken.mockResolvedValue(true);

      const result = await service.deleteInvitationToken(mockTokenId);

      expect(result).toBe(true);
      expect(mockRepository.deleteFederationToken).toHaveBeenCalledWith(mockTokenId);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should call repository cleanup method', async () => {
      mockRepository.deleteExpiredFederationTokens.mockResolvedValue(5);

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(mockRepository.deleteExpiredFederationTokens).toHaveBeenCalled();
    });
  });
});
