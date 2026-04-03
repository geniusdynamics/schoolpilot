# Letter Grading Strategy

<cite>
**Referenced Files in This Document**   
- [LetterGradeStrategy.ts](file://src/modules/academics/strategies/LetterGradeStrategy.ts)
- [types.ts](file://src/modules/academics/data/types.ts)
- [GradingEngineService.ts](file://src/modules/academics/services/GradingEngineService.ts)
- [GradingSchemesPage.tsx](file://src/modules/academics/pages/GradingSchemesPage.tsx)
- [useGradingSchemeData.ts](file://src/modules/academics/data/useGradingSchemeData.ts)
- [useGradingSchemeLevelData.ts](file://src/modules/academics/data/useGradingSchemeLevelData.ts)
- [mockData.ts](file://src/modules/academics/data/mockData.ts)
- [education-system-templates.ts](file://src/modules/academics/data/templates/education-system-templates.ts)
- [academics.json](file://src/i18n/locales/en/academics.json)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Core Components](#core-components)
3. [Grade Mapping Logic](#grade-mapping-logic)
4. [Configuration and Customization](#configuration-and-customization)
5. [Integration with Academic Systems](#integration-with-academic-systems)
6. [Edge Cases and Institutional Policies](#edge-cases-and-institutional-policies)
7. [Best Practices](#best-practices)

## Introduction
The LetterGradeStrategy implementation provides a flexible system for converting numerical scores into letter grades (A, B, C, D, F) with optional plus/minus modifiers. This strategy supports configurable grading scales that can be customized to meet institutional requirements across different academic levels and departments. The system integrates with transcript generation and report card systems, allowing for consistent grading policies across educational institutions.

The implementation follows a strategy pattern, where the LetterGradeStrategy class implements the GradingStrategy interface and is selected by the GradingEngineService based on the institution's education system configuration. This design allows for multiple grading strategies (letter grades, percentage, competency-based, etc.) to coexist within the same system.

## Core Components

The LetterGradeStrategy implementation consists of several key components that work together to provide a comprehensive grading solution:

- **LetterGradeStrategy class**: Implements the core logic for converting numerical scores to letter grades
- **GradingScheme and GradingSchemeLevel interfaces**: Define the data structure for configurable grading scales
- **GradingEngineService**: Orchestrates the grading process and selects the appropriate strategy
- **GradingSchemesPage**: Provides a user interface for configuring and managing grading schemes
- **Data hooks**: Manage the storage and retrieval of grading scheme data

```mermaid
classDiagram
class GradingStrategy {
<<interface>>
+calculate(result : StudentExamResult, gradingScheme? : GradingScheme) : StudentExamResult
}
class LetterGradeStrategy {
+calculate(result : StudentExamResult, gradingScheme? : GradingScheme) : StudentExamResult
+calculateWithModifiers(score : number) : string
+getGradePoints(grade : string) : number
+isPassing(grade : string) : boolean
}
class GradingEngineService {
-strategy : GradingStrategy
+constructor(educationSystem : EducationSystemConfiguration)
+calculateGrades(result : StudentExamResult, gradingScheme? : GradingScheme) : StudentExamResult
}
class GradingScheme {
+id : number
+name : string
+is_default : boolean
+created_at : string
+updated_at : string
+levels? : GradingSchemeLevel[]
}
class GradingSchemeLevel {
+id : number
+scheme_id : number
+grade : string
+min_score : number
+points? : number | null
+comment? : string | null
}
class StudentExamResult {
+id : string
+student_id : string
+exam_session_id : string
+total_marks? : number | null
+mean_grade? : string | null
+class_rank? : number | null
+stream_rank? : number | null
+created_at : string
+updated_at : string
+marks? : StudentPaperMark[]
}
GradingStrategy <|-- LetterGradeStrategy
GradingEngineService --> GradingStrategy : "uses"
LetterGradeStrategy --> GradingScheme : "references"
LetterGradeStrategy --> GradingSchemeLevel : "references"
GradingEngineService --> StudentExamResult : "processes"
```

**Diagram sources**
- [LetterGradeStrategy.ts](file://src/modules/academics/strategies/LetterGradeStrategy.ts)
- [types.ts](file://src/modules/academics/data/types.ts)
- [GradingEngineService.ts](file://src/modules/academics/services/GradingEngineService.ts)

**Section sources**
- [LetterGradeStrategy.ts](file://src/modules/academics/strategies/LetterGradeStrategy.ts#L1-L85)
- [types.ts](file://src/modules/academics/data/types.ts#L130-L189)
- [GradingEngineService.ts](file://src/modules/academics/services/GradingEngineService.ts#L9-L41)

## Grade Mapping Logic

### Standard Grade Conversion
The primary grade mapping logic in the LetterGradeStrategy converts numerical scores to letter grades based on configurable thresholds. When no grading scheme is provided, the system uses a default Kenyan letter grade system with the following thresholds:

```mermaid
flowchart TD
Start([Score Input]) --> CheckScore{Score >= 80?}
CheckScore --> |Yes| GradeA["Assign Grade: A"]
CheckScore --> |No| CheckAminus{Score >= 75?}
CheckAminus --> |Yes| GradeAminus["Assign Grade: A-"]
CheckAminus --> |No| CheckBplus{Score >= 70?}
CheckBplus --> |Yes| GradeBplus["Assign Grade: B+"]
CheckBplus --> |No| CheckB{Score >= 65?}
CheckB --> |Yes| GradeB["Assign Grade: B"]
CheckB --> |No| CheckBminus{Score >= 60?}
CheckBminus --> |Yes| GradeBminus["Assign Grade: B-"]
CheckBminus --> |No| CheckCplus{Score >= 55?}
CheckCplus --> |Yes| GradeCplus["Assign Grade: C+"]
CheckCplus --> |No| CheckC{Score >= 50?}
CheckC --> |Yes| GradeC["Assign Grade: C"]
CheckC --> |No| CheckCminus{Score >= 45?}
CheckCminus --> |Yes| GradeCminus["Assign Grade: C-"]
CheckCminus --> |No| CheckDplus{Score >= 40?}
CheckDplus --> |Yes| GradeDplus["Assign Grade: D+"]
CheckDplus --> |No| CheckD{Score >= 35?}
CheckD --> |Yes| GradeD["Assign Grade: D"]
CheckD --> |No| CheckDminus{Score >= 30?}
CheckDminus --> |Yes| GradeDminus["Assign Grade: D-"]
CheckDminus --> |No| GradeE["Assign Grade: E"]
GradeA --> End([Grade Assigned])
GradeAminus --> End
GradeBplus --> End
GradeB --> End
GradeBminus --> End
GradeCplus --> End
GradeC --> End
GradeCminus --> End
GradeDplus --> End
GradeD --> End
GradeDminus --> End
GradeE --> End
```

**Diagram sources**
- [LetterGradeStrategy.ts](file://src/modules/academics/strategies/LetterGradeStrategy.ts#L10-L42)

**Section sources**
- [LetterGradeStrategy.ts](file://src/modules/academics/strategies/LetterGradeStrategy.ts#L10-L42)

### Grade Modifiers System
The system supports plus/minus grade modifiers through the `calculateWithModifiers` method, which implements a more granular grading scale:

```mermaid
flowchart LR
Aplus[97-100: A+] --> A[93-96: A] --> Aminus[90-92: A-]
Bplus[87-89: B+] --> B[83-86: B] --> Bminus[80-82: B-]
Cplus[77-79: C+] --> C[73-76: C] --> Cminus[70-72: C-]
Dplus[67-69: D+] --> D[65-66: D] --> Dminus[60-64: D-]
F[<60: F]
```

This modifier system allows for more precise differentiation between student performance levels and is particularly useful in competitive academic environments.

### Grade Points Calculation
The `getGradePoints` method converts letter grades to numerical values for GPA calculation:

```mermaid
flowchart TD
Aplus["A+ (4.0)"] --> A["A (4.0)"] --> Aminus["A- (3.7)"]
Bplus["B+ (3.3)"] --> B["B (3.0)"] --> Bminus["B- (2.7)"]
Cplus["C+ (2.3)"] --> C["C (2.0)"] --> Cminus["C- (1.7)"]
Dplus["D+ (1.3)"] --> D["D (1.0)"] --> Dminus["D- (0.7)"]
F["F (0.0)"] --> E["E (0.0)"]
```

The passing grades are defined as A+, A, A-, B+, B, B-, C+, C, C-, D+, and D, with all other grades considered failing.

**Section sources**
- [LetterGradeStrategy.ts](file://src/modules/academics/strategies/LetterGradeStrategy.ts#L50-L85)

## Configuration and Customization

### Grading Scheme Management
The system provides a comprehensive interface for configuring custom grading schemes through the GradingSchemesPage component. Administrators can create, edit, and delete grading schemes with the following configurable parameters:

- **Scheme Name**: Descriptive name for the grading scheme
- **Default Status**: Whether the scheme is the default for the institution
- **Grade Levels**: Individual grade definitions with minimum scores and points
- **Grade**: The letter grade (e.g., A, B+, C-)
- **Minimum Score**: The minimum numerical score required for the grade
- **Points**: Optional grade points for GPA calculation
- **Comment**: Optional descriptive comment for the grade

```mermaid
sequenceDiagram
participant Admin as "Administrator"
participant UI as "GradingSchemesPage"
participant Hook as "useGradingSchemeData"
participant Storage as "LocalStorage"
Admin->>UI : Open Grading Schemes Management
UI->>Hook : Request grading schemes
Hook->>Storage : Retrieve from localStorage
Storage-->>Hook : Return schemes
Hook-->>UI : Provide schemes
UI-->>Admin : Display schemes in DataGrid
Admin->>UI : Click "Add Grading Scheme"
UI->>Admin : Display modal with form
Admin->>UI : Enter scheme details
UI->>Hook : Submit new scheme
Hook->>Storage : Save to localStorage
Storage-->>Hook : Confirm save
Hook-->>UI : Update data
UI-->>Admin : Refresh display
```

**Diagram sources**
- [GradingSchemesPage.tsx](file://src/modules/academics/pages/GradingSchemesPage.tsx)
- [useGradingSchemeData.ts](file://src/modules/academics/data/useGradingSchemeData.ts)

**Section sources**
- [GradingSchemesPage.tsx](file://src/modules/academics/pages/GradingSchemesPage.tsx#L0-L270)
- [useGradingSchemeData.ts](file://src/modules/academics/data/useGradingSchemeData.ts#L0-L39)

### Institutional Variations
The system supports institutional variations in grading policies through education system templates. For example, the Kenya CBC Secondary System uses letter grades with a passing threshold of 50%, while other institutions might use different scales.

```mermaid
graph TD
EducationSystem[Education System Configuration] --> |grading_system_type| LetterGrades["Letter Grades"]
EducationSystem --> |passing_grade| PassingThreshold["50%"]
EducationSystem --> |max_grade_value| MaxGrade["100"]
LetterGrades --> LetterGradeStrategy
PassingThreshold --> LetterGradeStrategy
MaxGrade --> LetterGradeStrategy
LetterGradeStrategy --> |uses| DefaultScheme["Default Kenyan Scheme"]
LetterGradeStrategy --> |can use| CustomScheme["Custom Scheme"]
DefaultScheme --> |grade levels| A["A: 80-100"]
DefaultScheme --> |grade levels| B["B: 65-79"]
DefaultScheme --> |grade levels| C["C: 50-64"]
DefaultScheme --> |grade levels| D["D: 35-49"]
DefaultScheme --> |grade levels| E["E: 0-34"]
```

**Section sources**
- [education-system-templates.ts](file://src/modules/academics/data/templates/education-system-templates.ts#L0-L32)
- [types.ts](file://src/modules/academics/data/types.ts#L272-L310)

## Integration with Academic Systems

### Grading Engine Integration
The LetterGradeStrategy integrates with the GradingEngineService, which acts as a factory for different grading strategies based on the institution's education system configuration.

```mermaid
sequenceDiagram
participant UI as "GradeCalculatorWidget"
participant Engine as "GradingEngineService"
participant Strategy as "LetterGradeStrategy"
participant Result as "StudentExamResult"
UI->>Engine : new GradingEngineService(config)
Engine->>Engine : switch(config.grading_system_type)
Engine->>Strategy : this.strategy = new LetterGradeStrategy()
Engine-->>UI : Return engine instance
UI->>Engine : calculateGrades(mockResult)
Engine->>Strategy : strategy.calculate(result)
Strategy->>Strategy : Apply grade mapping logic
Strategy-->>Engine : Return result with mean_grade
Engine-->>UI : Return calculated result
UI->>UI : Display grade and description
```

**Diagram sources**
- [GradingEngineService.ts](file://src/modules/academics/services/GradingEngineService.ts#L0-L42)
- [GradeCalculatorWidget.tsx](file://src/modules/academics/components/GradeCalculatorWidget.tsx#L28-L67)

**Section sources**
- [GradingEngineService.ts](file://src/modules/academics/services/GradingEngineService.ts#L0-L42)
- [GradeCalculatorWidget.tsx](file://src/modules/academics/components/GradeCalculatorWidget.tsx#L28-L67)

### Transcript and Report Card Generation
The graded results are stored in the StudentExamResult data structure, which includes the mean_grade field populated by the LetterGradeStrategy. This data is then used for transcript generation and report card systems.

```mermaid
flowchart TD
Entry[Student Exam Results Entry] --> |Input scores| Calculation[GradingEngineService]
Calculation --> |LetterGradeStrategy| Result[StudentExamResult]
Result --> |mean_grade| Transcript[Transcript Generation]
Result --> |mean_grade| ReportCard[Report Card System]
Result --> |mean_grade| Analytics[Academic Analytics]
Transcript --> |Formatted grades| StudentPortal[Student Portal]
ReportCard --> |Formatted grades| ParentPortal[Parent Portal]
Analytics --> |Grade distributions| Administration[Administration Dashboard]
```

**Section sources**
- [StudentExamResultsEntryPage.tsx](file://src/modules/academics/pages/StudentExamResultsEntryPage.tsx#L0-L239)
- [types.ts](file://src/modules/academics/data/types.ts#L178-L189)

## Edge Cases and Institutional Policies

### Borderline Scores and Rounding
The current implementation does not include automatic rounding of scores, which means borderline cases are handled strictly according to the minimum score thresholds. For example, a score of 79.9 would receive a B grade rather than being rounded up to an A-.

Institutions may implement their own policies for handling borderline scores, which could be addressed through:

1. Pre-processing scores to apply institutional rounding rules
2. Configuring grade thresholds with decimal precision
3. Implementing a separate rounding service that adjusts scores before grading

### Default Grading Scheme
When no custom grading scheme is provided, the system uses a default Kenyan letter grade system with 12 grade levels from A to E. This default scheme includes plus/minus modifiers and is designed to provide fine-grained differentiation between student performance levels.

```json
// Default grading scheme (Kenyan system)
[
  { "grade": "A", "min_score": 80, "points": 12, "comment": "Excellent" },
  { "grade": "A-", "min_score": 75, "points": 11, "comment": "Very Good" },
  { "grade": "B+", "min_score": 70, "points": 10, "comment": "Good" },
  // ... additional levels
]
```

**Section sources**
- [LetterGradeStrategy.ts](file://src/modules/academics/strategies/LetterGradeStrategy.ts#L10-L25)
- [mockData.ts](file://src/modules/academics/data/mockData.ts#L124-L143)

## Best Practices

### Consistency Across Grading Periods
To maintain consistency across grading periods and instructors:

1. **Standardize Grading Schemes**: Use institution-wide grading schemes rather than department-specific ones when possible
2. **Document Policies**: Clearly document grading policies and make them accessible to all instructors
3. **Regular Audits**: Conduct periodic audits of grading patterns to identify inconsistencies
4. **Training**: Provide training for instructors on the proper use of the grading system

### Configuration Management
When customizing letter grade scales for different academic levels or departments:

1. **Use Templates**: Create templates for common grading schemes to ensure consistency
2. **Version Control**: Implement version control for grading scheme changes
3. **Approval Workflow**: Require approval for changes to default grading schemes
4. **Documentation**: Maintain documentation of the rationale for custom grading schemes

### Performance Considerations
The current implementation is efficient with O(n) complexity for grade lookup, where n is the number of grade levels. For optimal performance:

1. **Limit Grade Levels**: Keep the number of grade levels reasonable (typically 5-15)
2. **Cache Schemes**: Cache frequently used grading schemes to avoid repeated database queries
3. **Indexing**: Ensure proper indexing on grading scheme data for quick retrieval

### Internationalization
The system supports internationalization through the i18n framework, allowing grading terminology to be localized in different languages. The English academics.json file contains the base translations for academic terms.

**Section sources**
- [academics.json](file://src/i18n/locales/en/academics.json#L0-L15)