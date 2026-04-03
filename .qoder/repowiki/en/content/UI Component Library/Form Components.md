# Form Components

<cite>
**Referenced Files in This Document**   
- [FormField.tsx](file://src/components/ui/forms/FormField.tsx)
- [TabbedForm.tsx](file://src/components/ui/forms/TabbedForm.tsx)
- [SlideoutForm.tsx](file://src/components/ui/forms/SlideoutForm.tsx)
- [useFormValidation.tsx](file://src/hooks/useFormValidation.tsx)
- [Input.tsx](file://src/components/ui/Input.tsx)
- [Textarea.tsx](file://src/components/ui/Textarea.tsx)
- [Select.tsx](file://src/components/ui/Select.tsx)
- [Checkbox.tsx](file://src/components/ui/Checkbox.tsx)
- [DatePicker.tsx](file://src/components/ui/forms/DatePicker.tsx)
- [EducationSystemConfigPage.tsx](file://src/modules/academics/pages/EducationSystemConfigPage.tsx)
- [StudentSubjectEnrollmentPage.tsx](file://src/modules/academics/pages/StudentSubjectEnrollmentPage.tsx)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Core Form Components](#core-form-components)
3. [Form Layout and Structure](#form-layout-and-structure)
4. [Input Components Integration](#input-components-integration)
5. [Validation System](#validation-system)
6. [Usage Examples](#usage-examples)
7. [Accessibility and User Experience](#accessibility-and-user-experience)
8. [State Management and Data Flow](#state-management-and-data-flow)

## Introduction
This document provides comprehensive documentation for the form components in the schoolpilot3 application. The form system is designed to support various data entry scenarios including multi-step processes, contextual editing, and complex validation requirements. The components are built with accessibility, responsiveness, and developer experience in mind, providing a consistent interface across the application.

**Section sources**
- [FormField.tsx](file://src/components/ui/forms/FormField.tsx#L1-L182)
- [TabbedForm.tsx](file://src/components/ui/forms/TabbedForm.tsx#L1-L486)
- [SlideoutForm.tsx](file://src/components/ui/forms/SlideoutForm.tsx#L1-L741)

## Core Form Components

### FormField Component
The FormField component serves as the base wrapper for all form elements, providing consistent layout, labeling, and error handling across the application. It standardizes spacing, labels, help text, and validation states.

```mermaid
classDiagram
class FormFieldProps {
+children : ReactNode
+label? : string
+helperText? : string
+error? : string
+success? : boolean
+required? : boolean
+optional? : boolean
+className? : string
+labelClassName? : string
+fieldId? : string
+layout? : 'vertical' | 'horizontal'
+size? : 'sm' | 'md' | 'lg'
}
class FormField {
+getLabelColor() : string
+SuccessIcon() : JSX.Element
+ErrorIcon() : JSX.Element
+enhancedChildren : ReactNode
}
FormField --> FormFieldProps : "uses"
```

**Diagram sources**
- [FormField.tsx](file://src/components/ui/forms/FormField.tsx#L10-L182)

**Section sources**
- [FormField.tsx](file://src/components/ui/forms/FormField.tsx#L1-L182)

### TabbedForm Component
The TabbedForm component enables multi-step data entry through tab navigation with progress indicators. It supports validation state indicators, responsive mobile navigation, and form state preservation between tabs.

```mermaid
classDiagram
class FormTab {
+id : string
+label : string
+icon? : ReactNode
+content : ReactNode
+validation? : () => boolean
+required? : boolean
+disabled? : boolean
}
class TabbedFormProps {
+tabs : FormTab[]
+activeTab? : number
+onTabChange? : (tabIndex : number, tabId : string) => void
+validation? : Record<string, boolean>
+onSubmit? : (data : any) => Promise<void>
+loading? : boolean
+className? : string
+variant? : 'default' | 'pills' | 'underline'
+size? : 'sm' | 'md' | 'lg'
+showProgress? : boolean
+allowTabSwitching? : boolean
+mobileBreakpoint? : 'sm' | 'md' | 'lg'
+preserveTabState? : boolean
+submitButtonText? : string
+cancelButtonText? : string
+onCancel? : () => void
+children? : ReactNode
}
class TabbedForm {
+currentTab : number
+visitedTabs : Set<number>
+tabStates : Record<string, any>
+handleTabChange(tabIndex : number) : void
+getTabValidationState(tabIndex : number) : string
+isTabAccessible(tabIndex : number) : boolean
}
TabbedForm --> FormTab : "contains"
TabbedForm --> TabbedFormProps : "uses"
```

**Diagram sources**
- [TabbedForm.tsx](file://src/components/ui/forms/TabbedForm.tsx#L15-L199)

**Section sources**
- [TabbedForm.tsx](file://src/components/ui/forms/TabbedForm.tsx#L1-L486)

### SlideoutForm Component
The SlideoutForm component provides a contextual editing interface that slides in from the side of the screen. It supports various positions, auto-save functionality, resize handles, backdrop blur effects, and enhanced accessibility features.

```mermaid
classDiagram
class SlideoutFormProps {
+isOpen : boolean
+onClose : () => void
+title : string
+children : React.ReactNode
+width? : 'sm' | 'md' | 'lg' | 'xl' | 'full'
+position? : 'left' | 'right'
+overlay? : boolean
+closeOnOverlayClick? : boolean
+closeOnEscape? : boolean
+footer? : React.ReactNode
+loading? : boolean
+className? : string
+onSave? : () => void | Promise<void>
+onCancel? : () => void
+saveLabel? : string
+cancelLabel? : string
+autoSave? : boolean
+autoSaveDelay? : number
+preventClose? : boolean
+showCloseButton? : boolean
+theme? : 'light' | 'dark' | 'auto'
+swipeToClose? : boolean
+resizable? : boolean
+backdropBlur? : boolean
+springConfig? : { damping? : number; stiffness? : number; mass? : number }
+onResize? : (width : number) => void
+minWidth? : number
+maxWidth? : number
}
class SlideoutForm {
+isAnimating : boolean
+isVisible : boolean
+hasUnsavedChanges : boolean
+currentWidth : number
+isResizing : boolean
+x : MotionValue
+dragProgress : Transform
+opacity : Transform
+scale : Transform
+getWidthValue(widthSize : string) : number
+handleDragEnd(event : Event, info : PanInfo) : void
}
SlideoutForm --> SlideoutFormProps : "uses"
```

**Diagram sources**
- [SlideoutForm.tsx](file://src/components/ui/forms/SlideoutForm.tsx#L15-L199)

**Section sources**
- [SlideoutForm.tsx](file://src/components/ui/forms/SlideoutForm.tsx#L1-L741)

## Form Layout and Structure

### Layout Variants
The form components support multiple layout configurations to accommodate different design requirements:

- **Vertical Layout**: Fields are stacked vertically with labels above inputs
- **Horizontal Layout**: Labels and inputs are aligned horizontally, with labels taking fixed width
- **Tabbed Layout**: Multi-step forms with tab navigation and progress indicators
- **Slideout Layout**: Contextual editing panels that slide in from screen edges

### Size Variants
All form components support three size variants:

- **Small (sm)**: Compact sizing for dense interfaces
- **Medium (md)**: Default sizing for standard forms
- **Large (lg)**: Spacious sizing for emphasis and accessibility

```mermaid
flowchart TD
Start([Form Creation]) --> LayoutSelection["Select Layout Type"]
LayoutSelection --> |Vertical| VerticalLayout["Apply vertical flex direction<br/>with appropriate spacing"]
LayoutSelection --> |Horizontal| HorizontalLayout["Apply horizontal flex direction<br/>with fixed label width"]
LayoutSelection --> |Tabbed| TabbedLayout["Create tab navigation<br/>with content panels"]
LayoutSelection --> |Slideout| SlideoutLayout["Configure slide animation<br/>and positioning"]
VerticalLayout --> SizeSelection["Select Size Variant"]
HorizontalLayout --> SizeSelection
TabbedLayout --> SizeSelection
SlideoutLayout --> SizeSelection
SizeSelection --> |Small| ApplySmall["Apply small size styles<br/>reduced padding and text"]
SizeSelection --> |Medium| ApplyMedium["Apply medium size styles<br/>standard padding and text"]
SizeSelection --> |Large| ApplyLarge["Apply large size styles<br/>increased padding and text"]
ApplySmall --> StylingComplete["Styling Complete"]
ApplyMedium --> StylingComplete
ApplyLarge --> StylingComplete
```

**Section sources**
- [FormField.tsx](file://src/components/ui/forms/FormField.tsx#L61-L85)
- [TabbedForm.tsx](file://src/components/ui/forms/TabbedForm.tsx#L131-L158)

## Input Components Integration

### Input Component
The Input component provides enhanced text input with floating labels, validation states, loading indicators, and icon support. It integrates seamlessly with the FormField wrapper.

```mermaid
classDiagram
class ModernInputProps {
+label : string
+error? : string
+success? : boolean
+loading? : boolean
+helperText? : string
+variant? : 'outlined' | 'filled' | 'standard'
+size? : 'sm' | 'md' | 'lg'
+leftIcon? : ReactNode
+rightIcon? : ReactNode
+onValidate? : (value : string) => string | undefined
+containerClassName? : string
+floatingLabel? : boolean
}
class Input {
+isFocused : boolean
+hasValue : boolean
+internalError : string | undefined
+inputRef : RefObject
+handleFocus(e : FocusEvent) : void
+handleBlur(e : FocusEvent) : void
+handleChange(e : ChangeEvent) : void
+shouldFloat : boolean
+getGlowEffect() : string
}
Input --> ModernInputProps : "uses"
```

**Diagram sources**
- [Input.tsx](file://src/components/ui/Input.tsx#L15-L199)

**Section sources**
- [Input.tsx](file://src/components/ui/Input.tsx#L1-L360)

### Textarea Component
The Textarea component provides multi-line text input with label and error support. It follows the same styling conventions as other input components.

```mermaid
classDiagram
class TextareaProps {
+label? : string
+error? : string
+containerClassName? : string
}
class Textarea {
+baseStyles : string
+errorStyles : string
}
Textarea --> TextareaProps : "uses"
```

**Diagram sources**
- [Textarea.tsx](file://src/components/ui/Textarea.tsx#L5-L32)

**Section sources**
- [Textarea.tsx](file://src/components/ui/Textarea.tsx#L1-L32)

### Select Component
The Select component offers enhanced dropdown functionality with search, keyboard navigation, and accessibility features. It supports both single and multi-select modes.

```mermaid
classDiagram
class SelectOption {
+value : string
+label : string
+disabled? : boolean
+description? : string
+icon? : ReactNode
}
class SelectProps {
+label? : string
+placeholder? : string
+error? : string
+helperText? : string
+disabled? : boolean
+required? : boolean
+loading? : boolean
+options? : SelectOption[]
+children? : ReactNode
+value? : string | string[]
+defaultValue? : string | string[]
+onChange? : (value : string | string[] | React.ChangeEvent) => void
+multiple? : boolean
+maxSelections? : number
+searchable? : boolean
+searchPlaceholder? : string
+noOptionsMessage? : string
+size? : 'sm' | 'md' | 'lg'
+variant? : 'outlined' | 'filled'
+className? : string
+containerClassName? : string
+id? : string
+name? : string
+'aria-label'? : string
+'aria-describedby'? : string
+onFocus? : (event : FocusEvent) => void
+onBlur? : (event : FocusEvent) => void
+onSearch? : (query : string) => void
}
class Select {
+isOpen : boolean
+searchQuery : string
+focusedIndex : number
+internalValue : string | string[]
+containerRef : RefObject
+triggerRef : RefObject
+dropdownRef : RefObject
+searchInputRef : RefObject
+optionRefs : RefObject[]
+effectiveOptions : SelectOption[]
+filteredOptions : SelectOption[]
+selectedOptions : SelectOption[]
+handleValueChange(newValue : string | string[]) : void
+handleSearch(query : string) : void
+handleKeyDown(e : KeyboardEvent) : void
+handleBlur(e : FocusEvent) : void
}
Select --> SelectOption : "contains"
Select --> SelectProps : "uses"
```

**Diagram sources**
- [Select.tsx](file://src/components/ui/Select.tsx#L75-L199)

**Section sources**
- [Select.tsx](file://src/components/ui/Select.tsx#L1-L732)

### Checkbox Component
The Checkbox component provides standard checkbox functionality with label integration and disabled state support.

```mermaid
classDiagram
class CheckboxProps {
+id? : string
+checked? : boolean
+onChange? : (checked : boolean) => void
+disabled? : boolean
+className? : string
+children? : React.ReactNode
}
class Checkbox {
+handleChange(e : ChangeEvent) : void
}
Checkbox --> CheckboxProps : "uses"
```

**Diagram sources**
- [Checkbox.tsx](file://src/components/ui/Checkbox.tsx#L5-L46)

**Section sources**
- [Checkbox.tsx](file://src/components/ui/Checkbox.tsx#L1-L46)

### DatePicker Component
The DatePicker component provides date selection with calendar interface, supporting both single date and date range selection with keyboard navigation.

```mermaid
classDiagram
class DatePickerProps {
+value? : Date | null
+onChange? : (date : Date | null) => void
+placeholder? : string
+disabled? : boolean
+error? : string
+success? : boolean
+size? : 'sm' | 'md' | 'lg'
+variant? : 'outlined' | 'filled'
+minDate? : Date
+maxDate? : Date
+disabledDates? : Date[]
+showTime? : boolean
+format? : string
+locale? : string
+className? : string
+isRange? : boolean
+rangeValue? : [Date | null, Date | null]
+onRangeChange? : (range : [Date | null, Date | null]) => void
+'aria-label'? : string
+'aria-describedby'? : string
+id? : string
}
class CalendarState {
+currentMonth : Date
+selectedDate : Date | null
+selectedRange : [Date | null, Date | null]
+focusedDate : Date | null
+isOpen : boolean
}
class DatePicker {
+calendarState : CalendarState
+inputRef : RefObject
+isPending : boolean
+formatDate(date : Date | null) : string
+isDateDisabled(date : Date) : boolean
+openCalendar() : void
+closeCalendar() : void
+handleDateSelect(date : Date | null) : void
+handleKeyDown(event : KeyboardEvent) : void
}
DatePicker --> DatePickerProps : "uses"
DatePicker --> CalendarState : "manages"
```

**Diagram sources**
- [DatePicker.tsx](file://src/components/ui/forms/DatePicker.tsx#L75-L199)

**Section sources**
- [DatePicker.tsx](file://src/components/ui/forms/DatePicker.tsx#L1-L509)

## Validation System

### useFormValidation Hook
The useFormValidation hook provides a centralized system for form validation with real-time validation, debouncing, and accessibility support. It manages validation rules, error states, and form submission.

```mermaid
classDiagram
class ValidationRule {
+validator : (value : T, formData? : Record) => boolean | Promise<boolean>
+message : string
+debounceMs? : number
+validateOnChange? : boolean
+validateOnBlur? : boolean
+priority? : number
}
class FieldValidationConfig {
+rules : ValidationRule[]
+required? : boolean
+requiredMessage? : string
+debounceMs? : number
+validateOnChange? : boolean
+validateOnBlur? : boolean
+validateOnMount? : boolean
}
class FormValidationConfig {
+[fieldName : string] : FieldValidationConfig
}
class ValidationError {
+message : string
+rule? : ValidationRule
+priority : number
}
class FieldValidationState {
+isValid : boolean
+isValidating : boolean
+errors : ValidationError[]
+touched : boolean
+dirty : boolean
}
class FormValidationState {
+[fieldName : string] : FieldValidationState
}
class UseFormValidationOptions {
+mode? : 'onChange' | 'onBlur' | 'onSubmit' | 'all'
+debounceMs? : number
+announceErrors? : boolean
+revalidateMode? : 'onChange' | 'onBlur'
+shouldFocusError? : boolean
}
class useFormValidation {
+formData : T
+validationState : FormValidationState
+isSubmitting : boolean
+validateField(fieldName : string, value : any) : Promise<ValidationError[]>
+setFieldValue(fieldName : string, value : any) : Promise<void>
+setFieldTouched(fieldName : string, touched : boolean) : Promise<void>
+validateForm() : Promise<boolean>
+handleSubmit(callback : (data : T) => Promise<void>) : Promise<void>
+resetForm() : void
+getFieldProps(fieldName : string) : FieldProps
+isValid : boolean
+isValidating : boolean
+isDirty : boolean
+touchedFields : string[]
}
useFormValidation --> ValidationRule : "uses"
useFormValidation --> FieldValidationConfig : "uses"
useFormValidation --> FormValidationConfig : "uses"
useFormValidation --> ValidationError : "uses"
useFormValidation --> FieldValidationState : "uses"
useFormValidation --> FormValidationState : "uses"
useFormValidation --> UseFormValidationOptions : "uses"
```

**Diagram sources**
- [useFormValidation.tsx](file://src/hooks/useFormValidation.tsx#L1-L47)

**Section sources**
- [useFormValidation.tsx](file://src/hooks/useFormValidation.tsx#L1-L529)

### Built-in Validators
The validation system includes several built-in validators for common use cases:

```mermaid
flowchart TD
Validators["Built-in Validators"] --> Required["required(message)"]
Validators --> MinLength["minLength(min, message)"]
Validators --> MaxLength["maxLength(max, message)"]
Validators --> Email["email(message)"]
Validators --> Pattern["pattern(regex, message)"]
Validators --> Numeric["numeric(message)"]
Validators --> Min["min(min, message)"]
Validators --> Max["max(max, message)"]
Validators --> Custom["custom(validator, message)"]
Required --> |Checks| RequiredLogic["Value exists and is not empty"]
MinLength --> |Checks| MinLengthLogic["String length >= min"]
MaxLength --> |Checks| MaxLengthLogic["String length <= max"]
Email --> |Checks| EmailLogic["Valid email format"]
Pattern --> |Checks| PatternLogic["Matches regex pattern"]
Numeric --> |Checks| NumericLogic["Valid number"]
Min --> |Checks| MinLogic["Number >= min"]
Max --> |Checks| MaxLogic["Number <= max"]
Custom --> |Checks| CustomLogic["Custom validation function"]
```

**Section sources**
- [useFormValidation.tsx](file://src/hooks/useFormValidation.tsx#L81-L165)

## Usage Examples

### Education System Configuration
The EducationSystemConfigPage demonstrates the use of form components for system configuration, utilizing the EducationSystemForm component within a page layout.

```mermaid
sequenceDiagram
participant Page as EducationSystemConfigPage
participant Form as EducationSystemForm
participant Field as FormField
participant Input as Input
participant Select as Select
participant DatePicker as DatePicker
Page->>Form : Render with initialData, onSave, onCancel
Form->>Field : Create field wrapper for system name
Field->>Input : Wrap input component with label and validation
Form->>Field : Create field wrapper for education type
Field->>Select : Wrap select component with options
Form->>Field : Create field wrapper for start date
Field->>DatePicker : Wrap date picker with validation
Form->>Page : Call onSave with form data
Page->>Form : Handle save success/failure
```

**Diagram sources**
- [EducationSystemConfigPage.tsx](file://src/modules/academics/pages/EducationSystemConfigPage.tsx#L1-L20)

**Section sources**
- [EducationSystemConfigPage.tsx](file://src/modules/academics/pages/EducationSystemConfigPage.tsx#L1-L20)

### Student Subject Enrollment
The StudentSubjectEnrollmentPage demonstrates a complex form scenario with modal dialogs, data grids, and form validation for student enrollment management.

```mermaid
flowchart TD
Page["StudentSubjectEnrollmentPage"] --> DataHook["useAppData()"]
DataHook --> Students["students"]
DataHook --> ClassSubjectAllocations["classSubjectAllocations"]
DataHook --> AcademicYears["academicYears"]
DataHook --> SchoolPeriods["schoolPeriods"]
DataHook --> Classes["classes"]
DataHook --> ClassStreams["classStreams"]
DataHook --> Subjects["subjects"]
Page --> Filters["Filter State"]
Filters --> SelectedAcademicYear["selectedAcademicYearId"]
Filters --> SelectedSchoolPeriod["selectedSchoolPeriodId"]
Filters --> SelectedClass["selectedClassId"]
Filters --> SelectedStream["selectedStreamId"]
Page --> Modal["Modal State"]
Modal --> IsModalOpen["isModalOpen"]
Modal --> EditingEnrollment["editingEnrollment"]
Modal --> FormData["formData"]
Page --> Grid["DataGrid"]
Grid --> StudentsForGrid["studentsForGrid"]
Grid --> SubjectsForGrid["subjectsForGrid"]
Page --> Form["Enrollment Form"]
Form --> Input["Input"]
Form --> Select["Select"]
Form --> DatePicker["DatePicker"]
Form --> Button["Button"]
Filters --> |Updates| Grid
Filters --> |Updates| Form
Modal --> |Triggers| Form
Form --> |Submits| Page
Page --> |Handles| FormSubmission["handleSubmit"]
```

**Diagram sources**
- [StudentSubjectEnrollmentPage.tsx](file://src/modules/academics/pages/StudentSubjectEnrollmentPage.tsx#L1-L199)

**Section sources**
- [StudentSubjectEnrollmentPage.tsx](file://src/modules/academics/pages/StudentSubjectEnrollmentPage.tsx#L1-L348)

## Accessibility and User Experience

### Accessibility Features
The form components include comprehensive accessibility features to ensure usability for all users:

- **ARIA Attributes**: Proper use of aria-describedby, aria-invalid, aria-required, and aria-label attributes
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: Announcements for state changes and validation messages
- **Focus Management**: Proper focus trapping and restoration
- **Color Contrast**: Sufficient contrast for text and interactive elements
- **Responsive Design**: Mobile-friendly layouts and touch targets

```mermaid
flowchart TD
Accessibility["Accessibility Features"] --> ARIA["ARIA Attributes"]
ARIA --> DescribedBy["aria-describedby"]
ARIA --> Invalid["aria-invalid"]
ARIA --> Required["aria-required"]
ARIA --> Label["aria-label"]
Accessibility --> Keyboard["Keyboard Navigation"]
Keyboard --> TabOrder["Logical tab order"]
Keyboard --> FocusVisible["Visible focus indicators"]
Keyboard --> Shortcuts["Keyboard shortcuts"]
Accessibility --> ScreenReader["Screen Reader Support"]
ScreenReader --> Announcements["State change announcements"]
ScreenReader --> Labels["Proper labeling"]
ScreenReader --> Instructions["Help text"]
Accessibility --> FocusManagement["Focus Management"]
FocusManagement --> Trapping["Focus trapping in modals"]
FocusManagement --> Restoration["Focus restoration"]
FocusManagement --> Indicators["Focus indicators"]
Accessibility --> Visual["Visual Design"]
Visual --> Contrast["Color contrast"]
Visual --> Spacing["Adequate spacing"]
Visual --> Touch["Touch target size"]
```

**Section sources**
- [FormField.tsx](file://src/components/ui/forms/FormField.tsx#L1-L182)
- [Input.tsx](file://src/components/ui/Input.tsx#L1-L360)
- [Select.tsx](file://src/components/ui/Select.tsx#L1-L732)
- [DatePicker.tsx](file://src/components/ui/forms/DatePicker.tsx#L1-L509)

### Keyboard Navigation
The form components support comprehensive keyboard navigation for improved accessibility:

- **Tab/Shift+Tab**: Navigate between form fields
- **Arrow Keys**: Navigate within select dropdowns and date pickers
- **Enter/Space**: Activate buttons and toggle checkboxes
- **Escape**: Close dropdowns, modals, and slideout forms
- **Home/End**: Navigate to first/last options in lists

**Section sources**
- [Select.tsx](file://src/components/ui/Select.tsx#L500-L550)
- [DatePicker.tsx](file://src/components/ui/forms/DatePicker.tsx#L300-L350)

## State Management and Data Flow

### Form State Management
The form components use React state and hooks to manage form state, validation, and user interactions:

```mermaid
flowchart TD
StateManagement["Form State Management"] --> ReactState["React State"]
ReactState --> useState["useState for local state"]
ReactState --> useEffect["useEffect for side effects"]
ReactState --> useRef["useRef for references"]
StateManagement --> CustomHooks["Custom Hooks"]
CustomHooks --> useFormValidation["useFormValidation"]
CustomHooks --> useTransition["useTransition"]
CustomHooks --> useFocusManagement["useFocusManagement"]
StateManagement --> DataFlow["Data Flow"]
DataFlow --> Unidirectional["Unidirectional data flow"]
DataFlow --> Controlled["Controlled components"]
DataFlow --> Callbacks["Callback functions"]
StateManagement --> Lifecycle["Component Lifecycle"]
Lifecycle --> Mount["Component mount"]
Lifecycle --> Update["State updates"]
Lifecycle --> Unmount["Cleanup on unmount"]
```

**Section sources**
- [FormField.tsx](file://src/components/ui/forms/FormField.tsx#L1-L182)
- [TabbedForm.tsx](file://src/components/ui/forms/TabbedForm.tsx#L1-L486)
- [SlideoutForm.tsx](file://src/components/ui/forms/SlideoutForm.tsx#L1-L741)
- [useFormValidation.tsx](file://src/hooks/useFormValidation.tsx#L1-L529)