# Phase 3: Backend Integration & ERPNext Sync

> **Clarification:** SchoolPilot3 is a single-tenant companion app. Each instance serves ONE school. Phase 3 focuses on connecting TO backends, not BUILDING a multi-tenant backend.

---

## Phase 3 Goals

1. **Backend API Client** - Generic HTTP client for external backends
2. **ERPNext Integration** - Bidirectional sync with ERPNext instances  
3. **Enhanced Sync Engine** - Production-ready conflict resolution
4. **PWA & Performance** - Offline-first, installable, fast

---

## 3.1 Backend API Client

### Purpose
Generic client for connecting SchoolPilot3 to external backend services.

### Features
```typescript
interface BackendClient {
  // Authentication
  authenticate(credentials: AuthCredentials): Promise<AuthToken>;
  refreshToken(): Promise<AuthToken>;
  
  // CRUD Operations
  fetchCollection(collection: string, query: Query): Promise<Record[]>;
  createRecord(collection: string, data: any): Promise<Record>;
  updateRecord(collection: string, id: string, data: any): Promise<Record>;
  deleteRecord(collection: string, id: string): Promise<void>;
  
  // Sync Operations
  getChanges(since: Timestamp): Promise<Change[]>;
  pushChanges(changes: Change[]): Promise<SyncResult>;
  
  // File Upload
  uploadFile(file: File, metadata: any): Promise<FileRecord>;
  downloadFile(fileId: string): Promise<Blob>;
}
```

### Supported Backend Types
| Type | Description | Example |
|------|-------------|---------|
| `generic-json-api` | RESTful JSON API | Custom backends |
| `erpnext` | ERPNext REST API | Self-hosted ERPNext |
| `saas-api` | SaaS service API | SchoolPilot SaaS |
| `graphql` | GraphQL endpoint | Hasura, etc. |

### Configuration
```typescript
// src/config/backend.ts
export interface BackendConfig {
  type: 'generic-json-api' | 'erpnext' | 'saas-api' | 'graphql';
  url: string;
  version?: string;
  
  auth: {
    type: 'apikey' | 'oauth2' | 'jwt' | 'basic';
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
  };
  
  sync: {
    enabled: boolean;
    interval: number;  // seconds
    conflictResolution: 'local-wins' | 'remote-wins' | 'manual';
  };
}
```

### Estimated Effort: 3-4 days

---

## 3.2 ERPNext Integration

### Purpose
Native integration with ERPNext for schools using it as their backend.

### Supported ERPNext Modules
```typescript
const ERPNext_MODULES = {
  // Education Domain
  education: {
    student: ['Student', 'Student Group', 'Student Category'],
    academics: ['Course', 'Program', 'Academic Year', 'Academic Term'],
    enrollment: ['Program Enrollment', 'Course Enrollment'],
    schedule: ['Student Attendance', 'Course Schedule'],
    fees: ['Fee Structure', 'Fees', 'Fee Category'],
    exam: ['Assessment Group', 'Assessment Plan', 'Assessment Result'],
  },
  
  // HR & Payroll
  hr: ['Employee', 'Salary Structure', 'Payroll Entry'],
  
  // Accounting
  accounts: ['Account', 'Journal Entry', 'Payment Entry'],
  
  // Stock
  stock: ['Item', 'Warehouse', 'Stock Entry'],
};
```

### Bidirectional Sync Mapping

| SchoolPilot3 Entity | ERPNext DocType | Sync Direction |
|--------------------|-----------------|----------------|
| Student | Student | Bidirectional |
| Teacher | Employee (Educator) | Bidirectional |
| Class/Course | Student Group | Bidirectional |
| Subject | Course | Bidirectional |
| Timetable | Course Schedule | To ERPNext |
| Attendance | Student Attendance | Bidirectional |
| Fee Structure | Fee Structure | From ERPNext |
| Invoice | Sales Invoice | To ERPNext |
| Payment | Payment Entry | Bidirectional |
| Grade/Assessment | Assessment Result | Bidirectional |

### Sync Configuration
```typescript
// erpnext.config.ts
export const erpnextConfig = {
  url: 'https://erp.school.edu',
  apiKey: process.env.ERPNext_API_KEY,
  apiSecret: process.env.ERPNext_API_SECRET,
  
  sync: {
    // What to sync
    entities: ['students', 'teachers', 'attendance', 'fees'],
    
    // Direction
    students: 'bidirectional',      // Both ways
    fees: 'from-erpnext',          // ERPNext is source of truth
    attendance: 'to-erpnext',      // SchoolPilot pushes to ERPNext
    
    // Schedule
    realtime: ['attendance'],       // Immediate sync
    hourly: ['students', 'teachers'],
    daily: ['fees', 'reports'],
    
    // Conflict resolution
    conflictResolution: {
      default: 'timestamp-wins',
      fees: 'erpnext-wins',        // ERPNext authority for financial data
    }
  }
};
```

### UI Components
```typescript
// ERPNext connection status
<ERPNextStatus 
  connected={true}
  lastSync="2024-01-15T10:30:00Z"
  pendingChanges={5}
  onSync={() => syncNow()}
/>

// Sync settings
<ERPNextSyncSettings
  config={erpnextConfig}
  onSave={saveConfig}
/>

// Manual sync trigger
<SyncButton 
  entity="students"
  direction="bidirectional"
  onComplete={handleComplete}
/>
```

### Estimated Effort: 5-7 days

---

## 3.3 Enhanced Sync Engine

### Improvements from Phase 2

#### 1. Conflict Resolution UI
```typescript
// When conflicts detected, show resolution dialog
<ConflictResolutionDialog
  conflicts={conflicts}
  onResolve={(resolution) => applyResolution(resolution)}
  onResolveAll={(strategy) => resolveAll(strategy)}
/>
```

#### 2. Field-Level Sync
```typescript
// Instead of full document sync, track field changes
interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  userId: string;
}

// Merge changes from multiple sources
function mergeFieldChanges(
  local: FieldChange[], 
  remote: FieldChange[]
): MergedDocument {
  // Last-write-wins per field
}
```

#### 3. Bandwidth Optimization
```typescript
interface SyncOptions {
  // Delta sync - only changed fields
  deltaSync: true;
  
  // Compression
  compress: true;
  compressionThreshold: 1024; // bytes
  
  // Batch size
  batchSize: 100;
  
  // Priority queues
  priority: ['attendance', 'grades', 'reports'];
}
```

#### 4. Background Sync with Service Worker
```typescript
// sw-sync.ts
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncPendingChanges());
  }
});

// Trigger from app
navigator.serviceWorker.ready.then(sw => {
  sw.sync.register('background-sync');
});
```

### Estimated Effort: 3-4 days

---

## 3.4 PWA & Performance Optimization

### PWA Features

#### 1. Web App Manifest
```json
{
  "name": "SchoolPilot3",
  "short_name": "SchoolPilot",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192" },
    { "src": "/icon-512.png", "sizes": "512x512" }
  ]
}
```

#### 2. Service Worker Strategy
```typescript
// Cache strategies
const strategies = {
  // App shell - cache first
  '/': new CacheFirst(),
  
  // API calls - network first, cache fallback
  '/api/': new NetworkFirst({
    cache: 'api-cache',
    maxAge: 5 * 60 * 1000 // 5 minutes
  }),
  
  // Assets - cache first, long-term
  '/assets/': new CacheFirst({
    cache: 'asset-cache',
    maxEntries: 100
  }),
  
  // Images - stale while revalidate
  '/images/': new StaleWhileRevalidate()
};
```

#### 3. Install Prompt
```typescript
// Show install button when PWA is installable
const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

useEffect(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setInstallPrompt(e);
  });
}, []);

const installApp = () => {
  installPrompt?.prompt();
};
```

### Performance Optimizations

#### 1. Code Splitting
```typescript
// Lazy load modules
const ReportsModule = lazy(() => import('./modules/Reports'));
const FinanceModule = lazy(() => import('./modules/Finance'));

// Route-based splitting
<Route path="/reports" element={<ReportsModule />} />
```

#### 2. Virtual Lists
```typescript
// For large data tables
<VirtualList
  items={students}
  itemHeight={60}
  renderItem={(student) => <StudentRow student={student} />}
  overscan={10}
/>
```

#### 3. IndexedDB for Large Datasets
```typescript
// Move large tables to IndexedDB
const studentStore = await openDB('schoolpilot', 1, {
  upgrade(db) {
    db.createObjectStore('students', { keyPath: 'id' });
    db.createObjectStore('attendance', { keyPath: 'id' });
  }
});
```

### Estimated Effort: 3-4 days

---

## Updated Implementation Plan

### Week 1: Backend API Client
- Day 1-2: Generic API client with auth
- Day 3-4: Sync protocol implementation
- Day 5: Testing with mock backend

### Week 2: ERPNext Integration
- Day 1-2: ERPNext API wrapper
- Day 3-4: Entity mapping and sync
- Day 5: UI components and testing

### Week 3: Enhanced Sync & PWA
- Day 1-2: Conflict resolution UI
- Day 3: Background sync
- Day 4-5: PWA manifest, service worker, install flow

---

## Phase 3 Deliverables

| Deliverable | Status | Location |
|-------------|--------|----------|
| Backend API Client | 🚧 Planned | `src/services/backend/` |
| ERPNext Integration | 🚧 Planned | `src/services/erpnext/` |
| Enhanced Sync Engine | 🚧 Planned | `src/services/sync/` |
| PWA Configuration | 🚧 Planned | `vite-pwa-config.ts` |
| Service Worker | 🚧 Planned | `sw.ts` |
| Conflict Resolution UI | 🚧 Planned | `src/components/sync/` |

---

## Success Criteria

- ✅ Connect to generic REST API backend
- ✅ Bidirectional sync with ERPNext
- ✅ Conflict resolution UI
- ✅ Background sync working
- ✅ PWA installable on mobile/desktop
- ✅ Works offline completely
- ✅ Syncs when connection restored

---

**Document Version:** 1.0 (Updated)
**Last Updated:** 2026-02-08
**Status:** Ready for implementation
