// ABOUTME: Render loop prevention utilities for React applications
// ABOUTME: Provides hooks and utilities to prevent common causes of render loops

import { 
  useCallback, 
  useEffect, 
  useRef, 
  useState, 
  useMemo,
  useSyncExternalStore,
  EffectCallback,
  DependencyList,
  MutableRefObject
} from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Options for configuring a RenderGuard instance
 */
export interface RenderGuardOptions {
  /** Maximum number of renders allowed within the time window before triggering onExceeded */
  maxRenders?: number;
  /** Time window in milliseconds to track renders (default: 1000ms) */
  timeWindow?: number;
  /** Callback fired when maxRenders is exceeded */
  onExceeded?: (count: number, timeWindow: number) => void;
}

/**
 * RenderGuard interface for tracking and controlling render cycles
 */
export interface RenderGuard {
  /** Call to track a render - should be called at the start of each render */
  track: () => void;
  /** Reset the render counter */
  reset: () => void;
  /** Get the current render count within the time window */
  getCount: () => number;
  /** Subscribe to render count changes */
  subscribe: (callback: () => void) => () => void;
  /** Get the current snapshot of render count */
  getSnapshot: () => number;
}

// ============================================================================
// Development-Only Warning System
// ============================================================================

/**
 * Checks if we're in development mode
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logs a warning only in development mode
 * @param message - Warning message to log
 * @param context - Additional context for debugging
 */
const devWarn = (message: string, context?: unknown): void => {
  if (isDevelopment) {
    console.warn(`[RenderLoopPrevention] ${message}`, context ?? '');
  }
};

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Wraps a callback to maintain referential equality across renders.
 * Only recreates the callback when dependencies change.
 * 
 * @param callback - The callback to wrap
 * @param deps - Optional dependency array (if not provided, uses internal comparison)
 * @returns A stable callback reference that only changes when deps change
 * 
 * @example
 * ```tsx
 * const handleClick = useStableCallback((id: string) => {
 *   console.log('Clicked:', id);
 * }, [id]);
 * ```
 */
export function useStableCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  deps?: DependencyList
): T {
  if (deps !== undefined && !Array.isArray(deps)) {
    devWarn('useStableCallback: deps must be an array or undefined');
  }
  
  return useCallback(callback, deps ?? [callback]);
}

/**
 * Returns a stable reference to a value.
 * Uses custom comparison for deps to prevent unnecessary recalculations.
 * 
 * @param value - The value to stabilize
 * @param deps - Optional dependency array for comparison
 * @returns A stable reference to the value
 * 
 * @example
 * ```tsx
 * const stableConfig = useStableValue({ theme: 'dark' }, [theme]);
 * ```
 */
export function useStableValue<T>(value: T, deps?: DependencyList): T {
  const depsRef = useRef<DependencyList | undefined>(undefined);
  const valueRef = useRef<T>(value);
  
  if (deps !== undefined) {
    const depsChanged = !shallowCompare(depsRef.current, deps);
    if (depsChanged) {
      depsRef.current = deps;
      valueRef.current = value;
    }
  } else {
    valueRef.current = value;
  }
  
  return valueRef.current;
}

/**
 * Tracks how many times a component has rendered.
 * Useful for debugging render loop issues.
 * 
 * @param label - Optional label for identifying the counter in logs
 * @returns Object containing the render count and a reset function
 * 
 * @example
 * ```tsx
 * const { count, reset } = useRenderCounter('MyComponent');
 * useEffect(() => {
 *   if (count > 10) {
 *     console.warn('MyComponent has rendered many times:', count);
 *   }
 * }, [count]);
 * ```
 */
export function useRenderCounter(label?: string): { count: number; reset: () => void } {
  const countRef = useRef(0);
  const [count, setCount] = useState(0);
  
  const labelPrefix = label ? `[${label}] ` : '';
  
  useEffect(() => {
    countRef.current += 1;
    const newCount = countRef.current;
    setCount(newCount);
    
    if (isDevelopment && newCount > 20) {
      devWarn(`${labelPrefix}Component has rendered ${newCount} times - possible render loop?`);
    }
  });
  
  const reset = useCallback(() => {
    countRef.current = 0;
    setCount(0);
  }, [labelPrefix]);
  
  return { count, reset };
}

/**
 * Creates an effect that only runs after the first render (like componentDidMount).
 * Skips the initial render, similar to how componentDidUpdate works differently.
 * 
 * @param effect - The effect callback to run after mount
 * @param deps - Optional dependency array for the effect
 * 
 * @example
 * ```tsx
 * useEffectAfterMount(() => {
 *   console.log('Component mounted!');
 *   // Setup logic here
 * }, []);
 * ```
 */
export function useEffectAfterMount(effect: EffectCallback, deps?: DependencyList): void {
  const isFirstRenderRef = useRef(true);
  
  if (isDevelopment && deps !== undefined && !Array.isArray(deps)) {
    devWarn('useEffectAfterMount: deps must be an array or undefined');
  }
  
  if (isFirstRenderRef.current) {
    isFirstRenderRef.current = false;
    return;
  }
  
  return useEffect(effect, deps);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a guard that tracks renders and can warn/block excessive renders.
 * Uses external store subscription pattern for React 19 compatibility.
 * 
 * @param options - Configuration options for the render guard
 * @returns RenderGuard instance with track, reset, and getCount methods
 * 
 * @example
 * ```tsx
 * const guard = createRenderGuard({
 *   maxRenders: 10,
 *   timeWindow: 1000,
 *   onExceeded: (count, window) => console.warn('Render limit exceeded!')
 * });
 * 
 * function MyComponent() {
 *   guard.track();
 *   // ... component logic
 * }
 * ```
 */
export function createRenderGuard(options?: RenderGuardOptions): RenderGuard {
  const maxRenders = options?.maxRenders ?? 10;
  const timeWindow = options?.timeWindow ?? 1000;
  const onExceeded = options?.onExceeded;
  
  const renderTimesRef: number[] = [];
  const listeners = new Set<() => void>();
  let lastNotifiedCount = 0;
  
  const notifyListeners = (): void => {
    const currentCount = getCountInternal();
    if (currentCount !== lastNotifiedCount) {
      lastNotifiedCount = currentCount;
      listeners.forEach(listener => listener());
    }
  };
  
  const getCountInternal = (): number => {
    const now = Date.now();
    // Remove old render times outside the window
    while (renderTimesRef.length > 0 && now - renderTimesRef[0] > timeWindow) {
      renderTimesRef.shift();
    }
    return renderTimesRef.length;
  };
  
  const guard: RenderGuard = {
    track: () => {
      const now = Date.now();
      renderTimesRef.push(now);
      
      const count = getCountInternal();
      
      if (count > maxRenders) {
        const message = `Render limit exceeded: ${count} renders in ${timeWindow}ms (max: ${maxRenders})`;
        
        if (isDevelopment) {
          devWarn(message);
        }
        
        if (onExceeded) {
          onExceeded(count, timeWindow);
        }
      }
      
      notifyListeners();
    },
    
    reset: () => {
      renderTimesRef.length = 0;
      lastNotifiedCount = 0;
      notifyListeners();
    },
    
    getCount: () => {
      return getCountInternal();
    },
    
    subscribe: (callback: () => void) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    
    getSnapshot: () => {
      return getCountInternal();
    }
  };
  
  return guard;
}

/**
 * Creates a ref that only updates after a specified delay.
 * Prevents rapid state updates that can cause render loops.
 * 
 * @param initialValue - Initial value for the ref
 * @param delay - Delay in milliseconds before value updates
 * @returns A mutable ref object that updates with delay
 * 
 * @example
 * ```tsx
 * const debouncedValue = debouncedRef('', 300);
 * 
 * function SearchInput() {
 *   const [value, setValue] = useState('');
 *   
 *   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *     debouncedValue.current = e.target.value;
 *     setValue(e.target.value);
 *   };
 *   
 *   useEffect(() => {
 *     // This runs with debounced value
 *     console.log('Search:', debouncedValue.current);
 *   }, [debouncedValue.current]);
 *   
 *   return <input onChange={handleChange} value={value} />;
 * }
 * ```
 */
export function debouncedRef<T>(initialValue: T, delay: number): MutableRefObject<T> {
  const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };
  const valueRef = { current: initialValue } as MutableRefObject<T>;
  
  // Create a proxy to intercept assignments
  const handler: ProxyHandler<MutableRefObject<T>> = {
    set(target, prop, newValue) {
      if (prop === 'current') {
        // Clear existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        // Set new timeout to update actual value
        timeoutRef.current = setTimeout(() => {
          Reflect.set(target, prop, newValue);
        }, delay);
        
        // Immediately update for synchronous reads
        return Reflect.set(target, prop, newValue);
      }
      return Reflect.set(target, prop, newValue);
    }
  };
  
  // Return a proxied ref that delays updates
  return new Proxy(valueRef, handler);
}

/**
 * Performs shallow comparison of two objects/arrays.
 * Useful for useMemo/useCallback dependency comparison.
 * 
 * @param prev - Previous value to compare
 * @param next - Next value to compare
 * @returns True if values are shallowly equal, false otherwise
 * 
 * @example
 * ```tsx
 * const depsChanged = !shallowCompare(prevDeps, newDeps);
 * 
 * const memoizedValue = useMemo(() => {
 *   return expensiveCalculation();
 * }, [shouldRecalculate]); // Instead of passing object directly
 * ```
 */
export function shallowCompare(prev: unknown, next: unknown): boolean {
  // Handle same reference
  if (prev === next) {
    return true;
  }
  
  // Handle null/undefined
  if (prev === null || next === null || prev === undefined || next === undefined) {
    return false;
  }
  
  // Handle primitives
  if (typeof prev !== 'object' || typeof next !== 'object') {
    return prev !== next;
  }
  
  // Handle arrays
  if (Array.isArray(prev) !== Array.isArray(next)) {
    return false;
  }
  
  if (Array.isArray(prev) && Array.isArray(next)) {
    if (prev.length !== next.length) {
      return false;
    }
    
    for (let i = 0; i < prev.length; i++) {
      if (prev[i] !== next[i]) {
        return false;
      }
    }
    
    return true;
  }
  
  // Handle objects
  const prevKeys = Object.keys(prev as object);
  const nextKeys = Object.keys(next as object);
  
  if (prevKeys.length !== nextKeys.length) {
    return false;
  }
  
  for (const key of prevKeys) {
    if ((prev as Record<string, unknown>)[key] !== (next as Record<string, unknown>)[key]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Hook that uses createRenderGuard with React 19's useSyncExternalStore
 * for proper concurrent mode support.
 * 
 * @param options - Configuration options for the render guard
 * @returns RenderGuard instance
 * 
 * @example
 * ```tsx
 * const guard = useRenderGuard({ maxRenders: 10 });
 * 
 * function MyComponent() {
 *   guard.track();
 *   // ... component logic
 * }
 * ```
 */
export function useRenderGuard(options?: RenderGuardOptions): RenderGuard {
  const guard = useMemo(() => createRenderGuard(options), [
    options?.maxRenders,
    options?.timeWindow
  ]);
  
  // Use useSyncExternalStore for React 19 compatibility
  useSyncExternalStore(
    guard.subscribe,
    guard.getSnapshot
  );
  
  return guard;
}

// ============================================================================
// Additional Helper Utilities
// ============================================================================

/**
 * Creates a stable reference that only updates when dependencies actually change.
 * Similar to useMemo but returns a ref instead of a value.
 * 
 * @param factory - Function that produces the value
 * @param deps - Dependency array
 * @returns A ref containing the stable value
 * 
 * @example
 * ```tsx
 * const configRef = useStableRef(() => ({
 *   endpoint: API_URL,
 *   timeout: 5000
 * }), [API_URL]);
 * ```
 */
export function useStableRef<T>(factory: () => T, deps: DependencyList): { current: T } {
  const depsRef = useRef<DependencyList | undefined>(undefined);
  const valueRef = useRef<{ current: T }>({ current: factory() });
  
  if (!shallowCompare(depsRef.current, deps)) {
    depsRef.current = deps;
    valueRef.current.current = factory();
  }
  
  return valueRef.current;
}

/**
 * Creates a debounced callback that delays execution.
 * Useful for preventing rapid-fire event handlers.
 * 
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 * 
 * @example
 * ```tsx
 * const debouncedSearch = useDebouncedCallback((query: string) => {
 *   performSearch(query);
 * }, 300);
 * ```
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

/**
 * Equality check for useMemo dependencies that handles functions properly.
 * 
 * @param oldDeps - Previous dependency array
 * @param newDeps - New dependency array
 * @returns True if dependencies are equal
 * 
 * @example
 * ```tsx
 * const prevDepsRef = useRef(currentDeps);
 * const depsEqual = depsAreEqual(prevDepsRef.current, currentDeps);
 * if (!depsEqual) {
 *   prevDepsRef.current = currentDeps;
 *   // Recalculate value
 * }
 * ```
 */
export function depsAreEqual(oldDeps: DependencyList, newDeps: DependencyList): boolean {
  if (oldDeps.length !== newDeps.length) {
    return false;
  }
  
  for (let i = 0; i < oldDeps.length; i++) {
    if (oldDeps[i] !== newDeps[i]) {
      return false;
    }
  }
  
  return true;
}
