import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { InvitationController } from './invitation.controller';
import { FederationTokenService } from '../domain/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';
import { getLoggerToken } from 'nestjs-pino';
import { User } from '@infrastructure/database/schema';
import { FederationToken } from '../domain/types';

describe('InvitationController', () => {
  let controller: InvitationController;
  let tokenService: jest.Mocked<FederationTokenService>;
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

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationController],
      providers: [
        {
          provide: getLoggerToken(InvitationController.name),
          useValue: mockLogger,
        },
        {
          provide: FederationTokenService,
          useValue: {
            generateInvitationToken: jest.fn(),
            getUserInvitationTokens: jest.fn(),
            deleteInvitationToken: jest.fn(),
          },
        },
        {
          provide: FEDERATION_REPOSITORY,
          useValue: {
            findFederationTokenById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvitationController>(InvitationController);
    tokenService = module.get(FederationTokenService);
    repository = module.get(FEDERATION_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
