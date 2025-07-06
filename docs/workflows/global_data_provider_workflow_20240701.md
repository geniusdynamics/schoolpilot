# ABOUTME: Workflow log for the global data provider modularization effort.
# ABOUTME: Tracks progress, completed work, and next steps for system-wide modular data providers.

---

## Global Data Provider Workflow (as of 2024-07-01)

### **Objective**
Refactor the entire system to use modular, per-entity data providers (hooks/services) that are either global (shared across modules) or private (module-only), following the `isGlobalProvider` pattern. This enables dynamic discovery, plugin support, and eliminates monolithic data hooks.

---

## **What Has Been Done So Far**

### **1. Administration Module**
- Modular provider hooks created, exported, and committed for:
  - AcademicYear
  - AcademicPeriodDefinition
  - AcademicYearStructure
  - Dormitory
  - StudentCategory
  - Partner
  - ClubAndSociety
  - Customer
  - StudentHealthRecord
  - StudentAttendance
  - TemplateComm
  - Campaign
- All providers use CRUD logic, are marked as global, and are exported in the module index.

### **2. Academics Module**
- Modular provider hooks created for:
  - AcademicYear (previously)
  - Subject (in progress)
  - SubjectPaper (in progress)
  - ExamSession (in progress)
- Remaining entities identified and queued for provider implementation.

---

## **What Is In Progress**
- Academics module: Generating provider hooks for all remaining entities (ExamPaperSetting, GradingScheme, GradingSchemeLevel, StudentExamResult, StudentPaperMark, ClassSubjectAllocation, TeacherSubjectAssignment, StudentSubjectEnrollment, TimetablePeriodDef, TimetableEntry, etc.).
- Each provider is being exported and committed after implementation.

---

## **What Remains To Be Done**
- **Academics:** Complete all remaining entity providers and commit.
- **Finance, HR, Inventory, Library, Nutrition:**
  - Audit each module's mock data/types.
  - Generate modular provider hooks for each entity (CRUD, global/private as appropriate).
  - Export and commit after each module.
- **Global Registry:**
  - Ensure all global providers are discoverable via a registry or auto-discovery mechanism.
- **Consumer Refactor:**
  - Update all pages/components to use the new modular providers instead of any monolithic or legacy hooks.
- **Testing:**
  - Systematically test each module's data loading and CRUD operations.

---

## **Process Outline for Future Work**
1. For each module, list all entities and mock data.
2. For each entity, create a provider hook with CRUD and mark as global/private.
3. Export from module index.
4. Add to global registry if global.
5. Refactor consumers.
6. Test and commit.
7. Repeat for all modules.

---

**Last updated:** 2024-07-01 