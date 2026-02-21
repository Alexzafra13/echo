import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LogService, LogCategory } from '@features/logs/application/log.service';
import { BaseError, getHttpStatusForError } from '@shared/errors/base.error';

// Registra errores 500 y 401/403 en BD. Los 400 no se loguean (son errores de usuario normales).
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logService: LogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    return next.handle().pipe(
      catchError((error) => {
        let statusCode: number;
        if (error instanceof HttpException) {
          statusCode = error.getStatus();
        } else if (error instanceof BaseError) {
          statusCode = getHttpStatusForError(error.code);
        } else {
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        }

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
            error
          );
        } else if (statusCode === 401 || statusCode === 403) {
          this.logService.warning(LogCategory.AUTH, `Access denied: ${method} ${url}`, {
            statusCode,
            userId: user?.id,
            ipAddress: ip,
            userAgent: headers['user-agent'],
            method,
            url,
            reason: error.message,
          });
        }

        return throwError(() => error);
      })
    );
  }
}
