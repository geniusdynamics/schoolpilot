# Frappe React SDK Plugin - Complete Implementation

## Overview

Complete implementation of the Frappe integration plugin using the official `frappe-react-sdk`. This plugin provides superior integration with Frappe Framework compared to the ERPNext plugin.

## What Was Built

### 1. Core Provider (`FrappeProvider.ts`)
- ✅ Implements `IBackendProvider` interface
- ✅ Wraps Frappe React SDK
- ✅ Client-side caching with TTL
- ✅ Batch operations support
- ✅ Real-time updates via Socket.IO
- ✅ File upload/download
- ✅ Full CRUD operations
- ✅ Sync operations with conflict resolution

### 2. SDK Client Wrapper (`FrappeSDKClient.ts`)
- ✅ Wraps `frappe-react-sdk` FrappeApp
- ✅ Database operations (db.*)
- ✅ File operations (file.*)
- ✅ Server method calls (call)
- ✅ Authentication (auth.*)
- ✅ Real-time subscriptions (Socket.IO)

### 3. React Hooks (6 hooks)

#### `useFrappeProvider`
Access the Frappe provider and SDK client

```typescript
const { provider, client, isActive, isConnected } = useFrappeProvider();
```

#### `useFrappeDoc`
Fetch and manage a single document

```typescript
const { data, isLoading, error, update, delete } = useFrappeDoc({
  doctype: 'Student',
  name: 'STU-001',
});
```

#### `useFrappeDocList`
Fetch and manage document lists with pagination

```typescript
const { data, isLoading, hasMore, loadMore, refetch } = useFrappeDocList({
  doctype: 'Student',
  fields: ['name', 'first_name'],
  filters: [['status', '=', 'Active']],
  limit: 50,
});
```

#### `useFrappeCall`
Call Frappe server-side methods

```typescript
const { call, isLoading, data, error } = useFrappeCall('my.method');
await call({ arg: 'value' });
```

#### `useFrappeFileUpload`
Upload files with progress tracking

```typescript
const { upload, isUploading, progress } = useFrappeFileUpload();
await upload(file, { doctype: 'Student', docname: 'STU-001' });
```

#### `useFrappeRealtime`
Subscribe to real-time document updates

```typescript
useFrappeRealtime({
  doctype: 'Student',
  docname: 'STU-001',
  onUpdate: (data) => console.log('Updated:', data),
});
```

### 4. Plugin Configuration (`plugin.json`)
- ✅ Complete manifest with all settings
- ✅ Authentication options (token/oauth2/jwt)
- ✅ Socket.IO configuration
- ✅ Caching settings
- ✅ Batch size configuration
- ✅ Sync settings

### 5. Documentation
- ✅ Comprehensive README with examples
- ✅ Architecture documentation
- ✅ Implementation guide
- ✅ Comparison with ERPNext plugin
- ✅ Troubleshooting guide

## File Structure

```
src/plugins/builtin/frappe-integration/
├── plugin.json                    # Plugin manifest
├── index.ts                       # Plugin entry point
├── FrappeProvider.ts              # IBackendProvider implementation
├── FrappeSDKClient.ts             # SDK wrapper
├── README.md                      # User documentation
└── hooks/
    ├── index.ts                   # Hook exports
    ├── useFrappeProvider.ts       # Provider access hook
    ├── useFrappeDoc.ts            # Single document hook
    ├── useFrappeDocList.ts        # Document list hook
    ├── useFrappeCall.ts           # Server method hook
    ├── useFrappeFileUpload.ts     # File upload hook
    └── useFrappeRealtime.ts       # Real-time updates hook

docs/
├── architecture/
│   └── FRAPPE_PLUGIN_IMPLEMENTATION.md
└── FRAPPE_PLUGIN_SUMMARY.md (this file)
```

## Key Features

### 1. Real-time Updates
```typescript
// Automatic real-time updates
useFrappeRealtime({
  doctype: 'Student',
  docname: id,
  onUpdate: () => refetch(),
});
```

### 2. Intelligent Caching
```typescript
// Cached automatically with TTL
const { data } = useFrappeDoc({
  doctype: 'Student',
  name: 'STU-001',
});
// Cache invalidated on updates
```

### 3. Type Safety
```typescript
interface Student {
  name: string;
  first_name: string;
  last_name: string;
}

const { data } = useFrappeDoc<Student>({
  doctype: 'Student',
  name: 'STU-001',
});
// data is typed as Student | null
```

### 4. Batch Operations
```typescript
const result = await provider.batchCreate('students', [
  { first_name: 'John', last_name: 'Doe' },
  { first_name: 'Jane', last_name: 'Smith' },
]);
console.log(`Created ${result.successful} students`);
```

### 5. File Upload with Progress
```typescript
const { upload, progress } = useFrappeFileUpload();
await upload(file, {
  doctype: 'Student',
  docname: 'STU-001',
  fieldname: 'image',
});
console.log(`Progress: ${progress}%`);
```

## Usage Examples

### Basic Component

```typescript
import { useFrappeDoc } from '@/plugins/builtin/frappe-integration/hooks';

function StudentProfile({ id }: { id: string }) {
  const { data: student, isLoading, update } = useFrappeDoc<Student>({
    doctype: 'Student',
    name: id,
  });
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{student?.first_name} {student?.last_name}</h1>
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

function StudentList() {
  const { data: students, loadMore, hasMore } = useFrappeDocList<Student>({
    doctype: 'Student',
    fields: ['name', 'first_name', 'last_name'],
    filters: [['status', '=', 'Active']],
    orderBy: { field: 'first_name', order: 'asc' },
    limit: 50,
  });
  
  return (
    <div>
      {students.map(s => (
        <div key={s.name}>{s.first_name} {s.last_name}</div>
      ))}
      {hasMore && <button onClick={loadMore}>Load More</button>}
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
  
  // Subscribe to real-time updates
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

## Installation

### 1. Install frappe-react-sdk

```bash
npm install frappe-react-sdk
# or
yarn add frappe-react-sdk
```

### 2. Register Plugin

```typescript
// src/plugins/BuiltinLoader.ts
const BUILTIN_PLUGINS: PluginDirectory[] = [
  // ... existing plugins
  { name: 'frappe-integration', path: './frappe-integration' },
];
```

### 3. Configure and Activate

1. Go to Settings > Plugins
2. Find "Frappe Integration"
3. Click "Configure"
4. Enter settings:
   ```json
   {
     "siteUrl": "https://mysite.frappe.cloud",
     "authType": "token",
     "apiKey": "your-api-key",
     "apiSecret": "your-api-secret",
     "enableSocketIO": true
   }
   ```
5. Click "Activate"

## Advantages Over ERPNext Plugin

| Feature | Frappe Plugin | ERPNext Plugin |
|---------|---------------|----------------|
| **Real-time Updates** | ✅ Socket.IO | ❌ Polling |
| **React Hooks** | ✅ 6 optimized | ⚠️ Basic |
| **Caching** | ✅ Built-in | ⚠️ Manual |
| **DocType Support** | ✅ All (dynamic) | ⚠️ Predefined |
| **SDK** | ✅ Official | ⚠️ Custom |
| **Maintenance** | ✅ SDK maintained | ⚠️ Custom code |
| **Performance** | ✅ Optimized | ⚠️ Standard |
| **Bundle Size** | ⚠️ Larger | ✅ Smaller |

## Configuration Options

### Basic Settings
- `siteUrl` - Frappe site URL (required)
- `authType` - token/oauth2/jwt (default: token)
- `apiKey` - API key (required for token auth)
- `apiSecret` - API secret (required for token auth)

### Advanced Settings
- `enableSocketIO` - Enable real-time (default: true)
- `socketPort` - Socket.IO port (default: 9000)
- `enableCache` - Client-side caching (default: true)
- `cacheTimeout` - Cache TTL in seconds (default: 300)
- `batchSize` - Records per batch (default: 100)
- `syncInterval` - Fallback sync interval (default: 300)
- `conflictResolution` - Conflict strategy (default: timestamp-wins)

## Performance Tips

1. **Enable Caching**
   ```typescript
   { enableCache: true, cacheTimeout: 300 }
   ```

2. **Use Selective Fields**
   ```typescript
   useFrappeDocList({
     doctype: 'Student',
     fields: ['name', 'first_name'], // Only needed fields
   });
   ```

3. **Implement Pagination**
   ```typescript
   const { loadMore, hasMore } = useFrappeDocList({
     limit: 50,
   });
   ```

4. **Use Real-time Instead of Polling**
   ```typescript
   useFrappeRealtime({ doctype, docname, onUpdate });
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
describe('Frappe Hooks', () => {
  it('should fetch document list', async () => {
    const { result } = renderHook(() => useFrappeDocList({
      doctype: 'Student',
    }));
    await waitFor(() => expect(result.current.data).toBeDefined());
  });
});
```

## Troubleshooting

### Socket.IO Not Working
- Check `enableSocketIO: true`
- Verify `socketPort` (default: 9000)
- Ensure Frappe server has Socket.IO enabled
- Check browser console for errors

### Slow Performance
- Enable caching
- Reduce batch size
- Use selective field loading
- Implement pagination

### Authentication Errors
- Verify API credentials
- Check user permissions
- Regenerate API key/secret

## Next Steps

1. **Test the Plugin**
   - Set up Frappe server
   - Configure plugin
   - Test all hooks

2. **Create Examples**
   - Student management
   - Course enrollment
   - Real-time dashboard

3. **Optimize Performance**
   - Tune cache settings
   - Adjust batch sizes
   - Monitor real-time connections

4. **Documentation**
   - Add more examples
   - Create video tutorials
   - Write migration guide

## Resources

- [Frappe Framework](https://frappeframework.com)
- [frappe-react-sdk](https://github.com/frappe/frappe-react-sdk)
- [SchoolPilot3 Docs](https://docs.schoolpilot3.com)
- [Plugin Architecture](./architecture/backend-plugin-architecture.md)

## License

MIT License

---

**Status**: ✅ Complete and ready for testing

**Dependencies**: `frappe-react-sdk@^2.0.0`

**Compatibility**: SchoolPilot3 v1.0.0+, Frappe v13+
