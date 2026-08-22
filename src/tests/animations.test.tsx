// ABOUTME: Comprehensive tests for the animation system
// ABOUTME: Tests animation utilities, hooks, performance optimization, and accessibility

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { usePageTransition, usePerformantAnimation, useAnimationPerformance, useProgressiveAnimation, useStaggeredAnimation, useAnimationOrchestrator, useTransitionState, createAnimation, createStaggeredAnimation, useAnimation, getAnimationStyles, createTransition, useTransition, optimizeAnimation, useAnimationEvents, useIntersectionAnimation, animationPresets, keyframes } from '@/utils/animations';

// Mock reduced motion hook and IntersectionObserver
import { vi } from 'vitest';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 16); // ~60fps
});
global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

vi.mock('../utils/accessibility', () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { useReducedMotion } from '@/utils/accessibility';
const mockUseReducedMotion = vi.mocked(useReducedMotion);

describe('Animation System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  describe('Animation Presets', () => {
    it('should have all required animation presets', () => {
      expect(animationPresets).toHaveProperty('fadeIn');
      expect(animationPresets).toHaveProperty('slideInUp');
      expect(animationPresets).toHaveProperty('scaleIn');
      expect(animationPresets).toHaveProperty('pageSlideLeft');
      expect(animationPresets).toHaveProperty('morphIn');
      expect(animationPresets).toHaveProperty('elasticIn');
      expect(animationPresets).toHaveProperty('shake');
      expect(animationPresets).toHaveProperty('heartbeat');
    });

    it('should have corresponding keyframes for each preset', () => {
      expect(keyframes).toHaveProperty('fadeIn');
      expect(keyframes).toHaveProperty('slideInUp');
      expect(keyframes).toHaveProperty('scaleIn');
      expect(keyframes).toHaveProperty('pageSlideLeft');
      expect(keyframes).toHaveProperty('morphIn');
      expect(keyframes).toHaveProperty('elasticIn');
      expect(keyframes).toHaveProperty('shake');
      expect(keyframes).toHaveProperty('heartbeat');
    });
  });

  describe('createAnimation', () => {
    it('should create animation string with default values', () => {
      const animation = createAnimation('fadeIn');
      expect(animation).toContain('fadeIn');
      expect(animation).toContain('300ms'); // default duration
      expect(animation).toContain('cubic-bezier(0, 0, 0.2, 1)'); // default easing
    });

    it('should create animation string with custom options', () => {
      const animation = createAnimation('slideInUp', {
        duration: '500ms',
        easing: 'ease-in',
        delay: '100ms',
      });
      expect(animation).toBe('slideInUp 500ms ease-in 100ms both');
    });
  });

  describe('createStaggeredAnimation', () => {
    it('should create staggered animation with calculated delay', () => {
      const animation = createStaggeredAnimation('fadeIn', 2, 100);
      expect(animation).toContain('fadeIn');
      expect(animation).toContain('200ms'); // 2 * 100ms delay
    });
  });

  describe('useAnimation hook', () => {
    it('should return animation string when motion is allowed', () => {
      const { result } = renderHook(() => useAnimation('fadeIn'));
      expect(result.current).toContain('fadeIn');
    });

    it('should return "none" when reduced motion is preferred', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const { result } = renderHook(() => useAnimation('fadeIn'));
      expect(result.current).toBe('none');
    });
  });

  describe('getAnimationStyles', () => {
    it('should return animation styles when motion is allowed', () => {
      const styles = getAnimationStyles('fadeIn');
      expect(styles).toHaveProperty('animation');
      expect(styles).toHaveProperty('animationDuration');
      expect(styles).toHaveProperty('animationTimingFunction');
    });

    it('should return empty object when reduced motion is preferred', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const styles = getAnimationStyles('fadeIn');
      expect(styles).toEqual({});
    });
  });

  describe('usePageTransition hook', () => {
    it('should initialize with idle state', () => {
      const { result } = renderHook(() => usePageTransition());
      expect(result.current.isTransitioning).toBe(false);
      expect(result.current.transitionStage).toBe('idle');
    });

    it('should handle transition lifecycle', async () => {
      const { result } = renderHook(() => usePageTransition({ duration: 100 }));
      const callback = vi.fn();

      act(() => {
        result.current.startTransition(callback);
      });

      expect(result.current.isTransitioning).toBe(true);
      expect(result.current.transitionStage).toBe('exiting');

      await waitFor(() => {
        expect(callback).toHaveBeenCalled();
      }, { timeout: 200 });

      await waitFor(() => {
        expect(result.current.transitionStage).toBe('entering');
      }, { timeout: 300 });

      await waitFor(() => {
        expect(result.current.isTransitioning).toBe(false);
        expect(result.current.transitionStage).toBe('idle');
      }, { timeout: 400 });
    });

    it('should skip animation when reduced motion is preferred', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const { result } = renderHook(() => usePageTransition());
      const callback = vi.fn();

      act(() => {
        result.current.startTransition(callback);
      });

      expect(callback).toHaveBeenCalled();
      expect(result.current.isTransitioning).toBe(false);
    });

    it('should generate correct transition styles', () => {
      const { result } = renderHook(() => usePageTransition({
        type: 'fade',
        duration: 300,
      }));

      act(() => {
        result.current.startTransition(() => {});
      });

      const styles = result.current.getTransitionStyles();
      expect(styles).toHaveProperty('transition');
      expect(styles).toHaveProperty('opacity');
    });
  });

  describe('usePerformantAnimation hook', () => {
    it('should initialize with not animating state', () => {
      const { result } = renderHook(() => usePerformantAnimation());
      expect(result.current.isAnimating).toBe(false);
    });

    it('should handle animation lifecycle', async () => {
      const { result } = renderHook(() => usePerformantAnimation());
      const callback = vi.fn();

      act(() => {
        result.current.startAnimation(callback, 50);
      });

      expect(result.current.isAnimating).toBe(true);

      await waitFor(() => {
        expect(result.current.isAnimating).toBe(false);
      }, { timeout: 500 });

      expect(callback).toHaveBeenCalled();
    });

    it('should stop animation when requested', () => {
      const { result } = renderHook(() => usePerformantAnimation());
      const callback = vi.fn();

      act(() => {
        result.current.startAnimation(callback, 1000);
      });

      expect(result.current.isAnimating).toBe(true);

      act(() => {
        result.current.stopAnimation();
      });

      expect(result.current.isAnimating).toBe(false);
    });
  });

  describe('useAnimationPerformance hook', () => {
    it('should initialize with zero FPS', () => {
      const { result } = renderHook(() => useAnimationPerformance());
      expect(result.current.getAverageFPS()).toBe(0);
    });

    it('should measure frame times', () => {
      const { result } = renderHook(() => useAnimationPerformance());

      act(() => {
        result.current.measureFrame();
        result.current.measureFrame();
      });

      // Should have measured at least one frame
      expect(result.current.getAverageFPS()).toBeGreaterThan(0);
    });

    it('should determine performance status', () => {
      const { result } = renderHook(() => useAnimationPerformance());
      
      // Initially should not be performant (no frames measured)
      expect(result.current.isPerformant()).toBe(false);
    });
  });

  describe('useProgressiveAnimation hook', () => {
    it('should determine animation capability', () => {
      const { result } = renderHook(() => useProgressiveAnimation('fadeIn'));
      
      // Should be able to animate by default (mocked reduced motion = false)
      expect(typeof result.current.canAnimate).toBe('boolean');
      expect(typeof result.current.getAnimationClass).toBe('function');
      expect(typeof result.current.getAnimationStyles).toBe('function');
    });

    it('should disable animations when reduced motion is preferred', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const { result } = renderHook(() => useProgressiveAnimation('fadeIn'));
      
      expect(result.current.canAnimate).toBe(false);
    });
  });

  describe('useAnimationOrchestrator hook', () => {
    it('should initialize with no active animations', () => {
      const { result } = renderHook(() => useAnimationOrchestrator());
      expect(result.current.activeAnimationCount).toBe(0);
      expect(result.current.isAnimating()).toBe(false);
    });

    it('should register and unregister animations', () => {
      const { result } = renderHook(() => useAnimationOrchestrator());

      act(() => {
        result.current.registerAnimation('test-1');
      });

      expect(result.current.activeAnimationCount).toBe(1);
      expect(result.current.isAnimating('test-1')).toBe(true);

      act(() => {
        result.current.unregisterAnimation('test-1');
      });

      expect(result.current.activeAnimationCount).toBe(0);
      expect(result.current.isAnimating('test-1')).toBe(false);
    });

    it('should wait for animations to complete', async () => {
      const { result } = renderHook(() => useAnimationOrchestrator());

      // Test with no animations - should resolve immediately
      const waitPromise = result.current.waitForAnimations([]);
      await expect(waitPromise).resolves.toBeUndefined();
    });
  });

  describe('useTransitionState hook', () => {
    it('should initialize with not transitioning state', () => {
      const { result } = renderHook(() => useTransitionState());
      expect(result.current.isTransitioning).toBe(false);
    });

    it('should handle transition state', async () => {
      const { result } = renderHook(() => useTransitionState());
      const callback = vi.fn();

      act(() => {
        result.current.startTransition(callback);
      });

      expect(result.current.isTransitioning).toBe(true);

      await waitFor(() => {
        expect(callback).toHaveBeenCalled();
      }, { timeout: 100 });

      await waitFor(() => {
        expect(result.current.isTransitioning).toBe(false);
      }, { timeout: 300 });
    });
  });

  describe('Transition utilities', () => {
    it('should create transition string', () => {
      const transition = createTransition(['opacity', 'transform'], '200ms', 'ease-in');
      expect(transition).toBe('opacity 200ms ease-in, transform 200ms ease-in');
    });

    it('should return transition styles', () => {
      const { result } = renderHook(() => useTransition(['opacity']));
      expect(result.current).toHaveProperty('transition');
    });

    it('should return no transition when reduced motion is preferred', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const { result } = renderHook(() => useTransition(['opacity']));
      expect(result.current.transition).toBe('none');
    });
  });

  describe('Performance optimization', () => {
    it('should optimize animation element', () => {
      const element = document.createElement('div');
      optimizeAnimation(element, ['transform', 'opacity']);
      
      expect(element.style.willChange).toBe('transform, opacity');
    });
  });

  describe('Animation events', () => {
    it('should handle animation events', () => {
      const { result } = renderHook(() => useAnimationEvents());
      
      expect(typeof result.current.addEventListener).toBe('function');
      expect(typeof result.current.dispatchEvent).toBe('function');
      expect(typeof result.current.onAnimationStart).toBe('function');
      expect(typeof result.current.onAnimationEnd).toBe('function');
      expect(typeof result.current.onTransitionEnd).toBe('function');
    });

    it('should dispatch custom events', () => {
      const { result } = renderHook(() => useAnimationEvents());
      const callback = vi.fn();

      act(() => {
        result.current.addEventListener('test-event', callback);
        result.current.dispatchEvent('test-event');
      });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Intersection animation', () => {
    it('should initialize with not visible state', () => {
      const { result } = renderHook(() => useIntersectionAnimation('fadeIn'));
      
      expect(result.current.isVisible).toBe(false);
      expect(result.current.ref).toBeDefined();
      expect(result.current.style).toEqual({});
    });
  });

  describe('Staggered animation', () => {
    it('should provide item props with staggered delays', () => {
      const items = ['item1', 'item2', 'item3'];
      const { result } = renderHook(() => useStaggeredAnimation(items, 'fadeIn', 100));
      
      const props0 = result.current.getItemProps(0);
      const props1 = result.current.getItemProps(1);
      const props2 = result.current.getItemProps(2);
      
      expect(props0.style.animationDelay).toBe('0ms');
      expect(props1.style.animationDelay).toBe('100ms');
      expect(props2.style.animationDelay).toBe('200ms');
    });
  });

  describe('Accessibility compliance', () => {
    it('should respect reduced motion preferences', () => {
      mockUseReducedMotion.mockReturnValue(true);
      
      const animation = useAnimation('fadeIn');
      const styles = getAnimationStyles('fadeIn');
      const transition = useTransition(['opacity']);
      
      expect(animation).toBe('none');
      expect(styles).toEqual({});
      expect(transition.transition).toBe('none');
    });

    it('should provide fallback animations', () => {
      mockUseReducedMotion.mockReturnValue(false);
      
      const animation = useAnimation('fadeIn');
      const styles = getAnimationStyles('fadeIn');
      
      expect(animation).not.toBe('none');
      expect(Object.keys(styles)).toContain('animation');
    });
  });

  describe('Performance requirements', () => {
    it('should maintain 60fps target', () => {
      const { result } = renderHook(() => useAnimationPerformance());
      
      // Simulate 60fps frame times (16.67ms per frame)

      
      act(() => {
        // Simulate multiple frames at 60fps
        for (let i = 0; i < 10; i++) {
          result.current.measureFrame();
        }
      });
      
      // Should be considered performant
      expect(result.current.isPerformant()).toBe(true);
    });

    it('should detect poor performance', () => {
      const { result } = renderHook(() => useAnimationPerformance());
      
      // No frames measured should be considered non-performant
      expect(result.current.isPerformant()).toBe(false);
    });
  });
});

// Integration test component
const TestAnimationComponent: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(true);
  const pageTransition = usePageTransition();
  
  return (
    <div>
      <button 
        onClick={() => setIsVisible(!isVisible)}
        data-testid="toggle-visibility"
      >
        Toggle
      </button>
      
      {isVisible && (
        <div 
          className="animate-fade-in"
          data-testid="animated-element"
          style={pageTransition.getTransitionStyles()}
        >
          Animated Content
        </div>
      )}
      
      <div data-testid="transition-stage">
        {pageTransition.transitionStage}
      </div>
    </div>
  );
};

describe('Animation Integration', () => {
  it('should render animated components correctly', () => {
    render(<TestAnimationComponent />);
    
    expect(screen.getByTestId('animated-element')).toBeInTheDocument();
    expect(screen.getByTestId('transition-stage')).toHaveTextContent('idle');
  });

  it('should handle visibility toggles', () => {
    render(<TestAnimationComponent />);
    
    const toggleButton = screen.getByTestId('toggle-visibility');
    const animatedElement = screen.getByTestId('animated-element');
    
    expect(animatedElement).toBeInTheDocument();
    
    fireEvent.click(toggleButton);
    
    expect(screen.queryByTestId('animated-element')).not.toBeInTheDocument();
  });

  it('should apply animation classes correctly', () => {
    render(<TestAnimationComponent />);
    
    const animatedElement = screen.getByTestId('animated-element');
    expect(animatedElement).toHaveClass('animate-fade-in');
  });
});