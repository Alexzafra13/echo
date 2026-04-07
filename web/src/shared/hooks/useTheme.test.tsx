import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { ThemeContext } from '@shared/contexts';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  it('should return theme context values', () => {
    const mockContext = {
      theme: 'dark' as const,
      themePreference: 'dark' as const,
      toggleTheme: () => {},
      setThemePreference: () => {},
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeContext.Provider value={mockContext}>{children}</ThemeContext.Provider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dark');
    expect(typeof result.current.toggleTheme).toBe('function');
  });

  it('should throw if used outside ThemeProvider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    spy.mockRestore();
  });
});
