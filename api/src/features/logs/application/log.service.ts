import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { eq, and, gte, lte, desc, count } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { systemLogs } from '@infrastructure/database/schema';

/**
 * Log severity levels
 */
export enum LogLevel {
  CRITICAL = 'critical', // Critical errors requiring immediate attention
  ERROR = 'error', // Errors affecting functionality
  WARNING = 'warning', // Warnings that don't block operation
  INFO = 'info', // General information
  DEBUG = 'debug', // Debugging information
}

/**
 * Log categories for filtering
 */
export enum LogCategory {
  SCANNER = 'scanner', // Library scanning
  METADATA = 'metadata', // Metadata enrichment
  AUTH = 'auth', // Authentication and authorization
  API = 'api', // HTTP requests
  STORAGE = 'storage', // Storage operations
  CLEANUP = 'cleanup', // Orphan file cleanup
  STREAM = 'stream', // Audio streaming
  DATABASE = 'database', // Database operations
  CACHE = 'cache', // Cache operations
  EXTERNAL_API = 'external', // External API calls
}

/**
 * Interface for additional log metadata
 */
export interface LogMetadata {
  userId?: string;
  entityId?: string;
  entityType?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: string | number | boolean | null | undefined; // Allow additional fields
}

/**
 * LogService
 *
 * Centralized logging service with:
 * - Severity levels
 * - Categorization
 * - DB storage (critical/error logs)
 * - Console logging
 * - Enriched metadata
 */
@Injectable()
export class LogService {
  // Only persist important logs to DB (critical, error, warning)
  // INFO and DEBUG go only to console to reduce database noise
  private readonly PERSIST_LEVELS = new Set([LogLevel.CRITICAL, LogLevel.ERROR, LogLevel.WARNING]);

  constructor(
    @InjectPinoLogger(LogService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService
  ) {}

  /**
   * Critical log - Requires immediate attention
   */
  async critical(
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
    error?: Error
  ): Promise<void> {
    await this.log(LogLevel.CRITICAL, category, message, metadata, error);
  }

  /**
   * Error log
   */
  async error(
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
    error?: Error
  ): Promise<void> {
    await this.log(LogLevel.ERROR, category, message, metadata, error);
  }

  /**
   * Warning log
   */
  async warning(category: LogCategory, message: string, metadata?: LogMetadata): Promise<void> {
    await this.log(LogLevel.WARNING, category, message, metadata);
  }

  /**
   * Info log
   */
  async info(category: LogCategory, message: string, metadata?: LogMetadata): Promise<void> {
    await this.log(LogLevel.INFO, category, message, metadata);
  }

  /**
   * Debug log
   */
  async debug(category: LogCategory, message: string, metadata?: LogMetadata): Promise<void> {
    await this.log(LogLevel.DEBUG, category, message, metadata);
  }

  /**
   * Main logging method
   */
  private async log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
    error?: Error
  ): Promise<void> {
    try {
      // 1. Console logging (always)
      this.logToConsole(level, category, message, metadata, error);

      // 2. Persist to DB only important logs (critical, error, warning)
      if (this.PERSIST_LEVELS.has(level)) {
        await this.persistLog(level, category, message, metadata, error);
      }
    } catch (logError) {
      // Don't let logging failures break the app
      this.logger.error({ error: logError }, 'Failed to log message');
    }
  }

  /**
   * Console logging using Pino logger
   */
  private logToConsole(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
    error?: Error
  ): void {
    const logContext = {
      category,
      ...metadata,
      ...(error && { error: { message: error.message, stack: error.stack } }),
    };

    switch (level) {
      case LogLevel.CRITICAL:
      case LogLevel.ERROR:
        this.logger.error(logContext, message);
        break;
      case LogLevel.WARNING:
        this.logger.warn(logContext, message);
        break;
      case LogLevel.INFO:
        this.logger.info(logContext, message);
        break;
      case LogLevel.DEBUG:
        this.logger.debug(logContext, message);
        break;
    }
  }

  /**
   * Persist log to database
   */
  private async persistLog(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: LogMetadata,
    error?: Error
  ): Promise<void> {
    try {
      // Prepare details as JSON
      const details = metadata ? JSON.stringify(metadata, null, 2) : null;

      await this.drizzle.db.insert(systemLogs).values({
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
      });
    } catch (dbError) {
      // Fallback to console if DB fails
      this.logger.error({ error: dbError }, 'Failed to persist log to database');
    }
  }

  /**
   * Get logs with filters
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

    // Build conditions array
    const conditions = [];
    if (level) conditions.push(eq(systemLogs.level, level));
    if (category) conditions.push(eq(systemLogs.category, category));
    if (userId) conditions.push(eq(systemLogs.userId, userId));
    if (entityId) conditions.push(eq(systemLogs.entityId, entityId));
    if (startDate) conditions.push(gte(systemLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(systemLogs.createdAt, endDate));

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const [logs, totalResult] = await Promise.all([
      this.drizzle.db
        .select()
        .from(systemLogs)
        .where(whereCondition)
        .orderBy(desc(systemLogs.createdAt))
        .limit(Math.min(limit, 500)) // Max 500
        .offset(offset),
      this.drizzle.db.select({ count: count() }).from(systemLogs).where(whereCondition),
    ]);

    return {
      logs,
      total: totalResult[0]?.count ?? 0,
      limit,
      offset,
    };
  }

  /**
   * Get log statistics
   */
  async getLogStats(params?: { startDate?: Date; endDate?: Date }): Promise<{
    totalLogs: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    const conditions = [];
    if (params?.startDate) conditions.push(gte(systemLogs.createdAt, params.startDate));
    if (params?.endDate) conditions.push(lte(systemLogs.createdAt, params.endDate));

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, byLevelResult, byCategoryResult] = await Promise.all([
      this.drizzle.db.select({ count: count() }).from(systemLogs).where(whereCondition),
      this.drizzle.db
        .select({
          level: systemLogs.level,
          count: count(),
        })
        .from(systemLogs)
        .where(whereCondition)
        .groupBy(systemLogs.level),
      this.drizzle.db
        .select({
          category: systemLogs.category,
          count: count(),
        })
        .from(systemLogs)
        .where(whereCondition)
        .groupBy(systemLogs.category),
    ]);

    return {
      totalLogs: totalResult[0]?.count ?? 0,
      byLevel: Object.fromEntries(byLevelResult.map((g) => [g.level, g.count])),
      byCategory: Object.fromEntries(byCategoryResult.map((g) => [g.category, g.count])),
    };
  }

  /**
   * Clean up old logs (keep only last N days)
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.drizzle.db
      .delete(systemLogs)
      .where(lte(systemLogs.createdAt, cutoffDate))
      .returning();

    this.logger.info({ count: result.length, daysToKeep, cutoffDate }, 'Cleaned up old logs');

    return result.length;
  }
}
