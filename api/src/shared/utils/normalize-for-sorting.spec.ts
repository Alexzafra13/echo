import {
  normalizeUnicodePunctuation,
  removeAccents,
  removeLeadingArticles,
  normalizeForSorting,
} from './normalize-for-sorting';

describe('Normalize for Sorting', () => {
  describe('normalizeUnicodePunctuation', () => {
    it('should normalize Unicode hyphens to ASCII', () => {
      expect(normalizeUnicodePunctuation('blink\u2010182')).toBe('blink-182');
      expect(normalizeUnicodePunctuation('blink\u2013182')).toBe('blink-182');
    });

    it('should normalize Unicode spaces', () => {
      expect(normalizeUnicodePunctuation('hello\u00A0world')).toBe('hello world');
    });

    it('should normalize Unicode quotes', () => {
      expect(normalizeUnicodePunctuation('\u201CHello\u201D')).toBe('"Hello"');
      expect(normalizeUnicodePunctuation('\u2018Hello\u2019')).toBe("'Hello'");
    });

    it('should normalize ellipsis', () => {
      expect(normalizeUnicodePunctuation('Wait\u2026')).toBe('Wait...');
    });

    it('should remove zero-width characters', () => {
      expect(normalizeUnicodePunctuation('test\u200Bword')).toBe('testword');
      expect(normalizeUnicodePunctuation('test\uFEFFword')).toBe('testword');
    });

    it('should leave normal text unchanged', () => {
      expect(normalizeUnicodePunctuation('normal text')).toBe('normal text');
    });
  });

  describe('removeAccents', () => {
    it('should remove common accents', () => {
      expect(removeAccents('Café')).toBe('Cafe');
      expect(removeAccents('Ñoño')).toBe('Nono');
      expect(removeAccents('résumé')).toBe('resume');
    });

    it('should handle multiple accented characters', () => {
      expect(removeAccents('àáâãäå')).toBe('aaaaaa');
    });

    it('should leave non-accented text unchanged', () => {
      expect(removeAccents('Hello World')).toBe('Hello World');
    });
  });

  describe('removeLeadingArticles', () => {
    it('should remove English articles', () => {
      expect(removeLeadingArticles('The Beatles')).toBe('Beatles');
      expect(removeLeadingArticles('A Perfect Circle')).toBe('Perfect Circle');
      expect(removeLeadingArticles('An Album')).toBe('Album');
    });

    it('should remove Spanish articles', () => {
      expect(removeLeadingArticles('El Canto del Loco')).toBe('Canto del Loco');
      expect(removeLeadingArticles('La Oreja de Van Gogh')).toBe('Oreja de Van Gogh');
      expect(removeLeadingArticles('Los Bunkers')).toBe('Bunkers');
      expect(removeLeadingArticles('Las Ketchup')).toBe('Ketchup');
    });

    it('should be case insensitive', () => {
      expect(removeLeadingArticles('the beatles')).toBe('beatles');
      expect(removeLeadingArticles('THE BEATLES')).toBe('BEATLES');
    });

    it('should not remove articles in the middle', () => {
      expect(removeLeadingArticles('Beyond The Horizon')).toBe('Beyond The Horizon');
    });

    it('should not remove if no space after article', () => {
      expect(removeLeadingArticles('Therapy')).toBe('Therapy');
      expect(removeLeadingArticles('Elbow')).toBe('Elbow');
    });

    it('should trim whitespace', () => {
      expect(removeLeadingArticles('  The Beatles  ')).toBe('Beatles');
    });
  });

  describe('normalizeForSorting', () => {
    it('should handle full normalization pipeline', () => {
      expect(normalizeForSorting('The Beatles')).toBe('beatles');
      expect(normalizeForSorting('Café Tacvba')).toBe('cafe tacvba');
      expect(normalizeForSorting('Los Bunkers')).toBe('bunkers');
    });

    it('should handle Unicode and accents together', () => {
      expect(normalizeForSorting('blink\u2010182')).toBe('blink-182');
    });

    it('should return empty string for null/undefined', () => {
      expect(normalizeForSorting(null)).toBe('');
      expect(normalizeForSorting(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(normalizeForSorting('')).toBe('');
    });

    it('should lowercase everything', () => {
      expect(normalizeForSorting('RADIOHEAD')).toBe('radiohead');
    });
  });
});
