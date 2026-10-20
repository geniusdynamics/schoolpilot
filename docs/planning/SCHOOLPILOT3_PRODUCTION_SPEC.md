# SchoolPilot3 Production Readiness Improvement Spec

**Date:** 2025-07-01  
**Reference Systems:** elimikasasa.co.ke (competitor analysis) vs. schoolpilot3 (current codebase)  
**Goal:** Transform schoolpilot3 from a feature-rich but partially-integrated prototype into a production-ready, coherent, and cohesive school management system.

---

## 1. Executive Summary

SchoolPilot3 is a React/TypeScript/Vite application with a sophisticated modular architecture, 10+ domain modules, 40+ database collections, and a dual-mode data layer (SQLite/PouchDB/mock). However, it suffers from:

- **1,672+ TypeScript errors** (primarily in inventory and library modules)
- **Fragmented navigation** with 30+ deprecated routes and a confusing hub-and-spoke/tabbed hybrid
- **Over-engineered data layer** with 5 competing persistence strategies (SQLite, PouchDB, Livestore, RxDB, mock)
- **UI inconsistency** — multiple layout systems (Layout vs LayoutNew), sidebar variants, and form paradigms
- **No clear production onboarding path** — a new school admin cannot simply "add classes → add students → add teachers → start teaching"

Elimikasasa.co.ke demonstrates a cleaner, more focused UX: a collapsible sidebar with 8-10 top-level modules, filtered data tables with clear action buttons (CSV/PDF/Import/Admit), and an onboarding wizard feel ("Let's get your school up and running"). SchoolPilot3 must converge toward this clarity while retaining its deeper feature set.

---

## 2. Competitor Analysis: Elimikasasa.co.ke

### 2.1 Navigation Structure (Clean & Hierarchical)

```
Dashboard
  ├─ System Overview
  ├─ Academic Analytics
  ├─ Financial Analytics
  ├─ Attendance Analytics
  ├─ Automated Insights
  └─ Benchmarking

Students Manager
  ├─ Students List
  ├─ Transferred List
  ├─ Class List
  ├─ Alumni List
  ├─ Attendance Sheet
  ├─ Attendance Report
  ├─ ID Cards
  └─ Student Clearance

Staff Manager
Academic Manager
Timetable
Online Classes
Library Manager
Finance
Pocket Money
Payroll
Inventory
Transport
Communication
System Settings
  ├─ School Profile
  ├─ Classes
  ├─ User Management
  ├─ Roles & Permissions
  ├─ Database Backup
  ├─ System Audit
  ├─ Billing & Payments
  ├─ My Profile
  └─ User Manual
```

**Key UX Patterns Observed:**
- **Single-level depth** — Most modules expand to show 4-8 sub-items; no deeper nesting.
- **Persistent filters** — Students page has `All Classes`, `All Gender`, `All Category` dropdowns + search.
- **Prominent actions** — "Admit Pupil", "Import", "CSV", "PDF" buttons are visible above the table.
- **Table-centric** — Data is presented in clean tables with pagination (Previous/Next).
- **Onboarding nudges** — The Classes page shows a dismissible banner: "Let's get your school up and running" with quick links to "Add Staff" and "Add Students Now".
- **Search-first** — Global search bar: "Search name, admission no, NEMIS..."
- **Contextual help** — Fixed "Ask Chris" AI chat widget at bottom-right.

### 2.2 Page-Level Workflows (Elimikasasa)

#### Students List
1. **Arrival:** Sidebar → Students Manager → Students List
2. **View:** Filterable, paginated table of all students.
3. **Filter:** Class dropdown, Gender dropdown, Category dropdown, free-text search.
4. **Actions:**
   - Admit Pupil → Opens a multi-step form (admission details, guardian info, academic history, documents).
   - Import → Bulk CSV/Excel upload with column mapping.
   - Export → CSV or PDF download of current filtered view.
   - Click row → Student profile page (bio, academics, attendance, fees, discipline).
5. **Bulk:** Checkbox selection → bulk promote, transfer, or delete.

#### Classes (System Settings)
1. **Arrival:** Sidebar → System Settings → Classes
2. **View:** Table of classes with stream count and enrollment.
3. **Action:** Add Class → Modal form (class name, section, capacity, class teacher, room number).
4. **Streams:** Click class → expand/add streams (stream name, class teacher).
5. **Onboarding:** Banner prompts to add staff and students if counts are zero.

#### Staff Manager
1. **Arrival:** Sidebar → Staff Manager
2. **View:** Table of teaching and non-teaching staff.
3. **Filter:** Department, designation, status.
4. **Action:** Add Staff → Form (personal details, employment details, qualifications, documents, login credentials).
5. **Assignment:** Link staff to subjects, classes, or departments.

---

## 3. Current SchoolPilot3 State Assessment

### 3.1 Architecture Inventory

| Layer | Technology | Status |
|-------|------------|--------|
| Framework | React 19 + TypeScript | ✅ Active |
| Build Tool | Vite 6 | ✅ Active |
| Styling | Tailwind CSS 3 | ✅ Active |
| Routing | React Router DOM 6 | ✅ Active |
| UI Components | Custom + MUI 5 | ⚠️ Mixed (custom + MUI hybrid) |
| State | Context + Zustand | ⚠️ Overlapping stores |
| Data Layer | SQLite / PouchDB / Livestore / RxDB / Mock | ❌ **Chaos — 5 strategies** |
| i18n | i18next (EN, FR, RW, SW) | ✅ Good coverage |
| Charts | Recharts | ✅ Available |
| Icons | Heroicons + Lucide + Custom | ⚠️ Three icon sets |
| Tests | Vitest | ⚠️ Partial |

### 3.2 Module Inventory (10 Registered Modules)

| Module | Pages | Data Hooks | Schema | Status |
|--------|-------|-----------|--------|--------|
| **core** | Login, error pages | — | — | ✅ Functional |
| **dashboard** | Dashboard | — | — | ✅ UI shell |
| **administration** | ~30 pages | 15+ hooks | ✅ Complete | ⚠️ Heavy; some pages stubs |
| **academics** | ~25 pages | 12+ hooks | ✅ Complete | ⚠️ Exam flow complex but present |
| **admissions** | ~8 pages | 2 hooks | ✅ Partial | ⚠️ Application flow exists |
| **finance** | ~25 pages | 15+ hooks | ✅ Complete | ⚠️ Invoicing needs integration test |
| **hr** | ~6 pages | 5 hooks | ✅ Complete | ⚠️ Payroll is thin |
| **inventory** | ~15 pages | 8 hooks | ❌ Broken | ❌ **100+ TS errors** |
| **library** | ~10 pages | 4 hooks | ❌ Broken | ❌ **100+ TS errors** |
| **nutrition** | ~10 pages | 6 hooks | ✅ Complete | ⚠️ Wallet not wired |
| **portal** | ~8 pages | 1 hook | ✅ Partial | ⚠️ Mostly static |
| **reports** | ? | ? | ? | ❌ Not assessed |
| **settings** | ~5 hub pages | — | — | ✅ Present |

### 3.3 Build Health

- **TypeScript errors:** 1,672 (per `tsc-errors-summary.txt`)
- **Primary culprits:** `library/pages/*`, `inventory/pages/*`, `inventory/services/*`
- **Error patterns:** Missing imports, unused variables (TS6133), incorrect type references, missing module exports
- **Build script:** `npm run build` — likely fails due to TS errors in strict mode
- **Lint:** ESLint configured but not enforced in CI

### 3.4 Data Layer Diagnosis (Critical Issue)

The project has **five competing data persistence strategies**:

1. **SQLite (OPFS / better-sqlite3)** — Development mode, persistent file-based storage
2. **PouchDB (IndexedDB)** — Production mode, CouchDB sync protocol
3. **Livestore (WASM SQLite)** — Experimental, reactive sync via Cloudflare
4. **RxDB (Observables)** — Originally planned, now partially removed
5. **Mock Data (in-memory)** — Demo mode, resets on refresh

**Problems:**
- Each module has its own `data/useXData.ts` hook that may call different backends.
- The `AppDataContext` is a 1,789-line monster trying to unify all of them.
- Collection schemas are duplicated between RxDB-style and "database-agnostic" formats.
- No single source of truth for whether data persists or not.
- The `UnifiedDatabaseManager` is a singleton attempting to bridge all strategies, creating fragile runtime behavior.

### 3.5 Navigation Diagnosis

Current schoolpilot3 navigation has:
- **30+ deprecated routes** that redirect to hub pages with query params (`?tab=...`)
- **Two layout systems:** `Layout` (legacy sidebar + tabbed workspace) and `LayoutNew` (new tab system, feature-flagged)
- **Tabbed workspace:** Complex state management for tabs, sub-tabs, and overflow menus
- **Hub-and-spoke pattern:** Individual pages consolidated into hub pages with 4-6 tabs each

**Problems:**
- The URL structure is unstable (`/administration/students/bulk-ops?tab=data-import` is not bookmarkable).
- Users cannot deep-link to specific sub-pages easily.
- The tab system causes re-render loops and performance issues (evidenced by `TabNavigation.test.tsx` and `RenderLoopPrevention.test.tsx`).
- Sidebar has too many top-level items; no clear visual hierarchy.

---

## 4. Detailed Improvement Spec

### 4.1 Phase 0: Stabilize — Fix Build & Data Layer (Week 1-2)

#### 4.1.1 Fix TypeScript Errors (P0)
- **Scope:** `library/*` and `inventory/*` modules
- **Actions:**
  1. Run `npx tsc --noEmit` and capture all TS6133 (unused variable) errors.
  2. Auto-fix with `eslint --fix` or targeted `tsconfig` relaxation for those modules temporarily.
  3. For genuine type errors, add `// @ts-expect-error` with a ticket reference to unblock the build.
  4. **Goal:** `npm run build` must pass with zero errors before any new feature work.

#### 4.1.2 Consolidate Data Layer to ONE Strategy (P0)
- **Decision:** Pick **PouchDB + IndexedDB** for production and **SQLite (WASM/OPFS)** for development.
- **Rationale:**
  - PouchDB provides offline-first, sync, and is already a dependency.
  - SQLite OPFS gives fast local development with persistent data.
  - Livestore and RxDB are over-engineered for a single-tenant school app; remove them.
- **Actions:**
  1. Remove `@livestore/*` and `rxdb` dependencies from `package.json`.
  2. Delete `src/services/rxdbService.ts` and all RxDB-specific schemas.
  3. Simplify `AppDataContext` to wrap only PouchDB (production) or SQLite (dev).
  4. Ensure all `useXData` hooks call the same underlying `db.collection('students').find()` API.
  5. Create a `DatabaseAdapter` interface with two implementations: `PouchDBAdapter` and `SQLiteAdapter`.
  6. **Mock mode** becomes a thin in-memory wrapper around the same adapter interface, not a separate code path.

#### 4.1.3 Standardize Icon Set (P0)
- **Decision:** Use **Lucide React** exclusively.
- **Actions:** Remove `@heroicons/react` and custom icon wrappers; map all existing icons to Lucide equivalents.

---

### 4.2 Phase 1: Navigation & UX Foundation (Week 2-3)

#### 4.2.1 Simplify Navigation to Match Elimikasasa Pattern

**New Sidebar Structure (8 top-level items):**

```
📊 Dashboard
   ├─ Overview
   ├─ Academic Analytics
   ├─ Financial Analytics
   └─ Attendance Analytics

🎓 Academics
   ├─ Subjects
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

**Actions:**
1. Remove all deprecated routes and redirects. Each module definition should have only the new navigation items.
2. Collapse the "hub-and-spoke" tabbed pages into **simple, dedicated routes**:
   - `/students` → Student List
   - `/students/admissions` → Admissions
   - `/students/attendance` → Attendance
   - `/academics/classes` → Classes & Streams
   - `/academics/exams` → Exams & Grading
3. Eliminate the `LayoutNew` vs `Layout` split. Choose **one** layout (the simpler `Layout` with a standard sidebar + main content area) and remove the feature flag.
4. Remove the tabbed workspace system entirely. It is over-engineered for a school ERP. Use standard browser tabs + React Router for navigation.
5. Add a **global search bar** in the header (like Elimikasasa) that searches students, staff, and classes.

#### 4.2.2 Standardize Page Layout

Every list page must follow this exact template:

```
┌─────────────────────────────────────────────┐
│ Page Title                          [Add] │  ← H1 + Primary action button
├─────────────────────────────────────────────┤
│ [Search...] [Filter ▼] [Filter ▼] [Export ▼] │  ← Filter bar
├─────────────────────────────────────────────┤
│ □ Name      Class   Stream  Gender  Status │  ← DataTable
│ □ John Doe  Form 1  A       Male    Active  │
│ ...                                         │
├─────────────────────────────────────────────┤
│ Showing 1-25 of 340        [Previous] [Next] │  ← Pagination
└─────────────────────────────────────────────┘
```

**Actions:**
1. Create a `StandardListPage` wrapper component that accepts:
   - `title`, `columns`, `data`, `filters`, `onAdd`, `onSearch`, `onExportCSV`, `onExportPDF`
2. Refactor `StudentsListPage`, `StaffListPage`, `ClassesPage` to use this wrapper.
3. Ensure all tables have sorting, filtering, and pagination built-in.

#### 4.2.3 Onboarding Wizard for New Schools

When a school has zero students, zero staff, and zero classes, show a **dismissible onboarding banner**:

```
┌─────────────────────────────────────────────┐
│ 🎉 Let's get your school up and running!   │
│                                              │
│ [Add Classes] [Add Staff] [Add Students] [✕] │
└─────────────────────────────────────────────┘
```

**Actions:**
1. Add a `useOnboarding` hook that checks if `students.length === 0 && staff.length === 0 && classes.length === 0`.
2. Show the banner on Dashboard, Students, Staff, and Classes pages.
3. Track dismissal in `localStorage` so it doesn't reappear every session.

---

### 4.3 Phase 2: Core Entity Workflows (Week 3-5)

These are the **must-have** workflows for any school to go live. Each must be fully functional end-to-end: create → list → edit → delete → view detail → reports.

#### 4.3.1 Workflow: Class & Stream Setup

**Precondition:** School profile and academic year are configured.

**Steps:**
1. **Admin navigates to:** Academics → Classes & Streams
2. **Views:** Table of classes with columns: Name, Section, Capacity, Room, Class Teacher, Stream Count, Student Count.
3. **Add Class:**
   - Form fields: `Class Name*` (e.g., "Form 1"), `Section` (e.g., "Upper"), `Capacity`, `Room Number`, `Class Teacher` (dropdown of staff).
   - Validation: Name required, capacity must be > 0.
   - On save: class appears in table immediately.
4. **Add Stream to Class:**
   - Click row → expand or open detail page.
   - "Add Stream" button.
   - Form fields: `Stream Name*` (e.g., "A", "B", "Red"), `Class Teacher` (optional override).
   - Validation: Stream name unique per class.
5. **Auto-creation:** "Bulk Create Streams" → select multiple classes, specify stream names (e.g., A, B, C), auto-generate.
6. **Data Integrity:** Deleting a class with enrolled students must be blocked or trigger a transfer workflow.

**SchoolPilot3 Implementation Notes:**
- The `ClassesPage.tsx` already has a hub-tab pattern with `ClassesContent` and `BulkStreamCreationContent`. 
- **Action:** Simplify to a single page `/academics/classes` with a master-detail view: left panel = class list, right panel = selected class details + streams table.
- Reuse `useAdministration()` hook which already exposes `classes`, `classStreams`, `addClass`, `addClassStream`, etc.
- Ensure the class teacher dropdown is populated from `staff` collection.

#### 4.3.2 Workflow: Student Admission & Enrollment

**Precondition:** Classes and streams exist.

**Steps:**
1. **Admin navigates to:** Students → Student List
2. **Admit Student:**
   - **Step 1 (Personal Details):** Admission No.*, First Name*, Middle Name, Last Name*, Gender*, Date of Birth, Admission Date, Religion, County, UPI No., Primary School Attended, KCPE Marks (if applicable).
   - **Step 2 (Guardian Details):** Guardian Name, Relationship (Father/Mother/Guardian), Phone, Email, Occupation, Address.
   - **Step 3 (Academic Assignment):** Class* (dropdown), Stream* (dropdown filtered by class), Dormitory (dropdown), Student Category (dropdown: Day/Boarding/Scholarship), House (dropdown).
   - **Step 4 (Documents):** Photo upload, Birth certificate, Previous school report, Medical form.
   - **Step 5 (Review):** Summary of all data → Submit.
3. **Auto-generated fields:** Student ID, display name, login credentials (if portal access enabled).
4. **Post-admission:** Student appears in Student List, Class Roll Call, and Attendance sheets immediately.
5. **Bulk Import:** CSV/Excel upload with template download. Map columns: Name, Admission No, Class, Stream, Gender, DOB, Guardian Phone.
6. **Search/Filter:** Search by name, admission no, UPI, class, stream, gender, status.
7. **Actions per row:** View, Edit, Quick Edit (status/class/stream only), Delete, Print ID Card, View Report Card.

**SchoolPilot3 Implementation Notes:**
- `StudentsListPage.tsx` already has a tabbed form with Personal, Guardian, Academic tabs. 
- **Action:** Convert from modal dialog to a **dedicated route** `/students/add` using a `WizardForm` component (already exists in `components/ui/forms/WizardForm.tsx`).
- The `useAppData` hook already provides `addStudent`, `updateStudent`, `deleteStudent`.
- Ensure `current_class_stream_id` is validated against available `classStreams`.
- Add the **photo upload** field to the form (currently missing).
- Add the **bulk import** feature. Create a `StudentImportPage` that parses CSV and validates each row before saving.

#### 4.3.3 Workflow: Staff (Teacher) Management

**Precondition:** Departments and designations are configured.

**Steps:**
1. **Admin navigates to:** Staff → Staff Directory
2. **Add Staff:**
   - **Step 1 (Personal):** Staff ID*, First Name*, Last Name*, Gender*, DOB, Phone, Email, Address, Photo.
   - **Step 2 (Employment):** Department* (dropdown), Designation* (dropdown: Teacher/Admin/Security/Bursar), Employment Date, Employment Type (Full-time/Part-time/Contract), Salary Grade.
   - **Step 3 (Qualifications):** Highest Qualification, Institution, Year Completed, Certifications (list).
   - **Step 4 (Teaching Assignment):** Subjects taught (multi-select), Classes taught (multi-select), Class Teacher of (dropdown: class+stream), Is Class Teacher? (checkbox).
   - **Step 5 (Account):** Create login account? (checkbox) → Username, Role, Temp Password.
3. **View Staff Detail:** Bio, employment history, qualifications, teaching load, attendance graph, payslip history.
4. **Actions:** Edit, Delete (soft delete), Deactivate, Generate ID Card, View Payslip.

**SchoolPilot3 Implementation Notes:**
- `StaffDirectoryPage` and `StaffListPage` exist but may be thin.
- **Action:** Merge into a single robust `StaffDirectoryPage` with the 5-step wizard form.
- Reuse `useAdministration()` hook which exposes `staff`, `departments`, `designations`.
- Link staff to `subjects` and `class_streams` via the `teacherSubjectAssignments` collection (already in academics schema).
- The `StaffDetailPage` should display teaching assignments pulled from the academics module.

#### 4.3.4 Workflow: Subject & Curriculum Setup

**Precondition:** Classes and streams exist.

**Steps:**
1. **Admin navigates to:** Academics → Subjects
2. **Add Subject:** Name*, Code*, Abbreviation, Department (dropdown), Is Compulsory? (checkbox), Grouping (Sciences/Humanities/Technical/Arts).
3. **Add Subject Papers:** Under each subject, add papers (e.g., "Mathematics Paper 1", "Mathematics Paper 2") with max marks and weight percentage.
4. **Assign Subjects to Classes:** Multi-select grid: rows = classes, columns = subjects, checkboxes = assign.
5. **Assign Teachers to Subjects:** For each class-subject pair, assign a teacher from dropdown.
6. **Student Enrollment:** For each class, assign compulsory subjects automatically. Allow optional subject selection per student.

**SchoolPilot3 Implementation Notes:**
- Subjects hub, class allocations, and teacher assignments already exist in `academics/pages`.
- **Action:** Consolidate the three separate pages (`SubjectsHubPage`, `CurriculumAllocationsPage`, `TeacherSubjectAssignmentPage`) into a **single master-detail page** at `/academics/subjects`:
  - Left panel: Subject list
  - Right panel: Subject detail → Papers tab → Class Assignments tab → Teacher Assignments tab → Student Enrollment tab

#### 4.3.5 Workflow: Exam Setup & Marks Entry

**Precondition:** Subjects, papers, classes, streams, and students are configured.

**Steps:**
1. **Create Exam Session:** Academics → Exams → New Session.
   - Name (e.g., "Mid-Term 1, 2025"), School Period (dropdown), Result Publication Date.
2. **Configure Papers:** For each subject paper in the system, set max marks and weight for this exam session.
3. **Schedule:** Assign dates and invigilators to each paper (optional).
4. **Marks Entry:**
   - Select Exam Session → Select Class/Stream → Select Subject Paper.
   - Table: Student Name | Admission No | Marks | Grade (auto) | Remarks.
   - Bulk entry: Paste from Excel.
   - Save draft → Submit for verification.
5. **Verification:** HoD or Admin reviews marks, approves or rejects with comments.
6. **Results Distribution:** Publish results to student portal, print report cards, send SMS to parents.

**SchoolPilot3 Implementation Notes:**
- Exam session, paper settings, marks entry, and verification pages exist.
- **Action:** Ensure the marks entry page (`MarksEntryPage`) uses the standardized `DataGrid` with inline editing.
- The grading engine (`GradingEngineService`) should auto-calculate grades based on the grading scheme linked to the class's education system.
- Connect the "Publish" action to the portal module so students can view results.

---

### 4.4 Phase 3: Financial & Operational Workflows (Week 5-7)

#### 4.4.1 Fee Structure & Invoicing
1. **Fee Templates:** Create a template per class (e.g., "Form 1 Day Scholar", "Form 1 Boarder"). Items: Tuition, Lunch, Boarding, Activity, Exam.
2. **Bulk Invoicing:** Select academic year + class + stream → generate invoices for all students in that group.
3. **Payments:** Record payments per student (cash, bank, mobile money). Auto-allocate to invoice items.
4. **Reports:** Fees due report, paid report, arrears report, daily collection summary.

#### 4.4.2 Attendance
1. **Daily Roll Call:** Teacher opens class attendance sheet → marks Present/Absent/Late for each student.
2. **Absence Reason:** Optional note for absent students.
3. **Summary:** Admin views attendance percentage per class, per student, per term.
4. **Alerts:** Auto-SMS to parents when student is absent (requires SMS credit integration like Elimikasasa's "Top up SMS").

#### 4.4.3 Communication (SMS/Email)
1. **Templates:** Create message templates (Fee Reminder, Absence Alert, Exam Result, General Notice).
2. **Campaigns:** Select target audience (all parents, specific class, specific students) → send bulk SMS.
3. **Delivery Reports:** Track sent/failed/pending status.

---

### 4.5 Phase 4: Reports & Analytics (Week 7-8)

Every module must have at least **3 standard reports**:

| Module | Report 1 | Report 2 | Report 3 |
|--------|----------|----------|----------|
| Students | Student Masterlist (PDF) | Admission Summary | Transfer/Alumni Report |
| Staff | Staff Directory | Payroll Summary | Teaching Load |
| Academics | Exam Results Gazette | Class Performance Analysis | Subject Analysis |
| Finance | Fees Collection Summary | Arrears Report | Income Statement |
| Attendance | Daily Attendance Sheet | Monthly Summary | Absence Trend |

**Implementation:**
- Use `recharts` for charts (bar, line, pie).
- Use a PDF generation library (e.g., `jspdf` + `html2canvas`) or server-side rendering for professional reports.
- Elimikasasa uses "PDF" button on every list page — replicate this pattern.

---

### 4.6 Phase 5: Production Hardening (Week 8-9)

#### 4.6.1 Authentication & RBAC
- Ensure every route is protected by `ProtectedRoute`.
- Roles: Super Admin, School Admin, Teacher, Bursar, Librarian, Parent, Student.
- Each role has a default set of permissions. Super Admin can customize per user.
- The `academics/rbac.ts` and `administration/rbac.ts` files exist but may not be fully wired to the UI.

#### 4.6.2 Database Backup & Restore
- Add a "Backup Now" button in Settings → Database Backup.
- Export all PouchDB collections to a single JSON file for download.
- Import: upload JSON file → validate → restore.
- Schedule automatic backups (weekly) to cloud storage (optional).

#### 4.6.3 Audit Logging
- Every CREATE, UPDATE, DELETE operation must log: user, timestamp, entity type, entity ID, before/after snapshot.
- The `AuditLoggerService` exists in academics. Move it to core and ensure all data hooks call it.
- Add an Audit Log viewer page in Settings.

#### 4.6.4 Performance
- Virtualize long lists (student list > 500) using `react-window` or `react-virtualized`.
- Lazy-load module pages via `React.lazy()` — already partially done, verify it works.
- Add a loading skeleton for all pages (not just spinners).

#### 4.6.5 Error Handling
- Add a global error boundary that shows a friendly message + "Report Error" button.
- Log errors to Sentry (already configured with `@sentry/react`).
- Ensure no console errors in production builds.

---

## 5. UI/UX Specific Improvements

### 5.1 Color Palette & Typography (Align with Elimikasasa)
- **Primary:** `#2563EB` (blue-600) — Elimikasasa uses a clean blue primary.
- **Secondary:** `#64748B` (slate-500) for neutral elements.
- **Success:** `#10B981` (emerald-500).
- **Warning:** `#F59E0B` (amber-500).
- **Danger:** `#EF4444` (red-500).
- **Background:** `#F8FAFC` (slate-50) for page background, `#FFFFFF` for cards.
- **Typography:** Inter or system-ui. Use consistent font sizes: `text-2xl` for page titles, `text-sm` for table text, `text-xs` for badges.

### 5.2 Form Design
- Use a **2-column grid** for most forms (responsive to 1-column on mobile).
- **Required fields:** Mark with red asterisk `*`.
- **Validation:** Inline validation on blur, not just on submit.
- **Save & Continue:** For wizard forms, show progress stepper at top.
- **Cancel:** Always provide a clear cancel/close button.

### 5.3 Table Design
- **Striped rows** for readability.
- **Hover state** on rows.
- **Sticky header** for long tables.
- **Row actions:** Edit/Delete as icon buttons in the rightmost column; avoid overcrowding.
- **Bulk actions:** Checkbox in header → select all → action bar appears (Delete, Export, Change Status).

### 5.4 Mobile Responsiveness
- Sidebar collapses to hamburger menu on < 768px.
- Tables become horizontal-scroll cards on mobile.
- Forms stack vertically on mobile.
- Touch targets minimum 44px.

---

## 6. Implementation Roadmap (12-Week Sprint Plan)

| Week | Focus | Deliverable | Success Criteria |
|------|-------|-------------|------------------|
| **1** | Build Stabilization | Zero TS errors, `npm run build` passes | Build completes with no errors |
| **2** | Data Layer Consolidation | Single DatabaseAdapter (PouchDB/SQLite) | All CRUD operations work via adapter |
| **3** | Navigation Redesign | New sidebar + route simplification | Navigation has 8 items, no 404s |
| **4** | Class/Stream Workflow | Classes page with master-detail | Create class → add streams → view |
| **5** | Student Workflow | 5-step admission wizard + import | Admit student → appears in list |
| **6** | Staff Workflow | Staff wizard + assignments | Add teacher → assign subjects |
| **7** | Subject/Exam Workflow | Subject setup + marks entry | Create exam → enter marks → grade |
| **8** | Finance Workflow | Fee templates + invoicing + payments | Generate invoice → record payment |
| **9** | Attendance + Communication | Daily roll call + SMS campaigns | Mark attendance → send SMS |
| **10** | Reports Module | 15 standard reports | Export PDF/CSV for each module |
| **11** | Settings + RBAC | Role management + audit log | Create custom role → assign user |
| **12** | Polish + Performance | Mobile QA, error boundaries, docs | Lighthouse score > 80 |

---

## 7. File-Level Action Items

### 7.1 Files to Modify

| File | Action | Priority |
|------|--------|----------|
| `src/modules/*/moduleDefinition.tsx` | Simplify navigation to 4-6 items per module, remove deprecated routes | P0 |
| `src/routing/moduleRoutes.tsx` | Remove deprecated redirect generation, keep only current routes | P0 |
| `src/components/Layout.tsx` | Remove tabbed workspace, keep simple sidebar + main content | P0 |
| `src/components/LayoutNew.tsx` | Delete | P0 |
| `src/components/Sidebar.tsx` | Reduce to 8 top-level items, add collapsible groups | P0 |
| `src/contexts/AppDataContext.tsx` | Replace with simplified DatabaseAdapter wrapper | P0 |
| `src/modules/administration/pages/ClassesPage.tsx` | Convert to master-detail (class list + stream detail) | P1 |
| `src/modules/administration/pages/StudentsListPage.tsx` | Convert from modal to `/students/add` wizard route | P1 |
| `src/modules/administration/pages/StaffDirectoryPage.tsx` | Build 5-step wizard + detail view | P1 |
| `src/modules/academics/pages/SubjectsHubPage.tsx` | Consolidate papers, assignments, enrollment into tabs | P1 |
| `src/modules/academics/pages/MarksEntryPage.tsx` | Add inline editing, bulk paste, auto-grade | P1 |
| `src/modules/finance/pages/FeeTemplatesPage.tsx` | Add template builder UI | P2 |
| `src/modules/finance/pages/InvoiceGenerationPage.tsx` | Add bulk generation by class/stream | P2 |
| `src/modules/finance/pages/StudentPaymentsPage.tsx` | Add payment recording with auto-allocation | P2 |
| `src/modules/administration/pages/StudentAttendancePage.tsx` | Add daily roll call grid | P2 |
| `src/modules/communication/pages/*` | Build SMS campaign builder | P3 |
| `src/modules/reports/pages/*` | Build report templates | P3 |
| `src/modules/settings/pages/*` | Add role editor, audit log viewer | P3 |

### 7.2 Files to Delete

| File | Reason |
|------|--------|
| `src/components/LayoutNew.tsx` | Replaced by simplified Layout |
| `src/components/tabbedWorkspace/*` | Over-engineered, remove |
| `src/services/rxdbService.ts` | RxDB deprecated |
| `src/modules/*/pages/*Page.tsx` (deprecated) | Redirects no longer needed |
| `src/modules/library/pages/*` (broken) | Fix or remove until library module is rebuilt |
| `src/modules/inventory/pages/*` (broken) | Fix or remove until inventory module is rebuilt |
| `src/modules/settings/pages/DatabaseInitializationFallback.tsx` | Obsolete |

### 7.3 New Files to Create

| File | Purpose |
|------|---------|
| `src/services/database/DatabaseAdapter.ts` | Unified interface for SQLite and PouchDB |
| `src/services/database/PouchDBAdapter.ts` | PouchDB implementation |
| `src/services/database/SQLiteAdapter.ts` | SQLite/WASM implementation |
| `src/components/StandardListPage.tsx` | Reusable list page wrapper |
| `src/components/StandardFormPage.tsx` | Reusable form page wrapper |
| `src/components/WizardForm.tsx` | Already exists; enhance and reuse |
| `src/hooks/useOnboarding.ts` | Onboarding banner logic |
| `src/modules/administration/pages/StudentImportPage.tsx` | CSV/Excel import with validation |
| `src/modules/reports/components/ReportBuilder.tsx` | Generic report layout + chart + table |
| `src/modules/reports/services/ReportEngine.ts` | Data aggregation for reports |

---

## 8. Appendix: Elimikasasa Screenshots

The following screenshots were captured during the analysis and are stored in `screenshots/`:

- `dashboard_01.png` / `dashboard_02.png` — Dashboard with sidebar navigation visible
- `students_list.png` — Students page with filters and action buttons
- `classes_page.png` — Classes settings page with onboarding banner

---

## 9. Appendix: Data Schema Quick Reference

### 9.1 Core Entities (Must be production-ready)

```
schools (1 record)
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

### 9.2 Entity Relationships (Foreign Keys)

| Child Entity | Parent Entity | Field |
|--------------|--------------|-------|
| class_streams | classes | class_id |
| students | class_streams | current_class_stream_id |
| teacher_subject_assignments | staff | teacher_id |
| teacher_subject_assignments | class_streams | class_stream_id |
| teacher_subject_assignments | subjects | subject_id |
| student_exam_results | students | student_id |
| student_exam_results | exam_sessions | exam_session_id |
| student_exam_results | subject_papers | subject_paper_id |
| student_invoices | students | student_id |
| student_payments | student_invoices | invoice_id |
| exam_sessions | school_periods | school_period_id |
| exam_paper_settings | exam_sessions | exam_session_id |
| exam_paper_settings | subject_papers | subject_paper_id |

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TypeScript error volume blocks development | High | High | Relax strictness for broken modules, fix incrementally |
| Data layer refactor breaks existing features | High | High | Write integration tests before refactor, keep mock wrapper |
| Over-scoping leads to 12-week delay | Medium | High | Cut Phase 3-5 scope if needed; ship core workflows first |
| Livestore/RxDB removal angers contributors | Low | Medium | Document rationale in CHANGELOG, provide migration guide |
| Mobile UX is poor | Medium | Medium | Test on actual devices at week 6, adjust if needed |
| Report generation performance | Medium | Medium | Paginate reports, use web workers for large datasets |

---

**End of Spec**
