import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProxiedStreamUrl } from './streamProxy';

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
  },
}));

describe('getProxiedStreamUrl', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Reset location
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation },
      writable: true,
    });
  });

  it('should proxy HTTP stream when page is HTTPS', () => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:' },
      writable: true,
    });

    const result = getProxiedStreamUrl('http://radio.example.com/stream');

    expect(result).toBe('/api/radio/stream/proxy?url=http%3A%2F%2Fradio.example.com%2Fstream');
  });

  it('should not proxy HTTPS stream when page is HTTPS', () => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:' },
      writable: true,
    });

    const result = getProxiedStreamUrl('https://radio.example.com/stream');

    expect(result).toBe('https://radio.example.com/stream');
  });

  it('should not proxy HTTP stream when page is HTTP', () => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:' },
      writable: true,
    });

    const result = getProxiedStreamUrl('http://radio.example.com/stream');

    expect(result).toBe('http://radio.example.com/stream');
  });

  it('should encode special characters in the proxied URL', () => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:' },
      writable: true,
    });

    const result = getProxiedStreamUrl('http://radio.example.com/stream?format=mp3&quality=high');

    expect(result).toContain(
      encodeURIComponent('http://radio.example.com/stream?format=mp3&quality=high')
    );
  });
});
