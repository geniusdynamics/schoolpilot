# Frappe Integration Plugin

Connect SchoolPilot3 to Frappe Framework using the official Frappe React SDK with real-time updates, optimized React hooks, and seamless integration.

## Overview

This plugin provides deep integration between SchoolPilot3 and Frappe Framework, leveraging the official `frappe-react-sdk` for:

- ✅ **Real-time Updates**: Socket.IO integration for live document updates
- ✅ **Optimized React Hooks**: Purpose-built hooks for Frappe operations
- ✅ **Full CRUD Operations**: Complete database operations
- ✅ **File Management**: Upload and download files
- ✅ **Server-side Methods**: Call any Frappe whitelisted method
- ✅ **Caching**: Client-side caching for performance
- ✅ **Type Safety**: Full TypeScript support

## Installation

### Prerequisites

1. **Frappe Server**: Version 13 or higher
2. **frappe-react-sdk**: Installed in your project
3. **SchoolPilot3**: Version 1.0.0 or higher

### Install Dependencies

```bash
npm install frappe-react-sdk
# or
yarn add frappe-react-sdk
```

### Activate Plugin

1. Navigate to **Settings > Plugins**
2. Find **Frappe Integration**
3. Click **Configure**
4. Enter your settings (see Configuration below)
5. Click **Activate**

## Configuration

### Basic Settings

```typescript
{
  siteUrl: 'https://mysite.frappe.cloud',
  authType: 'token',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  enableSocketIO: true,
  socketPort: 9000
}
```

### Advanced Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Site URL** | Frappe site URL | Required |
| **Auth Type** | token/oauth2/jwt | token |
| **API Key** | Frappe API key | Required |
| **API Secret** | Frappe API secret | Required |
| **Enable Socket.IO** | Real-time updates | true |
| **Socket Port** | Socket.IO port | 9000 |
| **Enable Cache** | Client-side caching | true |
| **Cache Timeout** | Cache TTL (seconds) | 300 |
| **Batch Size** | Records per batch | 100 |

## Usage

### React Hooks

#### useFrappeDoc - Single Document

```typescript
import { useFrappeDoc } from '@/plugins/builtin/frappe-integration/hooks';

function StudentProfile({ studentId }: { studentId: string }) {
  const { data: student, isLoading, error, update } = useFrappeDoc({
    doctype: 'Student',
    name: studentId,
  });
  
  const handleUpdate = async () => {
    await update({
      first_name: 'John',
      last_name: 'Doe',
    });
  };
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>{student.first_name} {student.last_name}</h1>
      <button onClick={handleUpdate}>Update</button>
    </div>
  );
}
```

#### useFrappeDocList - Document List

```typescript
import { useFrappeDocList } from '@/plugins/builtin/frappe-integration/hooks';

function StudentList() {
  const { data: students, isLoading, hasMore, loadMore } = useFrappeDocList({
    doctype: 'Student',
    fields: ['name', 'first_name', 'last_name', 'student_email_id'],
    filters: [['status', '=', 'Active']],
    limit: 50,
    orderBy: { field: 'first_name', order: 'asc' },
  });
  
  return (
    <div>
      {students.map(student => (
        <div key={student.name}>
          {student.first_name} {student.last_name}
        </div>
      ))}
      
      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

#### useFrappeCall - Server Methods

```typescript
import { useFrappeCall } from '@/plugins/builtin/frappe-integration/hooks';

function EnrollmentForm() {
  const { call, isLoading } = useFrappeCall('erpnext.education.api.enroll_student');
  
  const handleEnroll = async () => {
    const result = await call({
      student: 'STU-001',
      program: 'Computer Science',
      academic_year: '2024-25',
    });
    
    console.log('Enrollment result:', result);
  };
  
  return (
    <button onClick={handleEnroll} disabled={isLoading}>
      {isLoading ? 'Enrolling...' : 'Enroll Student'}
    </button>
  );
}
```

#### useFrappeFileUpload - File Upload

```typescript
import { useFrappeFileUpload } from '@/plugins/builtin/frappe-integration/hooks';

function FileUploader() {
  const { upload, isUploading, progress } = useFrappeFileUpload();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await upload(file, {
        isPrivate: false,
        folder: 'Home/Attachments',
        doctype: 'Student',
        docname: 'STU-001',
        fieldname: 'image',
      });
      
      console.log('File uploaded:', result.file_url);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };
  
  return (
    <div>
      <input type="file" onChange={handleFileChange} disabled={isUploading} />
      {isUploading && <div>Progress: {progress}%</div>}
    </div>
  );
}
```

#### useFrappeRealtime - Real-time Updates

```typescript
import { useFrappeDoc, useFrappeRealtime } from '@/plugins/builtin/frappe-integration/hooks';

function LiveStudentProfile({ studentId }: { studentId: string }) {
  const { data: student, refetch } = useFrappeDoc({
    doctype: 'Student',
    name: studentId,
  });
  
  // Subscribe to real-time updates
  useFrappeRealtime({
    doctype: 'Student',
    docname: studentId,
    onUpdate: (data) => {
      console.log('Student updated in real-time:', data);
      refetch(); // Refresh the data
    },
  });
  
  return (
    <div>
      <h1>{student?.first_name} {student?.last_name}</h1>
      <span className="live-indicator">🔴 Live</span>
    </div>
  );
}
```

### Direct Provider Access

```typescript
import { useBackendProvider } from '@/hooks/useBackendProvider';
import type { FrappeProvider } from '@/plugins/builtin/frappe-integration/FrappeProvider';

function AdvancedComponent() {
  const { activeProvider } = useBackendProvider();
  
  const frappeProvider = activeProvider as FrappeProvider;
  const client = frappeProvider.getSDKClient();
  
  // Use SDK client directly
  const fetchData = async () => {
    const doc = await client.db.getDoc('Student', 'STU-001');
    console.log(doc);
  };
  
  return <button onClick={fetchData}>Fetch</button>;
}
```

## Advanced Features

### Caching

The plugin includes intelligent client-side caching:

```typescript
// Cached automatically
const { data } = useFrappeDoc({
  doctype: 'Student',
  name: 'STU-001',
});

// Cache is invalidated on updates
await update({ first_name: 'Jane' }); // Cache cleared
```

### Batch Operations

```typescript
import { useBackendProvider } from '@/hooks/useBackendProvider';

function BatchOperations() {
  const { activeProvider } = useBackendProvider();
  
  const createMultipleStudents = async () => {
    const students = [
      { first_name: 'John', last_name: 'Doe' },
      { first_name: 'Jane', last_name: 'Smith' },
      // ... more students
    ];
    
    const result = await activeProvider.batchCreate('students', students);
    console.log(`Created ${result.successful} students`);
  };
  
  return <button onClick={createMultipleStudents}>Batch Create</button>;
}
```

### Filtering and Sorting

```typescript
const { data: students } = useFrappeDocList({
  doctype: 'Student',
  filters: [
    ['status', '=', 'Active'],
    ['date_of_birth', '>', '2000-01-01'],
    ['student_group', 'in', ['Group A', 'Group B']],
  ],
  orderBy: { field: 'first_name', order: 'asc' },
  limit: 100,
});
```

### Pagination

```typescript
function PaginatedList() {
  const [page, setPage] = useState(0);
  const pageSize = 50;
  
  const { data, isLoading } = useFrappeDocList({
    doctype: 'Student',
    limit: pageSize,
    offset: page * pageSize,
  });
  
  return (
    <div>
      {/* Render data */}
      <button onClick={() => setPage(p => p - 1)} disabled={page === 0}>
        Previous
      </button>
      <button onClick={() => setPage(p => p + 1)}>
        Next
      </button>
    </div>
  );
}
```

### Auto-refresh

```typescript
const { data } = useFrappeDocList({
  doctype: 'Student',
  refetchInterval: 30000, // Refresh every 30 seconds
});
```

## Real-time Updates

### Socket.IO Configuration

The plugin automatically connects to Frappe's Socket.IO server for real-time updates:

```typescript
// Configuration
{
  enableSocketIO: true,
  socketPort: 9000, // Default Frappe Socket.IO port
}
```

### Subscribing to Updates

```typescript
// Automatic subscription with useFrappeDoc
const { data } = useFrappeDoc({
  doctype: 'Student',
  name: 'STU-001',
});

// Manual subscription with useFrappeRealtime
useFrappeRealtime({
  doctype: 'Student',
  docname: 'STU-001',
  onUpdate: (data) => {
    console.log('Real-time update:', data);
  },
});
```

## TypeScript Support

### Type-safe Documents

```typescript
interface Student {
  name: string;
  first_name: string;
  last_name: string;
  student_email_id: string;
  date_of_birth: string;
  status: 'Active' | 'Inactive';
}

const { data: student } = useFrappeDoc<Student>({
  doctype: 'Student',
  name: 'STU-001',
});

// student is typed as Student | null
console.log(student?.first_name);
```

### Type-safe Lists

```typescript
const { data: students } = useFrappeDocList<Student>({
  doctype: 'Student',
});

// students is typed as Student[]
students.forEach(s => console.log(s.first_name));
```

## Performance Optimization

### Caching Strategy

```typescript
// Enable caching (default)
{
  enableCache: true,
  cacheTimeout: 300, // 5 minutes
}

// Disable for real-time critical data
{
  enableCache: false,
}
```

### Batch Size Tuning

```typescript
// Smaller batches for faster initial load
{
  batchSize: 50,
}

// Larger batches for bulk operations
{
  batchSize: 500,
}
```

### Selective Field Loading

```typescript
// Load only needed fields
const { data } = useFrappeDocList({
  doctype: 'Student',
  fields: ['name', 'first_name', 'last_name'], // Only these fields
});
```

## Error Handling

```typescript
const { data, error, isLoading } = useFrappeDoc({
  doctype: 'Student',
  name: 'STU-001',
});

if (error) {
  return <ErrorDisplay error={error} />;
}

// Or with try-catch
const { call } = useFrappeCall('my.method');

try {
  await call({ arg: 'value' });
} catch (error) {
  console.error('Method call failed:', error);
}
```

## Comparison with ERPNext Plugin

| Feature | Frappe Plugin | ERPNext Plugin |
|---------|---------------|----------------|
| **Real-time Updates** | ✅ Socket.IO | ❌ Polling only |
| **React Hooks** | ✅ Optimized | ⚠️ Basic |
| **Caching** | ✅ Built-in | ⚠️ Manual |
| **DocType Support** | ✅ All DocTypes | ⚠️ Predefined only |
| **File Upload** | ✅ With progress | ✅ Basic |
| **Server Methods** | ✅ Any method | ⚠️ Limited |
| **TypeScript** | ✅ Full support | ✅ Full support |

## Troubleshooting

### Socket.IO Connection Issues

**Problem**: Real-time updates not working

**Solutions**:
- Verify Socket.IO is enabled on Frappe server
- Check `socketPort` setting (default: 9000)
- Ensure firewall allows WebSocket connections
- Check browser console for Socket.IO errors

### Authentication Errors

**Problem**: 401 Unauthorized errors

**Solutions**:
- Verify API key and secret are correct
- Check key hasn't expired
- Ensure user has proper permissions
- Try regenerating API credentials

### Performance Issues

**Problem**: Slow data loading

**Solutions**:
- Enable caching: `enableCache: true`
- Reduce batch size for initial load
- Use selective field loading
- Implement pagination
- Increase cache timeout

## API Reference

### Hooks

- `useFrappeProvider()` - Access Frappe provider and SDK client
- `useFrappeDoc(options)` - Fetch and manage single document
- `useFrappeDocList(options)` - Fetch and manage document list
- `useFrappeCall(method)` - Call server-side methods
- `useFrappeFileUpload()` - Upload files with progress
- `useFrappeRealtime(options)` - Subscribe to real-time updates

### Provider Methods

See [IBackendProvider interface](../../../services/backend/IBackendProvider.ts) for complete API.

## Examples

See the [examples directory](./examples/) for complete working examples:

- Student Management
- Course Enrollment
- Fee Collection
- Attendance Tracking
- File Management
- Real-time Dashboard

## Support

- **Frappe Docs**: https://frappeframework.com/docs
- **frappe-react-sdk**: https://github.com/frappe/frappe-react-sdk
- **SchoolPilot Docs**: https://docs.schoolpilot3.com
- **GitHub Issues**: https://github.com/schoolpilot/schoolpilot3/issues

## License

MIT License - See LICENSE file for details
