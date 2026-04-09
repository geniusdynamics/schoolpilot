# Module Development Guide - SchoolPilot

> **Last Updated:** April 10, 2026  
> **Architecture:** Modular CRUD with Auto-Discovery

This guide explains how to create new modules in SchoolPilot using our **modular auto-discovery architecture**.

---

## Quick Summary

**The New Way (Modular CRUD):**
- ✅ Each module defines its own collections (auto-discovered)
- ✅ Each module has its own DataProvider (CRUD operations)
- ✅ Each module exports a hook (data + CRUD combined)
- ✅ Pages use only the module hook
- ✅ No core file editing required!

**Key Concept:**
```
Module Collection Config → Core Registry → AppDataContext
YourDataProvider → useYourModule → Pages
```

---

## Module Overview

Modules are self-contained feature areas that encapsulate related functionality:

- **collectionConfig.ts** - Registers collections (auto-discovered by core)
- **DataProvider** - CRUD operations with validation & notifications
- **useYourModule hook** - Combines data from AppDataContext + CRUD from DataProvider
- **Pages** - Use the module hook only
- **Components** - Reusable UI elements
- **Types** - TypeScript definitions

---

## Creating a New Module

### 1. Create Module Structure

Create the following directory structure:

```
src/modules/your-module/
├── data/
│   ├── collectionConfig.ts      # ⚡ REQUIRED: Auto-discoverable collections
│   ├── YourDataProvider.tsx     # ⚡ REQUIRED: CRUD operations
│   ├── types.ts                 # RECOMMENDED: TypeScript types
│   └── index.ts                 # RECOMMENDED: Data exports
├── hooks/
│   ├── useYourModule.ts         # ⚡ REQUIRED: Main module hook
│   └── index.ts                 # RECOMMENDED: Hook exports
├── pages/
│   ├── YourMainPage.tsx         # REQUIRED: At least one page
│   └── index.ts                 # RECOMMENDED: Page exports
├── components/
│   └── YourComponent.tsx        # RECOMMENDED: Reusable components
├── moduleDefinition.tsx         # ⚡ REQUIRED: Module registration
└── index.ts                     # RECOMMENDED: Barrel exports
```

**See also:** `docs/guides/MODULE_DEVELOPMENT_GUIDE.md` for detailed step-by-step instructions.

### 2. Register Collections (collectionConfig.ts)

This is the **most important file** - it auto-registers your collections with the core system:

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
  },
};

export default yourModuleCollections;
```

**Key Points:**
- `moduleName`: Unique identifier for your module
- `aliases`: Maps database collection names to AppData keys
- `schemas`: (Optional) Database schemas used by UnifiedDatabaseManager

Then import it in the core registry:
```typescript
// src/contexts/appData/moduleCollectionRegistry.ts
import { yourModuleCollections } from '@/modules/your-module/data/collectionConfig';

const MODULE_CONFIGS: ModuleCollectionsConfig[] = [
  // ... existing modules
  yourModuleCollections, // ← Add your module (1 line!)
];
```

---

## Data Provider Pattern (NEW)

### 3. Create Your Data Provider

DataProviders handle CRUD operations with validation and toast notifications:

```typescript
// src/modules/your-module/data/YourDataProvider.tsx
import React, { createContext, useContext, useCallback } from 'react';
import { databaseService } from '@/services/database';
import { useToastHelpers } from '@/hooks/useToast';
import { useValidation } from '@/hooks/useValidation';
import type { YourEntity } from './types';

interface YourDataContextType {
  // CRUD Operations
  addYourEntity: (data: Partial<YourEntity>) => Promise<YourEntity>;
  updateYourEntity: (id: string, data: Partial<YourEntity>) => Promise<void>;
  deleteYourEntity: (id: string) => Promise<void>;
  bulkAdd: (items: Partial<YourEntity>[]) => Promise<YourEntity[]>;
}

const YourDataContext = createContext<YourDataContextType | undefined>(undefined);

export const YourDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showSuccess, showError, showConfirm } = useToastHelpers();
  const { validate, validators } = useValidation();

  // Validation helper
  const validateEntity = (data: Partial<YourEntity>) => {
    return validate(data, {
      name: [validators.required('Name is required')],
      email: [validators.email('Invalid email format')],
    });
  };

  // Create
  const addYourEntity = useCallback(async (data: Partial<YourEntity>) => {
    const errors = validateEntity(data);
    if (errors.length > 0) {
      showError(errors[0].message);
      throw new Error(errors[0].message);
    }

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
  }, [showSuccess, showError, validate, validators]);

  // Update
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

  // Delete with confirmation
  const deleteYourEntity = useCallback(async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this entity?');
    if (!confirmed) return;

    try {
      const db = databaseService.getManager();
      const collection = db.getCollection('your_entities');
      
      await collection?.remove(id);
      showSuccess('Entity deleted successfully');
    } catch (error) {
      showError('Failed to delete entity');
      throw error;
    }
  }, [showSuccess, showError, showConfirm]);

  // Batch create
  const bulkAdd = useCallback(async (items: Partial<YourEntity>[]) => {
    const created: YourEntity[] = [];
    for (const item of items) {
      const entity = await addYourEntity(item);
      created.push(entity);
    }
    showSuccess(`Created ${created.length} entities`);
    return created;
  }, [addYourEntity, showSuccess]);

  return (
    <YourDataContext.Provider value={{
      addYourEntity,
      updateYourEntity,
      deleteYourEntity,
      bulkAdd,
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

---

## Module Hook Pattern (NEW)

### 4. Create Your Module Hook

The module hook combines data from AppDataContext with CRUD from DataProvider:

```typescript
// src/modules/your-module/hooks/useYourModule.ts
import { useAppData } from '@/hooks/useAppData';
import { useYourDataContext } from '../data/YourDataProvider';
import type { YourEntity } from '../data/types';

export interface UseYourModuleReturn {
  // Data (from AppDataContext)
  yourEntities: YourEntity[];
  anotherCollection: any[];
  relatedItems: any[];
  loading: Record<string, boolean>;

  // CRUD Operations (from YourDataProvider)
  addYourEntity: (data: Partial<YourEntity>) => Promise<YourEntity>;
  updateYourEntity: (id: string, data: Partial<YourEntity>) => Promise<void>;
  deleteYourEntity: (id: string) => Promise<void>;
  bulkAdd: (items: Partial<YourEntity>[]) => Promise<YourEntity[]>;
}

export const useYourModule = (): UseYourModuleReturn => {
  // Get read-only data from AppDataContext
  const {
    yourEntities,
    anotherCollection,
    relatedItems,
    loading,
  } = useAppData();

  // Get CRUD operations from YourDataProvider
  const {
    addYourEntity,
    updateYourEntity,
    deleteYourEntity,
    bulkAdd,
  } = useYourDataContext();

  return {
    // Data with null-safety defaults
    yourEntities: yourEntities || [],
    anotherCollection: anotherCollection || [],
    relatedItems: relatedItems || [],
    loading,

    // CRUD Operations
    addYourEntity,
    updateYourEntity,
    deleteYourEntity,
    bulkAdd,
  };
};

export default useYourModule;
```

**Why this pattern?**
- **Separation of concerns**: Data loading vs CRUD operations
- **AppDataContext** handles data coordination (one source of truth)
- **DataProvider** handles business logic (validation, notifications)
- **Module Hook** combines both for easy page consumption

### 5. Define Types (types.ts)

```typescript
// ABOUTME: Type definitions for your module

export interface YourEntity {
  id: string;
  name: string;
  description?: string;
  email?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type YourEntityFormData = Omit<YourEntity, 'id' | 'created_at' | 'updated_at'>;

export interface YourEntityFilters {
  status?: YourEntity['status'];
  search?: string;
}
```

---

## Page Components (UPDATED)

### YourEntitiesPage.tsx

Pages should use the **module hook**, never `useAppData` directly:

```typescript
// ABOUTME: Your entities page component

import React, { useState } from 'react';
import { useYourModule } from '../hooks/useYourModule';  // ✅ Module hook
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { DataGrid } from '@/components/ui/data';
import DialogForm from '@/components/ui/forms/DialogForm';

const YourEntitiesPage: React.FC = () => {
  // ✅ CORRECT: Use module hook (data + CRUD)
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
    await deleteYourEntity(id);  // Shows confirmation dialog automatically
  };

  // ✅ CORRECT: Use optional chaining for loading checks
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
            { key: 'status', header: 'Status' },
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
        {/* Form fields */}
      </DialogForm>
    </div>
  );
};

export default YourEntitiesPage;
```

**Important:**
- ✅ Use module hook (`useYourModule`) - not `useAppData`
- ✅ Use null-safety: `entities || []`, `loading?.all`
- ✅ DataProvider handles validation and toast notifications
- ✅ Delete confirmations handled automatically in DataProvider

## Page Components

### StudentListPage.tsx

```typescript
// ABOUTME: Student list page component

import React, { useMemo } from 'react';
import { useStudentData, StudentFilters } from '../data/useStudentData';
import { StudentCard } from '../components/StudentCard';
import { Spinner } from '../../../components/ui/Spinner';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export const StudentListPage: React.FC = () => {
  const { students, isLoading, error } = useStudentData();
  const [filters, setFilters] = useState<StudentFilters>({});

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (filters.classId && student.classId !== filters.classId) {
        return false;
      }
      if (filters.status && student.status !== filters.status) {
        return false;
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          student.firstName.toLowerCase().includes(search) ||
          student.lastName.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [students, filters]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading students: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Students</h1>
        <Button onClick={() => navigate('/students/new')}>
          Add Student
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <Input
          placeholder="Search students..."
          value={filters.search || ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map(student => (
          <StudentCard
            key={student.id}
            student={student}
            onClick={() => navigate(`/students/${student.id}`)}
          />
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          No students found
        </div>
      )}
    </div>
  );
};

export default StudentListPage;
```

## Component Pattern

### StudentCard.tsx

```typescript
// ABOUTME: Reusable student card component

import React from 'react';
import type { Student } from '../data/types';

export interface StudentCardProps {
  student: Student;
  onClick?: () => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({ student, onClick }) => {
  return (
    <div
      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className="flex items-center gap-4">
        <div className="bg-blue-100 rounded-full p-3">
          <span className="text-2xl">👤</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">
            {student.firstName} {student.lastName}
          </h3>
          <p className="text-gray-600 text-sm">
            {student.email || 'No email'}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Status:</span>
          <span className={`font-medium ${
            student.status === 'active' ? 'text-green-600' : 'text-gray-600'
          }`}>
            {student.status}
          </span>
        </div>
      </div>
    </div>
  );
};
```

## Testing Modules

### StudentListPage.test.tsx

```typescript
// ABOUTME: Tests for student list page

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { StudentListPage } from '../StudentListPage';
import { MockAppDataProvider } from '../../../tests/MockAppDataProvider';

describe('StudentListPage', () => {
  const mockStudents = [
    {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      status: 'active',
    },
    {
      id: 2,
      firstName: 'Jane',
      lastName: 'Smith',
      status: 'active',
    },
  ];

  it('should display loading spinner initially', () => {
    render(
      <MockAppDataProvider isLoading={true}>
        <StudentListPage />
      </MockAppDataProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display students when loaded', async () => {
    render(
      <MockAppDataProvider students={mockStudents}>
        <StudentListPage />
      </MockAppDataProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should display empty state when no students', () => {
    render(
      <MockAppDataProvider students={[]}>
        <StudentListPage />
      </MockAppDataProvider>
    );

    expect(screen.getByText('No students found')).toBeInTheDocument();
  });
});
```

---

## Best Practices (UPDATED)

### 1. Always Use Module Hooks in Pages

```typescript
// ✅ CORRECT - Use module hook
import { useFinance } from '@/modules/finance/hooks/useFinance';
const { banks, addBank } = useFinance();

// ❌ WRONG - Don't use useAppData directly in pages
import { useAppData } from '@/hooks/useAppData';
const { banks, addBank } = useAppData();  // Deprecated!
```

### 2. Use Collection Auto-Discovery

```typescript
// ✅ CORRECT - Define collections in your module
// src/modules/your-module/data/collectionConfig.ts
export const yourModuleCollections: ModuleCollectionsConfig = {
  moduleName: 'your-module',
  aliases: { your_entities: 'yourEntities' },  // Auto-discovered!
};

// ❌ WRONG - Don't manually edit APP_DATA_ARRAY_KEYS in core files
// src/contexts/appData/appDataCollections.ts
const APP_DATA_ARRAY_KEYS = [
  // ...don't add entries here anymore!
];
```

### 3. Implement DataProvider with Full Features

```typescript
// ✅ CORRECT - Complete DataProvider implementation
export const YourDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showSuccess, showError, showConfirm } = useToastHelpers();
  const { validate, validators } = useValidation();

  // 1. Validate before operations
  const validateEntity = (data: Partial<YourEntity>) => {
    return validate(data, {
      name: [validators.required('Name is required')],
    });
  };

  // 2. Add with validation and toast
  const addYourEntity = useCallback(async (data: Partial<YourEntity>) => {
    const errors = validateEntity(data);
    if (errors.length > 0) {
      showError(errors[0].message);
      throw new Error(errors[0].message);
    }
    // ... proceed with database operation
    showSuccess('Entity created successfully');
  }, []);

  // 3. Delete with confirmation
  const deleteYourEntity = useCallback(async (id: string) => {
    const confirmed = await showConfirm('Are you sure?');
    if (!confirmed) return;
    // ... proceed with delete
    showSuccess('Entity deleted successfully');
  }, []);

  // ...
};
```

### 4. Lazy Load Pages

```typescript
// ✅ CORRECT - Lazy load pages for better performance
const YourPage = React.lazy(() => import('./pages/YourPage'));

routes: [
  {
    path: '/your-module',
    component: () => import('./pages/YourPage'),
  },
];

// ❌ WRONG - Eager loading
import { YourPage } from './pages/YourPage';  // Don't do this
```

### 5. Handle Loading and Error States with Null Safety

```typescript
// ✅ CORRECT - Null safety and optional chaining
const { yourEntities = [], loading } = useYourModule();

// Check loading state
if (loading?.all || loading?.yourEntities) {
  return <Spinner />;
}

// Safe array operations
const filtered = yourEntities?.filter(e => e.active) || [];
```

### 6. Use TypeScript Properly

```typescript
// ✅ CORRECT - Proper typing
interface YourEntityCardProps {
  entity: YourEntity;
  onClick?: () => void;
}

// ❌ WRONG - Any type
interface YourEntityCardProps {
  entity: any;  // Don't use any
  onClick: any;
}
```

### 7. Keep Components Small

```typescript
// ✅ CORRECT - Small, focused components
export const EntityCard: React.FC<EntityCardProps> = ({ entity }) => {
  return (
    <div className="card">
      <EntityName name={entity.name} />
      <EntityStatus status={entity.status} />
    </div>
  );
};
```

### 8. Name Conventions

| Element | Naming Pattern | Example |
|---------|----------------|---------|
| DataProvider | `ModuleDataProvider` | `FinanceDataProvider` |
| Module Hook | `useModule` | `useFinance` |
| Collection Config | `moduleCollections` | `financeModuleCollections` |
| Types File | `types.ts` | `src/modules/finance/data/types.ts` |
| Schema File | `schema.ts` | `src/modules/finance/data/schema.ts` |

## Module Communication

### Using Events

```typescript
// In your module
import { eventBus } from '../../core/eventBus';

eventBus.emit('student:created', { studentId: 1 });
eventBus.on('class:updated', handleClassUpdate);
```

### Using Shared Context

```typescript
// For cross-module state
const { students } = useAppData();
const { currentClass } = useClassContext();
```

## Troubleshooting

### Collections Not Appearing in AppDataContext

1. ✅ Check `collectionConfig.ts` is exporting correctly:
   ```typescript
   export const yourModuleCollections: ModuleCollectionsConfig = { ... };
   export default yourModuleCollections;
   ```

2. ✅ Verify import in `moduleCollectionRegistry.ts`:
   ```typescript
   import { yourModuleCollections } from '@/modules/your-module/data/collectionConfig';
   ```

3. ✅ Add to `MODULE_CONFIGS` array:
   ```typescript
   const MODULE_CONFIGS = [
     // ... existing
     yourModuleCollections,  // ← Your module here
   ];
   ```

4. ✅ Check browser console for registry info:
   ```typescript
   import { getModuleRegistryInfo } from '@/contexts/appData/moduleCollectionRegistry';
   console.log(getModuleRegistryInfo());
   ```

### CRUD Operations Not Working

1. ✅ Is `YourDataProvider` wrapping your routes?
   ```tsx
   <YourDataProvider>{children}</YourDataProvider>
   ```

2. ✅ Is `useYourDataContext` being called inside the provider?
   ```typescript
   // ✅ Correct: Called inside component wrapped by provider
   const { addEntity } = useYourDataContext();
   ```

3. ✅ Check database collection name matches `collectionConfig.ts`:
   ```typescript
   // collectionConfig.ts
   aliases: { your_entities: 'yourEntities' }
   
   // DataProvider
   db.getCollection('your_entities')  // Must match!
   ```

4. ✅ Check for TypeScript errors - collection name mismatches will show errors

### Module Hook Returns Undefined Data

1. ✅ Use null-safety defaults:
   ```typescript
   const { yourEntities = [] } = useYourModule();
   ```

2. ✅ Use optional chaining for loading:
   ```typescript
   if (loading?.all) { return <Spinner />; }
   ```

3. ✅ Safe array operations:
   ```typescript
   const filtered = yourEntities?.filter(e => e.active) || [];
   ```

### Type Errors in useYourModule

1. ✅ Ensure types are exported from `data/types.ts`:
   ```typescript
   export interface YourEntity { ... }
   ```

2. ✅ Import types correctly:
   ```typescript
   import type { YourEntity } from '../data/types';
   ```

3. ✅ Ensure `useAppData` returns expected collections (check collectionConfig.ts)

---

## Example Modules (Reference)

| Module | Key Files |
|--------|-----------|
| **Finance** | `FinanceDataProvider.tsx`, `useFinance.ts`, `collectionConfig.ts` |
| **Administration** | `AdministrationDataProvider.tsx`, `useAdministration.ts`, `collectionConfig.ts` |
| **HR** | `HRDataProvider.tsx`, `useHR.ts`, `collectionConfig.ts` |
| **Library** | `LibraryDataProvider.tsx`, `useLibrary.ts`, `collectionConfig.ts` |

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| `docs/guides/MODULE_DEVELOPMENT_GUIDE.md` | **Complete step-by-step tutorial** for new modules |
| `docs/planning/modularity/MODULAR_ARCHITECTURE_REPORT.md` | Architecture overview and design decisions |
| `docs/CRUD_ARCHITECTURE_STATUS.md` | Current CRUD implementation status |
| `src/contexts/appData/moduleCollectionRegistry.ts` | Auto-discovery implementation |
| `src/hooks/useValidation.ts` | Validation system reference |
| `src/hooks/useCrudFactory.ts` | CRUD factory for advanced use |

---

## Summary

**Building a new module requires:**

1. ✅ **collectionConfig.ts** - Define collections (auto-discovered)
2. ✅ **DataProvider** - Implement CRUD with validation & toasts
3. ✅ **useYourModule.ts** - Combine data + CRUD for pages
4. ✅ **Pages** - Use `useYourModule()` hook (not `useAppData`)
5. ✅ **moduleDefinition.tsx** - Register module in system
6. ✅ **Register in core** - Add to `moduleCollectionRegistry.ts`

**Key Principle:** Auto-discovery enables true modularity - define collections in your module, core handles the rest!

---

*Last Updated: April 10, 2026*  
*Architecture: Modular Auto-Discovery System*  
*Total Collections: 94 across 8 modules*
