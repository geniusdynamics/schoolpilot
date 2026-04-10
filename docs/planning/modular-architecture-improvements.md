# Modular Architecture Improvements Plan

## Overview

This document outlines a phased plan to improve the modularity of the SchoolPilot3 system by addressing architectural violations and strengthening module boundaries.

---

## Current State Summary

### Identified Violations

| # | Violation | Severity | Impact |
|---|-----------|----------|--------|
| 1 | Core module is a feature module | 🔴 High | Core infrastructure not truly centralized |
| 2 | RBAC has hardcoded module definitions | 🔴 High | Duplicate definitions, conflicts with registry |
| 3 | SystemDataContext in wrong location | 🟡 Medium | Core context in feature module structure |
| 4 | Module dependencies not enforced | 🟡 Medium | Declarations exist but aren't runtime-enforced |
| 5 | Data layer hybrid model | 🟡 Medium | Modules independent for UI, dependent for data |
| 6 | Settings module overreach | 🟡 Medium | Contains all module settings in one place |
| 7 | Shared types scattered | 🟡 Medium | Circular dependencies between core and modules |
| 8 | module.json unused for loading | 🟢 Low | Metadata duplication |

---

## Implementation Phases

### Phase 1: Core Infrastructure Reorganization
**Goal**: Move core infrastructure out of `modules/core/` and establish true core boundaries.

#### Tasks

#### 1.1 Create Core Infrastructure Structure
**Files to Create**:
- `src/core/services/coreServices.ts` - Registry for core services
- `src/core/config/coreConfig.ts` - Core configuration

#### 1.2 Move SystemDataContext
**Files to Move**:
- `src/modules/core/data/SystemDataContext.tsx` → `src/core/contexts/SystemDataContext.tsx`
- `src/modules/core/data/useSystemData.ts` → `src/core/contexts/useSystemData.ts`
- `src/modules/core/data/useSafeSystemContext.ts` → `src/core/contexts/useSafeSystemContext.ts`

**Updates Required**:
- Update all imports referencing the old location
- Update exports in `src/core/index.ts`

#### 1.3 Move RBAC Definitions
**Files to Move**:
- `src/modules/core/rbac.ts` → `src/core/services/rbacDefinitions.ts`

**Updates Required**:
- Update imports in `src/core/rbacService.ts`
- Remove the `initializeRequiredModules()` method

#### 1.4 Update Core Types Import
**File**: `src/core/types/index.ts`
- Add re-exports for moved types
- Ensure all shared types are properly exported

---

### Phase 2: RBAC Cleanup
**Goal**: Remove duplicate module definitions and rely on module registry.

#### Tasks

#### 2.1 Remove Hardcoded Module Definitions
**File**: `src/core/rbacService.ts`
- Delete the `initializeRequiredModules()` method (lines 160-416)
- Remove the hardcoded module definitions
- Update constructor to not call this method

#### 2.2 Update RBAC Service to Use Registry
**File**: `src/core/rbacService.ts`
- Update `registerModule()` to work with `ModuleDefinition` from registry
- Update `getAllRoles()`, `getAllPermissions()` to reflect registry state
- Ensure RBAC integrates with module registry lifecycle

#### 2.3 Verify RBAC Integration
**File**: `src/core/rbacService.ts`
- Update `initializeSuperAdminRole()` to use registry-provided permissions
- Ensure dynamic permission discovery works

---

### Phase 3: Data Layer Clarification
**Goal**: Establish clear boundaries for data ownership and access.

#### Tasks

#### 3.1 Create Module Data API Interface
**File**: `src/core/interfaces/moduleApi.ts`
```typescript
export interface ModuleDataApi {
  getEntities<T>(entityName: string): Promise<T[]>;
  getEntityById<T>(entityName: string, id: string): Promise<T | null>;
  createEntity<T>(entityName: string, data: Partial<T>): Promise<T>;
  updateEntity<T>(entityName: string, id: string, data: Partial<T>): Promise<T>;
  deleteEntity(entityName: string, id: string): Promise<boolean>;
}
```

#### 3.2 Update Module Hooks to Use Module Data API
**Files to Update**:
- `src/modules/administration/hooks/useStudentData.ts`
- `src/modules/administration/hooks/useStaffData.ts`
- `src/modules/finance/hooks/useFeeTemplateData.ts`
- All other module-specific data hooks

**Changes**:
- Update hooks to use `useModuleData(moduleId)` instead of `useAppData()`
- Each module should manage its own entities

#### 3.3 Create useModuleData Hook
**File**: `src/hooks/useModuleData.ts`
```typescript
export function useModuleData(moduleId: string) {
  // Return module-specific data access methods
  // Falls back to AppDataContext for shared entities
}
```

#### 3.4 Update AppDataContext
**File**: `src/contexts/AppDataContext.tsx`
- Update to provide module-scoped data access
- Keep shared entities (users, roles) at global level
- Provide `useModuleData()` integration

---

### Phase 4: Settings and Types Cleanup
**Goal**: Centralize shared types and fix settings module overreach.

#### Tasks

#### 4.1 Create Settings Registry
**File**: `src/core/config/settingsRegistry.ts`
```typescript
export interface ModuleSettingsDefinition {
  moduleId: string;
  settings: Array<{
    key: string;
    type: 'boolean' | 'string' | 'number' | 'select';
    defaultValue: any;
    label?: string;
    description?: string;
  }>;
}
```

#### 4.2 Move Module-Specific Settings to Modules
**Files to Create/Move**:
- `src/modules/administration/config/settings.ts` - Admin settings
- `src/modules/academics/config/settings.ts` - Academics settings
- `src/modules/finance/config/settings.ts` - Finance settings
- `src/modules/hr/config/settings.ts` - HR settings
- `src/modules/inventory/config/settings.ts` - Inventory settings
- `src/modules/library/config/settings.ts` - Library settings
- `src/modules/nutrition/config/settings.ts` - Nutrition settings

#### 4.3 Update Settings Module
**Files to Update**:
- `src/modules/settings/pages/ModuleManagementPage.tsx` - Keep only module enable/disable
- `src/modules/settings/i18n/en.json` - Remove module-specific settings translations

#### 4.4 Centralize Shared Types
**File**: `src/core/types/index.ts`
- Add exports for all moved types
- Ensure no circular dependencies

---

### Phase 5: module.json Integration
**Goal**: Either use module.json for loading or consolidate metadata.

#### Tasks

#### 5.1 Create module.json Loader
**File**: `src/core/module-system/moduleMetadataLoader.ts`
- Load module.json files
- Extract dependencies, imports, provisions
- Generate module metadata

#### 5.2 Update Module Registry to Use module.json
**File**: `src/core/moduleRegistry.ts`
- Update `registerModule()` to accept module.json metadata
- Use module.json for dependency resolution

#### 5.3 Update moduleDefinition.tsx
**File**: `src/modules/*/moduleDefinition.tsx`
- Remove duplicate metadata definitions
- Import from module.json instead

---

## File Change Summary

### Files to Create
- `src/core/contexts/SystemDataContext.tsx`
- `src/core/contexts/useSystemData.ts`
- `src/core/contexts/useSafeSystemContext.ts`
- `src/core/services/rbacDefinitions.ts`
- `src/core/interfaces/moduleApi.ts`
- `src/hooks/useModuleData.ts`
- `src/core/config/settingsRegistry.ts`
- `src/core/module-system/moduleMetadataLoader.ts`
- All module-specific settings files in Phase 4

### Files to Move
- `src/modules/core/data/SystemDataContext.tsx` → `src/core/contexts/SystemDataContext.tsx`
- `src/modules/core/data/useSystemData.ts` → `src/core/contexts/useSystemData.ts`
- `src/modules/core/data/useSafeSystemContext.ts` → `src/core/contexts/useSafeSystemContext.ts`
- `src/modules/core/rbac.ts` → `src/core/services/rbacDefinitions.ts`

### Files to Delete
- `src/modules/core/` (entire directory after moves)

### Files to Update
- `src/core/rbacService.ts` - Remove hardcoded modules
- `src/contexts/AppDataContext.tsx` - Update data access
- `src/modules/*/hooks/*.ts` - Update to use module data API
- `src/core/types/index.ts` - Update exports
- All module.json files - Update for new loading mechanism

---

## Verification Steps

### After Each Phase
1. **Build Verification**: `npm run build` should succeed
2. **Type Checking**: `npm run typecheck` should pass
3. **Linting**: `npm run lint` should pass
4. **Runtime Tests**: All existing tests should pass

### After All Phases
1. **Module Discovery**: Verify all modules load correctly
2. **RBAC**: Verify permissions and roles work
3. **Data Access**: Verify module-specific data access
4. **Settings**: Verify settings management works
5. **Cross-Module Imports**: Run `npm run lint:modules` to verify no violations

---

## Rollback Plan

If issues arise during implementation:

1. **Use Git**: Each phase is a separate commit
2. **Quick Rollback**: `git reset --hard HEAD~N` where N is the phase number
3. **Partial Rollback**: Reset specific files: `git checkout HEAD -- <file>`

---

## Success Criteria

- ✅ All modules load without errors
- ✅ RBAC permissions work correctly
- ✅ Module-specific data is managed by each module
- ✅ Settings are properly organized
- ✅ No cross-module import violations
- ✅ Build passes without errors
- ✅ All tests pass
- ✅ Type checking passes
