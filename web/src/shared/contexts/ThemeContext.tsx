import { createContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { safeLocalStorage } from '@shared/utils/safeLocalStorage';

/**
 * Theme type - the actual applied theme
 */
export type Theme = 'light' | 'dark';

/**
 * Theme preference - what the user chooses
 * 'auto' follows system preference
 */
export type ThemePreference = 'auto' | 'light' | 'dark';

/**
 * ThemeContext interface
 */
interface ThemeContextType {
  theme: Theme; // The actual applied theme
  themePreference: ThemePreference; // User's preference (auto/light/dark)
  toggleTheme: () => void;
  setThemePreference: (preference: ThemePreference) => void;
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
 * Get system theme preference
 */
function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * ThemeProvider Component
 *
 * Manages the app-wide theme state and persists it to localStorage.
 * Automatically applies the theme to the document root element.
 * Supports 'auto' mode that follows system preference.
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="dark">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  // User's preference: 'auto', 'light', or 'dark'
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    const saved = safeLocalStorage.getItem('theme-preference') as ThemePreference | null;
    // Migration: if old 'theme' key exists but no 'theme-preference', migrate it
    if (!saved) {
      const oldTheme = safeLocalStorage.getItem('theme') as Theme | null;
      if (oldTheme) {
        return oldTheme; // Use the old explicit theme choice
      }
      return 'auto'; // Default to auto for new users
    }
    return saved;
  });

  // The actual applied theme
  const [theme, setTheme] = useState<Theme>(() => {
    if (themePreference === 'auto') {
      return getSystemTheme();
    }
    return themePreference;
  });

  /**
   * Listen for system theme changes when in 'auto' mode
   */
  useEffect(() => {
    if (themePreference !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    // Set initial value
    setTheme(mediaQuery.matches ? 'dark' : 'light');

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

  /**
   * Update theme when preference changes (for non-auto modes)
   */
  useEffect(() => {
    if (themePreference !== 'auto') {
      setTheme(themePreference);
    }
  }, [themePreference]);

  /**
   * Apply theme to document root and save preference to localStorage
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
  }, [theme]);

  /**
   * Save preference to localStorage
   */
  useEffect(() => {
    safeLocalStorage.setItem('theme-preference', themePreference);
    // Also save to old key for compatibility
    safeLocalStorage.setItem('theme', theme);
  }, [themePreference, theme]);

  /**
   * Toggle between light and dark theme (sets explicit preference)
   */
  const toggleTheme = useCallback(() => {
    setThemePreferenceState((prev) => {
      // If auto, switch to opposite of current system theme
      if (prev === 'auto') {
        return theme === 'dark' ? 'light' : 'dark';
      }
      return prev === 'dark' ? 'light' : 'dark';
    });
  }, [theme]);

  /**
   * Set theme preference explicitly
   */
  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({ theme, themePreference, toggleTheme, setThemePreference }),
    [theme, themePreference, toggleTheme, setThemePreference]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
