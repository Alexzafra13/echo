import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { BaseError } from '@shared/errors/base.error';
import { ValidationError } from '@shared/errors/validation.error';
import { NotFoundError } from '@shared/errors/not-found.error';
import { UnauthorizedError } from '@shared/errors/unauthorized.error';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockLogger: {
    error: jest.Mock;
    warn: jest.Mock;
  };
  let mockResponse: {
    status: jest.Mock;
    send: jest.Mock;
  };
  let mockRequest: {
    url: string;
    method: string;
    params: Record<string, string>;
    query: Record<string, string>;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    mockRequest = {
      url: '/test/path',
      method: 'GET',
      params: { id: '123' },
      query: { filter: 'active' },
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    filter = new HttpExceptionFilter(mockLogger as any);
  });

  describe('BaseError handling (custom domain errors)', () => {
    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid input data');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid input data',
          error: 'VALIDATION_ERROR',
          path: '/test/path',
        }),
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('User', '123');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'User with id 123 not found',
          error: 'NOT_FOUND',
        }),
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle UnauthorizedError correctly', () => {
      const error = new UnauthorizedError('Invalid credentials');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Invalid credentials',
          error: 'UNAUTHORIZED',
        }),
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('HttpException handling (NestJS exceptions)', () => {
    it('should handle HttpException with string response', () => {
      const error = new HttpException('Not allowed', HttpStatus.FORBIDDEN);

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Not allowed',
        }),
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle HttpException with object response', () => {
      const error = new HttpException(
        { message: 'Resource forbidden', error: 'ForbiddenError' },
        HttpStatus.FORBIDDEN,
      );

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Resource forbidden',
          error: 'ForbiddenError',
        }),
      );
    });

    it('should handle HttpException with message array', () => {
      const error = new HttpException(
        { message: ['Field1 is required', 'Field2 is invalid'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
        }),
      );
    });
  });

  describe('Generic Error handling', () => {
    it('should handle generic Error as Internal Server Error', () => {
      const error = new Error('Something went wrong');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'InternalServerError',
        }),
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle unknown exceptions as Internal Server Error', () => {
      const error = 'string error';

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'UnknownError',
        }),
      );
    });

    it('should handle null/undefined exceptions', () => {
      filter.catch(null, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        }),
      );
    });
  });

  describe('Logging behavior', () => {
    it('should log as warn for client errors (4xx)', () => {
      const error = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

      filter.catch(error, mockHost);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should log as error for server errors (5xx)', () => {
      const error = new HttpException(
        'Server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      filter.catch(error, mockHost);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should include request details in error log', () => {
      const error = new Error('Server failure');

      filter.catch(error, mockHost);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          req: expect.objectContaining({
            method: 'GET',
            url: '/test/path',
            params: { id: '123' },
            query: { filter: 'active' },
          }),
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        }),
        expect.any(String),
      );
    });
  });

  describe('Response format', () => {
    it('should include timestamp in response', () => {
      const error = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(error, mockHost);

      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      );
    });

    it('should include path in response', () => {
      const error = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(error, mockHost);

      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/test/path',
        }),
      );
    });

    it('should include stack trace in non-production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:1:1';

      filter.catch(error, mockHost);

      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should NOT include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');

      filter.catch(error, mockHost);

      const sentResponse = mockResponse.send.mock.calls[0][0];
      expect(sentResponse.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
