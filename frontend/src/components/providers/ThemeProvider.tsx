import { ReactNode, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider initializes the theme system on app mount
 * Handles system preference detection and localStorage persistence
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useTheme();

  // Apply theme class to root element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return <>{children}</>;
}
