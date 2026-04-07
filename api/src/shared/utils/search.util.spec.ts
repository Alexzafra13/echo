import { escapeLikeWildcards, createSearchPattern } from './search.util';

describe('Search Utils', () => {
  describe('escapeLikeWildcards', () => {
    it('should escape % character', () => {
      expect(escapeLikeWildcards('50%')).toBe('50\\%');
    });

    it('should escape _ character', () => {
      expect(escapeLikeWildcards('_test')).toBe('\\_test');
    });

    it('should escape backslash', () => {
      expect(escapeLikeWildcards('path\\file')).toBe('path\\\\file');
    });

    it('should not modify normal strings', () => {
      expect(escapeLikeWildcards('normal')).toBe('normal');
    });

    it('should handle multiple special chars', () => {
      expect(escapeLikeWildcards('50%_test')).toBe('50\\%\\_test');
    });

    it('should handle empty string', () => {
      expect(escapeLikeWildcards('')).toBe('');
    });
  });

  describe('createSearchPattern', () => {
    it('should wrap with % wildcards', () => {
      expect(createSearchPattern('rock')).toBe('%rock%');
    });

    it('should escape special chars inside pattern', () => {
      expect(createSearchPattern('50%')).toBe('%50\\%%');
    });

    it('should escape _ inside pattern', () => {
      expect(createSearchPattern('_test')).toBe('%\\_test%');
    });

    it('should handle empty string', () => {
      expect(createSearchPattern('')).toBe('%%');
    });
  });
});
