# Git Hooks for Translation Safety

## Why these hooks exist

A rebase/merge in May 2026 accidentally deleted all 4 `src/i18n/locales/*/navigation.json` files
(commit `cc7c636`). The deletion was only noticed after the merge, when the application
displayed `t('navigation:...')` raw keys in production.

These hooks prevent that class of bug from recurring.

## Hooks installed

| Hook | Trigger | Action |
|------|---------|--------|
| `pre-commit` | `git commit` | Runs `npm run check-translations` on staged i18n files. Blocks commit on failure. |
| `pre-rebase` | `git rebase` | Prints a reminder to run `npm run check-translations` after the rebase. Does not block. |
| `pre-merge-commit` | `git merge` | Same as pre-commit. Blocks merge commits with missing translations. |

## Install

The hooks are tracked in `.githooks/`. Install them with:

```bash
# Linux / macOS / WSL
./scripts/install-git-hooks.sh

# Windows PowerShell
.\scripts\install-git-hooks.ps1
```

Re-run after cloning the repo or after a fresh `git init`.

## Bypass (NOT recommended)

To skip the check for a single commit:

```bash
git commit --no-verify
```

Bypassing the hook skips translation validation. Only do this if you are intentionally
temporarily removing a translation and will restore it in a follow-up commit.

## Maintenance

The hooks call `scripts/translation-completeness-check.cjs`. If that file is renamed
or moved, update both `.githooks/pre-commit` and `.githooks/pre-merge-commit`.

## Related

- `docs/i18n/RECOVERY_PROCEDURE.md` — how to recover lost translations
- `docs/i18n/TRANSLATION_GUIDELINES.md` — how to add translations safely
