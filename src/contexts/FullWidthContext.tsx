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

  // Sync isSecondaryAsPrimary with isFullWidth on mount
  const [isSecondaryAsPrimary, setSecondaryAsPrimary] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    }
    return false;
  });

  // Persist to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(isFullWidth));
    }
  }, [isFullWidth]);

  const toggleFullWidth = useCallback(() => {
    setIsFullWidth(prev => {
      const next = !prev;
      // When enabling full-width, also set secondary as primary if we have a module selected
      if (next) {
        setSecondaryAsPrimary(true);
      } else {
        setSecondaryAsPrimary(false);
      }
      return next;
    });
  }, []);

  const enableFullWidth = useCallback(() => {
    setIsFullWidth(true);
    setSecondaryAsPrimary(true);
  }, []);

  const disableFullWidth = useCallback(() => {
    setIsFullWidth(false);
    setSecondaryAsPrimary(false);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    isFullWidth,
    toggleFullWidth,
    enableFullWidth,
    disableFullWidth,
    isSecondaryAsPrimary,
    setSecondaryAsPrimary,
  }), [isFullWidth, toggleFullWidth, enableFullWidth, disableFullWidth, isSecondaryAsPrimary]);

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
