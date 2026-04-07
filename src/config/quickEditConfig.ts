/**
 * Quick Edit Configuration
 * Configuration for quick edit functionality
 */

export interface QuickEditField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  label: string;
  options?: string[];
  required?: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface QuickEditConfig {
  id: string;
  name: string;
  description?: string;
  fields: QuickEditField[];
  defaultValues?: Record<string, any>;
  permissions?: {
    canEdit?: string[];
    canView?: string[];
  };
  scope?: 'global' | 'module' | 'entity';
  entity?: string;
  module?: string;
}

export interface QuickEditContext {
  config: QuickEditConfig;
  currentValues: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  onValidate: (fieldId: string, value: any) => boolean | string;
  onSubmit: (values: Record<string, any>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const defaultQuickEditConfig: QuickEditConfig = {
  id: 'default',
  name: 'Default Quick Edit',
  description: 'Quick edit configuration for common fields',
  fields: [
    {
      id: 'field-1',
      name: 'firstName',
      type: 'text',
      label: 'First Name',
      required: true,
      validation: {
        minLength: 2,
        maxLength: 50,
      },
    },
    {
      id: 'field-2',
      name: 'lastName',
      type: 'text',
      label: 'Last Name',
      required: true,
      validation: {
        minLength: 2,
        maxLength: 50,
      },
    },
    {
      id: 'field-3',
      name: 'email',
      type: 'text',
      label: 'Email',
      required: true,
      validation: {
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      },
    },
    {
      id: 'field-4',
      name: 'phone',
      type: 'text',
      label: 'Phone Number',
      required: false,
      validation: {
        pattern: '^[0-9\\-\\+\\s]+$',
      },
    },
  ],
  defaultValues: {},
  permissions: {
    canEdit: ['admin', 'teacher'],
    canView: ['admin', 'teacher', 'student'],
  },
  scope: 'global',
  entity: 'person',
  module: 'administration',
};

export const studentQuickEditConfig: QuickEditConfig = {
  id: 'student-quick-edit',
  name: 'Student Quick Edit',
  description: 'Quick edit configuration for student fields',
  fields: [
    {
      id: 'student-name',
      name: 'fullName',
      type: 'text',
      label: 'Full Name',
      required: true,
      validation: {
        minLength: 2,
        maxLength: 100,
      },
    },
    {
      id: 'student-class',
      name: 'classId',
      type: 'select',
      label: 'Class',
      options: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
      required: true,
    },
    {
      id: 'student-status',
      name: 'status',
      type: 'select',
      label: 'Status',
      options: ['Active', 'Inactive', 'Suspended', 'Graduated'],
      required: true,
    },
    {
      id: 'student-phone',
      name: 'phone',
      type: 'text',
      label: 'Phone Number',
      required: false,
    },
    {
      id: 'student-email',
      name: 'email',
      type: 'text',
      label: 'Email Address',
      required: false,
      validation: {
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      },
    },
  ],
  defaultValues: {
    status: 'Active',
  },
  permissions: {
    canEdit: ['admin', 'teacher'],
    canView: ['admin', 'teacher', 'student', 'parent'],
  },
  scope: 'module',
  entity: 'student',
  module: 'administration',
};

export const gradeQuickEditConfig: QuickEditConfig = {
  id: 'grade-quick-edit',
  name: 'Grade Quick Edit',
  description: 'Quick edit configuration for grade fields',
  fields: [
    {
      id: 'grade-name',
      name: 'name',
      type: 'text',
      label: 'Grade Name',
      required: true,
      validation: {
        minLength: 1,
        maxLength: 50,
      },
    },
    {
      id: 'grade-level',
      name: 'level',
      type: 'number',
      label: 'Grade Level',
      required: true,
      validation: {
        min: 1,
        max: 12,
      },
    },
    {
      id: 'grade-capacity',
      name: 'capacity',
      type: 'number',
      label: 'Capacity',
      required: true,
      validation: {
        min: 1,
        max: 1000,
      },
    },
  ],
  defaultValues: {
    level: 1,
    capacity: 50,
  },
  permissions: {
    canEdit: ['admin'],
    canView: ['admin', 'teacher', 'student'],
  },
  scope: 'module',
  entity: 'grade',
  module: 'administration',
};

export const classStreamQuickEditConfig: QuickEditConfig = {
  id: 'class-stream-quick-edit',
  name: 'Class Stream Quick Edit',
  description: 'Quick edit configuration for class stream fields',
  fields: [
    {
      id: 'class-name',
      name: 'name',
      type: 'text',
      label: 'Class Name',
      required: true,
      validation: {
        minLength: 2,
        maxLength: 50,
      },
    },
    {
      id: 'class-grade',
      name: 'gradeLevel',
      type: 'select',
      label: 'Grade Level',
      options: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
      required: true,
    },
    {
      id: 'class-stream',
      name: 'stream',
      type: 'select',
      label: 'Stream',
      options: ['A', 'B', 'C', 'Science', 'Arts', 'Commerce'],
      required: true,
    },
  ],
  defaultValues: {
    gradeLevel: 'Grade 10',
    stream: 'A',
  },
  permissions: {
    canEdit: ['admin'],
    canView: ['admin', 'teacher', 'student'],
  },
  scope: 'module',
  entity: 'classStream',
  module: 'administration',
};

export const subjectQuickEditConfig: QuickEditConfig = {
  id: 'subject-quick-edit',
  name: 'Subject Quick Edit',
  description: 'Quick edit configuration for subject fields',
  fields: [
    {
      id: 'subject-code',
      name: 'code',
      type: 'text',
      label: 'Subject Code',
      required: true,
      validation: {
        minLength: 2,
        maxLength: 10,
      },
    },
    {
      id: 'subject-name',
      name: 'name',
      type: 'text',
      label: 'Subject Name',
      required: true,
      validation: {
        minLength: 2,
        maxLength: 100,
      },
    },
    {
      id: 'subject-category',
      name: 'category',
      type: 'select',
      label: 'Category',
      options: ['Compulsory', 'Elective', 'Language', 'Science', 'Arts', 'Commerce'],
      required: true,
    },
    {
      id: 'subject-hours',
      name: 'hoursPerWeek',
      type: 'number',
      label: 'Hours Per Week',
      required: true,
      validation: {
        min: 1,
        max: 15,
      },
    },
  ],
  defaultValues: {
    hoursPerWeek: 5,
  },
  permissions: {
    canEdit: ['admin', 'teacher'],
    canView: ['admin', 'teacher', 'student'],
  },
  scope: 'module',
  entity: 'subject',
  module: 'academics',
};

export type QuickEditConfigType = typeof defaultQuickEditConfig;

/**
 * Returns the quick edit configuration for a given entity type,
 * or the default configuration if no specific one exists.
 */
export function getQuickEditConfig(entityType?: string): QuickEditConfig {
  switch (entityType) {
    case 'student':
      return studentQuickEditConfig;
    case 'grade':
      return gradeQuickEditConfig;
    case 'classStream':
      return classStreamQuickEditConfig;
    case 'subject':
      return subjectQuickEditConfig;
    default:
      return defaultQuickEditConfig;
  }
}

export default {
  defaultQuickEditConfig,
  studentQuickEditConfig,
  gradeQuickEditConfig,
  classStreamQuickEditConfig,
  subjectQuickEditConfig,
  QuickEditField,
  QuickEditConfig,
  QuickEditContext,
};

// Aliases for backward compatibility
export const DEFAULT_QUICK_EDIT_CONFIG = defaultQuickEditConfig;
export const saveQuickEditConfig = (config: QuickEditConfig) => { /* TODO: implement */ };
export const resetQuickEditConfig = () => { /* TODO: implement */ };