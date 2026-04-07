import { Test, TestingModule } from '@nestjs/testing';
import { StreamTokenController } from './stream-token.controller';
import { StreamTokenService } from '../infrastructure/services/stream-token.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { JwtUser } from '@shared/types/request.types';

describe('StreamTokenController', () => {
  let controller: StreamTokenController;
  let mockStreamTokenService: {
    generateToken: jest.Mock;
    getUserToken: jest.Mock;
    revokeToken: jest.Mock;
  };

  const mockUser = { id: 'user-123', username: 'testuser' };

  beforeEach(async () => {
    mockStreamTokenService = {
      generateToken: jest.fn(),
      getUserToken: jest.fn(),
      revokeToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StreamTokenController],
      providers: [
        {
          provide: StreamTokenService,
          useValue: mockStreamTokenService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StreamTokenController>(StreamTokenController);
  });

  describe('generateToken', () => {
    it('should generate a new token and return it with expiresAt', async () => {
      const tokenData = {
        token: 'new-stream-token-hex',
        expiresAt: new Date('2026-04-02T00:00:00Z'),
      };
      mockStreamTokenService.generateToken.mockResolvedValue(tokenData);

      const result = await controller.generateToken(mockUser as unknown as JwtUser);

      expect(result).toEqual({
        token: 'new-stream-token-hex',
        expiresAt: tokenData.expiresAt,
      });
      expect(mockStreamTokenService.generateToken).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getCurrentToken', () => {
    it('should return existing token when one exists', async () => {
      const tokenData = {
        token: 'existing-token',
        expiresAt: new Date('2026-04-02T00:00:00Z'),
      };
      mockStreamTokenService.getUserToken.mockResolvedValue(tokenData);

      const result = await controller.getCurrentToken(mockUser as unknown as JwtUser);

      expect(result).toEqual(tokenData);
      expect(mockStreamTokenService.getUserToken).toHaveBeenCalledWith('user-123');
      expect(mockStreamTokenService.generateToken).not.toHaveBeenCalled();
    });

    it('should auto-generate a new token when none exists', async () => {
      mockStreamTokenService.getUserToken.mockResolvedValue(null);
      const newTokenData = {
        token: 'auto-generated-token',
        expiresAt: new Date('2026-04-02T00:00:00Z'),
      };
      mockStreamTokenService.generateToken.mockResolvedValue(newTokenData);

      const result = await controller.getCurrentToken(mockUser as unknown as JwtUser);

      expect(result).toEqual(newTokenData);
      expect(mockStreamTokenService.getUserToken).toHaveBeenCalledWith('user-123');
      expect(mockStreamTokenService.generateToken).toHaveBeenCalledWith('user-123');
    });
  });

  describe('revokeToken', () => {
    it('should call revokeToken with the correct userId', async () => {
      mockStreamTokenService.revokeToken.mockResolvedValue(undefined);

      await controller.revokeToken(mockUser as unknown as JwtUser);

      expect(mockStreamTokenService.revokeToken).toHaveBeenCalledWith('user-123');
    });
  });
});
