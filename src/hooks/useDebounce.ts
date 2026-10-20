/**
 * useDebounce - Debounce a value or callback
 * 
 * Delays updating a value or executing a callback until after a specified delay
 * has passed since the last change. Useful for search inputs, API calls, etc.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Debounces a value - returns the value after it stops changing for the specified delay
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 * 
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *   
 *   useEffect(() => {
 *     // Only runs 500ms after user stops typing
 *     if (debouncedSearchTerm) {
 *       performSearch(debouncedSearchTerm);
 *     }
 *   }, [debouncedSearchTerm]);
 *   
 *   return (
 *     <input
 *       value={searchTerm}
 *       onChange={(e) => setSearchTerm(e.target.value)}
 *       placeholder="Search..."
 *     />
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Debounce window resize
 * function ResponsiveComponent() {
 *   const [windowWidth, setWindowWidth] = useState(window.innerWidth);
 *   const debouncedWidth = useDebounce(windowWidth, 200);
 *   
 *   useEffect(() => {
 *     const handleResize = () => setWindowWidth(window.innerWidth);
 *     window.addEventListener('resize', handleResize);
 *     return () => window.removeEventListener('resize', handleResize);
 *   }, []);
 *   
 *   // Only recalculates layout 200ms after resize stops
 *   const layout = useMemo(() => calculateLayout(debouncedWidth), [debouncedWidth]);
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    // Set up the timeout
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Clean up the timeout if value changes before delay
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Debounces a callback function
 * 
 * @param callback - The callback to debounce
 * @param delay - Delay in milliseconds
 * @returns A debounced version of the callback
 * 
 * @example
 * ```tsx
 * function AutoSaveForm() {
 *   const [formData, setFormData] = useState({ name: '', email: '' });
 *   
 *   const saveToServer = async (data) => {
 *     await fetch('/api/save', {
 *       method: 'POST',
 *       body: JSON.stringify(data)
 *     });
 *   };
 *   
 *   // Only saves 1 second after user stops typing
 *   const debouncedSave = useDebouncedCallback(saveToServer, 1000);
 *   
 *   const handleChange = (field, value) => {
 *     const newData = { ...formData, [field]: value };
 *     setFormData(newData);
 *     debouncedSave(newData);
 *   };
 *   
 *   return (
 *     <form>
 *       <input
 *         value={formData.name}
 *         onChange={(e) => handleChange('name', e.target.value)}
 *       />
 *       <input
 *         value={formData.email}
 *         onChange={(e) => handleChange('email', e.target.value)}
 *       />
 *     </form>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Debounce API calls
 * function UserSearch() {
 *   const [query, setQuery] = useState('');
 *   const [results, setResults] = useState([]);
 *   
 *   const searchUsers = async (searchQuery: string) => {
 *     const response = await fetch(`/api/users?q=${searchQuery}`);
 *     const data = await response.json();
 *     setResults(data);
 *   };
 *   
 *   const debouncedSearch = useDebouncedCallback(searchUsers, 300);
 *   
 *   const handleSearch = (value: string) => {
 *     setQuery(value);
 *     if (value.length >= 3) {
 *       debouncedSearch(value);
 *     }
 *   };
 *   
 *   return (
 *     <>
 *       <input value={query} onChange={(e) => handleSearch(e.target.value)} />
 *       <ul>{results.map(user => <li key={user.id}>{user.name}</li>)}</ul>
 *     </>
 *   );
 * }
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const callbackRef = useRef<T>(callback);
  
  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * Advanced debounce with leading and trailing edge options
 * 
 * @param callback - The callback to debounce
 * @param delay - Delay in milliseconds
 * @param options - Configuration options
 * @returns A debounced version of the callback
 * 
 * @example
 * ```tsx
 * // Execute immediately on first call, then debounce
 * const debouncedSave = useDebouncedCallbackAdvanced(
 *   saveData,
 *   1000,
 *   { leading: true, trailing: false }
 * );
 * ```
 */
export function useDebouncedCallbackAdvanced<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
  } = {}
): (...args: Parameters<T>) => void {
  const { leading = false, trailing = true } = options;
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const callbackRef = useRef<T>(callback);
  const lastCallTimeRef = useRef<number>(0);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTimeRef.current;
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Leading edge execution
      if (leading && timeSinceLastCall >= delay) {
        lastCallTimeRef.current = now;
        callbackRef.current(...args);
      }
      
      // Trailing edge execution
      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          lastCallTimeRef.current = Date.now();
          callbackRef.current(...args);
        }, delay);
      }
    },
    [delay, leading, trailing]
  );
}

export default useDebounce;
