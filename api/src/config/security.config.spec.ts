describe('securityConfig', () => {
  beforeEach(() => {
    jest.resetModules();
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
});
