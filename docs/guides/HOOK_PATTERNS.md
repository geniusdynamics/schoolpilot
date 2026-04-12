# Hook Patterns Guide

> **Last Updated**: April 12, 2026  
> **Purpose**: Common patterns for using React hooks correctly

---

## Table of Contents

1. [Data Fetching](#data-fetching)
2. [Event Handlers](#event-handlers)
3. [Derived State](#derived-state)
4. [Context Patterns](#context-patterns)
5. [Performance Optimization](#performance-optimization)
6. [Common Mistakes](#common-mistakes)

---

## Data Fetching

### Pattern 1: Simple Data Fetch

```tsx
import { useDataFetch } from '@/hooks/useDataFetch';

function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error, refetch } = useDataFetch<User>(
    `/api/users/${userId}`
  );
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  if (!data) return null;
  
  return (
    <div>
      <h1>{data.name}</h1>
      <Button onClick={refetch}>Refresh</Button>
    </div>
  );
}
```

### Pattern 2: Conditional Fetch

```tsx
function UserProfile({ userId }: { userId?: string }) {
  const { data, loading } = useDataFetch<User>(
    `/api/users/${userId}`,
    {
      skip: !userId, // Don't fetch if no userId
    }
  );
  
  if (!userId) return <div>Select a user</div>;
  if (loading) return <Spinner />;
  
  return <div>{data?.name}</div>;
}
```

### Pattern 3: Fetch with Parameters

```tsx
import { useDataFetchWithParams } from '@/hooks/useDataFetch';

function UserList() {
  const [filters, setFilters] = useState({ role: 'admin', active: true });
  
  const { data, loading } = useDataFetchWithParams<User[]>(
    '/api/users',
    filters
  );
  
  return (
    <div>
      <FilterControls onChange={setFilters} />
      {loading ? <Spinner /> : <UserTable users={data || []} />}
    </div>
  );
}
```

### Pattern 4: Mutations (POST/PUT/DELETE)

```tsx
import { useDataMutation } from '@/hooks/useDataFetch';

function CreateUserForm() {
  const { mutate, loading, error } = useDataMutation<User>('/api/users', {
    method: 'POST',
    onSuccess: (user) => {
      console.log('User created:', user);
      navigate(`/users/${user.id}`);
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    }
  });
  
  const handleSubmit = (formData: UserFormData) => {
    mutate(formData);
  };
  
  return <UserForm onSubmit={handleSubmit} loading={loading} error={error} />;
}
```

---

## Event Handlers

### Pattern 1: Stable Event Handler

```tsx
import { useStableCallback } from '@/hooks/useStableCallback';

function MyComponent({ onSave }: { onSave: (data: Data) => void }) {
  const stableOnSave = useStableCallback(onSave);
  
  useEffect(() => {
    // Event listener with stable callback
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        stableOnSave(currentData);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [stableOnSave, hasUnsavedChanges, currentData]);
}
```

### Pattern 2: Keyboard Shortcuts

```tsx
import { useStableCallback } from '@/hooks/useStableCallback';

function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean }
) {
  const stableCallback = useStableCallback(callback);
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== key) return;
      if (modifiers?.ctrl && !e.ctrlKey) return;
      if (modifiers?.shift && !e.shiftKey) return;
      if (modifiers?.alt && !e.altKey) return;
      
      e.preventDefault();
      stableCallback();
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, modifiers?.ctrl, modifiers?.shift, modifiers?.alt, stableCallback]);
}

// Usage
function MyComponent() {
  useKeyboardShortcut('s', handleSave, { ctrl: true });
  useKeyboardShortcut('Escape', handleCancel);
}
```

### Pattern 3: Debounced Handler

```tsx
import { useDebouncedCallback } from '@/hooks/useDebounce';

function SearchInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const searchAPI = async (searchQuery: string) => {
    const response = await fetch(`/api/search?q=${searchQuery}`);
    const data = await response.json();
    setResults(data);
  };
  
  const debouncedSearch = useDebouncedCallback(searchAPI, 300);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length >= 3) {
      debouncedSearch(value);
    }
  };
  
  return (
    <div>
      <input value={query} onChange={handleChange} />
      <SearchResults results={results} />
    </div>
  );
}
```

---

## Derived State

### Pattern 1: Simple Derived State

```tsx
// ❌ BAD: Effect for derived state
function UserList({ users }: { users: User[] }) {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  
  useEffect(() => {
    setActiveUsers(users.filter(u => u.active));
  }, [users]);
  
  return <div>{activeUsers.map(...)}</div>;
}

// ✅ GOOD: useMemo for derived state
function UserList({ users }: { users: User[] }) {
  const activeUsers = useMemo(
    () => users.filter(u => u.active),
    [users]
  );
  
  return <div>{activeUsers.map(...)}</div>;
}
```

### Pattern 2: Complex Derived State

```tsx
function StudentReport({ students, grades }: Props) {
  const report = useMemo(() => {
    return students.map(student => {
      const studentGrades = grades.filter(g => g.studentId === student.id);
      const average = studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length;
      
      return {
        studentId: student.id,
        studentName: student.name,
        average,
        grade: calculateLetterGrade(average),
        totalGrades: studentGrades.length
      };
    });
  }, [students, grades]);
  
  return <ReportTable data={report} />;
}
```

### Pattern 3: Filtered and Sorted Data

```tsx
function DataTable({ data, filters, sortBy }: Props) {
  const processedData = useMemo(() => {
    let result = [...data];
    
    // Apply filters
    if (filters.status) {
      result = result.filter(item => item.status === filters.status);
    }
    if (filters.category) {
      result = result.filter(item => item.category === filters.category);
    }
    
    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        const aVal = a[sortBy.field];
        const bVal = b[sortBy.field];
        return sortBy.direction === 'asc' 
          ? aVal > bVal ? 1 : -1
          : aVal < bVal ? 1 : -1;
      });
    }
    
    return result;
  }, [data, filters, sortBy]);
  
  return <Table data={processedData} />;
}
```

---

## Context Patterns

### Pattern 1: Memoized Context Value

```tsx
import { createContext, useContext, useMemo, useState, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // ✅ Memoize the context value
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### Pattern 2: Context with Complex State

```tsx
interface AppState {
  user: User | null;
  settings: Settings;
  notifications: Notification[];
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // ✅ Memoize the entire context value
  const value = useMemo(() => ({
    user,
    setUser,
    settings,
    setSettings,
    notifications,
    setNotifications
  }), [user, settings, notifications]);
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
```

### Pattern 3: Split Contexts for Performance

```tsx
// Instead of one large context, split into focused contexts

// User context (changes rarely)
const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const value = useMemo(() => ({ user, setUser }), [user]);
  
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// UI context (changes frequently)
const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const value = useMemo(() => ({ sidebarOpen, setSidebarOpen, theme, setTheme }), [sidebarOpen, theme]);
  
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

// Components only re-render when their specific context changes
```

---

## Performance Optimization

### Pattern 1: Memoized Component

```tsx
import { memo } from 'react';

interface Props {
  user: User;
  onUpdate: (user: User) => void;
}

// ✅ Memoize component to prevent unnecessary re-renders
export const UserCard = memo(function UserCard({ user, onUpdate }: Props) {
  return (
    <div>
      <h3>{user.name}</h3>
      <Button onClick={() => onUpdate(user)}>Update</Button>
    </div>
  );
});
```

### Pattern 2: Stable Props

```tsx
import { useStableCallback } from '@/hooks/useStableCallback';

function ParentComponent() {
  const [users, setUsers] = useState<User[]>([]);
  
  // ❌ BAD: New function every render
  const handleUpdate = (user: User) => {
    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
  };
  
  // ✅ GOOD: Stable callback
  const stableHandleUpdate = useStableCallback((user: User) => {
    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
  });
  
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} onUpdate={stableHandleUpdate} />
      ))}
    </div>
  );
}
```

### Pattern 3: Virtualized Lists

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function LargeList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  
  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ItemRow item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Common Mistakes

### Mistake 1: Inline Object in Dependencies

```tsx
// ❌ BAD
useEffect(() => {
  fetchData({ userId, filters });
}, [{ userId, filters }]); // New object every render!

// ✅ GOOD
import { useStableValue } from '@/hooks/useStableValue';

const params = useStableValue({ userId, filters });
useEffect(() => {
  fetchData(params);
}, [params]);
```

### Mistake 2: Missing Cleanup

```tsx
// ❌ BAD
useEffect(() => {
  const timer = setInterval(() => {
    checkStatus();
  }, 5000);
}, []);

// ✅ GOOD
useEffect(() => {
  const timer = setInterval(() => {
    checkStatus();
  }, 5000);
  
  return () => clearInterval(timer);
}, []);
```

### Mistake 3: Stale Closure

```tsx
// ❌ BAD
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(count + 1); // Stale closure - always uses initial count
    }, 1000);
    
    return () => clearInterval(timer);
  }, []); // Empty deps - count never updates
}

// ✅ GOOD
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + 1); // Functional update - always current
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
}
```

### Mistake 4: Effect for Event Handler

```tsx
// ❌ BAD
function MyComponent() {
  const [value, setValue] = useState('');
  
  useEffect(() => {
    if (value.length > 10) {
      alert('Too long!');
    }
  }, [value]);
}

// ✅ GOOD
function MyComponent() {
  const [value, setValue] = useState('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    if (newValue.length > 10) {
      alert('Too long!');
    }
  };
  
  return <input value={value} onChange={handleChange} />;
}
```

---

## Summary

### Key Takeaways

1. Use `useDataFetch` for API calls
2. Use `useStableCallback` for callbacks in dependencies
3. Use `useStableValue` for objects/arrays in dependencies
4. Use `useMemo` for derived state (not useEffect)
5. Use `useDebounce` for frequent updates
6. Always memoize context values
7. Always provide cleanup functions
8. Use functional updates for state based on previous state

### Quick Decision Tree

```
Need to fetch data?
  → useDataFetch

Need stable callback reference?
  → useStableCallback

Need stable object/array reference?
  → useStableValue

Need to compute derived state?
  → useMemo

Need to delay execution?
  → useDebounce

Need to optimize expensive computation?
  → useMemo

Need to optimize callback?
  → useCallback or useStableCallback

Need to prevent child re-renders?
  → React.memo + stable props
```

---

**Remember**: These patterns prevent 90% of infinite loop issues. Use them consistently!
