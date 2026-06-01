/**
 * useStableCallback - Creates a stable callback reference
 * 
 * This hook ensures that a callback maintains a stable reference across renders,
 * preventing unnecessary re-renders of child components and avoiding infinite loops
 * when the callback is used in dependency arrays.
 * 
 * The callback always calls the latest version, but the reference stays the same.
 */

import { useRef, useEffect, useCallback } from 'react';

/**
 * Creates a stable callback that always calls the latest version
 * 
 * @param callback - The callback function to stabilize
 * @returns A stable callback reference that won't change between renders
 * 
 * @example
 * ```tsx
 * function MyComponent({ onUpdate }) {
 *   // Without useStableCallback: onUpdate changes every render
 *   // With useStableCallback: stable reference, always calls latest onUpdate
 *   const stableOnUpdate = useStableCallback(onUpdate);
 *   
 *   useEffect(() => {
 *     // This effect won't re-run when onUpdate changes
 *     window.addEventListener('change', stableOnUpdate);
 *     return () => window.removeEventListener('change', stableOnUpdate);
 *   }, [stableOnUpdate]); // Safe: stableOnUpdate never changes
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Prevent child re-renders
 * function Parent() {
 *   const [count, setCount] = useState(0);
 *   
 *   // This callback changes every render (new reference)
 *   const handleClick = () => console.log(count);
 *   
 *   // This callback has stable reference
 *   const stableHandleClick = useStableCallback(() => console.log(count));
 *   
 *   return (
 *     <>
 *       <button onClick={() => setCount(c => c + 1)}>Increment</button>
 *       <ExpensiveChild onClick={handleClick} />
 *       <ExpensiveChild onClick={stableHandleClick} />
 *     </>
 *   );
 * }
 * ```
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  // Store the latest callback in a ref
  const callbackRef = useRef<T>(callback);
  
  // Update the ref whenever callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Return a memoized callback that calls the latest version
  return useCallback(
    ((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }) as T,
    [] // Empty deps - this callback never changes
  );
}

export default useStableCallback;
