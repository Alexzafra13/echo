import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  const validConfig = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  };

  it('should return validated config for valid input', () => {
    const result = validateEnvironment(validConfig);
    expect(result.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
    expect(result.NODE_ENV).toBe('development');
  });

  it('should default NODE_ENV to development', () => {
    const result = validateEnvironment({ DATABASE_URL: 'postgresql://localhost/db' });
    expect(result.NODE_ENV).toBe('development');
  });

  it('should default PORT to 4567', () => {
    const result = validateEnvironment(validConfig);
    expect(result.PORT).toBe(4567);
  });

  it('should default REDIS_HOST to localhost', () => {
    const result = validateEnvironment(validConfig);
    expect(result.REDIS_HOST).toBe('localhost');
  });

  it('should default REDIS_PORT to 6379', () => {
    const result = validateEnvironment(validConfig);
    expect(result.REDIS_PORT).toBe(6379);
  });

  it('should default VERSION to 1.0.0', () => {
    const result = validateEnvironment(validConfig);
    expect(result.VERSION).toBe('1.0.2');
  });

  it('should reject invalid NODE_ENV', () => {
    expect(() => validateEnvironment({ ...validConfig, NODE_ENV: 'staging' })).toThrow('NODE_ENV');
  });

  it('should require DATABASE_URL', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'development' })).toThrow('DATABASE_URL');
  });

  it('should accept valid LOG_LEVEL values', () => {
    for (const level of ['fatal', 'error', 'warn', 'info', 'debug', 'trace']) {
      expect(() => validateEnvironment({ ...validConfig, LOG_LEVEL: level })).not.toThrow();
    }
  });

  it('should reject invalid LOG_LEVEL', () => {
    expect(() => validateEnvironment({ ...validConfig, LOG_LEVEL: 'verbose' })).toThrow(
      'LOG_LEVEL'
    );
  });

  it('should throw on missing required fields', () => {
    expect(() => validateEnvironment({})).toThrow('Environment validation failed');
  });

  it('should include error details in thrown message', () => {
    expect(() => validateEnvironment({})).toThrow('DATABASE_URL');
  });

  it('should allow unknown variables', () => {
    const result = validateEnvironment({
      DATABASE_URL: 'postgresql://localhost/db',
      CUSTOM_VAR: 'anything',
    });
    expect(result.CUSTOM_VAR).toBe('anything');
  });

  it('should require JWT secrets in production', () => {
    expect(() => validateEnvironment({ ...validConfig, NODE_ENV: 'production' })).toThrow(
      'JWT_SECRET'
    );
  });

  it('should accept valid JWT secrets in production', () => {
    expect(() =>
      validateEnvironment({
        ...validConfig,
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
      })
    ).not.toThrow();
  });
});
