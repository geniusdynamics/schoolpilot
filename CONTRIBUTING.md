# Contributing to SchoolPilot3

Thanks for contributing! This guide covers the workflow and the conventions
that keep the codebase consistent. For architecture background see
[ARCHITECTURE.md](./ARCHITECTURE.md); for UI conventions see
[docs/contributing](docs/contributing).

## Getting started

```bash
pnpm install        # pnpm is the package manager — do not use npm/yarn
pnpm dev            # start the dev server
pnpm test:run       # run the test suite once
pnpm typecheck      # TypeScript project check (tsconfig.typecheck.json)
pnpm build          # production build (vite + PWA)
```

### Demo credentials

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | Super Administrator |
| `teacher` | `teacher123` | Teacher |
| `finance` | `finance123` | Finance Officer |

## The gate

Every change must pass the **gate** before it lands:

1. `pnpm typecheck` — error count must not increase. The ratchet is enforced:
   ```bash
   pnpm check:ratchet   # fails if the error count grew vs .type-ratchet
   ```
   If you genuinely fixed errors, lower the ratchet with
   `node scripts/check-type-ratchet.cjs --update`.
2. Targeted tests for the code you touched (`pnpm vitest run <paths>`).
3. `pnpm build` for structural changes (new files, imports, dependencies).
4. Commit with a conventional, specific message.

Small, logical commits beat large mixed ones.

## Code conventions

- **Tables**: use `DataGrid` (`@/components/ui/data`). See
  [docs/contributing/grids.md](docs/contributing/grids.md).
- **Forms**: use `EntityForm` for create/edit dialogs and `useValidation` for
  schema checks. See [docs/contributing/forms.md](docs/contributing/forms.md).
- **List pages**: follow the canonical CRUD pattern
  ([docs/contributing/crud.md](docs/contributing/crud.md)) with `useEntityCrud`.
- **Feedback**: `useToast()` for operation results; never `alert()`.
  Confirmations go through `useConfirm()`; never `window.confirm`.
- **Formatting**: `formatKES` / `formatDate` from `@/utils/format`.
- **Icons**: heroicons (`@heroicons/react/24/outline`) or `@/components/ui/icons`.
  Do not reintroduce lucide-react.
- No `window.confirm`, no `alert`, no new `as any` on touched lines.

## Data layer rules

- AppDataContext and the database services are **additive only**: new fields and
  functions may be added, existing contracts must not change.
- Route definitions, module registry, and provider selection are frozen unless
  a change is explicitly part of an agreed plan.
- New CRUD pages own their data via `useEntityCrud`; context reads are fine for
  reference data (departments, academic years, …).

## Tests

- Place tests next to the code or under `src/tests/`.
- Component tests must not depend on the global app providers — hooks like
  `useConfirm` fall back gracefully outside the app tree.
- Business-flow specs live in `src/tests/integration/`.

## Translations

The pre-commit hook runs a translation completeness check across all locales
(`en`, `fr`, `rw`, `sw`). If you add keys to an English namespace file, add the
same keys everywhere or the commit will be rejected.
