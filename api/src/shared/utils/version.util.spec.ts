describe('getVersion', () => {
  it('should return a version string', () => {
    const { getVersion } = require('./version.util');
    const version = getVersion();
    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
    expect(version).not.toBe('');
  });

  it('should match semver format', () => {
    const { getVersion } = require('./version.util');
    const version = getVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should cache the version', () => {
    const { getVersion } = require('./version.util');
    const v1 = getVersion();
    const v2 = getVersion();
    expect(v1).toBe(v2);
  });
});
