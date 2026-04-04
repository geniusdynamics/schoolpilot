# Unified Configuration System

A centralized configuration management system for SchoolPilot3 that provides a single source of truth for all application settings.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration Sources](#configuration-sources)
4. [Core Components](#core-components)
5. [Configuration Schema](#configuration-schema)
6. [Feature Flags](#feature-flags)
7. [Database Configuration](#database-configuration)
8. [Migration System](#migration-system)
9. [Usage Examples](#usage-examples)
10. [Environment Variables](#environment-variables)

---

## Overview

The Unified Configuration System consolidates all configuration management into a single, type-safe, validated system. It supports multiple configuration sources with a clear priority order and provides migration utilities for seamless updates.

### Key Features

- **Single Source of Truth**: All config in one place
- **Type Safety**: Full TypeScript support
- **Validation**: Schema-based validation
- **Multiple Sources**: Environment, files, localStorage
- **Migration**: Automatic config migration
- **Feature Flags**: Runtime feature toggling

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Unified Configuration System                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Configuration Sources                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │   │
│  │  │   Env    │ │   File   │ │  Local   │ │ Default│ │   │
│  │  │   Vars   │ │  Config  │ │ Storage  │ │ Values │ │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │   │
│  │       └─────────────┴─────────────┴──────────┘      │   │
│  │                      │                              │   │
│  │                      ▼                              │   │
│  │           ┌─────────────────────┐                   │   │
│  │           │   Merge & Validate  │                   │   │
│  │           │   (Priority Order)  │                   │   │
│  │           └──────────┬──────────┘                   │   │
│  │                      │                              │   │
│  │                      ▼                              │   │
│  │           ┌─────────────────────┐                   │   │
│  │           │   Unified Config    │                   │   │
│  │           │   (Single Source)   │                   │   │
│  │           └─────────────────────┘                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Configuration Consumers                 │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │   │
│  │  │ Database │ │   Tabs   │ │ Plugins  │ │  Auth  │ │   │
│  │  │  Config  │ │  Config  │ │  Config  │ │ Config │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration Sources

Configuration is loaded from multiple sources in priority order (highest to lowest):

1. **Environment Variables** - Deployment-specific overrides
2. **Configuration Files** - JSON/YAML config files
3. **Local Storage** - User preferences
4. **Default Values** - Application defaults

### Priority Resolution

```typescript
// Final config = merge(Default, LocalStorage, File, Environment)
// Later sources override earlier ones
const config = {
  ...defaultConfig,
  ...localStorageConfig,
  ...fileConfig,
  ...environmentConfig,
};
```

---

## Core Components

### unifiedConfig.ts

**Location**: `src/config/unifiedConfig.ts`

The main configuration object that aggregates all settings.

```typescript
import { unifiedConfig } from '@/config/unifiedConfig';

// Access configuration
const dbConfig = unifiedConfig.database;
const tabConfig = unifiedConfig.tabs;
const featureFlags = unifiedConfig.features;
```

### Configuration Interface

```typescript
interface UnifiedConfig {
  // Application
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    debug: boolean;
  };
  
  // Database
  database: DatabaseConfig;
  
  // Tabs
  tabs: TabbedModeConfig;
  
  // Features
  features: FeatureFlags;
  
  // Auth
  auth: AuthConfig;
  
  // Plugins
  plugins: PluginConfig;
  
  // UI
  ui: UIConfig;
}
```

---

## Configuration Schema

### Database Configuration

**Location**: `src/config/databaseConfigSchema.ts`

```typescript
interface DatabaseConfig {
  provider: 'sqlite-file' | 'sqlite-wasm' | 'pouchdb' | 'rxdb' | 'backend-api' | 'hybrid';
  config: {
    databasePath?: string;
    enableWAL?: boolean;
    enableForeignKeys?: boolean;
    cacheSize?: number;
    busyTimeout?: number;
  };
  connectionPool: {
    minConnections: number;
    maxConnections: number;
    acquireTimeoutMs: number;
    idleTimeoutMs: number;
  };
  backup: {
    enableAutomaticBackup: boolean;
    backupInterval: number;
    maxBackupFiles: number;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
  };
  security: {
    auditEnabled: boolean;
    retentionDays: number;
    validationEnabled: boolean;
    sanitizationEnabled: boolean;
  };
}
```

### Tabbed Mode Configuration

**Location**: `src/config/tabbedModeConfig.ts`

```typescript
interface TabbedModeConfig {
  globalEnabled: boolean;
  enablePerModuleControl: boolean;
  moduleOverrides: Record<string, boolean>;
  maxTabs: number;
  enablePersistence: boolean;
  enableDragDrop: boolean;
  enableHierarchical: boolean;
}

// Example
const tabbedConfig: TabbedModeConfig = {
  globalEnabled: true,
  enablePerModuleControl: true,
  moduleOverrides: {
    dashboard: true,
    settings: true,
    academics: true,
    finance: false,  // Disabled for finance module
  },
  maxTabs: 20,
  enablePersistence: true,
  enableDragDrop: true,
  enableHierarchical: true,
};
```

### Feature Flags

**Location**: `src/services/tabbedModeFeatureFlag.ts`

```typescript
interface FeatureFlags {
  // Tab System
  tabbedWorkspace: boolean;
  hierarchicalTabs: boolean;
  tabPersistence: boolean;
  
  // Plugins
  pluginSystem: boolean;
  marketplace: boolean;
  builtinPlugins: boolean;
  
  // Database
  multiProvider: boolean;
  connectionPooling: boolean;
  automaticBackup: boolean;
  
  // UI
  darkMode: boolean;
  newNavigation: boolean;
  topOverflowMenu: boolean;
  
  // Modules
  academics: boolean;
  finance: boolean;
  hr: boolean;
  inventory: boolean;
  library: boolean;
  nutrition: boolean;
}
```

---

## Feature Flags

Feature flags enable runtime toggling of features without code changes.

### Using Feature Flags

```typescript
import { featureFlags } from '@/services/tabbedModeFeatureFlag';

// Check if feature is enabled
if (featureFlags.isEnabled('tabbedWorkspace')) {
  // Render tabbed workspace
}

// Check module-specific feature
if (featureFlags.isModuleEnabled('academics')) {
  // Show academics module
}

// Enable/disable at runtime
featureFlags.enable('darkMode');
featureFlags.disable('marketplace');
```

### Feature Flag Configuration

```typescript
// config/features.json
{
  "tabbedWorkspace": true,
  "hierarchicalTabs": true,
  "pluginSystem": true,
  "marketplace": false,
  "darkMode": true,
  "modules": {
    "academics": true,
    "finance": true,
    "hr": false
  }
}
```

---

## Database Configuration

### Provider Selection

The system automatically selects the best database provider based on capabilities:

```typescript
// src/services/database/ProviderSelector.ts
class ProviderSelector {
  selectProvider(capabilities: SystemCapabilities): DatabaseProviderType {
    if (capabilities.supportsSQLiteWASM) {
      return 'sqlite-wasm';
    }
    if (capabilities.supportsIndexedDB) {
      return 'pouchdb';
    }
    return 'backend-api';
  }
}
```

### Runtime Configuration

**Location**: `src/config/databaseConfigRuntime.ts`

```typescript
// Runtime database configuration
export const runtimeDatabaseConfig = {
  // Override with environment-specific settings
  provider: import.meta.env.VITE_DB_PROVIDER || 'sqlite-wasm',
  config: {
    databasePath: import.meta.env.VITE_DB_PATH || './data/school.db',
    enableWAL: import.meta.env.VITE_DB_WAL !== 'false',
  },
};
```

### Environment Variables

**Location**: `src/config/databaseEnvVars.ts`

```typescript
// Database-related environment variables
export const databaseEnvVars = {
  DB_PROVIDER: process.env.DB_PROVIDER,
  DB_PATH: process.env.DB_PATH,
  DB_ENABLE_WAL: process.env.DB_ENABLE_WAL,
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN || '2'),
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX || '10'),
  DB_BACKUP_ENABLED: process.env.DB_BACKUP_ENABLED === 'true',
  DB_AUDIT_ENABLED: process.env.DB_AUDIT_ENABLED === 'true',
};
```

---

## Migration System

**Location**: `src/config/ConfigurationMigration.ts`

Handles migration of configuration between versions.

### Migration Process

```typescript
class ConfigurationMigration {
  // Current config version
  private currentVersion = '2.0.0';
  
  // Migration handlers
  private migrations: Record<string, MigrationFn> = {
    '1.0.0->2.0.0': migrateV1ToV2,
    '1.5.0->2.0.0': migrateV1_5ToV2,
  };
  
  // Migrate configuration
  migrate(config: any): UnifiedConfig {
    const configVersion = config.version || '1.0.0';
    
    if (configVersion === this.currentVersion) {
      return config;
    }
    
    const migrationKey = `${configVersion}->${this.currentVersion}`;
    const migration = this.migrations[migrationKey];
    
    if (migration) {
      return migration(config);
    }
    
    throw new Error(`No migration path from ${configVersion} to ${this.currentVersion}`);
  }
}
```

### Example Migration

```typescript
// Migrate from v1 to v2
function migrateV1ToV2(oldConfig: V1Config): V2Config {
  return {
    version: '2.0.0',
    app: {
      ...oldConfig.app,
      environment: oldConfig.environment,
    },
    database: {
      provider: oldConfig.dbProvider || 'sqlite-wasm',
      config: {
        databasePath: oldConfig.dbPath,
        enableWAL: true,
      },
      // New fields with defaults
      connectionPool: {
        minConnections: 2,
        maxConnections: 10,
        acquireTimeoutMs: 30000,
        idleTimeoutMs: 300000,
      },
      backup: {
        enableAutomaticBackup: false,
        backupInterval: 86400000,
        maxBackupFiles: 30,
        compressionEnabled: true,
        encryptionEnabled: false,
      },
      security: {
        auditEnabled: true,
        retentionDays: 365,
        validationEnabled: true,
        sanitizationEnabled: true,
      },
    },
    // Migrate other sections...
  };
}
```

---

## Usage Examples

### Basic Configuration Access

```typescript
import { unifiedConfig } from '@/config/unifiedConfig';

// Get database configuration
const dbConfig = unifiedConfig.database;
console.log(dbConfig.provider); // 'sqlite-wasm'

// Get tabbed mode settings
const tabConfig = unifiedConfig.tabs;
console.log(tabConfig.maxTabs); // 20

// Check feature flags
if (unifiedConfig.features.tabbedWorkspace) {
  // Enable tabbed workspace
}
```

### React Hook Usage

```typescript
import { useConfig } from '@/hooks/useConfig';

function MyComponent() {
  const config = useConfig();
  
  return (
    <div>
      {config.features.darkMode && <DarkModeToggle />}
      <DatabaseStatus provider={config.database.provider} />
    </div>
  );
}
```

### Configuration Updates

```typescript
import { updateConfig } from '@/config/unifiedConfig';

// Update configuration at runtime
updateConfig({
  tabs: {
    maxTabs: 30,
  },
});

// Update feature flag
updateConfig({
  features: {
    darkMode: true,
  },
});
```

### Module-Specific Configuration

```typescript
// Check if tabbed mode is enabled for specific module
function isTabbedModeEnabled(moduleId: string): boolean {
  const config = unifiedConfig.tabs;
  
  if (!config.globalEnabled) {
    return false;
  }
  
  if (!config.enablePerModuleControl) {
    return true;
  }
  
  return config.moduleOverrides[moduleId] ?? true;
}

// Usage
const academicsTabbed = isTabbedModeEnabled('academics');
const financeTabbed = isTabbedModeEnabled('finance');
```

---

## Environment Variables

### Required Variables

```bash
# Application
NODE_ENV=production
VITE_APP_VERSION=2.0.0

# Database
DB_PROVIDER=sqlite-wasm
DB_PATH=./data/school.db
DB_ENABLE_WAL=true

# Features
VITE_ENABLE_TABS=true
VITE_ENABLE_PLUGINS=true
VITE_ENABLE_MARKETPLACE=false
```

### Optional Variables

```bash
# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_TIMEOUT=30000

# Backup
DB_BACKUP_ENABLED=true
DB_BACKUP_INTERVAL=86400000
DB_BACKUP_COMPRESSION=true

# Security
DB_AUDIT_ENABLED=true
DB_AUDIT_RETENTION=365

# Debug
DEBUG=database:*,tabs:*
```

### Configuration File

```json
{
  "app": {
    "name": "SchoolPilot3",
    "version": "2.0.0",
    "environment": "production",
    "debug": false
  },
  "database": {
    "provider": "sqlite-wasm",
    "config": {
      "databasePath": "./data/school.db",
      "enableWAL": true,
      "enableForeignKeys": true
    }
  },
  "tabs": {
    "globalEnabled": true,
    "maxTabs": 20,
    "enablePersistence": true
  },
  "features": {
    "tabbedWorkspace": true,
    "pluginSystem": true,
    "darkMode": false
  }
}
```

---

## Best Practices

1. **Environment-Specific Config**
   - Use environment variables for deployment-specific settings
   - Keep sensitive data in environment variables, not files

2. **Default Values**
   - Always provide sensible defaults
   - Document all configuration options

3. **Validation**
   - Validate configuration on startup
   - Fail fast with clear error messages

4. **Migration**
   - Version your configuration schema
   - Provide migration paths between versions

5. **Feature Flags**
   - Use feature flags for experimental features
   - Allow runtime toggling where appropriate

---

## Related Documentation

- [Database README](../database/README.md) - Database configuration details
- [Plugin Architecture](../architecture/PLUGIN_ARCHITECTURE_SPEC.md) - Plugin configuration
- [Tab System Architecture](../architecture/tab-system.md) - Tab configuration
