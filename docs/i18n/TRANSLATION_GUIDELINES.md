# Translation Guidelines

## File layout

```
src/i18n/locales/
  en/    <- source of truth
  fr/    <- French
  rw/    <- Kinyarwanda
  sw/    <- Swahili
```

All locales must have the same 13 files with the same top-level keys:

```
academics.json, administration.json, common.json, dashboard.json,
finance.json, hr.json, inventory.json, library.json, navigation.json,
nutrition.json, portal.json, reports.json, todos.json
```

## Rules

### 1. Source language is English (`en/`)

`scripts/translation-completeness-check.cjs` diffs every locale against `en/`.
Adding a key to `en/` requires adding it to **all four** locales (en/fr/rw/sw) in the same commit.

### 2. Use the same key path

If `en/common.json` has `workspaces`, then `fr/common.json`, `rw/common.json`, and
`sw/common.json` must also have `workspaces` at the same nested level.

### 3. Keep file parity

Do not delete a key from one locale without removing it from `en/` and all others.
Orphan keys in `en/` will fail the pre-commit hook.

### 4. New locale files

If you add a new module or page, you must add its JSON file to all 4 locales in the
same commit. The pre-commit hook will block the commit if the file is missing from any locale.

### 5. Module-scoped translations

`modularLoader.ts` reads translations from:
- `src/i18n/locales/**/*.json` (global namespaces)
- `src/modules/*/i18n/*.json` (module-scoped namespaces)

If you put a translation in `src/modules/finance/i18n/finance.json`, the namespace is
`finance` and components inside that module can call `t('finance:someKey')` directly.

## Validation commands

```bash
# Check all locales against en/ for missing files and keys
npm run check-translations

# Check the codebase for t() calls whose key is missing from en/
npm run analyze-translation-issues

# Auto-fix common typos in t() calls (use with care)
npm run fix-translation-keys
```

## CI

`scripts/translation-completeness-check.cjs` is also wired into the git hooks so
problems are caught at commit time, not at release time.

## Common mistakes to avoid

- Adding a key to `en/` but forgetting fr/rw/sw
- Renaming a key in `en/` but only partially in the other locales
- Hardcoding English strings in JSX instead of using `t()`
- Adding a new module without adding its translation file to all 4 locales
