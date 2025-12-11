import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FederationAccessGuard } from './federation-access.guard';
import { FederationTokenService } from './federation-token.service';
import { FederationAccessToken } from '@infrastructure/database/schema';

describe('FederationAccessGuard', () => {
  let guard: FederationAccessGuard;
  let mockTokenService: jest.Mocked<Partial<FederationTokenService>>;

  const mockAccessToken: FederationAccessToken = {
    id: 'access-123',
    ownerId: 'user-123',
    token: 'valid-access-token',
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

  beforeEach(() => {
    mockTokenService = {
      validateAccessToken: jest.fn(),
    };

    guard = new FederationAccessGuard(mockTokenService as unknown as FederationTokenService);
  });

  const createMockContext = (
    authHeader?: string,
    queryToken?: string,
  ): ExecutionContext => {
    const request = {
      headers: authHeader ? { authorization: authHeader } : {},
      query: queryToken ? { token: queryToken } : {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow access with valid Bearer token in header', async () => {
      mockTokenService.validateAccessToken!.mockResolvedValue(mockAccessToken);

      const context = createMockContext('Bearer valid-access-token');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockTokenService.validateAccessToken).toHaveBeenCalledWith('valid-access-token');
    });

    it('should allow access with valid token in query parameter', async () => {
      mockTokenService.validateAccessToken!.mockResolvedValue(mockAccessToken);

      const context = createMockContext(undefined, 'valid-access-token');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockTokenService.validateAccessToken).toHaveBeenCalledWith('valid-access-token');
    });

    it('should prefer Authorization header over query token', async () => {
      mockTokenService.validateAccessToken!.mockResolvedValue(mockAccessToken);

      const context = createMockContext('Bearer header-token', 'query-token');
      await guard.canActivate(context);

      expect(mockTokenService.validateAccessToken).toHaveBeenCalledWith('header-token');
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Federation access token required');
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockTokenService.validateAccessToken!.mockResolvedValue(null);

      const context = createMockContext('Bearer invalid-token');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Invalid or expired federation access token',
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      mockTokenService.validateAccessToken!.mockResolvedValue(null);

      const context = createMockContext('Bearer expired-token');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should attach access token to request', async () => {
      mockTokenService.validateAccessToken!.mockResolvedValue(mockAccessToken);

      const request: any = {
        headers: { authorization: 'Bearer valid-access-token' },
        query: {},
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      await guard.canActivate(context);

      expect(request.federationAccessToken).toEqual(mockAccessToken);
    });

    it('should handle malformed Authorization header', async () => {
      // No "Bearer " prefix
      const context = createMockContext('invalid-format');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Federation access token required');
    });

    it('should handle empty Bearer token', async () => {
      const context = createMockContext('Bearer ');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});
