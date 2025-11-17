import { Injectable, Logger as NestLogger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

/**
 * Niveles de severidad de logs
 */
export enum LogLevel {
  CRITICAL = 'critical', // Errores críticos que requieren atención inmediata
  ERROR = 'error',       // Errores que afectan funcionalidad
  WARNING = 'warning',   // Advertencias que no bloquean operación
  INFO = 'info',         // Información general
  DEBUG = 'debug',       // Información de debugging
}

/**
 * Categorías de logs para facilitar filtrado
 */
export enum LogCategory {
  SCANNER = 'scanner',         // Escaneo de biblioteca
  METADATA = 'metadata',       // Enriquecimiento de metadata
  AUTH = 'auth',              // Autenticación y autorización
  API = 'api',                // Requests HTTP
  STORAGE = 'storage',        // Operaciones de almacenamiento
  CLEANUP = 'cleanup',        // Limpieza de archivos huérfanos
  STREAM = 'stream',          // Streaming de audio
  DATABASE = 'database',      // Operaciones de base de datos
  CACHE = 'cache',            // Operaciones de caché
  EXTERNAL_API = 'external',  // Llamadas a APIs externas
}

/**
 * Interface para metadata adicional de logs
 */
export interface LogMetadata {
  userId?: string;
  entityId?: string;
  entityType?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any; // Permitir campos adicionales
}

/**
 * LogService
 *
 * Servicio centralizado para logging de la aplicación con:
 * - Niveles de severidad
 * - Categorización
 * - Almacenamiento en BD (logs críticos/errores)
 * - Logging a consola
 * - Metadata enriquecida
 */
@Injectable()
export class LogService {
  private readonly logger = new NestLogger(LogService.name);
  private readonly PERSIST_LEVELS = new Set([LogLevel.CRITICAL, LogLevel.ERROR, LogLevel.WARNING]);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log crítico - Requiere atención inmediata
   */
  async critical(
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
    error?: Error,
  ): Promise<void> {
    await this.log(LogLevel.CRITICAL, category, message, metadata, error);
  }

  /**
   * Log de error
   */
  async error(
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
    error?: Error,
  ): Promise<void> {
    await this.log(LogLevel.ERROR, category, message, metadata, error);
  }

  /**
   * Log de advertencia
   */
  async warning(
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
  ): Promise<void> {
    await this.log(LogLevel.WARNING, category, message, metadata);
  }

  /**
   * Log informativo
   */
  async info(
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
  ): Promise<void> {
    await this.log(LogLevel.INFO, category, message, metadata);
  }

  /**
   * Log de debug
   */
  async debug(
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
  ): Promise<void> {
    await this.log(LogLevel.DEBUG, category, message, metadata);
  }

  /**
   * Método principal de logging
   */
  private async log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
    error?: Error,
  ): Promise<void> {
    try {
      // 1. Logging a consola (siempre)
      this.logToConsole(level, category, message, metadata, error);

      // 2. Persistir en BD solo logs importantes (critical, error, warning)
      if (this.PERSIST_LEVELS.has(level)) {
        await this.persistLog(level, category, message, metadata, error);
      }
    } catch (logError) {
      // No queremos que fallos en logging rompan la app
      this.logger.error(`Failed to log: ${(logError as Error).message}`);
    }
  }

  /**
   * Logging a consola usando logger de NestJS
   */
  private logToConsole(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
    error?: Error,
  ): void {
    const prefix = `[${category.toUpperCase()}]`;
    const fullMessage = `${prefix} ${message}`;
    const context = metadata ? JSON.stringify(metadata) : undefined;

    switch (level) {
      case LogLevel.CRITICAL:
      case LogLevel.ERROR:
        if (error) {
          this.logger.error(fullMessage, error.stack, context);
        } else {
          this.logger.error(fullMessage, context);
        }
        break;
      case LogLevel.WARNING:
        this.logger.warn(fullMessage, context);
        break;
      case LogLevel.INFO:
        this.logger.log(fullMessage, context);
        break;
      case LogLevel.DEBUG:
        this.logger.debug(fullMessage, context);
        break;
    }
  }

  /**
   * Persistir log en base de datos
   */
  private async persistLog(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
    error?: Error,
  ): Promise<void> {
    try {
      // Preparar detalles como JSON
      const details = metadata ? JSON.stringify(metadata, null, 2) : null;

      await this.prisma.systemLog.create({
        data: {
          level,
          category,
          message,
          details,
          userId: metadata?.userId,
          entityId: metadata?.entityId,
          entityType: metadata?.entityType,
          requestId: metadata?.requestId,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          stackTrace: error?.stack,
        },
      });
    } catch (dbError) {
      // Fallback a consola si falla BD
      this.logger.error(
        `Failed to persist log to database: ${(dbError as Error).message}`,
      );
    }
  }

  /**
   * Obtener logs con filtros
   */
  async getLogs(params: {
    level?: LogLevel;
    category?: LogCategory;
    userId?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const {
      level,
      category,
      userId,
      entityId,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = params;

    const where: any = {};

    if (level) where.level = level;
    if (category) where.category = category;
    if (userId) where.userId = userId;
    if (entityId) where.entityId = entityId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 500), // Máximo 500
        skip: offset,
      }),
      this.prisma.systemLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit,
      offset,
    };
  }

  /**
   * Obtener estadísticas de logs
   */
  async getLogStats(params?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalLogs: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    const where: any = {};

    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [totalLogs, byLevel, byCategory] = await Promise.all([
      this.prisma.systemLog.count({ where }),
      this.prisma.systemLog.groupBy({
        by: ['level'],
        where,
        _count: true,
      }),
      this.prisma.systemLog.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
    ]);

    return {
      totalLogs,
      byLevel: Object.fromEntries(byLevel.map((g) => [g.level, g._count])),
      byCategory: Object.fromEntries(byCategory.map((g) => [g.category, g._count])),
    };
  }

  /**
   * Limpiar logs antiguos (mantener solo últimos N días)
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.systemLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} logs older than ${daysToKeep} days`,
    );

    return result.count;
  }
}
