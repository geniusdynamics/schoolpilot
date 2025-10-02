# Backend API Integration Provider

The Backend API Integration Provider enables SchoolPilot3 to integrate with external systems like ERPNext, custom REST APIs, GraphQL endpoints, and other backend services. It provides bidirectional synchronization, offline queue management, and conflict resolution.

## Features

- **Bidirectional Sync**: Automatically synchronizes data between SchoolPilot3 and external systems
- **Offline Queue**: Queues operations when offline and processes them when connection is restored
- **Conflict Resolution**: Configurable strategies for handling data conflicts (local, remote, manual)
- **Authentication Support**: Bearer tokens, API keys, basic auth, and custom authentication
- **Field Mapping**: Map local fields to external API fields
- **Retry Logic**: Automatic retry with exponential backoff for failed operations
- **Real-time Updates**: Live synchronization with configurable intervals
- **Error Handling**: Comprehensive error tracking and recovery mechanisms

## Configuration

### Basic Configuration

```typescript
import { BackendAPIConfig } from '../config/unifiedConfig';

const apiConfig: BackendAPIConfig = {
  apiBaseUrl: 'https://api.yourschool.com/v1',
  authType: 'bearer',
  authToken: 'your-jwt-token-here',
  timeout: 30000,
  retryAttempts: 3,
  syncInterval: 60000, // 1 minute
  batchSize: 100,
  enableOfflineQueue: true,
  conflictResolution: 'remote'
};
```

### Unified Config Integration

```typescript
// In your unified config
export const config = {
  environment: 'production',
  dataMode: 'production',
  database: {
    provider: 'backend-api',
    allowedProviders: ['backend-api', 'rxdb', 'pouchdb'],
    autoDetect: false,
    apiConfig: apiConfig,
    options: {}
  }
};
```

## Authentication Types

### Bearer Token Authentication

```typescript
{
  authType: 'bearer',
  authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

### API Key Authentication

```typescript
{
  authType: 'api-key',
  apiKey: 'your-api-key-here'
}
```

### Custom Headers

```typescript
{
  authType: 'custom',
  customHeaders: {
    'Authorization': 'Custom your-token-here',
    'X-API-Version': '2.0',
    'X-School-ID': 'school-123'
  }
}
```

## Endpoint Configuration

### Basic Endpoint

```typescript
endpoints: {
  students: {
    basePath: '/students',
    idField: 'student_id',
    timestampField: 'updated_at',
    methods: {
      list: '/students',
      get: '/students/:id',
      create: '/students',
      update: '/students/:id',
      delete: '/students/:id',
      sync: '/students/sync?since=:timestamp'
    }
  }
}
```

### Field Mapping

```typescript
endpoints: {
  students: {
    basePath: '/students',
    mapping: {
      // local_field: 'api_field'
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email_address',
      phone: 'phone_number',
      dateOfBirth: 'birth_date'
    }
  }
}
```

### Filters

```typescript
endpoints: {
  students: {
    basePath: '/students',
    filters: {
      active: true,
      school_id: 'your-school-id',
      academic_year: '2024-2025'
    }
  }
}
```

## Integration Examples

### ERPNext Integration

```typescript
const erpNextConfig: BackendAPIConfig = {
  apiBaseUrl: 'https://your-erpnext.com/api/resource',
  authType: 'bearer',
  authToken: 'your-erpnext-token',
  endpoints: {
    students: {
      basePath: '/Student',
      idField: 'name',
      timestampField: 'modified',
      mapping: {
        id: 'name',
        firstName: 'first_name',
        lastName: 'last_name',
        email: 'student_email_id',
        admissionDate: 'joining_date'
      }
    }
  }
};
```

### Custom REST API

```typescript
const customAPIConfig: BackendAPIConfig = {
  apiBaseUrl: 'https://api.yourschool.com/v1',
  authType: 'api-key',
  apiKey: 'your-api-key',
  endpoints: {
    students: {
      basePath: '/students',
      methods: {
        sync: '/students/sync?since=:timestamp&limit=100'
      },
      filters: {
        school_id: 'your-school-id'
      }
    }
  }
};
```

### GraphQL API

```typescript
const graphqlConfig: BackendAPIConfig = {
  apiBaseUrl: 'https://api.yourschool.com/graphql',
  authType: 'bearer',
  authToken: 'your-jwt-token',
  endpoints: {
    students: {
      basePath: '',
      methods: {
        list: '?query={students{id,firstName,lastName,email}}',
        get: '?query={student(id:":id"){id,firstName,lastName,email}}',
        create: '?mutation={createStudent(input:$input){id,firstName,lastName}}',
        update: '?mutation={updateStudent(id:":id",input:$input){id}}'
      }
    }
  }
};
```

## Conflict Resolution Strategies

### Local Wins

```typescript
{
  conflictResolution: 'local'
}
```

Local changes take precedence over remote changes.

### Remote Wins

```typescript
{
  conflictResolution: 'remote'
}
```

Remote/backend changes take precedence over local changes.

### Manual Resolution

```typescript
{
  conflictResolution: 'manual'
}
```

Conflicts require manual intervention and will be logged for review.

## Monitoring and Status

### Get Sync Status

```typescript
const collection = await provider.getCollection('students');
const syncStatus = collection.getSyncStatus();

console.log('Sync Status:', {
  isActive: syncStatus.isActive,
  lastSync: syncStatus.lastSync,
  pendingOperations: syncStatus.pendingOperations,
  conflicts: syncStatus.conflicts,
  errors: syncStatus.errors
});
```

### Get Queue Status

```typescript
const queueStatus = collection.getQueueStatus();
console.log('Queue Status:', {
  count: queueStatus.count,
  operations: queueStatus.operations
});
```

### Force Sync

```typescript
// Force sync for specific collection
await collection.forceSync();

// Force sync for all collections
await provider.forceGlobalSync();
```

## Error Handling

The provider includes comprehensive error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **Authentication Errors**: Clear error messages and retry logic
- **Validation Errors**: Detailed error information for debugging
- **Conflict Errors**: Configurable resolution strategies
- **Timeout Errors**: Configurable timeout settings

### Error Monitoring

```typescript
// Listen for sync errors
collection.subscribeToChanges().subscribe(change => {
  if (change.type === 'error') {
    console.error('Sync error:', change);
    // Handle error (notify user, log, etc.)
  }
});
```

## Best Practices

### 1. Authentication Security

- Store API keys and tokens securely
- Use environment variables for sensitive data
- Implement token refresh logic for JWT tokens
- Use HTTPS for all API communications

### 2. Performance Optimization

- Set appropriate sync intervals (not too frequent)
- Use batch operations for bulk data
- Implement pagination for large datasets
- Monitor network usage and optimize accordingly

### 3. Error Handling

- Implement proper error logging
- Set up monitoring and alerting
- Have fallback strategies for critical operations
- Test offline scenarios thoroughly

### 4. Data Consistency

- Choose appropriate conflict resolution strategy
- Implement data validation on both sides
- Use timestamps for change tracking
- Test sync scenarios with concurrent changes

### 5. Development and Testing

- Use different configurations for dev/staging/production
- Test with various network conditions
- Implement comprehensive logging
- Use mock APIs for development and testing

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check API key/token validity
   - Verify authentication type configuration
   - Check custom headers format

2. **Sync Not Working**
   - Verify network connectivity
   - Check API endpoint URLs
   - Validate field mappings
   - Review sync interval settings

3. **Data Conflicts**
   - Review conflict resolution strategy
   - Check timestamp field configuration
   - Verify data validation rules

4. **Performance Issues**
   - Reduce sync frequency
   - Implement pagination
   - Optimize batch sizes
   - Monitor network usage

### Debug Mode

Enable debug logging by setting the database debug flag:

```typescript
{
  database: {
    debug: true,
    apiConfig: {
      // ... your config
    }
  }
}
```

This will provide detailed logs of all API operations, sync activities, and error conditions.
