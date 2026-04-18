import { slugify } from './slugify.util';

describe('slugify', () => {
  it('returns empty string for falsy input', () => {
    expect(slugify('')).toBe('');
  });

  it('lowercases', () => {
    expect(slugify('Rock')).toBe('rock');
  });

  it('preserves simple hyphens', () => {
    expect(slugify('Hip-Hop')).toBe('hip-hop');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('Rock Alternativo')).toBe('rock-alternativo');
  });

  it('strips accents', () => {
    expect(slugify('Café')).toBe('cafe');
  });

  it('expands ampersand to " and "', () => {
    expect(slugify('R&B')).toBe('r-and-b');
  });

  it('collapses multiple separators to single hyphen', () => {
    expect(slugify('R&B / Soul')).toBe('r-and-b-soul');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('---Rock---')).toBe('rock');
  });

  it('handles punctuation', () => {
    expect(slugify("Rock 'n' Roll")).toBe('rock-n-roll');
  });

  it('preserves digits', () => {
    expect(slugify('Hip-Hop 90s')).toBe('hip-hop-90s');
  });
});
