# SchoolPilot3 Production Readiness — Improved Specification
## v2.0 | Respecting Multi-Deployment, Dual-Navigation, and Modular Independence

**Date:** 2025-07-01  
**Analyst:** AI Orchestrator  
**Reference Systems:** elimikasasa.co.ke (UX benchmark) vs. schoolpilot3 (current codebase)  
**Scope:** Preserve intentional architecture, fix implementation failures, deliver production-ready core workflows

---

## 1. Executive Summary

### What I Got Wrong in the First Spec

My initial assessment incorrectly labeled the multi-provider data layer, dual navigation modes, and module independence as **"chaos"** and **"over-engineering."** After deeper audit, these are **intentional, correct architectural decisions** that serve real deployment scenarios:

| Architectural Decision | Deployment Target | Why It's Correct |
|---|---|---|
| **SQLite File** (`sqlite-file`) | Electron desktop app | Local file-based DB, no server needed, works offline |
| **SQLite WASM + OPFS** (`sqlite-wasm`) | Browser standalone | Persistent browser storage, works offline, no backend |
| **PouchDB + CouchDB** (`pouchdb`) | LAN/multi-school sync | CouchDB replication for distributed school networks |
| **Backend API + SQLite cache** (`backend-api`) | Hybrid/SaaS | Syncs with your existing SaaS backend or ERPNext |
| **Livestore** (`livestore`) | Cloud-first PWA | Real-time sync via Cloudflare, lowest latency |
| **Fullwidth mode** | Power users | Module-focused workspace, secondary sidebar becomes primary |
| **Standard mode + tabbed workspace** | Casual users | Traditional sidebar navigation, browser-like tabs |
| **Module independence** | Plugin marketplace | Each module is self-contained; can be sold/enabled separately |

### The Real Problems (Not Architecture Problems)

1. **1,672 TypeScript errors** — Implementation bugs in `library` and `inventory` pages, not design flaws
2. **Fragmented core workflows** — Student admission, class setup, staff management exist as pages but don't flow as a cohesive onboarding experience
3. **Tabbed workspace instability** — Re-render loops, `TabNavigation.test.tsx` and `RenderLoopPrevention.test.tsx` prove the implementation has bugs, not that the concept is wrong
4. **AppDataContext bloat** — 1,789 lines trying to be everything; needs cleaner abstraction
5. **Deprecated route explosion** — 30+ redirects from hub-and-spoke consolidation that was abandoned mid-migration
6. **Missing production UX patterns** — No onboarding wizard, no global search, no dismissible "get started" banners, no CSV/Excel import on every list page

### The Goal (Revised)

**Preserve all intentional architecture. Fix implementation. Add production UX.**

The app must be able to:
- Compile to an **Electron desktop app** (SQLite file, no backend)
- Run as a **browser PWA** (SQLite WASM + OPFS, offline-first)
- Sync across a **school LAN** (PouchDB + local CouchDB)
- Connect to **your existing SaaS backend** (Backend API + local cache)
- Integrate with **ERPNext** (Frappe Education module sync)
- Enable/disable **modules independently** (administration without finance, academics without library, etc.)
- Switch between **fullwidth module focus mode** and **standard sidebar navigation** per user preference

---

## 2. Architecture Preservation & Refinement

### 2.1 Multi-Deployment Data Layer (KEEP — Refine Implementation)

**Current State:** `UnifiedDatabaseManager` with `DatabaseProviderFactory` selects providers based on deployment config. The concept is correct; the implementation is fragile (fallback chain includes removed RxDB, `AppDataContext` is too large).

**Refinements:**

```
┌─────────────────────────────────────────────────────────────────┐
│  DEPLOYMENT CONFIGURATION (JSON templates)                       │
├─────────────────────────────────────────────────────────────────┤
│  standalone-electron.json    → sqlite-file                      │
│  standalone-browser.json     → sqlite-wasm + OPFS               │
│  lan-sync.json               → pouchdb + CouchDB                  │
│  hybrid.json                 → backend-api + sqlite-wasm cache  │
│  erpnext-integration.json    → erpnext sync + sqlite-wasm cache │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  UNIFIED DATABASE MANAGER (singleton)                            │
│  • Reads deployment config                                       │
│  • Selects provider via DatabaseProviderFactory                  │
│  • Falls back gracefully if primary provider unavailable          │
│  • Exposes: initialize(), getCollection(), sync(), backup()      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PROVIDER IMPLEMENTATIONS (shared ICollection interface)         │
├─────────────────────────────────────────────────────────────────┤
│  SQLiteFileProvider        │ File-based SQLite (better-sqlite3) │
│  SQLiteWASMProvider        │ WASM SQLite with OPFS/IndexedDB    │
│  PouchDBProvider           │ PouchDB with optional CouchDB sync │
│  BackendAPIProvider        │ REST API with offline queue        │
│  LivestoreProvider         │ Reactive WASM SQLite (Cloudflare)  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  MODULE DATA PROVIDERS (per module, auto-discovered)              │
│  • AdministrationDataProvider                                   │
│  • AcademicsDataProvider                                         │
│  • FinanceDataProvider                                           │
│  • Each registers collections via collectionConfig.ts            │
└─────────────────────────────────────────────────────────────────┘
```

**Actions:**
1. **Remove RxDB references from fallback chain** — Already partially done, complete the cleanup in `UnifiedDatabaseManager` and `DatabaseProviderFactory`.
2. **Split AppDataContext** — Move sync logic, pagination, validation, and backup/restore into separate, focused hooks. Keep only the data aggregation layer in `AppDataContext`.
   - `useSync()` — Sync status, forceSync, pause/resume
   - `usePagination()` — Collection pagination
   - `useDataValidation()` — Data integrity checks
   - `useBackupRestore()` — Export/import
   - `AppDataContext` — Aggregates module data providers, exposes unified data object
3. **Add deployment config selector to onboarding** — First-run wizard should ask: "How will you use SchoolPilot?" → Desktop app / Browser only / School network / With our cloud backend / With ERPNext. This sets the correct template and provider.
4. **Test each deployment target** — Create a test matrix:
   - Electron build → `npm run build:electron` → verify SQLite file persistence
   - Browser build → `npm run build` → verify OPFS persistence
   - PouchDB sync → start local CouchDB → verify two-browser sync
   - Backend API → configure API URL → verify offline queue + sync

### 2.2 Dual Navigation Mode (KEEP — Stabilize Implementation)

**Current State:** `FullWidthContext` toggles between two modes. `LayoutNew` (URL-driven tab system) is the new implementation. `Layout` (old sidebar + tabbed workspace) is the fallback. `tabbedModeConfig.ts` controls per-module rollout. The concept is correct; the implementation has re-render bugs and the two layouts are duplicative.

**Refinements:**

```
┌─────────────────────────────────────────────────────────────────┐
│  NAVIGATION MODE (user preference, persisted in localStorage)      │
├─────────────────────────────────────────────────────────────────┤
│  STANDARD MODE (default)                                         │
│  ┌────────────┐  ┌──────────────────────────────────────────┐  │
│  │ Sidebar    │  │ Main Content                             │  │
│  │ (all       │  │ • Tab bar for open pages (browser tabs)  │  │
│  │ modules)   │  │ • Current page content                   │  │
│  │            │  │ • Secondary sidebar (contextual actions)  │  │
│  └────────────┘  └──────────────────────────────────────────┘  │
│                                                                  │
│  FULLWIDTH MODE (power users)                                    │
│  ┌────────────┐  ┌──────────────────────────────────────────┐  │
│  │ Secondary  │  │ Main Content                             │  │
│  │ Sidebar    │  │ • Module-specific pages as tabs        │  │
│  │ (current   │  │ • Full-width tables and forms            │  │
│  │ module     │  │                                          │  │
│  │ only)      │  │                                          │  │
│  └────────────┘  └──────────────────────────────────────────┘  │
│  • Primary sidebar is hidden                                    │
│  • Module switcher in header (dropdown or mega-menu)            │
└─────────────────────────────────────────────────────────────────┘
```

**Actions:**
1. **Merge Layout and LayoutNew into one component** — Create a single `AppLayout` that conditionally renders standard vs. fullwidth based on `FullWidthContext`. Delete `LayoutNew.tsx` entirely.
2. **Stabilize tab system** — The current `useTabs()` hook + `TabBar` component has re-render issues. Replace with a simpler, URL-driven tab store that does NOT re-render the entire layout on every tab change.
   - Tabs should only store `{id, title, url, module, pinned}` — no component references in the store.
   - Tab content is rendered via `<Outlet>` or dynamic route component, not stored in the tab object.
   - Use `React.memo` on `TabBar` and `TabContent` to prevent unnecessary re-renders.
3. **Hub-and-spoke navigation** — Keep the concept, but simplify. Each module has 4-6 **hub pages** (visible in BOTH modes). Deprecated standalone pages redirect to hub+tab. BUT:
   - Remove ALL deprecated routes that have no remaining bookmarks/users. Keep redirects only for 30 days after migration.
   - Make hub pages bookmarkable: `/academics/subjects?tab=papers` should be a real route, not a query-param hack.
   - Use React Router nested routes: `/academics/subjects` → `SubjectsHubPage` with `<Outlet>` for the active tab.
4. **Per-module tabbed mode config** — Keep `tabbedModeConfig.ts` but make it a runtime setting in Settings, not a hardcoded config. School admins can toggle tabbed mode per module based on their preference.

### 2.3 Module Independence (KEEP — Improve Cross-Module Sharing)

**Current State:** Each module has its own `data/`, `pages/`, `services/`, `hooks/`, `schema/`, `collections/`, `types/`, `i18n/`. This is correct and must be preserved. The problem is that cross-module data sharing (e.g., academics needing `students` from administration) is ad-hoc and sometimes breaks.

**Refinements:**

```
┌─────────────────────────────────────────────────────────────────┐
│  MODULE STRUCTURE (preserved for ALL modules)                    │
├─────────────────────────────────────────────────────────────────┤
│  modules/{module}/                                               │
│  ├── moduleDefinition.tsx    → Navigation, routes, settings    │
│  ├── module.json             → Metadata, version, dependencies │
│  ├── lifecycle.ts            → onRegister, onEnable, onDisable │
│  ├── rbac.ts                 → Permissions, roles              │
│  ├── index.ts                → Public exports (barrel)           │
│  ├── data/                                                   │
│  │   ├── types.ts            → Module-specific types           │
│  │   ├── schema.ts            → Database schemas                │
│  │   ├── collections.ts       → Collection configs              │
│  │   ├── mockData.ts         → Demo data generators            │
│  │   ├── {module}DataProvider.tsx → React context provider     │
│  │   ├── use{module}Data.ts  → Primary data hook             │
│  │   ├── use{Entity}Data.ts  → Entity-specific hooks          │
│  │   └── collectionConfig.ts → Auto-discovery registration     │
│  ├── pages/                  → Page components                 │
│  ├── components/             → Module-specific components      │
│  ├── services/               → Business logic services         │
│  ├── hooks/                  → React hooks                    │
│  └── i18n/                   → Translation files                │
└─────────────────────────────────────────────────────────────────┘
```

**Cross-Module Data Sharing (Shared Data Contract):**

Some modules need read-only access to entities from other modules (e.g., academics needs `students`, `staff`, `class_streams` from administration). The current approach has direct imports and `useSharedDataHook` flag. Improve this:

1. **Shared Entities Registry** — Define a `sharedEntities` contract in `core/types/sharedData.ts`:
   ```typescript
   export interface SharedEntityRegistry {
     students: Student[];
     staff: Staff[];
     class_streams: ClassStream[];
     classes: SchoolClass[];
     subjects: Subject[];
     academic_years: AcademicYear[];
   }
   ```
2. **Read-Only Shared Data Hook** — Create `useSharedData<K extends keyof SharedEntityRegistry>(entity: K)` that returns the shared entity from the unified data layer. This hook is read-only and cannot modify data from other modules.
3. **Module Dependency Declaration** — In `moduleDefinition.tsx`, declare `imports: ['students', 'staff']` to document which shared entities the module needs. This is for documentation and validation, not runtime enforcement.
4. **No Cross-Module Imports** — Modules should NEVER import from `../otherModule/`. All shared data goes through `useSharedData()` or the unified `AppDataContext`.
5. **Module Enable/Disable** — When a module is disabled, its data provider is unmounted, but its collections remain in the database (for data integrity). The navigation items are hidden, and routes return a "Module Disabled" page.

---

## 3. Competitor Analysis: What to Borrow from Elimikasasa

### 3.1 UX Patterns to Replicate (Not Architecture)

| Pattern | Elimikasasa Implementation | SchoolPilot3 Adaptation |
|---|---|---|
| **Global Search** | Header search bar: "Search name, admission no, NEMIS..." | Add to `Header.tsx` — search across students, staff, classes. Use debounced search with `DataGrid` filter API. |
| **Onboarding Banner** | Classes page: "Let's get your school up and running" + quick action buttons | Add dismissible `OnboardingBanner` to Dashboard, Students, Staff, Classes. Shows when entity count is zero. |
| **Table Filters** | Dropdown filters above table (Class, Gender, Category) | Standardize in `DataGrid` — add `filterableColumns` prop with dropdown/auto-complete filters. |
| **Prominent Actions** | "Admit Pupil", "Import", "CSV", "PDF" buttons above table | Add `pageActions` prop to `StandardListPage` — renders buttons in the top-right of the page header. |
| **CSV/Excel Import** | Import button with column mapping UI | Create `ImportWizard` component — upload CSV → preview → map columns → validate → import. Reusable across all modules. |
| **PDF Export** | PDF button exports filtered table view | Use `html2canvas` + `jspdf` for simple tables, or server-side rendering for complex reports. |
| **Contextual Help** | "Ask Chris" AI chat widget at bottom-right | Integrate with Gemini API (already configured with `GEMINI_API_KEY`). Create floating chat widget for help. |
| **Pagination** | "Previous / Next" with page numbers | Ensure `DataGrid` has consistent pagination: page size selector, page numbers, first/last buttons. |

### 3.2 Navigation Structure to Adopt (Simplify, Don't Ditch Dual Mode)

**Standard Mode Sidebar (8 items, collapsible groups):**

```
📊 Dashboard
   ├─ Overview
   ├─ Academic Analytics
   ├─ Financial Analytics
   └─ Attendance Analytics

🎓 Academics
   ├─ Subjects Hub
   ├─ Classes & Streams
   ├─ Timetable
   ├─ Exams & Grading
   ├─ Assignments
   └─ Lesson Plans

👨‍🎓 Students
   ├─ Student List
   ├─ Admissions
   ├─ Attendance
   ├─ ID Cards
   ├─ Alumni
   └─ Promotions

👩‍🏫 Staff
   ├─ Staff Directory
   ├─ Departments
   ├─ Designations
   ├─ Payroll
   └─ Attendance

💰 Finance
   ├─ Fee Collection
   ├─ Invoices
   ├─ Payments
   ├─ Expenses
   └─ Reports

📦 Inventory & Assets
   ├─ Stock Levels
   ├─ Procurement
   ├─ Fixed Assets
   └─ Suppliers

📖 Library
   ├─ Catalog
   ├─ Circulation
   └─ Fines

⚙️ Settings
   ├─ School Profile
   ├─ Users & Roles
   ├─ Academic Years
   ├─ Database Backup
   └─ Audit Log
```

**Fullwidth Mode:**
- Primary sidebar hidden.
- Secondary sidebar shows ONLY the current module's children (e.g., all "Students" sub-pages).
- Module switcher in the header (dropdown or mega-menu with icons).
- Tab bar shows open pages within the current module.
- This is the "Elimikasasa-style" experience for power users who want to focus on one module at a time.

---

## 4. Core Production Workflows (The "Must Work" List)

Each workflow must be **fully functional end-to-end** for the deployment target: create → list → edit → view detail → delete/soft-delete → reports → export.

### 4.1 Workflow: School Onboarding (NEW — First-Run Experience)

**Trigger:** First admin login with zero data.
**Goal:** Get a school from blank to "first day of classes" in under 15 minutes.

**Steps:**
1. **Deployment Target Selection** — "How will you use SchoolPilot?"
   - Desktop App (single computer, offline)
   - Browser App (any device, offline-capable)
   - School Network (multiple computers, sync)
   - Cloud Connected (sync with our backend)
   - ERPNext Connected (sync with existing ERPNext)
   → Sets the correct `deployment.json` config.

2. **School Profile Setup** — Name, address, phone, email, logo upload, country, currency, time zone.

3. **Academic Year & Terms** — Start date, end date, number of terms, term names, holidays.

4. **Education System** — CBC (Kenya), 8-4-4 (Kenya), Cambridge, IB, National Curriculum (custom). This sets the default grading scheme, subject list, and report card template.

5. **Classes & Streams** — Based on education system, suggest default classes (e.g., Grade 1-12 for 8-4-4, or PP1-Grade 6, Junior Secondary for CBC). Admin can add/modify. Auto-create streams (A, B, C).

6. **Subjects** — Based on education system, auto-populate compulsory subjects. Admin can add/remove.

7. **Departments & Designations** — Default: Administration, Teaching, Support. Designations: Principal, Teacher, Bursar, Secretary, Security.

8. **Admin Account** — Confirm admin details, set password.

9. **Quick Start Options** —
   - "Add Staff Now" → opens staff wizard
   - "Add Students Now" → opens student wizard
   - "Skip for now, go to Dashboard" → onboarding banner appears on dashboard until data is added.

**Implementation:**
- Create `OnboardingWizard` component — 9 steps, can be resumed.
- Progress saved to `localStorage` (or database if initialized).
- Each step is a separate page or a tabbed wizard: `/onboarding/step/1` → `/onboarding/step/9`.
- After step 5, the database is seeded with default data (classes, subjects, departments). Admin can then add staff and students immediately.

### 4.2 Workflow: Class & Stream Setup

**Precondition:** School profile, academic year, and education system configured.

**Steps (already partially implemented, needs polish):**
1. **Navigate to:** Academics → Classes & Streams (or `/academics/classes`)
2. **View:** Master-detail layout.
   - Left panel: List of classes with enrollment count.
   - Right panel: Selected class details + streams table + subjects table + teachers table.
3. **Add Class:**
   - Form: `Class Name*` (e.g., "Grade 1"), `Section` (e.g., "Upper Primary"), `Capacity`, `Room Number`, `Class Teacher` (dropdown of staff with "Teacher" designation).
   - Validation: Name required, unique per academic year. Capacity > 0.
   - On save: Class appears in left panel, selected automatically.
4. **Add Stream to Class:**
   - Button: "Add Stream" on the selected class detail panel.
   - Form: `Stream Name*` (e.g., "A", "B", "Red"), `Class Teacher` (optional override).
   - Validation: Stream name unique per class.
   - On save: Stream appears in streams table.
5. **Bulk Create Streams:**
   - Select multiple classes → specify stream names (comma-separated: "A, B, C") → auto-create.
6. **Delete Class:**
   - Blocked if students are enrolled. Prompt: "Transfer 45 students to another class first?" → opens transfer wizard.

**SchoolPilot3 Implementation:**
- `ClassesPage.tsx` already has a hub-tab pattern with `ClassesContent` and `BulkStreamCreationContent`.
- **Action:** Convert to a **master-detail layout** instead of tabs. Left = class list (searchable), right = detail panel with tabs for Streams, Subjects, Teachers, Students.
- Use `useAdministration()` hook which already exposes `classes`, `classStreams`, `addClass`, `addClassStream`, etc.
- Ensure the class teacher dropdown is populated from `staff` collection via `useSharedData('staff')`.
- Add **enrollment count** to the class list (count of students with `current_class_stream_id` matching a stream in this class).

### 4.3 Workflow: Student Admission & Enrollment

**Precondition:** Classes and streams exist.

**Steps (already partially implemented, needs unification):**
1. **Navigate to:** Students → Student List (or `/students`)
2. **Admit Student:**
   - **Step 1 — Personal Details:**
     - Admission No.*, UPI No., First Name*, Middle Name, Last Name*, Gender*, Date of Birth, Admission Date, Religion, County, Nationality, Primary School Attended, KCPE/Previous Exam Marks.
     - Photo upload (camera or file).
   - **Step 2 — Guardian Details:**
     - Primary Guardian: Name, Relationship (Father/Mother/Guardian), Phone, Email, Occupation, Address, ID Number.
     - Secondary Guardian (optional): Same fields.
     - Emergency Contact (if different): Name, Phone, Relationship.
   - **Step 3 — Academic Assignment:**
     - Class* (dropdown), Stream* (dropdown filtered by class), Dormitory (dropdown), Student Category (dropdown: Day/Boarding/Scholarship/Orphan), House (dropdown), Transportation Route (dropdown, if transport module enabled).
     - **Auto-suggestions:** Based on KCPE marks and age, suggest appropriate class. Admin can override.
   - **Step 4 — Documents:**
     - Birth Certificate (upload), Previous School Report (upload), Medical Form (upload), Passport Photo (upload, or use camera capture from Step 1).
     - Document verification status: Pending / Verified / Rejected.
   - **Step 5 — Review & Submit:**
     - Summary of all data. Edit any section.
     - Submit → student created, admission number confirmed, auto-generated student ID.
     - **Post-admission actions:** Print admission letter, send SMS to guardian, assign student portal login.
3. **Student List:**
   - Table: Photo thumbnail, Name, Admission No, Class, Stream, Gender, Guardian Phone, Status (Active/Suspended/Transferred/Alumni/Expelled).
   - Filters: Class, Stream, Gender, Status, Category, Date Range.
   - Search: Name, Admission No, UPI, Guardian Phone.
   - Actions per row: View, Edit, Quick Edit (status/class/stream only), Delete, Print ID Card, View Report Card, Send SMS.
   - Bulk actions: Select multiple → Promote, Transfer, Delete, Export CSV, Print ID Cards.
4. **Bulk Import:**
   - Upload CSV/Excel template.
   - Preview: Show first 10 rows, map columns (auto-detect by header names).
   - Validation: Check for duplicates (admission no), invalid class/stream names, missing required fields.
   - Import: Show progress bar, success/failure count, error log for failed rows.
   - Template download: "Download CSV Template" button with correct headers.

**SchoolPilot3 Implementation:**
- `StudentsListPage.tsx` already has a tabbed form (Personal, Guardian, Academic) in a modal dialog.
- **Action:** Convert from modal dialog to a **dedicated wizard route** `/students/add` using the existing `WizardForm` component (`components/ui/forms/WizardForm.tsx`).
- The `useAdministration()` hook already provides `addStudent`, `updateStudent`, `deleteStudent`. Ensure these work with the selected database provider.
- Add the **photo upload** field to the form (currently missing). Use a simple `<input type="file" accept="image/*">` with preview.
- Add the **bulk import** feature. Create `StudentImportPage.tsx` that:
  - Accepts CSV/Excel upload
  - Uses a library like `papaparse` or `xlsx` for parsing
  - Validates against `classStreams`, `studentCategories`, `dormitories` collections
  - Shows a preview table before final import
  - Calls `addStudent` in a loop with progress tracking
- Add **student detail page** (`/students/:id`) with tabs: Bio, Academics (results), Attendance, Fees, Documents, Discipline.

### 4.4 Workflow: Staff (Teacher) Management

**Precondition:** Departments and designations are configured.

**Steps:**
1. **Navigate to:** Staff → Staff Directory (or `/staff`)
2. **Add Staff:**
   - **Step 1 — Personal Details:**
     - Staff ID*, First Name*, Last Name*, Gender*, DOB, Phone, Email, Address, Nationality, ID Number, Photo upload.
   - **Step 2 — Employment Details:**
     - Department* (dropdown), Designation* (dropdown: Teacher/Admin/Bursar/Principal/Secretary/Security/Support), Employment Date, Employment Type (Full-time/Part-time/Contract), Salary Grade, Employment Status (Active/On Leave/Terminated).
   - **Step 3 — Qualifications:**
     - Highest Qualification (Diploma/Degree/Masters/PhD), Institution, Year Completed, Certifications (list with upload).
   - **Step 4 — Teaching Assignment:**
     - Subjects taught (multi-select from `subjects` collection), Classes taught (multi-select from `class_streams` collection), Class Teacher of (dropdown: class+stream), Is Class Teacher? (checkbox).
     - **Validation:** Warn if a subject is assigned to a class the teacher is not "Classes taught" for.
   - **Step 5 — Account & Permissions:**
     - Create login account? (checkbox) → Username (auto: firstname.lastname), Role (Teacher/Admin/Bursar), Temp Password (auto-generated, printable).
     - Permissions: inherit from role, or custom.
3. **Staff Directory:**
   - Table: Photo, Name, Staff ID, Department, Designation, Classes, Subjects, Status.
   - Filters: Department, Designation, Status, Employment Type.
   - Search: Name, Staff ID, Phone, Email.
   - Actions: View, Edit, Deactivate, Generate ID Card, View Payslip, Delete (soft delete).
4. **Staff Detail Page:**
   - Tabs: Bio, Employment History, Qualifications, Teaching Load (classes + subjects), Attendance, Payslip History, Documents.

**SchoolPilot3 Implementation:**
- `StaffDirectoryPage` and `StaffListPage` exist but are thin.
- **Action:** Merge into a single robust `StaffDirectoryPage` with the 5-step wizard form.
- Reuse `useAdministration()` hook which exposes `staff`, `departments`, `designations`.
- Link staff to `subjects` and `class_streams` via the existing `teacherSubjectAssignments` collection in academics schema.
- The `StaffDetailPage` should display teaching assignments pulled from the academics module via `useSharedData('teacherSubjectAssignments')`.
- Add **teaching load chart** — bar chart showing hours per day/week based on timetable entries.

### 4.5 Workflow: Subject & Curriculum Setup

**Precondition:** Classes and streams exist. Education system configured.

**Steps:**
1. **Navigate to:** Academics → Subjects (or `/academics/subjects`)
2. **Add Subject:**
   - Name*, Code*, Abbreviation, Department (dropdown), Is Compulsory? (checkbox), Grouping (Sciences/Humanities/Technical/Arts/Languages), Education System (dropdown, if multiple systems).
   - Auto-suggest codes based on name (e.g., "Mathematics" → "MAT").
3. **Add Subject Papers:**
   - Under each subject, add papers (e.g., "Mathematics Paper 1", "Mathematics Paper 2") with max marks and weight percentage.
   - Default: 1 paper per subject, max marks = 100, weight = 100%.
4. **Assign Subjects to Classes:**
   - Grid: Rows = classes, Columns = subjects, Checkboxes = assign.
   - "Select All" for compulsory subjects per education system.
   - Bulk assign: Select classes → select subjects → assign.
5. **Assign Teachers to Subjects:**
   - For each class-subject pair, assign a teacher from dropdown.
   - Validation: Teacher must have the subject in their "Subjects taught" list.
   - Show conflict: highlight if a teacher is double-booked for the same class period.
6. **Student Enrollment in Subjects:**
   - Per class, compulsory subjects auto-enrolled.
   - Optional subjects: Student selects from available list (parent approval required for some).
   - Maximum subjects per student based on education system rules.

**SchoolPilot3 Implementation:**
- Subjects hub, class allocations, and teacher assignments already exist in `academics/pages`.
- **Action:** Consolidate the three separate pages (`SubjectsHubPage`, `CurriculumAllocationsPage`, `TeacherSubjectAssignmentPage`) into a **single master-detail page** at `/academics/subjects`:
  - Left panel: Subject list (searchable)
  - Right panel: Subject detail → Papers tab → Class Assignments tab → Teacher Assignments tab → Student Enrollment tab
- Use existing `useAcademics()` hook which exposes `subjects`, `subjectPapers`, `classSubjectAllocations`, `teacherSubjectAssignments`.
- Add the **assignment grid** for class-subject-teacher mapping. This is a 3-column table: Class | Subject | Teacher (dropdown). Filterable by class and subject.

### 4.6 Workflow: Exam Setup & Marks Entry

**Precondition:** Subjects, papers, classes, streams, and students are configured.

**Steps:**
1. **Create Exam Session:**
   - Academics → Exams → New Session.
   - Name (e.g., "Mid-Term 1, 2025"), School Period (dropdown), Education System (dropdown), Result Publication Date.
   - Auto-suggest: Based on academic year and term, suggest "Mid-Term [Term]" or "End-Term [Term]".
2. **Configure Papers:**
   - For each subject paper assigned to classes in the education system, set max marks and weight for this exam session.
   - Default: Inherit from subject paper defaults. Admin can override per exam.
3. **Schedule (Optional):**
   - Assign dates, times, and invigilators to each paper.
   - Conflict detection: Warn if two papers for the same class are scheduled simultaneously.
   - Export: Print exam timetable.
4. **Marks Entry:**
   - Select Exam Session → Select Class/Stream → Select Subject Paper.
   - Table: Student Name | Admission No | Marks | Grade (auto-calculated) | Remarks.
   - Inline editing: Click cell → type marks → press Enter → next cell. Tab navigates horizontally.
   - Bulk entry: Paste from Excel (tab-separated: AdmissionNo\tMarks).
   - Save draft: Auto-save every 30 seconds. Marks are not visible to students until submitted.
   - Submit for verification: Marks are locked, sent to HoD/Admin for approval.
5. **Verification:**
   - HoD/Admin views marks by class/subject.
   - Approve: Marks are published. Reject: Return to teacher with comments.
   - Auto-flag: Unusual patterns (all students same marks, all 100%, etc.).
6. **Results Distribution:**
   - Publish results to student portal (immediate or scheduled).
   - Print report cards (PDF, with school branding, student photo, subject-wise marks, grades, position, remarks).
   - Send SMS to parents: "[Student] scored [Grade] in [Exam]. View full report at [link]."
   - Export: Gazette (ranked list per class), summary statistics (mean, median, grade distribution).

**SchoolPilot3 Implementation:**
- Exam session, paper settings, marks entry, and verification pages exist.
- **Action:** Ensure the marks entry page (`MarksEntryPage`) uses the standardized `DataGrid` with **inline editing** (not modal forms).
- The grading engine (`GradingEngineService`) should auto-calculate grades based on the grading scheme linked to the class's education system.
- Connect the "Publish" action to the portal module so students can view results via `useSharedData('studentExamResults')`.
- Add **bulk paste from Excel** — a textarea where teachers paste two columns (Admission No, Marks) and the system auto-matches.
- Add **auto-save draft** with a visual indicator ("Draft saved at 14:32").

### 4.7 Workflow: Fee Management & Invoicing

**Precondition:** Students are enrolled. Fee structures are configured.

**Steps:**
1. **Fee Templates:**
   - Finance → Fee Templates → Create Template.
   - Per class or per student category: Template Name, Academic Year, Term.
   - Items: Tuition, Lunch, Boarding, Activity, Exam, Transport, Library, etc. Each item has Amount and Is Compulsory?.
   - Example: "Form 1 Day Scholar" = Tuition 10,000 + Lunch 2,000 + Activity 500 = 12,500.
2. **Bulk Invoicing:**
   - Select Academic Year + Term + Class + Stream + Student Category.
   - Preview: Table of students with calculated fee (based on template + individual adjustments).
   - Individual adjustments: Scholarship discount, special charges, previous balance.
   - Generate invoices: Create invoice records for all selected students. Status: Draft → Send (SMS/email notification).
3. **Payments:**
   - Record payment per student: Amount, Payment Method (Cash/Bank/M-Pesa/Card), Reference Number, Date.
   - Auto-allocation: Allocate to oldest invoice items first (tuition → lunch → transport).
   - Partial payment: Split across multiple items. Show remaining balance per item.
   - Overpayment: Credit to student wallet for future use.
4. **Reports:**
   - Fees Due Report: Per class, per student, total due, total paid, balance.
   - Paid Report: Per date range, per payment method, total collection.
   - Arrears Report: Students with balance > 0, days overdue, auto-SMS reminder.
   - Daily Collection Summary: Cash register style, with reconciliation.

**SchoolPilot3 Implementation:**
- `FeeTemplatesPage`, `InvoiceGenerationPage`, `StudentPaymentsPage` exist.
- **Action:** Ensure the invoice generation workflow is end-to-end functional:
  - Template → Select students → Preview → Generate → Send.
- Add **auto-allocation logic** to `PaymentAllocationService` (already exists, verify it works).
- Add **overpayment wallet** — create a `student_wallet` or `student_credit` record.
- Add **arrears auto-reminder** — daily cron job that sends SMS to parents of students with balance > 0 and no payment in 30 days.

### 4.8 Workflow: Daily Attendance

**Steps:**
1. **Daily Roll Call:**
   - Teacher opens class attendance sheet: Attendance → Daily Roll Call (or `/attendance/daily`).
   - Select Class, Stream, Date (default: today).
   - Table: Student Name | Admission No | Status (Present/Absent/Late/Excused) | Reason | Time In | Notes.
   - Quick mark: Buttons "Mark All Present", "Mark All Absent", then adjust individual students.
   - Absent reason: Dropdown (Sick, Family, No Transport, Other) + custom text.
   - Late time: Auto-capture if device has time.
2. **Summary:**
   - Admin views attendance percentage per class, per student, per term.
   - Charts: Daily attendance trend, class comparison, absenteeism hotspots.
3. **Alerts:**
   - Auto-SMS to parents when student is marked absent (requires SMS credit).
   - Daily summary to admin: "Class 1A: 45/50 present, 3 absent, 2 late."

**SchoolPilot3 Implementation:**
- `StudentAttendancePage` exists but may be a configuration page, not a daily roll call.
- **Action:** Create a dedicated `DailyAttendancePage` with the roll call grid.
- Use `saveStudentAttendance` from `AppDataContext` (already exists, verify it works with the selected provider).
- Add **attendance analytics** to the dashboard: today's attendance rate, absent students, trend chart.
- Connect to **SMS module** for auto-alerts. Use `communication_templates` for the absence message template.

---

## 5. Navigation & UX Improvements (Preserving Dual Mode)

### 5.1 Unified Layout Component

**Delete:** `Layout.tsx` and `LayoutNew.tsx`  
**Create:** `AppLayout.tsx` — single source of truth.

```tsx
// AppLayout.tsx — simplified dual-mode layout
const AppLayout: React.FC = ({ children }) => {
  const { isFullWidth } = useFullWidth();
  const { navigationItems } = useDynamicNavigation();
  const location = useLocation();
  
  // Determine current module from URL
  const currentModuleId = useMemo(() => {
    const path = location.pathname.split('/')[1];
    return path || 'dashboard';
  }, [location.pathname]);
  
  const currentModule = navigationItems.find(item => item.id === currentModuleId);
  
  if (isFullWidth) {
    return (
      <div className="flex h-screen">
        {/* Secondary sidebar becomes primary in fullwidth mode */}
        <SecondarySidebar 
          module={currentModule} 
          items={currentModule?.children || []}
          className="w-64 flex-shrink-0"
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header showModuleSwitcher={true} />
          <TabBar /> {/* URL-driven tabs, memoized */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }
  
  // Standard mode
  return (
    <div className="flex h-screen">
      <PrimarySidebar 
        items={navigationItems} 
        className="w-64 flex-shrink-0"
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <TabBar /> {/* URL-driven tabs, memoized */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
```

**Key implementation notes:**
- `TabBar` must be `React.memo` and only re-render when `tabs` array reference changes (not when tab content changes).
- Tab content is rendered via `<Outlet>` from React Router, not stored in the tab object.
- `PrimarySidebar` and `SecondarySidebar` are also memoized.
- The `FullWidthContext` toggle is in the header (a button or keyboard shortcut `Ctrl+Shift+F`).

### 5.2 Module Navigation Structure (Simplified)

Each module definition should have exactly **4-6 hub pages** (visible in BOTH modes). No more than 6 tabs per hub page (UX rule of thumb: 5±2 tabs).

**Administration Module (Example):**
```typescript
export const administrationModule: ModuleDefinition = {
  id: 'administration',
  name: 'navigation:administration.title',
  icon: BuildingOffice2Icon,
  path: '/administration',
  navigation: [
    // Hub pages (visible in BOTH modes)
    { name: 'Students', path: '/administration/students', icon: UsersIcon, page: 'StudentDirectoryPage' },
    { name: 'Staff', path: '/administration/staff', icon: UserGroupIcon, page: 'StaffDirectoryPage' },
    { name: 'Organization', path: '/administration/organization', icon: BuildingOffice2Icon, page: 'SchoolOrganizationPage' },
    { name: 'Calendar', path: '/administration/calendar', icon: CalendarDaysIcon, page: 'AcademicCalendarPage' },
    { name: 'Communication', path: '/administration/communication', icon: EnvelopeIcon, page: 'CommunicationPage' },
    { name: 'Attendance', path: '/administration/attendance', icon: CalendarDaysIcon, page: 'StudentAttendancePage' },
  ],
  // Standalone pages (direct routes, no redirects needed)
  routes: [
    { path: '/administration/students', page: 'StudentDirectoryPage' },
    { path: '/administration/students/add', page: 'AddStudentPage' },
    { path: '/administration/students/:id', page: 'StudentDetailPage' },
    { path: '/administration/students/import', page: 'StudentImportPage' },
    { path: '/administration/staff', page: 'StaffDirectoryPage' },
    { path: '/administration/staff/add', page: 'AddStaffPage' },
    { path: '/administration/staff/:id', page: 'StaffDetailPage' },
    { path: '/administration/organization', page: 'SchoolOrganizationPage' },
    { path: '/administration/organization/departments', page: 'DepartmentsPage' },
    { path: '/administration/organization/designations', page: 'DesignationsPage' },
    { path: '/administration/organization/dormitories', page: 'DormitoriesPage' },
    { path: '/administration/organization/clubs', page: 'ClubsPage' },
    { path: '/administration/calendar', page: 'AcademicCalendarPage' },
    { path: '/administration/calendar/years', page: 'AcademicYearsPage' },
    { path: '/administration/calendar/periods', page: 'SchoolPeriodsPage' },
    { path: '/administration/calendar/structures', page: 'AcademicStructurePage' },
    { path: '/administration/communication', page: 'CommunicationPage' },
    { path: '/administration/communication/templates', page: 'CommunicationTemplatesPage' },
    { path: '/administration/communication/campaigns', page: 'MessageCampaignsPage' },
    { path: '/administration/attendance', page: 'StudentAttendancePage' },
    { path: '/administration/attendance/daily', page: 'DailyAttendancePage' },
    { path: '/administration/attendance/reports', page: 'AttendanceReportsPage' },
  ],
  // No deprecated redirects — clean routes
};
```

**Actions:**
1. Remove ALL `deprecated: true` navigation items from all module definitions.
2. Remove ALL `redirectTo` fields.
3. Each module has 4-6 top-level navigation items that are hub pages with sub-tabs.
4. Sub-pages are real routes (e.g., `/administration/organization/departments`), not query-param hacks.
5. Use React Router nested routes for hub pages:
   ```tsx
   <Route path="/administration/organization" element={<SchoolOrganizationPage />}>
     <Route path="departments" element={<DepartmentsPage />} />
     <Route path="designations" element={<DesignationsPage />} />
     <Route path="dormitories" element={<DormitoriesPage />} />
     <Route path="clubs" element={<ClubsPage />} />
   </Route>
   ```
6. This makes URLs bookmarkable, shareable, and deep-linkable.

### 5.3 Standard Page Templates

Create three reusable page templates that ALL list/form/detail pages must use:

#### `StandardListPage` Template
```tsx
<StandardListPage
  title="Students"
  description="Manage all students in your school"
  icon={UsersIcon}
  actions={[
    { id: 'add', label: 'Add Student', icon: PlusIcon, onClick: () => navigate('/students/add'), variant: 'primary' },
    { id: 'import', label: 'Import', icon: UploadIcon, onClick: () => navigate('/students/import'), variant: 'secondary' },
    { id: 'export-csv', label: 'CSV', icon: DownloadIcon, onClick: exportCSV, variant: 'ghost' },
    { id: 'export-pdf', label: 'PDF', icon: FileTextIcon, onClick: exportPDF, variant: 'ghost' },
  ]}
  filters={[
    { key: 'class', label: 'Class', type: 'select', options: classes.map(c => ({ value: c.id, label: c.name })) },
    { key: 'stream', label: 'Stream', type: 'select', options: streams.map(s => ({ value: s.id, label: s.name })), dependsOn: 'class' },
    { key: 'gender', label: 'Gender', type: 'select', options: [{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }] },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'Active', label: 'Active' }, { value: 'Suspended', label: 'Suspended' }] },
  ]}
  searchPlaceholder="Search by name, admission no, UPI..."
  columns={studentColumns}
  data={filteredStudents}
  loading={loading}
  emptyState={<EmptyState icon={UserIcon} title="No students found" description="Add your first student to get started" action={{ label: 'Add Student', onClick: () => navigate('/students/add') }} />}
  onRowClick={(student) => navigate(`/students/${student.id}`)}
  onSelectionChange={(selected) => setSelectedStudents(selected)}
  pagination={{ pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }}
  bulkActions={[
    { id: 'delete', label: 'Delete', icon: TrashIcon, onClick: bulkDelete, variant: 'danger' },
    { id: 'promote', label: 'Promote', icon: ArrowUpIcon, onClick: bulkPromote, variant: 'secondary' },
    { id: 'export', label: 'Export Selected', icon: DownloadIcon, onClick: bulkExport, variant: 'ghost' },
  ]}
/>
```

#### `StandardDetailPage` Template
```tsx
<StandardDetailPage
  title={`${student.first_name} ${student.last_name}`}
  subtitle={student.admission_no}
  avatar={student.photo_url}
  status={{ label: student.status, color: statusColors[student.status] }}
  tabs={[
    { id: 'bio', label: 'Bio', icon: UserIcon, content: <StudentBioTab student={student} /> },
    { id: 'academics', label: 'Academics', icon: AcademicCapIcon, content: <StudentAcademicsTab studentId={student.id} /> },
    { id: 'attendance', label: 'Attendance', icon: CalendarIcon, content: <StudentAttendanceTab studentId={student.id} /> },
    { id: 'fees', label: 'Fees', icon: DollarIcon, content: <StudentFeesTab studentId={student.id} /> },
    { id: 'documents', label: 'Documents', icon: FileIcon, content: <StudentDocumentsTab studentId={student.id} /> },
  ]}
  actions={[
    { id: 'edit', label: 'Edit', icon: EditIcon, onClick: () => navigate(`/students/${student.id}/edit`) },
    { id: 'print-id', label: 'Print ID Card', icon: PrinterIcon, onClick: printIDCard },
    { id: 'send-sms', label: 'Send SMS', icon: MessageIcon, onClick: sendSMS },
  ]}
/>
```

#### `WizardFormPage` Template
```tsx
<WizardFormPage
  title="Admit New Student"
  steps={[
    { id: 'personal', label: 'Personal Details', icon: UserIcon, component: <StudentPersonalForm /> },
    { id: 'guardian', label: 'Guardian Details', icon: UsersIcon, component: <StudentGuardianForm /> },
    { id: 'academic', label: 'Academic Assignment', icon: AcademicCapIcon, component: <StudentAcademicForm /> },
    { id: 'documents', label: 'Documents', icon: FileIcon, component: <StudentDocumentsForm /> },
    { id: 'review', label: 'Review', icon: CheckIcon, component: <StudentReviewForm /> },
  ]}
  onSubmit={handleSubmit}
  onCancel={() => navigate('/students')}
  validateStep={validateStep}
/>
```

### 5.4 Onboarding & Empty States

Every list page must have an **empty state** that is not just "No data found" but guides the user to add data:

```tsx
// Empty state variants
<EmptyState 
  icon={UsersIcon} 
  title="No students yet" 
  description="Get started by adding your first student. You can also import students from a CSV file."
  actions={[
    { label: 'Add Student', onClick: () => navigate('/students/add'), variant: 'primary' },
    { label: 'Import from CSV', onClick: () => navigate('/students/import'), variant: 'secondary' },
  ]}
/>
```

**Onboarding Banner** (dismissible, shown on Dashboard and relevant pages when entity count is zero):

```tsx
<OnboardingBanner 
  title="🎉 Let's get your school up and running!"
  steps={[
    { label: 'Add Classes', done: classes.length > 0, onClick: () => navigate('/academics/classes') },
    { label: 'Add Staff', done: staff.length > 0, onClick: () => navigate('/administration/staff') },
    { label: 'Add Students', done: students.length > 0, onClick: () => navigate('/administration/students') },
  ]}
  onDismiss={() => localStorage.setItem('onboarding-dismissed', 'true')}
/>
```

---

## 6. Build & Type Safety Fixes

### 6.1 TypeScript Error Strategy

**Current:** 1,672 errors. Primary culprits: `library/pages/*`, `inventory/pages/*`.

**Root Cause Analysis:**
- Library and inventory pages were partially migrated to the new modular data provider pattern but have import errors, missing type references, and broken component imports.
- The `useLibrary()` and `useInventory()` hooks may not be fully implemented or exported correctly.
- Some pages reference old `useMockData` or `useAppData` patterns that no longer exist.

**Fix Strategy:**
1. **Library Module (Quick Fix):**
   - The library module has a simpler scope than others: books, categories, loans, fines, settings.
   - Create a minimal `LibraryDataProvider` that wraps `useDatabaseCollection` for the 5 library collections.
   - Create `useLibrary()` hook that exposes `books`, `bookCategories`, `bookLoans`, `fines`, `addBook`, `updateBook`, etc.
   - Fix all library pages to use `useLibrary()` instead of broken imports.
   - If a library page is too broken to fix quickly, **stub it** with a "Coming Soon" page and a link to the working pages.
   - **Goal:** Library module compiles with 0 errors. All 5 collections are CRUD-capable.

2. **Inventory Module (Quick Fix):**
   - Similar to library: items, categories, stock levels, warehouses, suppliers, purchase orders, requisitions.
   - Create `InventoryDataProvider` and `useInventory()` hook.
   - Fix the `ReorderAlertsPage` and `PurchaseOrdersPage` which have the most errors.
   - For complex procurement workflows (requisitions → PO → reception), simplify to a single "Procurement Hub" page with tabs until the full workflow is built.
   - **Goal:** Inventory module compiles with 0 errors. Core entities (items, stock, suppliers) are CRUD-capable.

3. **Cross-Module Import Audit:**
   - Run `npm run lint:modules` to detect cross-module imports.
   - Fix all cross-module imports by using `useSharedData()` or adding the dependency to `moduleDefinition.tsx`.
   - Enable `strictModuleIsolation` feature flag in development to catch future violations.

### 6.2 Build Pipeline

**Current:** `npm run build` likely fails due to TS errors.

**Fixes:**
1. Fix all TS errors in library and inventory (priority 1).
2. Add `tsc --noEmit` to pre-build check.
3. Add CI/CD check (GitHub Actions) that runs `tsc --noEmit` and `npm run build` on every PR.
4. Add pre-commit hook that runs `tsc --noEmit` on staged files only (fast).
5. Set `strict: true` in `tsconfig.json` but add `skipLibCheck: true` to prevent node_modules type errors from blocking the build.

---

## 7. Backend Integration Architecture (Refinement)

### 7.1 Sync Architecture

The current `AppDataContext` sync logic is too monolithic. Refactor into focused, testable components:

```
┌─────────────────────────────────────────────────────────────────┐
│  SYNC ORCHESTRATOR (new)                                         │
├─────────────────────────────────────────────────────────────────┤
│  • Manages sync state (idle/syncing/error/paused)              │
│  • Triggers sync based on: interval, network reconnect, manual  │
│  • Delegates to provider-specific sync implementation           │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │ PouchDB Sync    │ │ Backend API │ │ Livestore Sync  │
    │ (CouchDB        │ │ Sync        │ │ (Cloudflare)    │
    │  replication)   │ │ (REST +     │ │                 │
    │                 │ │  queue)     │ │                 │
    └─────────────────┘ └─────────────┘ └─────────────────┘
```

**Actions:**
1. Create `SyncOrchestrator` class — manages sync state, NOT data. Calls provider-specific sync methods.
2. Each provider implements `ISyncable` interface: `sync()`, `pause()`, `resume()`, `getPendingCount()`, `getSyncStatus()`.
3. `PouchDBProvider` — uses `db.sync(remoteCouchDBUrl, { live: true, retry: true })`.
4. `BackendAPIProvider` — uses an offline queue (stored in local SQLite/PouchDB). On sync, push queue to API, pull changes from API. Conflict resolution: `last-write-wins` or `server-wins` (configurable per collection).
5. `LivestoreProvider` — uses Livestore's built-in sync.
6. **No sync for:** `SQLiteFileProvider` (desktop, single user), `SQLiteWASMProvider` (standalone browser, no backend configured).

### 7.2 ERPNext Integration

**Current:** Config exists in `dataLayerConfig.ts` but may not be fully implemented.

**Implementation:**
1. Create `ERPNextSyncAdapter` that implements `ISyncable`.
2. Maps SchoolPilot entities to ERPNext Frappe Education module entities:
   - Student → Student
   - Staff → Instructor
   - Class → Student Group
   - Subject → Course
   - Exam Session → Assessment Plan
   - Student Exam Result → Assessment Result
   - Fee Template → Fee Structure
   - Student Invoice → Fee Schedule
   - Student Payment → Payment Entry
3. Sync strategy: Bi-directional, but SchoolPilot is the master for academic data (marks, attendance), ERPNext is the master for financial data (if ERPNext is the primary accounting system).
4. Conflict resolution: `erpnext-wins` for financial data, `schoolpilot-wins` for academic data.
5. UI: Settings → Integrations → ERPNext. Configure URL, API key, sync direction, entity mapping, sync frequency.

### 7.3 SaaS Backend Integration (Your Existing System)

**Implementation:**
1. Create `SaaSBackendAdapter` that implements `ISyncable`.
2. Uses your existing API schema. Map SchoolPilot collections to your backend tables.
3. Auth: JWT token or API key. Store in `localStorage` or secure storage (Electron: keychain).
4. Offline queue: All write operations are queued locally and synced when online. Read operations hit local cache first, then background refresh from API.
5. Multi-tenant: If your SaaS backend supports multiple schools, add `school_id` to all requests.

---

## 8. Mobile & PWA Strategy

### 8.1 PWA Features

**Current:** `vite-plugin-pwa` is a dependency. Verify it's configured.

**Actions:**
1. Ensure `manifest.webmanifest` has correct icons, theme color, display mode (`standalone`).
2. Add service worker for offline caching of static assets.
3. Add background sync for data operations when offline.
4. Add push notifications for: fee reminders, exam results published, attendance alerts.
5. **Mobile-first forms:** On screens < 768px, forms should be single-column, touch-friendly (min 44px tap targets), with floating action buttons (FAB) for primary actions.
6. **Mobile sidebar:** Slide-out drawer from the left, overlay on the rest of the screen. Swipe from left edge to open.
7. **Mobile tables:** Cards instead of tables for < 640px. Each card shows key info and an expand button for details.

### 8.2 Electron/Desktop Strategy

**Actions:**
1. Create `electron/` directory with main process, preload script, and renderer integration.
2. Use `SQLiteFileProvider` with `better-sqlite3` for persistent local storage.
3. Add native menu bar: File → Backup, Restore, Export. Edit → Preferences. View → Full Screen, Toggle Sidebar Mode.
4. Add system tray icon with quick actions: Open, Backup, Exit.
5. Auto-updater: Use `electron-updater` with GitHub releases or your own update server.
6. Window state: Remember window size, position, and sidebar mode across sessions.

---

## 9. Testing & Quality Assurance

### 9.1 Test Strategy

**Unit Tests (Vitest):**
- Data hooks: `useAdministration`, `useAcademics`, `useFinance` — test CRUD operations with mock database provider.
- Services: `GradingEngineService`, `PaymentAllocationService`, `InvoiceGenerationService` — test business logic with edge cases.
- Utilities: Schema validation, date formatting, currency formatting.

**Integration Tests (Vitest + Happy DOM):**
- Page rendering: Each page renders without errors, with correct title and initial state.
- Navigation: Clicking sidebar item navigates to correct route, tab opens, content loads.
- Form submission: Filling form → submit → success toast → data appears in list.
- Data flow: Create student → appears in class roll call → appears in attendance sheet.

**E2E Tests (Playwright):**
- Full workflows: Onboarding → Add Class → Add Student → Take Attendance → Enter Marks → Generate Report Card.
- Cross-browser: Chrome, Firefox, Safari (desktop). Chrome Android, Safari iOS (mobile).
- Deployment targets: Electron app launches, PWA installs, sync works between two browser instances.

### 9.2 Performance Budgets

- **Initial bundle:** < 500KB (gzipped) for the shell (React, Router, UI components).
- **Module chunks:** < 200KB per module (lazy loaded).
- **Time to Interactive:** < 3s on 3G network for PWA.
- **First Contentful Paint:** < 1.5s on desktop.
- **Lighthouse Score:** > 80 for Performance, > 90 for Accessibility, > 90 for Best Practices.
- **Database queries:** < 100ms for listing 100 records. < 500ms for listing 1000 records (with pagination).
- **Report generation:** < 5s for a class report card PDF. < 30s for a full school report.

### 9.3 Monitoring & Error Tracking

**Current:** Sentry is configured (`@sentry/react`).

**Actions:**
1. Add Sentry to all providers: capture database errors, sync failures, and performance traces.
2. Add user feedback widget: "Report a Bug" button that captures screenshot, current route, and user description.
3. Add performance monitoring: Track page load times, database query times, and render times for slow components.
4. Add analytics (optional, privacy-respecting): Track feature usage to inform development priorities. Use Plausible or Matomo (self-hosted).

---

## 10. Implementation Roadmap (12-Week Sprint Plan)

| Week | Focus | Deliverable | Success Criteria | Deployment Target |
|------|-------|-------------|------------------|-------------------|
| **1** | Build Stabilization | Fix 1,672 TS errors in library + inventory | `npm run build` passes with 0 errors | All |
| **2** | Layout Unification | Merge Layout + LayoutNew into AppLayout | Dual navigation modes work without re-render loops | All |
| **3** | Navigation Simplification | Remove deprecated routes, adopt nested routes, 6 hub pages per module | All URLs are bookmarkable, no 404s | All |
| **4** | Data Layer Refactor | Split AppDataContext into focused hooks (useSync, usePagination, useBackupRestore) | Data operations work across all 5 providers | All |
| **5** | Onboarding Wizard | 9-step onboarding, deployment target selector, school profile setup | New user can complete setup in < 10 min | All |
| **6** | Core Workflows: Classes & Students | Master-detail classes page, 5-step student admission wizard, CSV import | Add class → add stream → admit student → student appears in list | All |
| **7** | Core Workflows: Staff & Subjects | Staff wizard with teaching assignments, subject setup with class/teacher assignment grid | Add teacher → assign subjects → assign classes | All |
| **8** | Core Workflows: Exams & Marks | Exam session creation, marks entry with inline editing, auto-grade, submit/verify | Create exam → enter marks → publish results | All |
| **9** | Finance & Attendance | Fee templates, bulk invoicing, payment recording, daily attendance roll call | Generate invoice → record payment → balance updates | All |
| **10** | Reports & Communication | 15 standard reports, PDF export, SMS campaign builder, auto-absence alerts | Export report card, send fee reminder SMS | All |
| **11** | Settings & RBAC | Role editor, audit log viewer, database backup/restore, ERPNext integration UI | Create custom role → assign user → audit log shows action | All |
| **12** | Polish & Performance | Mobile QA, PWA audit, Electron build, Lighthouse > 80, E2E tests pass | App works on mobile, desktop, and browser | All |

---

## 11. File-Level Action Items (Revised)

### 11.1 Files to Modify (High Priority)

| File | Action | Notes |
|------|--------|-------|
| `src/App.tsx` | Simplify provider hierarchy | Remove unnecessary wrappers, keep: UnifiedConfigProvider → ToastProvider → Suspense → OnboardingGate → AppLayout |
| `src/routing/AppContent.tsx` | Remove Layout vs LayoutNew split | Always use AppLayout |
| `src/routing/moduleRoutes.tsx` | Remove deprecated redirect generation | Keep only current routes, use nested routes for hub pages |
| `src/components/Layout.tsx` | Merge with LayoutNew into AppLayout | Single layout component with conditional rendering |
| `src/components/LayoutNew.tsx` | **DELETE** | Replaced by AppLayout |
| `src/components/Sidebar.tsx` | Reduce to 8 top-level items | Add collapsible groups, active state highlighting |
| `src/components/PrimarySidebar.tsx` | Simplify | Show only top-level module icons, expand on hover or click |
| `src/components/SecondarySidebar.tsx` | Stabilize | Show current module's children, memoized |
| `src/components/tabbedWorkspace/*` | **DELETE or SIMPLIFY** | Replace with URL-driven TabBar + React Router Outlet |
| `src/contexts/AppDataContext.tsx` | Split into focused hooks | Extract useSync, usePagination, useBackupRestore, useDataValidation |
| `src/hooks/useAppData.ts` | Keep as aggregator | Just re-export from focused hooks + module data |
| `src/services/database/UnifiedDatabaseManager.ts` | Remove RxDB from fallback chain | Ensure fallback works: sqlite-wasm → pouchdb → backend-api |
| `src/services/database/DatabaseProviderFactory.ts` | Remove RxDB references | Update provider selection logic |
| `src/modules/*/moduleDefinition.tsx` | Remove deprecated routes | Keep 4-6 hub pages, remove all redirectTo fields |
| `src/modules/library/pages/*` | Fix all TS errors | Use useLibrary() hook, fix imports |
| `src/modules/inventory/pages/*` | Fix all TS errors | Use useInventory() hook, fix imports |
| `src/modules/administration/pages/ClassesPage.tsx` | Convert to master-detail | Left panel = class list, right = detail + tabs |
| `src/modules/administration/pages/StudentsListPage.tsx` | Move wizard to dedicated route | `/students/add` uses WizardFormPage template |
| `src/modules/administration/pages/StaffDirectoryPage.tsx` | Build 5-step wizard | Use WizardFormPage template |
| `src/modules/academics/pages/SubjectsHubPage.tsx` | Consolidate papers/assignments/enrollment | Master-detail: left = subjects, right = tabs |
| `src/modules/academics/pages/MarksEntryPage.tsx` | Add inline editing | Use DataGrid with inline editing, auto-save draft |
| `src/modules/finance/pages/FeeTemplatesPage.tsx` | Add template builder | Standard form with dynamic items list |
| `src/modules/finance/pages/InvoiceGenerationPage.tsx` | Add bulk generation | Select class → preview → generate |
| `src/modules/finance/pages/StudentPaymentsPage.tsx` | Add payment recording | Auto-allocation, partial payment, overpayment |
| `src/modules/administration/pages/StudentAttendancePage.tsx` | Create DailyAttendancePage | Roll call grid, quick mark all present |
| `src/modules/reports/*` | Create report templates | Use ReportEngine for data aggregation |
| `src/modules/settings/*` | Add role editor, audit log | RBAC UI, audit log viewer with filters |
| `src/components/Header.tsx` | Add global search | Debounced search across students, staff, classes |
| `src/components/DataGrid.tsx` | Add inline editing, filter bar | Reusable filter dropdowns, bulk actions bar |
| `src/components/OnboardingBanner.tsx` | **CREATE** | Dismissible banner, shows when entities = 0 |
| `src/components/ImportWizard.tsx` | **CREATE** | CSV/Excel upload, preview, column mapping, validation |
| `src/components/ReportBuilder.tsx` | **CREATE** | Generic report layout with chart + table + export |
| `src/components/EmptyState.tsx` | **CREATE** | Icon + title + description + action buttons |
| `src/components/StandardListPage.tsx` | **CREATE** | Wrapper: title + actions + filters + search + table + pagination |
| `src/components/StandardDetailPage.tsx` | **CREATE** | Wrapper: title + avatar + status + tabs + actions |
| `src/components/WizardFormPage.tsx` | **CREATE** | Stepper + form sections + validation + navigation |
| `src/hooks/useSync.ts` | **CREATE** | Extract from AppDataContext |
| `src/hooks/usePagination.ts` | **CREATE** | Extract from AppDataContext |
| `src/hooks/useBackupRestore.ts` | **CREATE** | Extract from AppDataContext |
| `src/hooks/useDataValidation.ts` | **CREATE** | Extract from AppDataContext |
| `src/hooks/useOnboarding.ts` | **CREATE** | Check entity counts, show/hide banner |
| `src/hooks/useSharedData.ts` | **CREATE** | Read-only cross-module data access |
| `src/hooks/useGlobalSearch.ts` | **CREATE** | Search across all indexed collections |
| `src/services/sync/SyncOrchestrator.ts` | **CREATE** | Manage sync state, delegate to provider |
| `src/services/sync/ISyncable.ts` | **CREATE** | Interface for syncable providers |
| `src/services/integrations/ERPNextAdapter.ts` | **CREATE** | ERPNext sync implementation |
| `src/services/integrations/SaaSBackendAdapter.ts` | **CREATE** | Your existing backend sync implementation |
| `src/services/reports/ReportEngine.ts` | **CREATE** | Data aggregation, chart generation, PDF export |
| `src/core/types/sharedData.ts` | **CREATE** | SharedEntityRegistry interface |
| `electron/main.ts` | **CREATE** | Electron main process |
| `electron/preload.ts` | **CREATE** | Electron preload script |
| `electron/build.js` | **CREATE** | Electron build script |

### 11.2 Files to Delete

| File | Reason |
|------|--------|
| `src/components/LayoutNew.tsx` | Replaced by unified AppLayout |
| `src/components/TabbedWorkspace.tsx` (old) | Replaced by URL-driven TabBar + Outlet |
| `src/components/ModuleDashboardPlaceholder.tsx` | No longer needed |
| `src/components/ModuleLoadingFallback.tsx` | Use standard Suspense fallback |
| `src/services/rxdbService.ts` | RxDB deprecated |
| `src/hooks/useRxDBData.ts` | RxDB deprecated |
| `src/modules/*/pages/*Page.tsx` (deprecated) | If fully replaced by hub pages |
| `src/modules/library/pages/*` (severely broken) | Stub or fix; if not fixable in Week 1, stub and remove broken pages |
| `src/modules/inventory/pages/*` (severely broken) | Stub or fix; if not fixable in Week 1, stub and remove broken pages |
| `tsc-errors.txt` through `tsc-errors5.txt` | These are old logs; after Week 1, there should be no errors to log |
| `fix*.cjs`, `fix-imports*.cjs` | These are one-off scripts; remove after Week 1 |

---

## 12. Deployment Target Test Matrix

| Deployment | Provider | Backend | Test Steps | Priority |
|---|---|---|---|---|
| **Electron Desktop** | `sqlite-file` | None | Build Electron app → launch → add student → close → reopen → verify data persists | P1 |
| **Browser Standalone** | `sqlite-wasm` + OPFS | None | Open in browser → add student → close tab → reopen → verify data persists | P1 |
| **Browser + CouchDB** | `pouchdb` | `couchdb` (local) | Open in Browser A → add student → Open Browser B → verify student appears | P2 |
| **Browser + SaaS Backend** | `sqlite-wasm` | Custom API | Open app → add student → go offline → add another student → go online → verify sync | P2 |
| **Browser + ERPNext** | `sqlite-wasm` | ERPNext | Add student in SchoolPilot → verify in ERPNext → update in ERPNext → verify in SchoolPilot | P3 |
| **PWA (Mobile)** | `sqlite-wasm` | None | Install as PWA on Android → add student → close app → reopen → verify data persists | P2 |
| **PWA + Backend** | `sqlite-wasm` | Custom API | Install as PWA → add student offline → connect to WiFi → verify sync | P3 |

---

## 13. Risks & Mitigations (Revised)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 1,672 TS errors take > 2 weeks to fix | Medium | High | Stub broken pages with "Coming Soon" UI; fix core pages first. Do not let perfection block progress. |
| AppDataContext refactor breaks existing modules | Medium | High | Write integration tests for each module's data hook BEFORE refactoring. Ensure backward-compatible API. |
| Dual navigation mode still has re-render bugs | Medium | Medium | Add React DevTools Profiler checks. If still buggy after Week 2, disable fullwidth mode as default but keep code. |
| Electron build is complex | Medium | Medium | Use `electron-vite` or `electron-builder`. Test on Windows, macOS, Linux. |
| PouchDB sync with CouchDB has conflict issues | Medium | Medium | Use `local-wins` for user-generated data, `server-wins` for admin-configured data. Add conflict resolution UI. |
| Backend API sync queue grows too large | Low | Medium | Set queue max size (10,000). Alert user when queue is full. Provide "Force Sync Now" button. |
| Mobile UX is poor | Medium | High | Test on actual devices at Week 6. Use Chrome DevTools device emulation daily. |
| Report generation is slow | Medium | Medium | Paginate reports. Use web workers for large datasets. Cache generated reports. |
| Module independence breaks during cross-module data needs | Low | High | Use `useSharedData()` hook for read-only access. Document shared entity contract. Test with modules enabled/disabled. |
| i18n translation gaps | Medium | Low | Use English as fallback. Add translation keys as TODOs. Crowdsource translations post-launch. |

---

## 14. Appendix: Elimikasasa Screenshots (Captured)

- `screenshots/dashboard_02.png` — Dashboard with sidebar navigation (8 top-level items visible)
- `screenshots/students_list.png` — Students page with filter dropdowns, action buttons, and table
- `screenshots/classes_page.png` — Classes settings with onboarding banner and add button

### UX Patterns Observed from Screenshots

1. **Clean blue primary color** (`#2563EB`) with white cards and light gray background.
2. **Collapsed sidebar by default** on dashboard, expands on hover or click.
3. **Table header actions** are right-aligned buttons: CSV, PDF, Import, Add.
4. **Filter dropdowns** are left of the search bar, using a button group style.
5. **Status badges** use colored pills (green for active, yellow for pending, red for overdue).
6. **Empty states** are minimal — just a "No data" message with a primary action button.
7. **Onboarding banner** is a full-width card at the top of the content area, with a soft gradient background and clear CTA buttons.
8. **Pagination** is simple: Previous / Next with page numbers.
9. **User profile** in the sidebar bottom shows avatar, name, email, and role.
10. **AI help widget** is a floating action button at the bottom-right, with a chat interface.

---

## 15. Appendix: Data Schema Quick Reference (Preserved)

### Core Entities (Must be production-ready across all deployment targets)

```
schools (1 record per deployment)
  └─ academic_years (1 active per school)
      └─ school_periods (terms: Term 1, Term 2, Term 3)
          └─ exam_sessions (Mid-Term, End-Term)

staff
  └─ departments
  └─ designations
  └─ teacher_subject_assignments (links staff → subjects → class_streams)
  └─ class_streams (as class_teacher_id)

classes
  └─ class_streams
      └─ students (via current_class_stream_id)
      └─ subjects (via class_subject_allocations)

students
  └─ student_attendance
  └─ student_exam_results
  └─ student_subject_enrollments
  └─ student_invoices
  └─ student_payments

subjects
  └─ subject_papers
      └─ exam_paper_settings (per exam session)

fee_templates
  └─ fee_template_items
      └─ student_invoices (generated from template)
          └─ student_payments
```

### Entity Relationships (Foreign Keys — Enforced at Application Level)

| Child Entity | Parent Entity | Field | Cascade |
|--------------|--------------|-------|---------|
| class_streams | classes | class_id | Block delete if streams exist |
| students | class_streams | current_class_stream_id | Set null on stream delete (prompt transfer) |
| teacher_subject_assignments | staff | teacher_id | Delete on staff delete |
| teacher_subject_assignments | class_streams | class_stream_id | Delete on stream delete |
| teacher_subject_assignments | subjects | subject_id | Delete on subject delete |
| student_exam_results | students | student_id | Delete on student delete |
| student_exam_results | exam_sessions | exam_session_id | Block delete if results exist |
| student_exam_results | subject_papers | subject_paper_id | Block delete if results exist |
| student_invoices | students | student_id | Block delete if invoices exist (or archive) |
| student_payments | student_invoices | invoice_id | Block delete if payments exist |
| exam_sessions | school_periods | school_period_id | Block delete if sessions exist |
| exam_paper_settings | exam_sessions | exam_session_id | Delete on session delete |
| exam_paper_settings | subject_papers | subject_paper_id | Block delete if settings exist |

---

## 16. Success Criteria for Production Readiness

### 16.1 Must Have (P0 — Block Launch)

- [ ] `npm run build` passes with 0 TypeScript errors
- [ ] `npm run build` produces working bundles for: web (Vite), Electron (desktop), PWA (service worker)
- [ ] All 5 core workflows (Classes, Students, Staff, Subjects, Exams) are end-to-end functional
- [ ] Data persists across sessions for: SQLite file, SQLite WASM (OPFS), PouchDB (IndexedDB)
- [ ] Navigation works in both standard and fullwidth modes without crashes or 404s
- [ ] All list pages have: search, filter, sort, pagination, export CSV, export PDF
- [ ] All forms have: validation, inline error messages, required field indicators, cancel/reset buttons
- [ ] Student admission wizard is functional: 5 steps, photo upload, guardian details, class assignment, documents, review
- [ ] Staff wizard is functional: 5 steps, employment details, teaching assignments, account creation
- [ ] Marks entry is functional: inline editing, auto-save draft, submit for verification, auto-grade
- [ ] Fee invoicing is functional: template creation, bulk generation, payment recording, balance calculation
- [ ] Daily attendance is functional: roll call grid, quick mark all present, absence reason, auto-save
- [ ] Reports are functional: at least 5 reports (Student Masterlist, Exam Gazette, Fee Collection, Attendance Summary, Staff Directory) with PDF export
- [ ] RBAC is functional: at least 3 roles (Admin, Teacher, Bursar) with different permissions
- [ ] Audit log is functional: tracks all CREATE, UPDATE, DELETE operations with user, timestamp, and entity
- [ ] Database backup/restore is functional: export to JSON, import from JSON, with validation
- [ ] Mobile responsive: all pages usable on 375px width (iPhone SE)

### 16.2 Should Have (P1 — Post-Launch Priority)

- [ ] PouchDB sync with CouchDB works bidirectionally between two browser instances
- [ ] Backend API sync works: offline queue, auto-sync on reconnect, conflict resolution UI
- [ ] ERPNext integration: sync students, staff, and financial data
- [ ] SMS campaign: send fee reminders, absence alerts, exam results to parents
- [ ] Student portal: students can view results, attendance, fees, timetable
- [ ] Parent portal: parents can view child's results, attendance, fees, pay online
- [ ] Auto-SMS: absence alert sent within 30 minutes of marking absent
- [ ] Multi-school: single deployment can manage multiple schools (tenancy)
- [ ] AI assistant: integrated help chat using Gemini API
- [ ] Advanced analytics: predictive analytics for student performance, early warning system

### 16.3 Nice to Have (P2 — Future Roadmap)

- [ ] Livestore real-time sync with Cloudflare
- [ ] Video conferencing integration (for online classes)
- [ ] Biometric attendance (fingerprint/face recognition)
- [ ] Mobile app (React Native or Flutter)
- [ ] AI-powered grading (OCR for handwritten marks)
- [ ] Blockchain-based certificate verification
- [ ] Integration with national education systems (e.g., Kenya's NEMIS)
- [ ] Multi-currency support for international schools
- [ ] Parent mobile app with push notifications
- [ ] Teacher mobile app for attendance and marks entry

---

**End of Improved Spec v2.0**
