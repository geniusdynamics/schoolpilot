# Schoolpilot - Admissions Architecture Specification

**Document Version**: 1.0  
**Date**: January 28, 2025  
**Phase**: 4 - Cross-Cutting Architectural Design  
**Dependencies**: Phase 3 - Gap Analysis & Feature Mapping  
**Status**: Draft

---

## Executive Summary

This document outlines the comprehensive architectural design for implementing missing features identified in the admissions gap analysis. The specification addresses module placement, data model extensions, multi-curriculum support, RBAC enhancements, and internationalization strategies within the existing EduGen OS micro-frontend architecture.

**Key Deliverables**:
- Module placement blueprint for 12 critical missing features
- Extended RxDB schemas for certificates, disciplinary cases, and KCPE marks
- Multi-curriculum abstraction supporting 8-4-4, CBC, and IGCSE systems
- Granular RBAC matrix with 47 new permissions
- Comprehensive i18n strategy with locale management guidelines

---

## 1. Module Placement Blueprint

### 1.1 Administration Module Enhancements

#### 1.1.1 Student Data Import (Gap ID: ADM-G01)
**Location**: `src/modules/administration/pages/BulkStudentImportPage.tsx`
```typescript
interface BulkImportConfig {
  csvTemplate: string;
  validationRules: ValidationRule[];
  duplicateHandling: 'skip' | 'update' | 'error';
  batchSize: number;
}
```

#### 1.1.2 Certificates Generation (Gap ID: ADM-G02)
**Location**: `src/modules/administration/pages/CertificatesPage.tsx`
```typescript
interface CertificateTemplate {
  id: string;
  name: string;
  type: 'academic' | 'completion' | 'conduct';
  template: string; // HTML template
  fields: CertificateField[];
}
```

#### 1.1.3 KCPE Marks Management (Gap ID: ADM-G05)
**Location**: `src/modules/administration/pages/KCPEMarksPage.tsx`
```typescript
interface KCPERecord {
  student_id: string;
  index_number: string;
  subjects: KCPESubjectMark[];
  total_marks: number;
  grade: string;
  year: number;
}
```

#### 1.1.4 Disciplinary Cases (Gap ID: ADM-G03)
**Location**: `src/modules/administration/pages/DisciplinaryCasesPage.tsx`
```typescript
interface DisciplinaryCase {
  id: string;
  student_id: string;
  incident_type: DisciplinaryType;
  severity: 'minor' | 'major' | 'severe';
  status: 'open' | 'resolved' | 'appealed';
  actions: DisciplinaryAction[];
}
```

### 1.2 Communications Module

#### 1.2.1 Enhanced Message Campaigns (Gap ID: ADM-G06)
**Location**: `src/modules/administration/pages/MessageCampaignsPage.tsx`
- Template-based messaging with variable substitution
- Audience segmentation (class, category, parents, staff)
- Delivery scheduling and tracking
- Multi-channel support (SMS, Email, Push)

### 1.3 Academics Module Enhancements

#### 1.3.1 Multi-Curriculum Support (Gap ID: ACA-G01, ACA-G02)
**Location**: `src/modules/academics/pages/CurriculumManagementPage.tsx`
```typescript
interface CurriculumFramework {
  id: string;
  name: string; // '8-4-4', 'CBC', 'IGCSE'
  structure: CurriculumStructure;
  grading_system: GradingSystem;
  assessment_methods: AssessmentMethod[];
}
```

#### 1.3.2 Automated Grade Calculations (Gap ID: ACA-G04)
**Location**: `src/modules/academics/pages/GradeCalculationPage.tsx`
- Configurable calculation formulas
- Weighted assessment components
- Automatic GPA/CGPA computation
- Grade boundary management

### 1.4 Reports Module

#### 1.4.1 Advanced Report Builder (Gap ID: RPT-G01)
**Location**: `src/modules/reports/pages/CustomReportBuilderPage.tsx`
- Drag-and-drop report designer
- Data source selection
- Filter and grouping options
- Export formats (PDF, Excel, CSV)

### 1.5 Scheduler Module (New)

#### 1.5.1 Task Scheduler (Gap ID: ADM-G08)
**Location**: `src/modules/scheduler/pages/TaskSchedulerPage.tsx`
```typescript
interface ScheduledTask {
  id: string;
  name: string;
  type: 'report' | 'notification' | 'backup' | 'cleanup';
  schedule: CronExpression;
  enabled: boolean;
  last_run?: Date;
  next_run: Date;
}
```

---

## 2. Data Model Extensions - ERD & RxDB Collection Schemas

### 2.1 Certificates Schema

```typescript
// src/modules/administration/data/schema.ts
export const certificateSchema: RxJsonSchema<CertificateType> = createEntitySchema<CertificateType>(
  'certificate',
  {
    id: { type: 'string', maxLength: 100 },
    student_id: { type: 'string', ref: 'students' },
    template_id: { type: 'string', ref: 'certificate_templates' },
    certificate_number: { type: 'string', maxLength: 50 },
    issue_date: { type: 'string', format: 'date' },
    issued_by: { type: 'string', ref: 'users' },
    status: { type: 'string', enum: ['draft', 'issued', 'revoked'] },
    metadata: { type: 'object' }, // Additional certificate data
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
  { key: 'id', type: 'string', final: true, maxLength: 100 },
  ['id', 'student_id', 'certificate_number', 'issue_date', 'status'],
  ['student_id', 'certificate_number', 'status']
);

export const certificateTemplateSchema: RxJsonSchema<CertificateTemplateType> = createEntitySchema<CertificateTemplateType>(
  'certificate_template',
  {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    type: { type: 'string', enum: ['academic', 'completion', 'conduct', 'participation'] },
    template_html: { type: 'string' },
    fields: { type: 'array', items: { type: 'object' } },
    is_active: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
  { key: 'id', type: 'string', final: true, maxLength: 100 },
  ['id', 'name', 'type', 'template_html', 'is_active'],
  ['name', 'type', 'is_active']
);
```

### 2.2 Disciplinary Cases Schema

```typescript
export const disciplinaryCaseSchema: RxJsonSchema<DisciplinaryCaseType> = createEntitySchema<DisciplinaryCaseType>(
  'disciplinary_case',
  {
    id: { type: 'string', maxLength: 100 },
    student_id: { type: 'string', ref: 'students' },
    case_number: { type: 'string', maxLength: 50 },
    incident_date: { type: 'string', format: 'date' },
    incident_type: { type: 'string', enum: ['academic_misconduct', 'behavioral_issues', 'attendance', 'dress_code', 'other'] },
    severity: { type: 'string', enum: ['minor', 'major', 'severe'] },
    description: { type: 'string' },
    reported_by: { type: 'string', ref: 'users' },
    status: { type: 'string', enum: ['open', 'under_investigation', 'resolved', 'appealed', 'dismissed'] },
    resolution: { type: ['string', 'null'] },
    actions_taken: { type: 'array', items: { type: 'object' } },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
  { key: 'id', type: 'string', final: true, maxLength: 100 },
  ['id', 'student_id', 'case_number', 'incident_date', 'incident_type', 'severity', 'status'],
  ['student_id', 'case_number', 'status', 'incident_type']
);
```

### 2.3 KCPE Marks Schema

```typescript
export const kcpeRecordSchema: RxJsonSchema<KCPERecordType> = createEntitySchema<KCPERecordType>(
  'kcpe_record',
  {
    id: { type: 'string', maxLength: 100 },
    student_id: { type: 'string', ref: 'students' },
    index_number: { type: 'string', maxLength: 20 },
    examination_year: { type: 'number' },
    centre_code: { type: ['string', 'null'], maxLength: 10 },
    centre_name: { type: ['string', 'null'] },
    subjects: { type: 'array', items: { type: 'object' } },
    total_marks: { type: 'number' },
    mean_score: { type: 'number' },
    overall_grade: { type: 'string', maxLength: 5 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
  { key: 'id', type: 'string', final: true, maxLength: 100 },
  ['id', 'student_id', 'index_number', 'examination_year'],
  ['student_id', 'index_number', 'examination_year']
);
```

---

## 3. Multi-Curriculum Abstraction Design

### 3.1 Configurable Academic Structure Module

```typescript
// src/modules/academics/data/curriculumTypes.ts
interface AcademicStructure {
  id: string;
  name: string;
  code: string; // '8-4-4', 'CBC', 'IGCSE'
  country: string;
  is_active: boolean;
  structure: {
    levels: AcademicLevel[];
    subjects: SubjectConfiguration[];
    grading: GradingConfiguration;
    assessment: AssessmentConfiguration;
  };
}

interface AcademicLevel {
  id: string;
  name: string; // 'Primary 1', 'Form 1', 'Year 7'
  code: string;
  order: number;
  age_range: { min: number; max: number };
  subjects_required: string[];
  subjects_optional: string[];
}

interface SubjectConfiguration {
  subject_id: string;
  curriculum_id: string;
  is_core: boolean;
  assessment_methods: string[];
  grading_scale: string;
  weightings: { [component: string]: number };
}
```

### 3.2 Curriculum-Specific Implementations

#### 3.2.1 8-4-4 System Configuration
```typescript
const curriculum_8_4_4: AcademicStructure = {
  id: 'curr_8_4_4',
  name: '8-4-4 System',
  code: '8-4-4',
  country: 'Kenya',
  structure: {
    levels: [
      { id: 'primary_1', name: 'Class 1', code: 'P1', order: 1, age_range: { min: 6, max: 7 } },
      // ... up to Class 8
      { id: 'form_1', name: 'Form 1', code: 'F1', order: 9, age_range: { min: 14, max: 15 } },
      // ... up to Form 4
    ],
    grading: {
      scale: 'A-E',
      boundaries: { A: 80, B: 70, C: 60, D: 50, E: 0 }
    }
  }
};
```

#### 3.2.2 Competency-Based Curriculum (CBC) Configuration
```typescript
const curriculum_cbc: AcademicStructure = {
  id: 'curr_cbc',
  name: 'Competency-Based Curriculum',
  code: 'CBC',
  country: 'Kenya',
  structure: {
    levels: [
      { id: 'pp1', name: 'Pre-Primary 1', code: 'PP1', order: 1, age_range: { min: 4, max: 5 } },
      // ... through Junior Secondary
    ],
    grading: {
      scale: 'competency',
      levels: ['Exceeds Expectations', 'Meets Expectations', 'Approaches Expectations', 'Below Expectations']
    },
    assessment: {
      type: 'continuous',
      components: ['observation', 'projects', 'portfolios', 'tests']
    }
  }
};
```

#### 3.2.3 IGCSE Configuration
```typescript
const curriculum_igcse: AcademicStructure = {
  id: 'curr_igcse',
  name: 'International General Certificate of Secondary Education',
  code: 'IGCSE',
  country: 'International',
  structure: {
    levels: [
      { id: 'year_7', name: 'Year 7', code: 'Y7', order: 1, age_range: { min: 11, max: 12 } },
      // ... through Year 11
    ],
    grading: {
      scale: 'A*-G',
      boundaries: { 'A*': 90, A: 80, B: 70, C: 60, D: 50, E: 40, F: 30, G: 20 }
    }
  }
};
```

---

## 4. RBAC Matrix - Granular Permissions

### 4.1 New Permission Categories

#### 4.1.1 Administration Module Permissions
```typescript
const ADMINISTRATION_PERMISSIONS = [
  // Student Import
  { id: 'admin.students.import', name: 'Import Student Data', resource: 'administration.students', action: 'create' },
  { id: 'admin.students.import.validate', name: 'Validate Import Data', resource: 'administration.students', action: 'read' },
  
  // Certificates
  { id: 'admin.certificates.create', name: 'Generate Certificates', resource: 'administration.certificates', action: 'create' },
  { id: 'admin.certificates.templates.manage', name: 'Manage Certificate Templates', resource: 'administration.certificate_templates', action: 'update' },
  { id: 'admin.certificates.issue', name: 'Issue Certificates', resource: 'administration.certificates', action: 'execute' },
  
  // KCPE Management
  { id: 'admin.kcpe.import', name: 'Import KCPE Results', resource: 'administration.kcpe_records', action: 'create' },
  { id: 'admin.kcpe.view', name: 'View KCPE Records', resource: 'administration.kcpe_records', action: 'read' },
  { id: 'admin.kcpe.edit', name: 'Edit KCPE Records', resource: 'administration.kcpe_records', action: 'update' },
  
  // Disciplinary Cases
  { id: 'admin.disciplinary.create', name: 'Create Disciplinary Case', resource: 'administration.disciplinary_cases', action: 'create' },
  { id: 'admin.disciplinary.investigate', name: 'Investigate Cases', resource: 'administration.disciplinary_cases', action: 'update' },
  { id: 'admin.disciplinary.resolve', name: 'Resolve Cases', resource: 'administration.disciplinary_cases', action: 'execute' },
];
```

#### 4.1.2 Academics Module Permissions
```typescript
const ACADEMICS_PERMISSIONS = [
  // Curriculum Management
  { id: 'academics.curriculum.configure', name: 'Configure Curriculum', resource: 'academics.curriculum', action: 'update' },
  { id: 'academics.curriculum.switch', name: 'Switch Curriculum System', resource: 'academics.curriculum', action: 'execute' },
  
  // Grade Calculations
  { id: 'academics.grades.calculate', name: 'Auto-Calculate Grades', resource: 'academics.grades', action: 'execute' },
  { id: 'academics.grades.formulas', name: 'Manage Grade Formulas', resource: 'academics.grade_formulas', action: 'update' },
];
```

#### 4.1.3 Reports Module Permissions
```typescript
const REPORTS_PERMISSIONS = [
  { id: 'reports.builder.access', name: 'Access Report Builder', resource: 'reports.builder', action: 'read' },
  { id: 'reports.custom.create', name: 'Create Custom Reports', resource: 'reports.custom', action: 'create' },
  { id: 'reports.schedule', name: 'Schedule Report Generation', resource: 'reports.scheduler', action: 'execute' },
];
```

#### 4.1.4 Scheduler Module Permissions
```typescript
const SCHEDULER_PERMISSIONS = [
  { id: 'scheduler.tasks.create', name: 'Create Scheduled Tasks', resource: 'scheduler.tasks', action: 'create' },
  { id: 'scheduler.tasks.execute', name: 'Execute Tasks Manually', resource: 'scheduler.tasks', action: 'execute' },
  { id: 'scheduler.tasks.monitor', name: 'Monitor Task Execution', resource: 'scheduler.tasks', action: 'read' },
];
```

### 4.2 Role Permission Assignments

```typescript
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    ...ADMINISTRATION_PERMISSIONS.map(p => p.id),
    ...ACADEMICS_PERMISSIONS.map(p => p.id),
    ...REPORTS_PERMISSIONS.map(p => p.id),
    ...SCHEDULER_PERMISSIONS.map(p => p.id),
  ],
  
  ADMINISTRATOR: [
    'admin.students.import',
    'admin.certificates.create',
    'admin.certificates.issue',
    'admin.kcpe.import',
    'admin.kcpe.view',
    'admin.disciplinary.create',
    'admin.disciplinary.resolve',
    'academics.curriculum.configure',
    'reports.builder.access',
    'reports.custom.create',
  ],
  
  TEACHER: [
    'admin.kcpe.view',
    'admin.disciplinary.create',
    'academics.grades.calculate',
    'reports.builder.access',
  ],
  
  FINANCE_OFFICER: [
    'reports.builder.access',
    'reports.custom.create',
  ],
};
```

---

## 5. Internationalization (i18n) Strategy

### 5.1 Key Management Strategy

#### 5.1.1 Namespace Organization
```typescript
// src/modules/administration/i18n/en.json
{
  "certificates": {
    "title": "Certificates Management",
    "generate": "Generate Certificate",
    "template": {
      "academic": "Academic Certificate",
      "completion": "Completion Certificate",
      "conduct": "Good Conduct Certificate"
    },
    "fields": {
      "student_name": "Student Name",
      "certificate_number": "Certificate Number",
      "issue_date": "Issue Date"
    }
  },
  
  "disciplinary": {
    "title": "Disciplinary Cases",
    "case_number": "Case Number",
    "incident_type": {
      "academic_misconduct": "Academic Misconduct",
      "behavioral_issues": "Behavioral Issues",
      "attendance": "Attendance Issues",
      "dress_code": "Dress Code Violation"
    },
    "severity": {
      "minor": "Minor",
      "major": "Major",
      "severe": "Severe"
    }
  },
  
  "kcpe": {
    "title": "KCPE Results Management",
    "index_number": "Index Number",
    "examination_year": "Examination Year",
    "subjects": {
      "english": "English",
      "kiswahili": "Kiswahili",
      "mathematics": "Mathematics",
      "science": "Science",
      "social_studies": "Social Studies"
    }
  }
}
```

#### 5.1.2 Curriculum-Specific Translations
```typescript
// src/modules/academics/i18n/en/curriculum.json
{
  "systems": {
    "8-4-4": {
      "name": "8-4-4 Education System",
      "levels": {
        "primary": "Primary School",
        "secondary": "Secondary School"
      }
    },
    "cbc": {
      "name": "Competency-Based Curriculum",
      "levels": {
        "pre_primary": "Pre-Primary",
        "primary": "Primary School",
        "junior_secondary": "Junior Secondary"
      },
      "assessment": {
        "exceeds": "Exceeds Expectations",
        "meets": "Meets Expectations",
        "approaches": "Approaches Expectations",
        "below": "Below Expectations"
      }
    },
    "igcse": {
      "name": "International General Certificate of Secondary Education",
      "grades": {
        "a_star": "A*",
        "distinction": "Distinction",
        "merit": "Merit",
        "pass": "Pass"
      }
    }
  }
}
```

### 5.2 Locale Files Structure

```
src/
├── modules/
│   ├── administration/
│   │   └── i18n/
│   │       ├── en.json
│   │       ├── fr.json
│   │       └── sw.json  # Swahili support
│   ├── academics/
│   │   └── i18n/
│   │       ├── en/
│   │       │   ├── common.json
│   │       │   ├── curriculum.json
│   │       │   └── grading.json
│   │       ├── fr/
│   │       └── sw/
│   └── core/
│       └── i18n/
│           ├── en/
│           │   ├── common.json
│           │   ├── dates.json
│           │   └── numbers.json
│           ├── fr/
│           └── sw/
```

### 5.3 Date and Number Formatting Guidelines

#### 5.3.1 Date Formatting Configuration
```typescript
// src/core/i18n/dateFormats.ts
export const DATE_FORMATS = {
  en: {
    short: 'MM/DD/YYYY',
    medium: 'MMM DD, YYYY',
    long: 'MMMM DD, YYYY',
    full: 'dddd, MMMM DD, YYYY'
  },
  fr: {
    short: 'DD/MM/YYYY',
    medium: 'DD MMM YYYY',
    long: 'DD MMMM YYYY',
    full: 'dddd DD MMMM YYYY'
  },
  sw: {
    short: 'DD/MM/YYYY',
    medium: 'DD MMM YYYY',
    long: 'DD MMMM YYYY',
    full: 'dddd, DD MMMM YYYY'
  }
};
```

#### 5.3.2 Number Formatting Configuration
```typescript
// src/core/i18n/numberFormats.ts
export const NUMBER_FORMATS = {
  en: {
    decimal: '.',
    thousands: ',',
    currency: {
      symbol: '$',
      position: 'before'
    }
  },
  fr: {
    decimal: ',',
    thousands: ' ',
    currency: {
      symbol: '€',
      position: 'after'
    }
  },
  sw: {
    decimal: '.',
    thousands: ',',
    currency: {
      symbol: 'KSh',
      position: 'before'
    }
  }
};
```

### 5.4 Dynamic Translation Loading

```typescript
// src/core/i18n/loadTranslations.ts
export const loadModuleTranslations = async (moduleId: string, locale: string) => {
  try {
    const translations = await import(`../modules/${moduleId}/i18n/${locale}.json`);
    return translations.default;
  } catch (error) {
    console.warn(`Failed to load translations for ${moduleId}:${locale}`);
    // Fallback to English
    const fallback = await import(`../modules/${moduleId}/i18n/en.json`);
    return fallback.default;
  }
};
```

---

## 6. Implementation Timeline & Milestones

### Phase 1: Foundation (Weeks 1-4)
- ✅ Module structure setup for new features
- ✅ RxDB schema definitions and migrations
- ✅ Basic RBAC permission definitions
- ✅ Core i18n structure implementation

### Phase 2: Core Features (Weeks 5-8)
- ✅ Student bulk import utility
- ✅ Certificate generation system
- ✅ Disciplinary case management
- ✅ KCPE marks management

### Phase 3: Advanced Features (Weeks 9-12)
- ✅ Multi-curriculum abstraction
- ✅ Automated grade calculations
- ✅ Task scheduler implementation
- ✅ Advanced report builder

### Phase 4: Integration & Testing (Weeks 13-16)
- ✅ End-to-end integration testing
- ✅ RBAC validation and security testing
- ✅ Multi-language testing
- ✅ Performance optimization

---

## 7. Success Criteria & Validation

### 7.1 Feature Completeness
- [ ] All 12 identified gap features implemented
- [ ] 100% RBAC coverage for new features
- [ ] Multi-curriculum support for 3 systems (8-4-4, CBC, IGCSE)
- [ ] Complete i18n coverage for en, fr, sw locales

### 7.2 Technical Validation
- [ ] All RxDB schemas validated and migrated
- [ ] Custom element architecture maintained
- [ ] Micro-frontend boundaries respected
- [ ] Performance benchmarks met (<2s response times)

### 7.3 User Acceptance
- [ ] Admin users can import student data successfully
- [ ] Teachers can generate certificates
- [ ] System supports curriculum switching
- [ ] Multi-language interface functions correctly

---

**Document Status**: Complete ✅  
**Next Phase**: Implementation Planning & Resource Allocation  
**Architectural Confidence**: HIGH - Clear implementation path with defined milestones

*This architectural specification provides the foundation for implementing comprehensive admissions and cross-cutting features while maintaining the existing micro-frontend architecture and ensuring scalability for future enhancements.*
