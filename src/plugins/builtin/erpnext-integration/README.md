# ERPNext Integration Plugin

Connect SchoolPilot3 to ERPNext for comprehensive education management with bidirectional data synchronization.

## Overview

This plugin provides seamless integration between SchoolPilot3 and ERPNext, allowing you to:

- Sync students, employees, courses, fees, and attendance data
- Maintain ERPNext as the source of truth for specific entities
- Use SchoolPilot3's modern UI while leveraging ERPNext's backend
- Support both online and offline operations with conflict resolution

## Features

- ✅ **Full CRUD Operations**: Create, read, update, and delete records
- ✅ **Bidirectional Sync**: Two-way data synchronization
- ✅ **Conflict Resolution**: Multiple strategies for handling conflicts
- ✅ **Batch Operations**: Efficient bulk data operations
- ✅ **File Upload/Download**: Manage attachments and documents
- ✅ **Entity Mapping**: Automatic field mapping between systems
- ✅ **Webhook Support**: Real-time updates (optional)
- ✅ **Offline Queue**: Queue operations when offline

## Supported Entities

| SchoolPilot Entity | ERPNext DocType | Sync Direction |
|-------------------|-----------------|----------------|
| Students | Student | Bidirectional |
| Employees | Employee | Bidirectional |
| Courses | Course | Bidirectional |
| Programs | Program | Bidirectional |
| Fees | Fees | Bidirectional |
| Attendance | Student Attendance | Bidirectional |
| Assessments | Assessment Result | Bidirectional |
| Student Groups | Student Group | Bidirectional |
| Fee Structures | Fee Structure | From ERPNext |

## Installation

### Prerequisites

1. **ERPNext Server**: Version 13 or higher
2. **API Access**: API Key and Secret from ERPNext
3. **SchoolPilot3**: Version 1.0.0 or higher

### Setup Steps

1. **Generate ERPNext API Credentials**
   
   In ERPNext:
   - Go to User Settings
   - Click "API Access"
   - Generate API Key and Secret
   - Copy both values

2. **Install Plugin**
   
   The plugin is built-in, so it's already available. Just activate it:
   
   ```typescript
   // In SchoolPilot3 Settings > Plugins
   // Find "ERPNext Integration" and click "Activate"
   ```

3. **Configure Connection**
   
   Navigate to Settings > Backend Configuration:
   
   - **Server URL**: `https://your-erpnext-server.com`
   - **API Key**: Your generated API key
   - **API Secret**: Your generated API secret
   - **Domain**: Select "Education"
   - **Sync Interval**: 300 seconds (5 minutes)
   - **Sync Direction**: Bidirectional
   - **Conflict Resolution**: Timestamp Wins

4. **Test Connection**
   
   Click "Test Connection" to verify the setup.

5. **Initial Sync**
   
   Click "Sync Now" to perform the initial data synchronization.

## Configuration Options

### Basic Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Base URL** | ERPNext server URL | Required |
| **API Key** | ERPNext API key | Required |
| **API Secret** | ERPNext API secret | Required |
| **Domain** | ERPNext domain (education/healthcare) | education |

### Sync Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Sync Interval** | Seconds between syncs | 300 |
| **Sync Direction** | Bidirectional/To ERPNext/From ERPNext | Bidirectional |
| **Conflict Resolution** | How to resolve conflicts | Timestamp Wins |
| **Batch Size** | Records per batch | 50 |

### Advanced Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable Webhooks** | Real-time updates | false |
| **Webhook Secret** | Secret for webhook verification | - |
| **Request Timeout** | API request timeout (ms) | 30000 |

## Usage

### Programmatic Access

```typescript
import { useBackendProvider } from '@/hooks/useBackendProvider';

function MyComponent() {
  const { activeProvider, isConnected } = useBackendProvider();
  
  // Check if ERPNext is active
  if (activeProvider?.type === 'erpnext') {
    // Use ERPNext-specific features
  }
  
  // CRUD operations
  const createStudent = async (data) => {
    const student = await activeProvider.create('students', data);
    return student;
  };
  
  const getStudents = async () => {
    const students = await activeProvider.query('students', {
      filters: { status: 'Active' },
      limit: 100
    });
    return students;
  };
}
```

### Sync Operations

```typescript
import { GenericSyncEngine } from '@/services/sync/GenericSyncEngine';

// Manual sync
const syncEngine = new GenericSyncEngine(
  erpnextProvider,
  localDatabase,
  syncConfig
);

// Sync specific entity
await syncEngine.syncEntity('students');

// Sync all entities
await syncEngine.syncAll();
```

### Conflict Resolution

```typescript
// Handle conflicts manually
const conflicts = await syncEngine.getConflicts();

for (const conflict of conflicts) {
  const resolution = {
    strategy: 'merge',
    mergedData: {
      ...conflict.local,
      ...conflict.remote,
      // Custom merge logic
    }
  };
  
  await erpnextProvider.resolveConflict(conflict, resolution);
}
```

## Entity Mapping

### Student Mapping

| SchoolPilot Field | ERPNext Field |
|------------------|---------------|
| id | name |
| firstName | first_name |
| lastName | last_name |
| email | student_email_id |
| phone | student_mobile_number |
| dateOfBirth | date_of_birth |
| gender | gender |
| status | status |

### Custom Mappings

You can extend mappings in `mappings.ts`:

```typescript
export const entityMappings = {
  customEntity: {
    localEntity: 'customEntity',
    backendEntity: 'Custom DocType',
    fieldMappings: {
      localField: 'erpnext_field',
      // ... more mappings
    }
  }
};
```

## Conflict Resolution Strategies

### 1. Remote Wins (ERPNext)
ERPNext data always takes precedence.

**Use when**: ERPNext is the authoritative source.

### 2. Local Wins (SchoolPilot)
SchoolPilot data always takes precedence.

**Use when**: SchoolPilot is the authoritative source.

### 3. Timestamp Wins
Most recently modified record wins.

**Use when**: You want automatic resolution based on modification time.

### 4. Manual Resolution
User must resolve conflicts manually.

**Use when**: Data is critical and requires human review.

## Webhooks

Enable real-time updates from ERPNext:

### 1. Configure ERPNext Webhook

In ERPNext, create a webhook:

```
DocType: Student
Event: After Insert, After Update, After Delete
Request URL: https://your-schoolpilot.com/api/webhooks/erpnext
Request Method: POST
Webhook Secret: your-secret-key
```

### 2. Enable in Plugin Settings

```typescript
{
  enableWebhooks: true,
  webhookSecret: 'your-secret-key'
}
```

### 3. Handle Webhook Events

The plugin automatically processes webhook events and updates local data.

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to ERPNext server

**Solutions**:
- Verify server URL is correct and accessible
- Check API credentials are valid
- Ensure CORS is configured on ERPNext server
- Check firewall/network settings

### Sync Failures

**Problem**: Sync operations fail

**Solutions**:
- Check ERPNext server is online
- Verify API credentials haven't expired
- Review sync logs for specific errors
- Reduce batch size if timeouts occur

### Conflict Errors

**Problem**: Too many conflicts

**Solutions**:
- Review conflict resolution strategy
- Increase sync frequency
- Designate one system as source of truth
- Implement custom conflict resolution logic

### Performance Issues

**Problem**: Slow sync operations

**Solutions**:
- Increase batch size (up to 500)
- Reduce sync frequency
- Use selective entity sync
- Enable webhooks for real-time updates

## API Reference

### ERPNextProvider

```typescript
class ERPNextProvider implements IBackendProvider {
  // Lifecycle
  initialize(config: BackendConfig): Promise<void>
  disconnect(): Promise<void>
  healthCheck(): Promise<BackendStatus>
  
  // Authentication
  authenticate(credentials: AuthCredentials): Promise<AuthToken>
  refreshAuth(): Promise<AuthToken>
  isAuthenticated(): boolean
  
  // CRUD
  create(entity: string, data: Record): Promise<Record>
  read(entity: string, id: string): Promise<Record | null>
  update(entity: string, id: string, data: Partial<Record>): Promise<Record>
  delete(entity: string, id: string): Promise<boolean>
  query(entity: string, query: Query): Promise<Record[]>
  
  // Batch
  batchCreate(entity: string, records: Record[]): Promise<BatchResult>
  batchUpdate(entity: string, updates: Array<{id: string; data: Partial<Record>}>): Promise<BatchResult>
  batchDelete(entity: string, ids: string[]): Promise<BatchResult>
  
  // Sync
  getChanges(entity: string, since: Date): Promise<ChangeSet>
  pushChanges(entity: string, operations: SyncOperation[]): Promise<SyncResult>
  resolveConflict(conflict: Conflict, resolution: ConflictResolution): Promise<Record>
  
  // Files
  uploadFile(file: FileUpload): Promise<FileRecord>
  downloadFile(fileId: string): Promise<Blob>
  
  // Capabilities
  getCapabilities(): BackendCapabilities
  supportsEntity(entity: string): boolean
  getSupportedEntities(): string[]
  
  // Mapping
  mapToBackend(entity: string, localRecord: Record): any
  mapFromBackend(entity: string, backendRecord: any): Record
}
```

## Development

### Adding New Entities

1. Add mapping to `mappings.ts`:

```typescript
export const entityMappings = {
  newEntity: {
    localEntity: 'newEntity',
    backendEntity: 'ERPNext DocType',
    fieldMappings: {
      // field mappings
    }
  }
};
```

2. Update plugin manifest:

```json
{
  "integration": {
    "entities": [..., "New Entity"]
  }
}
```

### Custom Transformations

Implement custom field transformations:

```typescript
// In ERPNextProvider.ts
mapToBackend(entity: string, localRecord: Record): any {
  const mapped = super.mapToBackend(entity, localRecord);
  
  // Custom transformation
  if (entity === 'students' && localRecord.dateOfBirth) {
    mapped.date_of_birth = formatDate(localRecord.dateOfBirth);
  }
  
  return mapped;
}
```

## Support

- **Documentation**: [SchoolPilot3 Docs](https://docs.schoolpilot3.com)
- **ERPNext Docs**: [ERPNext Documentation](https://docs.erpnext.com)
- **Issues**: [GitHub Issues](https://github.com/schoolpilot/schoolpilot3/issues)
- **Community**: [Discord Server](https://discord.gg/schoolpilot)

## License

MIT License - See LICENSE file for details

## Credits

- SchoolPilot3 Team
- ERPNext/Frappe Framework
- Community Contributors
