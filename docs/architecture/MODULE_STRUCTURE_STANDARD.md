# Module Structure Standard

## Standard Module Structure

All modules should follow this base structure:

```
src/modules/{module-name}/
├── components/          # Reusable UI components specific to this module
├── data/               # Data layer (types, hooks, contexts, schemas, collections)
├── hooks/              # Custom React hooks (optional - use data/ for data hooks)
├── i18n/               # Internationalization files
├── pages/              # Page components
├── services/           # Business logic services
├── strategies/         # Strategy pattern implementations (optional)
├── index.ts            # Public API exports
├── lifecycle.ts        # Module lifecycle hooks
├── moduleDefinition.tsx # Module metadata definition
├── module.json         # Module configuration
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
- Registration: `registerServices.ts`

## Module Index Exports

Each `index.ts` should export:
- Module definition (if applicable)
- Public API for other modules to use
- Types that are meant to be shared

```typescript
// Example index.ts
export { default as moduleDefinition } from './moduleDefinition';
export type { ModuleSpecificType } from './data/types';
export { somePublicFunction } from './services/someService';
```

## Cross-Module Dependencies

Modules should avoid direct imports from other modules. Instead:
- Use `useSharedData()` hook for shared entities
- Use `useService()` hook for cross-module service access
- Use barrel exports from `src/contexts/data/` and `src/hooks/data/` for backward compatibility

## Migration Path

When standardizing existing modules:
1. Document current structure deviations
2. Gradually refactor to match standard
3. Update imports to use barrel exports
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
