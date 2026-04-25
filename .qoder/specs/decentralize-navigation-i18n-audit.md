# Decentralize Navigation i18n — Architecture Audit & Implementation Plan

## Context

The SchoolPilot3 application currently maintains centralized navigation translation files at `src/i18n/locales/{lang}/navigation.json`. These files contain navigation labels for ALL modules (academics, administration, finance, etc.), creating a tight coupling where the core i18n system must know about every module. This violates modular architecture principles — modules should be self-contained and independent.

The `modularLoader.ts` already supports decentralized navigation: it dynamically loads `src/modules/*/i18n/*.json` and merges any `navigation` key into a unified `navigation` namespace at runtime. However, module i18n files have incomplete `navigation` sections, so the centralized files are still the primary source of truth.

The screenshot from the user shows raw translation keys like `navigation:admi...` appearing in the sidebar UI because some keys exist only in the centralized file and are not being properly resolved.

## Goal

Achieve true module independence by:
1. Moving ALL navigation translations into their respective module `i18n/` directories
2. Deleting the centralized `src/i18n/locales/*/navigation.json` files
3. Ensuring every `navigation:` key referenced in `moduleDefinition.tsx` files has a corresponding translation
4. Preserving all existing languages (including administration's extra languages: de, es, it, nl, pt)
5. Keeping the `navigation:` prefix pattern in module definitions (still resolves via unified namespace)
6. Ensuring sidebars, breadcrumbs, tabs, and overflow menus continue to work

## Architectural Decision

- **Remove centralized navigation.json entirely** — each module owns its translations
- **Host module owns orphan keys** — assignments/lessonplans go in academics; analytics goes in reports; houses goes in administration
- **Preserve all existing languages** — complete navigation sections for en, fr, sw, rw in all modules; also de/es/it/nl/pt for administration
- **No code changes to UI components** — `modularLoader.ts` already merges module `navigation` sections; `SecondarySidebar.tsx`, `PrimarySidebar.tsx`, etc. already resolve `navigation:` prefixed keys correctly

## Implementation Steps

### Step 1: Update `src/modules/academics/i18n/*.json` (en, fr, sw, rw)

**Add missing keys to `navigation.academics`:**
- `eventsManager`, `examTokens`, `marksEntryByToken`, `verifyMarksCrossCheck`, `verifyMarksByStructure`, `examGazette`, `distributeResults`, `boardExamResults`, `studentExamAnalysis`, `examAnalysis`

**Add orphan sections:**
```json
"assignments": {
  "title": "Assignments",
  "create": "Create Assignment",
  "grade": "Grade Assignments"
},
"lessonplans": {
  "title": "Lesson Plans",
  "create": "Create Plan",
  "notes": "Lesson Notes",
  "approval": "Approval"
}
```

### Step 2: Update `src/modules/administration/i18n/*.json` (en, de, es, fr, it, nl, pt, rw, sw)

**Add missing keys to `navigation.administration`:**
- `studentMasterlist`, `studentPromotion`, `auditLogViewer`, `disciplinaryCases`, `studentClearance`, `certificates`, `transferCertificate`, `characterCertificate`, `birthCertificate`, `gatePass`, `studentBioData`, `visitors`, `staffAttendance`, `staffIDCards`, `staffWallet`, `bulkStaffUpdate`, `attendanceReports`, `manualAttendance`, `dynamicAttendance`, `bulkStudentUpdate`, `studentIDCards`, `bulkAssignRollNumbers`, `scholarshipTracking`, `smsReports`, `autoSMSSettings`, `commTemplates`, `messageCampaigns`, `newsletters`, `academicStructures`, `academicYears`, `academicPeriodDefinitions`, `schoolPeriods`

**Add orphan section:**
```json
"houses": {
  "title": "Houses",
  "categories": "House Categories",
  "award": "Award Points",
  "leaderboard": "Leaderboard",
  "studentPoints": "Student Points",
  "classStandings": "Class Standings"
}
```

### Step 3: Update `src/modules/finance/i18n/*.json` (en, fr, rw, sw)

**Add missing keys to `navigation.finance`:**
- `studentPayments`, `studentOpeningBalances`, `feeCollectionSummary`, `studentFinancialSummary`, `voteheadStatement`, `accountLedger`, `invoiceGeneration`, `paymentAllocation`, `generalReceipts`, `customerInvoices`, `supplierInvoices`, `expenses`, `banks`, `suppliers`, `transportRoutes`, `studentTransportAssignments`, `feesFines`, `feesInstallments`, `feesReceiptTemplate`, `dayBook`, `cashBook`, `studentsPaidBook`, `feesDueReport`, `previousSessionFees`, `journalRegister`, `trialBalance`, `incomeStatement`, `balanceSheet`

### Step 4: Update `src/modules/hr/i18n/*.json` (en, fr, rw, sw)

**Add to `navigation.hr`:**
- `staffBioData`: "Staff Bio Data"

### Step 5: Update `src/modules/inventory/i18n/*.json` (en, fr, rw, sw)

**Add to `navigation.inventory`:**
- `stationery`: "Stationery"

### Step 6: Update `src/modules/nutrition/i18n/*.json` (en, fr, rw, sw)

**Add to `navigation.nutrition`:**
- `kitchenManagement`: "Kitchen Management"

### Step 7: Update `src/modules/reports/i18n/*.json` (en, fr, rw, sw)

**Add to `navigation.reports`:**
- `classLists`: "Class Lists"

**Add orphan section:**
```json
"analytics": {
  "title": "Analytics",
  "description": "Data analytics and insights",
  "teacherDashboard": "Teacher Dashboard",
  "subjectAnalytics": "Subject Analytics",
  "classAnalytics": "Class Analytics",
  "exportReports": "Export Reports"
}
```

### Step 8: Update `src/modules/settings/i18n/*.json` (en, fr, rw, sw)

**Add to `navigation.settings`:**
- `plugins`: "Plugin Management"
- `dependencyReport`: "Dependency Report"

### Step 9: Restructure `src/modules/portal/i18n/en.json`

Current `navigation` is flat (keys at `navigation.title`, `navigation.dashboard`). Must nest under `navigation.portal` to match key pattern `navigation:portal.dashboard`.

**Restructure to:**
```json
"navigation": {
  "portal": {
    "title": "Portal",
    "description": "Student and parent portal",
    "dashboard": "Portal Dashboard",
    "attendance": "Attendance",
    "results": "Results",
    "fees": "Fees",
    "announcements": "Announcements",
    "profile": "Profile"
  }
}
```

**Create missing language files:** `fr.json`, `sw.json`, `rw.json` with same structure, using centralized `src/i18n/locales/{lang}/navigation.json` as source for translations.

### Step 10: Update `src/modules/admissions/i18n/en.json`

**Add to `navigation.admissions`:**
- `newApplication`: "New Application"
- `apply`: "Apply Now"
- `track`: "Track Application"

**Create missing language files:** `fr.json`, `sw.json`, `rw.json` with same structure, using centralized navigation.json as source.

### Step 11: Create `src/modules/todos/i18n/*.json` (en, fr, sw, rw)

Module has no i18n directory at all. Create:
```json
{
  "navigation": {
    "todos": {
      "title": "Todos",
      "description": "Task management and reminders"
    }
  }
}
```

For non-English, use centralized `navigation.json` as source.

### Step 12: Verify `src/modules/core/i18n/{lang}/navigation.json`

These are already module-local. Ensure they contain `dashboard.title` and `dashboard.description`. No changes needed unless keys are missing.

### Step 13: Verify `src/modules/library/i18n/*.json` and `src/modules/dashboard/i18n/*.json`

Library appears complete. Dashboard — verify `navigation.dashboard` section exists with `title` and `description`.

### Step 14: Delete Centralized Files

After verifying all keys are migrated:
- `src/i18n/locales/en/navigation.json`
- `src/i18n/locales/fr/navigation.json`
- `src/i18n/locales/sw/navigation.json`
- `src/i18n/locales/rw/navigation.json`

### Step 15: Verify `modularLoader.ts`

No code changes required. Confirm behavior:
- Static translations glob `./locales/**/*.json` will no longer match `navigation.json` files
- Module i18n globs `../modules/*/i18n/*.json` will continue loading all module files
- `Object.assign(resources[lang].navigation, moduleData.navigation)` will merge all module navigation sections into unified namespace
- The `navigation:` prefix in module definitions resolves against this unified namespace

## Critical Files to Modify

| File | Action |
|------|--------|
| `src/modules/academics/i18n/en.json` | Add missing navigation keys + assignments/lessonplans orphan sections |
| `src/modules/academics/i18n/fr.json` | Same as above |
| `src/modules/academics/i18n/sw.json` | Same as above |
| `src/modules/academics/i18n/rw.json` | Same as above |
| `src/modules/administration/i18n/en.json` | Add missing keys + houses orphan section |
| `src/modules/administration/i18n/de.json` | Same (using centralized de source) |
| `src/modules/administration/i18n/es.json` | Same |
| `src/modules/administration/i18n/fr.json` | Same |
| `src/modules/administration/i18n/it.json` | Same |
| `src/modules/administration/i18n/nl.json` | Same |
| `src/modules/administration/i18n/pt.json` | Same |
| `src/modules/administration/i18n/rw.json` | Same |
| `src/modules/administration/i18n/sw.json` | Same |
| `src/modules/finance/i18n/en.json` | Add missing keys |
| `src/modules/finance/i18n/fr.json` | Same |
| `src/modules/finance/i18n/rw.json` | Same |
| `src/modules/finance/i18n/sw.json` | Same |
| `src/modules/hr/i18n/en.json` | Add staffBioData |
| `src/modules/hr/i18n/fr.json` | Same |
| `src/modules/hr/i18n/rw.json` | Same |
| `src/modules/hr/i18n/sw.json` | Same |
| `src/modules/inventory/i18n/en.json` | Add stationery |
| `src/modules/inventory/i18n/fr.json` | Same |
| `src/modules/inventory/i18n/rw.json` | Same |
| `src/modules/inventory/i18n/sw.json` | Same |
| `src/modules/nutrition/i18n/en.json` | Add kitchenManagement |
| `src/modules/nutrition/i18n/fr.json` | Same |
| `src/modules/nutrition/i18n/rw.json` | Same |
| `src/modules/nutrition/i18n/sw.json` | Same |
| `src/modules/reports/i18n/en.json` | Add classLists + analytics orphan section |
| `src/modules/reports/i18n/fr.json` | Same |
| `src/modules/reports/i18n/rw.json` | Same |
| `src/modules/reports/i18n/sw.json` | Same |
| `src/modules/settings/i18n/en.json` | Add plugins, dependencyReport |
| `src/modules/settings/i18n/fr.json` | Same |
| `src/modules/settings/i18n/rw.json` | Same |
| `src/modules/settings/i18n/sw.json` | Same |
| `src/modules/portal/i18n/en.json` | Restructure navigation to nest under `portal` |
| `src/modules/portal/i18n/fr.json` | Create new |
| `src/modules/portal/i18n/sw.json` | Create new |
| `src/modules/portal/i18n/rw.json` | Create new |
| `src/modules/admissions/i18n/en.json` | Add newApplication, apply, track |
| `src/modules/admissions/i18n/fr.json` | Create new |
| `src/modules/admissions/i18n/sw.json` | Create new |
| `src/modules/admissions/i18n/rw.json` | Create new |
| `src/modules/todos/i18n/en.json` | Create new |
| `src/modules/todos/i18n/fr.json` | Create new |
| `src/modules/todos/i18n/sw.json` | Create new |
| `src/modules/todos/i18n/rw.json` | Create new |
| `src/i18n/locales/en/navigation.json` | **Delete** |
| `src/i18n/locales/fr/navigation.json` | **Delete** |
| `src/i18n/locales/sw/navigation.json` | **Delete** |
| `src/i18n/locales/rw/navigation.json` | **Delete** |

## Verification Strategy

1. **Automated key coverage check:** After migration, parse all `moduleDefinition.tsx` files and extract every `navigation:` prefixed string. Parse all module `i18n/en.json` files and extract all keys under `navigation.*`. Cross-reference to ensure 100% coverage.

2. **Build verification:** Run the development build and check for i18n initialization errors in console.

3. **UI manual check:**
   - Load app in English — verify no raw `navigation:...` keys appear in sidebar
   - Switch to French, Swahili, Kinyarwanda — verify translations load
   - Click through each module's navigation items — verify breadcrumbs and tab titles
   - Test minimized sidebar tooltips
   - Test TopOverflowMenu workspace switcher

4. **Language switching:** Change `i18nextLng` in localStorage and verify all modules reload translations without raw keys.

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Missing translations break UI | Migrate all keys before deleting centralized files. Use centralized files as source of truth for all translations during migration. |
| Portal flat navigation structure | Must restructure from `navigation.title` to `navigation.portal.title` before deleting centralized file. |
| Non-English languages incomplete | Use centralized `fr/sw/rw/navigation.json` as source for all non-English module navigation translations. |
| Orphan keys (assignments, lessonplans, houses, analytics) not found | Explicitly add to host module's i18n files per this plan. |
| Todos module has no i18n directory | Create it with all 4 language files. |

## Outcome

After implementation:
- Each module's `i18n/` directory contains complete navigation translations for all supported languages
- No module depends on the core system for its navigation labels
- The core `src/i18n/locales/` directory no longer contains `navigation.json`
- New modules can be added without touching core i18n files
- The `navigation:` prefix pattern continues to work via `modularLoader.ts` merging
- Raw translation keys no longer appear in the UI
