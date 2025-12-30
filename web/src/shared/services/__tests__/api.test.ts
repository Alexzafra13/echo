import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Mock useAuthStore before importing api
const mockGetState = vi.fn();
vi.mock('@shared/store', () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
}));

// Mock axios
vi.mock('axios', async () => {
  const actualAxios = await vi.importActual('axios');
  return {
    ...actualAxios,
    default: {
      create: vi.fn(() => ({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      })),
      post: vi.fn(),
    },
  };
});

describe('API Client', () => {
  let requestInterceptor: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  let responseErrorInterceptor: (error: AxiosError) => Promise<never>;
  let mockApiClient: ReturnType<typeof axios.create>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset location mock
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    // Setup default auth store state
    mockGetState.mockReturnValue({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
      updateUser: vi.fn(),
    });

    // Re-import to get fresh interceptors
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('request interceptor', () => {
    it('should add Authorization header when token exists', async () => {
      // Import fresh module to capture interceptors
      const axiosModule = await import('axios');
      const mockCreate = vi.mocked(axiosModule.default.create);

      // Capture the interceptor when api.ts is imported
      mockCreate.mockImplementation(() => {
        const instance = {
          interceptors: {
            request: {
              use: vi.fn((onFulfilled) => {
                requestInterceptor = onFulfilled;
              }),
            },
            response: {
              use: vi.fn(),
            },
          },
        } as unknown as ReturnType<typeof axios.create>;
        return instance;
      });

      // Import api module to trigger interceptor setup
      await import('../api');

      const config = {
        headers: {},
      } as InternalAxiosRequestConfig;

      const result = requestInterceptor(config);

      expect(result.headers?.Authorization).toBe('Bearer test-access-token');
    });

    it('should not add Authorization header when no token', async () => {
      mockGetState.mockReturnValue({
        accessToken: null,
        refreshToken: null,
        setTokens: vi.fn(),
        clearAuth: vi.fn(),
        updateUser: vi.fn(),
      });

      const axiosModule = await import('axios');
      const mockCreate = vi.mocked(axiosModule.default.create);

      mockCreate.mockImplementation(() => {
        const instance = {
          interceptors: {
            request: {
              use: vi.fn((onFulfilled) => {
                requestInterceptor = onFulfilled;
              }),
            },
            response: {
              use: vi.fn(),
            },
          },
        } as unknown as ReturnType<typeof axios.create>;
        return instance;
      });

      vi.resetModules();
      await import('../api');

      const config = {
        headers: {},
      } as InternalAxiosRequestConfig;

      const result = requestInterceptor(config);

      expect(result.headers?.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor - 401 handling', () => {
    beforeEach(async () => {
      const axiosModule = await import('axios');
      const mockCreate = vi.mocked(axiosModule.default.create);

      mockCreate.mockImplementation(() => {
        mockApiClient = {
          interceptors: {
            request: {
              use: vi.fn(),
            },
            response: {
              use: vi.fn((_onFulfilled, onRejected) => {
                responseErrorInterceptor = onRejected;
              }),
            },
          },
          get: vi.fn(),
          post: vi.fn(),
        } as unknown as ReturnType<typeof axios.create>;
        return mockApiClient;
      });

      vi.resetModules();
      await import('../api');
    });

    it('should attempt token refresh on 401 error', async () => {
      const mockSetTokens = vi.fn();
      mockGetState.mockReturnValue({
        accessToken: 'old-token',
        refreshToken: 'test-refresh-token',
        setTokens: mockSetTokens,
        clearAuth: vi.fn(),
        updateUser: vi.fn(),
      });

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      } as unknown as AxiosError;

      // The interceptor should refresh and retry
      // Note: Full integration would need more complex mocking
      try {
        await responseErrorInterceptor(error);
      } catch {
        // Expected to fail in unit test context
      }

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        { refreshToken: 'test-refresh-token' }
      );
    });

    it('should clear auth and redirect to login when refresh fails', async () => {
      const mockClearAuth = vi.fn();
      mockGetState.mockReturnValue({
        accessToken: 'old-token',
        refreshToken: 'test-refresh-token',
        setTokens: vi.fn(),
        clearAuth: mockClearAuth,
        updateUser: vi.fn(),
      });

      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Refresh failed'));

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      } as unknown as AxiosError;

      await expect(responseErrorInterceptor(error)).rejects.toThrow();

      expect(mockClearAuth).toHaveBeenCalled();
      expect(window.location.href).toBe('/login');
    });

    it('should not retry if no refresh token available', async () => {
      const mockClearAuth = vi.fn();
      mockGetState.mockReturnValue({
        accessToken: 'old-token',
        refreshToken: null,
        setTokens: vi.fn(),
        clearAuth: mockClearAuth,
        updateUser: vi.fn(),
      });

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      } as unknown as AxiosError;

      await expect(responseErrorInterceptor(error)).rejects.toThrow('No refresh token available');
    });
  });

  describe('response interceptor - 403 mustChangePassword handling', () => {
    beforeEach(async () => {
      const axiosModule = await import('axios');
      const mockCreate = vi.mocked(axiosModule.default.create);

      mockCreate.mockImplementation(() => {
        mockApiClient = {
          interceptors: {
            request: {
              use: vi.fn(),
            },
            response: {
              use: vi.fn((_onFulfilled, onRejected) => {
                responseErrorInterceptor = onRejected;
              }),
            },
          },
        } as unknown as ReturnType<typeof axios.create>;
        return mockApiClient;
      });

      vi.resetModules();
      await import('../api');
    });

    it('should redirect to first-login when mustChangePassword is true', async () => {
      const mockUpdateUser = vi.fn();
      mockGetState.mockReturnValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        setTokens: vi.fn(),
        clearAuth: vi.fn(),
        updateUser: mockUpdateUser,
      });

      const error = {
        response: {
          status: 403,
          data: { mustChangePassword: true },
        },
        config: { headers: {} },
      } as unknown as AxiosError;

      await expect(responseErrorInterceptor(error)).rejects.toBeDefined();

      expect(mockUpdateUser).toHaveBeenCalledWith({ mustChangePassword: true });
      expect(window.location.href).toBe('/first-login');
    });

    it('should not redirect on 403 without mustChangePassword flag', async () => {
      const mockUpdateUser = vi.fn();
      mockGetState.mockReturnValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        setTokens: vi.fn(),
        clearAuth: vi.fn(),
        updateUser: mockUpdateUser,
      });

      const error = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
        config: { headers: {} },
      } as unknown as AxiosError;

      await expect(responseErrorInterceptor(error)).rejects.toBeDefined();

      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(window.location.href).not.toBe('/first-login');
    });
  });
});
