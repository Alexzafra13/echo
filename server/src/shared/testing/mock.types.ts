import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';

/**
 * Mock types for testing - provides type-safe mocks for common interfaces
 */

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
