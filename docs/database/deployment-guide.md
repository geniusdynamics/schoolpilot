# Database Deployment Guide

## Overview

This guide covers deploying the SchoolPilot3 database system across different environments and deployment modes.

## Deployment Modes

### 1. Development Mode

**Use Case**: Local development, testing, debugging

**Provider**: SQLite File-based storage

**Configuration**:
```typescript
{
  provider: 'sqlite-file',
  config: {
    databasePath: './data/school-dev.db',
    enableWAL: true,
    enableForeignKeys: true,
    enableDebugLogging: true,
    cacheSize: 5000,
    busyTimeout: 10000,
  }
}
```

**Environment Variables**:
```bash
NODE_ENV=development
DB_PROVIDER=sqlite-file
DB_PATH=./data/school-dev.db
DB_ENABLE_WAL=true
DB_ENABLE_FOREIGN_KEYS=true
DB_DEBUG=true
```

**Setup Steps**:

1. **Install Dependencies**:
   ```bash
   npm install better-sqlite3
   ```

2. **Create Data Directory**:
   ```bash
   mkdir -p data
   chmod 755 data
   ```

3. **Initialize Database**:
   ```typescript
   import { UnifiedDatabaseManager } from './services/database/UnifiedDatabaseManager';
   
   const dbManager = UnifiedDatabaseManager.getInstance();
   await dbManager.initialize({
     provider: 'sqlite-file',
     config: {
       databasePath: './data/school-dev.db',
       enableWAL: true,
       enableForeignKeys: true,
     },
   });
   ```

4. **Seed Development Data**:
   ```typescript
   import { UniversalDataGenerator } from './services/dataGeneration/UniversalDataGenerator';
   
   const generator = new UniversalDataGenerator();
   const testData = await generator.generateAllData({
     studentCount: 100,
     staffCount: 20,
     classCount: 10,
   });
   
   await dbManager.seedDatabase(testData);
   ```

### 2. Production Mode (Browser)

**Use Case**: Production web applications, PWAs

**Provider**: SQLite WASM + OPFS (Origin Private File System)

**Configuration**:
```typescript
{
  provider: 'sqlite-wasm',
  config: {
    wasmUrl: '/sqlite3.wasm',
    enableOPFS: true,
    databaseName: 'schoolpilot3',
    cacheSize: 20000,
    busyTimeout: 30000,
    enableWAL: true,
  }
}
```

**Environment Variables**:
```bash
NODE_ENV=production
DB_PROVIDER=sqlite-wasm
DB_WASM_URL=/sqlite3.wasm
DB_ENABLE_OPFS=true
DB_DATABASE_NAME=schoolpilot3
```

**Setup Steps**:

1. **Install WASM Dependencies**:
   ```bash
   npm install @sqlite.org/sqlite-wasm
   ```

2. **Copy WASM Files**:
   ```bash
   cp node_modules/@sqlite.org/sqlite-wasm/sqlite3.wasm public/
   cp node_modules/@sqlite.org/sqlite-wasm/sqlite3-worker1.js public/
   ```

3. **Configure Vite/Webpack**:
   ```typescript
   // vite.config.ts
   export default defineConfig({
     optimizeDeps: {
       exclude: ['@sqlite.org/sqlite-wasm']
     },
     server: {
       headers: {
         'Cross-Origin-Embedder-Policy': 'require-corp',
         'Cross-Origin-Opener-Policy': 'same-origin'
       }
     }
   });
   ```

4. **Initialize WASM Database**:
   ```typescript
   const dbManager = UnifiedDatabaseManager.getInstance();
   await dbManager.initialize({
     provider: 'sqlite-wasm',
     config: {
       wasmUrl: '/sqlite3.wasm',
       enableOPFS: true,
       databaseName: 'schoolpilot3',
     },
   });
   ```

### 3. Network Mode

**Use Case**: Multi-device synchronization, offline-first applications

**Provider**: PouchDB with CouchDB backend

**Configuration**:
```typescript
{
  provider: 'pouchdb',
  config: {
    localName: 'schoolpilot3_local',
    remoteUrl: 'https://couchdb.example.com/schoolpilot3',
    enableSync: true,
    syncOptions: {
      live: true,
      retry: true,
      continuous: true,
    },
    auth: {
      username: 'school_user',
      password: 'secure_password',
    },
  }
}
```

**Environment Variables**:
```bash
NODE_ENV=production
DB_PROVIDER=pouchdb
DB_LOCAL_NAME=schoolpilot3_local
DB_REMOTE_URL=https://couchdb.example.com/schoolpilot3
DB_ENABLE_SYNC=true
DB_AUTH_USERNAME=school_user
DB_AUTH_PASSWORD=secure_password
```

**Setup Steps**:

1. **Install PouchDB**:
   ```bash
   npm install pouchdb pouchdb-adapter-idb pouchdb-adapter-http
   ```

2. **Setup CouchDB Server**:
   ```bash
   # Using Docker
   docker run -d --name couchdb \
     -e COUCHDB_USER=admin \
     -e COUCHDB_PASSWORD=admin_password \
     -p 5984:5984 \
     couchdb:3.3
   ```

3. **Configure CouchDB**:
   ```bash
   # Create database
   curl -X PUT http://admin:admin_password@localhost:5984/schoolpilot3
   
   # Create user
   curl -X PUT http://admin:admin_password@localhost:5984/_users/org.couchdb.user:school_user \
     -H "Content-Type: application/json" \
     -d '{"name": "school_user", "password": "secure_password", "roles": [], "type": "user"}'
   ```

4. **Initialize PouchDB**:
   ```typescript
   const dbManager = UnifiedDatabaseManager.getInstance();
   await dbManager.initialize({
     provider: 'pouchdb',
     config: {
       localName: 'schoolpilot3_local',
       remoteUrl: 'https://couchdb.example.com/schoolpilot3',
       enableSync: true,
       auth: {
         username: 'school_user',
         password: 'secure_password',
       },
     },
   });
   ```

### 4. Enterprise Mode

**Use Case**: Integration with existing school management systems

**Provider**: Backend API integration

**Configuration**:
```typescript
{
  provider: 'backend-api',
  config: {
    baseUrl: 'https://api.school.edu',
    apiKey: 'your-api-key',
    timeout: 30000,
    retryAttempts: 3,
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    endpoints: {
      students: '/api/v1/students',
      staff: '/api/v1/staff',
      classes: '/api/v1/classes',
    },
  }
}
```

**Environment Variables**:
```bash
NODE_ENV=production
DB_PROVIDER=backend-api
DB_BASE_URL=https://api.school.edu
DB_API_KEY=your-api-key
DB_TIMEOUT=30000
DB_RETRY_ATTEMPTS=3
DB_ENABLE_CACHING=true
```

**Setup Steps**:

1. **Configure API Access**:
   ```typescript
   // Set up API credentials
   const apiConfig = {
     baseUrl: process.env.DB_BASE_URL,
     apiKey: process.env.DB_API_KEY,
     headers: {
       'Authorization': `Bearer ${process.env.DB_API_KEY}`,
       'Content-Type': 'application/json',
     },
   };
   ```

2. **Initialize Backend Provider**:
   ```typescript
   const dbManager = UnifiedDatabaseManager.getInstance();
   await dbManager.initialize({
     provider: 'backend-api',
     config: {
       baseUrl: 'https://api.school.edu',
       apiKey: 'your-api-key',
       timeout: 30000,
       retryAttempts: 3,
     },
   });
   ```

## Environment-Specific Configurations

### Development Environment

**File**: `.env.development`
```bash
# Database
DB_PROVIDER=sqlite-file
DB_PATH=./data/school-dev.db
DB_ENABLE_WAL=true
DB_DEBUG=true

# Connection Pool
DB_POOL_MIN_CONNECTIONS=1
DB_POOL_MAX_CONNECTIONS=5

# Backup (disabled in development)
DB_BACKUP_ENABLED=false

# Security (relaxed in development)
DB_AUDIT_ENABLED=true
DB_VALIDATION_STRICT=false
```

### Staging Environment

**File**: `.env.staging`
```bash
# Database
DB_PROVIDER=sqlite-wasm
DB_WASM_URL=/sqlite3.wasm
DB_ENABLE_OPFS=true
DB_DATABASE_NAME=schoolpilot3_staging

# Connection Pool
DB_POOL_MIN_CONNECTIONS=2
DB_POOL_MAX_CONNECTIONS=8

# Backup
DB_BACKUP_ENABLED=true
DB_BACKUP_INTERVAL=43200000  # 12 hours
DB_BACKUP_COMPRESSION=true

# Security
DB_AUDIT_ENABLED=true
DB_VALIDATION_STRICT=true
```

### Production Environment

**File**: `.env.production`
```bash
# Database
DB_PROVIDER=sqlite-wasm
DB_WASM_URL=/sqlite3.wasm
DB_ENABLE_OPFS=true
DB_DATABASE_NAME=schoolpilot3

# Connection Pool
DB_POOL_MIN_CONNECTIONS=3
DB_POOL_MAX_CONNECTIONS=15
DB_POOL_ACQUIRE_TIMEOUT=30000

# Backup
DB_BACKUP_ENABLED=true
DB_BACKUP_INTERVAL=86400000  # 24 hours
DB_BACKUP_COMPRESSION=true
DB_BACKUP_ENCRYPTION=true
DB_BACKUP_MAX_FILES=30

# Security
DB_AUDIT_ENABLED=true
DB_AUDIT_RETENTION_DAYS=365
DB_VALIDATION_STRICT=true
DB_SANITIZATION_ENABLED=true

# Performance
DB_CACHE_SIZE=50000
DB_BUSY_TIMEOUT=30000
DB_ENABLE_QUERY_OPTIMIZATION=true
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Create data directory
RUN mkdir -p /app/data && chown -R node:node /app/data

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  schoolpilot3:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_PROVIDER=sqlite-file
      - DB_PATH=/app/data/school.db
      - DB_BACKUP_ENABLED=true
    volumes:
      - ./data:/app/data
      - ./backups:/app/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  couchdb:
    image: couchdb:3.3
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=admin_password
    ports:
      - "5984:5984"
    volumes:
      - couchdb_data:/opt/couchdb/data
    restart: unless-stopped

volumes:
  couchdb_data:
```

## Kubernetes Deployment

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: schoolpilot3
  labels:
    app: schoolpilot3
spec:
  replicas: 3
  selector:
    matchLabels:
      app: schoolpilot3
  template:
    metadata:
      labels:
        app: schoolpilot3
    spec:
      containers:
      - name: schoolpilot3
        image: schoolpilot3:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_PROVIDER
          value: "backend-api"
        - name: DB_BASE_URL
          valueFrom:
            secretKeyRef:
              name: db-config
              key: base-url
        - name: DB_API_KEY
          valueFrom:
            secretKeyRef:
              name: db-config
              key: api-key
        volumeMounts:
        - name: data-volume
          mountPath: /app/data
        - name: backup-volume
          mountPath: /app/backups
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: schoolpilot3-data
      - name: backup-volume
        persistentVolumeClaim:
          claimName: schoolpilot3-backups
---
apiVersion: v1
kind: Service
metadata:
  name: schoolpilot3-service
spec:
  selector:
    app: schoolpilot3
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Monitoring and Logging

### Application Monitoring

```typescript
// Add monitoring middleware
import { DatabaseMonitoringDashboard } from './components/DatabaseMonitoringDashboard';

// Monitor database health
const healthCheck = async () => {
  const dbManager = UnifiedDatabaseManager.getInstance();
  const health = await dbManager.getHealthStatus();
  
  if (!health.isHealthy) {
    console.error('Database health issues:', health.issues);
    // Send alerts
  }
  
  return health;
};

// Set up periodic health checks
setInterval(healthCheck, 60000); // Every minute
```

### Logging Configuration

```typescript
// Configure logging
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'schoolpilot3-db' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## Security Considerations

### Production Security Checklist

- [ ] Enable HTTPS/TLS for all connections
- [ ] Use strong authentication credentials
- [ ] Enable audit logging
- [ ] Configure proper CORS policies
- [ ] Implement rate limiting
- [ ] Enable data encryption at rest
- [ ] Use secure backup storage
- [ ] Regular security updates
- [ ] Monitor for suspicious activity
- [ ] Implement proper access controls

### Security Configuration

```typescript
// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: true,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
```

## Performance Optimization

### Production Optimizations

1. **Enable Connection Pooling**:
   ```typescript
   databaseConnectionPool.updateConfig({
     minConnections: 3,
     maxConnections: 15,
     acquireTimeoutMs: 30000,
   });
   ```

2. **Configure Caching**:
   ```typescript
   dbManager.updateConfig({
     enableQueryCache: true,
     cacheSize: 50000,
     cacheTTL: 300000, // 5 minutes
   });
   ```

3. **Optimize Indexes**:
   ```typescript
   // Create indexes for frequently queried fields
   const studentCollection = await dbManager.getCollection('students');
   await studentCollection.createIndex({ name: 1 });
   await studentCollection.createIndex({ classId: 1 });
   await studentCollection.createIndex({ email: 1 }, { unique: true });
   ```

4. **Enable Compression**:
   ```typescript
   app.use(compression({
     level: 6,
     threshold: 1024,
   }));
   ```

## Backup and Recovery

### Automated Backup Setup

```typescript
// Configure automated backups
databaseBackupManager.updateConfig({
  enableAutomaticBackup: true,
  backupInterval: 24 * 60 * 60 * 1000, // Daily
  maxBackupFiles: 30, // Keep 30 days
  compressionEnabled: true,
  encryptionEnabled: true,
  backupPath: '/app/backups',
});

// Start backup service
databaseBackupManager.startAutomaticBackup();

// Monitor backup health
databaseBackupManager.addCompletedListener((metadata) => {
  console.log(`Backup completed: ${metadata.id}`);
  
  if (metadata.status === 'failed') {
    // Send alert
    console.error(`Backup failed: ${metadata.error}`);
  }
});
```

### Disaster Recovery Plan

1. **Regular Backup Verification**:
   ```bash
   # Verify backup integrity
   npm run verify-backups
   ```

2. **Recovery Procedures**:
   ```typescript
   // Emergency recovery
   const latestBackup = databaseBackupManager.getBackups()[0];
   await databaseBackupManager.restoreBackup(provider, {
     backupId: latestBackup.id,
     overwriteExisting: true,
     validateBeforeRestore: true,
   });
   ```

3. **Data Migration**:
   ```typescript
   // Migrate between providers
   const sourceProvider = await dbManager.getProvider();
   const backupId = await databaseBackupManager.createBackup(sourceProvider);
   
   await dbManager.initialize({ provider: 'new-provider' });
   const targetProvider = await dbManager.getProvider();
   
   await databaseBackupManager.restoreBackup(targetProvider, {
     backupId,
     overwriteExisting: true,
   });
   ```

## Troubleshooting

### Common Deployment Issues

1. **WASM Loading Errors**:
   - Ensure WASM files are served with correct MIME types
   - Check CORS headers for WASM files
   - Verify Cross-Origin-Embedder-Policy headers

2. **Connection Pool Exhaustion**:
   - Monitor pool metrics
   - Increase max connections if needed
   - Check for connection leaks

3. **Backup Failures**:
   - Verify disk space
   - Check file permissions
   - Monitor backup logs

4. **Performance Issues**:
   - Enable query optimization
   - Add appropriate indexes
   - Monitor memory usage

### Debug Commands

```bash
# Check database status
npm run db:status

# Verify configuration
npm run db:config

# Test connections
npm run db:test-connection

# Run health checks
npm run db:health

# Generate performance report
npm run db:performance-report
```

## Migration Procedures

### Version Upgrades

1. **Backup Current Data**:
   ```typescript
   const backupId = await databaseBackupManager.createBackup(currentProvider);
   ```

2. **Update Application**:
   ```bash
   git pull origin main
   npm install
   npm run build
   ```

3. **Run Migrations**:
   ```typescript
   await dbManager.runMigrations();
   ```

4. **Verify Upgrade**:
   ```typescript
   const validation = await dbManager.validateDataIntegrity();
   ```

### Provider Migration

See the [Migration Guide](./README.md#migration-guide) for detailed provider migration procedures.

## Support and Maintenance

### Regular Maintenance Tasks

- [ ] Monitor database performance metrics
- [ ] Review and rotate backup files
- [ ] Update security configurations
- [ ] Check for software updates
- [ ] Verify data integrity
- [ ] Review audit logs
- [ ] Test disaster recovery procedures

### Support Resources

- [Database Documentation](./README.md)
- [API Reference](./README.md#api-reference)
- [Troubleshooting Guide](./troubleshooting.md)
- [Performance Tuning](./performance.md)
- [Security Best Practices](./security.md)