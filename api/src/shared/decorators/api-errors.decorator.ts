import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * Decorator para documentar respuestas de error comunes en Swagger
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @ApiCommonErrors()
 * async getAlbum(@Param('id') id: string) { ... }
 * ```
 */
export function ApiCommonErrors() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Bad Request - Datos de entrada inválidos',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Validation failed' },
          error: { type: 'string', example: 'VALIDATION_ERROR' },
          timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
          path: { type: 'string', example: '/api/albums' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Token JWT inválido o expirado',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Invalid or expired token' },
          error: { type: 'string', example: 'UNAUTHORIZED' },
          timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
          path: { type: 'string', example: '/api/albums' },
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error - Error interno del servidor',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 500 },
          message: { type: 'string', example: 'Internal server error' },
          error: { type: 'string', example: 'INTERNAL_ERROR' },
          timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
          path: { type: 'string', example: '/api/albums' },
        },
      },
    }),
  );
}

/**
 * Decorator para documentar errores en endpoints que buscan por ID
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @ApiNotFoundError('Álbum')
 * async getAlbum(@Param('id') id: string) { ... }
 * ```
 */
export function ApiNotFoundError(resourceName: string = 'Resource') {
  return ApiResponse({
    status: 404,
    description: `Not Found - ${resourceName} no encontrado`,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: `${resourceName} not found` },
        error: { type: 'string', example: 'NOT_FOUND' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        path: { type: 'string', example: '/api/resource/id' },
      },
    },
  });
}

/**
 * Decorator para documentar error de acceso prohibido
 */
export function ApiForbiddenError() {
  return ApiResponse({
    status: 403,
    description: 'Forbidden - No tienes permisos para acceder a este recurso',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied' },
        error: { type: 'string', example: 'FORBIDDEN' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        path: { type: 'string', example: '/api/admin/users' },
      },
    },
  });
}

/**
 * Decorator combinado para endpoints protegidos que buscan por ID
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @ApiProtectedEndpoint('Álbum')
 * async getAlbum(@Param('id') id: string) { ... }
 * ```
 */
export function ApiProtectedEndpoint(resourceName: string = 'Resource') {
  return applyDecorators(
    ApiCommonErrors(),
    ApiNotFoundError(resourceName),
  );
}

/**
 * Decorator para endpoints de admin
 *
 * @example
 * ```typescript
 * @Post()
 * @ApiAdminEndpoint()
 * async createUser(@Body() dto: CreateUserDto) { ... }
 * ```
 */
export function ApiAdminEndpoint() {
  return applyDecorators(
    ApiCommonErrors(),
    ApiForbiddenError(),
  );
}
