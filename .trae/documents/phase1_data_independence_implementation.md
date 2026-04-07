# Phase 1: Data Independence Implementation Guide

**Priority:** 🔴 CRITICAL  
**Timeline:** 2-3 weeks  
**Effort:** High  
**Impact:** High

---

## Overview

This guide provides step-by-step instructions for eliminating cross-module data dependencies in SchoolPilot3. Currently, 22+ files across 5 modules directly import data from other modules, breaking module independence.

---

## Goals

1. ✅ Zero `../../` imports between modules
2. ✅ All cross-module data access via AppDataContext
3. ✅ Modules can be tested with mocked shared data
4. ✅ Clear data contracts between modules

---

## Step 1: Create SharedDataService

### 1.1 Create Service Interface

```typescript
// src/services/data/ISharedDataService.ts

/**
 * Interface for accessing shared data across modules.
 * Provides read-only access to common entities.
 */
export interface ISharedDataService {
  // User management
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | undefined>;
  
  // Staff management
  getStaff(): Promise<Staff[]>;
  getStaffById(id: number): Promise<Staff | undefined>;
  
  // Student management
  getStudents(): Promise<Student[]>;
  getStudentById(id: number): Promise<Student | undefined>;
  
  // Academic structure
  getAcademicYears(): Promise<AcademicYear[]>;
  getClassStreams(): Promise<ClassStream[]>;
  
  // Common lookups
  getDepartments(): Promise<Department[]>;
  getDesignations(): Promise<Designation[]>;
}
```

### 1.2 Implement Service

```typescript
// src/services/data/SharedDataService.ts

import { useAppDataInternal } from '@/hooks/useAppData';
import type { ISharedDataService } from './ISharedDataService';
import type { User, Staff, Student, AcademicYear, ClassStream, Department, Designation } from '@/types';

/**
 * Implementation of SharedDataService that provides read-only access
 * to common entities via AppDataContext.
 */
export class SharedDataService implements ISharedDataService {
  private static instance: SharedDataService;
  
  private constructor() {}
  
  static getInstance(): SharedDataService {
    if (!SharedDataService.instance) {
      SharedDataService.instance = new SharedDataService();
    }
    return SharedDataService.instance;
  }
  
  // User management
  async getUsers(): Promise<User[]> {
    const context = useAppDataInternal();
    return context.users || [];
  }
  
  async getUserById(id: number): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.id === id);
  }
  
  // Staff management
  async getStaff(): Promise<Staff[]> {
    const context = useAppDataInternal();
    return context.staff || [];
  }
  
  async getStaffById(id: number): Promise<Staff | undefined> {
    const staff = await this.getStaff();
    return staff.find(s => s.id === id);
  }
  
  // Student management
  async getStudents(): Promise<Student[]> {
    const context = useAppDataInternal();
    return context.students || [];
  }
  
  async getStudentById(id: number): Promise<Student | undefined> {
    const students = await this.getStudents();
    return students.find(s => s.id === id);
  }
  
  // Academic structure
  async getAcademicYears(): Promise<AcademicYear[]> {
    const context = useAppDataInternal();
    return context.academicYears || [];
  }
  
  async getClassStreams(): Promise<ClassStream[]> {
    const context = useAppDataInternal();
    return context.classStreams || [];
  }
  
  // Common lookups
  async getDepartments(): Promise<Department[]> {
    const context = useAppDataInternal();
    return context.departments || [];
  }
  
  async getDesignations(): Promise<Designation[]> {
    const context = useAppDataInternal();
    return context.designations || [];
  }
}

// Export singleton instance
export const sharedDataService = SharedDataService.getInstance();
```

### 1.3 Create React Hook

```typescript
// src/hooks/useSharedData.ts

import { useMemo } from 'react';
import { useAppDataInternal } from './useAppData';
import type { User, Staff, Student, AcademicYear, ClassStream } from '@/types';

/**
 * Hook for accessing shared data across modules.
 * Provides reactive access to common entities.
 */
export function useSharedData() {
  const context = useAppDataInternal();
  
  return useMemo(() => ({
    // User management
    users: context.users || [],
    getUserById: (id: number) => context.users?.find(u => u.id === id),
    
    // Staff management
    staff: context.staff || [],
    getStaffById: (id: number) => context.staff?.find(s => s.id === id),
    
    // Student management
    students: context.students || [],
    getStudentById: (id: number) => context.students?.find(s => s.id === id),
    
    // Academic structure
    academicYears: context.academicYears || [],
    classStreams: context.classStreams || [],
    
    // Common lookups
    departments: context.departments || [],
    designations: context.designations || [],
  }), [context]);
}

/**
 * Hook for accessing specific shared entities.
 * Only subscribes to requested entities for better performance.
 */
export function useSharedEntities<T extends keyof ReturnType<typeof useSharedData>>(
  entities: T[]
): Pick<ReturnType<typeof useSharedData>, T> {
  const allData = useSharedData();
  
  return useMemo(() => {
    const result = {} as Pick<ReturnType<typeof useSharedData>, T>;
    entities.forEach(entity => {
      result[entity] = allData[entity];
    });
    return result;
  }, [allData, entities]);
}
```

---

## Step 2: Refactor Affected Files

### 2.1 Nutrition Module (4 files)

#### File: `src/modules/nutrition/data/useWalletTransactionData.ts`

**Before:**
```typescript
import { useState, useEffect } from 'react';
import { initialMockUsers } from '../../administration/data/mockData';

const useWalletTransactionData = () => {
  const [users] = useState(initialMockUsers);
  
  const transactions = mockTransactions.map(t => ({
    ...t,
    user: users.find(u => u.id === t.userId)
  }));
  
  return { transactions };
};
```

**After:**
```typescript
import { useState, useEffect } from 'react';
import { useSharedData } from '@/hooks/useSharedData';

const useWalletTransactionData = () => {
  const { users } = useSharedData();
  
  const transactions = mockTransactions.map(t => ({
    ...t,
    user: users.find(u => u.id === t.userId)
  }));
  
  return { transactions };
};
```

#### Files to Update:
- ✅ `useWalletTransactionData.ts`
- ✅ `useStudentWalletData.ts`
- ✅ `useStudentMealPlanData.ts`
- ✅ `useMerchantData.ts`

---

### 2.2 Inventory Module (6 files)

#### File: `src/modules/inventory/data/useWarehouseData.ts`

**Before:**
```typescript
import { useState, useEffect } from 'react';
import { initialMockUsers } from '../../administration/data/mockData';

const useWarehouseData = () => {
  const [users] = useState(initialMockUsers);
  
  const warehouses = mockWarehouses.map(w => ({
    ...w,
    manager: users.find(u => u.id === w.managerId)
  }));
  
  return { warehouses };
};
```

**After:**
```typescript
import { useState, useEffect } from 'react';
import { useSharedData } from '@/hooks/useSharedData';

const useWarehouseData = () => {
  const { users } = useSharedData();
  
  const warehouses = mockWarehouses.map(w => ({
    ...w,
    manager: users.find(u => u.id === w.managerId)
  }));
  
  return { warehouses };
};
```

#### Files to Update:
- ✅ `useWarehouseData.ts`
- ✅ `useStockLevelData.ts`
- ✅ `useRequisitionItemData.ts`
- ✅ `usePurchaseOrderItemData.ts`
- ✅ `usePurchaseOrderData.ts`
- ✅ `useAssetDepreciationLogData.ts`

---

### 2.3 HR Module (4 files)

#### File: `src/modules/hr/data/useStaffSalarySettingData.ts`

**Before:**
```typescript
import { useState, useEffect } from 'react';
import { initialMockUsers } from '../../administration/data/mockData';

const useStaffSalarySettingData = () => {
  const [users] = useState(initialMockUsers);
  
  const salarySettings = mockSettings.map(s => ({
    ...s,
    staff: users.find(u => u.id === s.staffId)
  }));
  
  return { salarySettings };
};
```

**After:**
```typescript
import { useState, useEffect } from 'react';
import { useSharedData } from '@/hooks/useSharedData';

const useStaffSalarySettingData = () => {
  const { staff } = useSharedData();
  
  const salarySettings = mockSettings.map(s => ({
    ...s,
    staff: staff.find(u => u.id === s.staffId)
  }));
  
  return { salarySettings };
};
```

#### Files to Update:
- ✅ `useStaffSalarySettingData.ts`
- ✅ `useStaffRecurringItemData.ts`
- ✅ `usePayslipItemData.ts`
- ✅ `usePayslipData.ts`

---

### 2.4 Finance Module (5 files)

#### File: `src/modules/finance/data/useTransportRouteData.ts`

**Before:**
```typescript
import { useState, useEffect } from 'react';
import { initialMockUsers } from '../../administration/data/mockData';

const useTransportRouteData = () => {
  const [users] = useState(initialMockUsers);
  
  const routes = mockRoutes.map(r => ({
    ...r,
    driver: users.find(u => u.id === r.driverId)
  }));
  
  return { routes };
};
```

**After:**
```typescript
import { useState, useEffect } from 'react';
import { useSharedData } from '@/hooks/useSharedData';

const useTransportRouteData = () => {
  const { staff } = useSharedData();
  
  const routes = mockRoutes.map(r => ({
    ...r,
    driver: staff.find(s => s.id === r.driverId)
  }));
  
  return { routes };
};
```

#### Files to Update:
- ✅ `useTransportRouteData.ts`
- ✅ `useStudentTransportAssignmentData.ts`
- ✅ `useStudentInvoiceItemData.ts`
- ✅ `useInvoicePaymentApplicationData.ts`
- ✅ `useExpenseClaimData.ts`

---

### 2.5 Library Module (3 files)

#### File: `src/modules/library/data/useLoanData.ts`

**Before:**
```typescript
import { useState, useEffect } from 'react';
import { getDatabase } from '@/services/database/databaseService';

const useLoanData = () => {
  const [loans, setLoans] = useState([]);
  
  useEffect(() => {
    const db = getDatabase();
    // Load loans
  }, []);
  
  return { loans };
};
```

**After:**
```typescript
import { useState, useEffect } from 'react';
import { useSharedData } from '@/hooks/useSharedData';
import { useAppData } from '@/hooks/useAppData';

const useLoanData = () => {
  const { students } = useSharedData();
  const { loans } = useAppData();
  
  const enrichedLoans = loans.map(loan => ({
    ...loan,
    student: students.find(s => s.id === loan.studentId)
  }));
  
  return { loans: enrichedLoans };
};
```

#### Files to Update:
- ✅ `useLoanData.ts`
- ✅ `useFineData.ts`
- ✅ `useBookData.ts`

---

## Step 3: Update Tests

### 3.1 Create Test Utilities

```typescript
// src/__tests__/utils/mockSharedData.ts

import type { User, Staff, Student } from '@/types';

export const mockUsers: User[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'teacher' },
];

export const mockStaff: Staff[] = [
  { id: 1, name: 'John Doe', department: 'IT', designation: 'Manager' },
  { id: 2, name: 'Jane Smith', department: 'HR', designation: 'Coordinator' },
];

export const mockStudents: Student[] = [
  { id: 1, name: 'Alice Johnson', grade: '10A', admissionNumber: 'STU001' },
  { id: 2, name: 'Bob Williams', grade: '10B', admissionNumber: 'STU002' },
];

/**
 * Mock implementation of useSharedData hook for testing
 */
export const mockUseSharedData = () => ({
  users: mockUsers,
  getUserById: (id: number) => mockUsers.find(u => u.id === id),
  staff: mockStaff,
  getStaffById: (id: number) => mockStaff.find(s => s.id === id),
  students: mockStudents,
  getStudentById: (id: number) => mockStudents.find(s => s.id === id),
  academicYears: [],
  classStreams: [],
  departments: [],
  designations: [],
});
```

### 3.2 Update Module Tests

```typescript
// src/modules/nutrition/__tests__/useWalletTransactionData.test.ts

import { renderHook } from '@testing-library/react';
import { useWalletTransactionData } from '../data/useWalletTransactionData';
import { mockUseSharedData } from '@/__tests__/utils/mockSharedData';

// Mock the useSharedData hook
jest.mock('@/hooks/useSharedData', () => ({
  useSharedData: mockUseSharedData
}));

describe('useWalletTransactionData', () => {
  it('should load transactions with user data', () => {
    const { result } = renderHook(() => useWalletTransactionData());
    
    expect(result.current.transactions).toBeDefined();
    expect(result.current.transactions[0].user).toBeDefined();
  });
  
  it('should handle missing user gracefully', () => {
    const { result } = renderHook(() => useWalletTransactionData());
    
    const transactionWithInvalidUser = result.current.transactions.find(
      t => t.userId === 999
    );
    
    expect(transactionWithInvalidUser?.user).toBeUndefined();
  });
});
```

---

## Step 4: Validation and Testing

### 4.1 Automated Validation Script

```bash
#!/bin/bash
# scripts/validate-module-independence.sh

echo "🔍 Validating module independence..."

# Check for cross-module imports
echo "Checking for cross-module data imports..."
CROSS_MODULE_IMPORTS=$(grep -r "from.*\.\./\.\./.*data" src/modules/ | grep -v "__tests__" | wc -l)

if [ $CROSS_MODULE_IMPORTS -gt 0 ]; then
  echo "❌ Found $CROSS_MODULE_IMPORTS cross-module data imports:"
  grep -r "from.*\.\./\.\./.*data" src/modules/ | grep -v "__tests__"
  exit 1
else
  echo "✅ No cross-module data imports found"
fi

# Check for direct service imports
echo "Checking for direct service imports..."
DIRECT_SERVICE_IMPORTS=$(grep -r "from.*@/services" src/modules/ | grep -v "__tests__" | wc -l)

if [ $DIRECT_SERVICE_IMPORTS -gt 0 ]; then
  echo "⚠️  Found $DIRECT_SERVICE_IMPORTS direct service imports (will be fixed in Phase 3)"
fi

# Run module tests
echo "Running module tests..."
npm test -- --testPathPattern="modules"

echo "✅ Module independence validation complete!"
```

### 4.2 Manual Testing Checklist

```
Module: _________________

Data Independence:
[ ] No imports from ../../{other-module}/data
[ ] Uses useSharedData() for cross-module data
[ ] All tests pass with mocked shared data
[ ] Module can be tested in isolation

Functionality:
[ ] All features work as before
[ ] Data loads correctly
[ ] CRUD operations work
[ ] No console errors

Performance:
[ ] No noticeable performance degradation
[ ] Data loads in < 2 seconds
[ ] UI remains responsive
```

---

## Step 5: Documentation

### 5.1 Update Module README

```markdown
# {Module Name} Module

## Data Dependencies

This module accesses the following shared data:

- **Users** - Via `useSharedData().users`
- **Staff** - Via `useSharedData().staff`
- **Students** - Via `useSharedData().students`

## Data Contracts

### Users
- **Source:** Administration module
- **Access:** Read-only via useSharedData()
- **Type:** `User[]`
- **Fields:** id, name, email, role

### Staff
- **Source:** Administration module
- **Access:** Read-only via useSharedData()
- **Type:** `Staff[]`
- **Fields:** id, name, department, designation

## Testing

To test this module in isolation:

```typescript
import { mockUseSharedData } from '@/__tests__/utils/mockSharedData';

jest.mock('@/hooks/useSharedData', () => ({
  useSharedData: mockUseSharedData
}));
```
```

### 5.2 Update Architecture Documentation

Add to `docs/architecture.md`:

```markdown
## Data Access Patterns

### Shared Data Access

Modules access shared data (users, staff, students, etc.) via the `useSharedData()` hook:

```typescript
import { useSharedData } from '@/hooks/useSharedData';

const MyComponent = () => {
  const { users, staff, students } = useSharedData();
  // Use shared data
};
```

### Module-Specific Data

Modules access their own data via module-specific hooks:

```typescript
import { useFinanceData } from '@/modules/finance';

const FinanceComponent = () => {
  const { invoices, payments } = useFinanceData();
  // Use module data
};
```

### Data Contracts

All shared data access is governed by explicit contracts defined in:
- `src/services/data/ISharedDataService.ts` - Service interface
- `src/hooks/useSharedData.ts` - React hook interface
```

---

## Rollout Plan

### Week 1: Foundation
- ✅ Day 1-2: Create SharedDataService and useSharedData hook
- ✅ Day 3-4: Create test utilities and documentation
- ✅ Day 5: Review and approval

### Week 2: Implementation
- ✅ Day 1: Refactor Nutrition module (4 files)
- ✅ Day 2: Refactor Inventory module (6 files)
- ✅ Day 3: Refactor HR module (4 files)
- ✅ Day 4: Refactor Finance module (5 files)
- ✅ Day 5: Refactor Library module (3 files)

### Week 3: Testing and Validation
- ✅ Day 1-2: Update all module tests
- ✅ Day 3: Run validation scripts
- ✅ Day 4: Manual testing and bug fixes
- ✅ Day 5: Documentation and code review

---

## Success Criteria

- ✅ Zero cross-module data imports (`../../`)
- ✅ All 22+ files refactored
- ✅ All tests passing
- ✅ No functionality regressions
- ✅ Documentation updated
- ✅ Validation script passes

---

## Rollback Plan

If issues arise:

1. **Immediate Rollback**
   ```bash
   git revert <commit-hash>
   npm test
   ```

2. **Partial Rollback**
   - Revert specific module changes
   - Keep SharedDataService infrastructure
   - Fix issues and re-apply

3. **Communication**
   - Notify team of rollback
   - Document issues encountered
   - Plan remediation

---

## Next Steps

After Phase 1 completion:

1. **Phase 2: UI Component Independence**
   - Create shared component package
   - Refactor component imports
   - Timeline: 1-2 weeks

2. **Phase 3: Service Abstraction**
   - Define service interfaces
   - Create ServicesContext
   - Timeline: 1-2 weeks

3. **Phase 4: Build Isolation**
   - Add module package.json
   - Independent builds
   - Timeline: 3-4 weeks

---

## Resources

- **Full Analysis:** `.trae/documents/modularity_assessment_and_improvement_plan.md`
- **Quick Reference:** `.trae/documents/modularity_quick_reference.md`
- **Validation Script:** `scripts/validate-module-independence.sh`
- **Test Utilities:** `src/__tests__/utils/mockSharedData.ts`
