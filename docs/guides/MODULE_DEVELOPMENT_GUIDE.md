# Module Development Guide - SchoolPilot

> **For New Engineers:** This guide explains how to build new modules in SchoolPilot using our modular auto-discovery architecture.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Module Architecture Overview](#module-architecture-overview)
3. [Step-by-Step: Creating a New Module](#step-by-step-creating-a-new-module)
4. [Collection Auto-Discovery](#collection-auto-discovery)
5. [Data Provider Pattern](#data-provider-pattern)
6. [CRUD Operations](#crud-operations)
7. [Pages & Components](#pages--components)
8. [Testing Your Module](#testing-your-module)
9. [Best Practices](#best-practices)

---

## Quick Start

Want to create a new module fast? Here's the **minimum required files**:

```
src/modules/your-module/
├── data/
│   ├── collectionConfig.ts      # REQUIRED: Registers your collections
│   ├── YourDataProvider.tsx     # REQUIRED: CRUD operations
│   └── types.ts                 # RECOMMENDED: Module types
├── hooks/
│   ├── useYourModule.ts         # REQUIRED: Main module hook
│   └── index.ts                 # RECOMMENDED: Hook exports
├── pages/
│   └── YourMainPage.tsx         # REQUIRED: At least one page
├── moduleDefinition.tsx         # REQUIRED: Module registration
└── index.ts                     # RECOMMENDED: Barrel exports
```

---

## Module Architecture Overview

### The Auto-Discovery System

SchoolPilot uses **automatic module discovery**. This means:

- ✅ **No core file editing** when adding collections
- ✅ **No manual array updates** in AppDataContext
- ✅ **Each module defines itself** and is automatically integrated
- ✅ **Drop-in modularity** - just create files in your module folder

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR MODULE                                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ collectionConfig.ts                                       │  │
│  │ • Defines DB collections                                │  │
│  │ • Auto-discovered by core                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ YourDataProvider.tsx                                      │  │
│  │ • CRUD operations                                         │  │
│  │ • Validation                                              │  │
│  │ • Toast notifications                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ useYourModule.ts                                          │  │
│  │ • Combines data + CRUD                                    │  │
│  │ • Pages use this hook                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   CORE SYSTEM       │
                    │                     │
                    │ • Auto-discovers    │
                    │   collections       │
                    │ • Aggregates all    │
                    │   modules           │
                    │ • Provides data     │
                    │   to AppDataContext │
                    └─────────────────────┘
```

---

## Step-by-Step: Creating a New Module

### Step 1: Create Module Folder Structure

```bash
mkdir -p src/modules/your-module/{data,hooks,pages,components}
```

### Step 2: Define Your Collections (collectionConfig.ts)

This is the **most important file** - it registers your collections with the core system.

```typescript
// src/modules/your-module/data/collectionConfig.ts
import type { ModuleCollectionsConfig } from '@/core/types/moduleCollections';

export const yourModuleCollections: ModuleCollectionsConfig = {
  moduleName: 'your-module',
  aliases: {
    // DB collection name (snake_case) : AppData key (camelCase)
    your_entities: 'yourEntities',
    another_collection: 'anotherCollection',
    related_items: 'relatedItems',
  },
  // Optional: include schemas for database
  schemas: {
    your_entities: yourEntitiesSchema,
    another_collection: anotherCollectionSchema,
  },
};

export default yourModuleCollections;
```

**Key Points:**
- `moduleName`: Unique identifier for your module
- `aliases`: Maps database collection names to AppData keys
- `schemas`: (Optional) Database schemas used by UnifiedDatabaseManager

### Step 3: Create Your Data Provider

```typescript
// src/modules/your-module/data/YourDataProvider.tsx
import React, { createContext, useContext, useCallback } from 'react';
import { databaseService } from '@/services/database';
import { useToastHelpers } from '@/hooks/useToast';
import type { YourEntity } from './types';

interface YourDataContextType {
  // CRUD Operations
  addYourEntity: (data: Partial<YourEntity>) => Promise<YourEntity>;
  updateYourEntity: (id: string, data: Partial<YourEntity>) => Promise<void>;
  deleteYourEntity: (id: string) => Promise<void>;
}

const YourDataContext = createContext<YourDataContextType | undefined>(undefined);

export const YourDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showSuccess, showError } = useToastHelpers();

  const addYourEntity = useCallback(async (data: Partial<YourEntity>) => {
    try {
      const db = databaseService.getManager();
      const collection = db.getCollection('your_entities');
      
      const newEntity = {
        id: crypto.randomUUID(),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      await collection?.insert(newEntity);
      showSuccess('Entity created successfully');
      return newEntity;
    } catch (error) {
      showError('Failed to create entity');
      throw error;
    }
  }, [showSuccess, showError]);

  const updateYourEntity = useCallback(async (id: string, data: Partial<YourEntity>) => {
    try {
      const db = databaseService.getManager();
      const collection = db.getCollection('your_entities');
      
      await collection?.update(id, {
        ...data,
        updated_at: new Date().toISOString(),
      });
      
      showSuccess('Entity updated successfully');
    } catch (error) {
      showError('Failed to update entity');
      throw error;
    }
  }, [showSuccess, showError]);

  const deleteYourEntity = useCallback(async (id: string) => {
    try {
      const db = databaseService.getManager();
      const collection = db.getCollection('your_entities');
      
      await collection?.remove(id);
      showSuccess('Entity deleted successfully');
    } catch (error) {
      showError('Failed to delete entity');
      throw error;
    }
  }, [showSuccess, showError]);

  return (
    <YourDataContext.Provider value={{
      addYourEntity,
      updateYourEntity,
      deleteYourEntity,
    }}>
      {children}
    </YourDataContext.Provider>
  );
};

export const useYourDataContext = () => {
  const context = useContext(YourDataContext);
  if (!context) throw new Error('useYourDataContext must be used within YourDataProvider');
  return context;
};
```

### Step 4: Create Your Module Hook

```typescript
// src/modules/your-module/hooks/useYourModule.ts
import { useAppData } from '@/hooks/useAppData';
import { useYourDataContext } from '../data/YourDataProvider';

export const useYourModule = () => {
  // Get read-only data from AppDataContext
  const {
    yourEntities,
    anotherCollection,
    relatedItems,
    loading,
  } = useAppData();

  // Get CRUD operations from your DataProvider
  const {
    addYourEntity,
    updateYourEntity,
    deleteYourEntity,
  } = useYourDataContext();

  return {
    // Data
    yourEntities: yourEntities || [],
    anotherCollection: anotherCollection || [],
    relatedItems: relatedItems || [],
    loading,

    // CRUD Operations
    addYourEntity,
    updateYourEntity,
    deleteYourEntity,
  };
};

export default useYourModule;
```

### Step 5: Create a Page

```typescript
// src/modules/your-module/pages/YourEntitiesPage.tsx
import React, { useState } from 'react';
import { useYourModule } from '../hooks/useYourModule';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { DataGrid } from '@/components/ui/data';
import DialogForm from '@/components/ui/forms/DialogForm';

const YourEntitiesPage: React.FC = () => {
  const {
    yourEntities,
    loading,
    addYourEntity,
    updateYourEntity,
    deleteYourEntity,
  } = useYourModule();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);

  const handleSubmit = async (formData: any) => {
    if (editingEntity) {
      await updateYourEntity(editingEntity.id, formData);
    } else {
      await addYourEntity(formData);
    }
    setIsModalOpen(false);
    setEditingEntity(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this entity?')) {
      await deleteYourEntity(id);
    }
  };

  if (loading?.all) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <Card title="Your Entities">
        <div className="mb-4">
          <Button onClick={() => setIsModalOpen(true)}>
            Add Entity
          </Button>
        </div>

        <DataGrid
          data={yourEntities}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'description', header: 'Description' },
            {
              key: 'actions',
              header: 'Actions',
              render: (row: any) => (
                <>
                  <Button onClick={() => { setEditingEntity(row); setIsModalOpen(true); }}>
                    Edit
                  </Button>
                  <Button onClick={() => handleDelete(row.id)} variant="danger">
                    Delete
                  </Button>
                </>
              ),
            },
          ]}
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEntity(null); }}
        onSubmit={handleSubmit}
        title={editingEntity ? 'Edit Entity' : 'Add Entity'}
      >
        {/* Form fields here */}
      </DialogForm>
    </div>
  );
};

export default YourEntitiesPage;
```

### Step 6: Create Module Definition

```typescript
// src/modules/your-module/moduleDefinition.tsx
import React from 'react';
import { ModuleDefinition } from '@/core/types/module';
import { YourIcon } from '@/components/ui/icons';
import YourEntitiesPage from './pages/YourEntitiesPage';
import { YourDataProvider } from './data/YourDataProvider';

const YourModule: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <YourDataProvider>{children}</YourDataProvider>
);

export const yourModuleDefinition: ModuleDefinition = {
  id: 'your-module',
  name: 'navigation:yourModule.title',
  description: 'navigation:yourModule.description',
  icon: <YourIcon />,
  path: '/your-module',
  isActive: true,
  version: '1.0.0',
  navigation: [
    {
      id: 'your-entities',
      label: 'Your Entities',
      path: '/your-module/entities',
      component: YourEntitiesPage,
    },
  ],
  provider: YourModule,
};

export default yourModuleDefinition;
```

### Step 7: Register Your Module in Core

Add your module to the module registry:

```typescript
// src/contexts/appData/moduleCollectionRegistry.ts
import { yourModuleCollections } from '@/modules/your-module/data/collectionConfig';

const MODULE_CONFIGS: ModuleCollectionsConfig[] = [
  // ... existing modules
  yourModuleCollections, // ← Add your module
];
```

```typescript
// src/modules/index.ts (or module registry file)
import { yourModuleDefinition } from './your-module/moduleDefinition';

export const modules = [
  // ... existing modules
  yourModuleDefinition, // ← Add your module
];
```

---

## Collection Auto-Discovery

### How It Works

1. **Each module exports** `collectionConfig.ts` with its collections
2. **Core imports** all module configs in `moduleCollectionRegistry.ts`
3. **Auto-aggregation** generates `APP_DATA_ARRAY_KEYS` and `COLLECTION_KEY_ALIASES`
4. **AppDataContext** uses these auto-generated arrays to:
   - Initialize all arrays as empty `[]`
   - Map database collections to AppData keys
   - Track loading states per collection

### What You Don't Need to Do

❌ **OLD WAY (Deprecated):**
```typescript
// ❌ Don't do this anymore!
// src/contexts/appData/appDataCollections.ts
const APP_DATA_ARRAY_KEYS = [
  // ... 90+ manually maintained entries
  'yourEntities', // ← Had to add manually
  // ...
];
```

✅ **NEW WAY (Auto-Discovery):**
```typescript
// ✅ Just define in your module!
// src/modules/your-module/data/collectionConfig.ts
export const yourModuleCollections: ModuleCollectionsConfig = {
  moduleName: 'your-module',
  aliases: {
    your_entities: 'yourEntities', // ← Auto-discovered!
  },
};
```

---

## Data Provider Pattern

### Why Data Providers?

| Concern | Responsibility |
|---------|---------------|
| **AppDataContext** | Data coordinator (reads from DB, provides raw data) |
| **YourDataProvider** | CRUD operations (writes to DB, validation, notifications) |
| **useYourModule** | Combines both for pages to use |

### Standard CRUD Pattern

Every DataProvider should implement these:

```typescript
interface StandardCrudOperations<T> {
  // Create
  addEntity: (data: Partial<T>) => Promise<T>;
  
  // Read (handled by AppDataContext)
  // entities: T[]; ← From useAppData()
  
  // Update
  updateEntity: (id: string, data: Partial<T>) => Promise<void>;
  
  // Delete
  deleteEntity: (id: string) => Promise<void>;
  
  // Batch operations (optional)
  bulkAdd: (items: Partial<T>[]) => Promise<T[]>;
  bulkUpdate: (items: { id: string; data: Partial<T> }[]) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
}
```

### Validation

Use the shared validation hook:

```typescript
import { useValidation } from '@/hooks/useValidation';

const { validate, validators } = useValidation();

const addYourEntity = useCallback(async (data: Partial<YourEntity>) => {
  // Validate
  const errors = validate(data, {
    name: [validators.required('Name is required')],
    email: [validators.email('Invalid email')],
  });
  
  if (errors.length > 0) {
    showError(errors[0].message);
    return;
  }
  
  // Proceed with create...
}, []);
```

---

## CRUD Operations

### Standard Implementation Template

```typescript
// Standard CRUD with toast notifications
const addEntity = useCallback(async (data: Partial<EntityType>) => {
  try {
    const db = databaseService.getManager();
    const collection = db.getCollection('collection_name');
    
    const newEntity = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await collection?.insert(newEntity);
    
    // Refresh data
    await loadAllCollections();
    
    showSuccess('Created successfully');
    return newEntity;
  } catch (error) {
    showError('Failed to create');
    throw error;
  }
}, [loadAllCollections, showSuccess, showError]);

const updateEntity = useCallback(async (id: string, data: Partial<EntityType>) => {
  try {
    const db = databaseService.getManager();
    const collection = db.getCollection('collection_name');
    
    await collection?.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
    });
    
    await loadAllCollections();
    showSuccess('Updated successfully');
  } catch (error) {
    showError('Failed to update');
    throw error;
  }
}, [loadAllCollections, showSuccess, showError]);

const deleteEntity = useCallback(async (id: string) => {
  try {
    const db = databaseService.getManager();
    const collection = db.getCollection('collection_name');
    
    await collection?.remove(id);
    
    await loadAllCollections();
    showSuccess('Deleted successfully');
  } catch (error) {
    showError('Failed to delete');
    throw error;
  }
}, [loadAllCollections, showSuccess, showError]);
```

---

## Pages & Components

### Using Your Module Hook

Pages should **only** use the module hook, never `useAppData` directly:

```typescript
// ✅ CORRECT: Use module hook
import { useYourModule } from '@/modules/your-module/hooks/useYourModule';

const YourPage: React.FC = () => {
  const { yourEntities, addYourEntity } = useYourModule();
  // ...
};

// ❌ INCORRECT: Don't use useAppData directly in pages
import { useAppData } from '@/hooks/useAppData';

const YourPage: React.FC = () => {
  const { yourEntities, addYourEntity } = useAppData(); // ❌ Wrong!
  // ...
};
```

### Null Safety

Always provide default values:

```typescript
const {
  yourEntities = [],  // ← Default to empty array
  anotherCollection = [],
  loading,
} = useYourModule();

// Use optional chaining for loading
if (loading?.all) {
  return <Spinner />;
}

// Safe array operations
const filtered = yourEntities?.filter(e => e.active) || [];
```

---

## Testing Your Module

### 1. Verify Collections Are Registered

Check the browser console:

```typescript
import { getModuleRegistryInfo } from '@/contexts/appData/moduleCollectionRegistry';

console.log(getModuleRegistryInfo());
// Should show your module and its collections
```

### 2. Test Data Provider

```typescript
// In a test component or browser console
const { addYourEntity } = useYourDataContext();

// Test create
await addYourEntity({ name: 'Test Entity' });

// Verify in AppDataContext
const { yourEntities } = useAppData();
console.log(yourEntities); // Should include new entity
```

### 3. Test Full Page Flow

1. Navigate to your page
2. Click "Add" button
3. Fill form and submit
4. Verify toast notification appears
5. Verify entity appears in DataGrid
6. Test Edit → Update
7. Test Delete → Remove

---

## Best Practices

### 1. Module Structure

```
src/modules/your-module/
├── data/
│   ├── collectionConfig.ts      # REQUIRED: Collection registration
│   ├── YourDataProvider.tsx     # REQUIRED: CRUD operations
│   ├── types.ts                 # Module-specific types
│   └── schema.ts                # Database schemas
├── hooks/
│   ├── useYourModule.ts         # REQUIRED: Main module hook
│   ├── useYourValidation.ts     # Validation rules (optional)
│   └── index.ts                 # Barrel exports
├── pages/
│   ├── YourMainPage.tsx
│   ├── YourDetailPage.tsx
│   └── index.ts
├── components/
│   ├── YourForm.tsx
│   ├── YourList.tsx
│   └── index.ts
├── moduleDefinition.tsx         # REQUIRED: Module registration
└── index.ts                     # Barrel exports
```

### 2. Naming Conventions

| Entity | Hook | Provider | File |
|--------|------|----------|------|
| finance | `useFinance` | `FinanceDataProvider` | `FinanceDataProvider.tsx` |
| your-module | `useYourModule` | `YourDataProvider` | `YourDataProvider.tsx` |

### 3. Error Handling

Always wrap CRUD in try-catch with toast notifications:

```typescript
try {
  await addEntity(data);
  showSuccess('Created successfully');
} catch (error) {
  showError('Failed to create: ' + error.message);
  throw error; // Re-throw for caller to handle
}
```

### 4. Type Safety

Define types in `data/types.ts`:

```typescript
export interface YourEntity {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type YourEntityFormData = Omit<YourEntity, 'id' | 'created_at' | 'updated_at'>;
```

### 5. Documentation

Add JSDoc comments to your collection config:

```typescript
export const yourModuleCollections: ModuleCollectionsConfig = {
  moduleName: 'your-module',
  aliases: {
    /**
     * Main entities for your module
     * Used in: YourMainPage, YourDetailPage
     */
    your_entities: 'yourEntities',
    
    /**
     * Related items, nested under entities
     * Used in: YourDetailPage for entity details
     */
    related_items: 'relatedItems',
  },
};
```

---

## Troubleshooting

### Issue: Collections not appearing in AppDataContext

**Check:**
1. Is `collectionConfig.ts` exporting correctly?
2. Is it imported in `moduleCollectionRegistry.ts`?
3. Check browser console for `getModuleRegistryInfo()` output

### Issue: CRUD operations not working

**Check:**
1. Is `YourDataProvider` wrapping your routes?
2. Is `useYourDataContext` being called inside the provider?
3. Check database collection name matches `collectionConfig.ts`

### Issue: Type errors in useYourModule

**Check:**
1. Are you importing from the correct paths?
2. Are types exported from `data/types.ts`?
3. Is `useAppData` returning the expected collections?

---

## Example Modules (Reference)

| Module | Key Files |
|--------|-----------|
| **Finance** | `FinanceDataProvider.tsx`, `useFinance.ts`, `collectionConfig.ts` |
| **Administration** | `AdministrationDataProvider.tsx`, `useAdministration.ts`, `collectionConfig.ts` |
| **HR** | `HRDataProvider.tsx`, `useHR.ts`, `collectionConfig.ts` |
| **Library** | `LibraryDataProvider.tsx`, `useLibrary.ts`, `collectionConfig.ts` |

---

## Summary

Building a new module requires:

1. ✅ **collectionConfig.ts** - Register your collections (auto-discovered)
2. ✅ **DataProvider** - Implement CRUD operations
3. ✅ **useYourModule.ts** - Combine data + CRUD for pages
4. ✅ **Pages** - Use `useYourModule()` hook
5. ✅ **moduleDefinition.tsx** - Register module in system
6. ✅ **Register in core** - Add to `moduleCollectionRegistry.ts`

**Remember:** The core principle is **auto-discovery**. Define your collections in your module, and the core handles the rest!

---

*Last Updated: April 10, 2026*
*Architecture: Modular Auto-Discovery System*
