# Exam Scheduling User Interface

<cite>
**Referenced Files in This Document**   
- [ExamSchedulingUI.tsx](file://src/modules/academics/components/ExamSchedulingUI.tsx)
- [SchedulingCalendar.tsx](file://src/modules/academics/components/SchedulingCalendar.tsx)
- [ExamSchedulingPage.tsx](file://src/modules/academics/pages/ExamSchedulingPage.tsx)
- [types.ts](file://src/modules/academics/data/types.ts)
- [ExamScheduleManager.ts](file://src/modules/academics/services/ExamScheduleManager.ts)
- [ConflictDetectionEngine.ts](file://src/modules/academics/services/ConflictDetectionEngine.ts)
- [TimetableIntegrationService.ts](file://src/modules/academics/services/TimetableIntegrationService.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
The Exam Scheduling User Interface provides a comprehensive solution for managing examination schedules within an educational institution. This documentation details the architecture and functionality of the ExamSchedulingUI component as the main container and its integration with SchedulingCalendar for visual time-based scheduling. The system supports drag-and-drop interface, time slot selection mechanics, and real-time conflict visualization features within a tabbed workspace environment. The interface is designed to be responsive across device sizes and integrates seamlessly with backend scheduling logic for conflict detection and timetable integration.

## Project Structure
The exam scheduling functionality is organized within the academics module of the application, following a feature-based organization pattern. The components are structured to separate concerns between UI presentation, business logic, and data management.

```mermaid
graph TD
A[academics module] --> B[components]
A --> C[pages]
A --> D[services]
A --> E[data]
B --> F[ExamSchedulingUI.tsx]
B --> G[SchedulingCalendar.tsx]
C --> H[ExamSchedulingPage.tsx]
D --> I[ExamScheduleManager.ts]
D --> J[ConflictDetectionEngine.ts]
D --> K[TimetableIntegrationService.ts]
E --> L[types.ts]
```

**Diagram sources**
- [ExamSchedulingUI.tsx](file://src/modules/academics/components/ExamSchedulingUI.tsx)
- [SchedulingCalendar.tsx](file://src/modules/academics/components/SchedulingCalendar.tsx)
- [ExamSchedulingPage.tsx](file://src/modules/academics/pages/ExamSchedulingPage.tsx)
- [ExamScheduleManager.ts](file://src/modules/academics/services/ExamScheduleManager.ts)
- [types.ts](file://src/modules/academics/data/types.ts)

**Section sources**
- [ExamSchedulingUI.tsx](file://src/modules/academics/components/ExamSchedulingUI.tsx)
- [SchedulingCalendar.tsx](file://src/modules/academics/components/SchedulingCalendar.tsx)
- [ExamSchedulingPage.tsx](file://src/modules/academics/pages/ExamSchedulingPage.tsx)

## Core Components
The exam scheduling system consists of three primary components that work together to provide a complete scheduling solution. The ExamSchedulingUI serves as the main container component for creating and editing exam schedules, while SchedulingCalendar provides a visual representation of scheduled exams over time. These components are orchestrated by the ExamSchedulingPage, which manages state and coordinates interactions between the UI components and backend services.

The system leverages React's component architecture with hooks for state management and side effects. It follows a unidirectional data flow pattern where data is passed from parent to child components through props, and user interactions trigger callbacks that update the application state.

**Section sources**
- [ExamSchedulingUI.tsx](file://src/modules/academics/components/ExamSchedulingUI.tsx#L1-L44)
- [SchedulingCalendar.tsx](file://src/modules/academics/components/SchedulingCalendar.tsx#L1-L41)
- [ExamSchedulingPage.tsx](file://src/modules/academics/pages/ExamSchedulingPage.tsx#L1-L30)

## Architecture Overview
The exam scheduling system follows a layered architecture with clear separation between presentation, business logic, and data access layers. The UI components are decoupled from the backend services through a service layer that handles all business logic and data operations.

```mermaid
graph TD
UI[User Interface Layer] --> Service[Service Layer]
Service --> Data[Data Access Layer]
UI --> ExamSchedulingUI[ExamSchedulingUI]
UI --> SchedulingCalendar[SchedulingCalendar]
Service --> ExamScheduleManager[ExamScheduleManager]
Service --> ConflictDetectionEngine[ConflictDetectionEngine]
Service --> TimetableIntegrationService[TimetableIntegrationService]
Data --> databaseService[databaseService]
ExamSchedulingUI --> ExamScheduleManager
SchedulingCalendar --> ExamScheduleManager
ExamScheduleManager --> ConflictDetectionEngine
ExamScheduleManager --> TimetableIntegrationService
ExamScheduleManager --> databaseService
```

**Diagram sources**
- [ExamSchedulingUI.tsx](file://src/modules/academics/components/ExamSchedulingUI.tsx)
- [SchedulingCalendar.tsx](file://src/modules/academics/components/SchedulingCalendar.tsx)
- [ExamScheduleManager.ts](file://src/modules/academics/services/ExamScheduleManager.ts)
- [ConflictDetectionEngine.ts](file://src/modules/academics/services/ConflictDetectionEngine.ts)
- [TimetableIntegrationService.ts](file://src/modules/academics/services/TimetableIntegrationService.ts)

## Detailed Component Analysis

### ExamSchedulingUI Analysis
The ExamSchedulingUI component serves as the primary interface for creating and editing exam schedules. It provides a form-based interface with validation and real-time conflict detection.

#### Component Structure
```mermaid
classDiagram
class ExamSchedulingUI {
+examId : string
+onScheduleComplete : function
+onCancel : function
-formData : FormData
-conflicts : string[]
-warnings : string[]
-loading : boolean
+handleInputChange()
+handleFormSubmit()
+validateForm()
+checkConflicts()
}
class FormData {
+exam_session_id : number
+class_stream_id : number
+subject_id : number
+room_number : string
+period_id : number
+invigilator_id : string
+start_time : string
+duration_minutes : number
+max_students : number
+notes : string
}
ExamSchedulingUI --> FormData : "uses"
ExamSchedulingUI --> ConflictDetectionEngine : "depends on"
ExamSchedulingUI --> ExamScheduleManager : "uses"
```

**Diagram sources**
- [ExamSchedulingUI.tsx](file://src/modules/academics/components/ExamSchedulingUI.tsx#L1-L44)
- [types.ts](file://src/modules/academics/data/types.ts#L14-L23)

#### Form Processing Flow
```mermaid
flowchart TD
Start([Form Entry]) --> ValidateInput["Validate Input Fields"]
ValidateInput --> InputValid{"All Fields Valid?"}
InputValid --> |No| ShowErrors["Display Validation Errors"]
InputValid --> |Yes| CheckConflicts["Check for Scheduling Conflicts"]
CheckConflicts --> ConflictDetectionEngine["Call ConflictDetectionEngine.detect()"]
ConflictDetectionEngine --> ConflictsFound{"Conflicts Found?"}
ConflictsFound --> |Yes| DisplayConflicts["Show Conflict Warnings"]
ConflictsFound --> |No| PrepareData["Prepare Schedule Data"]
PrepareData --> CallBackend["Call ExamScheduleManager.createExamSchedule()"]
CallBackend --> Success{"Success?"}
Success --> |Yes| NotifyComplete["Call onScheduleComplete()"]
Success --> |No| ShowError["Display Error Message"]
NotifyComplete --> End([Form Exit])
ShowErrors --> End
DisplayConflicts --> End
ShowError --> End
```

**Diagram sources**
- [ExamSchedulingUI.tsx](file://src/modules/academics/components/ExamSchedulingUI.tsx)
- [ConflictDetectionEngine.ts](file://src/modules/academics/services/ConflictDetectionEngine.ts)
- [ExamScheduleManager.ts](file://src/modules/academics/services/ExamScheduleManager.ts)

**Section sources**
- [ExamSchedulingUI.tsx](file://src/modules/academics/components/ExamSchedulingUI.tsx#L1-L44)

### SchedulingCalendar Analysis
The SchedulingCalendar component provides a visual calendar interface for viewing and managing exam schedules. It displays scheduled exams in a time-based layout and supports filtering by date and class stream.

#### Calendar Rendering Logic
```mermaid
flowchart TD
Start([Calendar Render]) --> LoadData["Load Exam Schedules"]
LoadData --> FilterData["Apply Filters (Date, Class Stream)"]
FilterData --> GroupByPeriod["Group Schedules by Period"]
GroupByPeriod --> RenderPeriods["Render Period Blocks"]
RenderPeriods --> CheckConflicts["Check for Conflicts"]
CheckConflicts --> DisplayConflicts["Display Conflict Warnings"]
DisplayConflicts --> End([Calendar Displayed])
```

**Diagram sources**
- [SchedulingCalendar.tsx](file://src/modules/academics/components/SchedulingCalendar.tsx)

#### Component Structure
```mermaid
classDiagram
class SchedulingCalendar {
+selectedDate : string
+selectedClassStream : number
+showScheduleModal : boolean
-dailySchedule : ExamSchedule[]
-conflicts : string[]
+handleScheduleExam()
+checkConflicts()
+getPeriodTime()
+getClassStreamName()
}
class ScheduleEvent {
+id : string
+examSessionId : string
+classStreamId : number
+periodId : number
+room : string
+invigilator : string
+date : string
+startTime : string
+endTime : string
+subject : string
}
SchedulingCalendar --> ScheduleEvent : "creates"
SchedulingCalendar --> ExamSchedule : "filters"
```

**Diagram sources**
- [SchedulingCalendar.tsx](file://src/modules/academics/components/SchedulingCalendar.tsx#L1-L41)
- [types.ts](file://src/modules/academics/data/types.ts#L14-L23)

**Section sources**
- [SchedulingCalendar.tsx](file://src/modules/academics/components/SchedulingCalendar.tsx#L1-L41)

### ExamSchedulingPage Analysis
The ExamSchedulingPage component serves as the main container that orchestrates the exam scheduling functionality. It manages the overall state and coordinates between the UI components and backend services.

#### Page Workflow
```mermaid
sequenceDiagram
participant User as "User"
participant Page as "ExamSchedulingPage"
participant Manager as "ExamScheduleManager"
participant DB as "Database"
User->>Page : Navigate to page
Page->>Manager : loadSchedules()
Manager->>DB : getAllExamSchedules()
DB-->>Manager : Return schedules
Manager-->>Page : Return schedules
Page->>Page : Set schedules state
Page->>Page : Render calendar/list view
User->>Page : Click "Create New Schedule"
Page->>Page : Show create modal
User->>Page : Fill form and submit
Page->>Manager : createExamSchedule()
Manager->>DB : Insert schedule
DB-->>Manager : Return new schedule
Manager-->>Page : Return new schedule
Page->>Page : Add to schedules list
Page->>Page : Hide modal
```

**Diagram sources**
- [ExamSchedulingPage.tsx](file://src/modules/academics/pages/ExamSchedulingPage.tsx)
- [ExamScheduleManager.ts](file://src/modules/academics/services/ExamScheduleManager.ts)

**Section sources**
- [ExamSchedulingPage.tsx](file://src/modules/academics/pages/ExamSchedulingPage.tsx#L1-L30)

## Dependency Analysis
The exam scheduling components have well-defined dependencies that follow the dependency inversion principle. Higher-level components depend on abstractions rather than concrete implementations, allowing for easier testing and maintenance.

```mermaid
graph TD
ExamSchedulingPage --> ExamSchedulingUI
ExamSchedulingPage --> SchedulingCalendar
ExamSchedulingUI --> ExamScheduleManager
SchedulingCalendar --> ExamScheduleManager
ExamScheduleManager --> ConflictDetectionEngine
ExamScheduleManager --> TimetableIntegrationService
ExamScheduleManager --> databaseService
ConflictDetectionEngine --> databaseService
TimetableIntegrationService --> databaseService
style ExamSchedulingPage fill:#f9f,stroke:#333
style ExamSchedulingUI fill:#bbf,stroke:#333
style SchedulingCalendar fill:#bbf,stroke:#333
style ExamScheduleManager fill:#f96,stroke:#333
style ConflictDetectionEngine fill:#f96,stroke:#333
style TimetableIntegrationService fill:#f96,stroke:#333
style databaseService fill:#9f9,stroke:#333
```

**Diagram sources**
- [ExamSchedulingPage.tsx](file://src/modules/academics/pages/ExamSchedulingPage.tsx)
- [ExamSchedulingUI.tsx](file://src/modules/academics/components/ExamSchedulingUI.tsx)
- [SchedulingCalendar.tsx](file://src/modules/academics/components/SchedulingCalendar.tsx)
- [ExamScheduleManager.ts](file://src/modules/academics/services/ExamScheduleManager.ts)
- [ConflictDetectionEngine.ts](file://src/modules/academics/services/ConflictDetectionEngine.ts)
- [TimetableIntegrationService.ts](file://src/modules/academics/services/TimetableIntegrationService.ts)

**Section sources**
- [ExamSchedulingPage.tsx](file://src/modules/academics/pages/ExamSchedulingPage.tsx)
- [ExamSchedulingUI.tsx](file://src/modules/academics/components/ExamSchedulingUI.tsx)
- [SchedulingCalendar.tsx](file://src/modules/academics/components/SchedulingCalendar.tsx)

## Performance Considerations
The exam scheduling interface is designed with performance in mind, particularly when rendering complex schedules with many exams. The components use React's optimization techniques to minimize unnecessary re-renders.

The SchedulingCalendar component implements filtering and sorting operations efficiently by leveraging React's useEffect hook to only process data when relevant dependencies change. The calendar view is optimized by grouping schedules by period and only rendering visible periods.

For large datasets, the system could benefit from virtualized rendering of the calendar view to only render visible periods rather than the entire schedule at once. Additionally, memoization of expensive calculations like conflict detection could further improve performance.

## Troubleshooting Guide
When encountering issues with the exam scheduling interface, consider the following common problems and solutions:

1. **Schedules not appearing in calendar view**: Verify that the exam schedules are properly loaded from the database and that the date filter is set correctly.

2. **Conflict detection not working**: Check that the ConflictDetectionEngine service is properly instantiated and that the database service is accessible.

3. **Form submission failing**: Ensure all required fields are filled and that there are no conflicts preventing schedule creation.

4. **Performance issues with large schedules**: Implement pagination or virtual scrolling for the calendar view when dealing with large numbers of exams.

**Section sources**
- [ExamSchedulingUI.tsx](file://src/modules/academics/components/ExamSchedulingUI.tsx)
- [SchedulingCalendar.tsx](file://src/modules/academics/components/SchedulingCalendar.tsx)
- [ExamSchedulingPage.tsx](file://src/modules/academics/pages/ExamSchedulingPage.tsx)
- [ConflictDetectionEngine.ts](file://src/modules/academics/services/ConflictDetectionEngine.ts)

## Conclusion
The Exam Scheduling User Interface provides a robust and user-friendly solution for managing examination schedules. The system's modular architecture with clear separation of concerns makes it maintainable and extensible. The integration between the ExamSchedulingUI, SchedulingCalendar, and backend services creates a cohesive experience for users while ensuring data integrity through comprehensive conflict detection. The responsive design ensures usability across different device sizes, and the component-based architecture allows for easy customization and extension of functionality.