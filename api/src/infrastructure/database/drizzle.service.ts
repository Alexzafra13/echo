import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type DrizzleDB = NodePgDatabase<typeof schema>;

/**
 * Custom Drizzle logger that formats SQL queries more concisely
 * - Truncates long queries to avoid console spam
 * - Shows compact parameter representation
 * - Only logs in development mode
 */
class CompactDrizzleLogger {
  private readonly MAX_QUERY_LENGTH = 200;
  private readonly MAX_PARAMS_LENGTH = 100;

  constructor(private readonly pinoLogger: PinoLogger) {}

  logQuery(query: string, params: unknown[]): void {
    // Compact query: remove extra whitespace and truncate if too long
    const compactQuery = query.replace(/\s+/g, ' ').trim();
    const displayQuery = compactQuery.length > this.MAX_QUERY_LENGTH
      ? `${compactQuery.substring(0, this.MAX_QUERY_LENGTH)}...`
      : compactQuery;

    // Compact params: stringify and truncate
    const paramsStr = params.length > 0
      ? JSON.stringify(params)
      : '';
    const displayParams = paramsStr.length > this.MAX_PARAMS_LENGTH
      ? `${paramsStr.substring(0, this.MAX_PARAMS_LENGTH)}...`
      : paramsStr;

    // Log as debug level with compact format
    if (displayParams) {
      this.pinoLogger.debug(`SQL: ${displayQuery} | params: ${displayParams}`);
    } else {
      this.pinoLogger.debug(`SQL: ${displayQuery}`);
    }
  }
}

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private _db: DrizzleDB;

  constructor(
    @InjectPinoLogger(DrizzleService.name)
    private readonly logger: PinoLogger,
  ) {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Use custom compact logger in development, no logging in production
    const isDev = process.env.NODE_ENV === 'development';
    this._db = drizzle(this.pool, {
      schema,
      logger: isDev ? new CompactDrizzleLogger(this.logger) : false,
    });
  }

  /**
   * Get the Drizzle database instance
   */
  get db(): DrizzleDB {
    return this._db;
  }

  /**
   * Get the underlying pg Pool for raw queries if needed
   */
  get client(): Pool {
    return this.pool;
  }

  async onModuleInit() {
    // Test connection
    try {
      const client = await this.pool.connect();
      client.release();
      this.logger.info('Drizzle connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.info('Drizzle disconnected from database');
  }
}
