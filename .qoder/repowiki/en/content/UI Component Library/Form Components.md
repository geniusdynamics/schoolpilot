# Form Components

<cite>
**Referenced Files in This Document**
- [DialogForm.tsx](file://src/components/ui/forms/DialogForm.tsx)
- [WizardForm.tsx](file://src/components/ui/forms/WizardForm.tsx)
- [MinimalForm.tsx](file://src/components/ui/forms/MinimalForm.tsx)
- [PrintForm.tsx](file://src/components/ui/forms/PrintForm.tsx)
- [FormContainer.tsx](file://src/components/ui/forms/FormContainer.tsx)
- [FormHeader.tsx](file://src/components/ui/forms/FormHeader.tsx)
- [FormSection.tsx](file://src/components/ui/forms/FormSection.tsx)
- [FormGrid.tsx](file://src/components/ui/forms/FormGrid.tsx)
- [FormActions.tsx](file://src/components/ui/forms/FormActions.tsx)
- [FormField.tsx](file://src/components/ui/forms/FormField.tsx)
- [useFormValidation.tsx](file://src/hooks/useFormValidation.tsx)
- [Modal.tsx](file://src/components/ui/Modal.tsx)
- [FORM_MIGRATION_PLAN.md](file://docs/FORM_MIGRATION_PLAN.md)
</cite>

## Update Summary
**Changes Made**
- Updated to reflect comprehensive form system modernization from Modal to DialogForm framework
- Added documentation for new form components: WizardForm, MinimalForm, and PrintForm
- Enhanced validation system documentation with useFormValidation hook improvements
- Added migration guidance from Modal-based forms to new DialogForm framework
- Updated form composition patterns and standardized form architecture documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Form Framework Architecture](#form-framework-architecture)
3. [Core Form Components](#core-form-components)
4. [Form Composition System](#form-composition-system)
5. [Form Layout and Structure](#form-layout-and-structure)
6. [Input Components Integration](#input-components-integration)
7. [Validation System](#validation-system)
8. [Usage Examples](#usage-examples)
9. [Migration from Modal Forms](#migration-from-modal-forms)
10. [Accessibility and User Experience](#accessibility-and-user-experience)
11. [State Management and Data Flow](#state-management-and-data-flow)

## Introduction
This document provides comprehensive documentation for the form components in the schoolpilot3 application. The form system has undergone a comprehensive modernization, transitioning from Modal-based forms to a standardized DialogForm framework. This new architecture emphasizes composition over inheritance, providing reusable building blocks for various form scenarios including modal dialogs, wizards, minimal forms, and print-optimized layouts.

The modernized form system introduces five specialized form components: DialogForm for modal presentations, WizardForm for multi-step processes, MinimalForm for clean interfaces, PrintForm for document generation, and enhanced validation through the useFormValidation hook. This framework ensures consistency, accessibility, and extensibility across all form implementations.

**Section sources**
- [DialogForm.tsx:1-194](file://src/components/ui/forms/DialogForm.tsx#L1-L194)
- [FormContainer.tsx:1-151](file://src/components/ui/forms/FormContainer.tsx#L1-L151)
- [FORM_MIGRATION_PLAN.md:1-457](file://docs/FORM_MIGRATION_PLAN.md#L1-L457)

## Form Framework Architecture
The new form framework is built around a composition-based architecture that separates concerns between presentation, structure, and behavior. The DialogForm component serves as the primary entry point, combining Modal presentation with FormContainer structure and FormHeader functionality.

```mermaid
graph TB
DialogForm[DialogForm] --> Modal[Modal]
DialogForm --> FormContainer[FormContainer]
DialogForm --> FormHeader[FormHeader]
FormContainer --> FormHeader
FormContainer --> FormSection[FormSection]
FormContainer --> FormGrid[FormGrid]
FormContainer --> FormActions[FormActions]
FormSection --> FormGrid
FormSection --> FormField[FormField]
FormGrid --> FormField
WizardForm[WizardForm] --> FormContainer
MinimalForm[MinimalForm] --> FormContainer
PrintForm[PrintForm] --> FormContainer
FormField --> Input[Input]
FormField --> Select[Select]
FormField --> DatePicker[DatePicker]
FormField --> Textarea[Textarea]
FormField --> Checkbox[Checkbox]
```

**Diagram sources**
- [DialogForm.tsx:1-194](file://src/components/ui/forms/DialogForm.tsx#L1-L194)
- [FormContainer.tsx:1-151](file://src/components/ui/forms/FormContainer.tsx#L1-L151)
- [WizardForm.tsx:1-441](file://src/components/ui/forms/WizardForm.tsx#L1-L441)
- [MinimalForm.tsx:1-184](file://src/components/ui/forms/MinimalForm.tsx#L1-L184)
- [PrintForm.tsx:1-304](file://src/components/ui/forms/PrintForm.tsx#L1-L304)

**Section sources**
- [DialogForm.tsx:1-194](file://src/components/ui/forms/DialogForm.tsx#L1-L194)
- [FormContainer.tsx:1-151](file://src/components/ui/forms/FormContainer.tsx#L1-L151)

## Core Form Components

### DialogForm Component
The DialogForm component represents the new standardized approach to modal forms, combining Modal presentation with comprehensive form structure and validation capabilities.

```mermaid
classDiagram
class DialogFormProps {
+isOpen : boolean
+onClose : () => void
+title : string
+children : ReactNode
+description? : string
+progress? : number
+showProgress? : boolean
+stepLabel? : string
+icon? : ReactNode
+badge? : ReactNode
+onSubmit? : (event : FormEvent) => void
+formProps? : Partial~FormContainerProps~
+headerProps? : Partial~FormHeaderProps~
+autoSaveStatus? : 'idle' | 'saving' | 'saved' | 'error'
+lastSaved? : Date | null
+contentPadding? : 'none' | 'sm' | 'md' | 'lg'
+size? : 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
+loading? : boolean
+preventClose? : boolean
}
class DialogFormRef {
+form : HTMLFormElement | null
+modal : HTMLDivElement | null
+submit() : void
+reset() : void
}
class DialogForm {
+formRef : RefObject
+modalRef : RefObject
+submit() : void
+reset() : void
}
DialogForm --> DialogFormProps : "uses"
DialogForm --> DialogFormRef : "exposes"
```

**Diagram sources**
- [DialogForm.tsx:9-47](file://src/components/ui/forms/DialogForm.tsx#L9-L47)

**Section sources**
- [DialogForm.tsx:1-194](file://src/components/ui/forms/DialogForm.tsx#L1-L194)

### WizardForm Component
The WizardForm component provides comprehensive multi-step form functionality with progress tracking, validation, and navigation controls.

```mermaid
classDiagram
class WizardStep {
+id : string
+title : string
+description? : string
+content : ReactNode
+validate? : () => boolean | Promise~boolean~
+optional? : boolean
+icon? : ReactNode
}
class WizardFormProps {
+steps : WizardStep[]
+onComplete : () => void | Promise~void~
+onCancel? : () => void
+className? : string
+initialStep? : number
+allowSkip? : boolean
+validateOnNext? : boolean
+showStepDescriptions? : boolean
+variant? : 'horizontal' | 'vertical'
+showProgress? : boolean
+previousButtonText? : string
+nextButtonText? : string
+completeButtonText? : string
+cancelButtonText? : string
+disableNavigationWhileValidating? : boolean
+renderNavigation? : (props) => ReactNode
}
class WizardFormRef {
+next() : Promise~void~
+previous() : void
+goToStep(stepIndex : number) : void
+getCurrentStep() : number
+reset() : void
}
class WizardForm {
+currentStep : number
+isValidating : boolean
+isSubmitting : boolean
+completedSteps : Set~number~
+handleNext() : Promise~void~
+handlePrevious() : void
+handleComplete() : Promise~void~
+goToStep(stepIndex : number) : void
+reset() : void
}
WizardForm --> WizardStep : "contains"
WizardForm --> WizardFormProps : "uses"
WizardForm --> WizardFormRef : "exposes"
```

**Diagram sources**
- [WizardForm.tsx:9-81](file://src/components/ui/forms/WizardForm.tsx#L9-L81)

**Section sources**
- [WizardForm.tsx:1-441](file://src/components/ui/forms/WizardForm.tsx#L1-L441)

### MinimalForm Component
The MinimalForm component provides clean, simple form layouts ideal for login forms, search interfaces, and quick data entry scenarios.

```mermaid
classDiagram
class MinimalFormProps {
+children : ReactNode
+title? : string
+description? : string
+showActions? : boolean
+actions? : ReactNode
+centered? : boolean
+maxWidth? : 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
+card? : boolean
+background? : boolean
+onSubmit? : (event : FormEvent) => void
+className? : string
+...FormContainerProps
}
class MinimalFormRef {
+form : HTMLFormElement | null
+submit() : void
+reset() : void
}
class MinimalForm {
+formRef : RefObject
+submit() : void
+reset() : void
}
MinimalForm --> MinimalFormProps : "uses"
MinimalForm --> MinimalFormRef : "exposes"
```

**Diagram sources**
- [MinimalForm.tsx:8-36](file://src/components/ui/forms/MinimalForm.tsx#L8-L36)

**Section sources**
- [MinimalForm.tsx:1-184](file://src/components/ui/forms/MinimalForm.tsx#L1-L184)

### PrintForm Component
The PrintForm component provides print-optimized form layouts with page breaks, headers, and print-specific styling.

```mermaid
classDiagram
class PrintFormField {
+label : string
+value : ReactNode
+colSpan? : 1 | 2 | 3 | 4
}
class PrintFormProps {
+children : ReactNode
+documentTitle? : string
+subtitle? : string
+organization? : string
+logoUrl? : string
+headerFields? : PrintFormField[]
+showPrintButton? : boolean
+printButtonText? : string
+closeButtonText? : string
+onClose? : () => void
+printFooter? : ReactNode
+pageSize? : 'a4' | 'letter' | 'legal'
+includeTimestamp? : boolean
+includePageNumbers? : boolean
+onSubmit? : (event : FormEvent) => void
+className? : string
+...FormContainerProps
}
class PrintFormRef {
+form : HTMLFormElement | null
+print() : void
+submit() : void
}
class PrintForm {
+formRef : RefObject
+handlePrint() : void
}
PrintForm --> PrintFormField : "uses"
PrintForm --> PrintFormProps : "uses"
PrintForm --> PrintFormRef : "exposes"
```

**Diagram sources**
- [PrintForm.tsx:8-55](file://src/components/ui/forms/PrintForm.tsx#L8-L55)

**Section sources**
- [PrintForm.tsx:1-304](file://src/components/ui/forms/PrintForm.tsx#L1-L304)

## Form Composition System

### FormContainer Component
The FormContainer serves as the foundational wrapper for all form types, providing consistent structure, styling, and accessibility attributes.

```mermaid
classDiagram
class FormType {
<<enumeration>>
+default
+dialog
+slideout
+tabbed
+wizard
+minimal
+print
}
class FormContainerProps {
+children : ReactNode
+type? : FormType
+className? : string
+size? : 'sm' | 'md' | 'lg' | 'xl' | 'full'
+formId? : string
+onSubmit? : (event : FormEvent) => void
+name? : string
+autoComplete? : 'on' | 'off'
+disabled? : boolean
+loading? : boolean
+scrollable? : boolean
+maxHeight? : string
+ariaLabel? : string
}
class FormContainer {
+handleSubmit(event : FormEvent) : void
}
FormContainer --> FormType : "uses"
FormContainer --> FormContainerProps : "uses"
```

**Diagram sources**
- [FormContainer.tsx:7-36](file://src/components/ui/forms/FormContainer.tsx#L7-L36)

**Section sources**
- [FormContainer.tsx:1-151](file://src/components/ui/forms/FormContainer.tsx#L1-L151)

### FormHeader Component
The FormHeader component provides consistent header styling across all form types with support for titles, descriptions, progress indicators, and auto-save status.

**Section sources**
- [FormHeader.tsx:1-222](file://src/components/ui/forms/FormHeader.tsx#L1-L222)

### FormSection Component
The FormSection component provides logical grouping of form fields with responsive grid layouts, collapsible functionality, and print optimization.

**Section sources**
- [FormSection.tsx:1-211](file://src/components/ui/forms/FormSection.tsx#L1-L211)

### FormGrid Component
The FormGrid component provides flexible responsive grid layouts for form fields with customizable column counts and spacing.

**Section sources**
- [FormGrid.tsx:1-111](file://src/components/ui/forms/FormGrid.tsx#L1-L111)

### FormActions Component
The FormActions component provides standardized action button containers with responsive behavior and sticky positioning options.

**Section sources**
- [FormActions.tsx:1-119](file://src/components/ui/forms/FormActions.tsx#L1-L119)

### FormField Component
The FormField component serves as a wrapper for individual form inputs, providing consistent spacing, labels, help text, and error handling across all form types.

**Section sources**
- [FormField.tsx:1-182](file://src/components/ui/forms/FormField.tsx#L1-L182)

## Form Layout and Structure

### Layout Variants
The form framework supports multiple layout configurations through the composition system:

- **Dialog Layout**: Modal-based forms with FormHeader, FormSection, and FormActions
- **Wizard Layout**: Multi-step forms with step indicators and navigation controls
- **Minimal Layout**: Clean, simple forms with optional card styling and centering
- **Print Layout**: Print-optimized forms with page breaks and print-specific styling
- **Tabbed Layout**: Multi-tab forms with FormContainer integration
- **Slideout Layout**: Side-panel forms with slide animation and positioning

### Size Variants
All form components support seven size variants with corresponding padding and max-width constraints:

- **Extra Extra Small (xs)**: Minimal padding, compact forms
- **Extra Small (sm)**: Reduced padding, smaller max-width
- **Small (md)**: Standard padding and max-width
- **Medium (lg)**: Increased padding, larger max-width
- **Large (xl)**: Maximum padding and width
- **Extra Large (full)**: No padding with full container width

```mermaid
flowchart TD
Start([Form Creation]) --> LayoutSelection["Select Form Type"]
LayoutSelection --> |Dialog| DialogLayout["Apply DialogForm<br/>with Modal + FormContainer"]
LayoutSelection --> |Wizard| WizardLayout["Apply WizardForm<br/>with step navigation"]
LayoutSelection --> |Minimal| MinimalLayout["Apply MinimalForm<br/>with card/background options"]
LayoutSelection --> |Print| PrintLayout["Apply PrintForm<br/>with print-specific styles"]
LayoutSelection --> |Tabbed| TabbedLayout["Apply TabbedForm<br/>with tab navigation"]
LayoutSelection --> |Slideout| SlideoutLayout["Apply SlideoutForm<br/>with slide animation"]
DialogLayout --> SizeSelection["Select Size Variant"]
WizardLayout --> SizeSelection
MinimalLayout --> SizeSelection
PrintLayout --> SizeSelection
TabbedLayout --> SizeSelection
SlideoutLayout --> SizeSelection
SizeSelection --> |xs| ApplyXS["Apply extra-extra-small styling<br/>minimal padding and constraints"]
SizeSelection --> |sm| ApplySM["Apply extra-small styling<br/>reduced padding and width"]
SizeSelection --> |md| ApplyMD["Apply small styling<br/>standard padding and width"]
SizeSelection --> |lg| ApplyLG["Apply medium styling<br/>increased padding and width"]
SizeSelection --> |xl| ApplyXL["Apply large styling<br/>maximum padding and width"]
SizeSelection --> |full| ApplyFULL["Apply full-width styling<br/>no padding with full width"]
ApplyXS --> StylingComplete["Styling Complete"]
ApplySM --> StylingComplete
ApplyMD --> StylingComplete
ApplyLG --> StylingComplete
ApplyXL --> StylingComplete
ApplyFULL --> StylingComplete
```

**Section sources**
- [FormContainer.tsx:86-93](file://src/components/ui/forms/FormContainer.tsx#L86-L93)
- [DialogForm.tsx:138-145](file://src/components/ui/forms/DialogForm.tsx#L138-L145)

## Input Components Integration

### Input Component
The Input component provides enhanced text input with floating labels, validation states, loading indicators, and icon support. It integrates seamlessly with the FormField wrapper and supports all form types.

**Section sources**
- [FormField.tsx:1-182](file://src/components/ui/forms/FormField.tsx#L1-L182)

### Textarea Component
The Textarea component provides multi-line text input with label and error support, following the same styling conventions as other input components.

**Section sources**
- [FormField.tsx:1-182](file://src/components/ui/forms/FormField.tsx#L1-L182)

### Select Component
The Select component offers enhanced dropdown functionality with search, keyboard navigation, and accessibility features. It supports both single and multi-select modes and integrates with all form types.

**Section sources**
- [FormField.tsx:1-182](file://src/components/ui/forms/FormField.tsx#L1-L182)

### Checkbox Component
The Checkbox component provides standard checkbox functionality with label integration and disabled state support, working across all form layouts.

**Section sources**
- [FormField.tsx:1-182](file://src/components/ui/forms/FormField.tsx#L1-L182)

### DatePicker Component
The DatePicker component provides date selection with calendar interface, supporting both single date and date range selection with keyboard navigation and full accessibility support.

**Section sources**
- [FormField.tsx:1-182](file://src/components/ui/forms/FormField.tsx#L1-L182)

## Validation System

### useFormValidation Hook
The useFormValidation hook provides a centralized system for form validation with real-time validation, debouncing, and accessibility support. It manages validation rules, error states, and form submission across all form types.

**Section sources**
- [useFormValidation.tsx:1-529](file://src/hooks/useFormValidation.tsx#L1-L529)

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
- [useFormValidation.tsx:81-165](file://src/hooks/useFormValidation.tsx#L81-L165)

## Usage Examples

### DialogForm Implementation
The DialogForm component demonstrates the new standardized approach to modal forms, combining Modal presentation with comprehensive form structure.

```mermaid
sequenceDiagram
participant App as Application
participant Dialog as DialogForm
participant Modal as Modal
participant FormContainer as FormContainer
participant FormHeader as FormHeader
participant FormSection as FormSection
participant FormGrid as FormGrid
participant Input as Input
App->>Dialog : Render with isOpen, onClose, title
Dialog->>Modal : Wrap with Modal component
Dialog->>FormContainer : Create FormContainer with type="dialog"
Dialog->>FormHeader : Add FormHeader with title/description
Dialog->>FormSection : Create FormSection with columns
Dialog->>FormGrid : Create FormGrid with responsive layout
Dialog->>Input : Integrate Input components with validation
App->>Dialog : Handle form submission
Dialog->>FormContainer : Execute onSubmit callback
FormContainer->>App : Return validated form data
```

**Diagram sources**
- [DialogForm.tsx:147-187](file://src/components/ui/forms/DialogForm.tsx#L147-L187)

**Section sources**
- [DialogForm.tsx:55-88](file://src/components/ui/forms/DialogForm.tsx#L55-L88)

### WizardForm Implementation
The WizardForm component provides comprehensive multi-step form functionality with progress tracking and validation.

```mermaid
flowchart TD
WizardForm["WizardForm"] --> Steps["Array of WizardStep"]
Steps --> Step1["Step 1: Personal Info"]
Steps --> Step2["Step 2: Contact Info"]
Steps --> Step3["Step 3: Review & Submit"]
WizardForm --> Navigation["Navigation Controls"]
Navigation --> Previous["Previous Button"]
Navigation --> Next["Next Button"]
Navigation --> Complete["Complete Button"]
WizardForm --> Validation["Step Validation"]
Validation --> ValidateStep["validate() function"]
WizardForm --> Progress["Progress Tracking"]
Progress --> ProgressBar["Progress Bar"]
Progress --> StepIndicator["Step Indicator"]
```

**Diagram sources**
- [WizardForm.tsx:83-115](file://src/components/ui/forms/WizardForm.tsx#L83-L115)

**Section sources**
- [WizardForm.tsx:89-114](file://src/components/ui/forms/WizardForm.tsx#L89-L114)

### Migration Examples
The FORM_MIGRATION_PLAN provides concrete examples of migrating from legacy Modal forms to the new framework components.

**Section sources**
- [FORM_MIGRATION_PLAN.md:124-159](file://docs/FORM_MIGRATION_PLAN.md#L124-L159)

## Migration from Modal Forms
The form system has migrated from direct Modal usage to the standardized DialogForm framework. This migration provides better consistency, accessibility, and extensibility across the application.

### Migration Benefits
- **Consistency**: All modal forms now use the same underlying structure and styling
- **Accessibility**: Improved ARIA attributes and keyboard navigation support
- **Extensibility**: Easier to extend and customize form layouts
- **Maintainability**: Single source of truth for form modal behavior
- **Composition**: Better separation of concerns between presentation and logic

### Migration Process
1. **Replace Modal imports** with DialogForm imports
2. **Update component structure** to use FormContainer, FormHeader, FormSection, and FormActions
3. **Migrate validation logic** to useFormValidation hook
4. **Update styling** to use new form-specific CSS classes
5. **Test accessibility** with screen readers and keyboard navigation

### Form Type Decision Matrix
The migration plan provides clear guidance for choosing the appropriate new component:

| Current Pattern | New Component | When to Use |
|-----------------|---------------|-------------|
| Modal with simple CRUD | DialogForm | Add/Edit/Delete modals with 1-10 fields |
| Modal with tabs | TabbedForm | Forms with logical groupings that benefit from tab navigation |
| Multi-step process | WizardForm | Sequential forms where each step has validation |
| Side panel form | SlideoutForm | Forms that shouldn't block the entire screen |
| Embedded in page | MinimalForm | Forms that are part of a larger page layout |
| Needs printing | PrintForm | Forms that generate printable documents |
| Search/Filter form | MinimalForm | Quick forms with minimal chrome |

**Section sources**
- [DialogForm.tsx:1-194](file://src/components/ui/forms/DialogForm.tsx#L1-L194)
- [Modal.tsx:1-174](file://src/components/ui/Modal.tsx#L1-L174)
- [FORM_MIGRATION_PLAN.md:329-341](file://docs/FORM_MIGRATION_PLAN.md#L329-L341)

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
- [DialogForm.tsx:1-194](file://src/components/ui/forms/DialogForm.tsx#L1-L194)
- [FormContainer.tsx:1-151](file://src/components/ui/forms/FormContainer.tsx#L1-L151)
- [FormHeader.tsx:1-222](file://src/components/ui/forms/FormHeader.tsx#L1-L222)

### Keyboard Navigation
The form components support comprehensive keyboard navigation for improved accessibility:

- **Tab/Shift+Tab**: Navigate between form fields
- **Arrow Keys**: Navigate within select dropdowns and date pickers
- **Enter/Space**: Activate buttons and toggle checkboxes
- **Escape**: Close dropdowns, modals, and slideout forms
- **Home/End**: Navigate to first/last options in lists

**Section sources**
- [FormField.tsx:1-182](file://src/components/ui/forms/FormField.tsx#L1-L182)

## State Management and Data Flow

### Form State Management
The form components use React state and hooks to manage form state, validation, and user interactions through a standardized composition pattern:

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
- [DialogForm.tsx:1-194](file://src/components/ui/forms/DialogForm.tsx#L1-L194)
- [WizardForm.tsx:1-441](file://src/components/ui/forms/WizardForm.tsx#L1-L441)
- [MinimalForm.tsx:1-184](file://src/components/ui/forms/MinimalForm.tsx#L1-L184)
- [PrintForm.tsx:1-304](file://src/components/ui/forms/PrintForm.tsx#L1-L304)
- [useFormValidation.tsx:1-529](file://src/hooks/useFormValidation.tsx#L1-L529)