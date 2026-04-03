# Timetable UI Components

<cite>
**Referenced Files in This Document**   
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)
- [TimetablePeriodsPage.tsx](file://src/modules/academics/pages/TimetablePeriodsPage.tsx)
- [useTimetableEntryData.ts](file://src/modules/academics/data/useTimetableEntryData.ts)
- [TimetableIntegrationService.ts](file://src/modules/academics/services/TimetableIntegrationService.ts)
- [TabbedWorkspace.tsx](file://src/components/tabbedWorkspace/TabbedWorkspace.tsx)
- [useAppData.ts](file://src/hooks/useAppData.ts)
- [useRxDBData.ts](file://src/hooks/useRxDBData.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Core Components Overview](#core-components-overview)
3. [TimetableEntriesPage Implementation](#timetableentriespage-implementation)
4. [TimetablePeriodsPage Implementation](#timetableperiodspage-implementation)
5. [Data Management and Integration](#data-management-and-integration)
6. [Form Validation and Conflict Detection](#form-validation-and-conflict-detection)
7. [Tabbed Workspace Integration](#tabbed-workspace-integration)
8. [Responsive Design and Accessibility](#responsive-design-and-accessibility)
9. [Usage Examples and Customization](#usage-examples-and-customization)
10. [Conclusion](#conclusion)

## Introduction

The Timetable UI Components provide a comprehensive interface for managing school timetables, enabling administrators to create, edit, and visualize class schedules. This documentation details the implementation of two primary components: TimetableEntriesPage and TimetablePeriodsPage, which work together to provide a complete timetable management solution. The system supports both weekly and daily views, drag-and-drop scheduling capabilities, and real-time conflict detection to ensure schedule integrity.

The components are built using React with TypeScript, leveraging a modular architecture that separates concerns between data management, UI presentation, and business logic. The implementation integrates with a DataGrid component for displaying timetable data and utilizes a TabbedWorkspace system for managing multiple timetable views simultaneously. The interface is designed to be responsive and accessible, supporting various screen sizes and keyboard navigation.

**Section sources**
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)
- [TimetablePeriodsPage.tsx](file://src/modules/academics/pages/TimetablePeriodsPage.tsx)

## Core Components Overview

The timetable system consists of two main components: TimetableEntriesPage for managing individual timetable entries (class assignments to specific time slots) and TimetablePeriodsPage for defining the time periods that make up the school day. These components work in conjunction with several supporting services and hooks to provide a complete timetable management solution.

The architecture follows a component-based design pattern with clear separation of concerns. The UI components are responsible for presentation and user interaction, while data management is handled by custom hooks and services. This separation allows for easier maintenance and testing of individual components.

```mermaid
graph TD
A[TimetableEntriesPage] --> B[DataGrid Display]
A --> C[Form Validation]
A --> D[Conflict Detection]
A --> E[Tabbed Workspace]
F[TimetablePeriodsPage] --> G[Period Management]
F --> H[Time Slot Definition]
F --> I[Validation Rules]
B --> J[useAppData Hook]
C --> K[Form Validation Logic]
D --> L[TimetableIntegrationService]
E --> M[TabbedWorkspace Component]
J --> N[Database Service]
L --> N
M --> O[Tab Store]
```

**Diagram sources**
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)
- [TimetablePeriodsPage.tsx](file://src/modules/academics/pages/TimetablePeriodsPage.tsx)
- [TabbedWorkspace.tsx](file://src/components/tabbedWorkspace/TabbedWorkspace.tsx)

**Section sources**
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)
- [TimetablePeriodsPage.tsx](file://src/modules/academics/pages/TimetablePeriodsPage.tsx)

## TimetableEntriesPage Implementation

The TimetableEntriesPage component provides a visual interface for managing class timetable entries. It displays a grid-based timetable where rows represent time periods and columns represent days of the week. Users can add, edit, and delete timetable entries through a modal interface that appears when interacting with time slots.

The component uses a responsive table layout that adapts to different screen sizes. On larger screens, the full weekly timetable is displayed, while on smaller screens, users can scroll horizontally to view different days. The timetable cells are color-coded based on the subject being taught, making it easy to visually identify different classes.

```mermaid
classDiagram
class TimetableEntriesPage {
+isModalOpen : boolean
+editingEntry : TimetableEntry | null
+selectedClassStreamId : number | undefined
+formData : TimetableEntryFormData
+openModal(entry : TimetableEntry, day : DayOfWeek, periodId : number)
+closeModal()
+handleInputChange(e : ChangeEvent)
+handleSubmit()
+handleDelete(id : string)
+findEntry(day : DayOfWeek, periodId : number)
+getSubjectColor(subjectId : number)
}
class TimetableEntry {
+id : string
+class_stream_id : number
+day_of_week : DayOfWeek
+period_id : number
+subject_id : number
+teacher_id : string
+class_stream_name : string
+period_name : string
+subject_name : string
+teacher_name : string
}
TimetableEntriesPage --> TimetableEntry : "manages"
```

**Diagram sources**
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)

**Section sources**
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)

## TimetablePeriodsPage Implementation

The TimetablePeriodsPage component allows administrators to define and manage the time periods that make up the school day. Each period has a name, start time, and end time, which are used to structure the timetable grid in TimetableEntriesPage.

The component provides a simple interface for creating, editing, and deleting periods. When adding or editing a period, form validation ensures that the end time is after the start time and that all required fields are filled. This prevents the creation of invalid time periods that could disrupt the timetable structure.

```mermaid
flowchart TD
Start([Add/Edit Period]) --> ValidateInput["Validate Form Fields"]
ValidateInput --> InputValid{"All Fields Filled?"}
InputValid --> |No| ReturnError["Show 'All Fields Required' Message"]
InputValid --> |Yes| CheckTime{"End Time After Start Time?"}
CheckTime --> |No| ReturnTimeError["Show 'End Time Must Be After Start Time' Message"]
CheckTime --> |Yes| ProcessPeriod["Create/Update Period Object"]
ProcessPeriod --> SavePeriod["Save to Database"]
SavePeriod --> CloseModal["Close Modal and Refresh Data"]
ReturnError --> CloseModal
ReturnTimeError --> CloseModal
```

**Diagram sources**
- [TimetablePeriodsPage.tsx](file://src/modules/academics/pages/TimetablePeriodsPage.tsx)

**Section sources**
- [TimetablePeriodsPage.tsx](file://src/modules/academics/pages/TimetablePeriodsPage.tsx)

## Data Management and Integration

The timetable components integrate with the application's data layer through the useAppData hook, which provides access to timetable entries, class streams, periods, subjects, and staff data. This hook abstracts the underlying data storage mechanism, allowing the UI components to remain agnostic of whether data is stored locally or retrieved from a remote server.

The useAppData hook leverages the useRxDBData hook for database operations, providing a reactive data interface that automatically updates the UI when data changes. This ensures that the timetable display is always synchronized with the current state of the database.

```mermaid
sequenceDiagram
participant UI as TimetableEntriesPage
participant Hook as useAppData
participant DataHook as useRxDBData
participant DB as DatabaseService
UI->>Hook : Request timetable data
Hook->>DataHook : Get data from database
DataHook->>DB : Query timetable_entries collection
DB-->>DataHook : Return timetable entries
DataHook-->>Hook : Provide data to useAppData
Hook-->>UI : Update component state
UI->>UI : Re-render timetable grid
UI->>Hook : Add new timetable entry
Hook->>DataHook : Create new entry
DataHook->>DB : Insert into timetable_entries
DB-->>DataHook : Confirm insertion
DataHook-->>Hook : Update data state
Hook-->>UI : Refresh display
```

**Diagram sources**
- [useAppData.ts](file://src/hooks/useAppData.ts)
- [useRxDBData.ts](file://src/hooks/useRxDBData.ts)

**Section sources**
- [useAppData.ts](file://src/hooks/useAppData.ts)
- [useRxDBData.ts](file://src/hooks/useRxDBData.ts)

## Form Validation and Conflict Detection

The timetable components implement comprehensive form validation to ensure data integrity. In TimetableEntriesPage, validation occurs when submitting the modal form, checking that all required fields are filled: class stream, day of week, period, subject, and teacher. In TimetablePeriodsPage, additional validation ensures that the end time is after the start time.

Beyond basic form validation, the system includes real-time conflict detection through the TimetableIntegrationService. This service checks for scheduling conflicts when creating or modifying timetable entries, preventing double-booking of rooms, teachers, or classes. The conflict detection logic examines existing timetable entries and exam schedules to identify potential overlaps.

```mermaid
flowchart TD
A[Submit Timetable Entry] --> B{All Required Fields Filled?}
B --> |No| C[Show Validation Error]
B --> |Yes| D[Check for Conflicts]
D --> E[Query Existing Timetable Entries]
E --> F{Conflict Detected?}
F --> |Yes| G[Display Conflict Details]
F --> |No| H[Save Entry to Database]
H --> I[Update UI Display]
C --> J[Prevent Submission]
G --> J
I --> K[Success Notification]
```

**Diagram sources**
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)
- [TimetableIntegrationService.ts](file://src/modules/academics/services/TimetableIntegrationService.ts)

**Section sources**
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)
- [TimetableIntegrationService.ts](file://src/modules/academics/services/TimetableIntegrationService.ts)

## Tabbed Workspace Integration

The timetable components are integrated with the TabbedWorkspace system, allowing users to manage multiple timetable views simultaneously. This enables administrators to view and edit timetables for different class streams or departments in separate tabs, improving workflow efficiency.

The TabbedWorkspace component provides a tabbed interface with features like tab reordering, pinning, and closing. It maintains the state of each tab, including the active class stream and scroll position, allowing users to quickly switch between different timetable views without losing their place.

```mermaid
graph TB
A[TabbedWorkspace] --> B[TabBar]
A --> C[ActionBar]
A --> D[TabContent]
B --> E[Tab: Form 1A Timetable]
B --> F[Tab: Form 1B Timetable]
B --> G[Tab: Science Department]
D --> H[TimetableEntriesPage]
D --> I[TimetablePeriodsPage]
E --> H
F --> H
G --> I
style H fill:#f9f,stroke:#333
style I fill:#bbf,stroke:#333
```

**Diagram sources**
- [TabbedWorkspace.tsx](file://src/components/tabbedWorkspace/TabbedWorkspace.tsx)
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)

**Section sources**
- [TabbedWorkspace.tsx](file://src/components/tabbedWorkspace/TabbedWorkspace.tsx)
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)

## Responsive Design and Accessibility

The timetable components are designed with responsiveness in mind, adapting to different screen sizes and device types. On desktop screens, the full weekly timetable is displayed in a grid format. On tablets, the interface remains similar but with adjusted spacing. On mobile devices, the layout switches to a more compact format with horizontal scrolling to view different days.

Accessibility features include proper semantic HTML structure, keyboard navigation support, and ARIA attributes for screen readers. The modal forms are accessible via keyboard, and all interactive elements have appropriate focus states. The color contrast meets WCAG guidelines, ensuring readability for users with visual impairments.

```mermaid
flowchart LR
A[Screen Size Detection] --> B{Width > 1024px?}
B --> |Yes| C[Desktop Layout: Full Grid]
B --> |No| D{Width > 768px?}
D --> |Yes| E[Tablet Layout: Compact Grid]
D --> |No| F[Mobile Layout: Scrollable Grid]
C --> G[7 Columns: Days of Week]
E --> H[Reduced Padding]
F --> I[Horizontal Scroll]
style C fill:#cfc,stroke:#333
style E fill:#ccf,stroke:#333
style F fill:#fcc,stroke:#333
```

**Diagram sources**
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)

**Section sources**
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)

## Usage Examples and Customization

The timetable components support various usage scenarios and can be customized to meet institution-specific requirements. Common workflows include creating a new timetable for a semester, adjusting schedules during mid-term changes, and resolving scheduling conflicts.

For customization, institutions can modify the color scheme, adjust the number of periods per day, or extend the functionality to include features like room assignments or co-teaching support. The modular design allows for adding custom validation rules or integrating with external systems like student information systems.

Example workflow for creating a new timetable:
1. Navigate to TimetablePeriodsPage and define the daily periods
2. Go to TimetableEntriesPage and select the target class stream
3. Click on empty time slots to open the entry modal
4. Select the subject and teacher for each slot
5. Submit the entry and repeat for all required slots
6. Review the complete timetable for conflicts or gaps

**Section sources**
- [TimetableEntriesPage.tsx](file://src/modules/academics/pages/TimetableEntriesPage.tsx)
- [TimetablePeriodsPage.tsx](file://src/modules/academics/pages/TimetablePeriodsPage.tsx)

## Conclusion

The Timetable UI Components provide a robust and user-friendly interface for managing school timetables. Through the integration of TimetableEntriesPage and TimetablePeriodsPage, administrators can efficiently create and maintain class schedules while ensuring data integrity through comprehensive validation and conflict detection.

The components' integration with the TabbedWorkspace system enables efficient multitasking, allowing users to manage multiple timetables simultaneously. The responsive design ensures accessibility across different devices, while the accessible interface supports users with various needs.

Future enhancements could include drag-and-drop functionality for reassigning classes, automated timetable generation based on constraints, and enhanced reporting capabilities. The modular architecture makes it relatively straightforward to implement these features while maintaining the existing functionality.