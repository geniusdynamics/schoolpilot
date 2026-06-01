# Translation Recovery Procedure

## Background

On 2026-05-XX a rebase/merge deleted all 4 `src/i18n/locales/*/navigation.json`
files (commit `cc7c636 refactor(i18n): decentralize navigation translations to
module directories`). The deletion was caught after the merge when users reported
raw `t('navigation:...')` keys in the UI.

This document explains how to recover if it ever happens again.

## Recovery steps

### 1. Identify what was lost

```bash
# Show the commit that deleted the file
git log --all --diff-filter=D --pretty="%H %s" -- 'src/i18n/locales/*/navigation.json'

# Show the file's last version before deletion
git show <LAST_COMMIT_BEFORE_DELETION>:src/i18n/locales/en/navigation.json > /tmp/navigation.en.json
```

### 2. Restore the files

Option A — from git history (preferred):

```bash
git checkout <LAST_COMMIT_BEFORE_DELETION> -- src/i18n/locales/*/navigation.json
```

Option B — from a saved backup:

```bash
# If you saved recovered content to .opencode/recovered-translations/
cp .opencode/recovered-translations/navigation.en.json src/i18n/locales/en/navigation.json
cp .opencode/recovered-translations/navigation.fr.json src/i18n/locales/fr/navigation.json
cp .opencode/recovered-translations/navigation.rw.json src/i18n/locales/rw/navigation.json
cp .opencode/recovered-translations/navigation.sw.json src/i18n/locales/sw/navigation.json
```

### 3. Validate

```bash
# Check JSON syntax for all locale files
node -e "['en','fr','rw','sw'].forEach(l => { const fs=require('fs'); const p='src/i18n/locales/'+l+'/navigation.json'; try { JSON.parse(fs.readFileSync(p,'utf8')); console.log(l+': OK'); } catch(e) { console.log(l+': INVALID - '+e.message); } })"

# Run the full translation completeness check
npm run check-translations
```

### 4. Verify key parity

```bash
node -e "
const fs=require('fs');
const ref=Object.keys(JSON.parse(fs.readFileSync('src/i18n/locales/en/navigation.json','utf8'))).sort();
for (const l of ['fr','rw','sw']) {
  const cur=Object.keys(JSON.parse(fs.readFileSync('src/i18n/locales/'+l+'/navigation.json','utf8'))).sort();
  const missing=ref.filter(k=>!cur.includes(k));
  const extra=cur.filter(k=>!ref.includes(k));
  console.log(l+': missing='+missing.length+', extra='+extra.length);
  if (missing.length) console.log('  missing: '+missing.join(', '));
  if (extra.length) console.log('  extra: '+extra.join(', '));
}
"
```

### 5. Commit

```bash
git add src/i18n/locales/
git commit -m "fix(i18n): restore navigation.json locale files after deletion"
```

## Prevention

See `docs/git-hooks.md`. The pre-commit hook runs
`scripts/translation-completeness-check.cjs` on every commit, which catches
most translation drift before it lands.

## When to update this document

Update this procedure whenever:
- A new translation namespace is added
- A new locale is added
- A new validation script is created
- The recovery path through git history changes (e.g. switch to different VCS)
