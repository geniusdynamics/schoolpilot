# Backend Integration Plugin Architecture

## Overview

This document outlines the refactoring of backend API integrations (ERPNext, Frappe, SaaS backends, BigCapital, etc.) into a plugin-based architecture. This approach decouples backend-specific implementations from the core system while maintaining high integration capabilities.

## Goals

1. **Decouple Backend Systems**: Move backend-specific code (ERPNext, Frappe, custom APIs) into plugins
2. **Maintain Core Abstractions**: Keep core data layer and sync engine in the main system
3. **Enable Extensibility**: Allow easy addition of new backend systems without modifying core
4. **Leverage Frappe React SDK**: Integrate the official Frappe React SDK for Frappe/ERPNext backends
5. **Plugin-Based Backend Selection**: Allow runtime selection of backend providers via plugins

## Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SchoolPilot3 Core                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Core Data Layer                                │  │
│  │  - UnifiedDataService                                             │  │
│  │  - DatabaseProviderFactory                                        │  │
│  │  - SyncManager (generic)                                          │  │
│  │  - ConflictResolver (generic)                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                  │                                       │
│                                  ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Backend Provider Interface                           │  │
│  │  - IBackendProvider (abstract interface)                         │  │
│  │  - BackendProviderRegistry                                        │  │
│  │  - BackendProviderFactory                                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                  │                                       │
└──────────────────────────────────┼───────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Backend Plugins                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  ERPNext Plugin  │  │  Frappe Plugin   │  │  SaaS Backend Plugin │  │
│  │                  │  │                  │  │                      │  │
│  │  - ERPNext       │  │  - Frappe React  │  │  - Custom Go API     │  │
│  │    Provider      │  │    SDK           │  │  - REST/GraphQL      │  │
│  │  - DocType       │  │  - useFrappeAuth │  │  - JWT Auth          │  │
│  │    Mappings      │  │  - useFrappeGet  │  │                      │  │
│  │  - Education     │  │  - useFrappePost │  │                      │  │
│  │    Domain        │  │                  │  │                      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ BigCapital       │  │  Custom API      │  │  Generic REST        │  │
│  │ Plugin           │  │  Plugin          │  │  Plugin              │  │
│  │                  │  │                  │  │                      │  │
│  │  - Accounting    │  │  - School-       │  │  - Configurable      │  │
│  │    Integration   │  │    specific      │  │    Endpoints         │  │
│  │  - Invoice Sync  │  │    Backend       │  │  - Field Mapping     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Abstractions (Remain in Core)

### 1. IBackendProvider Interface

```typescript
// src/services/backend/IBackendProvider.ts
export interface IBackendProvider {
  // Metadata
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: BackendType;
  
  // Lifecycle
  initialize(config: BackendConfig): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<BackendStatus>;
  
  // Authentication
  authenticate(credentials: AuthCredentials): Promise<AuthToken>;
  refreshAuth(): Promise<AuthToken>;
  isAuthenticated(): boolean;
  
  // CRUD Operations
  create(entity: string, data: Record): Promise<Record>;
  read(entity: string, id: string): Promise<Record | null>;
  update(entity: string, id: string, data: Partial<Record>): Promise<Record>;
  delete(entity: string, id: string): Promise<boolean>;
  query(entity: string, query: Query): Promise<Record[]>;
  
  // Batch Operations
  batchCreate(entity: string, records: Record[]): Promise<BatchResult>;
  batchUpdate(entity: string, updates: Array<{id: string; data: Partial<Record>}>): Promise<BatchResult>;
  batchDelete(entity: string, ids: string[]): Promise<BatchResult>;
  
  // Sync Operations
  getChanges(entity: string, since: Date): Promise<ChangeSet>;
  pushChanges(entity: string, operations: SyncOperation[]): Promise<SyncResult>;
  resolveConflict(conflict: Conflict, resolution: ConflictResolution): Promise<Record>;
  
  // File Operations
  uploadFile(file: FileUpload): Promise<FileRecord>;
  downloadFile(fileId: string): Promise<Blob>;
  
  // Capabilities
  getCapabilities(): BackendCapabilities;
  supportsEntity(entity: string): boolean;
  
  // Entity Mapping
  mapToBackend(entity: string, localRecord: Record): any;
  mapFromBackend(entity: string, backendRecord: any): Record;
}
```

### 2. BackendProviderRegistry

```typescript
// src/services/backend/BackendProviderRegistry.ts
export class BackendProviderRegistry {
  private providers = new Map<string, IBackendProvider>();
  private activeProvider: IBackendProvider | null = null;
  
  register(provider: IBackendProvider): void;
  unregister(providerId: string): void;
  get(providerId: string): IBackendProvider | undefined;
  getAll(): IBackendProvider[];
  setActive(providerId: string): void;
  getActive(): IBackendProvider | null;
}
```

### 3. Generic Sync Engine (Core)

```typescript
// src/services/sync/GenericSyncEngine.ts
export class GenericSyncEngine {
  constructor(
    private provider: IBackendProvider,
    private localStore: IDatabaseProvider,
    private config: SyncConfig
  ) {}
  
  async syncEntity(entity: string): Promise<SyncResult>;
  async syncAll(): Promise<SyncResult[]>;
  async resolveConflicts(conflicts: Conflict[]): Promise<void>;
  
  // Uses provider's getChanges() and pushChanges()
  // Conflict resolution logic remains generic
}
```

## Plugin Structure

### Backend Integration Plugin Type

```typescript
// src/plugins/types.ts (extend existing)
export interface BackendIntegrationManifest extends PluginManifest {
  type: 'integration';
  integration: {
    backendType: BackendType;
    providerId: string;
    providerClass: string;
    
    // Supported entities
    entities: string[];
    
    // Entity mappings
    entityMappings: Record<string, EntityMapping>;
    
    // Authentication methods
    authMethods: AuthType[];
    
    // Capabilities
    capabilities: BackendCapabilities;
    
    // Configuration schema
    configSchema: PluginSetting[];
  };
}

export interface EntityMapping {
  localEntity: string;
  backendEntity: string;
  fieldMappings: Record<string, string>;
  transforms?: Record<string, TransformFunction>;
}
```

## Implementation Plan

### Phase 1: Core Abstractions (Week 1)

1. **Create IBackendProvider Interface**
   - Define complete interface contract
   - Add TypeScript types
   - Document all methods

2. **Implement BackendProviderRegistry**
   - Provider registration/discovery
   - Active provider management
   - Plugin integration hooks

3. **Refactor Existing BackendAPIProvider**
   - Implement IBackendProvider interface
   - Keep as fallback/generic provider
   - Move to core (not a plugin initially)

4. **Update DatabaseProviderFactory**
   - Integrate with BackendProviderRegistry
   - Support plugin-provided backends
   - Maintain backward compatibility

### Phase 2: ERPNext Plugin (Week 2)

1. **Create ERPNext Plugin Structure**
   ```
   src/plugins/builtin/erpnext-integration/
   ├── index.ts
   ├── plugin.json
   ├── ERPNextProvider.ts
   ├── ERPNextClient.ts
   ├── mappings/
   │   ├── student.ts
   │   ├── employee.ts
   │   ├── course.ts
   │   └── fees.ts
   ├── types.ts
   └── README.md
   ```

2. **Implement ERPNextProvider**
   - Implement IBackendProvider
   - Use existing ERPNextClient
   - Add DocType mappings
   - Education domain support

3. **Plugin Manifest**
   ```json
   {
     "id": "com.schoolpilot.erpnext-integration",
     "name": "ERPNext Integration",
     "version": "1.0.0",
     "type": "integration",
     "integration": {
       "backendType": "erpnext",
       "providerId": "erpnext",
       "entities": ["Student", "Employee", "Course", "Fees", ...],
       "authMethods": ["apikey", "oauth2"]
     }
   }
   ```

### Phase 3: Frappe React SDK Plugin (Week 3)

1. **Install Frappe React SDK**
   ```bash
   npm install frappe-react-sdk
   ```

2. **Create Frappe Plugin**
   ```
   src/plugins/builtin/frappe-integration/
   ├── index.ts
   ├── plugin.json
   ├── FrappeProvider.ts
   ├── hooks/
   │   ├── useFrappeIntegration.ts
   │   └── useFrappeSync.ts
   └── README.md
   ```

3. **Implement FrappeProvider**
   - Wrap Frappe React SDK
   - Implement IBackendProvider
   - Use SDK hooks internally
   - Provide React hooks for components

4. **Integration Example**
   ```typescript
   // In FrappeProvider.ts
   import { FrappeProvider as SDKProvider, useFrappeAuth, useFrappeGetDoc } from 'frappe-react-sdk';
   
   export class FrappeProvider implements IBackendProvider {
     private sdk: FrappeContext;
     
     async read(entity: string, id: string): Promise<Record | null> {
       const { data } = await this.sdk.db.getDoc(entity, id);
       return this.mapFromBackend(entity, data);
     }
   }
   ```

### Phase 4: SaaS Backend Plugin (Week 4)

1. **Create SaaS Backend Plugin**
   ```
   src/plugins/builtin/saas-backend/
   ├── index.ts
   ├── plugin.json
   ├── SaaSProvider.ts
   ├── GraphQLClient.ts
   └── RESTClient.ts
   ```

2. **Support Multiple Protocols**
   - REST API
   - GraphQL
   - gRPC (future)

3. **Configuration UI**
   - Endpoint configuration
   - Authentication setup
   - Entity mapping builder

### Phase 5: Generic REST Plugin (Week 5)

1. **Create Configurable REST Plugin**
   - User-defined endpoints
   - Field mapping UI
   - Transform functions
   - Authentication templates

2. **Plugin Settings UI**
   - Visual endpoint builder
   - Field mapper
   - Test connection
   - Import/export config

### Phase 6: Migration & Testing (Week 6)

1. **Migration Guide**
   - Document migration steps
   - Provide migration scripts
   - Backward compatibility layer

2. **Testing**
   - Unit tests for each plugin
   - Integration tests
   - E2E sync tests
   - Performance benchmarks

## Plugin Examples

### ERPNext Plugin Manifest

```json
{
  "id": "com.schoolpilot.erpnext-integration",
  "name": "ERPNext Integration",
  "version": "1.0.0",
  "type": "integration",
  "description": "Connect to ERPNext for education management",
  "author": "SchoolPilot Team",
  "category": "verified",
  
  "integration": {
    "backendType": "erpnext",
    "providerId": "erpnext",
    "providerClass": "ERPNextProvider",
    
    "entities": [
      "Student",
      "Employee",
      "Course",
      "Program",
      "Fees",
      "Attendance"
    ],
    
    "entityMappings": {
      "students": {
        "localEntity": "students",
        "backendEntity": "Student",
        "fieldMappings": {
          "id": "name",
          "firstName": "first_name",
          "lastName": "last_name",
          "email": "student_email_id"
        }
      }
    },
    
    "authMethods": ["apikey", "oauth2"],
    
    "capabilities": {
      "fileUpload": true,
      "realtime": false,
      "batchOperations": true,
      "webhooks": true
    }
  },
  
  "settings": [
    {
      "key": "baseUrl",
      "label": "ERPNext Server URL",
      "type": "string",
      "required": true,
      "description": "Your ERPNext server URL (e.g., https://erp.school.com)"
    },
    {
      "key": "apiKey",
      "label": "API Key",
      "type": "string",
      "required": true
    },
    {
      "key": "apiSecret",
      "label": "API Secret",
      "type": "string",
      "required": true
    },
    {
      "key": "domain",
      "label": "Domain",
      "type": "select",
      "options": [
        {"label": "Education", "value": "education"},
        {"label": "Healthcare", "value": "healthcare"}
      ],
      "defaultValue": "education"
    },
    {
      "key": "syncInterval",
      "label": "Sync Interval (seconds)",
      "type": "number",
      "defaultValue": 300,
      "validation": {"min": 60, "max": 3600}
    }
  ],
  
  "hooks": [
    "backend.provider.register",
    "sync.before",
    "sync.after"
  ]
}
```

### Frappe React SDK Plugin

```typescript
// src/plugins/builtin/frappe-integration/index.ts
import { PluginManifest, PluginModule, PluginContext } from '@/plugins/types';
import { FrappeProvider } from './FrappeProvider';
import { BackendProviderRegistry } from '@/services/backend/BackendProviderRegistry';

export const manifest: PluginManifest = {
  id: 'com.schoolpilot.frappe-integration',
  name: 'Frappe Integration',
  version: '1.0.0',
  type: 'integration',
  entry: './index.ts',
  description: 'Connect to Frappe Framework using official React SDK',
  category: 'verified',
  
  integration: {
    backendType: 'frappe',
    providerId: 'frappe',
    providerClass: 'FrappeProvider',
    entities: ['*'], // Supports all DocTypes
    authMethods: ['apikey', 'oauth2', 'jwt'],
    capabilities: {
      fileUpload: true,
      realtime: true,
      batchOperations: true,
      webhooks: true
    }
  },
  
  settings: [
    {
      key: 'siteUrl',
      label: 'Frappe Site URL',
      type: 'string',
      required: true
    },
    {
      key: 'authType',
      label: 'Authentication Type',
      type: 'select',
      options: [
        { label: 'API Key', value: 'apikey' },
        { label: 'OAuth2', value: 'oauth2' },
        { label: 'JWT', value: 'jwt' }
      ],
      defaultValue: 'apikey'
    }
  ]
};

const module: PluginModule = {
  async activate(context: PluginContext) {
    console.log('[Frappe Plugin] Activating...');
    
    // Get backend registry
    const registry = BackendProviderRegistry.getInstance();
    
    // Create and register provider
    const provider = new FrappeProvider(context.settings);
    await provider.initialize(context.settings);
    
    registry.register(provider);
    
    console.log('[Frappe Plugin] Activated successfully');
  },
  
  async deactivate() {
    console.log('[Frappe Plugin] Deactivating...');
    
    const registry = BackendProviderRegistry.getInstance();
    registry.unregister('frappe');
  }
};

export default { manifest, module };
```

### FrappeProvider Implementation

```typescript
// src/plugins/builtin/frappe-integration/FrappeProvider.ts
import { FrappeConfig, FrappeContext } from 'frappe-react-sdk';
import { IBackendProvider } from '@/services/backend/IBackendProvider';
import type { BackendConfig, Record, Query, AuthToken } from '@/services/backend/types';

export class FrappeProvider implements IBackendProvider {
  readonly id = 'frappe';
  readonly name = 'Frappe Framework';
  readonly version = '1.0.0';
  readonly type = 'frappe';
  
  private frappeContext: FrappeContext | null = null;
  private config: BackendConfig | null = null;
  
  async initialize(config: BackendConfig): Promise<void> {
    this.config = config;
    
    // Initialize Frappe SDK
    const frappeConfig: FrappeConfig = {
      url: config.baseUrl,
      tokenParams: {
        type: config.auth.type === 'apikey' ? 'token' : 'Bearer',
        useToken: true
      }
    };
    
    // SDK initialization would happen here
    // In React components, we'd use FrappeProvider wrapper
  }
  
  async authenticate(credentials: AuthCredentials): Promise<AuthToken> {
    // Use Frappe SDK's authentication
    const response = await fetch(`${this.config!.baseUrl}/api/method/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usr: credentials.username,
        pwd: credentials.password
      })
    });
    
    const data = await response.json();
    
    return {
      accessToken: data.message.api_key || data.message.token,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }
  
  async read(entity: string, id: string): Promise<Record | null> {
    const response = await fetch(
      `${this.config!.baseUrl}/api/resource/${entity}/${id}`,
      {
        headers: this.getHeaders()
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return this.mapFromBackend(entity, data.data);
  }
  
  async query(entity: string, query: Query): Promise<Record[]> {
    const filters = this.buildFilters(query);
    const response = await fetch(
      `${this.config!.baseUrl}/api/resource/${entity}?${filters}`,
      {
        headers: this.getHeaders()
      }
    );
    
    const data = await response.json();
    return data.data.map((item: any) => this.mapFromBackend(entity, item));
  }
  
  // ... implement other IBackendProvider methods
  
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `token ${this.config!.auth.apiKey}:${this.config!.auth.apiSecret}`
    };
  }
  
  private buildFilters(query: Query): string {
    // Convert Query to Frappe filters format
    const params = new URLSearchParams();
    
    if (query.filters) {
      params.append('filters', JSON.stringify(query.filters));
    }
    
    if (query.limit) {
      params.append('limit_page_length', query.limit.toString());
    }
    
    return params.toString();
  }
  
  mapFromBackend(entity: string, backendRecord: any): Record {
    // Generic mapping - can be overridden per entity
    return {
      id: backendRecord.name,
      ...backendRecord
    };
  }
  
  mapToBackend(entity: string, localRecord: Record): any {
    const { id, ...rest } = localRecord;
    return {
      name: id,
      ...rest
    };
  }
}
```

## React Component Integration

### Using Frappe SDK in Components

```typescript
// src/modules/academics/components/StudentList.tsx
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { useBackendProvider } from '@/hooks/useBackendProvider';

export function StudentList() {
  const { activeProvider } = useBackendProvider();
  
  // If Frappe plugin is active, use SDK hooks directly
  const { data: students, isLoading } = useFrappeGetDocList('Student', {
    fields: ['name', 'first_name', 'last_name', 'student_email_id'],
    filters: [['status', '=', 'Active']],
    orderBy: { field: 'first_name', order: 'asc' }
  });
  
  // Fallback to generic provider
  if (activeProvider?.type !== 'frappe') {
    // Use generic data fetching
  }
  
  return (
    <div>
      {isLoading ? 'Loading...' : students?.map(student => (
        <div key={student.name}>{student.first_name} {student.last_name}</div>
      ))}
    </div>
  );
}
```

## Configuration UI

### Backend Selection Page

```typescript
// src/modules/settings/pages/BackendConfigurationPage.tsx
export function BackendConfigurationPage() {
  const { plugins } = usePlugins();
  const backendPlugins = plugins.filter(p => p.manifest.type === 'integration');
  
  return (
    <div>
      <h1>Backend Configuration</h1>
      
      <div className="backend-plugins">
        {backendPlugins.map(plugin => (
          <BackendPluginCard
            key={plugin.manifest.id}
            plugin={plugin}
            onConfigure={() => configureBackend(plugin)}
            onActivate={() => activateBackend(plugin)}
          />
        ))}
      </div>
      
      <BackendTestConnection />
      <SyncConfiguration />
    </div>
  );
}
```

## Benefits

1. **Decoupling**: Backend systems are completely decoupled from core
2. **Extensibility**: New backends can be added as plugins without core changes
3. **Maintainability**: Each backend has its own codebase and tests
4. **Flexibility**: Users can choose and configure backends at runtime
5. **Official SDK Support**: Leverage Frappe React SDK for better integration
6. **Community Contributions**: Third parties can create backend plugins
7. **Testing**: Each backend can be tested independently

## Migration Path

### For Existing ERPNext Users

1. Install ERPNext plugin
2. Configure connection settings
3. Run migration script to transfer config
4. Test sync functionality
5. Deactivate old backend code

### For New Installations

1. Choose backend during setup
2. Install corresponding plugin
3. Configure connection
4. Start using immediately

## Future Enhancements

1. **Plugin Marketplace**: Discover and install backend plugins
2. **Multi-Backend Support**: Connect to multiple backends simultaneously
3. **Backend Routing**: Route entities to different backends
4. **Transformation Pipeline**: Visual data transformation builder
5. **Sync Monitoring**: Real-time sync status dashboard
6. **Conflict Resolution UI**: Visual conflict resolution interface

## Conclusion

This architecture provides a clean separation between core functionality and backend-specific implementations, enabling SchoolPilot3 to integrate with any backend system through plugins while maintaining a consistent internal API.
