// ABOUTME: Accessibility utilities for the SchoolPilot3 design system
// ABOUTME: WCAG compliance helpers, focus management, and screen reader support

import { useEffect, useRef, useCallback, useState } from 'react';

// WCAG color contrast utilities
export const getContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Calculate relative luminance
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

export const meetsWCAGAA = (foreground: string, background: string): boolean => {
  return getContrastRatio(foreground, background) >= 4.5;
};

export const meetsWCAGAAA = (foreground: string, background: string): boolean => {
  return getContrastRatio(foreground, background) >= 7;
};

// Focus management utilities
export const useFocusManagement = () => {
  const focusableElementsSelector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    return Array.from(container.querySelectorAll(focusableElementsSelector));
  };

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const restoreFocus = useCallback((previousActiveElement: Element | null) => {
    if (previousActiveElement && 'focus' in previousActiveElement) {
      (previousActiveElement as HTMLElement).focus();
    }
  }, []);

  return { trapFocus, restoreFocus, getFocusableElements };
};

// Screen reader utilities
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Keyboard navigation utilities
export const useKeyboardNavigation = (
  items: HTMLElement[],
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
    onSelect?: (index: number) => void;
  } = {}
) => {
  const { loop = true, orientation = 'both', onSelect } = options;
  const currentIndex = useRef<number>(0);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key } = event;
    let newIndex = currentIndex.current;

    switch (key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          newIndex = loop && newIndex === items.length - 1 ? 0 : Math.min(newIndex + 1, items.length - 1);
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          newIndex = loop && newIndex === 0 ? items.length - 1 : Math.max(newIndex - 1, 0);
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex = loop && newIndex === items.length - 1 ? 0 : Math.min(newIndex + 1, items.length - 1);
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex = loop && newIndex === 0 ? items.length - 1 : Math.max(newIndex - 1, 0);
        }
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.(currentIndex.current);
        return;
    }

    if (newIndex !== currentIndex.current) {
      currentIndex.current = newIndex;
      items[newIndex]?.focus();
    }
  }, [items, loop, orientation, onSelect]);

  return { handleKeyDown, currentIndex: currentIndex.current };
};

// ARIA utilities
export const generateId = (prefix: string = 'ui'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createAriaDescribedBy = (ids: (string | undefined)[]): string | undefined => {
  const validIds = ids.filter(Boolean);
  return validIds.length > 0 ? validIds.join(' ') : undefined;
};

// Motion preferences detection
export const useReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// High contrast mode detection
export const useHighContrast = (): boolean => {
  const [prefersHighContrast, setPrefersHighContrast] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
};

// Skip link utilities
export const createSkipLink = (targetId: string, label: string): HTMLAnchorElement => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = label;
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md';
  
  return skipLink;
};

// Live region utilities
export const createLiveRegion = (priority: 'polite' | 'assertive' = 'polite'): HTMLDivElement => {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  
  return liveRegion;
};

// Form accessibility utilities
export const getFormFieldIds = (fieldName: string) => {
  const baseId = generateId(fieldName);
  return {
    field: baseId,
    label: `${baseId}-label`,
    description: `${baseId}-description`,
    error: `${baseId}-error`,
  };
};

export const getAriaInvalid = (hasError: boolean): 'true' | 'false' | undefined => {
  return hasError ? 'true' : undefined;
};

