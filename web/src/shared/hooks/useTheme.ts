import { useContext } from 'react';
import { ThemeContext } from '@shared/contexts';

/**
 * useTheme Hook
 *
 * Custom hook to access the theme context.
 * Must be used within a ThemeProvider.
 *
 * @returns Theme context with current theme and toggle function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, toggleTheme } = useTheme();
 *
 *   return (
 *     <button onClick={toggleTheme}>
 *       Current theme: {theme}
 *     </button>
 *   );
 * }
 * ```
 *
 * @throws Error if used outside of ThemeProvider
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
