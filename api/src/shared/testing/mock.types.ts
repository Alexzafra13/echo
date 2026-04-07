import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';
import { UserProps } from '@features/auth/domain/entities/user.entity';

/**
 * Mock types for testing - provides type-safe mocks for common interfaces
 */

/**
 * Creates a complete UserProps object with sensible defaults.
 * Use this helper to create User entities in tests without specifying all fields.
 *
 * @example
 * const user = User.reconstruct(createMockUserProps({ username: 'john' }));
 * const admin = User.reconstruct(createMockUserProps({ isAdmin: true }));
 */
export const createMockUserProps = (overrides: Partial<UserProps> = {}): UserProps => ({
  id: 'user-123',
  username: 'testuser',
  passwordHash: '$2b$12$hashed',
  isActive: true,
  isAdmin: false,
  mustChangePassword: false,
  theme: 'dark',
  language: 'es',
  isPublicProfile: false,
  showTopTracks: true,
  showTopArtists: true,
  showTopAlbums: true,
  showPlaylists: true,
  homeSections: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Generic mock function type
export type MockFn<T = unknown> = jest.Mock<T>;

/**
 * Creates a type-safe mock object from an interface
 * All methods become jest.fn() mocks
 */
export type MockOf<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? jest.Mock<R, A>
    : T[K];
};

/**
 * Creates a partial mock - useful when you only need some methods
 */
export type PartialMock<T> = Partial<MockOf<T>>;

/**
 * Mock ExecutionContext for guard testing
 */
export interface MockExecutionContextOptions {
  request?: Record<string, unknown>;
  handler?: () => void;
  class?: new () => unknown;
}

export function createMockExecutionContext(
  options: MockExecutionContextOptions = {},
): ExecutionContext {
  const { request = {}, handler = () => {}, class: Class = class {} } = options;

  return {
    switchToHttp: () => ({
      getRequest: <T = unknown>() => request as T,
      getResponse: <T = unknown>() => ({}) as T,
      getNext: <T = unknown>() => (() => {}) as T,
    }),
    getHandler: () => handler,
    getClass: () => Class,
    getType: <T extends string = string>() => 'http' as T,
    getArgs: <T extends unknown[] = unknown[]>() => [] as unknown as T,
    getArgByIndex: <T = unknown>() => undefined as T,
    switchToRpc: () => ({
      getData: <T = unknown>() => ({}) as T,
      getContext: <T = unknown>() => ({}) as T,
    }),
    switchToWs: () => ({
      getData: <T = unknown>() => ({}) as T,
      getClient: <T = unknown>() => ({}) as T,
    }),
  } as unknown as ExecutionContext;
}

/**
 * Mock WebSocket context for WS guard testing
 */
export interface MockWsContextOptions {
  client?: Partial<Socket>;
  data?: Record<string, unknown>;
}

export function createMockWsContext(
  options: MockWsContextOptions = {},
): ExecutionContext {
  const { client = {}, data = {} } = options;

  const mockClient = {
    id: 'test-socket-id',
    handshake: {
      auth: {},
      headers: {},
      query: {},
    },
    ...client,
  };

  return {
    switchToWs: () => ({
      getClient: <T = unknown>() => mockClient as T,
      getData: <T = unknown>() => data as T,
    }),
    getType: <T extends string = string>() => 'ws' as T,
    getHandler: () => () => {},
    getClass: () => class {},
    getArgs: <T extends unknown[] = unknown[]>() => [] as unknown as T,
    getArgByIndex: <T = unknown>() => undefined as T,
    switchToHttp: () => ({
      getRequest: <T = unknown>() => ({}) as T,
      getResponse: <T = unknown>() => ({}) as T,
      getNext: <T = unknown>() => (() => {}) as T,
    }),
    switchToRpc: () => ({
      getData: <T = unknown>() => ({}) as T,
      getContext: <T = unknown>() => ({}) as T,
    }),
  } as unknown as ExecutionContext;
}

/**
 * Mock Reflector for decorator testing
 */
export function createMockReflector(
  overrides: Partial<Record<keyof Reflector, jest.Mock>> = {},
): MockOf<Reflector> {
  return {
    get: jest.fn(),
    getAll: jest.fn(),
    getAllAndMerge: jest.fn(),
    getAllAndOverride: jest.fn(),
    ...overrides,
  } as MockOf<Reflector>;
}

/**
 * Creates a mock repository with common CRUD methods
 */
export function createMockRepository<T>() {
  return {
    findById: jest.fn<Promise<T | null>, [string]>(),
    findAll: jest.fn<Promise<T[]>, [number, number]>(),
    create: jest.fn<Promise<T>, [T]>(),
    update: jest.fn<Promise<T>, [string, Partial<T>]>(),
    delete: jest.fn<Promise<void>, [string]>(),
    count: jest.fn<Promise<number>, []>(),
  };
}

/**
 * Creates a mock service with jest.fn() for all methods
 */
export function createMockService<T extends object>(
  methods: (keyof T)[],
): MockOf<T> {
  const mock = {} as MockOf<T>;
  for (const method of methods) {
    (mock as Record<keyof T, jest.Mock>)[method] = jest.fn();
  }
  return mock;
}

// ============================================================================
// Domain Service Mock Interfaces
// ============================================================================

/**
 * Mock interface for IUserRepository
 */
export interface MockUserRepository {
  findById: jest.Mock;
  findByUsername: jest.Mock;
  findAll: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  updatePartial: jest.Mock;
  updatePassword: jest.Mock;
  updateAdminStatus: jest.Mock;
  delete: jest.Mock;
}

export function createMockUserRepository(): MockUserRepository {
  return {
    findById: jest.fn(),
    findByUsername: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    updatePartial: jest.fn(),
    updatePassword: jest.fn(),
    updateAdminStatus: jest.fn(),
    delete: jest.fn(),
  };
}

/**
 * Mock interface for IPasswordService
 */
export interface MockPasswordService {
  hash: jest.Mock;
  compare: jest.Mock;
}

export function createMockPasswordService(): MockPasswordService {
  return {
    hash: jest.fn(),
    compare: jest.fn(),
  };
}

/**
 * Mock interface for ITokenService
 */
export interface MockTokenService {
  generateAccessToken: jest.Mock;
  generateRefreshToken: jest.Mock;
  verifyAccessToken: jest.Mock;
  verifyRefreshToken: jest.Mock;
}

export function createMockTokenService(): MockTokenService {
  return {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };
}

/**
 * Mock interface for LogService (simplified for tests)
 */
export interface MockLogService {
  info: jest.Mock;
  warning: jest.Mock;
  error: jest.Mock;
  critical: jest.Mock;
  debug: jest.Mock;
}

export function createMockLogService(): MockLogService {
  return {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    critical: jest.fn(),
    debug: jest.fn(),
  };
}

/**
 * Mock interface for CacheService
 */
export interface MockCacheService {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  delPattern: jest.Mock;
}

export function createMockCacheService(): MockCacheService {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  };
}

/**
 * Mock interface for PinoLogger
 */
export interface MockPinoLogger {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  trace: jest.Mock;
  fatal: jest.Mock;
}

export function createMockPinoLogger(): MockPinoLogger {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
  };
}

/**
 * Generic mock interface for use cases
 */
export interface MockUseCase {
  execute: jest.Mock;
}

export function createMockUseCase(): MockUseCase {
  return {
    execute: jest.fn(),
  };
}
