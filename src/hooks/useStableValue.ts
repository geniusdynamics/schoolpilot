/**
 * useStableValue - Creates a stable reference for objects/arrays
 * 
 * This hook prevents unnecessary re-renders by maintaining a stable reference
 * to an object or array when its contents haven't actually changed.
 * 
 * Uses deep equality comparison to determine if the value has changed.
 */

import { useRef } from 'react';

/**
 * Deep equality comparison for objects and arrays
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }
  
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }
  
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * Shallow equality comparison (faster, use when deep comparison not needed)
 */
function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }
  
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }
  
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key) || a[key] !== b[key]) return false;
  }
  
  return true;
}

/**
 * Creates a stable reference for an object or array
 * 
 * @param value - The value to stabilize
 * @param shallow - Use shallow comparison instead of deep (default: false)
 * @returns A stable reference to the value
 * 
 * @example
 * ```tsx
 * function MyComponent({ filters }) {
 *   // Without useStableValue: new object every render
 *   const config = { endpoint: '/api/data', filters };
 *   
 *   // With useStableValue: stable reference when contents unchanged
 *   const stableConfig = useStableValue({ endpoint: '/api/data', filters });
 *   
 *   useEffect(() => {
 *     fetchData(stableConfig);
 *   }, [stableConfig]); // Only re-fetches when config actually changes
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Stabilize array dependencies
 * function StudentList({ studentIds }) {
 *   const stableIds = useStableValue(studentIds);
 *   
 *   useEffect(() => {
 *     // Only runs when studentIds contents change, not reference
 *     loadStudents(stableIds);
 *   }, [stableIds]);
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Shallow comparison for performance
 * function MyComponent({ options }) {
 *   // Use shallow when you know nested objects won't change
 *   const stableOptions = useStableValue(options, true);
 *   
 *   useEffect(() => {
 *     configure(stableOptions);
 *   }, [stableOptions]);
 * }
 * ```
 */
export function useStableValue<T>(value: T, shallow: boolean = false): T {
  const ref = useRef<T>(value);
  
  // Compare current value with stored value
  const isEqual = shallow 
    ? shallowEqual(ref.current, value)
    : deepEqual(ref.current, value);
  
  // Only update if value actually changed
  if (!isEqual) {
    ref.current = value;
  }
  
  return ref.current;
}

/**
 * Shallow version of useStableValue for better performance
 * Use when you only need to compare top-level properties
 */
export function useStableValueShallow<T>(value: T): T {
  return useStableValue(value, true);
}

export default useStableValue;
