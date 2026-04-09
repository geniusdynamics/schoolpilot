# Modularity Migration Guide

## Overview

This guide helps you migrate existing modules to the new modular architecture.

## Quick Start

### 1. Create module.json

Create a `module.json` file in your module directory:

```json
{
  "$schema": "../../schemas/module-schema.json",
  "id": "your-module",
  "name": "Your Module",
  "version": "1.0.0",
  "description": "Description of your module",
  "dependencies": [
    {
      "moduleId": "administration",
      "version": "^1.0.0",
      "required": true,
      "reason": "Requires students and staff data",
      "imports": ["students", "staff"]
    }
  ],
  "optionalDependencies": [],
  "provides": {
    "entities": ["YourEntity"],
    "services": ["YourService"],
    "hooks": ["useYourHook"],
    "routes": ["/your-module/*"]
  },
  "capabilities": {
    "offlineSupport": true,
    "requiresBackend": false,
    "multiTenant": false
  }
}
```

### 2. Replace Cross-Module Imports

**Before:**
```typescript
// ❌ Cross-module import - NOT ALLOWED
import { mockStudents } from '@/modules/administration/mock/students';
```

**After:**
```typescript
// ✅ Use shared data hook
import { useSharedStudents } from '@/hooks/useSharedData';

function YourComponent() {
  const { students } = useSharedStudents();
  // Use students data
}
```

**For non-React code:**
```typescript
// ✅ Use shared data store
import { sharedDataStore } from '@/services/data/SharedDataStore';

const students = sharedDataStore.getStudents();
```

### 3. Register Module Services

```typescript
// src/modules/your-module/index.ts
import { modularSystem } from '@/core/ModularSystem';
import { YourService } from './services/YourService';
import moduleMetadata from './module.json';

export function registerYourModule() {
  modularSystem.registerModule({
    module: {
      id: moduleMetadata.id,
      metadata: moduleMetadata,
      definition: null
    },
    hooks: {
      onEnable: async (ctx) => {
        console.log(`Module ${ctx.moduleId} enabled`);
      },
      onDisable: async (ctx) => {
        console.log(`Module ${ctx.moduleId} disabled`);
      }
    },
    services: [
      {
        name: 'YourService',
        moduleId: moduleMetadata.id,
        factory: () => new YourService(),
        singleton: true
      }
    ],
    exports: {
      services: new Map([['YourService', YourService]]),
      hooks: new Map([['useYourHook', useYourHook]]),
      components: new Map([['YourComponent', YourComponent]])
    }
  });
}
```

### 4. Use React Hooks

```typescript
// Use module state
import { useModule } from '@/hooks/useModule';

function YourFeature() {
  const { isEnabled, isLoading, enable } = useModule('your-module', {
    autoEnable: true
  });

  if (!isEnabled) return <button onClick={enable}>Enable</button>;
  return <YourComponent />;
}
```

```typescript
// Use services
import { useService } from '@/hooks/useService';

function YourComponent() {
  const { service, isReady } = useService({
    moduleId: 'your-module',
    name: 'YourService'
  });

  if (!isReady) return <Spinner />;
  return <div>{service.getData()}</div>;
}
```

```typescript
// Lazy load module
import { useLazyModule } from '@/hooks/useLazyModule';

function LazyFeature() {
  const { load, isLoaded, isLoading } = useLazyModule('your-module');

  if (!isLoaded) {
    return <button onClick={load} disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Load Module'}
    </button>;
  }

  return <YourModuleComponent />;
}
```

## Migration Checklist

### For Each Module

- [ ] Create `module.json` with metadata
- [ ] Define dependencies in `module.json`
- [ ] Declare exports in `module.json` `provides` section
- [ ] Replace all cross-module imports with `useSharedData()`
- [ ] Register services with `serviceRegistry`
- [ ] Register exports with `moduleExports`
- [ ] Add lifecycle hooks if needed
- [ ] Test with `npm run lint:modules` (should show 0 violations)
- [ ] Write unit tests for module registration

### For Services

- [ ] Convert services to factory functions
- [ ] Declare dependencies in service registration
- [ ] Use singleton pattern for stateful services
- [ ] Export service class for external use

### For React Components

- [ ] Use `useModule()` to check module availability
- [ ] Use `useService()` to access services
- [ ] Use `useSharedData()` for shared entities
- [ ] Use `useLazyModule()` for on-demand loading

## Common Patterns

### Pattern 1: Conditional Module Loading

```typescript
import { useModulesEnabled } from '@/hooks/useModule';

function Dashboard() {
  const modules = useModulesEnabled(['finance', 'reports']);
  
  return (
    <div>
      {modules.finance && <FinanceWidget />}
      {modules.reports && <ReportsWidget />}
    </div>
  );
}
```

### Pattern 2: Service Dependencies

```typescript
// In module registration
services: [
  {
    name: 'AdvancedService',
    moduleId: 'your-module',
    factory: () => new AdvancedService(),
    dependencies: ['core.DatabaseService', 'administration.StudentService'],
    singleton: true
  }
]
```

### Pattern 3: Module Validation

```typescript
import { moduleExports } from '@/core/ModuleExports';

// Validate module exports match declarations
const validation = moduleExports.validateExports('your-module');
if (!validation.valid) {
  console.error('Export validation failed:', validation.errors);
}
```

### Pattern 4: Dynamic Feature Loading

```typescript
import { useLazyModule } from '@/hooks/useLazyModule';

function FeatureContainer({ featureId }) {
  const { load, isLoaded, progress } = useLazyModule(featureId, {
    preload: true,
    preloadDelay: 1000
  });

  return (
    <div>
      {isLoaded ? (
        <DynamicFeature id={featureId} />
      ) : (
        <div>Loading... {progress}%</div>
      )}
    </div>
  );
}
```

## Troubleshooting

### Cross-Module Import Violations

If `npm run lint:modules` shows violations:

1. Check import paths - they should not cross into other modules
2. Replace with shared data hooks or services
3. If data is needed, add it to `SharedDataStore`

### Circular Dependencies

If you get circular dependency errors:

1. Review `module.json` dependencies
2. Move shared code to `core` module
3. Use optional dependencies where appropriate
4. Consider splitting the module

### Service Not Found

If `useService()` returns null:

1. Check service is registered with correct moduleId
2. Ensure service name matches exactly
3. Check service dependencies are resolved
4. Look for initialization errors in console

### Module Won't Enable

If `enable()` fails:

1. Check all dependencies are enabled
2. Review `onEnable` hook for errors
3. Check module state with `useModule()`
4. Look for validation errors

## Advanced Topics

### Custom Lifecycle Hooks

```typescript
hooks: {
  onRegister: async (ctx) => {
    // Module registered but not yet enabled
    // Good for one-time setup
  },
  onEnable: async (ctx) => {
    // Module is being enabled
    // Initialize services here
  },
  onDisable: async (ctx) => {
    // Module is being disabled
    // Cleanup resources
  },
  onUnregister: async (ctx) => {
    // Module is being unregistered
    // Final cleanup
  }
}
```

### Hot Module Replacement (Development)

```typescript
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    modularSystem.unloadModule('your-module');
    registerYourModule();
  });
}
```

### Module Federation

For loading remote modules:

```typescript
moduleLoader.registerFactory('remote-module', async () => {
  const module = await import('remoteApp/Module');
  return {
    id: 'remote-module',
    metadata: module.metadata,
    definition: module
  };
});

await moduleLoader.load('remote-module');
```

## Migration Timeline

1. **Week 1**: Create module.json files for all modules
2. **Week 2**: Replace cross-module imports with shared data
3. **Week 3**: Migrate services to new registry
4. **Week 4**: Add lifecycle hooks and testing
5. **Week 5**: Performance optimization and validation

## Support

- Check existing module implementations in `src/modules/`
- Review test files in `src/core/__tests__/`
- See `docs/modularity-improvements-progress.md` for architecture details
