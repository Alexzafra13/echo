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
    const { securityConfig } = require('./security.config');
    expect(securityConfig.jwt_expiration).toBe('24h');
  });

  it('should have correct jwt_refresh_expiration', () => {
    const { securityConfig } = require('./security.config');
    expect(securityConfig.jwt_refresh_expiration).toBe('7d');
  });

  it('should have correct bcrypt_rounds', () => {
    const { securityConfig } = require('./security.config');
    expect(securityConfig.bcrypt_rounds).toBe(12);
  });

  it('should read jwt_secret from process.env.JWT_SECRET', () => {
    process.env.JWT_SECRET = 'test-secret';
    jest.resetModules();
    const { securityConfig } = require('./security.config');
    expect(securityConfig.jwt_secret).toBe('test-secret');
  });

  it('should read jwt_refresh_secret from process.env.JWT_REFRESH_SECRET', () => {
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    jest.resetModules();
    const { securityConfig } = require('./security.config');
    expect(securityConfig.jwt_refresh_secret).toBe('test-refresh-secret');
  });
});
