// ABOUTME: Animation utilities for the SchoolPilot3 design system
// ABOUTME: Motion design constants, animation helpers, and reduced motion support

import { useReducedMotion } from './accessibility';
import { designTokens } from './designTokens';

// Animation presets
export interface AnimationPreset {
  duration: string;
  easing: string;
  delay?: string;
}

export const animationPresets = {
  // Entrance animations
  fadeIn: {
    duration: designTokens.animations.duration.normal,
    easing: designTokens.animations.easing.easeOut,
  },
  slideInUp: {
    duration: designTokens.animations.duration.normal,
    easing: designTokens.animations.easing.easeOut,
  },
  slideInDown: {
    duration: designTokens.animations.duration.normal,
    easing: designTokens.animations.easing.easeOut,
  },
  slideInLeft: {
    duration: designTokens.animations.duration.normal,
    easing: designTokens.animations.easing.easeOut,
  },
  slideInRight: {
    duration: designTokens.animations.duration.normal,
    easing: designTokens.animations.easing.easeOut,
  },
  scaleIn: {
    duration: designTokens.animations.duration.fast,
    easing: designTokens.animations.easing.bounceSubtle,
  },
  
  // Exit animations
  fadeOut: {
    duration: designTokens.animations.duration.fast,
    easing: designTokens.animations.easing.easeIn,
  },
  slideOutUp: {
    duration: designTokens.animations.duration.fast,
    easing: designTokens.animations.easing.easeIn,
  },
  slideOutDown: {
    duration: designTokens.animations.duration.fast,
    easing: designTokens.animations.easing.easeIn,
  },
  slideOutLeft: {
    duration: designTokens.animations.duration.fast,
    easing: designTokens.animations.easing.easeIn,
  },
  slideOutRight: {
    duration: designTokens.animations.duration.fast,
    easing: designTokens.animations.easing.easeIn,
  },
  scaleOut: {
    duration: designTokens.animations.duration.fast,
    easing: designTokens.animations.easing.easeIn,
  },
  
  // Interaction animations
  hover: {
    duration: designTokens.animations.duration.fast,
    easing: designTokens.animations.easing.easeOut,
  },
  press: {
    duration: '100ms',
    easing: designTokens.animations.easing.easeInOut,
  },
  focus: {
    duration: designTokens.animations.duration.fast,
    easing: designTokens.animations.easing.easeOut,
  },
  
  // Loading animations
  pulse: {
    duration: '2s',
    easing: designTokens.animations.easing.easeInOut,
  },
  spin: {
    duration: '1s',
    easing: designTokens.animations.easing.linear,
  },
  bounce: {
    duration: '1s',
    easing: designTokens.animations.easing.bounce,
  },
  
  // Staggered animations
  staggered: {
    duration: designTokens.animations.duration.normal,
    easing: designTokens.animations.easing.easeOut,
    delay: '50ms', // Base delay, multiply by index
  } as AnimationPreset,
  
  // Page transition animations
  pageSlideLeft: {
    duration: designTokens.animations.duration.normal,
    easing: designTokens.animations.easing.easeInOut,
  },
  pageSlideRight: {
    duration: designTokens.animations.duration.normal,
    easing: designTokens.animations.easing.easeInOut,
  },
  pageSlideUp: {
    duration: designTokens.animations.duration.normal,
    easing: designTokens.animations.easing.easeInOut,
  },
  pageSlideDown: {
    duration: designTokens.animations.duration.normal,
    easing: designTokens.animations.easing.easeInOut,
  },
  
  // Advanced interaction animations
  morphIn: {
    duration: designTokens.animations.duration.slow,
    easing: designTokens.animations.easing.bounceSubtle,
  },
  morphOut: {
    duration: designTokens.animations.duration.normal,
    easing: designTokens.animations.easing.easeIn,
  },
  
  // Elastic animations
  elasticIn: {
    duration: designTokens.animations.duration.slow,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  elasticOut: {
    duration: designTokens.animations.duration.normal,
    easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  
  // Attention-seeking animations
  shake: {
    duration: '600ms',
    easing: designTokens.animations.easing.easeInOut,
  },
  wobble: {
    duration: '1s',
    easing: designTokens.animations.easing.easeInOut,
  },
  heartbeat: {
    duration: '1.3s',
    easing: designTokens.animations.easing.easeInOut,
  },
} as const;

// Animation keyframes
export const keyframes = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  slideInUp: {
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  slideInDown: {
    from: { opacity: 0, transform: 'translateY(-20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  slideInLeft: {
    from: { opacity: 0, transform: 'translateX(-20px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
  },
  slideInRight: {
    from: { opacity: 0, transform: 'translateX(20px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
  },
  slideOutUp: {
    from: { opacity: 1, transform: 'translateY(0)' },
    to: { opacity: 0, transform: 'translateY(-20px)' },
  },
  slideOutDown: {
    from: { opacity: 1, transform: 'translateY(0)' },
    to: { opacity: 0, transform: 'translateY(20px)' },
  },
  slideOutLeft: {
    from: { opacity: 1, transform: 'translateX(0)' },
    to: { opacity: 0, transform: 'translateX(-20px)' },
  },
  slideOutRight: {
    from: { opacity: 1, transform: 'translateX(0)' },
    to: { opacity: 0, transform: 'translateX(20px)' },
  },
  scaleIn: {
    from: { opacity: 0, transform: 'scale(0.95)' },
    to: { opacity: 1, transform: 'scale(1)' },
  },
  scaleOut: {
    from: { opacity: 1, transform: 'scale(1)' },
    to: { opacity: 0, transform: 'scale(0.95)' },
  },
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  bounce: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-25%)' },
  },
  shimmer: {
    '0%': { backgroundPosition: '200% 0' },
    '100%': { backgroundPosition: '-200% 0' },
  },
  
  // Page transition keyframes
  pageSlideLeft: {
    from: { transform: 'translateX(100%)' },
    to: { transform: 'translateX(0)' },
  },
  pageSlideRight: {
    from: { transform: 'translateX(-100%)' },
    to: { transform: 'translateX(0)' },
  },
  pageSlideUp: {
    from: { transform: 'translateY(100%)' },
    to: { transform: 'translateY(0)' },
  },
  pageSlideDown: {
    from: { transform: 'translateY(-100%)' },
    to: { transform: 'translateY(0)' },
  },
  
  // Advanced interaction keyframes
  morphIn: {
    '0%': { 
      opacity: 0, 
      transform: 'scale(0.8) rotate(-10deg)',
      borderRadius: '50%',
    },
    '50%': { 
      opacity: 0.8, 
      transform: 'scale(1.05) rotate(2deg)',
    },
    '100%': { 
      opacity: 1, 
      transform: 'scale(1) rotate(0deg)',
      borderRadius: 'var(--border-radius-md)',
    },
  },
  morphOut: {
    '0%': { 
      opacity: 1, 
      transform: 'scale(1) rotate(0deg)',
      borderRadius: 'var(--border-radius-md)',
    },
    '100%': { 
      opacity: 0, 
      transform: 'scale(0.8) rotate(10deg)',
      borderRadius: '50%',
    },
  },
  
  // Elastic keyframes
  elasticIn: {
    '0%': { opacity: 0, transform: 'scale(0.3)' },
    '25%': { transform: 'scale(1.1)' },
    '50%': { transform: 'scale(0.9)' },
    '75%': { transform: 'scale(1.03)' },
    '100%': { opacity: 1, transform: 'scale(1)' },
  },
  elasticOut: {
    '0%': { opacity: 1, transform: 'scale(1)' },
    '25%': { transform: 'scale(0.97)' },
    '50%': { transform: 'scale(1.1)' },
    '100%': { opacity: 0, transform: 'scale(0.3)' },
  },
  
  // Attention-seeking keyframes
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
  },
  wobble: {
    '0%': { transform: 'translateX(0%)' },
    '15%': { transform: 'translateX(-25%) rotate(-5deg)' },
    '30%': { transform: 'translateX(20%) rotate(3deg)' },
    '45%': { transform: 'translateX(-15%) rotate(-3deg)' },
    '60%': { transform: 'translateX(10%) rotate(2deg)' },
    '75%': { transform: 'translateX(-5%) rotate(-1deg)' },
    '100%': { transform: 'translateX(0%)' },
  },
  heartbeat: {
    '0%': { transform: 'scale(1)' },
    '14%': { transform: 'scale(1.3)' },
    '28%': { transform: 'scale(1)' },
    '42%': { transform: 'scale(1.3)' },
    '70%': { transform: 'scale(1)' },
  },
};

// CSS animation generator
export const createAnimation = (
  name: keyof typeof animationPresets,
  options: Partial<AnimationPreset> = {}
): string => {
  const preset = animationPresets[name];
  const duration = options.duration || preset.duration;
  const easing = options.easing || preset.easing;
  const delay = options.delay || ('delay' in preset ? preset.delay : '0ms');
  
  return `${name} ${duration} ${easing} ${delay} both`;
};

// Staggered animation helper
export const createStaggeredAnimation = (
  name: keyof typeof animationPresets,
  index: number,
  baseDelay: number = 50
): string => {
  const preset = animationPresets[name];
  const delay = `${index * baseDelay}ms`;
  
  return createAnimation(name, { ...preset, delay });
};

// Motion-safe animation hook
export const useAnimation = (
  animationName: keyof typeof animationPresets,
  options: Partial<AnimationPreset> = {}
): string => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    // Return minimal or no animation for reduced motion preference
    return 'none';
  }
  
  return createAnimation(animationName, options);
};

// CSS-in-JS animation styles
export const getAnimationStyles = (
  animationName: keyof typeof animationPresets,
  options: Partial<AnimationPreset> = {}
): React.CSSProperties => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return {};
  }
  
  const preset = animationPresets[animationName];
  
  return {
    animation: createAnimation(animationName, options),
    animationDuration: options.duration || preset.duration,
    animationTimingFunction: options.easing || preset.easing,
    animationDelay: options.delay || ('delay' in preset ? preset.delay : '0ms'),
    animationFillMode: 'both',
  };
};

// Transition utilities
export const createTransition = (
  properties: string[],
  duration: string = designTokens.animations.duration.normal,
  easing: string = designTokens.animations.easing.easeInOut
): string => {
  return properties
    .map(property => `${property} ${duration} ${easing}`)
    .join(', ');
};

export const useTransition = (
  properties: string[],
  duration?: string,
  easing?: string
): React.CSSProperties => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return {
      transition: 'none',
    };
  }
  
  return {
    transition: createTransition(properties, duration, easing),
  };
};

// Common transition presets
export const transitions = {
  all: createTransition(['all']),
  colors: createTransition(['color', 'background-color', 'border-color']),
  transform: createTransition(['transform']),
  opacity: createTransition(['opacity']),
  shadow: createTransition(['box-shadow']),
  size: createTransition(['width', 'height']),
  position: createTransition(['top', 'right', 'bottom', 'left']),
};

// Performance optimization utilities
export const willChange = {
  auto: 'auto',
  scroll: 'scroll-position',
  contents: 'contents',
  transform: 'transform',
  opacity: 'opacity',
};

export const optimizeAnimation = (element: HTMLElement, properties: string[]): void => {
  element.style.willChange = properties.join(', ');
  
  // Clean up after animation
  const cleanup = () => {
    element.style.willChange = 'auto';
  };
  
  element.addEventListener('animationend', cleanup, { once: true });
  element.addEventListener('transitionend', cleanup, { once: true });
};

// Legacy animation event handlers (kept for compatibility)
export const useAnimationEventHandlers = () => {
  const handleAnimationStart = (callback: () => void) => (_event: AnimationEvent) => {
    callback();
  };
  
  const handleAnimationEnd = (callback: () => void) => (_event: AnimationEvent) => {
    callback();
  };
  
  const handleTransitionEnd = (callback: () => void) => (_event: TransitionEvent) => {
    callback();
  };
  
  return {
    onAnimationStart: handleAnimationStart,
    onAnimationEnd: handleAnimationEnd,
    onTransitionEnd: handleTransitionEnd,
  };
};

// Intersection Observer animation trigger
export const useIntersectionAnimation = (
  animationName: keyof typeof animationPresets,
  options: IntersectionObserverInit = { threshold: 0.1 }
) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      options
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [options]);
  
  const animationStyle = useAnimation(animationName);
  
  return {
    ref: elementRef,
    style: isVisible ? { animation: animationStyle } : {},
    isVisible,
  };
};

// React imports
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Page transition system
export interface PageTransitionConfig {
  duration: number;
  easing: string;
  type: 'fade' | 'slide' | 'scale' | 'none';
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const defaultPageTransition: PageTransitionConfig = {
  duration: 300,
  easing: designTokens.animations.easing.easeInOut,
  type: 'fade',
};

// Page transition hook
export const usePageTransition = (config: Partial<PageTransitionConfig> = {}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStage, setTransitionStage] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const prefersReducedMotion = useReducedMotion();
  
  const transitionConfig = { ...defaultPageTransition, ...config };
  
  const startTransition = useCallback((callback: () => void) => {
    if (prefersReducedMotion) {
      callback();
      return;
    }
    
    setIsTransitioning(true);
    setTransitionStage('exiting');
    
    // Exit animation duration
    setTimeout(() => {
      callback();
      setTransitionStage('entering');
      
      // Enter animation duration
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionStage('idle');
      }, transitionConfig.duration);
    }, transitionConfig.duration);
  }, [transitionConfig.duration, prefersReducedMotion]);
  
  const getTransitionStyles = (): React.CSSProperties => {
    if (prefersReducedMotion || transitionStage === 'idle') {
      return {};
    }
    
    const baseStyles: React.CSSProperties = {
      transition: `all ${transitionConfig.duration}ms ${transitionConfig.easing}`,
    };
    
    switch (transitionConfig.type) {
      case 'fade':
        return {
          ...baseStyles,
          opacity: transitionStage === 'exiting' ? 0 : 1,
        };
      case 'slide':
        const direction = transitionConfig.direction || 'right';
        const translateValue = transitionStage === 'exiting' ? 
          (direction === 'left' ? '-100%' : direction === 'right' ? '100%' : 
           direction === 'up' ? '-100%' : '100%') : '0%';
        const translateProperty = direction === 'left' || direction === 'right' ? 'translateX' : 'translateY';
        return {
          ...baseStyles,
          transform: `${translateProperty}(${translateValue})`,
        };
      case 'scale':
        return {
          ...baseStyles,
          transform: `scale(${transitionStage === 'exiting' ? 0.95 : 1})`,
          opacity: transitionStage === 'exiting' ? 0 : 1,
        };
      default:
        return baseStyles;
    }
  };
  
  return {
    isTransitioning,
    transitionStage,
    startTransition,
    getTransitionStyles,
  };
};

// Performance optimization utilities
export const usePerformantAnimation = () => {
  const rafRef = useRef<number | undefined>(undefined);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const startAnimation = useCallback((callback: (progress: number) => void, duration: number = 300) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    setIsAnimating(true);
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      callback(progress);
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    
    rafRef.current = requestAnimationFrame(animate);
  }, []);
  
  const stopAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      setIsAnimating(false);
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
  
  return { startAnimation, stopAnimation, isAnimating };
};

// 60fps performance monitoring
export const useAnimationPerformance = () => {
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  
  const measureFrame = useCallback(() => {
    const now = performance.now();
    if (lastFrameTimeRef.current) {
      const frameTime = now - lastFrameTimeRef.current;
      frameTimesRef.current.push(frameTime);
      
      // Keep only last 60 frames
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }
    }
    lastFrameTimeRef.current = now;
  }, []);
  
  const getAverageFPS = useCallback(() => {
    if (frameTimesRef.current.length === 0) return 0;
    
    const averageFrameTime = frameTimesRef.current.reduce((sum, time) => sum + time, 0) / frameTimesRef.current.length;
    return Math.round(1000 / averageFrameTime);
  }, []);
  
  const isPerformant = useCallback(() => {
    return getAverageFPS() >= 55; // Allow some tolerance below 60fps
  }, [getAverageFPS]);
  
  return { measureFrame, getAverageFPS, isPerformant };
};

// Progressive enhancement for animations
export const useProgressiveAnimation = (animationName: keyof typeof animationPresets) => {
  const [canAnimate, setCanAnimate] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { isPerformant } = useAnimationPerformance();
  
  useEffect(() => {
    // Check if device can handle animations
    const checkAnimationSupport = () => {
      // Check for hardware acceleration support
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const hasWebGL = !!gl;
      
      // Check for CSS animation support
      const testElement = document.createElement('div');
      const hasCSSAnimations = 'animation' in testElement.style;
      
      // Check device memory (if available)
      const deviceMemory = (navigator as any).deviceMemory || 4; // Default to 4GB
      const hasEnoughMemory = deviceMemory >= 2;
      
      return hasWebGL && hasCSSAnimations && hasEnoughMemory;
    };
    
    const supportsAnimations = checkAnimationSupport();
    setCanAnimate(supportsAnimations && !prefersReducedMotion);
  }, [prefersReducedMotion]);
  
  const getAnimationClass = useCallback(() => {
    if (!canAnimate || !isPerformant()) {
      return '';
    }
    return `animate-${animationName.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
  }, [canAnimate, isPerformant, animationName]);
  
  const getAnimationStyles = useCallback(() => {
    if (!canAnimate || !isPerformant()) {
      return {};
    }
    // Return animation styles based on the animation name
    const preset = animationPresets[animationName];
    return preset ? { animation: preset.animation } : {};
  }, [canAnimate, isPerformant, animationName]);
  
  return {
    canAnimate: canAnimate && isPerformant(),
    getAnimationClass,
    getAnimationStyles,
  };
};

// Staggered animation system
export const useStaggeredAnimation = (
  items: any[],
  animationName: keyof typeof animationPresets,
  baseDelay: number = 50
) => {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);
  const prefersReducedMotion = useReducedMotion();
  
  const createObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-stagger-index') || '0');
            setVisibleItems(prev => new Set([...prev, index]));
          }
        });
      },
      { threshold: 0.1 }
    );
  }, []);
  
  useEffect(() => {
    createObserver();
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [createObserver]);
  
  const getItemProps = useCallback((index: number) => {
    const isVisible = visibleItems.has(index);
    const delay = prefersReducedMotion ? 0 : index * baseDelay;
    
    return {
      ref: (el: HTMLElement | null) => {
        if (el && observerRef.current) {
          el.setAttribute('data-stagger-index', index.toString());
          observerRef.current.observe(el);
        }
      },
      style: {
        animationDelay: `${delay}ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: prefersReducedMotion ? 'none' : `opacity 300ms ease-out ${delay}ms, transform 300ms ease-out ${delay}ms`,
      },
      className: isVisible && !prefersReducedMotion ? `animate-${animationName}` : '',
    };
  }, [visibleItems, baseDelay, prefersReducedMotion, animationName]);
  
  return { getItemProps };
};

// Animation orchestration system
export const useAnimationOrchestrator = () => {
  const [activeAnimations, setActiveAnimations] = useState<Map<string, boolean>>(new Map());
  
  const registerAnimation = useCallback((id: string) => {
    setActiveAnimations(prev => new Map(prev.set(id, true)));
  }, []);
  
  const unregisterAnimation = useCallback((id: string) => {
    setActiveAnimations(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);
  
  const isAnimating = useCallback((id?: string) => {
    if (id) {
      return activeAnimations.has(id);
    }
    return activeAnimations.size > 0;
  }, [activeAnimations]);
  
  const waitForAnimations = useCallback((ids?: string[]) => {
    return new Promise<void>((resolve) => {
      const checkAnimations = () => {
        const targetIds = ids || Array.from(activeAnimations.keys());
        const stillAnimating = targetIds.some(id => activeAnimations.has(id));
        
        if (!stillAnimating) {
          resolve();
        } else {
          requestAnimationFrame(checkAnimations);
        }
      };
      
      checkAnimations();
    });
  }, [activeAnimations]);
  
  return {
    registerAnimation,
    unregisterAnimation,
    isAnimating,
    waitForAnimations,
    activeAnimationCount: activeAnimations.size,
  };
};

// Transition state hook for component transitions
export const useTransitionState = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const startTransition = useCallback((callback: () => void) => {
    setIsTransitioning(true);
    
    // Execute the callback after a brief delay to allow for transition effects
    setTimeout(() => {
      callback();
      
      // Reset transition state after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 200); // Match typical transition duration
    }, 50);
  }, []);
  
  return {
    isTransitioning,
    startTransition,
  };
};

// Animation event system
export const useAnimationEvents = () => {
  const eventCallbacks = useRef<Map<string, (() => void)[]>>(new Map());
  
  const addEventListener = useCallback((event: string, callback: () => void) => {
    const callbacks = eventCallbacks.current.get(event) || [];
    callbacks.push(callback);
    eventCallbacks.current.set(event, callbacks);
    
    return () => {
      const updatedCallbacks = eventCallbacks.current.get(event) || [];
      const index = updatedCallbacks.indexOf(callback);
      if (index > -1) {
        updatedCallbacks.splice(index, 1);
        eventCallbacks.current.set(event, updatedCallbacks);
      }
    };
  }, []);
  
  const dispatchEvent = useCallback((event: string) => {
    const callbacks = eventCallbacks.current.get(event) || [];
    callbacks.forEach(callback => callback());
  }, []);
  
  const handleAnimationStart = useCallback((callback: () => void) => (event: AnimationEvent) => {
    callback();
    dispatchEvent('animationStart');
  }, [dispatchEvent]);
  
  const handleAnimationEnd = useCallback((callback: () => void) => (event: AnimationEvent) => {
    callback();
    dispatchEvent('animationEnd');
  }, [dispatchEvent]);
  
  const handleTransitionEnd = useCallback((callback: () => void) => (event: TransitionEvent) => {
    callback();
    dispatchEvent('transitionEnd');
  }, [dispatchEvent]);
  
  return {
    addEventListener,
    dispatchEvent,
    onAnimationStart: handleAnimationStart,
    onAnimationEnd: handleAnimationEnd,
    onTransitionEnd: handleTransitionEnd,
  };
};