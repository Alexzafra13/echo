import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LogService, LogCategory } from '@features/logs/application/log.service';
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@shared/errors';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logService: jest.Mocked<LogService>;

  beforeEach(() => {
    logService = {
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<LogService>;

    interceptor = new LoggingInterceptor(logService);
  });

  const createMockExecutionContext = (overrides: Partial<{
    method: string;
    url: string;
    user: { id: string } | undefined;
    ip: string;
    headers: Record<string, string>;
  }> = {}) => {
    const mockRequest = {
      method: overrides.method ?? 'GET',
      url: overrides.url ?? '/api/albums',
      user: overrides.user,
      ip: overrides.ip ?? '127.0.0.1',
      headers: overrides.headers ?? { 'user-agent': 'Jest Test Agent' },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (returnValue: unknown = { data: 'test' }): CallHandler => ({
    handle: () => of(returnValue),
  });

  const createErrorCallHandler = (error: Error): CallHandler => ({
    handle: () => throwError(() => error),
  });

  describe('intercept - successful requests', () => {
    it('debería pasar la respuesta sin logging para requests exitosos', (done) => {
      // Arrange
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ id: 1 });

      // Act
      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          // Assert
          expect(result).toEqual({ id: 1 });
          expect(logService.error).not.toHaveBeenCalled();
          expect(logService.warning).not.toHaveBeenCalled();
        },
        complete: () => done(),
      });
    });
  });

  describe('intercept - 500 server errors', () => {
    it('debería loggear error 500 con detalles completos', (done) => {
      // Arrange
      const context = createMockExecutionContext({
        method: 'POST',
        url: '/api/albums',
        user: { id: 'user-123' },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
      });
      const error = new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
      const handler = createErrorCallHandler(error);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: () => {
          // Assert
          expect(logService.error).toHaveBeenCalledWith(
            LogCategory.API,
            'Server error: POST /api/albums',
            expect.objectContaining({
              statusCode: 500,
              userId: 'user-123',
              ipAddress: '192.168.1.1',
              userAgent: 'Mozilla/5.0',
              method: 'POST',
              url: '/api/albums',
              errorMessage: 'Internal Server Error',
            }),
            error,
          );
          done();
        },
      });
    });

    it('debería loggear errores generales como 500', (done) => {
      // Arrange
      const context = createMockExecutionContext();
      const error = new Error('Unexpected database error');
      const handler = createErrorCallHandler(error);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(logService.error).toHaveBeenCalledWith(
            LogCategory.API,
            expect.stringContaining('Server error'),
            expect.objectContaining({
              statusCode: 500,
              errorMessage: 'Unexpected database error',
            }),
            error,
          );
          done();
        },
      });
    });

    it('debería loggear error 502 Bad Gateway', (done) => {
      // Arrange
      const context = createMockExecutionContext();
      const error = new HttpException('Bad Gateway', HttpStatus.BAD_GATEWAY);
      const handler = createErrorCallHandler(error);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(logService.error).toHaveBeenCalledWith(
            LogCategory.API,
            expect.stringContaining('Server error'),
            expect.objectContaining({
              statusCode: 502,
            }),
            error,
          );
          done();
        },
      });
    });
  });

  describe('intercept - 401/403 authentication errors', () => {
    it('debería loggear error 401 como warning', (done) => {
      // Arrange
      const context = createMockExecutionContext({
        user: { id: 'user-456' },
      });
      const error = new UnauthorizedError('Invalid token');
      const handler = createErrorCallHandler(error);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(logService.warning).toHaveBeenCalledWith(
            LogCategory.AUTH,
            expect.stringContaining('Access denied'),
            expect.objectContaining({
              statusCode: 401,
              reason: 'Invalid token',
            }),
          );
          expect(logService.error).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('debería loggear error 403 como warning', (done) => {
      // Arrange
      const context = createMockExecutionContext();
      const error = new ForbiddenError('No access to resource');
      const handler = createErrorCallHandler(error);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(logService.warning).toHaveBeenCalledWith(
            LogCategory.AUTH,
            expect.stringContaining('Access denied'),
            expect.objectContaining({
              statusCode: 403,
              reason: 'No access to resource',
            }),
          );
          done();
        },
      });
    });

    it('debería loggear HttpException 401', (done) => {
      // Arrange
      const context = createMockExecutionContext();
      const error = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      const handler = createErrorCallHandler(error);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(logService.warning).toHaveBeenCalledWith(
            LogCategory.AUTH,
            expect.any(String),
            expect.objectContaining({
              statusCode: 401,
            }),
          );
          done();
        },
      });
    });
  });

  describe('intercept - non-loggable errors', () => {
    it('NO debería loggear error 400 (validation)', (done) => {
      // Arrange
      const context = createMockExecutionContext();
      const error = new ValidationError('Invalid input');
      const handler = createErrorCallHandler(error);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(logService.error).not.toHaveBeenCalled();
          expect(logService.warning).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('NO debería loggear error 404', (done) => {
      // Arrange
      const context = createMockExecutionContext();
      const error = new NotFoundError('Album', 'album-123');
      const handler = createErrorCallHandler(error);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(logService.error).not.toHaveBeenCalled();
          expect(logService.warning).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('NO debería loggear error 409 Conflict', (done) => {
      // Arrange
      const context = createMockExecutionContext();
      const error = new HttpException('Conflict', HttpStatus.CONFLICT);
      const handler = createErrorCallHandler(error);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(logService.error).not.toHaveBeenCalled();
          expect(logService.warning).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('intercept - error re-throwing', () => {
    it('debería re-lanzar el error original', (done) => {
      // Arrange
      const context = createMockExecutionContext();
      const originalError = new Error('Original error');
      const handler = createErrorCallHandler(originalError);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: (error) => {
          expect(error).toBe(originalError);
          done();
        },
      });
    });

    it('debería re-lanzar HttpException', (done) => {
      // Arrange
      const context = createMockExecutionContext();
      const originalError = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const handler = createErrorCallHandler(originalError);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: (error) => {
          expect(error).toBe(originalError);
          expect(error).toBeInstanceOf(HttpException);
          done();
        },
      });
    });
  });

  describe('intercept - request metadata', () => {
    it('debería manejar request sin usuario autenticado', (done) => {
      // Arrange
      const context = createMockExecutionContext({
        user: undefined,
      });
      const error = new HttpException('Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
      const handler = createErrorCallHandler(error);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(logService.error).toHaveBeenCalledWith(
            LogCategory.API,
            expect.any(String),
            expect.objectContaining({
              userId: undefined,
            }),
            error,
          );
          done();
        },
      });
    });

    it('debería capturar diferentes métodos HTTP', (done) => {
      // Arrange
      const context = createMockExecutionContext({
        method: 'DELETE',
        url: '/api/albums/123',
      });
      const error = new HttpException('Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
      const handler = createErrorCallHandler(error);

      // Act
      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(logService.error).toHaveBeenCalledWith(
            LogCategory.API,
            'Server error: DELETE /api/albums/123',
            expect.objectContaining({
              method: 'DELETE',
              url: '/api/albums/123',
            }),
            error,
          );
          done();
        },
      });
    });
  });
});
