/**
 * FullWidthContext - Manages the full-width/focus mode state
 * 
 * When enabled:
 * - Primary sidebar slides out to the left and disappears
 * - Secondary sidebar becomes the main sidebar at the far left
 * - Creates an app-focused experience where the current module's menu is primary
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

interface FullWidthContextType {
  /** Whether full-width mode is active (primary sidebar hidden) */
  isFullWidth: boolean;
  /** Derived content width mode: 'full' when isFullWidth is true, 'constrained' when false */
  contentWidth: 'full' | 'constrained';
  /** Toggle full-width mode */
  toggleFullWidth: () => void;
  /** Enable full-width mode */
  enableFullWidth: () => void;
  /** Disable full-width mode */
  disableFullWidth: () => void;
  /** Whether the secondary sidebar should be shown as primary (at far left) */
  isSecondaryAsPrimary: boolean;
  /** Set whether secondary sidebar should act as primary */
  setSecondaryAsPrimary: (value: boolean) => void;
}

const FullWidthContext = createContext<FullWidthContextType | undefined>(undefined);

const STORAGE_KEY = 'schoolpilot-fullwidth-mode';

export const FullWidthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFullWidth, setIsFullWidth] = useState(() => {
    // Initialize from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    }
    return false;
  });

  // isSecondaryAsPrimary is derived from isFullWidth to avoid dual-state drift.
  // Keeping separate state previously allowed them to diverge (e.g. primary hidden
  // but secondary not aligned). Now it is always in sync.
  const isSecondaryAsPrimary = isFullWidth;

  // Back-compat setter — toggles fullwidth so secondary-as-primary stays derived
  const setSecondaryAsPrimary = useCallback((value: boolean) => {
    if (value !== isFullWidth) {
      setIsFullWidth(value);
    }
  }, [isFullWidth]);

  // Persist to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(isFullWidth));
    }
  }, [isFullWidth]);

  const toggleFullWidth = useCallback(() => {
    setIsFullWidth(prev => !prev);
  }, []);

  const enableFullWidth = useCallback(() => {
    setIsFullWidth(true);
  }, []);

  const disableFullWidth = useCallback(() => {
    setIsFullWidth(false);
  }, []);

  // Derive contentWidth from isFullWidth
  const contentWidth = useMemo<'full' | 'constrained'>(() => isFullWidth ? 'full' : 'constrained', [isFullWidth]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    isFullWidth,
    contentWidth,
    toggleFullWidth,
    enableFullWidth,
    disableFullWidth,
    isSecondaryAsPrimary,
    setSecondaryAsPrimary,
  }), [isFullWidth, contentWidth, toggleFullWidth, enableFullWidth, disableFullWidth, isSecondaryAsPrimary]);

  return (
    <FullWidthContext.Provider value={value}>
      {children}
    </FullWidthContext.Provider>
  );
};

export const useFullWidth = (): FullWidthContextType => {
  const context = useContext(FullWidthContext);
  if (context === undefined) {
    throw new Error('useFullWidth must be used within a FullWidthProvider');
  }
  return context;
};

export default FullWidthContext;
