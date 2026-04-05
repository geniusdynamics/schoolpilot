# MISSING FEATURES IMPLEMENTATION PLAN
## SchoolPilot3 Feature Expansion Roadmap

---

## 1. EXECUTIVE SUMMARY

This document outlines the implementation plan for missing features in SchoolPilot3. Based on the architectural decision that:
- All features are frontend-first
- Advanced calculations and logic are handled by plugins (Go WASM engines)
- External integrations (payment gateways, SMS, email) are plugin-based

**Prioritized Features:**

| Priority | Feature | Module | Phase |
|----------|---------|--------|-------|
| 1 | Student & Parent Portal | `portal` | 1 |
| 2 | Online Admissions (Public) | Extend `admissions` | 1 |
| 3 | Online Assignment System | `assignments` | 2 |
| 4 | Lesson Plans & Notes | `lessonplans` | 2 |
| 5 | Teacher Analytics | `analytics` | 3 |
| 6 | Secure Pickup System | `pickup` | 3 |
| 7 | House Points System | `houses` | 3 |

**Timeline:** 14 weeks across 4 phases (~103 development days)

---

## 2. ARCHITECTURAL ALIGNMENT

### 2.1 Module System Compatibility

All new features follow the existing `ModuleDefinition` interface defined in `src/core/types.ts`:

```typescript
interface ModuleDefinition {
  id: string;
  name: string;                    // Translation key
  description?: string;            // Translation key
  icon: React.ComponentType<any>;
  path: string;                    // Base route path
  isActive: boolean;
  version: string;
  dependencies?: string[];         // Module dependencies
  permissions?: Permission[];       // Required permissions
  navigation: NavItem[];           // Sidebar navigation
  features?: string[];             // Feature flags
  routes?: Array<{ path: string; page: string }>;
  settings?: ModuleSettings;
  
  // RBAC integration
  rbacPermissions?: Permission[];
  defaultRoles?: string[];
  requiresAuthentication?: boolean;
  publicAccess?: boolean;          // For public-facing modules
}
```

### 2.2 Plugin Integration Points

External services are handled via plugins:

```
External Services (Plugins)
├── Payment Gateway Plugin
│   └── Interface: PaymentService { initiate(), verify(), callback() }
├── SMS Provider Plugin  
│   └── Interface: SMSService { send(), bulkSend(), template() }
├── Email Provider Plugin
│   └── Interface: EmailService { send(), bulkSend(), template() }
└── Analytics Engine Plugin (Go WASM)
    └── Interface: AnalyticsEngine { calculateMetrics(), generateReport() }
```

### 2.3 Data Layer Strategy

- **Frontend-first:** All CRUD operations via existing hooks (`useDatabaseData`, `useModularMockData`)
- **No backend dependency:** Works with SQLite OPFS, PouchDB, or any configured provider
- **Plugin-extensible:** Complex calculations delegated to plugin engines

---

## 3. FEATURE SPECIFICATIONS

---

### 3.1 STUDENT & PARENT PORTAL (`portal` module)

#### 3.1.1 Overview
Dedicated external-facing module for students and parents to access school information without internal admin access.

#### 3.1.2 Module Definition Location
`src/modules/portal/module.json`

```json
{
  "id": "portal",
  "name": "portal.title",
  "description": "portal.description",
  "path": "/portal",
  "version": "1.0.0",
  "publicAccess": true,
  "requiresAuthentication": true,
  "dependencies": ["administration", "academics", "finance"],
  "features": [
    "student-dashboard",
    "parent-dashboard", 
    "view-attendance",
    "view-results",
    "view-fees",
    "view-announcements",
    "online-payments"
  ],
  "defaultRoles": ["student", "parent", "guardian"],
  "navigation": [
    { "id": "dashboard", "label": "portal.nav.dashboard", "path": "/dashboard" },
    { "id": "attendance", "label": "portal.nav.attendance", "path": "/attendance" },
    { "id": "results", "label": "portal.nav.results", "path": "/results" },
    { "id": "fees", "label": "portal.nav.fees", "path": "/fees" },
    { "id": "announcements", "label": "portal.nav.announcements", "path": "/announcements" }
  ]
}
```

#### 3.1.3 Directory Structure
```
src/modules/portal/
  index.ts
  module.json
  pages/
    LoginPage.tsx
    PortalLayout.tsx
    DashboardPage.tsx
    AttendancePage.tsx
    ResultsPage.tsx
    FeesPage.tsx
    AnnouncementsPage.tsx
    ProfilePage.tsx
  components/
    PortalHeader.tsx
    PortalSidebar.tsx
    StudentCard.tsx
    FeeSummaryCard.tsx
    AttendanceCalendar.tsx
    ResultCard.tsx
    AnnouncementList.tsx
  data/
    types.ts
    schema.ts
    usePortalData.ts
  hooks/
    usePortalAuth.ts
    useStudentAccess.ts
    useParentAccess.ts
  i18n/
    en/portal.json
    fr/portal.json
  styles/
    portal.css
```

#### 3.1.4 Data Types
`src/modules/portal/data/types.ts`

```typescript
export enum PortalUserType {
  STUDENT = 'student',
  PARENT = 'parent',
  GUARDIAN = 'guardian'
}

export interface PortalUser {
  id: string;
  userType: PortalUserType;
  email: string;
  phone?: string;
  profileImage?: string;
  
  // For parents - linked students
  linkedStudents?: string[];
  
  // For students
  studentId?: string;
  className?: string;
  streamName?: string;
}

export interface PortalAnnouncement {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'academic' | 'event' | 'urgent';
  publishedAt: string;
  publishedBy: string;
  validFrom?: string;
  validUntil?: string;
  attachments?: string[];
}

export interface PortalFeeSummary {
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  totalBilled: number;
  totalPaid: number;
  balance: number;
  recentPayments: PortalPayment[];
  pendingInvoices: PortalInvoice[];
}
```

#### 3.1.5 User Stories

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| P-US-01 | As a parent, I want to log in with my credentials so I can access my portal | Auth via existing AuthContext; redirects to portal dashboard |
| P-US-02 | As a parent, I want to see all my enrolled children | Cards showing each child's photo, class, status |
| P-US-03 | As a parent, I want to view attendance records for each child | Monthly calendar with present/absent/late markers |
| P-US-04 | As a parent, I want to view exam results for my child | Results grouped by exam session with grades |
| P-US-05 | As a parent, I want to see fee statements and make payments | Invoice list with balances; payment button triggers plugin |
| P-US-06 | As a student, I want to view my own records | Student dashboard with their data only |
| P-US-07 | As a user, I want to receive announcements | Chronological list with filtering by category |
| P-US-08 | As a parent, I want to update my contact information | Edit form with phone/email fields |

#### 3.1.6 RBAC Extensions
`src/rbac/types.ts`

```typescript
export const PORTAL_ROLES = {
  STUDENT_PORTAL: 'student-portal',
  PARENT_PORTAL: 'parent-portal',
  GUARDIAN_PORTAL: 'guardian-portal'
};

export const PORTAL_RESOURCES = {
  OWN_RECORDS: 'own-records',
  CHILDREN_RECORDS: 'children-records',
  FINANCIAL_RECORDS: 'financial-records',
  ANNOUNCEMENTS: 'announcements',
  PROFILE: 'profile'
};

export const PORTAL_PERMISSIONS = {
  READ_OWN_ATTENDANCE: 'read:own-attendance',
  READ_OWN_RESULTS: 'read:own-results',
  READ_CHILDREN_ATTENDANCE: 'read:children-attendance',
  READ_CHILDREN_RESULTS: 'read:children-results',
  READ_FINANCIALS: 'read:financials',
  MAKE_PAYMENT: 'make:payment',
  READ_ANNOUNCEMENTS: 'read:announcements',
  UPDATE_PROFILE: 'update:profile'
};
```

#### 3.1.7 Tasks
| Task | Files | Effort |
|------|-------|--------|
| Create module directory structure | `src/modules/portal/*` | 0.5d |
| Define portal types and schemas | `data/types.ts`, `data/schema.ts` | 1d |
| Create portal data hooks | `hooks/usePortalData.ts` | 2d |
| Build portal layout component | `components/PortalLayout.tsx` | 1d |
| Implement portal login page | `pages/LoginPage.tsx` | 1d |
| Build parent dashboard | `pages/DashboardPage.tsx` | 2d |
| Build student dashboard | `pages/DashboardPage.tsx` (variant) | 1d |
| Create attendance page | `pages/AttendancePage.tsx` | 1.5d |
| Create results page | `pages/ResultsPage.tsx` | 1.5d |
| Create fees page with payment plugin slot | `pages/FeesPage.tsx` | 2d |
| Create announcements page | `pages/AnnouncementsPage.tsx` | 1d |
| Add RBAC permissions | `rbac/types.ts`, `rbac/service.ts` | 1d |
| Add i18n strings | `i18n/en/portal.json` | 0.5d |
| **Total** | | **16d** |

---

### 3.2 ONLINE ADMISSIONS - PUBLIC FACING (Extend `admissions`)

#### 3.2.1 Overview
Public-facing application page that allows prospective parents to submit applications online without admin credentials.

#### 3.2.2 Module Updates
Update `src/modules/admissions/module.json`:

```json
{
  "publicAccess": true,
  "features": [
    "public-application",
    "application-tracking"
  ],
  "navigation": [
    { "id": "apply", "label": "admissions.nav.apply", "path": "/apply", "public": true },
    { "id": "track", "label": "admissions.nav.track", "path": "/track", "public": true }
  ]
}
```

#### 3.2.3 New Pages
```
src/modules/admissions/pages/
  PublicApplicationPage.tsx      // New - public form
  ApplicationTrackingPage.tsx    // New - check status
  ApplicationFormPage.tsx        // Existing - adapt for public
  ApplicationDetailPage.tsx      // Existing
  ApplicationsListPage.tsx       // Existing - admin only
```

#### 3.2.4 User Stories

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| OA-US-01 | As a prospective parent, I want to access the application form from anywhere | Public URL accessible without login |
| OA-US-02 | As a parent, I want to fill the form across multiple sessions | Form data saved as draft |
| OA-US-03 | As a parent, I want to upload required documents | File upload for birth cert, photos |
| OA-US-04 | As a parent, I want to track my application status | Application reference + status view |
| OA-US-05 | As admin, I want to configure application periods | Enable/disable application windows |
| OA-US-06 | As a parent, I want to receive status updates | Email notification on status change (via plugin) |

#### 3.2.5 Tasks
| Task | Files | Effort |
|------|-------|--------|
| Create public application page | `pages/PublicApplicationPage.tsx` | 3d |
| Create application tracking page | `pages/ApplicationTrackingPage.tsx` | 1.5d |
| Implement draft save functionality | `hooks/useApplicationDraft.ts` | 2d |
| Add document upload component | `components/DocumentUploader.tsx` | 2d |
| Implement application period config | `pages/ApplicationSettingsPage.tsx` | 1.5d |
| Add notification trigger hooks | `hooks/useApplicationNotifications.ts` | 1d |
| Update RBAC for public access | `rbac/service.ts` | 0.5d |
| **Total** | | **11.5d** |

---

### 3.3 ONLINE ASSIGNMENT SYSTEM (`assignments` module)

#### 3.3.1 Overview
Create, distribute, submit, and grade student assignments. Integrated with existing subject and class structures.

#### 3.3.2 Module Definition
`src/modules/assignments/module.json`

```json
{
  "id": "assignments",
  "name": "assignments.title",
  "description": "assignments.description",
  "path": "/assignments",
  "version": "1.0.0",
  "dependencies": ["administration", "academics"],
  "features": [
    "create-assignment",
    "submit-assignment",
    "grade-assignment",
    "assignment-analytics"
  ],
  "navigation": [
    { "id": "assignments", "label": "assignments.nav.list", "path": "/list" },
    { "id": "create", "label": "assignments.nav.create", "path": "/create" }
  ]
}
```

#### 3.3.3 Directory Structure
```
src/modules/assignments/
  index.ts
  module.json
  pages/
    AssignmentsListPage.tsx
    CreateAssignmentPage.tsx
    AssignmentDetailPage.tsx
    GradeAssignmentsPage.tsx
    MyAssignmentsPage.tsx          // Student view
    SubmitAssignmentPage.tsx       // Student view
  components/
    AssignmentCard.tsx
    SubmissionItem.tsx
    GradeForm.tsx
    FileUpload.tsx
    DueDatePicker.tsx
  data/
    types.ts
    schema.ts
    useAssignmentData.ts
  hooks/
    useAssignmentWorkflow.ts
    useSubmissionUpload.ts
```

#### 3.3.4 Data Types
`src/modules/assignments/data/types.ts`

```typescript
export enum AssignmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  GRADED = 'graded'
}

export enum SubmissionStatus {
  NOT_SUBMITTED = 'not_submitted',
  SUBMITTED = 'submitted',
  LATE = 'late',
  GRADED = 'graded',
  RETURNED = 'returned'
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  
  // Linkage
  subjectId: string;
  subjectName?: string;
  classStreamIds: string[];
  classStreamNames?: string[];
  
  // Metadata
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  
  // Timing
  publishedAt?: string;
  dueDate: string;
  allowLateSubmission: boolean;
  latePenaltyPercent?: number;
  
  // Grading
  totalPoints: number;
  hasGrading: boolean;
  
  // Attachments
  attachments?: AssignmentAttachment[];
  
  // Status
  status: AssignmentStatus;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  
  // Submission content
  content?: string;
  attachments?: SubmissionAttachment[];
  
  // Timing
  submittedAt: string;
  isLate: boolean;
  
  // Grading
  status: SubmissionStatus;
  pointsAwarded?: number;
  percentScore?: number;
  grade?: string;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  
  // Grading rubric
  rubricScores?: RubricScore[];
}

export interface AssignmentAttachment {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'image' | 'document' | 'video' | 'audio';
  size: number;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
}

export interface RubricScore {
  criterionId: string;
  pointsAwarded: number;
  comments?: string;
}
```

#### 3.3.5 User Stories

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| ASG-US-01 | As a teacher, I want to create assignments with title, description, and attachments | Form with all fields; file upload support |
| ASG-US-02 | As a teacher, I want to assign to specific classes | Multi-select class streams |
| ASG-US-03 | As a teacher, I want to set due dates and late policies | Date picker; penalty percentage field |
| ASG-US-04 | As a teacher, I want to attach resources (worksheets, reading) | Multiple file attachments |
| ASG-US-05 | As a student, I want to view my assignments | List filtered by my class enrollments |
| ASG-US-06 | As a student, I want to submit work online | Text entry or file upload |
| ASG-US-07 | As a teacher, I want to grade submissions | Bulk grading view; points and feedback |
| ASG-US-08 | As a student, I want to see my grades and feedback | Submission detail with rubric breakdown |
| ASG-US-09 | As a parent, I want to see my child's assignments | Via parent portal integration |
| ASG-US-10 | As a teacher, I want to reuse assignment templates | Save as template; load from template |

#### 3.3.6 Integration with Existing Modules

| Dependency | Integration Point |
|------------|-------------------|
| `academics` | Subject list, class-stream enrollment, results storage |
| `administration` | Student list, teacher records |
| `portal` | Parent/student viewing of assignments |

#### 3.3.7 Tasks
| Task | Files | Effort |
|------|-------|--------|
| Create module structure | `src/modules/assignments/*` | 0.5d |
| Define assignment types/schemas | `data/types.ts`, `data/schema.ts` | 1d |
| Create data hooks | `hooks/useAssignmentData.ts` | 2d |
| Build assignments list page | `pages/AssignmentsListPage.tsx` | 2d |
| Build create assignment page | `pages/CreateAssignmentPage.tsx` | 3d |
| Build assignment detail page | `pages/AssignmentDetailPage.tsx` | 1.5d |
| Build grading page | `pages/GradeAssignmentsPage.tsx` | 3d |
| Build student submission view | `pages/MyAssignmentsPage.tsx` | 2d |
| Build submission form | `pages/SubmitAssignmentPage.tsx` | 2d |
| Create file upload component | `components/FileUpload.tsx` | 1.5d |
| Create grade form component | `components/GradeForm.tsx` | 1.5d |
| Add i18n strings | `i18n/en/assignments.json` | 0.5d |
| Add to portal integration | `portal/pages/DashboardPage.tsx` | 1d |
| **Total** | | **21.5d** |

---

### 3.4 LESSON PLANS & ELECTRONIC NOTES (`lessonplans` module)

#### 3.4.1 Overview
Weekly planning tools and daily lesson notes for teachers. Supports approval workflows and curriculum coverage tracking.

#### 3.4.2 Module Definition
`src/modules/lessonplans/module.json`

```json
{
  "id": "lessonplans",
  "name": "lessonplans.title",
  "description": "lessonplans.description",
  "path": "/lessonplans",
  "version": "1.0.0",
  "dependencies": ["academics"],
  "features": [
    "weekly-plans",
    "daily-notes",
    "plan-approval",
    "coverage-report"
  ]
}
```

#### 3.4.3 Directory Structure
```
src/modules/lessonplans/
  index.ts
  module.json
  pages/
    WeeklyPlansListPage.tsx
    WeeklyPlanPage.tsx
    LessonNotePage.tsx
    ApprovalQueuePage.tsx
    CoverageReportPage.tsx
    TemplatesPage.tsx
  components/
    DayPlanEditor.tsx
    PeriodPlanCard.tsx
    LessonNoteForm.tsx
    CoverageChart.tsx
  data/
    types.ts
    schema.ts
    useLessonPlanData.ts
  hooks/
    usePlanTemplates.ts
    useApprovalWorkflow.ts
```

#### 3.4.4 Data Types
`src/modules/lessonplans/data/types.ts`

```typescript
export enum PlanStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface WeeklyPlan {
  id: string;
  teacherId: string;
  teacherName?: string;
  
  // Planning period
  weekStartDate: string;
  weekEndDate: string;
  academicYearId: string;
  termId: string;
  
  // Daily breakdown
  monday?: DayPlan;
  tuesday?: DayPlan;
  wednesday?: DayPlan;
  thursday?: DayPlan;
  friday?: DayPlan;
  
  // Status
  status: PlanStatus;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface DayPlan {
  date: string;
  periods: PeriodPlan[];
  notes?: string;
  resources?: string[];
}

export interface PeriodPlan {
  periodId: string;
  periodName?: string;
  subjectId: string;
  subjectName?: string;
  classStreamId: string;
  classStreamName?: string;
  
  // Lesson content
  topic: string;
  subtopics?: string[];
  objectives: string[];
  activities: string[];
  resources: string[];
  homework?: string;
  
  // Timing
  duration: number; // minutes
  actualDuration?: number;
  
  // Completion
  covered: boolean;
  completionNotes?: string;
}

export interface LessonNote {
  id: string;
  periodPlanId: string;
  
  // Content
  actualTopic?: string;
  deviationsFromPlan?: string;
  teachingMethods: string[];
  studentEngagement?: string;
  assessmentUsed?: string;
  
  // Post-lesson
  completedSuccessfully: boolean;
  challenges?: string;
  followUpNeeded: boolean;
  followUpNotes?: string;
  
  // Attachments
  attachments?: Attachment[];
  
  createdAt: string;
  updatedAt: string;
}
```

#### 3.4.5 User Stories

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| LP-US-01 | As a teacher, I want to create weekly lesson plans | Select week; add plans per period |
| LP-US-02 | As a teacher, I want to write daily lesson notes | Link to period; add observations |
| LP-US-03 | As a head teacher, I want to approve lesson plans | Review submitted plans; approve/reject |
| LP-US-04 | As a teacher, I want to reuse lesson notes | Templates and copy from previous |
| LP-US-05 | As an admin, I want to see curriculum coverage | Report: topics covered vs syllabus |
| LP-US-06 | As a teacher, I want to mark topics as completed | Track actual vs planned coverage |

#### 3.4.6 Tasks
| Task | Files | Effort |
|------|-------|--------|
| Create module structure | `src/modules/lessonplans/*` | 0.5d |
| Define lesson plan types | `data/types.ts` | 1d |
| Create weekly plan pages | `pages/WeeklyPlanPage.tsx` | 3d |
| Create daily note pages | `pages/LessonNotePage.tsx` | 2d |
| Build approval workflow | `pages/ApprovalQueuePage.tsx` | 2.5d |
| Build coverage report | `pages/CoverageReportPage.tsx` | 2d |
| Create template functionality | `hooks/usePlanTemplates.ts` | 1.5d |
| **Total** | | **12.5d** |

---

### 3.5 TEACHER ANALYTICS (`analytics` module)

#### 3.5.1 Overview
Analytics dashboard for teachers showing their performance metrics. Advanced calculations delegated to Go WASM plugin engine.

#### 3.5.2 Module Definition
`src/modules/analytics/module.json`

```json
{
  "id": "analytics",
  "name": "analytics.title",
  "description": "analytics.description",
  "path": "/analytics",
  "version": "1.0.0",
  "dependencies": ["academics", "hr"],
  "features": [
    "teacher-dashboard",
    "subject-analytics",
    "class-analytics",
    "report-export"
  ],
  "pluginSlots": {
    "calculationEngine": "analytics-engine"
  }
}
```

#### 3.5.3 Directory Structure
```
src/modules/analytics/
  index.ts
  module.json
  pages/
    TeacherDashboardPage.tsx
    SubjectAnalyticsPage.tsx
    ClassAnalyticsPage.tsx
    ExportReportPage.tsx
  components/
    PerformanceChart.tsx
    PassRateCard.tsx
    TrendIndicator.tsx
    ComparisonTable.tsx
  data/
    types.ts
    useAnalyticsData.ts
  hooks/
    useAnalyticsEngine.ts    // Plugin integration
    useTeacherMetrics.ts
```

#### 3.5.4 Data Types
`src/modules/analytics/data/types.ts`

```typescript
// Analytics data computed by plugin engine
export interface TeacherAnalytics {
  teacherId: string;
  teacherName?: string;
  period: AnalyticsPeriod;
  
  // Performance metrics
  passRates: SubjectPassRate[];
  classPerformance: ClassPerformance[];
  
  // Workload
  assignmentsCreated: number;
  assignmentsGraded: number;
  gradingTurnaroundDays: number;
  
  // Trends
  studentImprovement: number;
  consistentPerformers: number;
  strugglingStudents: number;
  
  // Coverage
  syllabusCoverage: number;
  topicsCovered: string[];
  topicsPending: string[];
}

export interface SubjectPassRate {
  subjectId: string;
  subjectName: string;
  examCount: number;
  studentCount: number;
  passRate: number;
  averageScore: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ClassPerformance {
  classId: string;
  className: string;
  streamCount: number;
  studentCount: number;
  averageScore: number;
  passRate: number;
  topPerformers: string[];
  bottomPerformers: string[];
}

export interface AnalyticsPeriod {
  type: 'term' | 'semester' | 'year' | 'custom';
  startDate: string;
  endDate: string;
}
```

#### 3.5.5 Plugin Interface
`src/plugins/types.ts` extension:

```typescript
// Plugin interface for analytics calculations
interface AnalyticsEnginePlugin {
  calculateTeacherMetrics(teacherId: string, period: AnalyticsPeriod): TeacherAnalytics;
  calculateClassMetrics(classId: string, period: AnalyticsPeriod): ClassAnalytics;
  generateTrends(teacherId: string, periods: AnalyticsPeriod[]): TrendData[];
  exportReport(format: 'pdf' | 'excel' | 'csv', data: any): Blob;
}
```

#### 3.5.6 User Stories

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| TA-US-01 | As a teacher, I want to see my students' pass rates | Per subject; per class breakdown |
| TA-US-02 | As a teacher, I want to see performance trends | Line chart over terms |
| TA-US-03 | As a head teacher, I want to compare teacher performance | Side-by-side metrics |
| TA-US-04 | As a teacher, I want to see my class rankings | Student ranking within class |
| TA-US-05 | As a head teacher, I want to see syllabus coverage | Topics completed vs total |
| TA-US-06 | As admin, I want to export reports | PDF/Excel via plugin |

#### 3.5.7 Tasks
| Task | Files | Effort |
|------|-------|--------|
| Create module structure | `src/modules/analytics/*` | 0.5d |
| Define analytics types | `data/types.ts` | 1d |
| Build teacher dashboard | `pages/TeacherDashboard.tsx` | 3d |
| Build subject analytics view | `pages/SubjectAnalytics.tsx` | 2d |
| Build class analytics view | `pages/ClassAnalytics.tsx` | 2d |
| Build report export | `pages/ExportReport.tsx` | 1.5d |
| Integrate plugin engine | `hooks/useAnalyticsEngine.ts` | 2d |
| Create chart components | `components/PerformanceChart.tsx` | 2d |
| Add i18n strings | `i18n/en/analytics.json` | 0.5d |
| **Total** | | **14.5d** |

---

### 3.6 SECURE PICKUP SYSTEM (`pickup` module)

#### 3.6.1 Overview
QR-code based student release verification system for enhanced child safety.

#### 3.6.2 Module Definition
`src/modules/pickup/module.json`

```json
{
  "id": "pickup",
  "name": "pickup.title",
  "description": "pickup.description",
  "path": "/pickup",
  "version": "1.0.0",
  "dependencies": ["administration"],
  "features": [
    "pickup-codes",
    "qr-verification",
    "authorized-persons",
    "pickup-logs"
  ]
}
```

#### 3.6.3 Directory Structure
```
src/modules/pickup/
  index.ts
  module.json
  pages/
    PickupDashboardPage.tsx
    AuthorizedPersonsPage.tsx
    StudentAuthorizationPage.tsx
    PickupCodesPage.tsx
    PickupLogPage.tsx
    VerificationScannerPage.tsx
  components/
    QRCodeDisplay.tsx
    QRScanner.tsx
    AuthorizationCard.tsx
    VerificationResult.tsx
  services/
    CodeGenerator.ts
  data/
    types.ts
    usePickupData.ts
  hooks/
    usePickupNotifications.ts
    useQRScanner.ts
```

#### 3.6.4 Data Types
`src/modules/pickup/data/types.ts`

```typescript
export enum PickupCodeStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  USED = 'used',
  REVOKED = 'revoked'
}

export interface PickupCode {
  id: string;
  studentId: string;
  studentName?: string;
  
  code: string;              // Unique pickup code
  qrCodeData: string;        // Encoded QR payload
  
  status: PickupCodeStatus;
  
  validFrom?: string;
  validUntil?: string;
  singleUse: boolean;
  
  createdAt: string;
  createdBy: string;
}

export interface AuthorizedPerson {
  id: string;
  name: string;
  phone: string;
  idNumber?: string;
  
  // Relationship
  relationship: GuardianRelationship;
  
  // Verification
  photo?: string;
  idPhoto?: string;
  verified: boolean;
  verifiedAt?: string;
  
  // Access
  isActive: boolean;
  pickupRestrictions?: string[];
  
  createdAt: string;
  updatedAt: string;
}

export interface StudentAuthorization {
  id: string;
  studentId: string;
  authorizedPersonId: string;
  
  // Permissions
  canPickup: boolean;
  requiresNotice: boolean;    // Must be pre-notified
  noticeHours?: number;     // Hours in advance
  
  // Restrictions
  validDays?: DayOfWeek[];  // Which days
  validTimeFrom?: string;
  validTimeTo?: string;
  
  isActive: boolean;
  createdAt: string;
}

export interface PickupLog {
  id: string;
  studentId: string;
  studentName?: string;
  
  authorizedPersonId: string;
  authorizedPersonName?: string;
  
  codeUsed: string;
  verifiedBy: string;          // Staff who verified
  verifiedAt: string;
  
  // Verification steps
  idVerified: boolean;
  photoMatched: boolean;
  codeVerified: boolean;
  signatureObtained: boolean;
  
  notes?: string;
  createdAt: string;
}
```

#### 3.6.5 User Stories

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| SP-US-01 | As admin, I want to generate pickup codes per student | Auto-generate or bulk generate |
| SP-US-02 | As teacher, I want to scan QR codes for verification | Camera-based QR scanner |
| SP-US-03 | As admin, I want to add authorized pickup persons | Photo upload; ID verification |
| SP-US-04 | As teacher, I want to see authorization status | Green/red indicator on scan |
| SP-US-05 | As admin, I want to log all pickups | Timestamp, person, receiver recorded |
| SP-US-06 | As parent, I want to receive pickup notifications | SMS via plugin on pickup |
| SP-US-07 | As admin, I want to view pickup history | Filterable log with exports |

#### 3.6.6 Tasks
| Task | Files | Effort |
|------|-------|--------|
| Create module structure | `src/modules/pickup/*` | 0.5d |
| Define pickup types | `data/types.ts` | 1d |
| Build pickup code generator | `services/CodeGenerator.ts` | 1.5d |
| Build QR code generator | `components/QRCodeDisplay.tsx` | 1.5d |
| Build verification scanner | `components/QRScanner.tsx` | 2.5d |
| Build authorized persons page | `pages/AuthorizedPersonsPage.tsx` | 2d |
| Build pickup log page | `pages/PickupLogPage.tsx` | 1.5d |
| Build student authorization page | `pages/StudentAuthorizationPage.tsx` | 2d |
| Integrate SMS notification hook | `hooks/usePickupNotifications.ts` | 1d |
| **Total** | | **13.5d** |

---

### 3.7 HOUSE POINTS SYSTEM (`houses` module)

#### 3.7.1 Overview
Merit/demerit tracking system integrated with pastoral care and student motivation.

#### 3.7.2 Module Definition
`src/modules/houses/module.json`

```json
{
  "id": "houses",
  "name": "houses.title",
  "description": "houses.description",
  "path": "/houses",
  "version": "1.0.0",
  "dependencies": ["administration"],
  "features": [
    "house-management",
    "point-transactions",
    "merits",
    "demerits",
    "leaderboard"
  ]
}
```

#### 3.7.3 Directory Structure
```
src/modules/houses/
  index.ts
  module.json
  pages/
    HousesPage.tsx
    CategoriesPage.tsx
    AwardPointsPage.tsx
    LeaderboardPage.tsx
    StudentPointsPage.tsx
    ClassStandingsPage.tsx
  components/
    HouseCard.tsx
    PointTransactionForm.tsx
    MeritBadge.tsx
    DemeritBadge.tsx
    RankingTable.tsx
  data/
    types.ts
    schema.ts
    useHouseData.ts
  hooks/
    usePointTransactions.ts
```

#### 3.7.4 Data Types
`src/modules/houses/data/types.ts`

```typescript
export enum TransactionType {
  MERIT = 'merit',
  DEMERIT = 'demerit'
}

export interface House {
  id: string;
  name: string;
  description?: string;
  color: string;
  motto?: string;
  
  // Leadership
  patronTeacherId?: string;
  patronTeacherName?: string;
  captainId?: string;
  captainName?: string;
  viceCaptainId?: string;
  viceCaptainName?: string;
  
  // Totals (computed)
  totalPoints: number;
  meritPoints: number;
  demeritPoints: number;
  memberCount: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface PointCategory {
  id: string;
  name: string;
  type: TransactionType;
  defaultPoints: number;
  description?: string;
  
  // Settings
  requiresApproval: boolean;
  approverRole?: string;
  evidenceRequired: boolean;
  
  // Behavior
  maxDailyAwards?: number;
  isActive: boolean;
}

export interface PointTransaction {
  id: string;
  studentId: string;
  studentName?: string;
  className?: string;
  
  houseId: string;
  houseName?: string;
  
  // Transaction details
  categoryId: string;
  categoryName?: string;
  type: TransactionType;
  points: number;
  reason: string;
  
  // Event linkage
  eventName?: string;
  eventId?: string;
  
  // Evidence
  evidenceUrl?: string;
  evidenceDescription?: string;
  
  // Workflow
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  
  // Metadata
  awardedBy: string;
  awardedByName?: string;
  awardedAt: string;
}

export interface StudentPointSummary {
  studentId: string;
  studentName: string;
  houseId: string;
  houseName?: string;
  className?: string;
  
  totalPoints: number;
  meritPoints: number;
  demeritPoints: number;
  netPoints: number;
  
  // Rankings
  classRank?: number;
  houseRank?: number;
  overallRank?: number;
  
  // Recent transactions
  recentTransactions: PointTransaction[];
}
```

#### 3.7.5 User Stories

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| HP-US-01 | As admin, I want to create and manage houses | CRUD for houses with colors, patrons |
| HP-US-02 | As teacher, I want to award merit points | Select student; select category; add reason |
| HP-US-03 | As teacher, I want to record demerits | Same workflow with negative points |
| HP-US-04 | As class teacher, I want to view class standings | Ranking by total points |
| HP-US-05 | As house master, I want to see house rankings | Overall house competition view |
| HP-US-06 | As a student, I want to see my point history | Transaction log with totals |
| HP-US-07 | As admin, I want to configure point categories | Merit/demerit categories with defaults |
| HP-US-08 | As admin, I want automatic house assignments | Assign students to houses on enrollment |

#### 3.7.6 Tasks
| Task | Files | Effort |
|------|-------|--------|
| Create module structure | `src/modules/houses/*` | 0.5d |
| Define house types | `data/types.ts` | 1d |
| Build house management page | `pages/HousesPage.tsx` | 2d |
| Build point categories page | `pages/CategoriesPage.tsx` | 1.5d |
| Build award points page | `pages/AwardPointsPage.tsx` | 2d |
| Build leaderboard page | `pages/LeaderboardPage.tsx` | 2d |
| Build student point history | `pages/StudentPointsPage.tsx` | 1.5d |
| Build class standings | `pages/ClassStandingsPage.tsx` | 1.5d |
| Add house assignment to enrollment | Extend `AddStudentPage.tsx` | 1d |
| Add i18n strings | `i18n/en/houses.json` | 0.5d |
| **Total** | | **13.5d** |

---

## 4. IMPLEMENTATION PHASES

### Phase 1: Portal & Admissions (Weeks 1-6)
**Focus:** External user access and onboarding

| Week | Tasks |
|------|-------|
| 1 | Portal module structure, types, schemas |
| 2 | Portal data hooks, auth integration |
| 3 | Portal UI pages (dashboard, attendance, results) |
| 4 | Portal fees page with payment plugin slot, announcements |
| 5 | Public admissions page, tracking page |
| 6 | Document upload, notification hooks, polish |

### Phase 2: Assignments & Lesson Plans (Weeks 7-10)
**Focus:** Academic workflow tools

| Week | Tasks |
|------|-------|
| 7 | Assignments module structure, types |
| 8 | Create assignment pages, submission flow |
| 9 | Grading workflow, feedback system |
| 10 | Lesson plans module, weekly planning UI |

### Phase 3: Analytics, Pickup, Houses (Weeks 11-14)
**Focus:** Administrative tools

| Week | Tasks |
|------|-------|
| 11 | Analytics module, teacher dashboard |
| 12 | Pickup module, QR verification |
| 13 | Houses module, point transactions |
| 14 | Cross-module integration, polish |

---

## 5. TASK SUMMARY

| Module | Tasks | Total Days |
|--------|-------|------------|
| Portal | 14 tasks | 16d |
| Admissions (Public) | 7 tasks | 11.5d |
| Assignments | 13 tasks | 21.5d |
| Lesson Plans | 7 tasks | 12.5d |
| Analytics | 8 tasks | 14.5d |
| Pickup | 9 tasks | 13.5d |
| Houses | 10 tasks | 13.5d |
| **Total** | **68 tasks** | **103d** |

---

## 6. SUCCESS METRICS

| Feature | Metric | Target | Measurement |
|---------|--------|--------|-------------|
| Portal | Parent activation rate | 60% within 3 months | Logins / enrolled parents |
| Portal | Fee payment via portal | 40% of payments | Payment plugin analytics |
| Admissions | Online applications | 70% of total applications | Application source tracking |
| Assignments | On-time submission rate | 85% | Submission status tracking |
| Lesson Plans | Plan submission rate | 95% weekly plans | Plan status reports |
| Analytics | Dashboard usage | 50% teachers weekly | Page views |
| Pickup | Verification coverage | 100% of exits | Log completeness |
| Houses | Student enrollment | 100% assigned | House member count |

---

## 7. TECHNICAL NOTES

### 7.1 Plugin Integration Points

All external services use the existing plugin architecture defined in `src/plugins/types.ts`:

```typescript
// Payment Integration
interface PaymentPlugin {
  initiatePayment(params: PaymentParams): Promise<PaymentResult>;
  verifyPayment(transactionId: string): Promise<boolean>;
  handleCallback(data: any): void;
}

// SMS Integration  
interface SMSPlugin {
  send(phone: string, message: string): Promise<SMSResult>;
  bulkSend(recipients: string[], message: string): Promise<BulkResult>;
  sendTemplate(phone: string, templateId: string, params: object): Promise<SMSResult>;
}

// Analytics Engine (Go WASM)
interface AnalyticsEnginePlugin {
  calculateMetrics(input: AnalyticsInput): Promise<TeacherAnalytics>;
  generateReport(format: ExportFormat): Promise<Blob>;
}
```

### 7.2 Mobile Considerations

All new pages use responsive design:
- Mobile-first approach for portal
- Touch-friendly forms for assignment submission
- Camera access for QR scanning

### 7.3 Offline Support

Portal and assignments work offline:
- Data cached in local database
- Submission queue for offline work
- Sync on reconnection

### 7.4 RBAC Integration

New permissions extend existing `src/rbac/types.ts`:
- Portal roles: `student-portal`, `parent-portal`, `guardian-portal`
- Assignment permissions: `create:assignment`, `submit:assignment`, `grade:assignment`
- Pickup permissions: `verify:pickup`, `manage:authorized-persons`
- House permissions: `manage:houses`, `award:points`, `view:leaderboard`

---

## 8. FILE REFERENCE MATRIX

### New Modules
| Module | Location | Key Files |
|--------|----------|-----------|
| Portal | `src/modules/portal/` | `module.json`, `data/types.ts`, `pages/DashboardPage.tsx` |
| Assignments | `src/modules/assignments/` | `module.json`, `data/types.ts`, `pages/AssignmentsListPage.tsx` |
| Lesson Plans | `src/modules/lessonplans/` | `module.json`, `data/types.ts`, `pages/WeeklyPlanPage.tsx` |
| Analytics | `src/modules/analytics/` | `module.json`, `data/types.ts`, `pages/TeacherDashboard.tsx` |
| Pickup | `src/modules/pickup/` | `module.json`, `data/types.ts`, `pages/VerificationScanner.tsx` |
| Houses | `src/modules/houses/` | `module.json`, `data/types.ts`, `pages/HousesPage.tsx` |

### Extended Modules
| Module | Files Modified | Changes |
|--------|---------------|---------|
| Admissions | `module.json`, `pages/PublicApplicationPage.tsx`, `pages/ApplicationTrackingPage.tsx` | Public access, tracking |
| RBAC | `rbac/types.ts`, `rbac/service.ts` | New roles and permissions |

### Plugin Types
| Plugin | Interface Location | Purpose |
|--------|-------------------|---------|
| Payment | `src/plugins/types.ts` | Payment gateway integration |
| SMS | `src/plugins/types.ts` | Bulk SMS notifications |
| Analytics Engine | `src/plugins/types.ts` | Go WASM computation |

---

## 9. NEXT STEPS

1. **Begin Phase 1** - Start with portal module structure
2. **RBAC updates** - Extend `src/rbac/types.ts` with portal and feature permissions
3. **Plugin interfaces** - Draft plugin interface specifications for payment/SMS
4. **Design resources** - Allocate UI/UX for Phase 1 pages

---

*Document Version: 1.0*
*Last Updated: 2026-04-04*
*Status: Ready for Implementation*
