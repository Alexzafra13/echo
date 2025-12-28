import * as Joi from 'joi';

/**
 * Environment variables validation schema
 *
 * MINIMAL CONFIGURATION:
 * Most settings have sensible defaults or are configured via the admin interface.
 * Only infrastructure secrets (database, redis, jwt) need environment variables.
 *
 * Required in production:
 * - DATABASE_URL
 * - JWT_SECRET (auto-generated in Docker)
 * - JWT_REFRESH_SECRET (auto-generated in Docker)
 *
 * Optional with defaults:
 * - NODE_ENV (development)
 * - PORT (4567)
 * - REDIS_HOST (localhost)
 * - REDIS_PORT (6379)
 * - REDIS_PASSWORD (empty in dev)
 */
export const envValidationSchema = Joi.object({
  // ============================================
  // Core Application
  // ============================================
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number()
    .port()
    .default(4567),

  // ============================================
  // Database (Required)
  // ============================================
  DATABASE_URL: Joi.string()
    .required()
    .messages({
      'any.required': 'DATABASE_URL is required (e.g., postgresql://user:password@localhost:5432/dbname)',
    }),

  // ============================================
  // JWT Secrets (Auto-generated in Docker)
  // ============================================
  JWT_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required()
        .messages({
          'any.required': 'JWT_SECRET is required in production (auto-generated in Docker)',
          'string.min': 'JWT_SECRET must be at least 32 characters',
        }),
      otherwise: Joi.optional(),
    }),

  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required()
        .messages({
          'any.required': 'JWT_REFRESH_SECRET is required in production',
          'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters',
        }),
      otherwise: Joi.optional(),
    }),

  // ============================================
  // Redis (Optional - defaults work for Docker)
  // ============================================
  REDIS_HOST: Joi.string()
    .default('localhost'),

  REDIS_PORT: Joi.number()
    .port()
    .default(6379),

  REDIS_PASSWORD: Joi.string()
    .optional()
    .allow(''),

  // ============================================
  // Optional Overrides (have sensible defaults)
  // ============================================

  // Data directory (Docker: /app/data, Dev: ./data)
  DATA_PATH: Joi.string()
    .optional(),

  // Logging level (auto-detects from NODE_ENV)
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .optional(),

  // Build metadata (set by CI/CD)
  VERSION: Joi.string()
    .optional()
    .default('1.0.0'),

  // ============================================
  // Database Pool Settings (Production Tuning)
  // ============================================
  DB_POOL_MAX: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),

  DB_POOL_MIN: Joi.number()
    .integer()
    .min(0)
    .max(20)
    .default(2),

  DB_IDLE_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .default(30000),

  DB_CONNECTION_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .default(5000),

  DB_STATEMENT_TIMEOUT: Joi.number()
    .integer()
    .min(0)
    .default(60000),

  // ============================================
  // Rate Limiting
  // ============================================
  RATE_LIMIT_DEFAULT: Joi.number()
    .integer()
    .min(10)
    .max(10000)
    .default(300),

  // ============================================
  // Graceful Shutdown
  // ============================================
  SHUTDOWN_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(60000)
    .default(10000),
});

/**
 * Validates environment variables on application startup
 */
export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const { error, value } = envValidationSchema.validate(config, {
    allowUnknown: true, // Allow other env vars not in schema
    abortEarly: false,  // Show all errors at once
  });

  if (error) {
    const errorMessages = error.details.map(detail => `  - ${detail.message}`).join('\n');

    throw new Error(
      `❌ Environment validation failed:\n${errorMessages}\n\n` +
      `Required variables:\n` +
      `  - DATABASE_URL: PostgreSQL connection string\n` +
      `  - JWT_SECRET: Auto-generated in Docker, or run: openssl rand -base64 64\n` +
      `  - JWT_REFRESH_SECRET: Auto-generated in Docker\n`
    );
  }

  return value;
}
