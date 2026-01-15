import { Injectable, OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { settings } from '@infrastructure/database/schema';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

/**
 * SecuritySecretsService - Auto-generates and persists JWT secrets
 *
 * Secrets are auto-generated on first run and stored in the database.
 * Users don't need to configure them manually.
 *
 * Priority:
 * 1. Environment variable (if set by user)
 * 2. Database setting (auto-generated on first run)
 * 3. Generate new and save to database
 */
@Injectable()
export class SecuritySecretsService implements OnModuleInit {
  private _jwtSecret: string = '';
  private _jwtRefreshSecret: string = '';
  private initialized = false;

  constructor(
    private readonly drizzle: DrizzleService,
    @InjectPinoLogger(SecuritySecretsService.name)
    private readonly logger: PinoLogger,
  ) {
    // Synchronous initialization from environment variables
    // This allows JwtStrategy to access secrets in its constructor
    if (process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET) {
      this._jwtSecret = process.env.JWT_SECRET;
      this._jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      this.initialized = true;
    }
  }

  async onModuleInit() {
    // Only initialize from database if not already initialized from env vars
    if (!this.initialized) {
      await this.initializeSecrets();
    }
  }

  /**
   * Get the JWT secret for access tokens
   */
  get jwtSecret(): string {
    if (!this.initialized) {
      throw new Error('SecuritySecretsService not initialized. Call initializeSecrets() first.');
    }
    return this._jwtSecret;
  }

  /**
   * Get the JWT secret for refresh tokens
   */
  get jwtRefreshSecret(): string {
    if (!this.initialized) {
      throw new Error('SecuritySecretsService not initialized. Call initializeSecrets() first.');
    }
    return this._jwtRefreshSecret;
  }

  /**
   * Initialize secrets from env vars or database, generating if needed
   */
  async initializeSecrets(): Promise<void> {
    if (this.initialized) return;

    this._jwtSecret = await this.getOrCreateSecret('jwt_secret', process.env.JWT_SECRET);
    this._jwtRefreshSecret = await this.getOrCreateSecret('jwt_refresh_secret', process.env.JWT_REFRESH_SECRET);

    this.initialized = true;
    this.logger.info('Security secrets initialized');
  }

  /**
   * Get secret from env var, database, or generate new one
   */
  private async getOrCreateSecret(key: string, envValue?: string): Promise<string> {
    // Priority 1: Environment variable (user explicitly set it)
    if (envValue) {
      this.logger.debug({ key }, 'Using secret from environment variable');
      return envValue;
    }

    // Priority 2: Database setting (previously auto-generated)
    const existing = await this.drizzle.db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing[0]) {
      this.logger.debug({ key }, 'Using secret from database');
      return existing[0].value;
    }

    // Priority 3: Generate new secret and save to database
    const newSecret = this.generateSecureSecret();

    await this.drizzle.db
      .insert(settings)
      .values({
        key,
        value: newSecret,
        category: 'security',
        type: 'secret',
        description: `Auto-generated ${key} on first run. Do not modify manually.`,
        isPublic: false,
      })
      .onConflictDoNothing();

    this.logger.info({ key }, 'Generated and saved new secret to database');
    return newSecret;
  }

  /**
   * Generate a cryptographically secure random secret
   */
  private generateSecureSecret(): string {
    return randomBytes(64).toString('base64');
  }
}
