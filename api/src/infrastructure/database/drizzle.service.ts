import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type DrizzleDB = NodePgDatabase<typeof schema>;

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

    this._db = drizzle(this.pool, {
      schema,
      logger: process.env.NODE_ENV === 'development',
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
