# SaaS Backend & Generic REST Plugins - Complete Implementation

## Overview

Two powerful backend integration plugins have been created to extend SchoolPilot3's connectivity:

1. **SaaS Backend Plugin** - For SchoolPilot's custom Go backend
2. **Generic REST Plugin** - For any REST API with full configurability

## 1. SaaS Backend Plugin

### Purpose
Connect to SchoolPilot's custom Go SaaS backend with support for:
- REST API
- GraphQL API
- WebSocket for real-time updates
- JWT/OAuth2 authentication
- Multi-tenant architecture

### Features
- ✅ **Dual API Support**: REST and GraphQL
- ✅ **Real-time Updates**: WebSocket integration
- ✅ **Smart Caching**: Client-side caching with TTL
- ✅ **Batch Operations**: Efficient bulk operations
- ✅ **Retry Logic**: Automatic retry with exponential backoff
- ✅ **Compression**: gzip compression support
- ✅ **Multi-tenant**: Tenant isolation built-in

### File Structure
```
src/plugins/builtin/saas-backend/
├── plugin.json                 # Plugin manifest
├── index.ts                    # Plugin entry point
├── SaaSBackendProvider.ts      # Main provider implementation
├── RESTClient.ts               # REST HTTP client
├── GraphQLClient.ts            # GraphQL client
└── WebSocketClient.ts          # WebSocket client
```

### Configuration Example
```json
{
  "apiUrl": "https://api.schoolpilot.com",
  "graphqlUrl": "https://api.schoolpilot.com/graphql",
  "authType": "jwt",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "tenantId": "school-123",
  "apiVersion": "v1",
  "useGraphQL": true,
  "enableWebSocket": true,
  "enableCache": true
}
```

### Usage Example
```typescript
import { useBackendProvider } from '@/hooks/useBackendProvider';

function MyComponent() {
  const { activeProvider } = useBackendProvider();
  
  // Use GraphQL for queries (faster)
  const students = await activeProvider.query('students', {
    filters: { status: 'Active' },
    limit: 100
  });
  
  // Subscribe to real-time updates
  const unsubscribe = activeProvider.subscribeToEntity('students', (data) => {
    console.log('Student updated:', data);
  });
  
  return <div>{/* UI */}</div>;
}
```

### Key Components

#### RESTClient
- Automatic retry with exponential backoff
- gzip compression support
- Tenant ID in headers
- API versioning

#### GraphQLClient
- Query caching
- Automatic error handling
- Mutation support
- Variable binding

#### WebSocketClient
- Automatic reconnection
- Channel subscriptions
- Authentication
- Message handling

### Supported Entities
- students
- employees
- courses
- programs
- classes
- subjects
- fees
- payments
- attendance
- grades
- assignments
- exams
- timetables
- announcements
- events

---

## 2. Generic REST Plugin

### Purpose
Connect to **any** REST API with full configurability:
- Custom endpoints per entity
- Flexible authentication
- Field mapping
- Pagination styles
- Filter strategies

### Features
- ✅ **Fully Configurable**: Every aspect is customizable
- ✅ **Multiple Auth Types**: API Key, Bearer, Basic, OAuth2, Custom
- ✅ **Field Mapping**: Map local fields to API fields
- ✅ **Pagination Support**: Offset, Page, Cursor styles
- ✅ **Filter Strategies**: Query params or JSON body
- ✅ **Response Parsing**: Configurable data extraction
- ✅ **Retry Logic**: Automatic retry on failures
- ✅ **Caching**: Optional client-side caching

### File Structure
```
src/plugins/builtin/generic-rest/
├── plugin.json                 # Plugin manifest
├── index.ts                    # Plugin entry point
├── GenericRESTProvider.ts      # Main provider implementation
└── README.md                   # Documentation
```

### Configuration Example

#### Basic Configuration
```json
{
  "baseUrl": "https://api.example.com",
  "authType": "apikey",
  "apiKey": "your-api-key",
  "apiKeyHeader": "X-API-Key",
  "entityEndpoints": {
    "students": {
      "basePath": "/students",
      "idField": "id",
      "methods": {
        "list": "GET /students",
        "get": "GET /students/:id",
        "create": "POST /students",
        "update": "PUT /students/:id",
        "delete": "DELETE /students/:id"
      }
    }
  },
  "fieldMappings": {
    "students": {
      "id": "id",
      "firstName": "first_name",
      "lastName": "last_name",
      "email": "email_address"
    }
  },
  "responseDataPath": "data",
  "paginationStyle": "offset",
  "enableCache": true
}
```

#### Advanced Configuration
```json
{
  "baseUrl": "https://api.example.com/v2",
  "authType": "bearer",
  "bearerToken": "your-bearer-token",
  
  "entityEndpoints": {
    "students": {
      "basePath": "/api/students",
      "methods": {
        "list": "GET /api/students",
        "get": "GET /api/students/:id",
        "create": "POST /api/students",
        "update": "PATCH /api/students/:id",
        "delete": "DELETE /api/students/:id"
      }
    },
    "courses": {
      "basePath": "/api/courses",
      "methods": {
        "list": "GET /api/courses",
        "get": "GET /api/courses/:id"
      }
    }
  },
  
  "fieldMappings": {
    "students": {
      "id": "student_id",
      "firstName": "first_name",
      "lastName": "last_name",
      "email": "email",
      "dateOfBirth": "dob",
      "enrollmentDate": "enrolled_at"
    },
    "courses": {
      "id": "course_id",
      "name": "course_name",
      "code": "course_code",
      "credits": "credit_hours"
    }
  },
  
  "responseDataPath": "data.results",
  "paginationStyle": "page",
  "paginationParams": {
    "page": "page",
    "perPage": "per_page",
    "limit": "limit",
    "offset": "offset"
  },
  
  "filterStyle": "query",
  "timeout": 30000,
  "retryAttempts": 3,
  "enableCache": true,
  "cacheTimeout": 300
}
```

### Usage Example
```typescript
import { useBackendProvider } from '@/hooks/useBackendProvider';

function StudentList() {
  const { activeProvider } = useBackendProvider();
  
  // Query with filters
  const students = await activeProvider.query('students', {
    filters: { status: 'active', grade: '10' },
    limit: 50,
    offset: 0,
    sort: { lastName: 1 }
  });
  
  // Create new student
  const newStudent = await activeProvider.create('students', {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com'
  });
  
  return <div>{/* Render students */}</div>;
}
```

### Authentication Types

#### 1. API Key
```json
{
  "authType": "apikey",
  "apiKey": "your-api-key",
  "apiKeyHeader": "X-API-Key"
}
```

#### 2. Bearer Token
```json
{
  "authType": "bearer",
  "bearerToken": "your-bearer-token"
}
```

#### 3. Basic Auth
```json
{
  "authType": "basic",
  "username": "your-username",
  "password": "your-password"
}
```

#### 4. Custom Headers
```json
{
  "authType": "custom",
  "customHeaders": {
    "X-Custom-Auth": "custom-value",
    "X-Client-ID": "client-123"
  }
}
```

### Pagination Styles

#### Offset/Limit
```json
{
  "paginationStyle": "offset",
  "paginationParams": {
    "limit": "limit",
    "offset": "offset"
  }
}
```
Generates: `?limit=50&offset=100`

#### Page/Per Page
```json
{
  "paginationStyle": "page",
  "paginationParams": {
    "page": "page",
    "perPage": "per_page"
  }
}
```
Generates: `?page=3&per_page=50`

#### Cursor-based
```json
{
  "paginationStyle": "cursor",
  "paginationParams": {
    "cursor": "cursor",
    "limit": "limit"
  }
}
```
Generates: `?cursor=abc123&limit=50`

### Response Data Extraction

#### Root Level
```json
{
  "responseDataPath": ""
}
```
For responses like: `[{...}, {...}]`

#### Nested Data
```json
{
  "responseDataPath": "data"
}
```
For responses like: `{ "data": [{...}, {...}] }`

#### Deep Nesting
```json
{
  "responseDataPath": "data.results"
}
```
For responses like: `{ "data": { "results": [{...}, {...}] } }`

---

## Comparison

| Feature | SaaS Backend | Generic REST |
|---------|--------------|--------------|
| **Target** | SchoolPilot Go backend | Any REST API |
| **GraphQL** | ✅ Yes | ❌ No |
| **WebSocket** | ✅ Yes | ❌ No |
| **Real-time** | ✅ Yes | ❌ No |
| **Batch Ops** | ✅ Native | ⚠️ Sequential |
| **Auth Types** | JWT, OAuth2 | All types |
| **Configuration** | ⚠️ Moderate | ✅ Highly flexible |
| **Field Mapping** | ⚠️ Same format | ✅ Fully configurable |
| **Pagination** | ✅ Standard | ✅ Multiple styles |
| **Caching** | ✅ Yes | ✅ Yes |
| **Retry Logic** | ✅ Yes | ✅ Yes |
| **Use Case** | SchoolPilot SaaS | Third-party APIs |

---

## Installation

### 1. Register Plugins

```typescript
// src/plugins/BuiltinLoader.ts
const BUILTIN_PLUGINS: PluginDirectory[] = [
  // ... existing plugins
  { name: 'saas-backend', path: './saas-backend' },
  { name: 'generic-rest', path: './generic-rest' },
];
```

### 2. Activate Plugin

Navigate to **Settings > Plugins** and activate the desired plugin.

---

## Use Cases

### SaaS Backend Plugin

**Use when:**
- Connecting to SchoolPilot's official SaaS backend
- Need real-time updates
- Want GraphQL performance
- Multi-tenant architecture
- Need WebSocket support

**Example scenarios:**
- SchoolPilot Cloud deployment
- Multi-school SaaS platform
- Real-time dashboards
- Live attendance tracking

### Generic REST Plugin

**Use when:**
- Integrating with third-party APIs
- Custom school management systems
- Legacy systems with REST APIs
- APIs with non-standard formats
- Need maximum flexibility

**Example scenarios:**
- BigCapital accounting integration
- Custom student information systems
- Third-party LMS integration
- Government reporting APIs
- Payment gateway APIs

---

## Testing

### SaaS Backend
```typescript
describe('SaaSBackendProvider', () => {
  it('should connect via REST', async () => {
    const provider = new SaaSBackendProvider();
    await provider.initialize(config);
    const health = await provider.healthCheck();
    expect(health.connected).toBe(true);
  });
  
  it('should query via GraphQL', async () => {
    const students = await provider.query('students', {
      limit: 10
    });
    expect(students).toBeInstanceOf(Array);
  });
  
  it('should receive WebSocket updates', (done) => {
    const unsubscribe = provider.subscribeToEntity('students', (data) => {
      expect(data).toBeDefined();
      unsubscribe();
      done();
    });
  });
});
```

### Generic REST
```typescript
describe('GenericRESTProvider', () => {
  it('should handle custom endpoints', async () => {
    const provider = new GenericRESTProvider();
    await provider.initialize({
      baseUrl: 'https://api.example.com',
      generic: {
        entityEndpoints: {
          students: {
            basePath: '/students',
            methods: {
              list: 'GET /students'
            }
          }
        }
      }
    });
    
    const students = await provider.query('students', {});
    expect(students).toBeInstanceOf(Array);
  });
  
  it('should map fields correctly', async () => {
    const provider = new GenericRESTProvider();
    const mapped = provider.mapToBackend('students', {
      firstName: 'John',
      lastName: 'Doe'
    });
    
    expect(mapped.first_name).toBe('John');
    expect(mapped.last_name).toBe('Doe');
  });
});
```

---

## Troubleshooting

### SaaS Backend

**GraphQL queries failing**
- Check `graphqlUrl` is correct
- Verify authentication token
- Check query syntax

**WebSocket not connecting**
- Verify `wsUrl` is correct
- Check firewall allows WebSocket
- Ensure `enableWebSocket: true`

### Generic REST

**Authentication errors**
- Verify `authType` matches API
- Check credentials are correct
- Verify header names match API

**Field mapping issues**
- Check `fieldMappings` configuration
- Verify API field names
- Test with API documentation

**Pagination not working**
- Verify `paginationStyle` matches API
- Check `paginationParams` names
- Test with API documentation

---

## Next Steps

1. **Test Both Plugins**
   - Set up test environments
   - Configure connections
   - Test all operations

2. **Create Examples**
   - Student management
   - Course enrollment
   - Fee collection

3. **Documentation**
   - API integration guides
   - Configuration examples
   - Troubleshooting guides

4. **Community**
   - Share configurations
   - Create templates
   - Help others integrate

---

## Resources

- [Backend Plugin Architecture](./architecture/backend-plugin-architecture.md)
- [Implementation Guide](./guides/backend-plugin-implementation-guide.md)
- [SchoolPilot Docs](https://docs.schoolpilot3.com)

## License

MIT License

---

**Status**: ✅ Complete and ready for testing

**Dependencies**: None (pure TypeScript)

**Compatibility**: SchoolPilot3 v1.0.0+
