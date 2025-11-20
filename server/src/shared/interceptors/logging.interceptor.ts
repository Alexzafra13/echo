import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { LogService, LogCategory } from '@features/logs/application/log.service';

/**
 * LoggingInterceptor
 *
 * Intercepta todas las requests HTTP y:
 * 1. Registra errores 500 en la base de datos
 * 2. Registra errores de autenticación (401, 403)
 * 3. Captura información del request para debugging
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logService: LogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    return next.handle().pipe(
      tap(() => {
        // Successful requests - no logging needed to avoid noise
      }),
      catchError((error) => {
        // Determine if we should log this error
        const statusCode = error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

        // Log 500 errors (server errors)
        if (statusCode >= 500) {
          this.logService.error(
            LogCategory.API,
            `Server error: ${method} ${url}`,
            {
              statusCode,
              userId: user?.id,
              ipAddress: ip,
              userAgent: headers['user-agent'],
              method,
              url,
              errorMessage: error.message,
            },
            error,
          );
        }
        // Log 401/403 errors (authentication/authorization failures)
        else if (statusCode === 401 || statusCode === 403) {
          this.logService.warning(
            LogCategory.AUTH,
            `Access denied: ${method} ${url}`,
            {
              statusCode,
              userId: user?.id,
              ipAddress: ip,
              userAgent: headers['user-agent'],
              method,
              url,
              reason: error.message,
            },
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
