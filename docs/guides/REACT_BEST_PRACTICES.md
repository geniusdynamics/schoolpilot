# React Best Practices - Preventing Infinite Loops

> **Last Updated**: April 12, 2026  
> **Audience**: All developers working on the codebase

---

## Table of Contents

1. [Overview](#overview)
2. [Common Causes of Infinite Loops](#common-causes)
3. [Best Practices](#best-practices)
4. [Using Our Utility Hooks](#utility-hooks)
5. [ESLint Rules](#eslint-rules)
6. [Debug Tools](#debug-tools)
7. [Code Review Checklist](#code-review-checklist)

---

## Overview

Infinite loops in React are typically caused by:
- Unstable dependencies in useEffect
- Objects/arrays recreated on every render
- State updates that trigger the same effect
- Missing or incorrect dependency arrays

This guide shows you how to avoid these issues using proper React patterns and our custom utility hooks.

---

## Common Causes of Infinite Loops

### 1. Object/Array in Dependencies ❌

```tsx
// BAD: New object every render
function MyComponent({ userId }) {
  const config = { endpoint: '/api/user', userId }; // NEW OBJECT!
  
  useEffect(() => {
    fetchData(config);
  }, [config]); // INFINITE LOOP!
}
```

**Solution**: Use `useStableValue` or `useMemo`

```tsx
// GOOD: Stable reference
import { useStableValue } from '@/hooks/useStableValue';

function MyComponent({ userId }) {
  const config = useStableValue({ endpoint: '/api/user', userId });
  
  useEffect(() => {
    fetchData(config);
  }, [config]); // Only changes when contents change
}
```

### 2. Function in Dependencies ❌

```tsx
// BAD: New function every render
function MyComponent({ onUpdate }) {
  useEffect(() => {
    window.addEventListener('change', onUpdate);
    return () => window.removeEventListener('change', onUpdate);
  }, [onUpdate]); // onUpdate changes = effect re-runs = memory leak
}
```

**Solution**: Use `useStableCallback`

```tsx
// GOOD: Stable reference
import { useStableCallback } from '@/hooks/useStableCallback';

function MyComponent({ onUpdate }) {
  const stableOnUpdate = useStableCallback(onUpdate);
  
  useEffect(() => {
    window.addEventListener('change', stableOnUpdate);
    return () => window.removeEventListener('change', stableOnUpdate);
  }, [stableOnUpdate]); // Never changes
}
```

### 3. Effect Updates State That Triggers Effect ❌

```tsx
// BAD: Effect updates state that triggers effect
function MyComponent({ data }) {
  const [filtered, setFiltered] = useState([]);
  
  useEffect(() => {
    setFiltered(data.filter(item => item.active));
  }, [data, filtered]); // INFINITE LOOP!
}
```

**Solution**: Use `useMemo` for derived state

```tsx
// GOOD: Derived state
function MyComponent({ data }) {
  const filtered = useMemo(
    () => data.filter(item => item.active),
    [data]
  );
  
  return <div>{filtered.map(...)}</div>;
}
```

### 4. Unnecessary useEffect ❌

```tsx
// BAD: useEffect when you can call directly
function ReportPage() {
  const handleGenerate = useCallback(() => {
    setReportData(filteredData);
  }, [filteredData]);
  
  useEffect(() => {
    handleGenerate();
  }, [handleGenerate]); // Unnecessary effect
}
```

**Solution**: Call function directly

```tsx
// GOOD: Direct function call
function ReportPage() {
  const handleGenerate = useCallback(() => {
    setReportData(filteredData);
  }, [filteredData]);
  
  // Call on mount only
  useEffect(() => {
    handleGenerate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Call on button click
  return <Button onClick={handleGenerate}>Generate</Button>;
}
```

---

## Best Practices

### 1. Memoize Context Values

```tsx
// BAD: New object every render
export function MyProvider({ children }) {
  const [state, setState] = useState(initial);
  
  return (
    <Context.Provider value={{ state, setState }}>
      {children}
    </Context.Provider>
  );
}

// GOOD: Memoized value
export function MyProvider({ children }) {
  const [state, setState] = useState(initial);
  
  const value = useMemo(() => ({ state, setState }), [state]);
  
  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  );
}
```

### 2. Use Proper Dependency Arrays

```tsx
// BAD: Missing dependencies
useEffect(() => {
  fetchData(userId);
}, []); // userId not in deps!

// GOOD: All dependencies included
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

### 3. Use Cleanup Functions

```tsx
// BAD: No cleanup
useEffect(() => {
  const timer = setInterval(() => {
    doSomething();
  }, 1000);
}, []);

// GOOD: Cleanup on unmount
useEffect(() => {
  const timer = setInterval(() => {
    doSomething();
  }, 1000);
  
  return () => clearInterval(timer);
}, []);
```

### 4. Avoid Derived State in Effects

```tsx
// BAD: Effect for derived state
const [fullName, setFullName] = useState('');

useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// GOOD: useMemo for derived state
const fullName = useMemo(
  () => `${firstName} ${lastName}`,
  [firstName, lastName]
);
```

---

## Using Our Utility Hooks

### useStableCallback

**When to use**: Callbacks in dependency arrays, event listeners, props to memoized children

```tsx
import { useStableCallback } from '@/hooks/useStableCallback';

function MyComponent({ onSave }) {
  const stableOnSave = useStableCallback(onSave);
  
  useEffect(() => {
    // Setup with stable callback
    window.addEventListener('beforeunload', stableOnSave);
    return () => window.removeEventListener('beforeunload', stableOnSave);
  }, [stableOnSave]);
}
```

### useStableValue

**When to use**: Objects/arrays in dependency arrays

```tsx
import { useStableValue } from '@/hooks/useStableValue';

function MyComponent({ filters }) {
  const stableFilters = useStableValue(filters);
  
  useEffect(() => {
    fetchData(stableFilters);
  }, [stableFilters]); // Only changes when contents change
}
```

### useDebounce

**When to use**: Search inputs, auto-save, frequent updates

```tsx
import { useDebounce } from '@/hooks/useDebounce';

function SearchInput() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  useEffect(() => {
    // Only runs 500ms after user stops typing
    performSearch(debouncedSearch);
  }, [debouncedSearch]);
}
```

### useDataFetch

**When to use**: API calls, data fetching

```tsx
import { useDataFetch } from '@/hooks/useDataFetch';

function UserProfile({ userId }) {
  const { data, loading, error } = useDataFetch(`/api/users/${userId}`);
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return <div>{data.name}</div>;
}
```

---

## ESLint Rules

We enforce these rules to prevent infinite loops:

### react-hooks/exhaustive-deps (error)

Ensures all dependencies are included in dependency arrays.

```tsx
// ❌ ESLint Error
useEffect(() => {
  fetchData(userId);
}, []); // Missing dependency: userId

// ✅ Correct
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

### react-hooks/rules-of-hooks (error)

Ensures hooks are called in the correct order and location.

```tsx
// ❌ ESLint Error
if (condition) {
  useEffect(() => {}, []); // Conditional hook call
}

// ✅ Correct
useEffect(() => {
  if (condition) {
    // Logic inside effect
  }
}, [condition]);
```

---

## Debug Tools

### useRenderCount

Monitor component render count in development:

```tsx
import { useRenderCount } from '@/utils/debug/renderMonitor';

function MyComponent() {
  useRenderCount('MyComponent', 10); // Warn after 10 renders
  
  return <div>...</div>;
}
```

### useWhyDidYouUpdate

See what props changed to cause a re-render:

```tsx
import { useWhyDidYouUpdate } from '@/utils/debug/renderMonitor';

function MyComponent(props) {
  useWhyDidYouUpdate('MyComponent', props);
  
  return <div>...</div>;
}
```

### React DevTools Profiler

1. Open React DevTools
2. Go to Profiler tab
3. Click record
4. Interact with your app
5. Stop recording
6. Analyze render times and counts

---

## Code Review Checklist

When reviewing code, check for:

### useEffect
- [ ] All dependencies are in the dependency array
- [ ] No objects/arrays created inline in dependencies
- [ ] No functions created inline in dependencies
- [ ] Cleanup function provided when needed
- [ ] Effect doesn't update state that triggers the same effect
- [ ] Effect is actually needed (can it be a direct call?)

### Context Providers
- [ ] Context value is memoized with useMemo
- [ ] Dependencies for useMemo are correct
- [ ] Provider doesn't cause unnecessary re-renders

### Custom Hooks
- [ ] Dependencies are stable (use useStableValue/useStableCallback)
- [ ] Cleanup functions provided
- [ ] No infinite loop potential

### Performance
- [ ] Expensive computations use useMemo
- [ ] Callbacks use useCallback when passed to children
- [ ] Components use React.memo when appropriate

---

## Quick Reference

### When to Use What

| Scenario | Solution |
|----------|----------|
| Object in dependencies | `useStableValue` or `useMemo` |
| Array in dependencies | `useStableValue` or `useMemo` |
| Function in dependencies | `useStableCallback` or `useCallback` |
| Derived state | `useMemo` (not useEffect) |
| Search input | `useDebounce` |
| API calls | `useDataFetch` |
| Event listeners | `useStableCallback` + cleanup |
| Context values | `useMemo` |

### Red Flags

🚩 Object literal in dependency array  
🚩 Array literal in dependency array  
🚩 Function defined in component body used in deps  
🚩 useEffect that calls setState  
🚩 Missing cleanup for subscriptions/timers  
🚩 Context provider without useMemo  
🚩 More than 10 renders on mount  

---

## Getting Help

If you're stuck:

1. Use `useRenderCount` to identify the problem component
2. Use `useWhyDidYouUpdate` to see what's changing
3. Check React DevTools Profiler
4. Review this guide
5. Ask the team in #dev-help

---

## Additional Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [useEffect Guide](https://react.dev/reference/react/useEffect)
- [React DevTools](https://react.dev/learn/react-developer-tools)

---

**Remember**: Fix root causes, not symptoms. Use proper React patterns instead of workarounds.
