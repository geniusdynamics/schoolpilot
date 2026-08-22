
/**
 * Previous Hook
 * 
 * Track the previous value of a state or prop.
 */

import { useRef, useEffect } from 'react';

/**
 * Hook to get the previous value
 * 
 * @example
 * ```tsx
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 * 
 * useEffect(() => {
 *   logger.info(`Count changed from ${prevCount} to ${count}`);
 * }, [count]);
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export default usePrevious;
