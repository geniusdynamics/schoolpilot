# SchoolPilot3 Modularity Assessment & Improvement Plan

**Date:** April 8, 2026  
**Status:** Analysis Complete  
**Priority:** High

---

## Executive Summary

SchoolPilot3 has made significant progress toward a modular architecture, but several critical dependencies prevent modules from being truly independent. This document assesses implementation status and provides a roadmap for achieving full module independence while maintaining practical integration with the core system.

### Key Findings

✅ **Implemented (70%)**
- Module registry system with dynamic loading
- Standardized module definitions with metadata
- Data hook factory pattern for CRUD operations
- Unified database manager abstraction
- Global provider registry for cross-module integration
- RBAC integration at module level
- i18n modular translation loading

❌ **Partially Implemented (20%)**
- Module independence (heavy cross-module dependencies)
- Database schema ownership (modules don't own migrations)
- Data layer independence (cross-module data imports)
- Module metadata system (no package.json)

⚠️ **Not Implemented (10%)**
- Module-level database migrations
- Module schema auto-registration
- Module-specific data context registration
- Independent module testing infrastructure

---

## Revised Modularity Principles

### What We Accept (Pragmatic Approach)

✅ **Core Component Usage**
- Modules CAN import from `@/components/ui/*`
- Modules CAN have their own components when needed
- Rationale: Shared UI ensures consistency, custom components enable flexibility

✅ **Core Service Usage**
- Modules CAN use core services via context/hooks
- Modules SHOULD use interfaces, not direct imports
- Rationale: Services provide infrastructure, modules provide domain logic

✅ **Monorepo Structure**
- Modules stay in `src/modules/`
- No separate npm packages
- Rationale: Simpler development, shared tooling

### What We Require (True Independence)

🔴 **Data Independence**
- Modules MUST NOT import data from other modules
- Modules MUST use AppDataContext for cross-module data
- Modules MUST own their domain types

🔴 **Schema Ownership**
- Modules MUST define their own database schemas
- Modules MUST provide their own migrations
- Modules MUST register schemas with core automatically

🔴 **Self-Registration**
- Modules MUST auto-register on load
- Modules MUST declare dependencies explicitly
- Modules MUST be testable in isolation

---

## Detailed Implementation Status

### 1. Core Architecture ✅ IMPLEMENTED (90%)

**What's Working:**
- `moduleRegistry.ts` - Central module registration
- `ModuleDefinition` interface - Standardized metadata
- `MODULE_ORDER` - Explicit loading sequence
- Dynamic module loading with dependency validation
- Module enable/disable functionality

**What's Missing:**
- Module schema auto-registration
- Module migration system
- Module data context auto-registration

**Evidence:**
```typescript
// src/core/moduleRegistry.ts
class ModuleRegistry {
  registerModule(module: ModuleDefinition): void {
    // Validates dependencies before registration
    if (module.dependencies) {
      for (const dep of module.dependencies) {
        const depId = typeof dep === 'string' ? dep : dep.moduleId;
        if (!this.isRegistered(depId)) {
          throw new Error(`Module "${module.id}" requires "${depId}"`);
        }
      }
    }
  }
}
```

---

### 2. Data Layer Abstraction ✅ IMPLEMENTED (85%)

**What's Working:**
- `useDataHookFactory` - Standardized CRUD operations
- `AppDataContext` - Unified data access layer
- `UnifiedDatabaseManager` - Database provider abstraction
- Dual-mode architecture (demo/production)
- Reactive data subscriptions

**What's Missing:**
- Complete isolation of module data (22+ cross-module imports)
- Module-owned database schemas
- Automatic schema registration
- Module-specific migrations

---

### 3. Module Structure ✅ IMPLEMENTED (95%)

**Current Structure:**
```
modules/{module-name}/
├── data/
│   ├── types.ts          # Module-specific types
│   ├── schema.ts         # Database schemas
│   ├── collections.ts    # Collection definitions
│   ├── mockData.ts       # Demo data
│   ├── index.ts          # Data exports
│   └── use{Entity}Data.ts # Data hooks
├── pages/                # Page components
├── components/           # Module-specific components (optional)
├── services/             # Business logic
├── hooks/                # Custom hooks
├── i18n/                 # Translations
├── index.ts              # Module exports
├── moduleDefinition.tsx  # Module metadata
└── rbac.ts               # Permissions
```

**What's Missing:**
- `module.json` - Module metadata file
- `migrations/` - Database migrations directory
- `__tests__/` - Comprehensive test suite

---

### 4. Global Provider Registry ✅ IMPLEMENTED (80%)

**What's Working:**
- Dynamic provider discovery via `import.meta.glob`
- Metadata-driven integration
- Async initialization to avoid circular dependencies

**What's Missing:**
- Schema registration discovery
- Migration discovery and execution
- Data context auto-registration

---

## Critical Modularity Issues

### Issue 1: Cross-Module Data Dependencies 🔴 CRITICAL

**Problem:** Modules directly import data from other modules, breaking independence.

**Evidence:**
```typescript
// src/modules/nutrition/data/useWalletTransactionData.ts
import { initialMockUsers } from '../../administration/data/mockData';

// src/modules/finance/data/useTransportRouteData.ts
import { initialMockUsers } from '../../administration/data/mockData';
```

**Impact:**
- Cannot test modules independently
- Changes in administration module break other modules
- Circular dependency risks

**Affected Modules:**
- nutrition (4 files)
- inventory (6 files)
- hr (4 files)
- finance (5 files)
- library (3 files)

**Total:** 22+ cross-module imports identified

---

### Issue 2: No Module Schema Ownership 🔴 CRITICAL

**Problem:** Modules define schemas but don't own migrations or registration.

**Current State:**
```typescript
// src/modules/finance/data/schema.ts
export const invoiceSchema = {
  title: 'invoice',
  version: 0,
  type: 'object',
  properties: { /* ... */ }
};

// But no migration system or auto-registration
```

**Impact:**
- Schema changes require manual core updates
- No version control for module data
- Cannot evolve module data independently
- Database setup is manual and error-prone

---

### Issue 3: No Module Metadata System 🟡 HIGH

**Problem:** Modules lack structured metadata for discovery and management.

**What's Needed:**
```json
// modules/finance/module.json
{
  "id": "finance",
  "name": "Finance Management",
  "version": "1.0.0",
  "schemas": ["invoices", "payments", "fees"],
  "migrations": "./migrations",
  "dependencies": {
    "administration": "^1.0.0"
  },
  "provides": {
    "data": ["invoices", "payments"],
    "services": ["PaymentService"],
    "routes": ["/finance/*"]
  }
}
```

**Impact:**
- Cannot discover module capabilities
- Manual dependency management
- No version tracking
- Difficult to validate module compatibility

---

### Issue 4: No Migration System 🟡 HIGH

**Problem:** No way for modules to evolve their database schemas over time.

**What's Needed:**
```typescript
// modules/finance/migrations/001_initial_schema.ts
export const migration_001 = {
  version: 1,
  up: async (db) => {
    await db.createCollection('invoices', invoiceSchema);
    await db.createCollection('payments', paymentSchema);
  },
  down: async (db) => {
    await db.dropCollection('invoices');
    await db.dropCollection('payments');
  }
};
```

**Impact:**
- Cannot update schemas without breaking changes
- No rollback capability
- Manual database updates required
- Data migration is error-prone

---

## Improvement Roadmap

### Phase 1: Data Independence (Priority: CRITICAL)

**Timeline:** 2-3 weeks  
**Effort:** High  
**Impact:** High

**Goal:** Eliminate cross-module data imports

**Tasks:**

1. **Create Shared Data Access Layer**
   ```typescript
   // src/hooks/useSharedData.ts
   export function useSharedData() {
     const context = useAppDataInternal();
     
     return useMemo(() => ({
       users: context.users || [],
       staff: context.staff || [],
       students: context.students || [],
       // ... other shared entities
     }), [context]);
   }
   ```

2. **Refactor Cross-Module Imports**
   - Replace 22+ direct imports with `useSharedData()`
   - Update all affected modules
   - Add integration tests

3. **Document Data Contracts**
   - Define what data is shared
   - Document access patterns
   - Create usage examples

**Success Criteria:**
- ✅ Zero `../../` imports between modules
- ✅ All cross-module data access via AppDataContext
- ✅ Modules can be tested with mocked shared data

---

### Phase 2: Module Metadata System (Priority: CRITICAL)

**Timeline:** 1-2 weeks  
**Effort:** Medium  
**Impact:** High

**Goal:** Add structured metadata to all modules

**Tasks:**

1. **Define Module Metadata Schema**
   ```typescript
   // src/core/types/ModuleMetadata.ts
   export interface ModuleMetadata {
     id: string;
     name: string;
     version: string;
     description: string;
     
     // Database
     schemas: string[];
     migrations: string;
     
     // Dependencies
     dependencies: Record<string, string>;
     optionalDependencies?: Record<string, string>;
     
     // Capabilities
     provides: {
       data: string[];
       services?: string[];
       routes: string[];
       components?: string[];
     };
     
     // Configuration
     settings?: ModuleSettings;
     rbac?: ModuleRBAC;
   }
   ```

2. **Create module.json for Each Module**
   ```json
   // modules/finance/module.json
   {
     "id": "finance",
     "name": "Finance Management",
     "version": "1.0.0",
     "description": "Complete financial management system",
     "schemas": ["invoices", "payments", "fees", "accounts"],
     "migrations": "./migrations",
     "dependencies": {
       "administration": "^1.0.0"
     },
     "provides": {
       "data": ["invoices", "payments", "fees"],
       "services": ["PaymentService", "InvoiceService"],
       "routes": ["/finance/*"]
     }
   }
   ```

3. **Implement Metadata Loader**
   ```typescript
   // src/core/ModuleMetadataLoader.ts
   export class ModuleMetadataLoader {
     async loadModuleMetadata(moduleId: string): Promise<ModuleMetadata> {
       const metadataPath = `./modules/${moduleId}/module.json`;
       const metadata = await import(metadataPath);
       return this.validateMetadata(metadata);
     }
     
     async loadAllMetadata(): Promise<Map<string, ModuleMetadata>> {
       const modules = import.meta.glob('./modules/*/module.json');
       // Load and validate all metadata
     }
   }
   ```

**Success Criteria:**
- ✅ All modules have module.json
- ✅ Metadata is validated on load
- ✅ Module capabilities are discoverable
- ✅ Dependencies are explicit

---

### Phase 3: Module Schema Auto-Registration (Priority: CRITICAL)

**Timeline:** 2-3 weeks  
**Effort:** High  
**Impact:** High

**Goal:** Modules automatically register their database schemas

**Tasks:**

1. **Create Schema Registry**
   ```typescript
   // src/services/database/SchemaRegistry.ts
   export class SchemaRegistry {
     private schemas = new Map<string, RxJsonSchema>();
     
     registerSchema(collectionName: string, schema: RxJsonSchema): void {
       if (this.schemas.has(collectionName)) {
         throw new Error(`Schema ${collectionName} already registered`);
       }
       this.schemas.set(collectionName, schema);
     }
     
     getSchema(collectionName: string): RxJsonSchema | undefined {
       return this.schemas.get(collectionName);
     }
     
     getAllSchemas(): Map<string, RxJsonSchema> {
       return new Map(this.schemas);
     }
   }
   ```

2. **Auto-Discover Module Schemas**
   ```typescript
   // src/services/database/SchemaDiscovery.ts
   export class SchemaDiscovery {
     async discoverSchemas(): Promise<void> {
       const schemaFiles = import.meta.glob('./modules/*/data/schema.ts');
       
       for (const path in schemaFiles) {
         const module = await schemaFiles[path]();
         const moduleName = this.extractModuleName(path);
         
         // Register all exported schemas
         for (const [name, schema] of Object.entries(module)) {
           if (name.endsWith('Schema')) {
             const collectionName = this.getCollectionName(name);
             schemaRegistry.registerSchema(collectionName, schema);
           }
         }
       }
     }
   }
   ```

3. **Update UnifiedDatabaseManager**
   ```typescript
   // src/services/database/UnifiedDatabaseManager.ts
   export class UnifiedDatabaseManager {
     async initialize(): Promise<void> {
       // Discover and register all module schemas
       await schemaDiscovery.discoverSchemas();
       
       // Create collections from registered schemas
       const schemas = schemaRegistry.getAllSchemas();
       for (const [name, schema] of schemas) {
         await this.createCollection(name, schema);
       }
     }
   }
   ```

4. **Module Schema Export Pattern**
   ```typescript
   // modules/finance/data/schema.ts
   export const invoiceSchema: RxJsonSchema = {
     title: 'invoice',
     version: 0,
     type: 'object',
     properties: {
       id: { type: 'number', primary: true },
       studentId: { type: 'number' },
       amount: { type: 'number' },
       // ...
     },
     required: ['id', 'studentId', 'amount']
   };
   
   export const paymentSchema: RxJsonSchema = {
     // ...
   };
   
   // Export collection names for reference
   export const FINANCE_COLLECTIONS = {
     INVOICES: 'invoices',
     PAYMENTS: 'payments',
     FEES: 'fees'
   };
   ```

**Success Criteria:**
- ✅ Schemas auto-discovered on app init
- ✅ Collections created automatically
- ✅ No manual schema registration needed
- ✅ Schema conflicts detected and reported

---

### Phase 4: Module Migration System (Priority: HIGH)

**Timeline:** 3-4 weeks  
**Effort:** Very High  
**Impact:** High

**Goal:** Modules can evolve their schemas with migrations

**Tasks:**

1. **Define Migration Interface**
   ```typescript
   // src/services/database/types/Migration.ts
   export interface Migration {
     module: string;
     version: number;
     name: string;
     description: string;
     
     up: (db: DatabaseProvider) => Promise<void>;
     down: (db: DatabaseProvider) => Promise<void>;
     
     // Optional data migration
     migrateData?: (db: DatabaseProvider) => Promise<void>;
   }
   
   export interface MigrationHistory {
     module: string;
     version: number;
     appliedAt: Date;
     success: boolean;
     error?: string;
   }
   ```

2. **Create Migration Manager**
   ```typescript
   // src/services/database/MigrationManager.ts
   export class MigrationManager {
     private history: MigrationHistory[] = [];
     
     async runMigrations(module: string): Promise<void> {
       const migrations = await this.discoverMigrations(module);
       const pending = this.getPendingMigrations(module, migrations);
       
       for (const migration of pending) {
         try {
           await migration.up(this.db);
           await this.recordMigration(migration, true);
         } catch (error) {
           await this.recordMigration(migration, false, error);
           throw error;
         }
       }
     }
     
     async rollback(module: string, toVersion: number): Promise<void> {
       const migrations = await this.discoverMigrations(module);
       const toRollback = this.getMigrationsToRollback(module, toVersion);
       
       for (const migration of toRollback.reverse()) {
         await migration.down(this.db);
         await this.removeMigrationHistory(migration);
       }
     }
     
     private async discoverMigrations(module: string): Promise<Migration[]> {
       const migrationFiles = import.meta.glob(
         `./modules/${module}/migrations/*.ts`
       );
       
       const migrations: Migration[] = [];
       for (const path in migrationFiles) {
         const mod = await migrationFiles[path]();
         migrations.push(mod.default);
       }
       
       return migrations.sort((a, b) => a.version - b.version);
     }
   }
   ```

3. **Module Migration Example**
   ```typescript
   // modules/finance/migrations/001_initial_schema.ts
   import { Migration } from '@/services/database/types/Migration';
   import { invoiceSchema, paymentSchema } from '../data/schema';
   
   const migration: Migration = {
     module: 'finance',
     version: 1,
     name: 'initial_schema',
     description: 'Create initial finance tables',
     
     async up(db) {
       await db.createCollection('invoices', invoiceSchema);
       await db.createCollection('payments', paymentSchema);
       await db.createCollection('fees', feeSchema);
     },
     
     async down(db) {
       await db.dropCollection('invoices');
       await db.dropCollection('payments');
       await db.dropCollection('fees');
     }
   };
   
   export default migration;
   ```

   ```typescript
   // modules/finance/migrations/002_add_invoice_status.ts
   const migration: Migration = {
     module: 'finance',
     version: 2,
     name: 'add_invoice_status',
     description: 'Add status field to invoices',
     
     async up(db) {
       // Update schema
       await db.updateSchema('invoices', {
         ...invoiceSchema,
         properties: {
           ...invoiceSchema.properties,
           status: { 
             type: 'string',
             enum: ['draft', 'sent', 'paid', 'overdue']
           }
         }
       });
     },
     
     async migrateData(db) {
       // Set default status for existing invoices
       const invoices = await db.find('invoices', {});
       for (const invoice of invoices) {
         await db.update('invoices', invoice.id, {
           status: invoice.paidAt ? 'paid' : 'sent'
         });
       }
     },
     
     async down(db) {
       // Remove status field
       await db.updateSchema('invoices', invoiceSchema);
     }
   };
   
   export default migration;
   ```

4. **Migration CLI Tool**
   ```typescript
   // scripts/migrate.ts
   import { MigrationManager } from '@/services/database/MigrationManager';
   
   const manager = new MigrationManager();
   
   // Run all pending migrations
   await manager.runAllPendingMigrations();
   
   // Run migrations for specific module
   await manager.runMigrations('finance');
   
   // Rollback to version
   await manager.rollback('finance', 1);
   
   // Show migration status
   await manager.showStatus();
   ```

**Success Criteria:**
- ✅ Migrations auto-discovered per module
- ✅ Migrations run in correct order
- ✅ Rollback capability works
- ✅ Migration history tracked
- ✅ Data migrations supported

---

### Phase 5: Module Data Context Auto-Registration (Priority: MEDIUM)

**Timeline:** 2-3 weeks  
**Effort:** High  
**Impact:** Medium

**Goal:** Modules automatically register their data with AppDataContext

**Tasks:**

1. **Create Data Provider Registry**
   ```typescript
   // src/contexts/DataProviderRegistry.ts
   export interface DataProviderConfig {
     module: string;
     collections: string[];
     hooks: Record<string, () => any>;
     initialData?: Record<string, any[]>;
   }
   
   export class DataProviderRegistry {
     private providers = new Map<string, DataProviderConfig>();
     
     registerProvider(config: DataProviderConfig): void {
       this.providers.set(config.module, config);
     }
     
     getProvider(module: string): DataProviderConfig | undefined {
       return this.providers.get(module);
     }
     
     getAllProviders(): DataProviderConfig[] {
       return Array.from(this.providers.values());
     }
   }
   ```

2. **Auto-Discover Data Providers**
   ```typescript
   // src/contexts/DataProviderDiscovery.ts
   export class DataProviderDiscovery {
     async discoverProviders(): Promise<void> {
       const dataIndexes = import.meta.glob('./modules/*/data/index.ts');
       
       for (const path in dataIndexes) {
         const module = await dataIndexes[path]();
         const moduleName = this.extractModuleName(path);
         
         // Look for provider config export
         if (module.dataProviderConfig) {
           dataProviderRegistry.registerProvider({
             module: moduleName,
             ...module.dataProviderConfig
           });
         }
       }
     }
   }
   ```

3. **Module Data Provider Export**
   ```typescript
   // modules/finance/data/index.ts
   export * from './types';
   export * from './schema';
   export * from './mockData';
   
   // Data hooks
   export { useInvoiceData } from './useInvoiceData';
   export { usePaymentData } from './usePaymentData';
   export { useFeeData } from './useFeeData';
   
   // Provider configuration for auto-registration
   export const dataProviderConfig = {
     collections: ['invoices', 'payments', 'fees'],
     hooks: {
       useInvoiceData,
       usePaymentData,
       useFeeData
     },
     initialData: {
       invoices: initialMockInvoices,
       payments: initialMockPayments,
       fees: initialMockFees
     }
   };
   ```

4. **Update AppDataContext**
   ```typescript
   // src/contexts/AppDataContext.tsx
   export const AppDataProvider: React.FC = ({ children }) => {
     const [data, setData] = useState({});
     
     useEffect(() => {
       // Auto-discover and register all module data providers
       dataProviderDiscovery.discoverProviders().then(() => {
         const providers = dataProviderRegistry.getAllProviders();
         
         // Initialize data from all providers
         const initialData = {};
         providers.forEach(provider => {
           Object.assign(initialData, provider.initialData);
         });
         
         setData(initialData);
       });
     }, []);
     
     // ... rest of context
   };
   ```

**Success Criteria:**
- ✅ Data providers auto-discovered
- ✅ Collections auto-registered
- ✅ Initial data loaded automatically
- ✅ No manual AppDataContext updates needed

---

### Phase 6: Independent Module Testing (Priority: MEDIUM)

**Timeline:** 2-3 weeks  
**Effort:** Medium  
**Impact:** Medium

**Goal:** Modules can be tested without the main app

**Tasks:**

1. **Create Test Utilities**
   ```typescript
   // src/__tests__/utils/moduleTestUtils.ts
   export function createModuleTestEnvironment(moduleName: string) {
     return {
       mockAppData: createMockAppData(),
       mockServices: createMockServices(),
       mockRouter: createMockRouter(),
       
       renderModuleComponent: (component: React.ReactElement) => {
         return render(
           <TestProviders>
             {component}
           </TestProviders>
         );
       }
     };
   }
   ```

2. **Module Test Template**
   ```typescript
   // modules/finance/__tests__/setup.ts
   import { createModuleTestEnvironment } from '@/__tests__/utils/moduleTestUtils';
   
   export const testEnv = createModuleTestEnvironment('finance');
   
   beforeEach(() => {
     testEnv.mockAppData.reset();
     testEnv.mockServices.reset();
   });
   ```

3. **Add Test Scripts**
   ```json
   // modules/finance/package.json (metadata only)
   {
     "name": "@schoolpilot/module-finance",
     "version": "1.0.0",
     "scripts": {
       "test": "vitest run",
       "test:watch": "vitest",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```

**Success Criteria:**
- ✅ Each module has comprehensive tests
- ✅ Tests run independently
- ✅ Mock utilities available
- ✅ Coverage > 80%

---

## Implementation Priority Matrix

| Phase | Priority | Effort | Impact | Timeline | Dependencies |
|-------|----------|--------|--------|----------|--------------|
| Phase 1: Data Independence | 🔴 Critical | High | High | 2-3 weeks | None |
| Phase 2: Module Metadata | 🔴 Critical | Medium | High | 1-2 weeks | Phase 1 |
| Phase 3: Schema Auto-Registration | 🔴 Critical | High | High | 2-3 weeks | Phase 2 |
| Phase 4: Migration System | 🟡 High | Very High | High | 3-4 weeks | Phase 3 |
| Phase 5: Data Context Auto-Reg | 🟢 Medium | High | Medium | 2-3 weeks | Phase 3 |
| Phase 6: Independent Testing | 🟢 Medium | Medium | Medium | 2-3 weeks | Phase 1 |

**Total Timeline:** 12-18 weeks (3-4.5 months)

---

## Revised Module Structure

```
modules/{module-name}/
├── module.json               # ✨ NEW: Module metadata
├── README.md                 # Module documentation
├── index.ts                  # Public API exports
├── moduleDefinition.tsx      # Module registration
├── rbac.ts                   # Permissions
│
├── data/                     # Data layer
│   ├── types.ts              # Domain types
│   ├── schema.ts             # Database schemas (auto-registered)
│   ├── collections.ts        # Collection definitions
│   ├── mockData.ts           # Demo data
│   ├── index.ts              # Data exports + provider config
│   └── use{Entity}Data.ts    # Data hooks
│
├── migrations/               # ✨ NEW: Database migrations
│   ├── 001_initial_schema.ts
│   ├── 002_add_field.ts
│   └── README.md
│
├── components/               # Module-specific components (optional)
│   └── {Feature}Component.tsx
│
├── pages/                    # Page components (can use @/components)
│   └── {Feature}Page.tsx
│
├── services/                 # Business logic
│   └── {Feature}Service.ts
│
├── hooks/                    # Custom hooks
│   └── use{Feature}.ts
│
├── i18n/                     # Translations
│   ├── en.json
│   └── fr.json
│
└── __tests__/                # ✨ ENHANCED: Independent tests
    ├── setup.ts              # Test environment
    ├── {Feature}.test.tsx
    └── integration.test.tsx
```

---

## Success Metrics

### Module Independence Score

Current: **30/100**

Target: **95/100**

**Scoring:**
- ✅ No cross-module data imports (0/25) → Target: 25/25
- ✅ Schema auto-registration (0/20) → Target: 20/20
- ✅ Migration system (0/20) → Target: 20/20
- ✅ Module metadata (0/15) → Target: 15/15
- ✅ Independent testing (0/10) → Target: 10/10
- ✅ Data context auto-reg (0/10) → Target: 10/10

### Key Performance Indicators

- **Module Build Time:** < 30 seconds per module
- **Test Isolation:** 100% of modules can run tests independently
- **Schema Registration:** 100% automatic
- **Migration Coverage:** All schema changes via migrations
- **Cross-Module Coupling:** 0 direct imports between modules
- **Test Coverage:** > 80% per module

---

## Conclusion

SchoolPilot3 has a solid foundation (70% complete) but needs focused work on:

1. **Data Independence** (22+ cross-module imports to fix)
2. **Schema Ownership** (modules need migration system)
3. **Auto-Registration** (schemas and data contexts)
4. **Module Metadata** (structured discovery)

The revised approach accepts pragmatic realities:
- ✅ Modules CAN use core components
- ✅ Modules CAN use core services via context
- ✅ Modules stay in monorepo (no separate packages)

But enforces true independence:
- 🔴 Modules MUST NOT import data from each other
- 🔴 Modules MUST own their schemas and migrations
- 🔴 Modules MUST auto-register on load

Following this 6-phase plan over 12-18 weeks will achieve 95% module independence, enabling:
- Independent module development and testing
- Schema evolution without breaking changes
- Automatic module discovery and registration
- Clear separation of concerns
- Easier maintenance and updates

**Recommended Start:** Phase 1 (Data Independence) - highest impact, unblocks everything else.

---

**Next Steps:**
1. Review and approve this plan
2. Create detailed task breakdown for Phase 1
3. Set up tracking dashboard
4. Begin implementation with pilot module (suggest: finance)
5. Document learnings and adjust plan as needed
