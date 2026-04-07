import { Injectable, OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { settings } from '@infrastructure/database/schema';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

// Prioridad: 1) env var, 2) base de datos, 3) generar nuevo
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
    // Inicialización síncrona para que JwtStrategy acceda en su constructor
    if (process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET) {
      this._jwtSecret = process.env.JWT_SECRET;
      this._jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      this.initialized = true;
    }
  }

  async onModuleInit() {
    if (!this.initialized) {
      await this.initializeSecrets();
    }
  }

  get jwtSecret(): string {
    if (!this.initialized) {
      throw new Error('SecuritySecretsService not initialized. Call initializeSecrets() first.');
    }
    return this._jwtSecret;
  }

  get jwtRefreshSecret(): string {
    if (!this.initialized) {
      throw new Error('SecuritySecretsService not initialized. Call initializeSecrets() first.');
    }
    return this._jwtRefreshSecret;
  }

  async initializeSecrets(): Promise<void> {
    if (this.initialized) return;

    this._jwtSecret = await this.getOrCreateSecret('jwt_secret', process.env.JWT_SECRET);
    this._jwtRefreshSecret = await this.getOrCreateSecret('jwt_refresh_secret', process.env.JWT_REFRESH_SECRET);

    this.initialized = true;
    this.logger.info('Security secrets initialized');
  }

  private async getOrCreateSecret(key: string, envValue?: string): Promise<string> {
    if (envValue) {
      this.logger.debug({ key }, 'Using secret from environment variable');
      return envValue;
    }

    const existing = await this.drizzle.db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing[0]) {
      this.logger.debug({ key }, 'Using secret from database');
      return existing[0].value;
    }

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

  private generateSecureSecret(): string {
    return randomBytes(64).toString('base64');
  }
}
