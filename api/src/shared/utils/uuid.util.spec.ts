import { generateUuid } from './uuid.util';

describe('UUID Util', () => {
  it('should generate a valid UUID v4 format', () => {
    const uuid = generateUuid();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateUuid()));
    expect(ids.size).toBe(100);
  });

  it('should return a string', () => {
    expect(typeof generateUuid()).toBe('string');
  });
});
