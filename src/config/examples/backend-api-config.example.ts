// ABOUTME: Example configuration for Backend API Integration Provider
// ABOUTME: Shows how to configure external system integration with ERPNext, custom APIs, etc.

import { BackendAPIConfig } from '../unifiedConfig';

// Example configuration for ERPNext integration
export const erpNextConfig: BackendAPIConfig = {
  apiBaseUrl: 'https://your-erpnext-instance.com/api/resource',
  authType: 'bearer',
  authToken: 'your-api-token-here',
  timeout: 30000,
  retryAttempts: 3,
  syncInterval: 60000, // 1 minute
  batchSize: 50,
  enableOfflineQueue: true,
  conflictResolution: 'remote', // ERPNext wins conflicts
  endpoints: {
    students: {
      basePath: '/Student',
      idField: 'name',
      timestampField: 'modified',
      methods: {
        list: '/Student',
        get: '/Student/:id',
        create: '/Student',
        update: '/Student/:id',
        delete: '/Student/:id',
        sync: '/Student?fields=["*"]&filters=[["modified",">",":timestamp"]]'
      },
      mapping: {
        id: 'name',
        firstName: 'first_name',
        lastName: 'last_name',
        email: 'student_email_id',
        phone: 'student_mobile_number',
        dateOfBirth: 'date_of_birth',
        admissionDate: 'joining_date'
      }
    },
    staff: {
      basePath: '/Employee',
      idField: 'name',
      timestampField: 'modified',
      methods: {
        list: '/Employee',
        get: '/Employee/:id',
        create: '/Employee',
        update: '/Employee/:id',
        delete: '/Employee/:id'
      },
      mapping: {
        id: 'name',
        firstName: 'first_name',
        lastName: 'last_name',
        email: 'company_email',
        phone: 'cell_number',
        employeeId: 'employee',
        department: 'department',
        designation: 'designation'
      }
    },
    classes: {
      basePath: '/Student Group',
      idField: 'name',
      timestampField: 'modified',
      mapping: {
        id: 'name',
        className: 'student_group_name',
        academicYear: 'academic_year',
        program: 'program'
      }
    }
  }
};

// Example configuration for custom REST API
export const customAPIConfig: BackendAPIConfig = {
  apiBaseUrl: 'https://api.yourschool.com/v1',
  authType: 'api-key',
  apiKey: 'your-api-key-here',
  customHeaders: {
    'X-School-ID': 'your-school-id',
    'Accept': 'application/json'
  },
  timeout: 20000,
  retryAttempts: 2,
  syncInterval: 30000, // 30 seconds
  batchSize: 100,
  enableOfflineQueue: true,
  conflictResolution: 'manual', // Require manual conflict resolution
  endpoints: {
    students: {
      basePath: '/students',
      idField: 'student_id',
      timestampField: 'updated_at',
      methods: {
        list: '/students',
        get: '/students/:id',
        create: '/students',
        update: '/students/:id',
        delete: '/students/:id',
        sync: '/students/sync?since=:timestamp'
      },
      filters: {
        active: true,
        school_id: 'your-school-id'
      }
    },
    grades: {
      basePath: '/grades',
      idField: 'grade_id',
      timestampField: 'updated_at',
      methods: {
        list: '/grades',
        get: '/grades/:id',
        create: '/grades',
        update: '/grades/:id'
      }
    }
  }
};

// Example configuration for GraphQL API
export const graphqlAPIConfig: BackendAPIConfig = {
  apiBaseUrl: 'https://api.yourschool.com/graphql',
  authType: 'bearer',
  authToken: 'your-jwt-token-here',
  timeout: 15000,
  retryAttempts: 3,
  syncInterval: 45000, // 45 seconds
  enableOfflineQueue: true,
  conflictResolution: 'local', // Local changes win
  endpoints: {
    students: {
      basePath: '', // GraphQL uses single endpoint
      methods: {
        list: '?query={students{id,firstName,lastName,email}}',
        get: '?query={student(id:":id"){id,firstName,lastName,email,phone}}',
        create: '?mutation={createStudent(input:$input){id,firstName,lastName}}',
        update: '?mutation={updateStudent(id:":id",input:$input){id,firstName,lastName}}',
        delete: '?mutation={deleteStudent(id:":id"){success}}'
      }
    }
  }
};

// Example configuration for Firebase/Firestore
export const firebaseConfig: BackendAPIConfig = {
  apiBaseUrl: 'https://firestore.googleapis.com/v1/projects/your-project/databases/(default)/documents',
  authType: 'bearer',
  authToken: 'your-firebase-token-here',
  timeout: 25000,
  retryAttempts: 3,
  syncInterval: 20000, // 20 seconds
  enableOfflineQueue: true,
  conflictResolution: 'remote', // Firebase wins conflicts
  endpoints: {
    students: {
      basePath: '/students',
      idField: 'name',
      timestampField: 'updateTime',
      methods: {
        list: '/students',
        get: '/students/:id',
        create: '/students',
        update: '/students/:id',
        delete: '/students/:id'
      }
    }
  }
};

// How to use these configurations in your unified config:
export const exampleUnifiedConfig = {
  environment: 'production' as const,
  dataMode: 'production' as const,
  database: {
    provider: 'backend-api' as const,
    // RXDB removed - Phase 1 deprecation
    allowedProviders: ['backend-api', 'pouchdb', 'sqlite-wasm', 'livestore'] as const,
    autoDetect: false,
    apiConfig: erpNextConfig, // Use one of the above configurations
    options: {}
  }
  // ... other config options
};

// Environment-specific configurations
export const developmentBackendConfig: BackendAPIConfig = {
  ...customAPIConfig,
  apiBaseUrl: 'http://localhost:8000/api/v1', // Local development server
  syncInterval: 10000, // More frequent sync for development
  conflictResolution: 'local' // Prefer local changes in development
};

export const stagingBackendConfig: BackendAPIConfig = {
  ...customAPIConfig,
  apiBaseUrl: 'https://staging-api.yourschool.com/v1',
  syncInterval: 30000,
  conflictResolution: 'manual' // Manual resolution for testing
};

export const productionBackendConfig: BackendAPIConfig = {
  ...customAPIConfig,
  apiBaseUrl: 'https://api.yourschool.com/v1',
  syncInterval: 60000, // Less frequent sync in production
  conflictResolution: 'remote', // Production system wins
  retryAttempts: 5 // More retries in production
};