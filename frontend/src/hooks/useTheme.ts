import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setTheme as setThemeAction } from '@/features/themeSlice';

type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'app-theme';

/**
 * Custom hook for managing theme with system preference detection and localStorage persistence
 */
export function useTheme() {
  const theme = useAppSelector(state => state.theme.theme);
  const dispatch = useAppDispatch();

  // Get system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  };

  // Initialize theme on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;

    let effectiveTheme: 'light' | 'dark';

    if (storedTheme === 'system' || !storedTheme) {
      // Use system preference
      effectiveTheme = getSystemTheme();
    } else {
      // Use stored theme
      effectiveTheme = storedTheme as 'light' | 'dark';
    }

    // Apply theme to Redux and DOM
    dispatch(setThemeAction(effectiveTheme));
    applyTheme(effectiveTheme);
  }, [dispatch]);

  // Listen for system theme changes when using system preference
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;

    if (storedTheme === 'system' || !storedTheme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        dispatch(setThemeAction(newTheme));
        applyTheme(newTheme);
      };

      // Modern browsers
      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [dispatch]);

  // Apply theme to DOM
  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
  };

  // Set theme (can be 'light', 'dark', or 'system')
  const setTheme = (newTheme: Theme) => {
    let effectiveTheme: 'light' | 'dark';

    if (newTheme === 'system') {
      effectiveTheme = getSystemTheme();
      localStorage.setItem(THEME_STORAGE_KEY, 'system');
    } else {
      effectiveTheme = newTheme;
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }

    dispatch(setThemeAction(effectiveTheme));
    applyTheme(effectiveTheme);
  };

  // Toggle between light and dark (skips system)
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  // Get the stored preference (light, dark, or system)
  const getStoredThemePreference = (): Theme => {
    return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || 'system';
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    systemTheme: getSystemTheme(),
    storedPreference: getStoredThemePreference(),
  };
}
