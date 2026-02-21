import { sanitizeForLog, sanitizeQueryParams, sanitizeParams } from './log-sanitizer.util';

describe('Log Sanitizer', () => {
  describe('sanitizeForLog', () => {
    it('should redact password fields', () => {
      const obj = { username: 'john', password: 'secret123' };
      const result = sanitizeForLog(obj);
      expect(result.password).toBe('[REDACTED]');
    });

    it('should redact token fields', () => {
      const obj = { token: 'jwt-token-value', accessToken: 'abc', refreshToken: 'xyz' };
      const result = sanitizeForLog(obj);
      expect(result.token).toBe('[REDACTED]');
      expect(result.accessToken).toBe('[REDACTED]');
      expect(result.refreshToken).toBe('[REDACTED]');
    });

    it('should redact authorization header', () => {
      const obj = { authorization: 'Bearer abc123' };
      const result = sanitizeForLog(obj);
      expect(result.authorization).toBe('[REDACTED]');
    });

    it('should redact secret/key fields', () => {
      const obj = { jwtSecret: 'supersecret', apiKey: 'key-123', privateKey: 'pk' };
      const result = sanitizeForLog(obj);
      expect(result.jwtSecret).toBe('[REDACTED]');
      expect(result.apiKey).toBe('[REDACTED]');
      expect(result.privateKey).toBe('[REDACTED]');
    });

    it('should partial redact username (show first/last 2 chars)', () => {
      const obj = { username: 'johndoe123' };
      const result = sanitizeForLog(obj);
      expect(result.username).toBe('jo***23');
    });

    it('should fully redact short usernames (<=6 chars)', () => {
      const obj = { username: 'john' };
      const result = sanitizeForLog(obj);
      expect(result.username).toBe('[REDACTED]');
    });

    it('should partial redact email', () => {
      const obj = { email: 'johndoe@example.com' };
      const result = sanitizeForLog(obj);
      expect(result.email).toBe('jo***om');
    });

    it('should truncate long strings (>200 chars)', () => {
      const longStr = 'x'.repeat(300);
      const obj = { data: longStr };
      const result = sanitizeForLog(obj);
      expect((result.data as string).length).toBeLessThan(300);
      expect(result.data as string).toContain('...[truncated]');
    });

    it('should leave normal fields unchanged', () => {
      const obj = { name: 'John', age: 30, active: true };
      const result = sanitizeForLog(obj);
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
    });

    it('should handle nested objects', () => {
      const obj = { user: { password: 'secret', name: 'John' } };
      const result = sanitizeForLog(obj);
      expect((result.user as Record<string, unknown>).password).toBe('[REDACTED]');
      expect((result.user as Record<string, unknown>).name).toBe('John');
    });

    it('should handle arrays', () => {
      const obj = { tokens: [{ token: 'abc' }, { token: 'xyz' }] };
      const result = sanitizeForLog(obj);
      expect((result.tokens as Record<string, unknown>[])[0].token).toBe('[REDACTED]');
      expect((result.tokens as Record<string, unknown>[])[1].token).toBe('[REDACTED]');
    });

    it('should handle null/undefined values', () => {
      const obj = { password: null, token: undefined };
      const result = sanitizeForLog(obj);
      expect(result.password).toBeNull();
      expect(result.token).toBeUndefined();
    });

    it('should handle non-object input', () => {
      expect(sanitizeForLog(null as unknown as Record<string, unknown>)).toBeNull();
      expect(sanitizeForLog(undefined as unknown as Record<string, unknown>)).toBeUndefined();
    });

    it('should be case insensitive for field names', () => {
      const obj = { PASSWORD: 'secret', PasswordHash: 'hash' };
      const result = sanitizeForLog(obj);
      expect(result.PASSWORD).toBe('[REDACTED]');
      expect(result.PasswordHash).toBe('[REDACTED]');
    });

    it('should ignore hyphens/underscores in field name matching', () => {
      const obj = { api_key: 'abc', 'stream-token': 'xyz' };
      const result = sanitizeForLog(obj);
      expect(result.api_key).toBe('[REDACTED]');
      expect(result['stream-token']).toBe('[REDACTED]');
    });
  });

  describe('sanitizeQueryParams', () => {
    it('should sanitize query params', () => {
      const query = { search: 'test', token: 'secret' };
      const result = sanitizeQueryParams(query);
      expect(result!.search).toBe('test');
      expect(result!.token).toBe('[REDACTED]');
    });

    it('should return undefined for undefined input', () => {
      expect(sanitizeQueryParams(undefined)).toBeUndefined();
    });
  });

  describe('sanitizeParams', () => {
    it('should sanitize params', () => {
      const params = { id: '123', password: 'secret' };
      const result = sanitizeParams(params);
      expect(result!.id).toBe('123');
      expect(result!.password).toBe('[REDACTED]');
    });

    it('should return undefined for undefined input', () => {
      expect(sanitizeParams(undefined)).toBeUndefined();
    });
  });
});
