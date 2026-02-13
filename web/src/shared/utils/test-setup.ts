import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock global de useDominantColor
vi.mock('@shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/hooks')>();
  return {
    ...actual,
    useDominantColor: vi.fn(() => '10, 14, 39'),
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Extend Vitest matchers
expect.extend({});