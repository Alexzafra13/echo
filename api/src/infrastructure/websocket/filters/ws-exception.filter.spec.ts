import { ArgumentsHost } from '@nestjs/common';
import { WsException, BaseWsExceptionFilter } from '@nestjs/websockets';
import { PinoLogger } from 'nestjs-pino';
import { WsExceptionFilter } from './ws-exception.filter';

// Mock the base class catch method to avoid issues with Socket.io internals
jest.spyOn(BaseWsExceptionFilter.prototype, 'catch').mockImplementation(() => {});

const createMockLogger = (): jest.Mocked<PinoLogger> =>
  ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    setContext: jest.fn(),
    assign: jest.fn(),
  }) as unknown as jest.Mocked<PinoLogger>;

describe('WsExceptionFilter', () => {
  let filter: WsExceptionFilter;
  let mockClient: {
    id: string;
    emit: jest.Mock;
  };
  let mockHost: ArgumentsHost;
  let mockLogger: jest.Mocked<PinoLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    filter = new WsExceptionFilter(mockLogger);

    mockClient = {
      id: 'client-123',
      emit: jest.fn(),
    };

    mockHost = {
      switchToWs: () => ({
        getClient: () => mockClient,
        getData: () => ({ action: 'test-action' }),
      }),
      switchToHttp: () => ({}),
      switchToRpc: () => ({}),
      getType: () => 'ws',
      getArgs: () => [],
      getArgByIndex: () => ({}),
    } as unknown as ArgumentsHost;
  });

  describe('catch', () => {
    it('should handle WsException with string error', () => {
      const exception = new WsException('Connection error');

      filter.catch(exception, mockHost);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Connection error',
        code: 'WS_EXCEPTION',
        timestamp: expect.any(String),
      });
    });

    it('should handle WsException with object error', () => {
      const exception = new WsException({
        message: 'Unauthorized access',
        code: 'UNAUTHORIZED',
      });

      filter.catch(exception, mockHost);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Unauthorized access',
        code: 'UNAUTHORIZED',
        timestamp: expect.any(String),
      });
    });

    it('should handle generic Error', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Something went wrong',
        code: 'ERROR',
        timestamp: expect.any(String),
      });
    });

    it('should handle unknown exceptions', () => {
      const exception = 'string error';

      filter.catch(exception, mockHost);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(String),
      });
    });

    it('should handle null/undefined exceptions', () => {
      filter.catch(null, mockHost);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(String),
      });
    });

    it('should include timestamp in ISO format', () => {
      const before = new Date().toISOString();
      filter.catch(new Error('Test'), mockHost);
      const after = new Date().toISOString();

      const call = mockClient.emit.mock.calls[0];
      const timestamp = call[1].timestamp;

      expect(timestamp >= before).toBe(true);
      expect(timestamp <= after).toBe(true);
    });

    it('should emit error event to client', () => {
      const exception = new WsException('Test error');

      filter.catch(exception, mockHost);

      expect(mockClient.emit).toHaveBeenCalledTimes(1);
      expect(mockClient.emit.mock.calls[0][0]).toBe('error');
    });

    it('should handle WsException without code in error object', () => {
      const exception = new WsException({ message: 'Error without code' });

      filter.catch(exception, mockHost);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Error without code',
        code: 'WS_EXCEPTION',
        timestamp: expect.any(String),
      });
    });
  });
});
