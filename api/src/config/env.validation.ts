/**
 * Environment variable validation
 *
 * Validates required variables at startup without external dependencies.
 * Replaces Joi with a simple manual validator since we only check ~10 vars.
 */

interface ValidationError {
  field: string;
  message: string;
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const errors: ValidationError[] = [];
  const env = config.NODE_ENV || 'development';

  // DATABASE_URL — always required
  if (!config.DATABASE_URL || typeof config.DATABASE_URL !== 'string') {
    errors.push({
      field: 'DATABASE_URL',
      message: 'DATABASE_URL is required (e.g., postgresql://user:password@localhost:5432/dbname)',
    });
  }

  // JWT secrets — required in production, optional otherwise
  if (env === 'production') {
    if (
      !config.JWT_SECRET ||
      typeof config.JWT_SECRET !== 'string' ||
      config.JWT_SECRET.length < 32
    ) {
      errors.push({
        field: 'JWT_SECRET',
        message: 'JWT_SECRET is required in production and must be at least 32 characters',
      });
    }
    if (
      !config.JWT_REFRESH_SECRET ||
      typeof config.JWT_REFRESH_SECRET !== 'string' ||
      config.JWT_REFRESH_SECRET.length < 32
    ) {
      errors.push({
        field: 'JWT_REFRESH_SECRET',
        message: 'JWT_REFRESH_SECRET is required in production and must be at least 32 characters',
      });
    }
  }

  // NODE_ENV — must be valid if set
  if (config.NODE_ENV && !['development', 'production', 'test'].includes(String(config.NODE_ENV))) {
    errors.push({
      field: 'NODE_ENV',
      message: 'NODE_ENV must be development, production, or test',
    });
  }

  // LOG_LEVEL — must be valid if set
  if (
    config.LOG_LEVEL &&
    !['fatal', 'error', 'warn', 'info', 'debug', 'trace'].includes(String(config.LOG_LEVEL))
  ) {
    errors.push({
      field: 'LOG_LEVEL',
      message: 'LOG_LEVEL must be one of: fatal, error, warn, info, debug, trace',
    });
  }

  if (errors.length > 0) {
    const errorMessages = errors.map((e) => `  - ${e.field}: ${e.message}`).join('\n');

    throw new Error(
      `❌ Environment validation failed:\n${errorMessages}\n\n` +
        `Required variables:\n` +
        `  - DATABASE_URL: PostgreSQL connection string\n` +
        `  - JWT_SECRET: Auto-generated in Docker, or run: openssl rand -base64 64\n` +
        `  - JWT_REFRESH_SECRET: Auto-generated in Docker\n`
    );
  }

  // Apply defaults
  return {
    ...config,
    NODE_ENV: config.NODE_ENV || 'development',
    PORT: config.PORT ? Number(config.PORT) : 4567,
    REDIS_HOST: config.REDIS_HOST || 'localhost',
    REDIS_PORT: config.REDIS_PORT ? Number(config.REDIS_PORT) : 6379,
    VERSION: config.VERSION || '1.0.2',
  };
}
