# Deployment Modes Specification

## Overview

SchoolPilot3 supports six distinct deployment modes, each optimized for different school environments and technical capabilities. This document defines the technical specifications, data layer configurations, and sync strategies for each mode.

---

## Deployment Mode Matrix

| Mode | Target User | Users | Database | Network | Sync | Complexity |
|------|-------------|-------|----------|---------|------|------------|
| **Standalone** | Single laptop schools | 1 | SQLite OPFS | None | None | ⭐ |
| **Networked** | Small school LAN | 2-20 | SQLite (shared) | LAN | WebSocket | ⭐⭐ |
| **Hosted** | Medium school server | 20-100 | PostgreSQL | LAN/WAN | Real-time | ⭐⭐⭐ |
| **SaaS Backend** | Multi-tenant cloud | 100+ | PostgreSQL | Internet | Continuous | ⭐⭐⭐⭐ |
| **ERPNext** | ERPNext users | Varies | ERPNext | Internet | API Bridge | ⭐⭐⭐⭐ |
| **Mobile** | Teachers on-field | 1/device | SQLite | Varies | Periodic | ⭐⭐ |

---

## Mode 1: Standalone

### Use Case
- Single teacher or small school with one computer
- No network infrastructure
- Need to start immediately without setup

### Architecture
```
┌─────────────────────────────────────────┐
│           Single Laptop                 │
│  ┌─────────────────────────────────┐   │
│  │        Browser (Electron)       │   │
│  │  ┌───────────────────────────┐  │   │
│  │  │   SchoolPilot React App   │  │   │
│  │  └───────────────────────────┘  │   │
│  │              │                  │   │
│  │              ▼                  │   │
│  │  ┌───────────────────────────┐  │   │
│  │  │   SQLite (OPFS)           │  │   │
│  │  │   ~/SchoolPilot/data.db   │  │   │
│  │  └───────────────────────────┘  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Technical Specifications

#### Storage
```typescript
const standaloneConfig = {
  storage: {
    type: 'sqlite-opfs',
    location: 'origin-private-file-system',
    filename: 'schoolpilot.db',
    backup: {
      enabled: true,
      interval: '1h',     // Auto-backup every hour
      location: 'downloads', // ~/Downloads/schoolpilot-backup/
      retention: 10       // Keep last 10 backups
    }
  }
};
```

#### Data Layer
```typescript
class StandaloneProvider implements DataProvider {
  private db: SQLiteDatabase;
  
  async initialize(): Promise<void> {
    // Initialize OPFS
    const root = await navigator.storage.getDirectory();
    const dbFile = await root.getFileHandle('schoolpilot.db', { create: true });
    
    // Load SQLite WASM
    this.db = await initSQLite(dbFile);
    
    // Run migrations
    await this.runMigrations();
  }
  
  async find<T>(collection: string, query: Query): Promise<T[]> {
    const sql = this.buildSQL(collection, query);
    return this.db.query(sql);
  }
  
  async backup(): Promise<Blob> {
    const data = await this.db.export();
    return new Blob([data], { type: 'application/x-sqlite3' });
  }
}
```

#### Features
- ✅ Offline-only operation
- ✅ Auto-save to disk
- ✅ One-click backup
- ✅ Export/import data
- ✅ No server setup required
- ❌ No multi-user support
- ❌ No real-time sync

#### Installation
```bash
# Option 1: Web (browser)
Open https://app.schoolpilot.io in browser
Data stored in browser's OPFS

# Option 2: Desktop (Electron)
Download SchoolPilot.exe / SchoolPilot.dmg
Install and run
Data stored in ~/SchoolPilot/data.db

# Option 3: Portable
Download SchoolPilot-Portable.zip
Extract to USB drive
Run from any Windows PC
```

---

## Mode 2: Networked (Small School LAN)

### Use Case
- Small school with 5-20 computers
- Local network available
- Need shared data across all computers
- No internet required

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        School LAN                           │
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐  │
│  │   Laptop 1   │◄────►│   Mini PC    │◄────►│ Laptop 2 │  │
│  │  (Teacher)   │      │  (Server)    │      │ (Admin)  │  │
│  └──────────────┘      └──────┬───────┘      └──────────┘  │
│                               │                            │
│                               ▼                            │
│                       ┌──────────────┐                      │
│                       │   SQLite     │                      │
│                       │   (Shared)   │                      │
│                       └──────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technical Specifications

#### Server Component
```typescript
// Lightweight LAN server
class LANServer {
  private app: Express;
  private wss: WebSocketServer;
  private db: SQLiteDatabase;
  
  async start(): Promise<void> {
    // SQLite with file locking
    this.db = await SQLite.open('/shared/schoolpilot.db', {
      busyTimeout: 5000,
      WAL: true  // Write-Ahead Logging for concurrency
    });
    
    // REST API
    this.app = express();
    this.setupRoutes();
    
    // WebSocket for real-time
    this.wss = new WebSocketServer({ port: 8080 });
    this.setupWebSocket();
    
    // mDNS for auto-discovery
    this.setupDiscovery();
  }
  
  private setupWebSocket(): void {
    this.wss.on('connection', (ws) => {
      // Broadcast changes to all clients
      this.db.on('change', (change) => {
        ws.send(JSON.stringify({
          type: 'DATA_CHANGED',
          payload: change
        }));
      });
    });
  }
  
  private setupDiscovery(): void {
    // Advertise service on LAN
    const bonjour = new Bonjour();
    bonjour.publish({
      name: 'SchoolPilot Server',
      type: 'schoolpilot',
      port: 3000
    });
  }
}
```

#### Client Configuration
```typescript
const networkedConfig = {
  mode: 'networked',
  storage: {
    primary: 'backend-api',  // Connect to LAN server
    local: 'sqlite-opfs'     // Local cache for offline
  },
  server: {
    discovery: 'auto',       // Auto-find server on LAN
    manual: '192.168.1.100:3000', // Fallback
    reconnect: true,
    reconnectInterval: 5000
  },
  sync: {
    mode: 'real-time',       // WebSocket for instant sync
    offlineSupport: true     // Work offline, sync when connected
  }
};
```

#### Auto-Discovery
```typescript
class ServerDiscovery {
  async findServer(): Promise<string | null> {
    // Method 1: mDNS/Bonjour
    const bonjour = new Bonjour();
    const services = await bonjour.find({ type: 'schoolpilot' });
    if (services.length > 0) {
      return `http://${services[0].host}:${services[0].port}`;
    }
    
    // Method 2: Scan common IP range
    for (let i = 1; i <= 254; i++) {
      const ip = `192.168.1.${i}`;
      if (await this.pingServer(ip)) {
        return `http://${ip}:3000`;
      }
    }
    
    return null;
  }
}
```

#### Features
- ✅ Multi-user on LAN
- ✅ Real-time sync
- ✅ Auto-discovery
- ✅ Offline capability
- ✅ No internet required
- ⚠️ Requires one computer as server
- ⚠️ Limited to local network

#### Setup Process
```bash
# On server computer (Windows/Linux/Mac)
npm install -g @schoolpilot/lan-server
schoolpilot-server --data-dir ./data

# On client computers
# Just open browser, auto-discovers server
# Or enter server IP manually
```

---

## Mode 3: Hosted (School Server)

### Use Case
- Medium school with dedicated server
- IT staff available
- Need browser access from any computer
- May have multiple campuses

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     School Network                          │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      ┌──────────┐   │
│  │ Lab PC  │  │ Teacher │  │  Admin  │      │  Server  │   │
│  │   01    │  │ Laptop  │  │  Office │      │ (Docker) │   │
│  └────┬────┘  └────┬────┘  └────┬────┘      └────┬─────┘   │
│       │            │            │                │          │
│       └────────────┴────────────┘                │          │
│                        │                         │          │
│                        ▼                         ▼          │
│                   Browser Access          PostgreSQL        │
│                   (HTTP/HTTPS)              + Redis         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technical Specifications

#### Infrastructure
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: schoolpilot/hosted:latest
    ports:
      - "80:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/schoolpilot
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis
  
  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=schoolpilot
      - POSTGRES_USER=schoolpilot
      - POSTGRES_PASSWORD=${DB_PASSWORD}
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### Backend API
```typescript
// Fastify or Express backend
class HostedProvider implements DataProvider {
  private baseURL: string;
  private token: string;
  private socket: Socket;
  
  async initialize(config: HostedConfig): Promise<void> {
    this.baseURL = config.serverUrl;
    
    // Authenticate
    const auth = await this.authenticate(config.credentials);
    this.token = auth.token;
    
    // Real-time connection
    this.socket = io(this.baseURL, {
      auth: { token: this.token }
    });
  }
  
  async find<T>(collection: string, query: Query): Promise<T[]> {
    const response = await fetch(
      `${this.baseURL}/api/${collection}?${qs.stringify(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.json();
  }
  
  subscribe<T>(collection: string, query: Query): Observable<T[]> {
    return new Observable(subscriber => {
      // Subscribe to real-time updates
      this.socket.emit('subscribe', { collection, query });
      
      this.socket.on('data-change', (data) => {
        if (data.collection === collection) {
          subscriber.next(data.records);
        }
      });
      
      return () => {
        this.socket.emit('unsubscribe', { collection });
      };
    });
  }
}
```

#### Features
- ✅ Browser-based access
- ✅ Centralized database
- ✅ User authentication
- ✅ Role-based access control
- ✅ Real-time updates
- ✅ Backup automation
- ⚠️ Requires server maintenance
- ⚠️ Network dependency

---

## Mode 4: SaaS Backend (Cloud)

### Use Case
- Multi-tenant cloud deployment
- Schools without IT staff
- Automatic updates
- Scalable infrastructure

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      Cloud Infrastructure                   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   School A   │  │   School B   │  │   School C   │      │
│  │  (Tenant 1)  │  │  (Tenant 2)  │  │  (Tenant 3)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           ▼                                 │
│              ┌────────────────────────┐                     │
│              │    API Gateway         │                     │
│              │  (Kong/AWS API GW)     │                     │
│              └───────────┬────────────┘                     │
│                          │                                  │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                 │
│    ┌─────────┐     ┌─────────┐     ┌─────────┐             │
│    │  App    │     │  App    │     │  App    │             │
│    │Server 1 │     │Server 2 │     │Server 3 │             │
│    └────┬────┘     └────┬────┘     └────┬────┘             │
│         └────────────────┼────────────────┘                 │
│                          ▼                                  │
│              ┌─────────────────────┐                        │
│              │   PostgreSQL        │                        │
│              │   (Multi-tenant)    │                        │
│              │   Row-level security│                        │
│              └─────────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technical Specifications

#### Multi-Tenancy
```typescript
// Database-level tenant isolation
const tenantMiddleware = async (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || 
                   req.user.tenantId;
  
  // Set PostgreSQL RLS context
  await db.query(`SET app.current_tenant = '${tenantId}'`);
  
  // All queries automatically filtered by tenant
  next();
};

// Schema per tenant (alternative)
const getTenantDB = (tenantId: string) => {
  return knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    searchPath: [`tenant_${tenantId}`, 'public']
  });
};
```

#### Subscription Management
```typescript
interface Subscription {
  tenantId: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  limits: {
    maxStudents: number;
    maxUsers: number;
    maxStorage: number; // GB
    features: string[];
  };
  billing: {
    status: 'active' | 'past_due' | 'cancelled';
    currentPeriodEnd: Date;
  };
}

// Enforce limits
const enforceLimits = async (tenantId: string, action: string) => {
  const subscription = await getSubscription(tenantId);
  const currentUsage = await getUsage(tenantId);
  
  if (action === 'addStudent' && 
      currentUsage.students >= subscription.limits.maxStudents) {
    throw new LimitExceededError(
      `Maximum ${subscription.limits.maxStudents} students allowed`
    );
  }
};
```

#### Features
- ✅ Automatic updates
- ✅ No server maintenance
- ✅ Scalable infrastructure
- ✅ Global CDN
- ✅ Automated backups
- ✅ 24/7 monitoring
- ✅ Pay-as-you-grow
- ⚠️ Requires internet
- ⚠️ Subscription cost

---

## Mode 5: ERPNext Integration

### Use Case
- Schools already using ERPNext
- Need advanced financial features
- Want to keep academic data separate
- Bidirectional sync required

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    ERPNext Integration                      │
│                                                             │
│  ┌─────────────────────┐      ┌─────────────────────┐      │
│  │    SchoolPilot3     │◄────►│      ERPNext        │      │
│  │   (Academic Focus)  │      │  (Finance Focus)    │      │
│  │                     │      │                     │      │
│  │  - Students         │      │  - Accounting       │      │
│  │  - Attendance       │      │  - Fees             │      │
│  │  - Marks            │      │  - Payroll          │      │
│  │  - Timetable        │      │  - Inventory        │      │
│  │                     │      │  - Procurement      │      │
│  └─────────────────────┘      └─────────────────────┘      │
│           │                            │                    │
│           └────────────┬───────────────┘                    │
│                        ▼                                    │
│              ┌──────────────────┐                           │
│              │   Sync Bridge    │                           │
│              │  (Bidirectional) │                           │
│              └──────────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technical Specifications

#### ERPNext Connector
```typescript
class ERPNextProvider implements DataProvider {
  private baseURL: string;
  private apiKey: string;
  private apiSecret: string;
  
  async initialize(config: ERPNextConfig): Promise<void> {
    this.baseURL = config.erpnextUrl;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }
  
  async find<T>(collection: string, query: Query): Promise<T[]> {
    // Map SchoolPilot collection to ERPNext doctype
    const doctype = this.mapCollectionToDoctype(collection);
    
    const response = await fetch(
      `${this.baseURL}/api/resource/${doctype}?${this.buildFilters(query)}`,
      {
        headers: {
          'Authorization': `token ${this.apiKey}:${this.apiSecret}`
        }
      }
    );
    
    return this.transformERPNextResponse(await response.json());
  }
  
  private mapCollectionToDoctype(collection: string): string {
    const mapping = {
      'students': 'Student',
      'feeTransactions': 'Fees',
      'payments': 'Payment Entry',
      'staff': 'Employee'
    };
    return mapping[collection] || collection;
  }
}
```

#### Sync Strategy
```typescript
interface SyncConfig {
  entities: {
    [entityName: string]: {
      direction: 'to-erpnext' | 'from-erpnext' | 'bidirectional';
      frequency: 'realtime' | 'hourly' | 'daily';
      conflictResolution: 'erpnext-wins' | 'schoolpilot-wins' | 'manual';
      fieldMapping: Record<string, string>;
    };
  };
}

const defaultSyncConfig: SyncConfig = {
  entities: {
    students: {
      direction: 'bidirectional',
      frequency: 'realtime',
      conflictResolution: 'timestamp-wins',
      fieldMapping: {
        'firstName': 'first_name',
        'lastName': 'last_name',
        'dateOfBirth': 'date_of_birth',
        'gender': 'gender'
      }
    },
    marks: {
      direction: 'to-erpnext', // SchoolPilot is source of truth
      frequency: 'daily',
      conflictResolution: 'schoolpilot-wins',
      fieldMapping: {
        'studentId': 'student',
        'subject': 'course',
        'score': 'score',
        'grade': 'grade'
      }
    },
    fees: {
      direction: 'from-erpnext', // ERPNext is source of truth
      frequency: 'realtime',
      conflictResolution: 'erpnext-wins',
      fieldMapping: {
        'student': 'student',
        'amount': 'grand_total',
        'paidAmount': 'paid_amount',
        'status': 'status'
      }
    }
  }
};
```

#### Features
- ✅ Reuse ERPNext finance module
- ✅ Seamless data sync
- ✅ Unified reporting
- ✅ Single sign-on
- ⚠️ Requires ERPNext expertise
- ⚠️ Customization complexity

---

## Mode 6: Mobile (Future)

### Use Case
- Teachers taking attendance on tablets
- Field trips data collection
- Offline capability in remote areas
- Push notifications

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile Architecture                    │
│                                                             │
│  ┌─────────────────────┐      ┌─────────────────────┐      │
│  │   React Native App  │◄────►│   Sync Gateway      │      │
│  │                     │      │   (Server)          │      │
│  │  - SQLite (local)   │      │                     │      │
│  │  - Offline queue    │      │  - Conflict resolve │      │
│  │  - Background sync  │      │  - Broadcast        │      │
│  │  - Push notifs      │      │  - Rate limit       │      │
│  └─────────────────────┘      └─────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technical Specifications

#### Mobile Data Layer
```typescript
class MobileProvider implements DataProvider {
  private localDb: SQLite;
  private syncQueue: Operation[];
  private networkStatus: 'online' | 'offline';
  
  async initialize(): Promise<void> {
    // React Native SQLite
    this.localDb = await SQLite.openDatabase({
      name: 'SchoolPilot.db',
      location: 'default'
    });
    
    // Set up network monitoring
    NetInfo.addEventListener(state => {
      this.networkStatus = state.isConnected ? 'online' : 'offline';
      if (this.networkStatus === 'online') {
        this.processSyncQueue();
      }
    });
  }
  
  async create<T>(collection: string, data: T): Promise<T> {
    // Always save locally first
    const result = await this.localDb.executeSql(
      `INSERT INTO ${collection} ...`,
      [...values]
    );
    
    // Queue for sync
    this.syncQueue.push({
      type: 'create',
      collection,
      data,
      timestamp: Date.now()
    });
    
    // Try immediate sync if online
    if (this.networkStatus === 'online') {
      this.processSyncQueue();
    }
    
    return result;
  }
  
  private async processSyncQueue(): Promise<void> {
    while (this.syncQueue.length > 0) {
      const operation = this.syncQueue[0];
      try {
        await this.syncToServer(operation);
        this.syncQueue.shift(); // Remove on success
      } catch (error) {
        // Keep in queue for retry
        break;
      }
    }
  }
}
```

#### Sync Optimizations for Mobile
```typescript
const mobileSyncConfig = {
  // Delta sync - only changed fields
  deltaSync: true,
  
  // Compression for large payloads
  compression: 'gzip',
  
  // Batch operations
  batchSize: 50,
  
  // Sync priority
  priority: [
    'attendance',      // Real-time critical
    'marks',          // Important
    'students',       // Important
    'fees',           // Daily sync ok
    'reports'         // Weekly sync ok
  ],
  
  // Background sync constraints
  backgroundSync: {
    requiresBatteryLevel: 20,     // Don't sync if battery < 20%
    requiresCharging: false,      // Can sync without charging
    requiresWifi: true            // Only on WiFi for large syncs
  }
};
```

---

## Mode Detection & Auto-Configuration

### Runtime Detection
```typescript
class DeploymentModeDetector {
  async detect(): Promise<DeploymentMode> {
    // Check for server connection
    const serverUrl = await this.checkForServer();
    if (serverUrl) {
      const serverType = await this.identifyServerType(serverUrl);
      if (serverType === 'saas') return 'saas';
      if (serverType === 'hosted') return 'hosted';
      if (serverType === 'lan') return 'networked';
    }
    
    // Check for ERPNext
    const erpnextUrl = await this.checkForERPNext();
    if (erpnextUrl) return 'erpnext';
    
    // Default to standalone
    return 'standalone';
  }
  
  private async checkForServer(): Promise<string | null> {
    // Try localhost (development)
    if (await this.ping('http://localhost:3000')) {
      return 'http://localhost:3000';
    }
    
    // Try LAN discovery
    const discovered = await discoverServer();
    if (discovered) return discovered;
    
    return null;
  }
}
```

### Configuration Wizard
```typescript
interface SetupWizard {
  step1_detectMode(): Promise<DeploymentMode>;
  
  step2_configure(mode: DeploymentMode): Promise<Config>;
  
  step3_testConnection(config: Config): Promise<TestResult>;
  
  step4_migrateData(config: Config): Promise<MigrationResult>;
  
  step5_complete(): void;
}
```

---

## Data Migration Between Modes

### Standalone → Networked
```typescript
const migrateStandaloneToNetworked = async (
  localDb: SQLite,
  serverUrl: string
): Promise<void> => {
  // Export local data
  const backup = await localDb.export();
  
  // Upload to server
  const formData = new FormData();
  formData.append('backup', new Blob([backup]));
  
  await fetch(`${serverUrl}/api/import`, {
    method: 'POST',
    body: formData
  });
  
  // Switch mode
  await setDeploymentMode('networked', { serverUrl });
};
```

### Networked → SaaS
```typescript
const migrateNetworkedToSaaS = async (
  serverUrl: string,
  saasCredentials: Credentials
): Promise<void> => {
  // Create tenant in SaaS
  const tenant = await createTenant(saasCredentials);
  
  // Extract data from LAN server
  const data = await extractAllData(serverUrl);
  
  // Transform for multi-tenancy
  const tenantData = addTenantId(data, tenant.id);
  
  // Bulk import to SaaS
  await bulkImportToSaaS(tenantData, saasCredentials);
};
```

---

## Security Considerations

### By Mode

| Mode | Data at Rest | Data in Transit | Authentication |
|------|--------------|-----------------|----------------|
| Standalone | OS encryption | N/A | Local only |
| Networked | SQLite encryption | TLS + LAN isolation | JWT |
| Hosted | PostgreSQL encryption | TLS | JWT + Sessions |
| SaaS | AES-256 + Tenant isolation | TLS 1.3 | JWT + MFA |
| ERPNext | ERPNext security | TLS | API Keys |
| Mobile | SQLite encryption | TLS + Cert pinning | JWT + Biometric |

### Encryption
```typescript
// SQLite encryption for standalone/mobile
const encryptedDB = await SQLite.openDatabase({
  name: 'schoolpilot.db',
  key: await getEncryptionKey() // From secure enclave
});

// Field-level encryption for sensitive data
const encryptedStudent = {
  ...student,
  ssn: await encrypt(student.ssn),
  parentPhone: await encrypt(student.parentPhone)
};
```

---

## Appendix: Decision Tree

```
Is this for a single computer?
├── YES → Standalone Mode
│   └── Do you need mobile access later?
│       └── YES → Consider future mobile migration
│
├── NO → Multiple computers?
│   ├── Small school (2-20 computers)?
│   │   └── Have local network?
│   │       ├── YES → Networked Mode
│   │       └── NO → Standalone + periodic export/import
│   │
│   ├── Medium school (20-100 users)?
│   │   └── Have IT staff?
│   │       ├── YES → Hosted Mode
│   │       └── NO → SaaS Mode
│   │
│   └── Large school (100+ users)?
│       └── Already using ERPNext?
│           ├── YES → ERPNext Integration
│           └── NO → SaaS Mode
│
└── Special Requirements?
    ├── Need offline mobile? → Mobile Mode
    ├── Advanced finance? → ERPNext Integration
    └── No internet? → Standalone/Networked only
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-08  
**Author:** Architecture Team
