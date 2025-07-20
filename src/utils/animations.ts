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
};

// CSS animation generator
export const createAnimation = (
  name: keyof typeof animationPresets,
  options: Partial<AnimationPreset> = {}
): string => {
  const preset = animationPresets[name];
  const duration = options.duration || preset.duration;
  const easing = options.easing || preset.easing;
  const delay = options.delay || preset.delay || '0ms';
  
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
    animationDelay: options.delay || preset.delay || '0ms',
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

// Animation event handlers
export const useAnimationEvents = () => {
  const handleAnimationStart = (callback: () => void) => (event: AnimationEvent) => {
    callback();
  };
  
  const handleAnimationEnd = (callback: () => void) => (event: AnimationEvent) => {
    callback();
  };
  
  const handleTransitionEnd = (callback: () => void) => (event: TransitionEvent) => {
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
import React, { useState, useEffect, useRef } from 'react';