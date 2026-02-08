# React Native Foundation

This directory contains the foundation for building a React Native mobile app that shares code with the web app.

## Architecture

The goal is to maximize code reuse between web and mobile:

```
src/
├── native/           # React Native specific code
│   ├── components/   # RN versions of shared components
│   ├── screens/      # Mobile screens
│   └── navigation/   # Mobile navigation setup
├── shared/           # Shared code (business logic, hooks, utils)
│   ├── hooks/
│   ├── services/
│   └── types/
└── web/              # Web specific code
    └── components/
```

## Shared Code Strategy

### 1. Business Logic (100% shared)
- Data services (UDS, providers)
- State management
- API clients
- Utilities and helpers

### 2. Hooks (90% shared)
- useData, useAuth, useSettings
- useTranslation, useRBAC
- Custom business logic hooks

### 3. Components (50% shared)
- Logic hooks are shared
- UI components are platform-specific
- Use platform-agnostic styling where possible

## Platform Abstractions

### Storage
```typescript
// Shared interface
interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Web implementation
class LocalStorageAdapter implements StorageAdapter { ... }

// Native implementation
class AsyncStorageAdapter implements StorageAdapter { ... }
```

### Navigation
- Web: React Router
- Native: React Navigation
- Both use the same route configuration

### UI Components
```typescript
// Button.shared.ts - Logic hook
export function useButton(props: ButtonProps) {
  // Shared logic
}

// Button.web.tsx - Web implementation
export function Button(props: ButtonProps) {
  const logic = useButton(props);
  return <button ... />;
}

// Button.native.tsx - Native implementation
export function Button(props: ButtonProps) {
  const logic = useButton(props);
  return <TouchableOpacity ... />;
}
```

## Getting Started

1. Install React Native dependencies:
   ```bash
   npm install react-native @react-navigation/native
   ```

2. Set up the native project structure

3. Configure Metro bundler for shared code

4. Implement platform adapters

## Notes

- Use `.native.tsx` extension for React Native specific files
- Use `.web.tsx` extension for web specific files
- Use `.ts` or `.tsx` for shared code
- Keep platform-specific code minimal
