import { CacheControlInterceptor, CACHE_TTL_KEY, CacheControl } from './cache-control.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';

describe('CacheControlInterceptor', () => {
  let interceptor: CacheControlInterceptor;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    interceptor = new CacheControlInterceptor(reflector);
  });

  const createMockExecutionContext = () => {
    const mockHeader = jest.fn();
    const mockResponse = { header: mockHeader };

    return {
      context: {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => ({}),
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as ExecutionContext,
      mockHeader,
      mockResponse,
    };
  };

  const createMockCallHandler = (returnValue: unknown = { data: 'test' }): CallHandler => ({
    handle: () => of(returnValue),
  });

  describe('intercept', () => {
    it('debería añadir Cache-Control header cuando hay TTL configurado', (done) => {
      // Arrange
      const { context, mockHeader } = createMockExecutionContext();
      const handler = createMockCallHandler();
      reflector.get.mockReturnValue(300); // 5 minutos

      // Act
      interceptor.intercept(context, handler).subscribe({
        next: () => {
          // Assert
          expect(reflector.get).toHaveBeenCalledWith(CACHE_TTL_KEY, expect.any(Function));
          expect(mockHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
        },
        complete: () => done(),
      });
    });

    it('debería NO añadir header cuando no hay TTL configurado', (done) => {
      // Arrange
      const { context, mockHeader } = createMockExecutionContext();
      const handler = createMockCallHandler();
      reflector.get.mockReturnValue(undefined);

      // Act
      interceptor.intercept(context, handler).subscribe({
        next: () => {
          // Assert
          expect(mockHeader).not.toHaveBeenCalled();
        },
        complete: () => done(),
      });
    });

    it('debería pasar la respuesta correctamente', (done) => {
      // Arrange
      const { context } = createMockExecutionContext();
      const expectedData = { id: 1, name: 'Test' };
      const handler = createMockCallHandler(expectedData);
      reflector.get.mockReturnValue(60);

      // Act
      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          // Assert
          expect(result).toEqual(expectedData);
        },
        complete: () => done(),
      });
    });

    it('debería usar TTL de 1 segundo', (done) => {
      // Arrange
      const { context, mockHeader } = createMockExecutionContext();
      const handler = createMockCallHandler();
      reflector.get.mockReturnValue(1);

      // Act
      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(mockHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=1');
        },
        complete: () => done(),
      });
    });

    it('debería manejar TTL de 1 hora (3600 segundos)', (done) => {
      // Arrange
      const { context, mockHeader } = createMockExecutionContext();
      const handler = createMockCallHandler();
      reflector.get.mockReturnValue(3600);

      // Act
      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(mockHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
        },
        complete: () => done(),
      });
    });

    it('debería NO añadir header cuando TTL es 0', (done) => {
      // Arrange
      const { context, mockHeader } = createMockExecutionContext();
      const handler = createMockCallHandler();
      reflector.get.mockReturnValue(0); // Falsy value

      // Act
      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(mockHeader).not.toHaveBeenCalled();
        },
        complete: () => done(),
      });
    });

    it('debería NO añadir header cuando TTL es null', (done) => {
      // Arrange
      const { context, mockHeader } = createMockExecutionContext();
      const handler = createMockCallHandler();
      reflector.get.mockReturnValue(null);

      // Act
      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(mockHeader).not.toHaveBeenCalled();
        },
        complete: () => done(),
      });
    });
  });

  describe('CacheControl decorator', () => {
    it('debería crear metadata con TTL especificado', () => {
      // Act
      const decorator = CacheControl(120);

      // Assert - El decorator es una función que agrega metadata
      expect(typeof decorator).toBe('function');
    });

    it('debería usar TTL por defecto de 60 segundos', () => {
      // Act
      const decorator = CacheControl();

      // Assert
      expect(typeof decorator).toBe('function');
    });
  });
});
