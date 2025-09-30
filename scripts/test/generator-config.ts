// ABOUTME: Configuration file for generator test suite with schemas and validation rules
// ABOUTME: Provides configurable parameters, data validation schemas, and export format definitions

export interface GeneratorTestConfig {
  administration: {
    targetStudentCount: number;
    targetStaffCount: number;
    targetParentCount: number;
    targetClassCount: number;
    targetDepartmentCount: number;
  };
  library: {
    targetBookCount: number;
    targetAuthorCount: number;
    targetPublisherCount: number;
    targetCategoryCount: number;
    loanPercentage: number;
  };
  financial: {
    targetTransactionCount: number;
    targetSupplierCount: number;
    currentAcademicYear: string;
    budgetCategories: string[];
  };
  academics: {
    targetSubjectCount: number;
    targetGradingSchemes: number;
    targetAssessmentTypes: number;
    targetTopicsPerSubject: number;
  };
  clubs: {
    targetClubCount: number;
    targetMemberCount: number;
    targetActivityCount: number;
    targetEventCount: number;
  };
  school: {
    name: string;
    locale: string;
    academicYear: string;
    timezone: string;
    currency: string;
  };
  performance: {
    memoryLeakThreshold: number; // MB
    maxTestDuration: number; // milliseconds
    enablePerformanceMonitoring: boolean;
    enableMemoryProfiling: boolean;
  };
  validation: {
    strictMode: boolean;
    validateRelationships: boolean;
    validateConstraints: boolean;
    sampleSize: number; // for constraint validation
  };
  export: {
    formats: ('json' | 'csv' | 'xml' | 'html')[];
    includeRawData: boolean;
    includePerformanceMetrics: boolean;
    includeValidationDetails: boolean;
  };
}

export const DEFAULT_TEST_CONFIG: GeneratorTestConfig = {
  administration: {
    targetStudentCount: 500,
    targetStaffCount: 100,
    targetParentCount: 800,
    targetClassCount: 20,
    targetDepartmentCount: 10
  },
  library: {
    targetBookCount: 1000,
    targetAuthorCount: 200,
    targetPublisherCount: 150,
    targetCategoryCount: 25,
    loanPercentage: 0.3
  },
  financial: {
    targetTransactionCount: 1000,
    targetSupplierCount: 100,
    currentAcademicYear: '2024-2025',
    budgetCategories: ['Academic', 'Administrative', 'Infrastructure', 'Sports', 'Events']
  },
  academics: {
    targetSubjectCount: 50,
    targetGradingSchemes: 5,
    targetAssessmentTypes: 10,
    targetTopicsPerSubject: 8
  },
  clubs: {
    targetClubCount: 25,
    targetMemberCount: 200,
    targetActivityCount: 100,
    targetEventCount: 50
  },
  school: {
    name: 'Test School',
    locale: 'en',
    academicYear: '2024-2025',
    timezone: 'UTC',
    currency: 'USD'
  },
  performance: {
    memoryLeakThreshold: 50,
    maxTestDuration: 300000, // 5 minutes
    enablePerformanceMonitoring: true,
    enableMemoryProfiling: true
  },
  validation: {
    strictMode: true,
    validateRelationships: true,
    validateConstraints: true,
    sampleSize: 10
  },
  export: {
    formats: ['json', 'csv'],
    includeRawData: false,
    includePerformanceMetrics: true,
    includeValidationDetails: true
  }
};

export const QUICK_TEST_CONFIG: GeneratorTestConfig = {
  ...DEFAULT_TEST_CONFIG,
  administration: {
    targetStudentCount: 50,
    targetStaffCount: 10,
    targetParentCount: 80,
    targetClassCount: 5,
    targetDepartmentCount: 3
  },
  library: {
    targetBookCount: 100,
    targetAuthorCount: 20,
    targetPublisherCount: 15,
    targetCategoryCount: 10,
    loanPercentage: 0.2
  },
  financial: {
    targetTransactionCount: 100,
    targetSupplierCount: 20,
    currentAcademicYear: '2024-2025',
    budgetCategories: ['Academic', 'Administrative']
  },
  academics: {
    targetSubjectCount: 10,
    targetGradingSchemes: 2,
    targetAssessmentTypes: 5,
    targetTopicsPerSubject: 3
  },
  clubs: {
    targetClubCount: 5,
    targetMemberCount: 50,
    targetActivityCount: 20,
    targetEventCount: 10
  },
  performance: {
    ...DEFAULT_TEST_CONFIG.performance,
    enableMemoryProfiling: false
  },
  validation: {
    ...DEFAULT_TEST_CONFIG.validation,
    sampleSize: 5
  }
};

export const PERFORMANCE_TEST_CONFIG: GeneratorTestConfig = {
  ...DEFAULT_TEST_CONFIG,
  administration: {
    targetStudentCount: 2000,
    targetStaffCount: 400,
    targetParentCount: 3200,
    targetClassCount: 80,
    targetDepartmentCount: 20
  },
  library: {
    targetBookCount: 5000,
    targetAuthorCount: 1000,
    targetPublisherCount: 500,
    targetCategoryCount: 50,
    loanPercentage: 0.4
  },
  financial: {
    targetTransactionCount: 5000,
    targetSupplierCount: 500,
    currentAcademicYear: '2024-2025',
    budgetCategories: ['Academic', 'Administrative', 'Infrastructure', 'Sports', 'Events', 'Technology', 'Maintenance']
  },
  academics: {
    targetSubjectCount: 100,
    targetGradingSchemes: 10,
    targetAssessmentTypes: 20,
    targetTopicsPerSubject: 15
  },
  clubs: {
    targetClubCount: 50,
    targetMemberCount: 800,
    targetActivityCount: 500,
    targetEventCount: 200
  },
  performance: {
    memoryLeakThreshold: 100,
    maxTestDuration: 600000, // 10 minutes
    enablePerformanceMonitoring: true,
    enableMemoryProfiling: true
  },
  validation: {
    strictMode: true,
    validateRelationships: true,
    validateConstraints: true,
    sampleSize: 20
  }
};

// Data validation schemas
export interface DataValidationSchema {
  tableName: string;
  requiredFields: string[];
  optionalFields: string[];
  fieldTypes: Record<string, 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'>;
  constraints: {
    field: string;
    type: 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'enum' | 'unique';
    value: any;
  }[];
  relationships: {
    field: string;
    referencesTable: string;
    referencesField: string;
    required: boolean;
  }[];
}

export const VALIDATION_SCHEMAS: Record<string, DataValidationSchema> = {
  students: {
    tableName: 'students',
    requiredFields: ['id', 'firstName', 'lastName', 'dateOfBirth', 'admissionNumber'],
    optionalFields: ['email', 'phone', 'address', 'parentId', 'classId'],
    fieldTypes: {
      id: 'string',
      firstName: 'string',
      lastName: 'string',
      email: 'string',
      phone: 'string',
      dateOfBirth: 'date',
      admissionNumber: 'string',
      address: 'object',
      parentId: 'string',
      classId: 'string'
    },
    constraints: [
      { field: 'firstName', type: 'minLength', value: 1 },
      { field: 'lastName', type: 'minLength', value: 1 },
      { field: 'admissionNumber', type: 'unique', value: true },
      { field: 'email', type: 'pattern', value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
    ],
    relationships: [
      { field: 'parentId', referencesTable: 'parents', referencesField: 'id', required: false },
      { field: 'classId', referencesTable: 'classes', referencesField: 'id', required: false }
    ]
  },
  staff: {
    tableName: 'staff',
    requiredFields: ['id', 'firstName', 'lastName', 'employeeId', 'department'],
    optionalFields: ['email', 'phone', 'position', 'hireDate', 'salary'],
    fieldTypes: {
      id: 'string',
      firstName: 'string',
      lastName: 'string',
      employeeId: 'string',
      department: 'string',
      email: 'string',
      phone: 'string',
      position: 'string',
      hireDate: 'date',
      salary: 'number'
    },
    constraints: [
      { field: 'firstName', type: 'minLength', value: 1 },
      { field: 'lastName', type: 'minLength', value: 1 },
      { field: 'employeeId', type: 'unique', value: true },
      { field: 'salary', type: 'min', value: 0 }
    ],
    relationships: [
      { field: 'department', referencesTable: 'departments', referencesField: 'id', required: true }
    ]
  },
  books: {
    tableName: 'books',
    requiredFields: ['id', 'title', 'isbn', 'authorId', 'publisherId'],
    optionalFields: ['categoryId', 'publicationYear', 'pages', 'language', 'description'],
    fieldTypes: {
      id: 'string',
      title: 'string',
      isbn: 'string',
      authorId: 'string',
      publisherId: 'string',
      categoryId: 'string',
      publicationYear: 'number',
      pages: 'number',
      language: 'string',
      description: 'string'
    },
    constraints: [
      { field: 'title', type: 'minLength', value: 1 },
      { field: 'isbn', type: 'unique', value: true },
      { field: 'publicationYear', type: 'min', value: 1000 },
      { field: 'publicationYear', type: 'max', value: new Date().getFullYear() },
      { field: 'pages', type: 'min', value: 1 }
    ],
    relationships: [
      { field: 'authorId', referencesTable: 'authors', referencesField: 'id', required: true },
      { field: 'publisherId', referencesTable: 'publishers', referencesField: 'id', required: true },
      { field: 'categoryId', referencesTable: 'categories', referencesField: 'id', required: false }
    ]
  },
  clubs: {
    tableName: 'clubs',
    requiredFields: ['id', 'name', 'categoryId', 'advisorId'],
    optionalFields: ['description', 'meetingDay', 'meetingTime', 'location', 'budget'],
    fieldTypes: {
      id: 'string',
      name: 'string',
      categoryId: 'string',
      advisorId: 'string',
      description: 'string',
      meetingDay: 'string',
      meetingTime: 'string',
      location: 'string',
      budget: 'number'
    },
    constraints: [
      { field: 'name', type: 'minLength', value: 1 },
      { field: 'budget', type: 'min', value: 0 },
      { field: 'meetingDay', type: 'enum', value: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }
    ],
    relationships: [
      { field: 'categoryId', referencesTable: 'club_categories', referencesField: 'id', required: true },
      { field: 'advisorId', referencesTable: 'staff', referencesField: 'id', required: true }
    ]
  }
};

// Export format configurations
export interface ExportFormat {
  name: string;
  extension: string;
  mimeType: string;
  transformer: (data: any) => string;
}

export const EXPORT_FORMATS: Record<string, ExportFormat> = {
  json: {
    name: 'JSON',
    extension: 'json',
    mimeType: 'application/json',
    transformer: (data: any) => JSON.stringify(data, null, 2)
  },
  csv: {
    name: 'CSV',
    extension: 'csv',
    mimeType: 'text/csv',
    transformer: (data: any) => {
      if (!Array.isArray(data)) {
        throw new Error('CSV export requires array data');
      }
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }
      
      return csvRows.join('\n');
    }
  },
  xml: {
    name: 'XML',
    extension: 'xml',
    mimeType: 'application/xml',
    transformer: (data: any) => {
      const xmlEscape = (str: string) => 
        str.replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;')
           .replace(/"/g, '&quot;')
           .replace(/'/g, '&apos;');
      
      const objectToXml = (obj: any, rootName: string = 'root'): string => {
        if (Array.isArray(obj)) {
          return obj.map(item => objectToXml(item, 'item')).join('');
        }
        
        if (typeof obj === 'object' && obj !== null) {
          const elements = Object.entries(obj)
            .map(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                return `<${key}>${objectToXml(value)}</${key}>`;
              }
              return `<${key}>${xmlEscape(String(value))}</${key}>`;
            })
            .join('');
          return `<${rootName}>${elements}</${rootName}>`;
        }
        
        return `<${rootName}>${xmlEscape(String(obj))}</${rootName}>`;
      };
      
      return `<?xml version="1.0" encoding="UTF-8"?>\n${objectToXml(data, 'testReport')}`;
    }
  },
  html: {
    name: 'HTML',
    extension: 'html',
    mimeType: 'text/html',
    transformer: (data: any) => {
      const generateTable = (items: any[], title: string) => {
        if (!Array.isArray(items) || items.length === 0) {
          return `<h3>${title}</h3><p>No data available</p>`;
        }
        
        const headers = Object.keys(items[0]);
        const headerRow = headers.map(h => `<th>${h}</th>`).join('');
        const dataRows = items.map(item => 
          headers.map(h => {
            const value = item[h];
            if (typeof value === 'object') {
              return `<td><pre>${JSON.stringify(value, null, 2)}</pre></td>`;
            }
            return `<td>${String(value)}</td>`;
          }).join('')
        ).map(row => `<tr>${row}</tr>`).join('');
        
        return `
          <h3>${title}</h3>
          <table border="1" style="border-collapse: collapse; width: 100%;">
            <thead><tr>${headerRow}</tr></thead>
            <tbody>${dataRows}</tbody>
          </table>
        `;
      };
      
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Generator Test Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { margin: 20px 0; }
            th { background-color: #f0f0f0; padding: 8px; }
            td { padding: 8px; }
            pre { margin: 0; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Generator Test Report</h1>
          <p>Generated on: ${new Date().toISOString()}</p>
          ${typeof data === 'object' && data.results ? 
            data.results.map((result: any) => generateTable([result], result.generator)).join('') :
            generateTable(Array.isArray(data) ? data : [data], 'Test Results')
          }
        </body>
        </html>
      `;
    }
  }
};

// Utility functions
export function mergeConfigs(base: GeneratorTestConfig, override: Partial<GeneratorTestConfig>): GeneratorTestConfig {
  return {
    administration: { ...base.administration, ...override.administration },
    library: { ...base.library, ...override.library },
    financial: { ...base.financial, ...override.financial },
    academics: { ...base.academics, ...override.academics },
    clubs: { ...base.clubs, ...override.clubs },
    school: { ...base.school, ...override.school },
    performance: { ...base.performance, ...override.performance },
    validation: { ...base.validation, ...override.validation },
    export: { ...base.export, ...override.export }
  };
}

export function validateConfig(config: Partial<GeneratorTestConfig>): string[] {
  const errors: string[] = [];
  
  if (config.administration) {
    if (config.administration.targetStudentCount && config.administration.targetStudentCount < 1) {
      errors.push('targetStudentCount must be at least 1');
    }
    if (config.administration.targetStaffCount && config.administration.targetStaffCount < 1) {
      errors.push('targetStaffCount must be at least 1');
    }
  }
  
  if (config.performance) {
    if (config.performance.memoryLeakThreshold && config.performance.memoryLeakThreshold < 0) {
      errors.push('memoryLeakThreshold must be non-negative');
    }
    if (config.performance.maxTestDuration && config.performance.maxTestDuration < 1000) {
      errors.push('maxTestDuration must be at least 1000ms');
    }
  }
  
  return errors;
}

export function getConfigByName(name: 'default' | 'quick' | 'performance'): GeneratorTestConfig {
  switch (name) {
    case 'quick':
      return QUICK_TEST_CONFIG;
    case 'performance':
      return PERFORMANCE_TEST_CONFIG;
    default:
      return DEFAULT_TEST_CONFIG;
  }
}