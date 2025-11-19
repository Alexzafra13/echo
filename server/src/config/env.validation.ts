import * as Joi from 'joi';

/**
 * Environment variables validation schema
 * This ensures all required variables are present and have valid values
 */
export const envValidationSchema = Joi.object({
  // ============================================
  // Application Configuration
  // ============================================
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number()
    .port()
    .default(4567),

  HOST: Joi.string()
    .default('0.0.0.0'),

  API_PREFIX: Joi.string()
    .default('api'),

  // ============================================
  // Security - JWT Configuration
  // ============================================
  JWT_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required()
        .messages({
          'any.required': 'JWT_SECRET is required in production! Generate with: openssl rand -base64 64',
          'string.min': 'JWT_SECRET must be at least 32 characters long for security',
        }),
      otherwise: Joi.optional(),
    }),

  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required()
        .messages({
          'any.required': 'JWT_REFRESH_SECRET is required in production!',
          'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters long',
        }),
      otherwise: Joi.optional(),
    }),

  JWT_EXPIRATION: Joi.string()
    .default('7d')
    .pattern(/^\d+[smhd]$/)
    .messages({
      'string.pattern.base': 'JWT_EXPIRATION must be in format: 1s, 1m, 1h, 1d (e.g., "7d" for 7 days)',
    }),

  JWT_REFRESH_EXPIRATION: Joi.string()
    .default('30d')
    .pattern(/^\d+[smhd]$/),

  BCRYPT_ROUNDS: Joi.number()
    .min(10)
    .max(14)
    .default(12)
    .messages({
      'number.min': 'BCRYPT_ROUNDS must be at least 10 for security',
      'number.max': 'BCRYPT_ROUNDS should not exceed 14 (performance impact)',
    }),

  // ============================================
  // Database Configuration
  // ============================================
  DATABASE_URL: Joi.string()
    .uri()
    .required()
    .messages({
      'any.required': 'DATABASE_URL is required (e.g., postgresql://user:password@localhost:5432/dbname)',
    }),

  // ============================================
  // Redis/Cache Configuration
  // ============================================
  REDIS_HOST: Joi.string()
    .default('localhost'),

  REDIS_PORT: Joi.number()
    .port()
    .default(6379),

  REDIS_PASSWORD: Joi.string()
    .optional()
    .allow('')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string()
        .min(12)
        .messages({
          'string.min': 'REDIS_PASSWORD should be at least 12 characters in production',
        }),
    }),

  ENABLE_CACHE: Joi.boolean()
    .default(true),

  CACHE_ALBUM_TTL: Joi.number()
    .integer()
    .min(60)
    .default(3600),

  CACHE_TRACK_TTL: Joi.number()
    .integer()
    .min(60)
    .default(3600),

  CACHE_ARTIST_TTL: Joi.number()
    .integer()
    .min(60)
    .default(7200),

  // ============================================
  // CORS Configuration
  // ============================================
  CORS_ORIGINS: Joi.string()
    .optional()
    .allow('')
    .custom((value, helpers) => {
      // Allow empty string (will auto-configure in main.ts)
      if (!value || value.trim() === '') {
        return value;
      }

      const origins = value.split(',');
      const validOrigins = origins.every((origin: string) => {
        const trimmedOrigin = origin.trim();

        // Skip empty values
        if (!trimmedOrigin) {
          return true;
        }

        try {
          new URL(trimmedOrigin);
          return true;
        } catch {
          return false;
        }
      });

      if (!validOrigins) {
        return helpers.error('any.invalid');
      }

      return value;
    })
    .messages({
      'any.invalid': 'CORS_ORIGINS must be comma-separated valid URLs (e.g., http://localhost:5173,https://example.com)',
    }),

  // ============================================
  // File Storage Configuration
  // ============================================
  MUSIC_LIBRARY_PATH: Joi.string()
    .default('/music')
    .description('Path to the music library (read-only recommended)'),

  UPLOAD_PATH: Joi.string()
    .default('./uploads/music')
    .description('Path where uploaded music files are stored'),

  COVERS_PATH: Joi.string()
    .default('./uploads/covers')
    .description('Path where album cover images are stored'),

  // ============================================
  // Optional Build Metadata
  // ============================================
  VERSION: Joi.string()
    .optional()
    .default('1.0.0'),

  BUILD_DATE: Joi.string()
    .optional(),

  VCS_REF: Joi.string()
    .optional(),
});

/**
 * Validates environment variables on application startup
 * Throws an error if validation fails
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
      `Please check your .env file or environment variables.\n` +
      `For production deployment, see: PRODUCTION.md\n`
    );
  }

  return value;
}
