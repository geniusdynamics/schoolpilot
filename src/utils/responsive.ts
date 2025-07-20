// ABOUTME: Responsive design utilities for the SchoolPilot3 design system
// ABOUTME: Breakpoint management, media queries, and responsive helpers

export interface Breakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export const breakpoints: Breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export type BreakpointKey = keyof Breakpoints;

// Media query helpers
export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs}px)`,
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  
  // Max width queries
  'max-xs': `(max-width: ${breakpoints.xs - 1}px)`,
  'max-sm': `(max-width: ${breakpoints.sm - 1}px)`,
  'max-md': `(max-width: ${breakpoints.md - 1}px)`,
  'max-lg': `(max-width: ${breakpoints.lg - 1}px)`,
  'max-xl': `(max-width: ${breakpoints.xl - 1}px)`,
  'max-2xl': `(max-width: ${breakpoints['2xl'] - 1}px)`,
  
  // Range queries
  'sm-to-md': `(min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`,
  'md-to-lg': `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  'lg-to-xl': `(min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`,
  
  // Device-specific queries
  mobile: `(max-width: ${breakpoints.md - 1}px)`,
  tablet: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `(min-width: ${breakpoints.lg}px)`,
  
  // Orientation queries
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  
  // High DPI queries
  retina: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
};

// Hook for responsive breakpoint detection
export const useBreakpoint = (): {
  current: BreakpointKey | null;
  isAbove: (breakpoint: BreakpointKey) => boolean;
  isBelow: (breakpoint: BreakpointKey) => boolean;
  isBetween: (min: BreakpointKey, max: BreakpointKey) => boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
} => {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCurrentBreakpoint = (): BreakpointKey | null => {
    const sortedBreakpoints = Object.entries(breakpoints)
      .sort(([, a], [, b]) => b - a);
    
    for (const [key, value] of sortedBreakpoints) {
      if (windowWidth >= value) {
        return key as BreakpointKey;
      }
    }
    return null;
  };

  const isAbove = (breakpoint: BreakpointKey): boolean => {
    return windowWidth >= breakpoints[breakpoint];
  };

  const isBelow = (breakpoint: BreakpointKey): boolean => {
    return windowWidth < breakpoints[breakpoint];
  };

  const isBetween = (min: BreakpointKey, max: BreakpointKey): boolean => {
    return windowWidth >= breakpoints[min] && windowWidth < breakpoints[max];
  };

  return {
    current: getCurrentBreakpoint(),
    isAbove,
    isBelow,
    isBetween,
    isMobile: windowWidth < breakpoints.md,
    isTablet: windowWidth >= breakpoints.md && windowWidth < breakpoints.lg,
    isDesktop: windowWidth >= breakpoints.lg,
  };
};

// Responsive value helper
export const getResponsiveValue = <T>(
  values: Partial<Record<BreakpointKey | 'base', T>>,
  currentBreakpoint: BreakpointKey | null
): T | undefined => {
  if (!currentBreakpoint && values.base) {
    return values.base;
  }
  
  if (currentBreakpoint && values[currentBreakpoint]) {
    return values[currentBreakpoint];
  }
  
  // Fallback to largest available breakpoint
  const sortedBreakpoints: BreakpointKey[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  
  for (const bp of sortedBreakpoints) {
    if (values[bp] && (!currentBreakpoint || breakpoints[bp] <= breakpoints[currentBreakpoint])) {
      return values[bp];
    }
  }
  
  return values.base;
};

// Container width utilities
export const containerSizes = {
  xs: '100%',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Grid system utilities
export const gridCols = {
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: '11',
  12: '12',
};

// Responsive spacing utilities
export const getResponsiveSpacing = (
  spacing: Partial<Record<BreakpointKey | 'base', string>>,
  currentBreakpoint: BreakpointKey | null
): string => {
  return getResponsiveValue(spacing, currentBreakpoint) || '0';
};

// CSS-in-JS media query helper
export const mq = (breakpoint: keyof typeof mediaQueries) => {
  return `@media ${mediaQueries[breakpoint]}`;
};

// Utility for creating responsive CSS classes
export const createResponsiveClasses = (
  baseClass: string,
  values: Partial<Record<BreakpointKey, string>>
): string => {
  const classes = [baseClass];
  
  Object.entries(values).forEach(([breakpoint, value]) => {
    if (breakpoint === 'xs') {
      classes.push(`xs:${value}`);
    } else {
      classes.push(`${breakpoint}:${value}`);
    }
  });
  
  return classes.join(' ');
};

// React imports for the hook
import { useState, useEffect } from 'react';