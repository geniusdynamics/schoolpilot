# Akademiko Examination/Academic Migration Specification

## Introduction
This document outlines the migration strategy for the Examination and Academic functionalities from the old WinForms system to the new modular web application. The goal is to leverage existing production-ready features while incorporating new requirements for CBC education system, multi-country support, and broader institutional applicability (universities, colleges).

## Missing Features / Areas for Improvement in Old System
- **Limited Scope**: Primarily designed for high school and primary 8-4-4 education system in Kenya, lacking support for CBC, universities, colleges, or international curricula.
- **Rigid Reporting**: Academic reporting was often fixed, lacking flexibility for custom views or integration with modern data visualization tools.
- **Manual Processes**: Some processes, like mark entry for large cohorts, were cumbersome and prone to errors due to reliance on manual input.
- **Scalability Issues**: Performance bottlenecks observed with a very large number of students or complex grading schemes.
- **Integration Challenges**: Difficult to integrate with external systems (e.g., national examination bodies, other academic platforms).
- **User Experience**: Outdated UI/UX compared to modern web applications, leading to inefficiencies.
- **Lack of Audit Trails**: Limited tracking of changes to academic records, making accountability and debugging challenging.
- **Security Model**: Granular access control for academic data was not as robust as required for diverse institutional needs.

## Proposed Module Placements

### Examination Management
- **Description**: Comprehensive management of examinations, including setup, scheduling, mark entry, grading, and result processing. This module will handle the lifecycle of all academic assessments.
- **Proposed Module**: `academics` (as a sub-module) or a dedicated `examinations` module, depending on the granularity required for separation of concerns.

### Academic Records
- **Description**: Centralized management of student academic history, including grades, transcripts, certifications, and progress tracking. This module will serve as the authoritative source for all student academic achievements.
- **Proposed Module**: `academics` (core module), with potential integration points with `students` and `reports` modules.

## Current Academic Module Implementations
Based on the existing `src/modules/academics` directory, the following components are already in place and can be leveraged or extended:

### Data Management (src/modules/academics/data)
- `collections.ts`: Defines data collections for academic entities.
- `schema.ts`: Contains schema definitions for academic data.
- `types.ts`: Defines TypeScript types for academic data structures.
- `useAcademicYearData.ts`: Hook for managing academic year data.
- `useClassSubjectAllocationData.ts`: Hook for managing class-subject allocations.
- `useExamPaperSettingData.ts`: Hook for managing exam paper settings.
- `useExamSessionData.ts`: Hook for managing exam session data.
- `useGradingSchemeData.ts`: Hook for managing grading schemes.
- `useGradingSchemeLevelData.ts`: Hook for managing grading scheme levels.
- `useStudentExamResultData.ts`: Hook for managing student exam results.
- `useStudentPaperMarkData.ts`: Hook for managing student paper marks.
- `useStudentSubjectEnrollmentData.ts`: Hook for managing student subject enrollments.
- `useSubjectData.ts`: Hook for managing subject data.
- `useSubjectPaperData.ts`: Hook for managing subject paper data.
- `useTeacherSubjectAssignmentData.ts`: Hook for managing teacher-subject assignments.
- `useTimetableEntryData.ts`: Hook for managing timetable entries.
- `useTimetablePeriodDefData.ts`: Hook for managing timetable period definitions.

### User Interface (src/modules/academics/pages)
- `AcademicsDashboardPage.tsx`: Dashboard for academic overview.
- `ClassSubjectAllocationsPage.tsx`: Page for managing class-subject allocations.
- `ExamAnalysisPage.tsx`: Page for analyzing exam data.
- `ExamSessionsPage.tsx`: Page for managing exam sessions.
- `GradingSchemesPage.tsx`: Page for managing grading schemes.
- `StudentExamResultsEntryPage.tsx`: Page for entering student exam results.
- `StudentSubjectEnrollmentPage.tsx`: Page for managing student subject enrollments.
- `SubjectPapersManagementPage.tsx`: Page for managing subject papers.
- `SubjectsPage.tsx`: Page for managing subjects.
- `TeacherSubjectAssignmentPage.tsx`: Page for managing teacher-subject assignments.
- `TimetableEntriesPage.tsx`: Page for managing timetable entries.
- `TimetablePeriodsPage.tsx`: Page for managing timetable periods.

## Implementation Checklist

### Examination Setup
- [x] **Exam Type Definition**: Implement functionality to define various exam types (e.g., formative, summative, continuous assessment, termly, annual). *Partially covered by `useExamPaperSettingData.ts` and `useExamSessionData.ts` for data, and `ExamSessionsPage.tsx` for UI.*
- [x] **Grading Scale Configuration**: Allow configuration of flexible grading scales, including letter grades, percentage ranges, and pass/fail criteria. *Covered by `useGradingSchemeData.ts`, `useGradingSchemeLevelData.ts` for data, and `GradingSchemesPage.tsx` for UI.*
- [ ] **Education System Adaptability**: Develop mechanisms to support diverse education systems (e.g., 8-4-4, CBC, credit-hour systems for universities/colleges) through configurable parameters. *Requires further development beyond current scope. **Proposed Solution**: Implement a configurable `EducationSystem` entity with associated rules for grading, assessment types, and academic periods. This will involve modifications to `src/modules/academics/data/schema.ts` and new UI for configuration.*
- [ ] **Exam Scheduling**: Implement a robust exam scheduling system with conflict detection and resource allocation. *Partially covered by `useTimetableEntryData.ts` and `useTimetablePeriodDefData.ts` for data, and `TimetableEntriesPage.tsx`, `TimetablePeriodsPage.tsx` for UI, but needs specific exam scheduling features. **Proposed Solution**: Enhance existing timetable components or create a dedicated `ExamScheduling` module with advanced algorithms for conflict detection and resource management.*

### Result Entry and Processing
- [x] **Mark Entry Interface**: Provide intuitive interfaces for manual and bulk entry of marks, including import/export functionalities. *Partially covered by `useStudentPaperMarkData.ts` for data and `StudentExamResultsEntryPage.tsx` for UI.*
- [ ] **Automated Calculation**: Develop logic for automatic calculation of grades, averages, weighted scores, and overall performance based on defined rules. *Requires significant logic development. **Proposed Solution**: Implement a `GradingEngine` service that consumes `GradingScheme` and `EducationSystem` configurations to perform complex calculations. This will involve new utility functions and potentially a background processing mechanism.*
- [x] **Result Generation**: Implement generation of customizable result slips, transcripts, and academic certificates. *Partially covered by `useStudentExamResultData.ts` for data, but needs dedicated reporting/generation features. **Proposed Solution**: Develop a `DocumentGeneration` service that can dynamically create PDF/HTML documents based on templates and calculated results. This will integrate with the `Reporting` module.*
- [ ] **Approval Workflows**: Introduce workflows for result approval and publication. *Requires new workflow implementation. **Proposed Solution**: Integrate a flexible workflow engine (e.g., using state machines) to manage the approval process for results, involving multiple stakeholders and audit trails.*

### Academic Reporting
- [ ] **Customizable Reports**: Enable creation of highly customizable academic reports (e.g., class performance, subject analysis, student progress, comparative analysis). *Requires significant development, potentially leveraging existing data hooks. **Proposed Solution**: Develop a `ReportBuilder` component that allows users to select data fields, apply filters, and define aggregation rules. This will leverage the existing data hooks and potentially new query services.*
- [x] **Comprehensive Report Viewer Integration**: Ensure seamless integration with the comprehensive report viewer, allowing dynamic filtering, sorting, and export of data. *`ExamAnalysisPage.tsx` provides some analysis, but full integration with a comprehensive report viewer is needed. **Proposed Solution**: Enhance `ExamAnalysisPage.tsx` and other reporting pages to fully utilize the comprehensive report viewer's capabilities, including advanced filtering, sorting, and export options.*
- [ ] **Data Visualization**: Incorporate data visualization tools for better insights into academic performance trends. *Requires new visualization component development. **Proposed Solution**: Integrate a charting library (e.g., Chart.js, Recharts) into the reporting pages to provide interactive data visualizations for academic performance trends.*

## Detailed Gap Analysis and Proposed Solutions

### Gap 1: Limited Support for Diverse Education Systems
- **Analysis**: The current system is primarily geared towards a specific education system, lacking the flexibility to adapt to CBC, credit-hour systems, or international curricula. The existing `GradingSchemesPage.tsx` and related data hooks are somewhat generic but do not fully abstract the concept of an "education system" with its unique rules and configurations.
- **Proposed Solution**: Introduce a new top-level entity, `EducationSystem`, which encapsulates rules for grading, assessment types, academic periods (semesters/trimesters), and curriculum structures. This entity will be configurable via a new UI page (e.g., `EducationSystemConfigurationPage.tsx`) and its data managed by a new data hook (`useEducationSystemData.ts`). This will require modifications to `src/modules/academics/data/schema.ts` to link grading schemes and exam settings to specific education systems.

### Gap 2: Lack of Robust Automated Calculation and Grading Engine
- **Analysis**: While mark entry is partially covered, the system lacks a sophisticated engine for automated calculation of grades, averages, weighted scores, and overall performance based on complex, configurable rules. This is crucial for CBC and university-level grading.
- **Proposed Solution**: Develop a dedicated `GradingEngine` service (e.g., `src/modules/academics/services/GradingEngineService.ts`). This service will interpret rules defined within the `EducationSystem` and `GradingScheme` entities to perform calculations. It will be responsible for applying weighting, rounding rules, and handling different assessment types. This service will be invoked during result entry and generation processes.

### Gap 3: Insufficient Customizable Reporting and Data Visualization
- **Analysis**: The existing `ExamAnalysisPage.tsx` provides some analytical capabilities, but there's a significant gap in providing highly customizable reports and integrating robust data visualization tools for deeper insights into academic performance trends.
- **Proposed Solution**: Enhance the `AcademicReporting` module. This will involve developing a `ReportBuilder` component (e.g., `src/modules/academics/components/ReportBuilder.tsx`) that allows users to dynamically select data points, apply filters, and define aggregation methods. Integration with a modern charting library (e.g., Chart.js, Recharts) will enable interactive data visualizations within pages like `ExamAnalysisPage.tsx` and new dashboards. This will require new data query services to support flexible reporting needs.

### Gap 4: Absence of Approval Workflows for Results
- **Analysis**: The current system does not include formal approval workflows for results, which is a critical requirement for maintaining data integrity and accountability, especially in multi-institutional or regulated environments.
- **Proposed Solution**: Implement a flexible workflow engine within the `Examination Management` module. This could involve a new `ResultApprovalWorkflow` entity and associated UI (e.g., `ResultApprovalPage.tsx`). The workflow will define states (e.g., Draft, Submitted, Approved, Published) and transitions, with role-based permissions for each action. This will ensure that results undergo necessary reviews before finalization and publication, with a clear audit trail.

### Validation Strategy
- **Unit Tests**: Develop comprehensive unit tests for all new utility functions, services (e.g., `GradingEngineService`, `DocumentGenerationService`), and data hooks to ensure their individual components function correctly.
- **Integration Tests**: Implement integration tests to verify the seamless interaction between new components and existing modules, particularly focusing on data flow between UI, data hooks, and services.
- **End-to-End Tests**: Create end-to-end tests to simulate user scenarios, ensuring that the entire workflow, from exam setup to result publication and reporting, functions as expected across different education system configurations.
- **User Acceptance Testing (UAT)**: Conduct UAT with key stakeholders (e.g., teachers, administrators, academic heads) to validate that the new functionalities meet the specified requirements for CBC education, multi-country support, and university/college applicability. This will involve testing with diverse data sets and configurations.

## Old System Reference

### Key Functionalities
- **Exam Creation and Scheduling**: The old system allowed for defining exam types, subjects, and scheduling exams. This involved setting up exam parameters and associating them with specific classes or student groups.
- **Mark Entry**: Marks were primarily entered manually through dedicated forms. There was limited support for bulk imports, and validation was often client-side.
- **Result Generation**: Results were computed based on predefined formulas and displayed in tabular formats. Generation of basic result slips was supported, but customization was minimal.
- **Academic Reporting**: The system provided a set of pre-defined reports for academic performance, such as class lists with marks, subject summaries, and student transcripts. These reports were generally static.

### Relevant Files (Old System)
- `frmExams.cs`: Handled the creation, editing, and scheduling of examinations.
- `frmResults.cs`: Managed the entry and display of student examination results.
- `dbAcademicProcesses.cs`: Contained database interaction logic for academic data, including exam and result management.
- `Sql_AcademicStatements.cs`: Stored SQL queries and statements related to academic processes, such as retrieving exam data and updating results.

## New System Considerations

### CBC Education System
- **Competency-Based Assessment**: Implement features to support continuous assessment, project-based learning, and competency tracking as per CBC guidelines.
- **Holistic Reporting**: Develop reporting capabilities that reflect holistic student development, not just academic scores.

### Multi-Country Support
- **Configurable Education Systems**: Allow administrators to configure different educational frameworks, including grading systems, academic calendars, and curriculum structures, to support various countries.
- **Localization**: Ensure the system can be easily localized for different languages, currencies, and regional academic norms.

### University and College Support
- **Credit Hour Management**: Implement robust management of credit hours, course prerequisites, and academic standing.
- **GPA Calculation**: Support various GPA calculation methodologies (e.g., cumulative, semester-based) and academic honors.
- **Semester/Trimester Systems**: Design the system to accommodate different academic periods, including semesters, trimesters, and quarters.
- **Program/Course Catalog**: Develop features for managing detailed program and course catalogs, including descriptions, learning outcomes, and faculty assignments.

## External References

### Frappe ERPNext Education Module
- [GitHub Repository](https://github.com/frappe/education)
- **Key Learnings**: Modular design, data structures for educational entities, reporting.

### Junior School Module for ERPNext (Kenya)
- [GitHub Repository](https://github.com/navariltd/Junior-School)
- **Key Learnings**: Specific adaptations for Kenyan education system, integration patterns.