# Modularity API Reference

## Core Classes

### ModularSystem

Central integration point for the modular system.

```typescript
import { modularSystem } from '@/core/ModularSystem';

// Initialize
await modularSystem.initialize();

// Register a module
await modularSystem.registerModule({
  module: loadedModule,
  hooks: lifecycleHooks,
  services: [serviceRegistration],
  exports: { services, entities, hooks, components }
});

// Register multiple modules
await modularSystem.registerModules([registration1, registration2]);

// Load module dynamically
const success = await modularSystem.loadModule('module-id');

// Get service
const service = await modularSystem.getService('module-id', 'ServiceName');
const serviceSync = modularSystem.getServiceSync('module-id', 'ServiceName');

// Check status
const status = modularSystem.getStatus();
const isEnabled = modularSystem.isModuleEnabled('module-id');
const isLoaded = modularSystem.isModuleLoaded('module-id');

// Validate exports
const validation = modularSystem.validateExports();

// Shutdown
await modularSystem.shutdown();
```

### ModuleRegistry

Manages module lifecycle and dependencies.

```typescript
import { moduleRegistry } from '@/core/ModuleRegistry';

// Register module
await moduleRegistry.register(module, hooks);

// Register batch with dependency resolution
await moduleRegistry.registerBatch(modules, hooksMap);

// Initialize all modules
await moduleRegistry.initialize();

// Enable/disable modules
await moduleRegistry.enable('module-id');
await moduleRegistry.disable('module-id');

// Query state
const isRegistered = moduleRegistry.isRegistered('module-id');
const isEnabled = moduleRegistry.isEnabled('module-id');
const metadata = moduleRegistry.getMetadata('module-id');
const state = moduleRegistry.getState('module-id');

// Get dependency info
const deps = moduleRegistry.getDependencies('module-id');
const dependents = moduleRegistry.getDependents('module-id');
const order = moduleRegistry.getLoadingOrder();
const batches = moduleRegistry.getLoadingBatches();
```

### ServiceRegistry

Manages service registration and dependency injection.

```typescript
import { serviceRegistry } from '@/core/ServiceRegistry';

// Register service
serviceRegistry.register({
  name: 'ServiceName',
  moduleId: 'module-id',
  factory: () => new Service(),
  dependencies: ['other-module.OtherService'],
  singleton: true
});

// Get service
const service = await serviceRegistry.get('module-id', 'ServiceName');
const serviceSync = serviceRegistry.getSync('module-id', 'ServiceName');

// Query
const has = serviceRegistry.has('module-id', 'ServiceName');
const isReady = serviceRegistry.isReady('module-id', 'ServiceName');
const state = serviceRegistry.getState('module-id', 'ServiceName');

// Find services
const matches = serviceRegistry.find('pattern');
const byModule = serviceRegistry.findByModule('module-id');

// Initialize all
await serviceRegistry.initializeAll();
```

### ModuleExports

Manages module exports.

```typescript
import { moduleExports } from '@/core/ModuleExports';

// Register module exports
moduleExports.registerModule(module, {
  services: new Map([['ServiceName', ServiceClass]]),
  entities: new Map([['EntityName', Entity]]),
  hooks: new Map([['useHook', useHook]]),
  components: new Map([['Component', Component]]),
  utils: new Map([['util', utilFunction]])
});

// Register individual exports
moduleExports.registerService('module-id', 'ServiceName', service);
moduleExports.registerEntity('module-id', 'EntityName', entity);
moduleExports.registerHook('module-id', 'useHook', hook);
moduleExports.registerComponent('module-id', 'Component', component);
moduleExports.registerUtil('module-id', 'util', util);

// Get exports
const service = moduleExports.getService('module-id', 'ServiceName');
const entity = moduleExports.getEntity('module-id', 'EntityName');

// Find across modules
const found = moduleExports.findService('ServiceName');
const services = moduleExports.findServices(/pattern/);

// List all
const allServices = moduleExports.listServices();
const allEntities = moduleExports.listEntities();

// Validate
const result = moduleExports.validateExports('module-id');
const allResults = moduleExports.validateAll();
```

### ModuleLoader

Dynamic module loading.

```typescript
import { moduleLoader } from '@/core/ModuleLoader';

// Register factory
moduleLoader.registerFactory('module-id', async () => loadedModule);

// Check if can load
const canLoad = moduleLoader.canLoad('module-id');

// Load module
const result = await moduleLoader.load('module-id', {
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000,
  autoEnable: true
});

// Unload
const success = await moduleLoader.unload('module-id');

// Batch operations
const results = await moduleLoader.loadBatch(['mod1', 'mod2']);
const results = await moduleLoader.loadOrdered(['mod1', 'mod2']);

// Preload
const preloaded = await moduleLoader.preload('module-id');

// Query
const isLoaded = moduleLoader.isLoaded('module-id');
const progress = moduleLoader.getProgress('module-id');
const state = moduleLoader.getLoadState('module-id');
const loaded = moduleLoader.getLoadedModules();
```

### ModuleBundler

Module chunk management.

```typescript
import { moduleBundler } from '@/core/ModuleBundler';

// Register chunks
moduleBundler.registerChunk({
  id: 'chunk-id',
  moduleId: 'module-id',
  url: '/chunks/chunk.js',
  size: 100000,
  priority: 'critical', // 'critical' | 'high' | 'normal' | 'low'
  dependencies: ['other-chunk']
});

// Load chunk
const result = await moduleBundler.loadChunk('chunk-id');

// Load all chunks for module
const results = await moduleBundler.loadModuleChunks('module-id');

// Preload
await moduleBundler.preloadChunks(['chunk1', 'chunk2']);

// Query
const isLoaded = moduleBundler.isLoaded('chunk-id');
const isModuleLoaded = moduleBundler.isModuleLoaded('module-id');
const progress = moduleBundler.getModuleProgress('module-id');
const state = moduleBundler.getChunkState('chunk-id');
```

## React Hooks

### useModule

Access module state and control lifecycle.

```typescript
import { useModule } from '@/hooks/useModule';

const {
  metadata,      // ModuleMetadata | null
  state,         // ModuleState | null
  isRegistered,  // boolean
  isEnabled,     // boolean
  isLoading,     // boolean
  error,         // Error | null
  enable,        // () => Promise<void>
  disable,       // () => Promise<void>
  dependencies,  // string[]
  dependents     // string[]
} = useModule('module-id', {
  autoEnable: true,
  onError: (error) => console.error(error),
  onEnabled: () => console.log('Enabled'),
  onDisabled: () => console.log('Disabled')
});
```

### useModules

Monitor all modules.

```typescript
import { useModules } from '@/hooks/useModule';

const {
  modules,       // ModuleState[]
  enabledModules,// string[]
  isReady,       // boolean
  isLoading,     // boolean
  error          // Error | null
} = useModules();
```

### useModulesEnabled

Check if multiple modules are enabled.

```typescript
import { useModulesEnabled } from '@/hooks/useModule';

const enabled = useModulesEnabled(['finance', 'reports', 'analytics']);
// enabled = { finance: true, reports: false, analytics: true }
```

### useService

Access a service.

```typescript
import { useService } from '@/hooks/useService';

const {
  service,       // T | null
  isLoading,     // boolean
  isReady,       // boolean
  error,         // Error | null
  state,         // ServiceState | null
  init           // () => Promise<T>
} = useService({
  moduleId: 'module-id',
  name: 'ServiceName',
  autoInit: true,
  onReady: (service) => console.log('Ready', service),
  onError: (error) => console.error(error)
});
```

### useServices

Monitor all services.

```typescript
import { useServices } from '@/hooks/useService';

const {
  services,      // Array<{ moduleId, name, status }>
  readyCount,    // number
  totalCount,    // number
  allReady,      // boolean
  isLoading      // boolean
} = useServices();
```

### useServiceFinder

Find services by pattern.

```typescript
import { useServiceFinder } from '@/hooks/useService';

const {
  matches,       // Array<{ moduleId, name }>
  isSearching    // boolean
} = useServiceFinder({ pattern: 'Payment' });
```

### useServicesReady

Check if multiple services are ready.

```typescript
import { useServicesReady } from '@/hooks/useService';

const allReady = useServicesReady([
  { moduleId: 'finance', name: 'PaymentService' },
  { moduleId: 'core', name: 'DatabaseService' }
]);
```

### useLazyModule

Lazy load a module.

```typescript
import { useLazyModule } from '@/hooks/useLazyModule';

const {
  load,          // () => Promise<LoadedModuleResult>
  unload,        // () => Promise<boolean>
  isLoading,     // boolean
  isLoaded,      // boolean
  isError,       // boolean
  error,         // Error | null
  progress,      // number (0-100)
  loadState      // ModuleLoadState | null
} = useLazyModule('module-id', {
  preload: true,
  preloadDelay: 2000,
  onSuccess: (result) => console.log('Loaded', result),
  onError: (error) => console.error(error)
});
```

### useLazyModules

Lazy load multiple modules.

```typescript
import { useLazyModules } from '@/hooks/useLazyModule';

const {
  load,          // () => Promise<LoadedModuleResult[]>
  unloadAll,     // () => Promise<void>
  isLoading,     // boolean
  allLoaded,     // boolean
  hasErrors,     // boolean
  errors,        // Error[]
  results,       // LoadedModuleResult[]
  progress       // number (0-100)
} = useLazyModules(['mod1', 'mod2', 'mod3'], {
  parallel: true,
  onAllSuccess: () => console.log('All loaded'),
  onAnyError: (errors) => console.error('Some failed', errors)
});
```

### useModuleChunks

Manage module chunks.

```typescript
import { useModuleChunks } from '@/hooks/useLazyModule';

const {
  isLoaded,      // boolean
  progress,      // number (0-100)
  loadChunk,     // (chunkId: string) => Promise<boolean>
  loadModuleChunks // () => Promise<boolean>
} = useModuleChunks('module-id', {
  autoLoad: true
});
```

### useSharedData

Access shared entities.

```typescript
import { 
  useSharedData,
  useSharedUsers,
  useSharedStudents,
  useSharedStaff,
  useSharedClasses,
  useSharedDepartments,
  useSharedDesignations,
  useSharedAcademicYears,
  useSharedSchoolDetails,
  useSharedRoles
} from '@/hooks/useSharedData';

// Access multiple entities
const { users, students, staff } = useSharedData([
  'users', 'students', 'staff'
]);

// Or use convenience hooks
const { students, isLoading, error, refresh } = useSharedStudents();
```

## SharedDataStore

Non-React access to shared entities.

```typescript
import { sharedDataStore } from '@/services/data/SharedDataStore';

// Get data
const users = sharedDataStore.getUsers();
const students = sharedDataStore.getStudents();
const staff = sharedDataStore.getStaff();
const classes = sharedDataStore.getClasses();
const departments = sharedDataStore.getDepartments();
const designations = sharedDataStore.getDesignations();
const academicYears = sharedDataStore.getAcademicYears();
const schoolDetails = sharedDataStore.getSchoolDetails();
const roles = sharedDataStore.getRoles();

// Wait for initialization
await sharedDataStore.waitForInit();

// Listen for changes
sharedDataStore.on('change', ({ entity, data }) => {
  console.log(`${entity} updated:`, data);
});
```

## Type Definitions

### ModuleMetadata

```typescript
interface ModuleMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: { name: string; email?: string; url?: string };
  license?: string;
  dependencies: ModuleDependency[];
  optionalDependencies?: ModuleDependency[];
  conflicts?: string[];
  schemas?: string[];
  migrations?: string;
  provides?: {
    entities?: string[];
    services?: string[];
    hooks?: string[];
    routes?: string[];
  };
  capabilities?: {
    offlineSupport?: boolean;
    requiresBackend?: boolean;
    multiTenant?: boolean;
  };
  config?: Record<string, any>;
}
```

### ModuleDependency

```typescript
interface ModuleDependency {
  moduleId: string;
  version: string;
  required: boolean;
  reason?: string;
  imports?: string[];
}
```

### LifecycleHooks

```typescript
interface LifecycleHooks {
  onRegister?: (ctx: LifecycleContext) => Promise<void> | void;
  onEnable?: (ctx: LifecycleContext) => Promise<void> | void;
  onDisable?: (ctx: LifecycleContext) => Promise<void> | void;
  onUnregister?: (ctx: LifecycleContext) => Promise<void> | void;
}

interface LifecycleContext {
  moduleId: string;
  metadata: ModuleMetadata;
  services: Map<string, unknown>;
  config: Record<string, unknown>;
}
```

### ServiceRegistration

```typescript
interface ServiceRegistration<T = unknown> {
  name: string;
  moduleId: string;
  factory: () => T | Promise<T>;
  dependencies?: string[];
  singleton?: boolean;
}
```

## CLI Commands

```bash
# Check for cross-module import violations
npm run lint:modules

# Run all modularity tests
npm test -- --run src/core/__tests__

# Run specific test files
npm test -- --run src/core/__tests__/ModuleLoader.test.ts
npm test -- --run src/core/__tests__/ServiceRegistry.test.ts
```

## Environment Variables

```bash
# Feature flags
VITE_USE_SHARED_DATA_HOOK=true
VITE_USE_MODULE_METADATA=true
VITE_USE_SCHEMA_AUTO_REGISTRATION=true
VITE_USE_MODULE_MIGRATIONS=true
VITE_STRICT_MODULE_ISOLATION=true

# Module-specific
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ADVANCED_REPORTS=true

# Dev tools
VITE_ENABLE_MODULE_DEVTOOLS=true
```
