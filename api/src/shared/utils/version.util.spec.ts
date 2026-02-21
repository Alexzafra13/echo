describe('getVersion', () => {
  it('should return a version string', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getVersion } = require('./version.util');
    const version = getVersion();
    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
    expect(version).not.toBe('');
  });

  it('should match semver format', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getVersion } = require('./version.util');
    const version = getVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should cache the version', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getVersion } = require('./version.util');
    const v1 = getVersion();
    const v2 = getVersion();
    expect(v1).toBe(v2);
  });
});
