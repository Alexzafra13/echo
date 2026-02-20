import { envValidationSchema, validateEnvironment } from './env.validation';

describe('envValidationSchema', () => {
  const validConfig = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  };

  it('should validate a minimal valid config', () => {
    const { error } = envValidationSchema.validate(validConfig, { allowUnknown: true });
    expect(error).toBeUndefined();
  });

  it('should default NODE_ENV to development', () => {
    const { value } = envValidationSchema.validate(
      { DATABASE_URL: 'postgresql://localhost/db' },
      { allowUnknown: true },
    );
    expect(value.NODE_ENV).toBe('development');
  });

  it('should default PORT to 4567', () => {
    const { value } = envValidationSchema.validate(validConfig, { allowUnknown: true });
    expect(value.PORT).toBe(4567);
  });

  it('should default REDIS_HOST to localhost', () => {
    const { value } = envValidationSchema.validate(validConfig, { allowUnknown: true });
    expect(value.REDIS_HOST).toBe('localhost');
  });

  it('should default REDIS_PORT to 6379', () => {
    const { value } = envValidationSchema.validate(validConfig, { allowUnknown: true });
    expect(value.REDIS_PORT).toBe(6379);
  });

  it('should default VERSION to 1.0.0', () => {
    const { value } = envValidationSchema.validate(validConfig, { allowUnknown: true });
    expect(value.VERSION).toBe('1.0.0');
  });

  it('should reject invalid NODE_ENV', () => {
    const { error } = envValidationSchema.validate(
      { ...validConfig, NODE_ENV: 'staging' },
      { allowUnknown: true },
    );
    expect(error).toBeDefined();
  });

  it('should require DATABASE_URL', () => {
    const { error } = envValidationSchema.validate(
      { NODE_ENV: 'development' },
      { allowUnknown: true, abortEarly: false },
    );
    expect(error).toBeDefined();
    expect(error!.details.some((d) => d.message.includes('DATABASE_URL'))).toBe(true);
  });

  it('should accept valid LOG_LEVEL values', () => {
    for (const level of ['fatal', 'error', 'warn', 'info', 'debug', 'trace']) {
      const { error } = envValidationSchema.validate(
        { ...validConfig, LOG_LEVEL: level },
        { allowUnknown: true },
      );
      expect(error).toBeUndefined();
    }
  });

  it('should reject invalid LOG_LEVEL', () => {
    const { error } = envValidationSchema.validate(
      { ...validConfig, LOG_LEVEL: 'verbose' },
      { allowUnknown: true },
    );
    expect(error).toBeDefined();
  });
});

describe('validateEnvironment', () => {
  it('should return validated config for valid input', () => {
    const result = validateEnvironment({
      DATABASE_URL: 'postgresql://localhost/db',
      NODE_ENV: 'test',
    });
    expect(result.DATABASE_URL).toBe('postgresql://localhost/db');
    expect(result.NODE_ENV).toBe('test');
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
});
