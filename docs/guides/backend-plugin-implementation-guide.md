# Backend Plugin Implementation Guide

This guide walks you through creating a backend integration plugin for SchoolPilot3.

## Quick Start

### 1. Create Plugin Structure

```bash
mkdir -p src/plugins/builtin/my-backend-integration
cd src/plugins/builtin/my-backend-integration
```

Create these files:
- `plugin.json` - Plugin manifest
- `index.ts` - Plugin entry point
- `MyBackendProvider.ts` - Provider implementation
- `MyBackendClient.ts` - HTTP client
- `mappings.ts` - Entity mappings
- `README.md` - Documentation

### 2. Define Plugin Manifest

```json
{
  "id": "com.schoolpilot.my-backend",
  "name": "My Backend Integration",
  "version": "1.0.0",
  "type": "integration",
  "entry": "./index.ts",
  "description": "Connect to My Backend System",
  "category": "community",
  
  "integration": {
    "backendType": "custom",
    "providerId": "my-backend",
    "providerClass": "MyBackendProvider",
    "entities": ["students", "courses", "fees"],
    "authMethods": ["apikey", "oauth2"],
    "capabilities": {
      "fileUpload": true,
      "realtime": false,
      "batchOperations": true,
      "webhooks": false
    }
  },
  
  "settings": [
    {
      "key": "apiUrl",
      "label": "API URL",
      "type": "string",
      "required": true
    },
    {
      "key": "apiKey",
      "label": "API Key",
      "type": "string",
      "required": true
    }
  ]
}
```

### 3. Implement Provider

```typescript
// MyBackendProvider.ts
import type { IBackendProvider } from '@/services/backend/IBackendProvider';
import type { BackendConfig, Record, Query } from '@/services/backend/types';

export class MyBackendProvider implements IBackendProvider {
  readonly id = 'my-backend';
  readonly name = 'My Backend';
  readonly version = '1.0.0';
  readonly type = 'custom' as const;
  
  private client: MyBackendClient | null = null;
  
  async initialize(config: BackendConfig): Promise<void> {
    this.client = new MyBackendClient(config.baseUrl, config.auth.apiKey);
  }
  
  async create(entity: string, data: Record): Promise<Record> {
    const response = await this.client.post(`/${entity}`, data);
    return response.data;
  }
  
  async read(entity: string, id: string): Promise<Record | null> {
    const response = await this.client.get(`/${entity}/${id}`);
    return response.data;
  }
  
  // Implement other IBackendProvider methods...
}
```

### 4. Create Plugin Entry Point

```typescript
// index.ts
import type { PluginModule, PluginContext } from '@/plugins/types';
import { MyBackendProvider } from './MyBackendProvider';
import { BackendProviderRegistry } from '@/services/backend/BackendProviderRegistry';
import manifest from './plugin.json';

const module: PluginModule = {
  async activate(context: PluginContext) {
    const registry = BackendProviderRegistry.getInstance();
    const provider = new MyBackendProvider();
    
    await provider.initialize({
      id: 'my-backend',
      name: 'My Backend',
      type: 'custom',
      baseUrl: context.settings.apiUrl,
      auth: {
        type: 'apikey',
        apiKey: context.settings.apiKey,
      },
      sync: {
        enabled: true,
        interval: 300,
        conflictResolution: 'timestamp-wins',
        bidirectional: true,
      },
    });
    
    registry.register(provider);
  },
  
  async deactivate() {
    const registry = BackendProviderRegistry.getInstance();
    await registry.unregister('my-backend');
  },
};

export { manifest, module };
export default { manifest, module };
```

### 5. Register Plugin

```typescript
// src/plugins/BuiltinLoader.ts
const BUILTIN_PLUGINS: PluginDirectory[] = [
  // ... existing plugins
  { name: 'my-backend-integration', path: './my-backend-integration' },
];
```

## Implementing IBackendProvider

### Required Methods

#### Lifecycle

```typescript
async initialize(config: BackendConfig): Promise<void> {
  // Initialize HTTP client, auth, etc.
}

async disconnect(): Promise<void> {
  // Cleanup resources
}

async healthCheck(): Promise<BackendStatus> {
  // Check connection and auth status
  return {
    connected: true,
    authenticated: true,
    pendingChanges: 0,
  };
}
```

#### Authentication

```typescript
async authenticate(credentials: AuthCredentials): Promise<AuthToken> {
  // Perform authentication
  return {
    accessToken: 'token',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 3600000),
  };
}

async refreshAuth(): Promise<AuthToken> {
  // Refresh token if needed
}

isAuthenticated(): boolean {
  return this.authToken !== null;
}
```

#### CRUD Operations

```typescript
async create(entity: string, data: Record): Promise<Record> {
  // POST /api/{entity}
}

async read(entity: string, id: string): Promise<Record | null> {
  // GET /api/{entity}/{id}
}

async update(entity: string, id: string, data: Partial<Record>): Promise<Record> {
  // PUT /api/{entity}/{id}
}

async delete(entity: string, id: string): Promise<boolean> {
  // DELETE /api/{entity}/{id}
}

async query(entity: string, query: Query): Promise<Record[]> {
  // GET /api/{entity}?filters=...
}
```

#### Batch Operations

```typescript
async batchCreate(entity: string, records: Record[]): Promise<BatchResult> {
  // Bulk create
}

async batchUpdate(entity: string, updates: Array<{id: string; data: Partial<Record>}>): Promise<BatchResult> {
  // Bulk update
}

async batchDelete(entity: string, ids: string[]): Promise<BatchResult> {
  // Bulk delete
}
```

#### Sync Operations

```typescript
async getChanges(entity: string, since: Date): Promise<ChangeSet> {
  // Get changes since timestamp
  return {
    since,
    operations: [
      {
        id: '1',
        type: 'update',
        entity,
        recordId: '123',
        data: {...},
        timestamp: new Date(),
        userId: 'system',
        retryCount: 0,
      }
    ],
  };
}

async pushChanges(entity: string, operations: SyncOperation[]): Promise<SyncResult> {
  // Push local changes to backend
}

async resolveConflict(conflict: Conflict, resolution: ConflictResolution): Promise<Record> {
  // Resolve sync conflict
}
```

#### File Operations

```typescript
async uploadFile(file: FileUpload): Promise<FileRecord> {
  // Upload file
}

async downloadFile(fileId: string): Promise<Blob> {
  // Download file
}
```

#### Capabilities

```typescript
getCapabilities(): BackendCapabilities {
  return {
    entities: ['students', 'courses'],
    authMethods: ['apikey'],
    fileUpload: true,
    realtime: false,
    batchOperations: true,
    webhooks: false,
  };
}

supportsEntity(entity: string): boolean {
  return this.getSupportedEntities().includes(entity);
}

getSupportedEntities(): string[] {
  return ['students', 'courses', 'fees'];
}
```

#### Entity Mapping

```typescript
mapToBackend(entity: string, localRecord: Record): any {
  // Map local format to backend format
  const mapping = this.mappings[entity];
  const backendRecord: any = {};
  
  for (const [localField, backendField] of Object.entries(mapping)) {
    backendRecord[backendField] = localRecord[localField];
  }
  
  return backendRecord;
}

mapFromBackend(entity: string, backendRecord: any): Record {
  // Map backend format to local format
  const mapping = this.mappings[entity];
  const localRecord: Record = {};
  
  for (const [localField, backendField] of Object.entries(mapping)) {
    localRecord[localField] = backendRecord[backendField];
  }
  
  return localRecord;
}
```

## Entity Mappings

Define field mappings between local and backend entities:

```typescript
// mappings.ts
export const entityMappings = {
  students: {
    localEntity: 'students',
    backendEntity: 'Student',
    fieldMappings: {
      id: 'student_id',
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email_address',
      phone: 'phone_number',
    },
  },
  
  courses: {
    localEntity: 'courses',
    backendEntity: 'Course',
    fieldMappings: {
      id: 'course_id',
      name: 'course_name',
      code: 'course_code',
      credits: 'credit_hours',
    },
  },
};
```

## HTTP Client

Create a simple HTTP client:

```typescript
// MyBackendClient.ts
export class MyBackendClient {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}
  
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }
  
  async get(endpoint: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async post(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Implement put, delete, etc.
}
```

## Testing

### Unit Tests

```typescript
// MyBackendProvider.test.ts
import { MyBackendProvider } from './MyBackendProvider';

describe('MyBackendProvider', () => {
  let provider: MyBackendProvider;
  
  beforeEach(async () => {
    provider = new MyBackendProvider();
    await provider.initialize({
      id: 'test',
      name: 'Test',
      type: 'custom',
      baseUrl: 'https://api.test.com',
      auth: { type: 'apikey', apiKey: 'test-key' },
      sync: { enabled: false, interval: 0, conflictResolution: 'local-wins', bidirectional: false },
    });
  });
  
  it('should create a record', async () => {
    const record = await provider.create('students', {
      firstName: 'John',
      lastName: 'Doe',
    });
    
    expect(record.id).toBeDefined();
  });
  
  it('should read a record', async () => {
    const record = await provider.read('students', '123');
    expect(record).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// integration.test.ts
import { BackendProviderRegistry } from '@/services/backend/BackendProviderRegistry';
import { MyBackendProvider } from './MyBackendProvider';

describe('Backend Integration', () => {
  it('should register provider', () => {
    const registry = BackendProviderRegistry.getInstance();
    const provider = new MyBackendProvider();
    
    registry.register(provider);
    
    expect(registry.has('my-backend')).toBe(true);
  });
  
  it('should set active provider', () => {
    const registry = BackendProviderRegistry.getInstance();
    registry.setActive('my-backend');
    
    expect(registry.getActiveId()).toBe('my-backend');
  });
});
```

## Best Practices

### 1. Error Handling

```typescript
async create(entity: string, data: Record): Promise<Record> {
  try {
    const response = await this.client.post(`/${entity}`, data);
    return response.data;
  } catch (error) {
    console.error(`Failed to create ${entity}:`, error);
    throw new Error(`Create failed: ${error.message}`);
  }
}
```

### 2. Retry Logic

```typescript
async makeRequest(fn: () => Promise<any>, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 3. Caching

```typescript
private cache = new Map<string, { data: any; timestamp: number }>();

async read(entity: string, id: string): Promise<Record | null> {
  const cacheKey = `${entity}:${id}`;
  const cached = this.cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data;
  }
  
  const data = await this.client.get(`/${entity}/${id}`);
  this.cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}
```

### 4. Rate Limiting

```typescript
private rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute

async makeRequest(fn: () => Promise<any>): Promise<any> {
  await this.rateLimiter.acquire();
  return fn();
}
```

### 5. Logging

```typescript
import { logger } from '@/utils/logging';

async create(entity: string, data: Record): Promise<Record> {
  logger.info(`Creating ${entity}`, { data });
  
  try {
    const result = await this.client.post(`/${entity}`, data);
    logger.info(`Created ${entity}`, { id: result.id });
    return result;
  } catch (error) {
    logger.error(`Failed to create ${entity}`, { error });
    throw error;
  }
}
```

## Publishing

### 1. Package Plugin

```bash
npm run build:plugin -- my-backend-integration
```

### 2. Test Plugin

```bash
npm run test:plugin -- my-backend-integration
```

### 3. Publish to Marketplace

```bash
sp3 publish ./dist/plugins/my-backend-integration
```

## Examples

See these plugins for reference:
- `src/plugins/builtin/erpnext-integration/` - ERPNext integration
- `src/plugins/builtin/frappe-integration/` - Frappe React SDK integration
- `src/plugins/builtin/saas-backend/` - SaaS backend integration

## Support

- Documentation: https://docs.schoolpilot3.com
- GitHub: https://github.com/schoolpilot/schoolpilot3
- Discord: https://discord.gg/schoolpilot
