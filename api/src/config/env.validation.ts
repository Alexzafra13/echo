import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number()
    .port()
    .default(4567),

  DATABASE_URL: Joi.string()
    .required()
    .messages({
      'any.required': 'DATABASE_URL is required (e.g., postgresql://user:password@localhost:5432/dbname)',
    }),

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

  REDIS_HOST: Joi.string()
    .default('localhost'),

  REDIS_PORT: Joi.number()
    .port()
    .default(6379),

  REDIS_PASSWORD: Joi.string()
    .optional()
    .allow(''),

  DATA_PATH: Joi.string()
    .optional(),

  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .optional(),

  VERSION: Joi.string()
    .optional()
    .default('1.0.0'),
});

// Valida variables de entorno al iniciar la aplicación
export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const { error, value } = envValidationSchema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
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
