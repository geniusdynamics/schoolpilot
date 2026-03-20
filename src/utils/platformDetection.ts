/**
 * Platform Detection Utility for Adaptive Components
 * Detects the current platform (web, desktop, mobile) for adaptive UI rendering
 */

export type Platform = 'web' | 'desktop' | 'mobile';
export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export interface PlatformInfo {
  platform: Platform;
  screenSize: ScreenSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  hasHover: boolean;
}

/**
 * Detect the current platform based on environment and user agent
 */
export const detectPlatform = (): Platform => {
  // Check if running in Tauri (desktop)
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    return 'desktop';
  }
  
  // Check if running in Capacitor (mobile app)
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return 'mobile';
  }
  
  // Check user agent for mobile devices
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobilePatterns = [
      /android/i,
      /iphone/i,
      /ipad/i,
      /ipod/i,
      /blackberry/i,
      /windows phone/i,
      /mobile/i
    ];
    
    if (mobilePatterns.some(pattern => pattern.test(userAgent))) {
      return 'mobile';
    }
  }
  
  return 'web';
};

/**
 * Detect screen size based on viewport dimensions
 */
export const detectScreenSize = (): ScreenSize => {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet'; 
  return 'desktop';
};

/**
 * Check if device supports touch
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return 'ontouchstart' in window || 
         navigator.maxTouchPoints > 0 ||
         // @ts-expect-error - for older browsers
         navigator.msMaxTouchPoints > 0;
};

/**
 * Check if device supports hover
 */
export const hasHoverSupport = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  // Check CSS media query for hover support
  return window.matchMedia('(hover: hover)').matches;
};

/**
 * Get comprehensive platform information
 */
export const getPlatformInfo = (): PlatformInfo => {
  const platform = detectPlatform();
  const screenSize = detectScreenSize();
  
  return {
    platform,
    screenSize,
    isMobile: platform === 'mobile' || screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: platform === 'desktop' || screenSize === 'desktop',
    isTouchDevice: isTouchDevice(),
    hasHover: hasHoverSupport()
  };
};

/**
 * Responsive breakpoint utilities
 */
export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440
} as const;

export const mediaQueries = {
  mobile: `(max-width: ${breakpoints.mobile - 1}px)`,
  tablet: `(min-width: ${breakpoints.mobile}px) and (max-width: ${breakpoints.tablet - 1}px)`,
  desktop: `(min-width: ${breakpoints.tablet}px)`,
  touch: '(hover: none) and (pointer: coarse)',
  hover: '(hover: hover) and (pointer: fine)'
} as const;

/**
 * Hook for reactive platform detection
 */
export const usePlatformInfo = () => {
  const [platformInfo, setPlatformInfo] = React.useState<PlatformInfo>(() => 
    getPlatformInfo()
  );
  
  React.useEffect(() => {
    const handleResize = () => {
      setPlatformInfo(getPlatformInfo());
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);
  
  return platformInfo;
};

/**
 * Utility for responsive class names based on platform
 */
export const getResponsiveClasses = (
  classes: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
    touch?: string;
    hover?: string;
  }
) => {
  const { isMobile, isTablet, isDesktop, isTouchDevice, hasHover } = getPlatformInfo();
  
  const responsiveClasses = [];
  
  if (isMobile && classes.mobile) responsiveClasses.push(classes.mobile);
  if (isTablet && classes.tablet) responsiveClasses.push(classes.tablet);
  if (isDesktop && classes.desktop) responsiveClasses.push(classes.desktop);
  if (isTouchDevice && classes.touch) responsiveClasses.push(classes.touch);
  if (hasHover && classes.hover) responsiveClasses.push(classes.hover);
  
  return responsiveClasses.join(' ');
};

/**
 * Platform-specific configuration presets
 */
export const platformPresets = {
  mobile: {
    tabMinHeight: 44, // iOS touch target minimum
    tabPadding: '12px 16px',
    fontSize: 'text-base',
    iconSize: 'w-5 h-5',
    spacing: 'space-x-2',
    overflow: 'scroll',
    gestures: true,
    animation: 'slide'
  },
  tablet: {
    tabMinHeight: 40,
    tabPadding: '10px 14px', 
    fontSize: 'text-sm',
    iconSize: 'w-4 h-4',
    spacing: 'space-x-3',
    overflow: 'auto',
    gestures: true,
    animation: 'fade'
  },
  desktop: {
    tabMinHeight: 36,
    tabPadding: '8px 12px',
    fontSize: 'text-sm',
    iconSize: 'w-4 h-4', 
    spacing: 'space-x-4',
    overflow: 'hidden',
    gestures: false,
    animation: 'fade'
  }
} as const;

/**
 * Get platform-specific configuration
 */
export const getPlatformConfig = (platform?: Platform) => {
  const detectedPlatform = platform || detectPlatform();
  const screenSize = detectScreenSize();
  
  // Use mobile config for small screens regardless of platform
  if (screenSize === 'mobile') return platformPresets.mobile;
  if (screenSize === 'tablet') return platformPresets.tablet;
  
  return platformPresets[detectedPlatform as keyof typeof platformPresets] || platformPresets.desktop;
};

// Re-export React for the hook
import * as React from 'react';