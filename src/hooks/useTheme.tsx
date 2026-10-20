import { logger } from '@/utils/logging';

// ABOUTME: Theme management hook for the SchoolPilot3 design system
// ABOUTME: Handles light/dark theme switching and CSS custom property application

import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { applyCSSCustomProperties } from '@/utils/designTokens';

export type Theme = 'light' | 'dark' | 'system';

/**
 * Dark mode is temporarily DISABLED system-wide until it is properly implemented.
 * With this flag false:
 *  - the app always resolves to the light theme (OS `prefers-color-scheme` is ignored),
 *  - a previously stored 'dark'/'system' preference is overwritten on boot,
 *  - setTheme/toggleTheme are no-ops and the theme toggle UI is hidden.
 * Flip to true to re-enable the light/dark/system switcher.
 */
export const DARK_MODE_ENABLED = false;

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Local storage key for theme preference
const THEME_STORAGE_KEY = 'schoolpilot-theme';

// Get system theme preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  
  // Handle test environment where matchMedia might not exist or be mocked
  try {
    if (!window.matchMedia) return 'light';
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    return mediaQuery.matches ? 'dark' : 'light';
  } catch (error) {
    // Fallback for test environments or unsupported browsers
    return 'light';
  }
};

// Get stored theme preference
const getStoredTheme = (): Theme => {
  if (!DARK_MODE_ENABLED) return 'light';
  if (typeof window === 'undefined') return 'system';

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as Theme;
    }
  } catch (error) {
    logger.warn('Failed to read theme from localStorage:', error);
  }

  return 'system';
};

// Store theme preference
const storeTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    logger.warn('Failed to store theme in localStorage:', error);
  }
};

// Resolve theme to actual light/dark value
const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (!DARK_MODE_ENABLED) return 'light';
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

export const useTheme = (): ThemeContextValue => {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => 
    resolveTheme(getStoredTheme())
  );

  // Update resolved theme when theme changes or system preference changes
  useEffect(() => {
    const updateResolvedTheme = () => {
      const resolved = resolveTheme(theme);
      setResolvedTheme(resolved);
      applyCSSCustomProperties(resolved);
    };

    updateResolvedTheme();

    // Listen for system theme changes if using system theme
    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateResolvedTheme();
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Set theme and persist to storage (no-op while dark mode is disabled)
  const setTheme = useCallback((newTheme: Theme) => {
    if (!DARK_MODE_ENABLED) {
      setThemeState('light');
      storeTheme('light');
      return;
    }
    setThemeState(newTheme);
    storeTheme(newTheme);
  }, []);

  // Toggle between light and dark (ignoring system)
  const toggleTheme = useCallback(() => {
    if (!DARK_MODE_ENABLED) return;
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };
};

// Theme provider context
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const themeValue = useTheme();
  
  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

// Initialize theme on app startup
export const initializeTheme = (): void => {
  if (!DARK_MODE_ENABLED) {
    // Force light: clear any previously stored dark/system preference so state
    // is consistent, drop a stray 'dark' class, and apply light tokens.
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch (error) {
      logger.warn('Failed to clear theme preference:', error);
    }
    applyCSSCustomProperties('light');
    return;
  }
  const theme = getStoredTheme();
  const resolved = resolveTheme(theme);
  applyCSSCustomProperties(resolved);
};