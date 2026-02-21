describe('securityConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should have correct jwt_expiration', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { securityConfig } = require('./security.config');
    expect(securityConfig.jwt_expiration).toBe('24h');
  });

  it('should have correct jwt_refresh_expiration', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { securityConfig } = require('./security.config');
    expect(securityConfig.jwt_refresh_expiration).toBe('7d');
  });

  it('should have correct bcrypt_rounds', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { securityConfig } = require('./security.config');
    expect(securityConfig.bcrypt_rounds).toBe(12);
  });

  it('should read jwt_secret from process.env.JWT_SECRET', () => {
    process.env.JWT_SECRET = 'test-secret';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { securityConfig } = require('./security.config');
    expect(securityConfig.jwt_secret).toBe('test-secret');
  });

  it('should read jwt_refresh_secret from process.env.JWT_REFRESH_SECRET', () => {
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { securityConfig } = require('./security.config');
    expect(securityConfig.jwt_refresh_secret).toBe('test-refresh-secret');
  });
});
