import { ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { MustChangePasswordInterceptor } from './must-change-password.interceptor';

describe('MustChangePasswordInterceptor', () => {
  let interceptor: MustChangePasswordInterceptor;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new MustChangePasswordInterceptor(reflector);

    mockCallHandler = {
      handle: jest.fn(() => of({})),
    } as unknown as CallHandler;

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: null,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  });

  it('should pass through if no user (public route)', () => {
    interceptor.intercept(mockExecutionContext, mockCallHandler);
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should pass through if allowChangePassword metadata is true', () => {
    const mockRequest = { user: { mustChangePassword: true } };
    (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    interceptor.intercept(mockExecutionContext, mockCallHandler);
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should pass through if user.mustChangePassword is false', () => {
    const mockRequest = { user: { mustChangePassword: false } };
    (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    interceptor.intercept(mockExecutionContext, mockCallHandler);
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should throw ForbiddenException if user.mustChangePassword is true', () => {
    const mockRequest = { user: { mustChangePassword: true } };
    (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    expect(() => {
      interceptor.intercept(mockExecutionContext, mockCallHandler);
    }).toThrow(ForbiddenException);
  });

  it('ForbiddenException should include mustChangePassword flag', () => {
    const mockRequest = { user: { mustChangePassword: true } };
    (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    try {
      interceptor.intercept(mockExecutionContext, mockCallHandler);
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      const response = (error as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(response.statusCode).toBe(403);
      expect(response.message).toBe('You must change your password before accessing the system');
      expect(response.error).toBe('MustChangePassword');
      expect(response.mustChangePassword).toBe(true);
    }
  });
});
