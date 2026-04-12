# Immediate Action Plan - Fix Infinite Loop Issues Properly

> **Priority**: 🔴 High  
> **Timeline**: 6 weeks  
> **Effort**: Medium (systematic approach)

---

## 🎯 Executive Summary

Current state: 187 files modified with unused imports that provide no actual protection.

Solution: Remove hacky code and fix root causes using proper React patterns.

---

## 📅 Week-by-Week Plan

### Week 1: Cleanup & Assessment

#### Day 1-2: Revert Unused Imports
```bash
# Create a script to remove unused imports
cat > scripts/remove-unused-imports.sh << 'EOF'
#!/bin/bash
# Remove unused infiniteLoopPrevention imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '/import.*infiniteLoopPrevention/d' {} \;
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '/import.*renderLoopPrevention/d' {} \;
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '/import.*globalInfiniteLoopProtection/d' {} \;
EOF

chmod +x scripts/remove-unused-imports.sh
./scripts/remove-unused-imports.sh
```

#### Day 3: Delete Hacky Files
```bash
# Remove non-functional utilities
rm src/utils/infiniteLoopPrevention.ts
rm src/utils/globalInfiniteLoopProtection.ts
rm src/components/SafeEffectWrapper.tsx
rm scripts/audit-infinite-loops.cjs
rm scripts/auto-fix-infinite-loops.cjs
rm scripts/fix-render-monitor-imports.cjs
rm src/tests/InfiniteLoopPrevention.test.ts
rm -rf src/examples/

# Keep only essential utilities
# src/utils/renderLoopPrevention.ts - simplify to just shallowCompare
```

#### Day 4-5: Identify Actual Problems
```bash
# Use ESLint to find real issues
npx eslint src --ext .ts,.tsx --rule 'react-hooks/exhaustive-deps: error' > lint-report.txt

# Manual review of common patterns:
# 1. Context providers without memoized values
# 2. Data hooks with unstable dependencies
# 3. Effects with state updates
# 4. Missing cleanup functions
```

---

### Week 2: Fix Context Providers

#### Target: ~10 context files

**Pattern to Fix**:
```typescript
// BEFORE (causes all consumers to re-render)
export function MyProvider({ children }) {
  const [state, setState] = useState(initial);
  return (
    <Context.Provider value={{ state, setState }}>
      {children}
    </Context.Provider>
  );
}

// AFTER (stable value)
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

**Files to Fix**:
- `src/contexts/UnifiedConfigContext.tsx`
- `src/contexts/AppDataContext.tsx`
- All other context providers

---

### Week 3: Create Data Fetching Abstraction

#### Create `src/hooks/useDataFetch.ts`

```typescript
import { useState, useEffect, useMemo } from 'react';

export interface UseDataFetchOptions<T> extends RequestInit {
  initialData?: T;
  skip?: boolean;
}

export function useDataFetch<T>(
  endpoint: string,
  options?: UseDataFetchOptions<T>
) {
  const [data, setData] = useState<T | null>(options?.initialData ?? null);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<Error | null>(null);
  
  // Memoize options to prevent re-fetching
  const stableOptions = useMemo(
    () => {
      const { initialData, skip, ...fetchOptions } = options ?? {};
      return fetchOptions;
    },
    [JSON.stringify(options)]
  );
  
  useEffect(() => {
    if (options?.skip) return;
    
    let cancelled = false;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(endpoint, stableOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const json = await response.json();
        
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, [endpoint, stableOptions, options?.skip]);
  
  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    // Trigger re-fetch by updating a dependency
  }, [endpoint, stableOptions]);
  
  return { data, loading, error, refetch };
}
```

#### Refactor Data Hooks

**Target**: ~50 data hooks in `src/modules/*/data/`

```typescript
// BEFORE
export function useStudentsData() {
  const [data, setData] = useState([]);
  const config = { endpoint: '/api/students' }; // NEW EVERY RENDER!
  
  useEffect(() => {
    fetch(config.endpoint)
      .then(res => res.json())
      .then(setData);
  }, [config]); // INFINITE LOOP!
  
  return { data };
}

// AFTER
export function useStudentsData() {
  return useDataFetch<Student[]>('/api/students');
}
```

---

### Week 4: Fix Component Patterns

#### Pattern 1: Derived State

**Target**: ~20 components

```typescript
// BEFORE (effect with state update)
function StudentList({ students }) {
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [filter, setFilter] = useState('');
  
  useEffect(() => {
    setFilteredStudents(
      students.filter(s => s.name.includes(filter))
    );
  }, [students, filter]); // State update in effect!
  
  return <div>{filteredStudents.map(...)}</div>;
}

// AFTER (useMemo)
function StudentList({ students }) {
  const [filter, setFilter] = useState('');
  
  const filteredStudents = useMemo(
    () => students.filter(s => s.name.includes(filter)),
    [students, filter]
  );
  
  return <div>{filteredStudents.map(...)}</div>;
}
```

#### Pattern 2: Event Handlers

**Target**: ~30 hooks

```typescript
// BEFORE (function in deps)
function useKeyboardShortcut(key: string, callback: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === key) callback();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback]); // callback is new every render!
}

// AFTER (ref for callback)
function useKeyboardShortcut(key: string, callback: () => void) {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === key) callbackRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key]); // Only key in deps
}
```

---

### Week 5: Create Proper Abstractions

#### Create `src/hooks/useStableCallback.ts`

```typescript
import { useRef, useEffect, useCallback } from 'react';

export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback(
    (...args: Parameters<T>) => callbackRef.current(...args),
    []
  ) as T;
}
```

#### Create `src/hooks/useStableValue.ts`

```typescript
import { useRef } from 'react';
import { isEqual } from 'lodash-es'; // or implement own deep equality

export function useStableValue<T>(value: T): T {
  const ref = useRef<T>(value);
  
  if (!isEqual(ref.current, value)) {
    ref.current = value;
  }
  
  return ref.current;
}
```

#### Create `src/hooks/useDebounce.ts`

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}
```

---

### Week 6: Tools & Documentation

#### Day 1-2: ESLint Configuration

```javascript
// eslint.config.js
export default [
  {
    rules: {
      // Enforce exhaustive deps
      'react-hooks/exhaustive-deps': 'error',
      
      // Warn on missing deps
      'react-hooks/rules-of-hooks': 'error',
    }
  }
];
```

#### Day 3: Development Debug Utility

```typescript
// src/utils/debug.ts
export function useRenderCount(componentName: string) {
  if (process.env.NODE_ENV !== 'development') return;
  
  const count = useRef(0);
  count.current++;
  
  useEffect(() => {
    if (count.current > 10) {
      console.warn(
        `[RenderCount] ${componentName} rendered ${count.current} times`
      );
    }
  });
}
```

#### Day 4-5: Documentation

Create:
- `docs/guides/REACT_BEST_PRACTICES.md`
- `docs/guides/HOOK_PATTERNS.md`
- `docs/guides/PREVENTING_INFINITE_LOOPS.md`

---

## 🎯 Success Criteria

### Week 1
- [ ] All unused imports removed
- [ ] Hacky utility files deleted
- [ ] Actual problems identified

### Week 2
- [ ] All context providers memoize values
- [ ] No more unnecessary consumer re-renders

### Week 3
- [ ] `useDataFetch` abstraction created
- [ ] 50% of data hooks refactored

### Week 4
- [ ] All derived state uses `useMemo`
- [ ] All event handlers use refs
- [ ] All effects have cleanup

### Week 5
- [ ] Stable callback/value utilities created
- [ ] Debounce utility created
- [ ] Documentation for each

### Week 6
- [ ] ESLint rules enforced
- [ ] Debug utilities available
- [ ] Team trained
- [ ] Documentation complete

---

## 📊 Tracking Progress

### Daily Standup Questions
1. How many files fixed today?
2. Any new patterns discovered?
3. Any blockers?

### Weekly Review
1. Success criteria met?
2. Any issues found?
3. Adjust plan if needed

---

## 🚨 Red Flags

Watch out for:
- Temptation to add "just one more wrapper"
- Skipping proper fixes for quick band-aids
- Not understanding why a fix works
- Copy-pasting without understanding

---

## ✅ Definition of Done

A file is "done" when:
1. No unused imports
2. All dependencies stable
3. All effects have cleanup
4. Derived state uses `useMemo`
5. ESLint passes
6. No console warnings in dev

---

## 📚 Resources for Team

- [React Hooks Docs](https://react.dev/reference/react)
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [useEffect Guide](https://react.dev/reference/react/useEffect)
- [React DevTools](https://react.dev/learn/react-developer-tools)

---

**Start Date**: Monday, Week 1  
**End Date**: Friday, Week 6  
**Review**: Weekly on Fridays
