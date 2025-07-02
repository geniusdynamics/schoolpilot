# Recap 2: i18n Sweep Preparation and Plan (2024-07-02)

## ABOUTME: Recap of the completed i18n sweep preparation and next steps for full UI internationalization.
## ABOUTME: Documents the plan and status before starting the Academics module batch.

---

### What Was Done
- **Full codebase scan** for hardcoded UI labels (modals, buttons, table headers, etc.) across all modules:
  - Academics, Administration, Finance, HR, Inventory, Library, Nutrition, Reports, Settings, and root pages.
- **Identified all files** with hardcoded UI text that need conversion to i18n.
- **Confirmed i18n folder structure** and per-module JSON translation files in `src/i18n/locales/en/` and `src/i18n/locales/fr/`.
- **Established the process** for updating each file:
  1. Replace hardcoded UI strings with `t('...')` using the correct namespace.
  2. Add missing translation keys to the appropriate JSON files.
  3. Test language switching for reactivity.

---

### Next Steps
- Begin the **module-by-module i18n sweep**, starting with the **Academics module**.
- After each module, validate UI and translation coverage.
- Recap after each major batch or as requested by Mr GENIUS.

---

**Directory:** `docs/workflows/recap2_i18n_sweep_20240702.md`
**Status:** Ready to begin Academics module i18n conversion. 