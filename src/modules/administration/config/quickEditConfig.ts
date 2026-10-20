import { logger } from '@/utils/logging';

// ABOUTME: Configuration for quick edit fields in student management
// ABOUTME: Allows customization of which fields appear in the quick edit slideout

import { Student, StudentStatus } from '@/types';

export interface QuickEditField {
  key: keyof Student | string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  required?: boolean;
  options?: { value: any; label: string }[];
  section?: 'basic' | 'academic' | 'guardian';
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    min?: number;
    max?: number;
  };
}

export interface QuickEditConfig {
  fields: QuickEditField[];
  sections: {
    basic: { title: string; icon: string };
    academic: { title: string; icon: string };
    guardian: { title: string; icon: string };
  };
  styling: {
    theme: 'dark' | 'light';
    accentColor: string;
    borderRadius: string;
  };
}

// Default configuration - can be overridden by user preferences
export const DEFAULT_QUICK_EDIT_CONFIG: QuickEditConfig = {
  fields: [
    { 
      key: 'first_name', 
      label: 'First Name', 
      type: 'text', 
      required: true, 
      section: 'basic',
      placeholder: 'Enter first name',
      validation: { minLength: 2, maxLength: 50 }
    },
    { 
      key: 'last_name', 
      label: 'Last Name', 
      type: 'text', 
      required: true, 
      section: 'basic',
      placeholder: 'Enter last name',
      validation: { minLength: 2, maxLength: 50 }
    },
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select', 
      required: true, 
      section: 'basic',
      options: Object.values(StudentStatus).map(status => ({ value: status, label: status }))
    },
    { 
      key: 'current_class_stream_id', 
      label: 'Class Stream', 
      type: 'select', 
      section: 'academic',
      placeholder: 'Select class stream'
    },
    { 
      key: 'primary_guardian_name', 
      label: 'Guardian Name', 
      type: 'text', 
      section: 'guardian',
      placeholder: 'Enter guardian name',
      validation: { minLength: 2, maxLength: 100 }
    },
    { 
      key: 'primary_guardian_phone', 
      label: 'Guardian Phone', 
      type: 'text', 
      section: 'guardian',
      placeholder: 'Enter phone number',
      validation: { pattern: /^[\+]?[0-9\-\s\(\)]+$/ }
    },
  ],
  sections: {
    basic: { title: 'Basic Information', icon: 'UserCircleIcon' },
    academic: { title: 'Academic Details', icon: 'AcademicCapIcon' },
    guardian: { title: 'Guardian Information', icon: 'UsersIcon' },
  },
  styling: {
    theme: 'dark',
    accentColor: '#6366f1',
    borderRadius: '0.5rem',
  }
};

// Function to get user's custom configuration (could be from localStorage, API, etc.)
export const getQuickEditConfig = (): QuickEditConfig => {
  // For now, return default config
  // In the future, this could merge with user preferences
  const userConfig = localStorage.getItem('quickEditConfig');
  
  if (userConfig) {
    try {
      const parsed = JSON.parse(userConfig);
      return { ...DEFAULT_QUICK_EDIT_CONFIG, ...parsed };
    } catch (error) {
      logger.warn('Failed to parse quick edit config from localStorage:', error);
    }
  }
  
  return DEFAULT_QUICK_EDIT_CONFIG;
};

// Function to save user's custom configuration
export const saveQuickEditConfig = (config: Partial<QuickEditConfig>): void => {
  try {
    const currentConfig = getQuickEditConfig();
    const newConfig = { ...currentConfig, ...config };
    localStorage.setItem('quickEditConfig', JSON.stringify(newConfig));
  } catch (error) {
    logger.error('Failed to save quick edit config to localStorage:', error);
  }
};

// Function to reset to default configuration
export const resetQuickEditConfig = (): void => {
  localStorage.removeItem('quickEditConfig');
};