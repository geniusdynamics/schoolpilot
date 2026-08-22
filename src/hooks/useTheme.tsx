import { logger } from '@/utils/logging';

// ABOUTME: Theme management hook for the SchoolPilot3 design system
// ABOUTME: Handles light/dark theme switching and CSS custom property application

import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { applyCSSCustomProperties } from '@/utils/designTokens';

export type Theme = 'light' | 'dark' | 'system';

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

  // Set theme and persist to storage
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    storeTheme(newTheme);
  }, []);

  // Toggle between light and dark (ignoring system)
  const toggleTheme = useCallback(() => {
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
  const theme = getStoredTheme();
  const resolved = resolveTheme(theme);
  applyCSSCustomProperties(resolved);
};