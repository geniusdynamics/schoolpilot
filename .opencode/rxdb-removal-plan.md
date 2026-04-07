# RxDB/PouchDB Complete Removal Plan

**Mission:** Remove all RxDB and PouchDB code, leaving only mock data functionality.

**Analysis Date:** 2026-04-07  
**Source Files Analyzed:** 119 files with RxDB/PouchDB references

---

## Executive Summary

This plan details the complete removal of RxDB and PouchDB from the SchoolPilot3 codebase. The application uses a "dual-mode" data layer with mock data for demo mode and RxDB/PouchDB for production. We are removing the database layer entirely, keeping only mock data.

**Key Finding:** RxDB has ALREADY been disabled (Phase 1 deprecation). PouchDB is still used as a fallback provider. This removal eliminates PouchDB as well, leaving only mock data.

---

## Architecture Overview

### Current Data Flow
```
AppDataContext
    ↓
UnifiedDatabaseManager
    ↓
DatabaseProviderFactory → Selects provider based on config
    ↓
Providers: SQLiteProvider | SQLiteWASMProvider | PouchDBProvider | BackendAPIProvider
```

### After Removal
```
AppDataContext → useModularMockData (in-memory mock data only)
```

---

## Phase 1: FILES TO DELETE (Entire Files)

### 1.1 PouchDB Provider Files (HIGH PRIORITY - No dependencies on other files to delete)

| File Path | Lines | Rationale |
|-----------|-------|-----------|
| `src/services/database/PouchDBProvider.ts` | 1233 | **PRIMARY TARGET** - Complete PouchDB implementation |
| `src/services/data/providers/PouchDBProvider.ts` | 705 | Duplicate/legacy PouchDB provider |
| `src/services/dataGeneration/adapters/PouchDBAdapter.ts` | 242 | PouchDB adapter for data generation |

### 1.2 Test Files to Delete

| File Path | Rationale |
|-----------|-----------|
| `src/services/database/__tests__/ProviderIntegration.test.ts` | Tests PouchDB integration |
| `src/services/database/__tests__/PerformanceBenchmarks.test.ts` | Benchmarks include PouchDB |
| `src/components/__tests__/DatabaseManagement.test.tsx` | Tests database management with PouchDB |
| `src/hooks/__tests__/useDatabaseData.test.tsx` | Tests database data hook |

### 1.3 Sync Module Files (PouchDB-dependent)

| File Path | Rationale |
|-----------|-----------|
| `src/services/database/sync/SyncManager.ts` | Sync functionality for PouchDB/CouchDB |
| `src/services/database/sync/OfflineQueue.ts` | Offline queue for sync |
| `src/services/database/sync/NetworkMonitor.ts` | Network monitoring for sync |
| `src/services/database/sync/index.ts` | Sync module exports |

---

## Phase 2: FILES TO MODIFY

### 2.1 Core Database Service Files

#### `src/services/database/index.ts`
**Changes Required:**
- Remove line 26: `export * from './PouchDBProvider';`
- Remove line 27: `export * from './HybridProvider';`
- Update comments to remove RxDB mentions

**Current State:**
```typescript
// Providers (if they exist)
export * from './PouchDBProvider';  // DELETE
export * from './HybridProvider';    // DELETE or KEEP if used by SQLite
```

#### `src/services/database/DatabaseProviderFactory.ts`
**Changes Required:**
- Remove line 15: `import { PouchDBProvider } from './PouchDBProvider';`
- Remove 'pouchdb' from ProviderType union (line 24)
- Remove pouchdb case from `DefaultProviderSelectionStrategy.selectProvider()` (lines 54-55, 79, 86, 96, 106, 114-115)
- Remove PouchDB from all provider selection logic

**Current State (line 54-55):**
```typescript
case 'pouchdb':
  return 'pouchdb';
```

#### `src/services/database/ProviderSelector.ts`
**Changes Required:**
- Remove line 21: `import { PouchDBProvider } from './PouchDBProvider';`
- Remove PouchDBProvider from dynamic import logic (if any)
- Update fallback chain to remove 'pouchdb' (line 56)

**Current State (line 56):**
```typescript
private fallbackChain: DatabaseProvider[] = ['pouchdb', 'rxdb', 'backend-api', 'sqlite-wasm'];
```

#### `src/services/database/UnifiedDatabaseManager.ts`
**Changes Required:**
- Remove 'pouchdb' from fallback chain (line 56)
- Remove pouchdb validation in `selectProvider()` (lines 246, 293-294, 312-313)
- Update `validateProviderAvailability()` logic
- Update `getProviderCapabilities()` to remove pouchdb entry (line 791-797)
- Update `validateConfiguration()` to remove pouchdb recommendations (lines 1303-1307, 1325-1327)

**Current State (line 791-797):**
```typescript
'pouchdb': {
  bulkOperations: true,
  advancedQueries: true,
  realtimeUpdates: true,
  conflictResolution: true,
  fullTextSearch: false,
},
```

### 2.2 Configuration Files

#### `src/config/dataLayerConfig.ts`
**Changes Required:**
- Remove 'pouchdb' from ProviderConfig['provider'] union (line 15)
- Remove pouchdb from normalizedProvider (line 46)
- Remove pouchdb from DATA_LAYER_CONFIG.production.alternatives[0] (lines 118-129)
- Remove pouchdb from CONSOLIDATED_CONFIGURATION_OPTIONS (lines 328-334)
- Update providerLabels to remove pouchdb (line 242)
- Remove pouchdb from `getDatabaseOptionsForMode()` return values

**Current State (line 15):**
```typescript
export interface ProviderConfig {
  provider: 'sqlite' | 'sqlite-wasm' | 'pouchdb' | 'livestore' | 'mock';
```

#### `src/config/unifiedConfig.ts`
**Changes Required:**
- Search for "RXDB" references and rename to generic names (settings, dummy data flag)
- Remove `RXDB_DB_NAME` constant or rename to `SETTINGS_DB_NAME`
- Remove `RXDB_SETTINGS_COLLECTION_NAME` or rename to `SETTINGS_COLLECTION_NAME`
- Remove `RXDB_DUMMY_DATA_FLAG_ID` or rename to `DUMMY_DATA_FLAG_ID`

### 2.3 Context and Hook Files

#### `src/contexts/AppDataContext.tsx`
**Changes Required:**
- Line 367: Remove pouchdb from sync support check:
```typescript
// Current:
const supportsSync = providerType === 'backend-api' || providerType === 'pouchdb';
// Change to:
const supportsSync = providerType === 'backend-api';
```
- Line 469: Remove pouchdb sync check
- Lines 791-797: Remove pouchdb capabilities object
- Remove sync functionality entirely (or make no-op since sync won't be supported)

#### `src/hooks/useDatabaseProvider.ts`
**Changes Required:**
- This hook is designed to work with multiple providers. After PouchDB removal, it should work with remaining providers (SQLite variants, BackendAPI)
- May need to update `detectFirstRun()` logic
- May need to update `migrateMockDataToProvider()` if PouchDB-specific migration logic exists

### 2.4 Module Collection Files (Database-Agnostic - KEEP BUT CLEAN COMMENTS)

The following files use `createDatabaseSchema` which is **provider-agnostic**. They should be KEPT but comments should be updated:

| File Path | Action |
|-----------|--------|
| `src/modules/administration/data/collections.ts` | UPDATE comments only |
| `src/modules/academics/data/collections.ts` | UPDATE comments only |
| `src/modules/finance/data/collections.ts` | UPDATE comments only |
| `src/modules/hr/data/collections.ts` | UPDATE comments only |
| `src/modules/inventory/data/collections.ts` | UPDATE comments only |
| `src/modules/library/data/collections.ts` | UPDATE comments only |
| `src/modules/nutrition/data/collections.ts` | UPDATE comments only |
| `src/modules/portal/data/collections.ts` | UPDATE comments only |

**Comment to update (example from academics/collections.ts):**
```typescript
// Current:
// ABOUTME: Defines the RxDB collection configurations for the Academics module.
// ABOUTME: This structure is imported by the central rxdbService to add module-specific collections.

// Change to:
// ABOUTME: Defines the database collection configurations for the Academics module.
// ABOUTME: This structure is imported by the central database service to add module-specific collections.
```

### 2.5 Schema Files (Database-Agnostic - KEEP BUT CLEAN COMMENTS)

Same as collection files - use `createDatabaseSchema` which is provider-agnostic:

| File Path | Action |
|-----------|--------|
| `src/modules/administration/data/schema.ts` | UPDATE comments |
| `src/modules/academics/data/schema.ts` | UPDATE comments |
| `src/modules/finance/data/schema.ts` | UPDATE comments |
| `src/modules/hr/data/schema.ts` | UPDATE comments |
| `src/modules/inventory/data/schema.ts` | UPDATE comments |
| `src/modules/library/data/schema.ts` | UPDATE comments |
| `src/modules/nutrition/data/schema.ts` | UPDATE comments |
| `src/modules/portal/data/schema.ts` | UPDATE comments |

---

## Phase 3: FILES TO REVIEW (Special Handling)

### 3.1 Settings Pages

#### `src/modules/settings/pages/DataLayerSettingsPage.tsx`
**Review Action:** This page allows users to switch between database providers. After PouchDB removal:
- Remove 'pouchdb' from provider dropdown options
- Update help text to reflect mock-only mode
- Consider adding "Demo Mode (Mock Data)" as the only option

**Key Changes:**
```typescript
// Remove pouchdb from databaseOptions mapping
// Remove pouchdb from backendOptions
// Update selectedConfiguration to exclude pouchdb
```

#### `src/components/settings/FeatureSettings.tsx`
**Review Action:** May contain references to sync status, database mode indicators. Clean up to reflect mock-only mode.

### 3.2 Database Service Files to Review

#### `src/services/database/databaseService.ts`
**Review Action:** This is a critical file that provides the database interface. After PouchDB removal:
- Ensure it works with MockAdapter only
- May need to simplify `seedDatabaseWithMockData()` to use MockAdapter
- The `MockDatabase` class should be the primary implementation

#### `src/services/database/collections.ts`
**Review Action:** Central collection definitions. Verify:
- No PouchDB/RxDB-specific code remains
- `createDatabaseSchema` works without RxDB
- Import paths are correct

### 3.3 Monitoring and Detection Modules

The following may have PouchDB-specific logic that needs review:

| File Path | Review Action |
|-----------|---------------|
| `src/services/database/detection/CapabilityDetector.ts` | Check for PouchDB-specific capability checks |
| `src/services/database/monitoring/HealthChecker.ts` | May need to remove PouchDB health metrics |
| `src/services/database/monitoring/MetricsCollector.ts` | May reference PouchDB metrics |

---

## Phase 4: SAFE TO LEAVE AS-IS

These files contain **configuration mentions only** or are **documentation**:

### 4.1 Configuration Templates (Comments Only)

| File Path | Action |
|-----------|--------|
| `src/config/templates/standalone-electron.json` | No code, just config template |
| `src/config/templates/standalone-browser.json` | No code, just config template |
| `src/config/templates/lan-sync.json` | No code, just config template |
| `src/config/templates/hybrid.json` | No code, just config template |

### 4.2 Documentation Files (No Code Changes Required)

| File Path | Action |
|-----------|--------|
| `docs/assets/rxdb_schema_docs.html` | DELETE - obsolete docs |
| `docs/assets/rxdb_issues_SC13.html` | DELETE - obsolete docs |
| `docs/assets/rxdb_errors.html` | DELETE - obsolete docs |
| `docs/assets/rxdb_collection_docs.html` | DELETE - obsolete docs |
| `docs/workflows/workflow_plan.md` | Update or DELETE references |
| `docs/guides/rxdb-data-dev-guide.md` | DELETE - obsolete guide |

### 4.3 No Code Changes Needed

| File Path | Rationale |
|-----------|-----------|
| `src/services/database/types.ts` | Type definitions - provider-agnostic |
| `src/services/database/interfaces.ts` | Interface definitions - provider-agnostic |
| `src/services/database/SchemaConverter.ts` | Works with any provider via CollectionSchema |
| `src/services/database/LiveStoreProvider.ts` | Keep - separate from PouchDB |
| `src/services/database/HybridProvider.ts` | Review - may reference PouchDB |

---

## Phase 5: DELETION ORDER (Dependency-Agraph)

Files MUST be deleted in this order to avoid import errors:

### Order 1: PouchDB-Dependent Sync Module
```
DELETE:
- src/services/database/sync/OfflineQueue.ts
- src/services/database/sync/NetworkMonitor.ts  
- src/services/database/sync/SyncManager.ts
- src/services/database/sync/index.ts

BEFORE: Any files that import from sync/
```

### Order 2: PouchDB Provider Files
```
DELETE:
- src/services/database/PouchDBProvider.ts
- src/services/data/providers/PouchDBProvider.ts
- src/services/dataGeneration/adapters/PouchDBAdapter.ts

BEFORE: Any files that import these providers
```

### Order 3: Files that Import PouchDB Providers
```
MODIFY (remove imports):
- src/services/database/index.ts
- src/services/database/DatabaseProviderFactory.ts
- src/services/database/ProviderSelector.ts
- src/services/database/UnifiedDatabaseManager.ts

THEN DELETE test files:
- src/services/database/__tests__/ProviderIntegration.test.ts
- src/services/database/__tests__/PerformanceBenchmarks.test.ts
```

### Order 4: Configuration Cleanup
```
MODIFY:
- src/config/dataLayerConfig.ts
- src/config/unifiedConfig.ts (rename constants)

DELETE obsolete docs:
- docs/assets/rxdb_*.html
- docs/guides/rxdb-data-dev-guide.md
```

### Order 5: Final Cleanup
```
MODIFY:
- src/contexts/AppDataContext.tsx
- src/hooks/useDatabaseProvider.ts
- All module data/collections.ts (comments)
- All module data/schema.ts (comments)
- src/modules/settings/pages/DataLayerSettingsPage.tsx

DELETE remaining test files:
- src/components/__tests__/DatabaseManagement.test.tsx
- src/hooks/__tests__/useDatabaseData.test.tsx
```

---

## Breaking Changes and Mitigations

### Breaking Change 1: No Database Persistence
**Impact:** All data will be in-memory only, lost on page refresh  
**Mitigation:** Document that this is demo mode behavior. Consider adding localStorage backup as lightweight alternative.

### Breaking Change 2: Sync Functionality Removed
**Impact:** No more sync with remote CouchDB/PouchDB servers  
**Mitigation:** Document that sync is not available in mock-only mode. Update UI to disable/hide sync settings.

### Breaking Change 3: `DataLayerSettingsPage` Becomes Simpler
**Impact:** Provider dropdown will only show "Mock" or be hidden  
**Mitigation:** Simplify the page to just show "Demo Mode" indicator.

### Breaking Change 4: `useAppData()` Hook Changes
**Impact:** Some `dbManager.getProviderType()` calls may return null or 'mock'  
**Mitigation:** Update code that checks for specific provider types to handle 'mock' case.

---

## Verification Checklist

After removal, verify:

- [ ] `npm run typecheck` passes with no errors
- [ ] `npm run build` succeeds
- [ ] Application loads in demo mode
- [ ] All mock data loads correctly
- [ ] No PouchDB imports in compiled bundle
- [ ] No RxDB imports in compiled bundle
- [ ] Sync settings UI is disabled/hidden
- [ ] Database settings page shows mock-only mode

---

## Recommended Execution Order

1. **Backup:** Create git branch for rollback
2. **Phase 1:** Delete PouchDB provider files (no code changes)
3. **Phase 2a:** Update DatabaseProviderFactory (remove PouchDB)
4. **Phase 2b:** Update ProviderSelector (remove PouchDB)
5. **Phase 2c:** Update UnifiedDatabaseManager (remove PouchDB)
6. **Phase 3:** Update configuration files
7. **Phase 4:** Update AppDataContext
8. **Phase 5:** Update hooks and settings pages
9. **Phase 6:** Clean up module comments
10. **Phase 7:** Delete test files
11. **Phase 8:** Verify build and tests
12. **Phase 9:** Delete obsolete documentation

---

## File Manifest Summary

| Category | Count | Files |
|----------|-------|-------|
| DELETE (entire files) | 10 | PouchDB providers, sync module, test files |
| MODIFY (remove PouchDB code) | 15+ | Factory, Provider, Manager, Config, Context, Hooks, Settings |
| UPDATE (comments only) | 16 | Module schema/collections files |
| DELETE (obsolete docs) | 5+ | rxdb_*.html, rxdb-data-dev-guide.md |
| SAFE (no changes needed) | 10+ | Templates, type definitions |

**Total Files Affected:** ~50 files  
**Total Files Deleted:** ~15 files  
**Total Lines Changed:** ~2000 lines