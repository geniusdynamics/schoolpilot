# SchoolPilot3 Modularity Quick Reference

## Current State Summary

### ✅ What's Working (70%)

```
✓ Module Registry System
✓ Standardized Module Definitions
✓ Data Hook Factory Pattern
✓ Unified Database Manager
✓ Global Provider Registry
✓ RBAC Integration
✓ i18n Modular Loading
✓ Consistent Module Structure
```

### ❌ What's Broken (30%)

```
✗ 22+ Cross-Module Data Imports
✗ All Modules Depend on @/components
✗ Service Layer Tight Coupling
✗ No Independent Module Builds
✗ Cannot Test Modules in Isolation
```

---

## Critical Issues at a Glance

### Issue #1: Cross-Module Data Dependencies 🔴

**Files Affected:** 22+

**Pattern:**
```typescript
// ❌ BAD - Direct cross-module import
import { initialMockUsers } from '../../administration/data/mockData';
```

**Modules Affected:**
- nutrition (4 files)
- inventory (6 files)  
- hr (4 files)
- finance (5 files)
- library (3 files)

**Fix:**
```typescript
// ✅ GOOD - Use AppDataContext
const { users } = useAppData();
```

---

### Issue #2: UI Component Coupling 🔴

**Files Affected:** 100% of modules

**Pattern:**
```typescript
// ❌ BAD - Import from main app
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
```

**Fix Options:**

**Option A: Shared Package**
```typescript
// ✅ GOOD - Import from package
import { Card, Button } from '@schoolpilot/ui-components';
```

**Option B: Module-Local**
```typescript
// ✅ GOOD - Module-specific components
import { Card, Button } from './components/ui';
```

---

### Issue #3: Service Dependencies 🟡

**Modules Affected:** academics, library, admissions, administration, portal

**Pattern:**
```typescript
// ❌ BAD - Direct service import
import { databaseService } from '@/services/database/databaseService';
```

**Fix:**
```typescript
// ✅ GOOD - Use service context
const { database } = useServices();
```

---

## Module Independence Checklist

Use this checklist to assess any module:

```
Module: _________________

Data Layer:
[ ] No imports from other modules (../../)
[ ] Uses AppDataContext for shared data
[ ] Owns all domain-specific types
[ ] Has complete mock data

UI Layer:
[ ] No imports from @/components
[ ] Uses shared component package OR local components
[ ] Has module-specific styling

Service Layer:
[ ] No direct service imports from @/services
[ ] Uses service interfaces/contracts
[ ] Services injected via context

Build/Test:
[ ] Has package.json
[ ] Can build independently
[ ] Can test without main app
[ ] Has own test fixtures

Documentation:
[ ] README.md with module overview
[ ] API documentation
[ ] Data contracts documented
[ ] Dependencies listed
```

---

## Quick Fix Guide

### Fix Cross-Module Data Import

**Before:**
```typescript
// src/modules/finance/data/useTransportRouteData.ts
import { initialMockUsers } from '../../administration/data/mockData';

const useTransportRouteData = () => {
  const [users] = useState(initialMockUsers);
  // ...
};
```

**After:**
```typescript
// src/modules/finance/data/useTransportRouteData.ts
import { useAppData } from '@/hooks/useAppData';

const useTransportRouteData = () => {
  const { users } = useAppData();
  // ...
};
```

---

### Fix UI Component Import

**Before:**
```typescript
// src/modules/finance/pages/FinancePage.tsx
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
```

**After (Option A - Shared Package):**
```typescript
// src/modules/finance/pages/FinancePage.tsx
import { Card, Button } from '@schoolpilot/ui-components';
```

**After (Option B - Module Local):**
```typescript
// src/modules/finance/pages/FinancePage.tsx
import { Card, Button } from '../components/ui';
```

---

### Fix Service Import

**Before:**
```typescript
// src/modules/academics/services/ExamScheduleManager.ts
import { databaseService } from '@/services/database/databaseService';

export class ExamScheduleManager {
  async createSchedule() {
    await databaseService.create('exams', data);
  }
}
```

**After:**
```typescript
// src/modules/academics/services/ExamScheduleManager.ts
import { useServices } from '@/contexts/ServicesContext';

export class ExamScheduleManager {
  constructor(private database: IDatabaseService) {}
  
  async createSchedule() {
    await this.database.create('exams', data);
  }
}

// In component:
const { database } = useServices();
const manager = new ExamScheduleManager(database);
```

---

## Module Structure Template

```
modules/{module-name}/
├── package.json              # Module metadata and dependencies
├── README.md                 # Module documentation
├── index.ts                  # Public API exports
├── moduleDefinition.tsx      # Module registration
├── rbac.ts                   # Permissions
│
├── data/                     # Data layer (MUST BE SELF-CONTAINED)
│   ├── types.ts              # Domain types
│   ├── schema.ts             # Database schemas
│   ├── collections.ts        # Collection definitions
│   ├── mockData.ts           # Demo data
│   ├── index.ts              # Data exports
│   └── use{Entity}Data.ts    # Data hooks
│
├── components/               # UI components (PREFER LOCAL)
│   ├── ui/                   # Re-exported shared components
│   │   └── index.ts          # export { Card } from '@schoolpilot/ui';
│   └── {Feature}Component.tsx # Module-specific components
│
├── pages/                    # Page components
│   └── {Feature}Page.tsx
│
├── services/                 # Business logic (USE INTERFACES)
│   └── {Feature}Service.ts
│
├── hooks/                    # Custom hooks
│   └── use{Feature}.ts
│
├── i18n/                     # Translations
│   ├── en.json
│   └── fr.json
│
└── __tests__/                # Tests (MUST RUN INDEPENDENTLY)
    ├── setup.ts              # Test fixtures
    └── {Feature}.test.tsx
```

---

## Data Access Patterns

### ✅ Correct Patterns

```typescript
// 1. Access shared data via AppDataContext
const { users, staff, students } = useAppData();

// 2. Access module-specific data via module hook
const { invoices, payments } = useFinanceData();

// 3. Cross-module data via explicit contracts
const sharedData = useSharedData(['users', 'staff']);

// 4. Service access via context
const { database, grading } = useServices();
```

### ❌ Incorrect Patterns

```typescript
// 1. Direct cross-module import
import { users } from '../../administration/data/mockData';

// 2. Direct service import
import { databaseService } from '@/services/database';

// 3. Direct component import from main app
import Card from '@/components/ui/Card';

// 4. Accessing other module's internal state
import { useAdministrationData } from '../../administration';
```

---

## Testing Module Independence

### Test Script

```bash
# Test if module can build independently
cd src/modules/finance
npm run build

# Test if module tests run independently
npm test

# Check for cross-module imports
grep -r "from.*\.\./\.\." data/
grep -r "from.*@/components" pages/
grep -r "from.*@/services" services/
```

### Expected Results

```
✓ Build completes without errors
✓ Tests run without main app context
✓ No cross-module imports found
✓ All dependencies declared in package.json
```

---

## Migration Priority

### Phase 1: Data Independence (CRITICAL)
**Timeline:** 2-3 weeks  
**Files to Fix:** 22+  
**Impact:** High

1. Create SharedDataService
2. Refactor cross-module imports
3. Update tests

### Phase 2: UI Components (HIGH)
**Timeline:** 1-2 weeks  
**Files to Fix:** All modules  
**Impact:** High

1. Create shared component package
2. Update module imports
3. Document component usage

### Phase 3: Service Abstraction (HIGH)
**Timeline:** 1-2 weeks  
**Files to Fix:** 5+ modules  
**Impact:** Medium

1. Define service interfaces
2. Create ServicesContext
3. Refactor service usage

### Phase 4: Build Isolation (MEDIUM)
**Timeline:** 3-4 weeks  
**Files to Fix:** All modules  
**Impact:** Medium

1. Add module package.json
2. Create build scripts
3. Set up independent testing

---

## Common Questions

**Q: Can I import types from other modules?**  
A: Yes, but only via explicit contracts. Use `@/core/types` for shared types or define clear interfaces.

**Q: How do I access data from another module?**  
A: Use `useAppData()` hook which provides access to all registered data via AppDataContext.

**Q: Can modules share UI components?**  
A: Yes, via a shared component package (`@schoolpilot/ui-components`) or by re-exporting in each module.

**Q: How do I test a module in isolation?**  
A: Mock AppDataContext and ServicesContext in your test setup. See `__tests__/setup.ts` template.

**Q: Can I add dependencies to a module?**  
A: Yes, but prefer peer dependencies for shared packages. Document all dependencies in module's package.json.

---

## Resources

- **Full Analysis:** `.trae/documents/modularity_assessment_and_improvement_plan.md`
- **Module Registry:** `src/core/moduleRegistry.ts`
- **Data Hook Factory:** `src/hooks/useDataHookFactory.ts`
- **Global Providers:** `src/globalProvidersRegistry.ts`
- **App Data Context:** `src/contexts/AppDataContext.tsx`

---

## Getting Help

1. Check this quick reference first
2. Review full analysis document
3. Look at existing well-structured modules (e.g., `administration`)
4. Ask team for code review before major refactoring
