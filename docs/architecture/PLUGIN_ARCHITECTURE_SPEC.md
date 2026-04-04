# Plugin Architecture Specification

## Overview

SchoolPilot3 implements a comprehensive plugin architecture that enables extensibility, customization, and integration with external systems. This specification documents the complete plugin system architecture, including the marketplace integration, admin controls, and security model.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Builtin Plugin Loader](#builtin-plugin-loader)
3. [Plugin Types](#plugin-types)
4. [Plugin Manifest](#plugin-manifest)
5. [Hook System](#hook-system)
6. [Marketplace Integration](#marketplace-integration)
7. [Admin Configuration](#admin-configuration)
8. [Security Model](#security-model)
9. [Go WASM Integration](#go-wasm-integration)
10. [Implementation Guide](#implementation-guide)
11. [Builtin Plugins Reference](#builtin-plugins-reference)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SchoolPilot3 Application                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│  │   React UI      │    │  Plugin System   │    │   Data Layer            │ │
│  │                 │    │                  │    │                         │ │
│  │  - Components   │    │  - PluginManager │    │  - UnifiedDataService   │ │
│  │  - Hooks        │◄───┤  - HookSystem    │◄───┤  - BackendProvider      │ │
│  │  - Contexts     │    │  - Marketplace   │    │  - SQLiteProvider       │ │
│  │                 │    │  - AdminConfig   │    │  - PouchDBProvider      │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘ │
│           │                      │                          │               │
│           │                      │                          │               │
│           ▼                      ▼                          ▼               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         Plugin Runtime                                   ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ ││
│  │  │ TypeScript   │  │   WASM       │  │   Scripts    │  │   Native    │ ││
│  │  │   Plugins    │  │   Engines    │  │   (.js/.lua) │  │   Modules   │ ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │      External Services               │
                    │  ┌──────────────┐  ┌──────────────┐ │
                    │  │ Go SaaS      │  │  Marketplace │ │
                    │  │   Backend    │  │   Registry   │ │
                    │  └──────────────┘  └──────────────┘ │
                    │  ┌──────────────┐  ┌──────────────┐ │
                    │  │  ERPNext     │  │   Analytics  │ │
                    │  │   Server     │  │   Tracking   │ │
                    │  └──────────────┘  └──────────────┘ │
                    └─────────────────────────────────────┘
```

### Key Components

| Component | Location | Description |
|-----------|----------|-------------|
| **PluginManager** | `src/plugins/PluginManager.ts` | Core plugin lifecycle management |
| **PluginTypes** | `src/plugins/types.ts` | TypeScript type definitions |
| **PluginsProvider** | `src/plugins/PluginsProvider.tsx` | React context provider |
| **PluginMarketplace** | `src/services/PluginMarketplace.ts` | Marketplace API client |
| **Builtin Plugins** | `src/plugins/builtin/` | Pre-installed core plugins |
| **BuiltinLoader** | `src/plugins/BuiltinLoader.ts` | Auto-discovery loader |

---

## Builtin Plugin Loader

The Builtin Plugin Loader provides automatic discovery and loading of core plugins shipped with SchoolPilot3. This eliminates the need for manual plugin registration and ensures essential plugins are always available.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BuiltinLoader                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐     ┌─────────────────────────────┐  │
│  │ BUILTIN_PLUGINS  │────►│  loadAllBuiltinPlugins()    │  │
│  │   (registry)     │     │                             │  │
│  └──────────────────┘     │  1. Iterate registry        │  │
│           │               │  2. Dynamic import          │  │
│           │               │  3. Validate structure      │  │
│           ▼               │  4. Return loaded plugins   │  │
│  ┌──────────────────┐     └─────────────────────────────┘  │
│  │  PluginManager   │                    │                  │
│  │                  │◄───────────────────┘                  │
│  │  loadBuiltin()   │                                       │
│  └──────────────────┘                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Plugin Registry

Builtin plugins are registered in `BuiltinLoader.ts`:

```typescript
const BUILTIN_PLUGINS: PluginDirectory[] = [
  { name: 'whitelabel', path: './whitelabel' },
  { name: 'grading-engine', path: './grading-engine' },
  { name: 'fee-calculator', path: './fee-calculator' },
];
```

### Loading Process

1. **Discovery**: Loader iterates through `BUILTIN_PLUGINS` registry
2. **Import**: Dynamically imports each plugin module
3. **Validation**: Verifies plugin has valid `manifest` and `module` exports
4. **Registration**: Returns `LoadedPlugin` objects for PluginManager

```typescript
// src/plugins/BuiltinLoader.ts
export async function loadAllBuiltinPlugins(): Promise<LoadedPlugin[]> {
  const plugins: LoadedPlugin[] = [];

  for (const dirInfo of BUILTIN_PLUGINS) {
    const plugin = await loadBuiltinPlugin(dirInfo);
    if (plugin) {
      plugins.push(plugin);
    }
  }

  return plugins;
}
```

### Integration with PluginManager

The PluginManager loads builtin plugins during initialization:

```typescript
// src/plugins/PluginManager.ts
class PluginManager {
  async initialize(): Promise<void> {
    // Load builtin plugins first
    const builtinPlugins = await loadAllBuiltinPlugins();

    for (const plugin of builtinPlugins) {
      await this.registerPlugin(plugin);
    }

    // Then load user-installed plugins...
  }
}
```

### Creating a Builtin Plugin

1. **Create plugin directory**
```bash
mkdir -p src/plugins/builtin/my-plugin
```

2. **Create plugin structure**
```typescript
// src/plugins/builtin/my-plugin/index.ts
import type { PluginManifest, PluginModule } from '../../types';

export const manifest: PluginManifest = {
  id: 'com.schoolpilot.my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  type: 'module',
  entry: './index.ts',
  category: 'builtin',
};

const module: PluginModule = {
  async activate(context) {
    // Plugin activation logic
  },
  async deactivate() {
    // Cleanup logic
  },
};

export default { manifest, module };
```

3. **Register in BuiltinLoader**
```typescript
// src/plugins/BuiltinLoader.ts
const BUILTIN_PLUGINS: PluginDirectory[] = [
  // ... existing plugins
  { name: 'my-plugin', path: './my-plugin' },
];
```

### Builtin vs External Plugins

| Aspect | Builtin Plugins | External Plugins |
|--------|----------------|------------------|
| **Location** | `src/plugins/builtin/` | Marketplace / Manual install |
| **Loading** | Auto-discovered | Manual registration |
| **Trust Level** | Trusted (no sandbox) | Verified/Community (sandboxed) |
| **Updates** | With app releases | Independent updates |
| **Purpose** | Core functionality | Extended features |

---

## Plugin Types

SchoolPilot3 supports multiple plugin types for different use cases:

### Core Plugin Types

```typescript
type PluginType = 
  | 'module'       // Full feature module (e.g., advanced grading)
  | 'theme'        // Visual theme customization
  | 'integration'  // External service integration (e.g., payment gateway)
  | 'report'       // Custom report templates
  | 'widget'       // Dashboard widgets
  | 'whitelabel'   // Branding and label customization
  | 'engine';      // Go-based computation engine (WASM)
```

### Plugin Categories

```typescript
type PluginCategory =
  | 'builtin'      // Shipped with core
  | 'verified'     // Reviewed by SchoolPilot team
  | 'community'    // Third-party
  | 'private'      // Custom per-school
  | 'engine';      // Go WASM binaries
```

### Type-Specific Capabilities

#### Module Plugins
- Add complete feature modules
- Register routes and navigation items
- Define data schemas and collections
- Hook into core events

#### Theme Plugins
- Override CSS variables
- Provide custom components
- Modify layout structures

#### Integration Plugins
- Connect to external APIs
- Implement authentication flows
- Sync data with third-party systems

#### White-Label Plugins
- Customize application name and branding
- Override UI labels
- Hide/show features
- Apply custom colors and logos

#### Engine Plugins
- Go-compiled WASM binaries
- High-performance calculations
- Shared code between SaaS and client

---

## Plugin Manifest

Every plugin must define a manifest that describes its identity, requirements, and capabilities.

### Complete Manifest Schema

```typescript
interface PluginManifest {
  // ===== Required Fields =====
  id: string;                    // Unique identifier: com.company.plugin-name
  name: string;                  // Display name
  version: string;               // Semantic version: 1.0.0
  type: PluginType;              // Plugin type
  entry: string;                 // Entry point: ./index.js or ./index.ts

  // ===== Metadata =====
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  icon?: string;                 // URL or embedded data URL
  category?: PluginCategory;

  // ===== Compatibility =====
  minAppVersion?: string;        // Minimum SchoolPilot version
  maxAppVersion?: string;        // Maximum compatible version
  requires?: string[];           // Plugin dependencies
  conflicts?: string[];          // Incompatible plugins

  // ===== Capabilities =====
  permissions?: string[];        // Requested permissions
  privileges?: Partial<PluginPrivileges>;
  hooks?: string[];              // Hooks this plugin uses
  provides?: string[];           // Hooks this plugin provides

  // ===== UI Integration =====
  routes?: PluginRoute[];
  menuItems?: PluginMenuItem[];
  widgets?: PluginWidget[];
  settings?: PluginSetting[];

  // ===== Engine-Specific (type: 'engine') =====
  engine?: {
    wasmFile: string;            // Path to WASM binary
    exports: string[];           // Exported function names
    fallbackBehavior?: 'error' | 'fallback' | 'silent';
  };

  // ===== Marketplace Metadata =====
  marketplace?: {
    price?: number;              // Price in USD (0 = free)
    currency?: string;
    featured?: boolean;
    downloads?: number;
    rating?: number;
    reviewCount?: number;
  };
}
```

### Manifest Example

```typescript
// plugin.json equivalent
const manifest: PluginManifest = {
  id: 'com.schoolpilot.advanced-grading',
  name: 'Advanced Grading Module',
  version: '2.1.0',
  type: 'module',
  entry: './index.ts',
  
  description: 'Advanced grading calculations with custom strategies',
  author: 'SchoolPilot3 Team',
  license: 'MIT',
  category: 'verified',
  
  minAppVersion: '1.0.0',
  requires: ['academics@^1.0.0'],
  conflicts: ['basic-grading'],
  
  hooks: [
    'grading.beforeCalculate',
    'grading.afterCalculate',
  ],
  
  routes: [
    {
      path: '/academics/grading/advanced',
      component: 'AdvancedGradingPage',
      title: 'Advanced Grading',
      icon: 'CalculatorIcon',
    },
  ],
  
  menuItems: [
    {
      id: 'advanced-grading',
      label: 'Advanced Grading',
      icon: 'CalculatorIcon',
      route: '/academics/grading/advanced',
      order: 100,
    },
  ],
  
  settings: [
    {
      key: 'defaultStrategy',
      label: 'Default Strategy',
      type: 'select',
      defaultValue: 'weighted',
      options: [
        { label: 'Weighted Average', value: 'weighted' },
        { label: 'Points-Based', value: 'points' },
      ],
    },
  ],
};
```

---

## Hook System

The hook system allows plugins to intercept and modify application behavior at defined extension points.

### Hook Types

```typescript
type HookType = 'action' | 'filter' | 'async';
```

| Type | Description | Return Value |
|------|-------------|--------------|
| **action** | Execute side effects | Void |
| **filter** | Transform data | Modified data |
| **async** | Asynchronous operations | Promise |

### Core Hooks

#### UI Hooks
- `ui.branding.header` - Modify header branding
- `ui.branding.title` - Override page title
- `ui.branding.logo` - Provide custom logo
- `ui.branding.colors` - Override theme colors
- `ui.label.resolve` - Translate/override labels
- `ui.menu.beforeRender` - Modify menu items
- `ui.footer.render` - Customize footer

#### Data Hooks
- `data.beforeSave` - Transform data before persistence
- `data.afterLoad` - Transform data after loading
- `data.validate` - Custom validation logic

#### Academic Hooks
- `grading.beforeCalculate` - Pre-process grades
- `grading.afterCalculate` - Post-process results
- `grading.validateConfig` - Validate grading config
- `fees.beforeCalculate` - Pre-process fee input
- `fees.afterCalculate` - Post-process fee results
- `fees.applyDiscounts` - Apply discount logic

#### Lifecycle Hooks
- `plugin.activate` - Plugin activation
- `plugin.deactivate` - Plugin deactivation
- `plugin.install` - Plugin installation
- `plugin.uninstall` - Plugin removal

### Registering Hooks

```typescript
// In plugin activate()
context.api.addHook('grading.beforeCalculate', (students) => {
  // Pre-process students
  return students.map(s => ({
    ...s,
    scores: normalizeScores(s.scores),
  }));
}, 10); // Priority (lower = earlier)
```

### Executing Hooks

```typescript
// Filter hook - returns modified data
const results = pluginManager.doHook('grading.beforeCalculate', students);

// Apply hook - first non-null result wins
const branding = pluginManager.applyHook('ui.branding.header', defaultBranding);
```

---

## Marketplace Integration

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  SchoolPilot3   │     │  Marketplace    │     │   Analytics     │
│     Client      │     │    Registry     │     │    Server       │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│                 │     │                 │     │                 │
│ PluginMarketplace────►│ /api/v1/plugins │     │                 │
│     Service     │     │ /api/v1/keys    │     │                 │
│                 │     │ /api/v1/featured│     │                 │
│                 │     │                 │     │                 │
│ Instance ID     │────►│ Track installs  │────►│ Usage metrics   │
│ Marketplace Key │     │ Validate keys   │     │ Reports         │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Marketplace Key Format

```
sp3_<plan>_<random_id>_<checksum>

Examples:
sp3_free_abc123def456_a1b2c3d4
sp3_standard_xyz789ghi012_e5f6g7h8
sp3_enterprise_qrs345tuv678_i9j0k1l2
```

### Key Validation Flow

1. **Online Mode**
   - Send key to `/api/v1/keys/validate`
   - Receive plan, permissions, expiration

2. **Offline Mode**
   - Validate key format locally
   - Check checksum
   - Apply cached permissions

### Installation Tracking

```typescript
interface InstallTrackingEvent {
  eventType: 'install' | 'activate' | 'deactivate' | 'uninstall';
  pluginId: string;
  pluginVersion: string;
  instanceId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

---

## Admin Configuration

### AdminPluginConfig Schema

```typescript
interface AdminPluginConfig {
  // Master switch
  pluginsEnabled: boolean;
  
  // Marketplace settings
  marketplace: {
    enabled: boolean;
    marketplaceKey?: string;
    allowFreePlugins: boolean;
    allowPaidPlugins: boolean;
    requireApprovalForInstall: boolean;
  };
  
  // Plugin loading settings
  loading: {
    allowLocalPlugins: boolean;
    allowUnsignedPlugins: boolean;
    allowedTypes: PluginType[];
    maxInstalledPlugins: number;
  };
  
  // Security settings
  security: {
    sandboxEnabled: boolean;
    networkWhitelist: string[];
    permissionsPreset: 'strict' | 'balanced' | 'permissive';
  };
  
  // Per-plugin overrides
  pluginOverrides: Record<string, {
    enabled: boolean;
    permissions?: Partial<PluginPrivileges>;
  }>;
}
```

### Permission Presets

| Preset | Data Access | Network | UI Injection |
|--------|-------------|---------|--------------|
| **strict** | Read only | None | No |
| **balanced** | Read/Write specific | Whitelisted | Yes |
| **permissive** | Full access | All domains | Yes |

---

## Security Model

### Plugin Privileges

```typescript
interface PluginPrivileges {
  // Data access
  dataRead: string[];      // Collections plugin can read
  dataWrite: string[];     // Collections plugin can write
  
  // UI access
  uiInject: boolean;       // Can inject UI components
  menuModify: boolean;     // Can modify navigation menu
  settingsAccess: boolean; // Can access settings
  
  // System access
  networkAccess: boolean;  // Can make external HTTP requests
  fileSystemAccess: boolean; // Can read/write files (limited)
  executeCode: boolean;    // Can execute dynamic code (WASM/scripts)
}
```

### Sandboxing Tiers

The plugin system implements a **tiered sandbox architecture** based on plugin trust level:

| Tier | Plugin Category | Execution Environment | Timeout |
|------|-----------------|----------------------|---------|
| **Trusted** | `builtin` | Direct execution, full access | 5000ms |
| **Verified** | `verified`, `private` | Proxy-sandboxed iframe | 2000ms |
| **Community** | `community` | Web Worker with blocked globals | 1000ms |

```typescript
// src/utils/PluginSandbox.ts
const TIER_CONFIGS = {
  trusted: {
    allowedGlobals: ['*'],
    blockedGlobals: [],
  },
  verified: {
    allowedGlobals: ['console', 'Promise', 'Array', 'Object', ...],
    blockedGlobals: ['localStorage', 'fetch', 'document', 'window', ...],
  },
  community: {
    allowedGlobals: ['console', 'Promise', 'Math', 'JSON', ...],
    blockedGlobals: ['localStorage', 'fetch', 'eval', 'Function', 'Proxy', ...],
  },
};
```

#### When `sandboxMode: true`:

1. **WASM Isolation**: Engine plugins run in WebAssembly sandbox
2. **Iframe Isolation**: UI plugins render in sandboxed iframes
3. **Worker Isolation**: Heavy computations in Web Workers
4. **Network Proxy**: External requests through approved proxy

### Hook Security (Circuit Breaker)

The hook system implements **timeout + circuit breaker** protection:

```typescript
// Security constants
const HOOK_TIMEOUT_MS = 200;        // Max execution time per hook
const MAX_HOOK_FAILURES = 3;        // Failures before temporary ban
const HOOK_BAN_DURATION_MS = 60000; // 1 minute ban duration

// When a plugin's hook fails 3 times, it's temporarily banned
```

#### Hook Execution Flow

```
Hook Request → Check Ban Status → Execute with Timeout → Track Result
                     ↓                                          ↓
              If banned: Skip                           If failed: Record
                     ↓                                          ↓
              Continue to next                      If 3 failures: Ban for 60s
```

#### Blocked Hook Behaviors

| Behavior | Detection | Response |
|----------|------------|----------|
| Throwing errors | try/catch | Record failure, continue |
| Infinite loop | Timeout detection | Kill execution |
| Blocking other plugins | Exception propagation | Isolate error |
| Slow execution | Performance timing | Log warning |

### Signature Verification

```typescript
interface PluginSignature {
  algorithm: 'RS256' | 'ES256';
  publicKey: string;
  signature: string;
  timestamp: string;
  expiresAt: string;
}
```

### Code Validation

Before execution, plugin code is validated for dangerous patterns:

```typescript
const DANGEROUS_PATTERNS = [
  /eval\s*\(/,           // eval() is not allowed
  /Function\s*\(/,       // Function constructor blocked
  /document\.cookie/,    // Cookie access blocked
  /localStorage/,        // Requires permission
  /XMLHttpRequest/,      // Requires network permission
  /WebSocket/,           // Requires network permission
];
```

---

## Go WASM Integration

### Shared Engine Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Go Shared Codebase                            │
│                        /internal                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   grading/   │  │    fees/     │  │  reporting/  │          │
│  │  - engine.go │  │ - calculate  │  │  - generate  │          │
│  │  - strategies│  │  - discounts │  │  - templates │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │  scripting/  │  │    sync/     │                             │
│  │  - lua.go    │  │  - conflict  │                             │
│  │  - js.go     │  │  - merge     │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
            │                    │
            ▼                    ▼
┌───────────────────┐  ┌───────────────────┐
│   cmd/saas/       │  │   cmd/wasm/       │
│   Go Backend      │  │   WASM Export     │
│                   │  │                   │
│ go build ./cmd/saas│  │GOOS=wasip1 go build ./cmd/wasm│
└───────────────────┘  └───────────────────┘
```

### WASM Bridge

```go
// pkg/wasm/bridge.go
package wasm

import (
    "syscall/js"
    "schoolpilot/internal/grading"
)

func ExportGradingEngine(engine *grading.Engine) {
    js.Global().Set("spGradingCalculate", js.FuncOf(
        func(this js.Value, args []js.Value) interface{} {
            studentsJSON := args[0].String()
            configJSON := args[1].String()
            
            result := engine.Calculate(
                parseStudents(studentsJSON),
                parseConfig(configJSON),
            )
            
            return js.ValueOf(toJSON(result))
        },
    ))
}
```

### TypeScript Integration

```typescript
// src/services/GoEngineBridge.ts
declare global {
  function spGradingCalculate(students: string, config: string): string;
}

export class GoEngineBridge {
  private wasmReady = false;
  
  async initialize(): Promise<void> {
    const go = new Go();
    const { instance } = await WebAssembly.instantiateStreaming(
      fetch('/wasm/schoolpilot-engines.wasm'),
      go.importObject
    );
    go.run(instance);
    this.wasmReady = true;
  }
  
  async calculateGrades(students: Student[], config: Config): Promise<Result[]> {
    if (this.wasmReady) {
      return JSON.parse(spGradingCalculate(
        JSON.stringify(students),
        JSON.stringify(config)
      ));
    }
    return this.fallbackCalculate(students, config);
  }
}
```

---

## Implementation Guide

### Creating a Plugin

1. **Create plugin directory**
```bash
mkdir -p src/plugins/my-plugin
```

2. **Define manifest**
```typescript
// src/plugins/my-plugin/index.ts
import type { PluginManifest, PluginModule } from '../types';

export const manifest: PluginManifest = {
  id: 'com.example.my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  type: 'module',
  entry: './index.ts',
  hooks: ['data.beforeSave'],
};

const module: PluginModule = {
  async activate(context) {
    context.api.addHook('data.beforeSave', (data) => {
      // Transform data
      return data;
    });
  },
};

export default { manifest, module };
```

3. **Register with PluginManager**
```typescript
import { getPlugins } from '../plugins';
import myPlugin from '../plugins/my-plugin';

const manager = getPlugins();
await manager.loadPlugin(myPlugin.manifest);
```

### Plugin Settings

```typescript
settings: [
  {
    key: 'apiKey',
    label: 'API Key',
    type: 'string',
    required: true,
    description: 'Your API key for the service',
  },
  {
    key: 'syncInterval',
    label: 'Sync Interval',
    type: 'number',
    defaultValue: 300,
    validation: { min: 60, max: 3600 },
  },
  {
    key: 'features',
    label: 'Enabled Features',
    type: 'multiselect',
    options: [
      { label: 'Sync', value: 'sync' },
      { label: 'Import', value: 'import' },
      { label: 'Export', value: 'export' },
    ],
  },
],
```

### Publishing to Marketplace

1. **Prepare plugin package**
```bash
my-plugin/
├── plugin.json      # Manifest
├── index.js         # Compiled entry point
├── assets/          # Static assets
└── README.md        # Documentation
```

2. **Sign the package**
```bash
sp3 sign my-plugin/ --key private.key
```

3. **Publish**
```bash
sp3 publish my-plugin/ --registry https://marketplace.schoolpilot3.com
```

---

## Appendix

### File Structure

```
src/plugins/
├── types.ts                 # Type definitions
├── PluginManager.ts         # Core manager
├── PluginsProvider.tsx      # React context
├── usePlugins.ts           # React hook
├── index.ts                # Exports
└── builtin/
    ├── whitelabel/         # White-label plugin
    ├── grading-engine/     # Grading engine POC
    └── fee-calculator/     # Fee calculator POC

src/services/
└── PluginMarketplace.ts    # Marketplace service

src/modules/settings/pages/
└── PluginSettingsPage.tsx  # Admin UI
```

### Version Compatibility

| SchoolPilot Version | Plugin API Version |
|---------------------|-------------------|
| 1.0.x               | 1.0               |
| 1.1.x               | 1.1               |
| 2.0.x               | 2.0               |

### Support Channels

- **Documentation**: `/docs/guides/plugin-dev-guide.md`
- **Examples**: `/src/plugins/builtin/`
- **Community**: GitHub Discussions
- **Enterprise Support**: support@schoolpilot3.com

---

## Builtin Plugins Reference

SchoolPilot3 ships with several builtin plugins that provide core functionality.

### White-Label Plugin

**Location**: `src/plugins/builtin/whitelabel/`

**Purpose**: Customize application branding and labels.

**Features**:
- Override application name and logo
- Customize UI labels and text
- Hide/show specific features
- Apply custom color schemes

**Configuration**:
```typescript
// Plugin manifest
{
  id: 'com.schoolpilot.whitelabel',
  name: 'White Label',
  type: 'whitelabel',
  settings: [
    {
      key: 'appName',
      label: 'Application Name',
      type: 'string',
      defaultValue: 'SchoolPilot3',
    },
    {
      key: 'logoUrl',
      label: 'Logo URL',
      type: 'string',
    },
    {
      key: 'primaryColor',
      label: 'Primary Color',
      type: 'color',
      defaultValue: '#3B82F6',
    },
  ],
}
```

**Hooks**:
- `ui.branding.header` - Modify header branding
- `ui.branding.title` - Override page title
- `ui.branding.logo` - Provide custom logo
- `ui.label.resolve` - Override UI labels

---

### Grading Engine Plugin

**Location**: `src/plugins/builtin/grading-engine/`

**Purpose**: Advanced grading calculations and strategies.

**Features**:
- Weighted average calculations
- Points-based grading
- Custom grading strategies
- Grade normalization
- Statistical analysis

**Configuration**:
```typescript
// Plugin manifest
{
  id: 'com.schoolpilot.grading-engine',
  name: 'Grading Engine',
  type: 'engine',
  engine: {
    wasmFile: './grading-engine.wasm',
    exports: ['calculateGrades', 'normalizeScores', 'generateReport'],
  },
  settings: [
    {
      key: 'defaultStrategy',
      label: 'Default Strategy',
      type: 'select',
      options: [
        { label: 'Weighted Average', value: 'weighted' },
        { label: 'Points-Based', value: 'points' },
        { label: 'Percentage', value: 'percentage' },
      ],
    },
  ],
}
```

**Hooks**:
- `grading.beforeCalculate` - Pre-process grade data
- `grading.afterCalculate` - Post-process results
- `grading.validateConfig` - Validate grading configuration

**API**:
```typescript
// Using the grading engine
const engine = plugins.getEngine('com.schoolpilot.grading-engine');
const results = await engine.calculateGrades(students, config);
```

---

### Fee Calculator Plugin

**Location**: `src/plugins/builtin/fee-calculator/`

**Purpose**: Calculate fees with discounts, penalties, and payment plans.

**Features**:
- Base fee calculation
- Discount application
- Late fee penalties
- Payment plan generation
- Multi-currency support

**Configuration**:
```typescript
// Plugin manifest
{
  id: 'com.schoolpilot.fee-calculator',
  name: 'Fee Calculator',
  type: 'module',
  settings: [
    {
      key: 'currency',
      label: 'Default Currency',
      type: 'select',
      options: ['USD', 'EUR', 'GBP', 'NGN'],
    },
    {
      key: 'lateFeePercentage',
      label: 'Late Fee %',
      type: 'number',
      defaultValue: 5,
    },
    {
      key: 'enableDiscounts',
      label: 'Enable Discounts',
      type: 'boolean',
      defaultValue: true,
    },
  ],
}
```

**Hooks**:
- `fees.beforeCalculate` - Pre-process fee input
- `fees.afterCalculate` - Post-process fee results
- `fees.applyDiscounts` - Apply discount logic

**API**:
```typescript
// Calculate fees
const calculator = plugins.getPlugin('com.schoolpilot.fee-calculator');
const feeBreakdown = await calculator.calculate({
  baseAmount: 1000,
  discounts: [{ type: 'sibling', percentage: 10 }],
  dueDate: '2024-12-31',
});
```

---

### Plugin Comparison

| Plugin | Type | Purpose | WASM |
|--------|------|---------|------|
| **White-Label** | whitelabel | Branding customization | No |
| **Grading Engine** | engine | Grade calculations | Yes |
| **Fee Calculator** | module | Fee calculations | No |

---

### Enabling/Disabling Builtin Plugins

Builtin plugins can be controlled through the Plugin Settings page:

```typescript
// Check if a builtin plugin is enabled
const isEnabled = pluginManager.isPluginEnabled('com.schoolpilot.whitelabel');

// Disable a builtin plugin
await pluginManager.disablePlugin('com.schoolpilot.whitelabel');

// Re-enable a builtin plugin
await pluginManager.enablePlugin('com.schoolpilot.whitelabel');
```

Note: Some builtin plugins may be required for core functionality and cannot be disabled.
