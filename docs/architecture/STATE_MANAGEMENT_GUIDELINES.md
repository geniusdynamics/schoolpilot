# State Management Guidelines

## Overview

This document establishes clear guidelines for choosing the appropriate state management approach in our React application. The project uses a combination of Zustand stores, React Context API, component state (`useState`), and `useReducer` - each with specific use cases.

### Quick Reference

| Pattern | Use When |
|---------|----------|
| **Zustand Store** | Global state, multiple components need access, complex state logic |
| **React Context** | Provider/consumer pattern, theme, RBAC, avoiding prop drilling |
| **useState** | Local UI state, form state, toggles, modals |
| **useReducer** | Complex state transitions, multiple sub-values, predictable state changes |

---

## Zustand Store Guidelines

### When to Create a Zustand Store

Use Zustand when you need:

- **Global application state** - State that needs to be accessible from anywhere in the application
- **Multiple components need access** - Two or more components at different levels need to read/write the same state
- **Complex state with many actions** - State that requires multiple actions/operations
- **Persistence needed** - State that should survive page refreshes (using persist middleware)
- **Performance optimization** - When you want to avoid re-rendering consumers on every state change

### Store Structure Conventions

```typescript
// stores/tabStore.ts - Example from our codebase
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Tab, TabState, TabStore, TabContent } from '../types/tabbedWorkspace';

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  
  // Actions
  addTab: (tab: Tab) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
}

export const useTabStore = create<TabStore>()(
  persist(
    immer((set) => ({
      tabs: [],
      activeTabId: null,
      
      addTab: (tab) => set((state) => {
        state.tabs.push(tab);
      }),
      
      removeTab: (tabId) => set((state) => {
        const index = state.tabs.findIndex(t => t.id === tabId);
        if (index !== -1) state.tabs.splice(index, 1);
      }),
      
      setActiveTab: (tabId) => set((state) => {
        state.activeTabId = tabId;
      }),
      
      updateTab: (tabId, updates) => set((state) => {
        const tab = state.tabs.find(t => t.id === tabId);
        if (tab) Object.assign(tab, updates);
      }),
    })),
    {
      name: 'tab-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### Best Practices for Zustand Stores

1. **Use TypeScript interfaces** - Define clear types for store state and actions
2. **Keep stores focused** - Each store should manage one domain (tabs, user, theme)
3. **Use immer middleware** - Allows mutable-style updates in reducers
4. **Use persist middleware** - For state that needs to survive refreshes
5. **Name exports consistently** - Use `useXxxStore` pattern (e.g., `useTabStore`)

### When NOT to Use Zustand

- Local UI state that only one component needs
- Simple boolean toggles
- Form state (use `useState` or `useReducer` instead)
- Theme-only state (consider Context)

---

## Context API Guidelines

### When to Use React Context

Use React Context when you need:

- **Provider/consumer pattern** - Multiple components need to consume provider values
- **Component tree propagation** - Data needs to pass through multiple levels
- **Theme/contextual data** - Theme settings, language preferences
- **RBAC (Role-Based Access Control)** - User permissions and roles
- **Avoid prop drilling** - When passing props through 2-3+ levels becomes cumbersome

### Context Splitting Pattern

For frequently changing state, split contexts to prevent unnecessary re-renders:

```typescript
// contexts/ThemeContext.tsx - Good example
import React, { createContext, useContext, useState, useMemo } from 'react';

// Static context (rarely changes)
const ThemeConfigContext = createContext<ThemeConfig | null>(null);

// Dynamic context (changes frequently)
const ThemeStateContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#007bff');
  
  // Memoize config to prevent re-renders when only state changes
  const config = useMemo(() => ({
    fonts: { primary: 'Inter', secondary: 'Roboto' },
    spacing: { unit: 8 },
  }), []);
  
  const state = useMemo(() => ({ isDark, primaryColor }), [isDark, primaryColor]);
  
  return (
    <ThemeConfigContext.Provider value={config}>
      <ThemeStateContext.Provider value={state}>
        {children}
      </ThemeStateContext.Provider>
    </ThemeConfigContext.Provider>
  );
}

export const useThemeConfig = () => {
  const context = useContext(ThemeConfigContext);
  if (!context) throw new Error('useThemeConfig must be used within ThemeProvider');
  return context;
};

export const useThemeState = () => {
  const context = useContext(ThemeStateContext);
  if (!context) throw new Error('useThemeState must be used within ThemeProvider');
  return context;
};
```

### Examples from Our Codebase

- **I18nContext** (`src/i18n/I18nProvider.tsx`) - Internationalization/translations
- **PluginsContext** (`src/plugins/PluginsProvider.tsx`) - Plugin management
- **AppDataContext** (`src/contexts/AppDataContext.tsx`) - Application-wide data
- **UnifiedConfigContext** (`src/contexts/UnifiedConfigContext.tsx`) - Configuration
- **RBACContext** - Role-based access control (see `docs/guides/RBAC_IMPLEMENTATION_GUIDE.md`)

### When NOT to Use Context

- **Frequently updating state** - Context re-renders all consumers on every change
- **Global state with many actions** - Use Zustand instead
- **Simple local state** - Use `useState`

---

## Component State Guidelines (useState)

### When to Use useState

Use `useState` for:

- **Local component state** - State that only one component needs
- **UI state** - Modals, dropdowns, toggles, visibility
- **Form state** - Form input values, validation errors
- **Temporary UI state** - Loading states, error messages
- **Simple boolean flags** - `isOpen`, `isLoading`, `isExpanded`

### useState Best Practices

```typescript
// Good: Simple local state
function Modal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isAnimating, setIsAnimating] = useState(false);
  
  // ...
}

// Good: Form state with multiple fields
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // ...
}

// Good: Derived state (computed from props or state)
function UserList({ users }: { users: User[] }) {
  const [filter, setFilter] = useState('');
  
  const filteredUsers = useMemo(() => 
    users.filter(u => u.name.includes(filter)),
    [users, filter]
  );
  
  // ...
}
```

### When NOT to Use useState

- State that needs to be accessed by multiple components → Use Zustand or Context
- Complex state transitions → Use `useReducer`
- State that needs persistence → Use Zustand with persist middleware

---

## useReducer Guidelines

### When to Use useReducer

Use `useReducer` when:

- **Complex state logic** - State has multiple sub-values and complex transitions
- **Predictable state transitions** - State changes follow predictable patterns
- **Multiple actions** - Many different ways state can change
- **State logic is complex** - When `useState` + multiple `useEffect` becomes hard to manage
- **Testing requirements** - Reducers are easier to test in isolation

### Action Naming Conventions

```typescript
// Standard action names: VERB_NOUN or VERB
type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: Data }
  | { type: 'ADD_ITEM'; payload: Item }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<Item> } }
  | { type: 'RESET' };
```

### useReducer Example

```typescript
// hooks/useTaskReducer.ts
import { useReducer } from 'react';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface State {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'LOAD_TASKS_START' }
  | { type: 'LOAD_TASKS_SUCCESS'; payload: Task[] }
  | { type: 'LOAD_TASKS_ERROR'; payload: string }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'TOGGLE_TASK'; payload: string }
  | { type: 'DELETE_TASK'; payload: string };

const initialState: State = {
  tasks: [],
  loading: false,
  error: null,
};

function taskReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_TASKS_START':
      return { ...state, loading: true, error: null };
      
    case 'LOAD_TASKS_SUCCESS':
      return { ...state, loading: false, tasks: action.payload };
      
    case 'LOAD_TASKS_ERROR':
      return { ...state, loading: false, error: action.payload };
      
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
      
    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload ? { ...t, completed: !t.completed } : t
        ),
      };
      
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload),
      };
      
    default:
      return state;
  }
}

export function useTaskManager() {
  const [state, dispatch] = useReducer(taskReducer, initialState);
  
  const actions = {
    loadTasks: () => dispatch({ type: 'LOAD_TASKS_START' }),
    addTask: (task: Task) => dispatch({ type: 'ADD_TASK', payload: task }),
    toggleTask: (id: string) => dispatch({ type: 'TOGGLE_TASK', payload: id }),
    deleteTask: (id: string) => dispatch({ type: 'DELETE_TASK', payload: id }),
  };
  
  return { state, ...actions };
}
```

---

## Decision Flowchart

```
                    ┌─────────────────────────────────────┐
                    │     What type of state is it?       │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │  Does it need   │  │  Is it global   │  │  Does it need   │
    │  to persist?   │  │  app state?     │  │  complex logic? │
    └───────┬─────────┘  └───────┬─────────┘  └───────┬─────────┘
            │                    │                    │
     ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐
     ▼             ▼      ▼             ▼      ▼             ▼
    YES          NO     YES           NO     YES           NO
     │             │      │             │      │             │
     ▼             │      ▼             │      ▼             │
┌────────┐         │  ┌────────┐        │  ┌────────┐        │
│Zustand │         │  │Zustand │        │  │useRe-  │        │
│+persist│         │  │ Store  │        │  │ducer   │        │
└────────┘         │  └────────┘        │  └────────┘        │
                    │                   │                    │
                    │      ┌────────────┼────────────┐       │
                    │      ▼            ▼            ▼       │
                    │  ┌──────┐   ┌─────────┐  ┌────────┐     │
                    │  │Multi- │   │ Context │  │ Prop   │     │
                    │  │ple    │   │ (Theme, │  │ drilling│    │
                    │  │compo- │   │ RBAC)   │  │ OK?    │     │
                    │  │nents? │   └─────────┘  └───┬────┘     │
                    │  └──┬────┘                    │          │
                    │     ▼                    ┌───┴───┐      │
                    │   YES                   YES     NO      │
                    │     │                      │      │      │
                    │     ▼                      ▼      ▼      │
                    │  ┌────────┐          ┌────────┐ ┌──────┐ │
                    │  │ Zustand│          │ Context│ │useSt-│ │
                    │  │ Store  │          │        │ │ate   │ │
                    │  └────────┘          └────────┘ └──────┘ │
                    │                        │                  │
                    │      ┌────────────────┴────────────────┐ │
                    │      ▼                                 ▼ │
                    │  ┌────────┐                      ┌────────┐│
                    │  │Context │                      │  Local ││
                    │  │(avoid  │                      │  State ││
                    │  │prop    │                      │(useSt- ││
                    │  │drilling│                      │  ate)  ││
                    │  └────────┘                      └────────┘│
                    └──────────────────────────────────────────┘

```

### Simplified Decision Guide

```
START
  │
  ▼
Is the state used by multiple components at different levels?
  │
  ├─YES─► Is it global app state (session, theme, tabs)?
  │         │
  │         ├─YES─► Use Zustand Store
  │         │
  │         └─NO─► Is it theme/RBAC/permissions?
  │                   │
  │                   ├─YES─► Use Context
  │                   │
  │                   └─NO─► Use Zustand Store
  │
  └─NO─► Does it need complex state logic (many actions/transitions)?
            │
            ├─YES─► Use useReducer
            │
            └─NO─► Use useState (local component state)
```

---

## Anti-Patterns to Avoid

### 1. Overusing Context for Everything

```typescript
// ❌ BAD: Putting everything in Context
const AppContext = createContext({
  user: null,
  theme: 'light',
  tabs: [],
  notifications: [],
  // ... 20 more fields
});

// ✅ GOOD: Split into focused contexts
const UserContext = createContext<User | null>(null);
const ThemeContext = createContext<Theme>({});
const TabContext = createContext<TabStore>({});
```

### 2. Prop Drilling Without Limits

```typescript
// ❌ BAD: Passing props through 5+ levels
function App() {
  const [user] = useState(getUser());
  return <Page1 user={user} />;
}
function Page1({ user }) { return <Page2 user={user} />; }
function Page2({ user }) { return <Page3 user={user} />; }
function Page3({ user }) { return <Page4 user={user} />; }
function Page4({ user }) { return <Button user={user} />; }

// ✅ GOOD: Use Context or Zustand
function App() {
  return <UserProvider><Page1 /></UserProvider>;
}
function Page4() {
  const { user } = useUser();
  return <Button />;
}
```

### 3. Using useState for Everything

```typescript
// ❌ BAD: Multiple useState for related data
function UserProfile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // ... 10 more fields

// ✅ GOOD: Use useReducer for complex state
function UserProfile() {
  const [state, dispatch] = useReducer(userReducer, initialState);
  // or use Zustand for global user state
}
```

### 4. Not Memoizing Context Values

```typescript
// ❌ BAD: Creating new objects every render
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ✅ GOOD: Memoize context values
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### 5. Using Zustand for Local State

```typescript
// ❌ BAD: Using Zustand for simple local state
const useModalStore = create((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

function MyModal() {
  const { isOpen, open, close } = useModalStore(); // Unnecessary!
  // ...
}

// ✅ GOOD: Use useState for local state
function MyModal() {
  const [isOpen, setIsOpen] = useState(false);
  // ...
}
```

### 6. Mutating State Directly

```typescript
// ❌ BAD: Mutating state directly
function BadCounter() {
  const [count, setCount] = useState(0);
  
  const increment = () => {
    count++; // Mutating!
    setCount(count);
  };
}

// ✅ GOOD: Immutably updating state
function GoodCounter() {
  const [count, setCount] = useState(0);
  
  const increment = () => {
    setCount(prev => prev + 1);
  };
}
```

---

## Migration Guide

### Converting useState to useReducer

```typescript
// Before: useState
function Component() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await api.get();
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
}

// After: useReducer
type State = { data: unknown; loading: boolean; error: string | null };
type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: unknown }
  | { type: 'FETCH_ERROR'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START': return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS': return { ...state, loading: false, data: action.payload };
    case 'FETCH_ERROR': return { ...state, loading: false, error: action.payload };
    default: return state;
  }
}

function Component() {
  const [state, dispatch] = useReducer(reducer, { data: null, loading: false, error: null });

  const fetchData = async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const result = await api.get();
      dispatch({ type: 'FETCH_SUCCESS', payload: result });
    } catch (e) {
      dispatch({ type: 'FETCH_ERROR', payload: e.message });
    }
  };
}
```

### Converting Context to Zustand

```typescript
// Before: Context
const UserContext = createContext(null);

function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.onAuthStateChanged(u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

// After: Zustand Store
interface UserStore {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
}));

// Initialize in app entry point
auth.onAuthStateChanged((user) => {
  useUserStore.getState().setUser(user);
  useUserStore.getState().setLoading(false);
});
```

### Converting useState to Zustand

```typescript
// Before: Component with local state
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// After: Local state stays as useState (no need for Zustand)
// Only migrate to Zustand if multiple components need access
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// If multiple components need it:
const useCounterStore = create<{ count: number; increment: () => void }>()(
  useState({ count: 0, increment: () => {} }) // Simplified - use proper setter
);

function Counter() {
  const { count, increment } = useCounterStore();
  return <button onClick={increment}>{count}</button>;
}
```

---

## Summary

| Pattern | Best For | Avoid When |
|---------|----------|------------|
| **Zustand** | Global state, persistence, multiple components | Local UI state, simple toggles |
| **Context** | Theme, RBAC, provider/consumer | Frequently changing global state |
| **useState** | Local UI, form input, simple flags | Complex state, shared state |
| **useReducer** | Complex transitions, multiple actions | Simple state, local UI |

### Key Principles

1. **Start simple** - Use `useState` unless there's a clear reason not to
2. **Extract when needed** - Move to Zustand/Context only when `useState` becomes insufficient
3. **Keep focused** - Each store/context should have a single responsibility
4. **Memoize** - Prevent unnecessary re-renders in Context
5. **Be consistent** - Follow the patterns established in this document

---

*Last updated: 2026-03-13*
*Part of Phase 2: Tabbed Workspace Improvement Plan*
