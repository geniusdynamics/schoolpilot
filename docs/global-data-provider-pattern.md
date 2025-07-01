# Modular Global Data Provider Pattern

## Overview
This pattern enables each feature module to define its own data provider (CRUD logic, hooks, etc.), while allowing certain providers to be marked as "global" so they can be used across the entire system. The core system does not need to know the specifics of each module, making the architecture highly modular and plugin-ready.

---

## Global vs Private Providers
- **Global Provider:**
  - Used by multiple modules (e.g., AcademicYear, SchoolPeriod, Class, User).
  - Marked with `export const isGlobalProvider = true;` in the provider file.
  - Auto-registered or discovered by the system core or a registry.
- **Private Provider:**
  - Used only within its own module.
  - Not marked as global; not auto-registered.

---

## How to Create a Global Provider
1. **Create a provider hook** in the module's `data/` directory (e.g., `useAcademicYearData.ts`).
2. **Export the flag:**
   ```ts
   export const isGlobalProvider = true;
   ```
3. **Implement CRUD logic** (mock, RxDB, or hybrid).
4. **Export the hook:**
   ```ts
   export function useAcademicYearData() { /* ... */ }
   ```

---

## Registry/Auto-Discovery
- The system can use a registry file or dynamic import to collect all global providers.
- No hardcoded imports in the core; new global providers are picked up automatically.

---

## Consuming a Global Provider
- Import the hook from its module location:
  ```ts
  import { useAcademicYearData } from 'src/modules/academics/data/useAcademicYearData';
  ```
- Or, if using a registry:
  ```ts
  import { globalProviders } from 'src/core/globalProviderRegistry';
  const { useAcademicYearData } = globalProviders;
  ```

---

## Contributor Guidelines
- Use global providers for entities shared across modules.
- Use private providers for module-specific data.
- Always test all affected modules/pages after refactoring or adding a provider.
- Commit each logical change separately for clear history. 