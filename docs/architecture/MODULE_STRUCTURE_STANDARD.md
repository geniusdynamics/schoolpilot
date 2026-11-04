# Module Structure Standard

> **Status (2026-11-04):** this standard follows [DR-06](../prd/workflow-log/decisions/DR-06.md) (layout B). Phase
> [P7](../prd/phases/P7-module-boundaries.md) is bringing the code to it, so today's tree still differs: no
> `public.ts` yet, `index.ts` barrels, and domain code under `src/domain`. See
> [`docs/audit/2026-11-modularity`](../audit/2026-11-modularity/README.md). P7-Z01 rewrites this page to the finished
> structure.

## Standard Module Structure

All modules should follow this base structure:

```
src/modules/{module-name}/
├── components/          # Reusable UI components specific to this module
├── data/               # Data layer (types, hooks, contexts, schemas, collections)
├── domain/             # The module's bounded context: framework-free services, entity schemas, migrations (DR-06; arrives in P7 lane F)
├── hooks/              # Custom React hooks (optional - use data/ for data hooks)
├── i18n/               # Internationalization files
├── pages/              # Page components
├── services/           # Business logic services
├── strategies/         # Strategy pattern implementations (optional)
├── public.ts           # The only surface other modules may import (DR-06; replaces index.ts)
├── lifecycle.ts        # Module lifecycle hooks (register contributions, enable, disable)
├── moduleDefinition.tsx # React-bound parts only: icons, navigation components, lazy pages, contributions
├── module.json         # The module's one manifest: id, dependencies, provides, schemas, permissions
└── rbac.ts             # Role-based access control rules
```

## Subdirectory Guidelines

### When to Use Subdirectories

Subdirectories within `data/` and `pages/` are acceptable when:
- A module has distinct feature areas with 3+ related files
- The feature area represents a logical business domain
- The subdirectory improves discoverability and organization

### Examples

**Acceptable subdirectories:**
- `administration/data/houses/` - House management is a distinct feature
- `administration/data/pickup/` - Pickup system is a distinct feature
- `academics/data/assignments/` - Assignments have multiple related files
- `academics/data/lessonplans/` - Lesson plans have multiple related files

**Avoid subdirectories when:**
- Feature has only 1-2 files (keep flat)
- Files are loosely related
- Subdirectory adds unnecessary nesting

## File Naming Conventions

### Data Layer
- Types: `types.ts`
- Context: `{ModuleName}DataContext.tsx`
- Hook: `use{ModuleName}Data.ts`
- Safe Context Hook: `useSafe{ModuleName}Context.ts`
- Schema: `schema.ts`
- Collections: `collections.ts`
- Mock Data: `mockData.ts`

### Pages
- Page: `{Feature}Page.tsx`
- Tests: `{Feature}Page.test.tsx`

### Services
- Service: `{Feature}Service.ts`
- `registerServices.ts` and the runtime `ServiceRegistry` are being removed (DR-06); other modules call a service
  through `public.ts`.

## Public surface (`public.ts`)

`public.ts` exports exactly what other modules may use, and `module.json`'s `provides` lists the same names (checked
by `ModuleExports`, P7-B03). It holds:
- types meant to be shared;
- functions and hooks other modules call;
- nothing that exists only for this module's own pages.

```typescript
// Example public.ts
export type { ModuleSpecificType } from './data/types';
export { somePublicFunction } from './domain/someService';
```

## Cross-Module Dependencies

Rules from [DR-06](../prd/workflow-log/decisions/DR-06.md). From P7-A02, CI ratchets them, so new violations fail;
existing ones are fixed during P7.
- **Through `public.ts` only.** Import another module only through its `modules/<x>/public.ts`, with typed imports;
  there is no runtime service lookup. Declare the dependency in `module.json`, and mark it optional only if the code
  really works without the other module.
- **Shared code names no module.** `components`, `contexts`, `core`, `data`, `hooks`, `services` and `utils` never
  import a module.
  - A module contributes its providers, collections, pages, report entries, setup steps, settings tabs, entity schemas
    and migrations through its manifest.
  - The composition root (`src/core/moduleRegistration.ts`) is the only shared file that names modules, apart from the
    router.
- **The kernel is free to use.** Modules may import the kernel in `src/domain` (ids, money, calendar, sequences, shared
  entities and engines) and the persistence ports in `src/data`.
- **Tests.** For now a test may import another module's test doubles, and no other internals; this ends with P7-E03.

## Migration Path

When standardizing existing modules:
1. Document current structure deviations
2. Gradually refactor to match standard
3. Route cross-module imports through the target module's `public.ts`
4. Test thoroughly before merging

## Current Module Structure Status

| Module | Structure | Notes |
|--------|-----------|-------|
| core | Standard | Flat structure |
| administration | Subdirectories | Has `data/houses`, `data/pickup`, `pages/houses`, `pages/pickup` |
| academics | Subdirectories | Has `data/assignments`, `data/lessonplans`, `pages/assignments`, `pages/lessonplans` |
| admissions | Standard | Flat structure |
| finance | Standard | Flat structure |
| hr | Standard | Flat structure |
| inventory | Standard | Flat structure |
| library | Standard | Flat structure |
| nutrition | Standard | Flat structure |
| portal | Standard | Flat structure |
| reports | Standard | Flat structure |
| settings | Standard | Flat structure |
