// ABOUTME: Custom hook for tooltip state management and positioning
// ABOUTME: Provides smart positioning, collision detection, and accessibility features

import { useState, useRef, useEffect, useCallback } from 'react';

export interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

export interface UseTooltipOptions {
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  trigger?: 'hover' | 'click' | 'focus' | 'manual';
  delay?: number;
  interactive?: boolean;
  disabled?: boolean;
  offset?: number;
}

export interface UseTooltipReturn {
  isVisible: boolean;
  position: TooltipPosition | null;
  triggerRef: React.RefObject<HTMLElement>;
  tooltipRef: React.RefObject<HTMLDivElement>;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  getTriggerProps: () => Record<string, any>;
  getTooltipProps: () => Record<string, any>;
}

export function useTooltip(options: UseTooltipOptions = {}): UseTooltipReturn {
  const {
    placement = 'top',
    trigger = 'hover',
    delay = 200,
    interactive = false,
    disabled = false,
    offset = 8
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  const calculatePosition = useCallback((): TooltipPosition | null => {
    if (!triggerRef.current || !tooltipRef.current) return null;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    const positions = {
      top: {
        top: triggerRect.top - tooltipRect.height - offset,
        left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
        placement: 'top' as const
      },
      bottom: {
        top: triggerRect.bottom + offset,
        left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
        placement: 'bottom' as const
      },
      left: {
        top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
        left: triggerRect.left - tooltipRect.width - offset,
        placement: 'left' as const
      },
      right: {
        top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
        left: triggerRect.right + offset,
        placement: 'right' as const
      }
    };

    // Check if preferred placement fits
    const preferredPosition = positions[placement === 'auto' ? 'top' : placement];
    
    if (placement !== 'auto') {
      // Adjust position to stay within viewport
      const adjustedPosition = { ...preferredPosition };
      
      // Horizontal adjustments
      if (adjustedPosition.left < 0) {
        adjustedPosition.left = 8;
      } else if (adjustedPosition.left + tooltipRect.width > viewport.width) {
        adjustedPosition.left = viewport.width - tooltipRect.width - 8;
      }
      
      // Vertical adjustments
      if (adjustedPosition.top < 0) {
        adjustedPosition.top = 8;
      } else if (adjustedPosition.top + tooltipRect.height > viewport.height) {
        adjustedPosition.top = viewport.height - tooltipRect.height - 8;
      }
      
      return adjustedPosition;
    }

    // Auto placement - find best fit
    const placements: Array<keyof typeof positions> = ['top', 'bottom', 'right', 'left'];
    
    for (const placementKey of placements) {
      const pos = positions[placementKey];
      const fitsHorizontally = pos.left >= 0 && pos.left + tooltipRect.width <= viewport.width;
      const fitsVertically = pos.top >= 0 && pos.top + tooltipRect.height <= viewport.height;
      
      if (fitsHorizontally && fitsVertically) {
        return pos;
      }
    }

    // Fallback to top with adjustments
    return {
      top: Math.max(8, Math.min(preferredPosition.top, viewport.height - tooltipRect.height - 8)),
      left: Math.max(8, Math.min(preferredPosition.left, viewport.width - tooltipRect.width - 8)),
      placement: 'top'
    };
  }, [placement, offset]);

  const show = useCallback(() => {
    if (disabled) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Calculate position after tooltip is rendered
      requestAnimationFrame(() => {
        const pos = calculatePosition();
        setPosition(pos);
      });
    }, delay);
  }, [disabled, delay, calculatePosition]);

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (interactive) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setPosition(null);
      }, 100);
    } else {
      setIsVisible(false);
      setPosition(null);
    }
  }, [interactive]);

  const toggle = useCallback(() => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }, [isVisible, show, hide]);

  // Handle window resize and scroll
  useEffect(() => {
    if (!isVisible) return;

    const handleResize = () => {
      const pos = calculatePosition();
      setPosition(pos);
    };

    const handleScroll = () => {
      if (!interactive) {
        hide();
      } else {
        const pos = calculatePosition();
        setPosition(pos);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isVisible, calculatePosition, hide, interactive]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const getTriggerProps = useCallback(() => {
    const props: Record<string, any> = {
      ref: triggerRef,
      'aria-describedby': isVisible ? 'tooltip' : undefined
    };

    if (trigger === 'hover') {
      props.onMouseEnter = show;
      props.onMouseLeave = hide;
      props.onFocus = show;
      props.onBlur = hide;
    } else if (trigger === 'click') {
      props.onClick = toggle;
    } else if (trigger === 'focus') {
      props.onFocus = show;
      props.onBlur = hide;
    }

    // Keyboard support
    props.onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        hide();
      }
    };

    return props;
  }, [trigger, show, hide, toggle, isVisible]);

  const getTooltipProps = useCallback(() => {
    const props: Record<string, any> = {
      ref: tooltipRef,
      id: 'tooltip',
      role: 'tooltip',
      'aria-hidden': !isVisible
    };

    if (interactive) {
      props.onMouseEnter = () => {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      };
      props.onMouseLeave = hide;
    }

    return props;
  }, [isVisible, interactive, hide]);

  return {
    isVisible,
    position,
    triggerRef,
    tooltipRef,
    show,
    hide,
    toggle,
    getTriggerProps,
    getTooltipProps
  };
}