# SchoolPilot3 Master Resolution Roadmap

## Executive Summary

This roadmap addresses the critical tab management issues while establishing a solid foundation for SchoolPilot3's multi-deployment architecture. The goal is to transform the current over-engineered, partially-functional system into a robust, scalable education management platform.

**Current State:** Tab system has synchronization issues, data layer is overly complex with 4+ competing technologies, and multi-tasking workflows are compromised.

**Target State:** URL-driven tab system, unified data layer with provider abstraction, seamless offline-first experience, and support for 5 deployment modes.

**Timeline:** 12 weeks (3 phases)

---

## Strategic Goals

### 1. Tab System Excellence
- URL-driven navigation with tab persistence
- Multi-tasking support (e.g., add student while checking attendance)
- Consistent behavior across all deployment modes
- Proper browser back/forward integration

### 2. Data Layer Unification
- Single provider abstraction supporting all storage backends
- Offline-first with intelligent sync
- Seamless mode switching without data loss
- Support for: SQLite, PouchDB, Backend API, ERPNext

### 3. Deployment Mode Flexibility
| Mode | Target User | Database | Sync |
|------|-------------|----------|------|
| **Standalone** | Single laptop school | SQLite OPFS | None |
| **Networked** | Small school LAN | SQLite (shared) | LAN sync |
| **Hosted** | Medium school | PostgreSQL/Mongo | Real-time |
| **SaaS Backend** | Multi-tenant | Cloud DB | Continuous |
| **ERPNext** | Advanced finance | ERPNext DB | API bridge |
| **Mobile** | Teachers on-field | SQLite | Periodic |

### 4. Future-Ready Architecture
- React Native migration path
- Modular feature extraction
- API-first design for integrations

---

## Phase Overview

| Phase | Duration | Focus | Deliverable |
|-------|----------|-------|-------------|
| **Phase 1: Foundation** | Weeks 1-4 | Tab system fix, data layer cleanup | Stable v1.0 with working tabs |
| **Phase 2: Enhancement** | Weeks 5-8 | Sync engine, deployment modes | Multi-mode support |
| **Phase 3: Expansion** | Weeks 9-12 | ERPNext integration, mobile prep | Integration-ready platform |

---

## Phase 1: Foundation (Weeks 1-4)

### Week 1-2: Tab System Emergency Fix

#### Task 1.1: Implement URL-Driven Tab Architecture
**Priority:** 🔴 Critical  
**Effort:** 3 days  
**Owner:** Frontend Lead

**Problem:** Current tab store maintains state separate from URL, causing sync issues.

**Solution:** Make URL the single source of truth.

```typescript
// New architecture
interface TabState {
  // Derived from URL, not stored
  tabs: Array<{
    id: string;
    url: string;           // /academics/students?id=123
    title: string;         // Resolved from route
    module: string;        // academics
    entity?: string;       // students
    entityId?: string;     // 123
    isDirty: boolean;
    pinned: boolean;
    createdAt: number;
    lastAccessed: number;
  }>;
  activeTabId: string;
}

// URL format
// /module/entity?tabId=xyz&entityId=123&action=edit
```

**Implementation Steps:**
1. Create `URLTabSyncEngine` that intercepts all navigation
2. Modify `useTabNavigation` to derive state from URL
3. Update `TabbedWorkspace` to use new engine
4. Remove dual-state management (React Router vs TabStore)

**Acceptance Criteria:**
- [ ] Copy-pasting URL opens exact same tab state
- [ ] Browser back/forward works correctly
- [ ] Refreshing page restores tabs
- [ ] No duplicate tabs for same URL

---

#### Task 1.2: Tab State Persistence Layer
**Priority:** 🔴 Critical  
**Effort:** 2 days  
**Owner:** Frontend Lead

**Problem:** LocalStorage corruption causes tab loss.

**Solution:** Multi-layer persistence with validation.

```typescript
interface TabPersistenceLayer {
  // Layer 1: URL (always works)
  primary: 'url-params';
  
  // Layer 2: sessionStorage (survives refresh)
  secondary: 'session-storage';
  
  // Layer 3: localStorage (survives browser close)
  tertiary: 'local-storage';
  
  // Layer 4: IndexedDB (large data, async)
  quaternary: 'indexed-db';
}
```

**Implementation:**
1. Create `TabPersistenceService`
2. Implement schema validation using Zod
3. Add migration path for old LocalStorage data
4. Create recovery UI for corrupted state

**Validation Schema:**
```typescript
const TabSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  title: z.string().min(1).max(100),
  module: z.enum(['academics', 'administration', 'finance', 'hr', 'inventory', 'library', 'nutrition', 'reports', 'settings']),
  isDirty: z.boolean().default(false),
  pinned: z.boolean().default(false),
  createdAt: z.number(),
  lastAccessed: z.number()
});
```

---

#### Task 1.3: Multi-Tasking Workflow Support
**Priority:** 🟡 High  
**Effort:** 2 days  
**Owner:** UX Lead

**Use Cases to Support:**
1. **Enrollment Workflow:** Add new student → Check existing students → Add parent → Return to enrollment
2. **Attendance + Grading:** Take attendance → Enter marks for same class → Generate report
3. **Finance Multi-Entry:** Create fee template → Apply to students → Record payments → Generate receipts
4. **Library + Student:** Check book loans → View student details → Process return

**Implementation:**
```typescript
// New navigation API
interface MultiTaskingAPI {
  // Open related entity in new tab
  openRelated(
    fromTabId: string,
    options: {
      module: string;
      entity: string;
      entityId?: string;
      relation: 'child' | 'parent' | 'reference';
      autoLink?: boolean;  // Link tabs for grouped closing
    }
  ): string; // Returns new tab ID
  
  // Close tab and return to related tab
  closeAndReturn(tabId: string): void;
  
  // Get tabs related to current workflow
  getWorkflowTabs(tabId: string): Tab[];
  
  // Close entire workflow
  closeWorkflow(tabId: string): void;
}
```

**UI Enhancements:**
- Visual grouping of related tabs
- "Open in New Tab" context menu on all entity links
- Workflow breadcrumbs showing relationship chain
- "Close Workflow" button on grouped tabs

---

### Week 3: Data Layer Consolidation

#### Task 1.4: Unified Data Provider Architecture
**Priority:** 🔴 Critical  
**Effort:** 4 days  
**Owner:** Architecture Lead

**Current Problem:** 4 competing technologies (RxDB, PouchDB, SQLite, Mock) with overlapping responsibilities.

**Target Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│         (Hooks: useStudents, useAttendance, etc.)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Unified Data Service (UDS)                     │
│  - Consistent API across all providers                      │
│  - Observable queries                                       │
│  - Transaction support                                      │
│  - Conflict resolution                                      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐     ┌─────────┐     ┌─────────┐
        │ Local   │     │  Sync   │     │ Remote  │
        │ Storage │◄───►│ Engine  │◄───►│  API    │
        └─────────┘     └─────────┘     └─────────┘
              │               │               │
        ┌─────┴─────┐    ┌────┴────┐    ┌────┴────┐
        │SQLite     │    │PouchDB  │    │REST     │
        │IndexedDB  │    │WebRTC   │    │GraphQL  │
        │OPFS       │    │Socket   │    │ERPNext  │
        └───────────┘    └─────────┘    └─────────┘
```

**Implementation:**
1. Define `DataProvider` interface
2. Create adapter pattern for each storage type
3. Implement `ProviderFactory` for runtime selection
4. Build `SyncEngine` for offline/online transitions

**Code Structure:**
```typescript
// src/services/data/UnifiedDataService.ts
interface DataProvider {
  readonly type: 'sqlite' | 'pouchdb' | 'backend-api' | 'erpnext';
  
  // CRUD
  find<T>(collection: string, query: Query): Promise<T[]>;
  findOne<T>(collection: string, id: string): Promise<T | null>;
  create<T>(collection: string, data: T): Promise<T>;
  update<T>(collection: string, id: string, data: Partial<T>): Promise<T>;
  delete(collection: string, id: string): Promise<void>;
  
  // Real-time
  subscribe<T>(collection: string, query: Query): Observable<T[]>;
  
  // Transactions
  transaction(operations: Operation[]): Promise<void>;
  
  // Sync
  sync(): Promise<SyncResult>;
  getPendingChanges(): Promise<Change[]>;
}
```

**Migration Strategy:**
1. Week 3: Implement new UDS alongside existing code
2. Week 4: Migrate one module (Settings) to prove pattern
3. Phase 2: Migrate remaining modules incrementally

---

#### Task 1.5: Deployment Mode Configuration
**Priority:** 🟡 High  
**Effort:** 2 days  
**Owner:** DevOps Lead

**Configuration Schema:**
```typescript
// deployment.config.ts
interface DeploymentConfig {
  mode: 'standalone' | 'networked' | 'hosted' | 'saas' | 'erpnext';
  
  storage: {
    primary: StorageProvider;
    sync?: SyncProvider;
    backup?: BackupProvider;
  };
  
  networking: {
    mode: 'offline-only' | 'lan-only' | 'online-capable' | 'online-required';
    autoSync: boolean;
    syncInterval: number;
    conflictResolution: 'local-wins' | 'remote-wins' | 'manual' | 'timestamp';
  };
  
  features: {
    multiUser: boolean;
    realTimeSync: boolean;
    offlineMode: boolean;
    advancedReporting: boolean;
    erpIntegration: boolean;
  };
}

// Example configurations
export const StandaloneConfig: DeploymentConfig = {
  mode: 'standalone',
  storage: { primary: 'sqlite-opfs' },
  networking: { mode: 'offline-only', autoSync: false },
  features: { multiUser: false, offlineMode: true, ... }
};

export const NetworkedConfig: DeploymentConfig = {
  mode: 'networked',
  storage: { primary: 'sqlite-shared', sync: 'pouchdb' },
  networking: { mode: 'lan-only', autoSync: true, syncInterval: 5000 },
  features: { multiUser: true, realTimeSync: true, ... }
};
```

---

### Week 4: Testing & Stabilization

#### Task 1.6: Tab System Test Suite
**Priority:** 🟡 High  
**Effort:** 3 days  
**Owner:** QA Lead

**Test Categories:**

1. **Navigation Tests**
   ```typescript
   describe('Tab Navigation', () => {
     it('should create tab on navigation', () => {});
     it('should activate existing tab for same URL', () => {});
     it('should handle browser back button', () => {});
     it('should restore tabs on refresh', () => {});
     it('should handle 50+ tabs without performance issues', () => {});
   });
   ```

2. **Multi-Tasking Tests**
   ```typescript
   describe('Multi-Tasking Workflows', () => {
     it('should support enrollment workflow', async () => {
       // Open student add
       // Open student list in new tab
       // Switch between tabs
       // Complete enrollment
       // Verify both tabs have consistent data
     });
   });
   ```

3. **Persistence Tests**
   ```typescript
   describe('Tab Persistence', () => {
     it('should survive page refresh', () => {});
     it('should survive browser restart', () => {});
     it('should recover from corrupted storage', () => {});
     it('should sync across browser windows', () => {});
   });
   ```

**Testing Tools:**
- Playwright for E2E
- React Testing Library for unit
- Custom test utilities for tab operations

---

#### Task 1.7: Documentation & Developer Guide
**Priority:** 🟢 Medium  
**Effort:** 2 days  
**Owner:** Tech Writer

**Documents to Create:**
1. `docs/implementation/tab-system/ARCHITECTURE.md` - Technical design
2. `docs/implementation/tab-system/API.md` - Hook reference
3. `docs/implementation/tab-system/MIGRATION.md` - Upgrading old code
4. `docs/architecture/DATA_LAYER.md` - Data system design

---

## Phase 2: Enhancement (Weeks 5-8)

### Week 5-6: Sync Engine Development

#### Task 2.1: Offline-First Sync Engine
**Priority:** 🔴 Critical  
**Effort:** 5 days  
**Owner:** Backend Lead

**Requirements:**
- Queue operations when offline
- Automatic sync when connection restored
- Conflict detection and resolution
- Partial sync (only changed data)
- Sync progress indicators

**Architecture:**
```typescript
// Sync Engine
class SyncEngine {
  private operationQueue: Operation[];
  private conflictResolver: ConflictResolver;
  
  // Queue local changes
  async queueOperation(op: Operation): Promise<void>;
  
  // Sync with remote
  async sync(options?: SyncOptions): Promise<SyncResult>;
  
  // Handle conflicts
  resolveConflict(
    local: Document,
    remote: Document,
    strategy: ResolutionStrategy
  ): Document;
  
  // Subscribe to sync status
  onSyncStatus(callback: (status: SyncStatus) => void): Unsubscribe;
}

// Usage
const sync = new SyncEngine({
  local: sqliteProvider,
  remote: backendApiProvider,
  conflictStrategy: 'timestamp-wins',
  autoSync: true,
  syncInterval: 30000
});
```

**Features:**
1. **Change Tracking:** Every operation logged with timestamp and user
2. **Delta Sync:** Only sync changed fields
3. **Retry Logic:** Exponential backoff for failed syncs
4. **Conflict UI:** Manual resolution when automatic fails

---

#### Task 2.2: Multi-Window Synchronization
**Priority:** 🟡 High  
**Effort:** 3 days  
**Owner:** Frontend Lead

**Problem:** Multiple browser tabs don't share state.

**Solution:** Broadcast Channel API + Leader Election

```typescript
// Cross-tab communication
class CrossTabSync {
  private channel: BroadcastChannel;
  private isLeader: boolean;
  
  constructor() {
    this.channel = new BroadcastChannel('schoolpilot_sync');
    this.electLeader();
  }
  
  // Broadcast tab changes
  broadcastTabChange(tabs: Tab[]): void {
    this.channel.postMessage({
      type: 'TABS_UPDATED',
      payload: tabs,
      timestamp: Date.now()
    });
  }
  
  // Sync data changes
  broadcastDataChange(collection: string, id: string): void {
    this.channel.postMessage({
      type: 'DATA_CHANGED',
      payload: { collection, id },
      timestamp: Date.now()
    });
  }
}
```

---

### Week 7: Deployment Mode Implementation

#### Task 2.3: Standalone Mode Optimization
**Priority:** 🔴 Critical  
**Effort:** 3 days  
**Owner:** Performance Lead

**Optimizations:**
1. **SQLite OPFS:** Optimize for single-user performance
2. **Data Compression:** Compress large datasets in IndexedDB
3. **Lazy Loading:** Load modules on-demand
4. **Backup/Export:** One-click backup to file

**Features:**
```typescript
// Standalone-specific features
interface StandaloneFeatures {
  // Auto-save to disk
  autoSave: {
    enabled: boolean;
    interval: number; // minutes
    path: string;     // ~/SchoolPilot/data/
  };
  
  // Backup to file
  exportToFile: () => Promise<Blob>;
  importFromFile: (file: File) => Promise<void>;
  
  // Data portability
  migrateToNetwork: (serverAddress: string) => Promise<void>;
}
```

---

#### Task 2.4: Networked Mode (Small Schools)
**Priority:** 🟡 High  
**Effort:** 4 days  
**Owner:** Backend Lead

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                      School LAN                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Laptop 1  │◄──►│  Mini PC    │◄──►│   Laptop 2  │     │
│  │  (Teacher)  │    │  (Server)   │    │  (Admin)    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                            │                                │
│                            ▼                                │
│                     ┌─────────────┐                         │
│                     │   SQLite    │                         │
│                     │   (Shared)  │                         │
│                     └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
1. Lightweight server (Express + SQLite)
2. WebSocket for real-time sync
3. File-based locking for SQLite
4. Auto-discovery on LAN

---

### Week 8: Backend Integration Foundation

#### Task 2.5: Backend API Provider
**Priority:** 🟡 High  
**Effort:** 4 days  
**Owner:** Backend Lead

**REST API Interface:**
```typescript
class BackendAPIProvider implements DataProvider {
  private baseURL: string;
  private authToken: string;
  
  async find<T>(collection: string, query: Query): Promise<T[]> {
    const response = await fetch(
      `${this.baseURL}/api/${collection}?${this.buildQuery(query)}`,
      { headers: { Authorization: `Bearer ${this.authToken}` } }
    );
    return response.json();
  }
  
  // WebSocket for real-time updates
  subscribe<T>(collection: string, query: Query): Observable<T[]> {
    return new Observable(subscriber => {
      const ws = new WebSocket(this.wsURL);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.collection === collection) {
          subscriber.next(data.payload);
        }
      };
      return () => ws.close();
    });
  }
}
```

**Authentication:**
- JWT tokens with refresh
- Role-based access control
- Session management

---

## Phase 3: Expansion (Weeks 9-12)

### Week 9-10: ERPNext Integration

#### Task 3.1: ERPNext Connector
**Priority:** 🟡 High  
**Effort:** 5 days  
**Owner:** Integration Lead

**Scope:**
- Student sync (ERPNext Student → SchoolPilot)
- Fee synchronization
- Payment recording
- Academic result export

**Mapping:**
```typescript
// ERPNext ↔ SchoolPilot entity mapping
const entityMappings = {
  student: {
    erpnext: 'Student',
    local: 'students',
    fields: {
      'name': 'id',
      'student_name': 'fullName',
      'student_email_id': 'email',
      'student_mobile_number': 'phone',
      'date_of_birth': 'dateOfBirth',
      'gender': 'gender'
    }
  },
  fee: {
    erpnext: 'Fees',
    local: 'feeTransactions',
    // ...
  }
};
```

**Sync Strategy:**
- Bidirectional sync for students
- One-way (SchoolPilot → ERPNext) for marks
- One-way (ERPNext → SchoolPilot) for payments

---

#### Task 3.2: SaaS Backend Development
**Priority:** 🟢 Medium  
**Effort:** 5 days  
**Owner:** Backend Lead

**Features:**
1. Multi-tenant architecture
2. School onboarding flow
3. Subscription management
4. Admin dashboard

**Tech Stack:**
- Node.js/Express or Python/FastAPI
- PostgreSQL (multi-tenant schemas)
- Redis (caching, sessions)
- MinIO/S3 (file storage)

---

### Week 11: Mobile Preparation

#### Task 3.3: React Native Migration Path
**Priority:** 🟢 Medium  
**Effort:** 4 days  
**Owner:** Mobile Lead

**Strategy:** Progressive Web App → React Native

**Step 1: PWA Optimization**
- Service worker for offline support
- App-like UI (standalone mode)
- Push notifications
- Home screen installation

**Step 2: Code Sharing Architecture**
```
src/
├── shared/           # 80% shared code
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── utils/
├── web/              # Web-specific
│   └── components/
└── mobile/           # React Native
    └── components/
```

**Step 3: Native Bridge**
- SQLite for mobile storage
- Background sync
- Native notifications

---

#### Task 3.4: Mobile-Optimized UI
**Priority:** 🟢 Medium  
**Effort:** 3 days  
**Owner:** UX Lead

**Mobile Adaptations:**
1. **Simplified Tab Bar:** Bottom sheet instead of top tabs
2. **Touch-Optimized:** Larger buttons, swipe gestures
3. **Offline Indicators:** Clear status when offline
4. **Quick Actions:** FAB for common operations

---

### Week 12: Final Integration & Launch

#### Task 3.5: Deployment Automation
**Priority:** 🔴 Critical  
**Effort:** 3 days  
**Owner:** DevOps Lead

**CI/CD Pipeline:**
```yaml
# Build matrix
build:
  - web-standalone
  - web-hosted
  - desktop-electron
  - mobile-capacitor
  
deploy:
  - docker-compose (self-hosted)
  - kubernetes (saas)
  - app-store (mobile)
```

---

#### Task 3.6: Documentation & Training
**Priority:** 🟡 High  
**Effort:** 2 days  
**Owner:** Tech Writer

**Materials:**
1. Deployment guides for each mode
2. Administrator manual
3. Teacher quick-start guide
4. Video tutorials

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Tab Sync Failures | ~15% | <1% | Error tracking |
| Page Load Time | 4s | <2s | Lighthouse |
| Offline Functionality | 60% | 95% | Feature coverage |
| Data Loss Incidents | Occasional | Zero | User reports |
| Developer Onboarding | 3 days | <1 day | Time to first commit |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Migration breaks existing data | Medium | High | Comprehensive backups, rollback plan |
| Performance degradation | Low | High | Load testing, profiling |
| ERPNext API changes | Medium | Medium | Abstraction layer, version pinning |
| Team capacity issues | Medium | Medium | Phased approach, external contractors |

---

## Appendix: Technology Decisions

### Why Keep PouchDB over RxDB?
- **No collection limits** - Critical for school data (100+ entities)
- **Mature sync protocol** - Battle-tested CouchDB sync
- **Smaller bundle** - RxDB adds ~200KB gzipped

### Why SQLite for standalone?
- **File-based** - Easy backup/transfer
- **Full SQL** - Complex reporting queries
- **OPFS support** - Modern browser storage

### Why not GraphQL?
- **Complexity** - Adds build step, schema maintenance
- **Offline difficulty** - REST easier to cache
- **Team expertise** - Team stronger with REST

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-08  
**Next Review:** 2026-02-15
