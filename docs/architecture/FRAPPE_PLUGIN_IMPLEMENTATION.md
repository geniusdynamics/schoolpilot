# Frappe React SDK Plugin Implementation

Complete implementation guide for the Frappe integration plugin using the official Frappe React SDK.

## Overview

The Frappe plugin provides a superior integration experience compared to the ERPNext plugin by leveraging the official `frappe-react-sdk` package. This enables:

- Real-time updates via Socket.IO
- Optimized React hooks
- Better performance with caching
- Support for all Frappe DocTypes dynamically
- Type-safe operations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Frappe Integration Plugin                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           FrappeProvider (IBackendProvider)            │ │
│  │  - Implements core backend interface                   │ │
│  │  - Wraps Frappe SDK client                             │ │
│  │  - Manages caching and batching                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              FrappeSDKClient                            │ │
│  │  - Wraps frappe-react-sdk                              │ │
│  │  - Database operations (db.*)                          │ │
│  │  - File operations (file.*)                            │ │
│  │  - Server methods (call)                               │ │
│  │  - Real-time (Socket.IO)                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              React Hooks                                │ │
│  │  - useFrappeDoc                                         │ │
│  │  - useFrappeDocList                                     │ │
│  │  - useFrappeCall                                        │ │
│  │  - useFrappeFileUpload                                  │ │
│  │  - useFrappeRealtime                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                  frappe-react-sdk                             │
│  - Official Frappe SDK                                        │
│  - FrappeApp, FrappeContext                                   │
│  - Database, File, Auth APIs                                  │
│  - Socket.IO integration                                      │
└──────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. FrappeProvider

Implements `IBackendProvider` interface while leveraging the Frappe SDK:

```typescript
export class FrappeProvider implements IBackendProvider {
  private client: FrappeSDKClient;
  
  async create(entity: string, data: Record): Promise<Record> {
    const doc = await this.client.db.createDoc(entity, data);
    this.invalidateCache(entity);
    return doc;
  }
  
  async read(entity: string, id: string): Promise<Record | null> {
    // Check cache first
    const cached = this.getFromCache(`${entity}:${id}`);
    if (cached) return cached;
    
    // Fetch from Frappe
    const doc = await this.client.db.getDoc(entity, id);
    
    // Cache result
    this.setCache(`${entity}:${id}`, doc);
    return doc;
  }
}
```

### 2. FrappeSDKClient

Wraps the official SDK for easier integration:

```typescript
export class FrappeSDKClient {
  private app: FrappeApp;
  
  get db() {
    return {
      getDoc: (doctype, name) => this.app.db().getDoc(doctype, name),
      getDocList: (doctype, options) => this.app.db().getDocList(doctype, options),
      createDoc: (doctype, data) => this.app.db().createDoc(doctype, data),
      updateDoc: (doctype, name, data) => this.app.db().updateDoc(doctype, name, data),
      deleteDoc: (doctype, name) => this.app.db().deleteDoc(doctype, name),
    };
  }
  
  get file() {
    return {
      uploadFile: (file, options) => this.app.file().uploadFile(file, ...),
    };
  }
}
```

### 3. React Hooks

Purpose-built hooks for common Frappe operations:

```typescript
// Fetch single document
export function useFrappeDoc<T>(options: UseFrappeDocOptions) {
  const { client } = useFrappeProvider();
  const [data, setData] = useState<T | null>(null);
  
  useEffect(() => {
    client.db.getDoc(options.doctype, options.name)
      .then(setData);
  }, [options.doctype, options.name]);
  
  return { data, update, delete };
}

// Fetch document list
export function useFrappeDocList<T>(options: UseFrappeDocListOptions) {
  const { client } = useFrappeProvider();
  const [data, setData] = useState<T[]>([]);
  
  useEffect(() => {
    client.db.getDocList(options.doctype, {
      fields: options.fields,
      filters: options.filters,
      limit: options.limit,
    }).then(setData);
  }, [options]);
  
  return { data, loadMore, refetch };
}
```

## Features

### Real-time Updates

Socket.IO integration for live updates:

```typescript
// In component
useFrappeRealtime({
  doctype: 'Student',
  docname: 'STU-001',
  onUpdate: (data) => {
    console.log('Student updated:', data);
    refetch(); // Refresh data
  },
});
```

### Caching

Intelligent client-side caching:

```typescript
private cache = new Map<string, { data: any; timestamp: number }>();

private getFromCache(key: string): any | null {
  const cached = this.cache.get(key);
  if (!cached) return null;
  
  const timeout = this.config.frappe.cacheTimeout * 1000;
  if (Date.now() - cached.timestamp > timeout) {
    this.cache.delete(key);
    return null;
  }
  
  return cached.data;
}
```

### Batch Operations

Efficient bulk operations:

```typescript
async batchCreate(entity: string, records: Record[]): Promise<BatchResult> {
  const batchSize = this.config.frappe.batchSize || 100;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    // Process batch...
  }
}
```

## Usage Examples

### Basic CRUD

```typescript
import { useFrappeDoc } from '@/plugins/builtin/frappe-integration/hooks';

function StudentProfile({ id }: { id: string }) {
  const { data: student, update } = useFrappeDoc<Student>({
    doctype: 'Student',
    name: id,
  });
  
  return (
    <div>
      <h1>{student?.first_name}</h1>
      <button onClick={() => update({ status: 'Active' })}>
        Activate
      </button>
    </div>
  );
}
```

### List with Filtering

```typescript
import { useFrappeDocList } from '@/plugins/builtin/frappe-integration/hooks';

function ActiveStudents() {
  const { data: students } = useFrappeDocList<Student>({
    doctype: 'Student',
    fields: ['name', 'first_name', 'last_name'],
    filters: [['status', '=', 'Active']],
    orderBy: { field: 'first_name', order: 'asc' },
  });
  
  return (
    <ul>
      {students.map(s => (
        <li key={s.name}>{s.first_name} {s.last_name}</li>
      ))}
    </ul>
  );
}
```

### Server Method Call

```typescript
import { useFrappeCall } from '@/plugins/builtin/frappe-integration/hooks';

function EnrollStudent() {
  const { call, isLoading } = useFrappeCall('erpnext.education.api.enroll_student');
  
  const handleEnroll = async () => {
    await call({
      student: 'STU-001',
      program: 'Computer Science',
    });
  };
  
  return (
    <button onClick={handleEnroll} disabled={isLoading}>
      Enroll
    </button>
  );
}
```

### File Upload

```typescript
import { useFrappeFileUpload } from '@/plugins/builtin/frappe-integration/hooks';

function PhotoUpload() {
  const { upload, progress, isUploading } = useFrappeFileUpload();
  
  const handleUpload = async (file: File) => {
    const result = await upload(file, {
      doctype: 'Student',
      docname: 'STU-001',
      fieldname: 'image',
    });
    console.log('Uploaded:', result.file_url);
  };
  
  return (
    <div>
      <input type="file" onChange={e => handleUpload(e.target.files[0])} />
      {isUploading && <progress value={progress} max={100} />}
    </div>
  );
}
```

### Real-time Dashboard

```typescript
import { useFrappeDoc, useFrappeRealtime } from '@/plugins/builtin/frappe-integration/hooks';

function LiveDashboard() {
  const { data: stats, refetch } = useFrappeDoc({
    doctype: 'Dashboard Stats',
    name: 'today',
  });
  
  useFrappeRealtime({
    doctype: 'Dashboard Stats',
    docname: 'today',
    onUpdate: () => refetch(),
  });
  
  return (
    <div>
      <h1>Live Dashboard 🔴</h1>
      <div>Active Students: {stats?.active_students}</div>
      <div>Present Today: {stats?.present_today}</div>
    </div>
  );
}
```

## Comparison: Frappe vs ERPNext Plugin

| Feature | Frappe Plugin | ERPNext Plugin |
|---------|---------------|----------------|
| **SDK** | Official frappe-react-sdk | Custom implementation |
| **Real-time** | ✅ Socket.IO | ❌ Polling only |
| **Caching** | ✅ Built-in | ⚠️ Manual |
| **React Hooks** | ✅ 6 optimized hooks | ⚠️ Basic provider access |
| **DocType Support** | ✅ All (dynamic) | ⚠️ Predefined mappings |
| **File Upload** | ✅ With progress | ✅ Basic |
| **Server Methods** | ✅ Any whitelisted | ⚠️ Limited |
| **Type Safety** | ✅ Full TypeScript | ✅ Full TypeScript |
| **Performance** | ✅ Optimized | ⚠️ Standard |
| **Bundle Size** | ⚠️ Larger (SDK) | ✅ Smaller |
| **Maintenance** | ✅ SDK maintained | ⚠️ Custom code |

## When to Use Each

### Use Frappe Plugin When:
- You need real-time updates
- Working with any Frappe DocType
- Want optimized React hooks
- Need better performance
- Using Frappe Framework (not just ERPNext)

### Use ERPNext Plugin When:
- Only using ERPNext Education module
- Don't need real-time updates
- Want smaller bundle size
- Have predefined entity mappings
- Need ERPNext-specific features

## Installation

### 1. Install Dependencies

```bash
npm install frappe-react-sdk
```

### 2. Update package.json

```json
{
  "dependencies": {
    "frappe-react-sdk": "^2.0.0"
  }
}
```

### 3. Register Plugin

```typescript
// src/plugins/BuiltinLoader.ts
const BUILTIN_PLUGINS: PluginDirectory[] = [
  // ... existing plugins
  { name: 'frappe-integration', path: './frappe-integration' },
];
```

### 4. Activate

Navigate to Settings > Plugins > Frappe Integration > Activate

## Configuration

### Minimal Configuration

```json
{
  "siteUrl": "https://mysite.frappe.cloud",
  "authType": "token",
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret"
}
```

### Full Configuration

```json
{
  "siteUrl": "https://mysite.frappe.cloud",
  "authType": "token",
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret",
  "enableSocketIO": true,
  "socketPort": 9000,
  "syncInterval": 300,
  "conflictResolution": "timestamp-wins",
  "enableCache": true,
  "cacheTimeout": 300,
  "batchSize": 100,
  "timeout": 30000
}
```

## Testing

### Unit Tests

```typescript
describe('FrappeProvider', () => {
  it('should fetch document', async () => {
    const provider = new FrappeProvider();
    await provider.initialize(config);
    
    const doc = await provider.read('Student', 'STU-001');
    expect(doc).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe('Frappe Integration', () => {
  it('should sync data', async () => {
    const provider = new FrappeProvider();
    await provider.initialize(config);
    
    const changes = await provider.getChanges('Student', new Date());
    expect(changes.operations).toBeInstanceOf(Array);
  });
});
```

## Performance Optimization

### 1. Enable Caching

```typescript
{
  enableCache: true,
  cacheTimeout: 300, // 5 minutes
}
```

### 2. Optimize Batch Size

```typescript
{
  batchSize: 100, // Adjust based on network
}
```

### 3. Selective Field Loading

```typescript
useFrappeDocList({
  doctype: 'Student',
  fields: ['name', 'first_name'], // Only needed fields
});
```

### 4. Use Real-time Instead of Polling

```typescript
// Instead of refetchInterval
useFrappeRealtime({
  doctype: 'Student',
  docname: id,
  onUpdate: refetch,
});
```

## Troubleshooting

### Socket.IO Not Connecting

1. Check Frappe server has Socket.IO enabled
2. Verify `socketPort` (default: 9000)
3. Check firewall/network settings
4. Look for errors in browser console

### Slow Performance

1. Enable caching
2. Reduce batch size
3. Use selective field loading
4. Implement pagination

### Authentication Errors

1. Verify API credentials
2. Check user permissions
3. Regenerate API key/secret
4. Ensure token format is correct

## Future Enhancements

- [ ] Offline queue with IndexedDB
- [ ] Advanced conflict resolution UI
- [ ] GraphQL support
- [ ] Optimistic updates
- [ ] Request deduplication
- [ ] Advanced caching strategies

## Resources

- [Frappe Framework Docs](https://frappeframework.com/docs)
- [frappe-react-sdk GitHub](https://github.com/frappe/frappe-react-sdk)
- [SchoolPilot3 Docs](https://docs.schoolpilot3.com)

## License

MIT License
