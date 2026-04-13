# Backend Plugins - Quick Start Guide

Get started with backend integration plugins in SchoolPilot3.

## For Users

### Using ERPNext Integration

1. **Navigate to Settings**
   ```
   Settings > Plugins > ERPNext Integration
   ```

2. **Configure Connection**
   - Server URL: `https://your-erpnext-server.com`
   - API Key: (from ERPNext User Settings)
   - API Secret: (from ERPNext User Settings)
   - Domain: Education
   - Sync Interval: 300 seconds

3. **Activate Plugin**
   - Click "Activate"
   - Test connection
   - Perform initial sync

4. **Start Using**
   - Data automatically syncs
   - Create/edit records in SchoolPilot3
   - Changes sync to ERPNext
   - ERPNext changes sync back

### Switching Backends

```typescript
// In Settings > Backend Configuration
// Select your preferred backend:
// - ERPNext
// - Frappe
// - SaaS Backend
// - Custom API
```

## For Developers

### Quick Plugin Creation

```bash
# 1. Create plugin directory
mkdir -p src/plugins/builtin/my-backend

# 2. Create files
cd src/plugins/builtin/my-backend
touch plugin.json index.ts MyProvider.ts README.md

# 3. Implement provider (see template below)

# 4. Register in BuiltinLoader.ts
# Add: { name: 'my-backend', path: './my-backend' }

# 5. Test
npm run dev
```

### Minimal Provider Template

```typescript
// MyProvider.ts
import type { IBackendProvider } from '@/services/backend/IBackendProvider';

export class MyProvider implements IBackendProvider {
  readonly id = 'my-backend';
  readonly name = 'My Backend';
  readonly version = '1.0.0';
  readonly type = 'custom' as const;
  
  async initialize(config) {
    // Setup connection
  }
  
  async create(entity, data) {
    // POST /api/{entity}
    return data;
  }
  
  async read(entity, id) {
    // GET /api/{entity}/{id}
    return null;
  }
  
  async update(entity, id, data) {
    // PUT /api/{entity}/{id}
    return data;
  }
  
  async delete(entity, id) {
    // DELETE /api/{entity}/{id}
    return true;
  }
  
  async query(entity, query) {
    // GET /api/{entity}?filters=...
    return [];
  }
  
  // Implement other required methods...
}
```

### Plugin Manifest Template

```json
{
  "id": "com.yourcompany.my-backend",
  "name": "My Backend Integration",
  "version": "1.0.0",
  "type": "integration",
  "entry": "./index.ts",
  
  "integration": {
    "backendType": "custom",
    "providerId": "my-backend",
    "entities": ["students", "courses"],
    "authMethods": ["apikey"]
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

### Using in Components

```typescript
import { useBackendProvider } from '@/hooks/useBackendProvider';

function MyComponent() {
  const { activeProvider } = useBackendProvider();
  
  const loadData = async () => {
    const students = await activeProvider.query('students', {
      filters: { status: 'Active' },
      limit: 50
    });
    return students;
  };
  
  return <div>{/* Your UI */}</div>;
}
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         SchoolPilot3 Core               │
│  ┌───────────────────────────────────┐  │
│  │   IBackendProvider Interface      │  │
│  │   BackendProviderRegistry         │  │
│  └───────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│         Backend Plugins                   │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ ERPNext  │  │  Frappe  │  │  SaaS  │ │
│  │  Plugin  │  │  Plugin  │  │ Plugin │ │
│  └──────────┘  └──────────┘  └────────┘ │
└──────────────────────────────────────────┘
```

## Key Concepts

### 1. Provider
A backend provider implements `IBackendProvider` and handles all communication with a specific backend system.

### 2. Registry
The `BackendProviderRegistry` manages all providers and tracks which one is active.

### 3. Entity Mapping
Maps local entity fields to backend fields:
```typescript
{
  students: {
    localEntity: 'students',
    backendEntity: 'Student',
    fieldMappings: {
      firstName: 'first_name',
      lastName: 'last_name'
    }
  }
}
```

### 4. Sync Engine
Generic sync engine works with any provider:
```typescript
const syncEngine = new GenericSyncEngine(
  provider,
  localDatabase,
  syncConfig
);

await syncEngine.syncEntity('students');
```

## Common Tasks

### Check Active Provider

```typescript
const { activeProvider, isConnected } = useBackendProvider();

if (activeProvider?.type === 'erpnext') {
  // ERPNext-specific logic
}
```

### Switch Provider

```typescript
const registry = BackendProviderRegistry.getInstance();
registry.setActive('frappe');
```

### Health Check

```typescript
const health = await activeProvider.healthCheck();
console.log('Connected:', health.connected);
console.log('Authenticated:', health.authenticated);
```

### Manual Sync

```typescript
const changes = await activeProvider.getChanges('students', lastSyncDate);
const result = await activeProvider.pushChanges('students', localChanges);
```

## Debugging

### Enable Debug Logging

```typescript
// In plugin settings
{
  logLevel: 'debug'
}
```

### Check Provider Status

```typescript
const registry = BackendProviderRegistry.getInstance();
const stats = registry.getStats();
console.log('Total providers:', stats.totalProviders);
console.log('Active:', stats.activeProvider);
```

### Monitor Sync

```typescript
registry.on('provider:active:changed', (event) => {
  console.log('Provider changed to:', event.newProviderId);
});
```

## Resources

### Documentation
- [Architecture Overview](./architecture/backend-plugin-architecture.md)
- [Implementation Guide](./guides/backend-plugin-implementation-guide.md)
- [ERPNext Plugin README](../src/plugins/builtin/erpnext-integration/README.md)

### Examples
- ERPNext Plugin: `src/plugins/builtin/erpnext-integration/`
- Provider Interface: `src/services/backend/IBackendProvider.ts`
- Registry: `src/services/backend/BackendProviderRegistry.ts`

### Support
- GitHub: https://github.com/schoolpilot/schoolpilot3
- Discord: https://discord.gg/schoolpilot
- Docs: https://docs.schoolpilot3.com

## Next Steps

1. **Try ERPNext Plugin**
   - Set up ERPNext server
   - Configure plugin
   - Test sync

2. **Create Custom Plugin**
   - Follow implementation guide
   - Use ERPNext plugin as reference
   - Test thoroughly

3. **Contribute**
   - Share your plugin
   - Submit to marketplace
   - Help others

## FAQ

**Q: Can I use multiple backends simultaneously?**
A: Currently one active provider at a time. Multi-backend support is planned.

**Q: How do I handle conflicts?**
A: Configure conflict resolution strategy in plugin settings (local-wins, remote-wins, timestamp-wins, manual).

**Q: Can I create a plugin for my custom API?**
A: Yes! Follow the implementation guide and use the generic REST plugin as a starting point.

**Q: Is offline support available?**
A: Yes, operations are queued when offline and synced when connection is restored.

**Q: How do I migrate from old backend code?**
A: The old BackendAPIProvider still works. Migrate gradually by activating the new plugin and testing.

## License

MIT License - See LICENSE file for details
