import { createContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { safeLocalStorage } from '@shared/utils/safeLocalStorage';

/**
 * Theme type - 'light' or 'dark'
 */
export type Theme = 'light' | 'dark';

/**
 * ThemeContext interface
 */
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

/**
 * ThemeContext - Context for managing app-wide theme
 */
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider Props
 */
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

/**
 * ThemeProvider Component
 *
 * Manages the app-wide theme state and persists it to localStorage.
 * Automatically applies the theme to the document root element.
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="dark">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Try to get theme from localStorage on initial load
    const savedTheme = safeLocalStorage.getItem('theme') as Theme | null;

    // If no saved theme, check system preference
    if (!savedTheme) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : defaultTheme;
    }

    return savedTheme;
  });

  /**
   * Apply theme to document root and save to localStorage
   */
  useEffect(() => {
    const root = document.documentElement;

    // Remove old theme attribute
    root.removeAttribute('data-theme');

    // Apply new theme
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    }
    // For dark theme, we don't set attribute (default CSS)

    // Save to localStorage
    safeLocalStorage.setItem('theme', theme);
  }, [theme]);

  /**
   * Toggle between light and dark theme
   */
  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  /**
   * Set theme explicitly
   */
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
