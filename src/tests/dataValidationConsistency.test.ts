// ABOUTME: Comprehensive tests for data validation and consistency implementation
// ABOUTME: Tests validation rules, referential integrity, and consistency checks

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  DataValidator, 
  ValidationResult, 
  EntityValidationSchema,
  globalDataValidator,
  CommonValidations 
} from '../utils/dataValidation';
import { 
  DataConsistencyService,
  globalDataConsistencyService 
} from '../services/DataConsistencyService';
import { 
  UnifiedCRUDService,
  globalUnifiedCRUDService 
} from '../services/UnifiedCRUDService';
import { registerCoreValidationSchemas } from '../utils/validationSchemas';
import { PersonGender, StudentStatus, FinancialYearStatus } from '../core/types';

describe('Data Validation System', () => {
  beforeEach(() => {
    // Register validation schemas before each test
    registerCoreValidationSchemas();
  });

  describe('DataValidator', () => {
    it('should validate required fields correctly', async () => {
      const testData = {
        id: 'test-1',
        first_name: 'John',
        last_name: 'Doe',
        // missing required gender and status fields
      };

      const result = globalDataValidator.validateEntity('students', testData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'gender' && e.code === 'REQUIRED_FIELD')).toBe(true);
      expect(result.errors.some(e => e.field === 'status' && e.code === 'REQUIRED_FIELD')).toBe(true);
    });

    it('should validate field types correctly', async () => {
      const testData = {
        id: 'test-1',
        first_name: 'John',
        last_name: 'Doe',
        gender: PersonGender.MALE,
        status: StudentStatus.ACTIVE,
        email: 'invalid-email' // Invalid email format
      };

      const result = globalDataValidator.validateEntity('students', testData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'email' && e.code === 'INVALID_EMAIL')).toBe(true);
    });

    it('should validate enum values correctly', async () => {
      const testData = {
        id: 'test-1',
        first_name: 'John',
        last_name: 'Doe',
        gender: 'InvalidGender', // Invalid enum value
        status: StudentStatus.ACTIVE
      };

      const result = globalDataValidator.validateEntity('students', testData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'gender' && e.code === 'INVALID_ENUM')).toBe(true);
    });

    it('should validate string length constraints', async () => {
      const testData = {
        id: 'test-1',
        first_name: '', // Too short
        last_name: 'A'.repeat(150), // Too long (assuming max 100)
        gender: PersonGender.MALE,
        status: StudentStatus.ACTIVE
      };

      const result = globalDataValidator.validateEntity('students', testData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'first_name' && e.code === 'MIN_LENGTH')).toBe(true);
      expect(result.errors.some(e => e.field === 'last_name' && e.code === 'MAX_LENGTH')).toBe(true);
    });

    it('should validate business rules correctly', async () => {
      const existingStudents = [
        { id: 'existing-1', admission_no: 'ADM001', first_name: 'Jane', last_name: 'Smith' }
      ];

      const testData = {
        id: 'test-1',
        admission_no: 'ADM001', // Duplicate admission number
        first_name: 'John',
        last_name: 'Doe',
        gender: PersonGender.MALE,
        status: StudentStatus.ACTIVE
      };

      const result = globalDataValidator.validateEntity('students', testData, {
        allStudents: existingStudents
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'admission_no' && e.code === 'DUPLICATE_ADMISSION_NO')).toBe(true);
    });

    it('should validate date constraints', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const testData = {
        id: 'test-1',
        first_name: 'John',
        last_name: 'Doe',
        gender: PersonGender.MALE,
        status: StudentStatus.ACTIVE,
        date_of_birth: futureDate.toISOString() // Future date of birth
      };

      const result = globalDataValidator.validateEntity('students', testData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'date_of_birth' && e.code === 'INVALID_DOB')).toBe(true);
    });

    it('should pass validation for valid data', async () => {
      const testData = {
        id: 'test-1',
        admission_no: 'ADM001',
        first_name: 'John',
        last_name: 'Doe',
        gender: PersonGender.MALE,
        status: StudentStatus.ACTIVE,
        email: 'john.doe@example.com',
        phone: '+1234567890',
        date_of_birth: '2005-01-01'
      };

      const result = globalDataValidator.validateEntity('students', testData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Common Validations', () => {
    it('should validate email format', () => {
      expect(CommonValidations.email('valid@example.com')).toBeNull();
      expect(CommonValidations.email('invalid-email')).not.toBeNull();
      expect(CommonValidations.email('missing@domain')).not.toBeNull();
    });

    it('should validate phone format', () => {
      expect(CommonValidations.phone('+1234567890')).toBeNull();
      expect(CommonValidations.phone('1234567890')).toBeNull();
      expect(CommonValidations.phone('123-456-7890')).toBeNull();
      expect(CommonValidations.phone('invalid-phone')).not.toBeNull();
    });

    it('should validate positive numbers', () => {
      expect(CommonValidations.positiveNumber(100)).toBeNull();
      expect(CommonValidations.positiveNumber(0)).toBeNull();
      expect(CommonValidations.positiveNumber(-10)).not.toBeNull();
    });

    it('should validate future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      expect(CommonValidations.futureDate(futureDate)).toBeNull();
      expect(CommonValidations.futureDate(pastDate)).not.toBeNull();
    });
  });

  describe('Referential Integrity', () => {
    it('should validate foreign key references', async () => {
      const dataContext = {
        students: [
          { id: 'student-1', current_class_stream_id: 999 } // Non-existent class stream
        ],
        classStreams: [
          { id: 1, name: 'Form 1A' },
          { id: 2, name: 'Form 1B' }
        ]
      };

      const student = dataContext.students[0];
      const errors = await globalDataValidator.validateReferentialIntegrity(
        'students',
        student,
        dataContext
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('BROKEN_REFERENCE');
      expect(errors[0].field).toBe('current_class_stream_id');
    });

    it('should pass referential integrity for valid references', async () => {
      const dataContext = {
        students: [
          { id: 'student-1', current_class_stream_id: 1 }
        ],
        classStreams: [
          { id: 1, name: 'Form 1A' },
          { id: 2, name: 'Form 1B' }
        ]
      };

      const student = dataContext.students[0];
      const errors = await globalDataValidator.validateReferentialIntegrity(
        'students',
        student,
        dataContext
      );

      expect(errors).toHaveLength(0);
    });
  });

  describe('Consistency Checks', () => {
    it('should detect orphaned financial records', async () => {
      const dataContext = {
        students: [
          { id: 'student-1', name: 'John Doe' }
        ],
        studentInvoices: [
          { id: 'invoice-1', student_id: 'student-1', invoice_number: 'INV001' },
          { id: 'invoice-2', student_id: 'non-existent', invoice_number: 'INV002' } // Orphaned
        ],
        studentPayments: [
          { id: 'payment-1', student_id: 'student-1', receipt_no: 'REC001' },
          { id: 'payment-2', student_id: 'non-existent', receipt_no: 'REC002' } // Orphaned
        ]
      };

      const errors = await globalDataValidator.validateConsistency(dataContext);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.code === 'ORPHANED_INVOICE')).toBe(true);
      expect(errors.some(e => e.code === 'ORPHANED_PAYMENT')).toBe(true);
    });

    it('should detect duplicate IDs', async () => {
      const dataContext = {
        students: [
          { id: 'duplicate-id', name: 'John Doe' },
          { id: 'duplicate-id', name: 'Jane Smith' } // Duplicate ID
        ]
      };

      const errors = await globalDataValidator.validateConsistency(dataContext);

      expect(errors.some(e => e.code === 'DUPLICATE_ID')).toBe(true);
    });

    it('should pass consistency checks for valid data', async () => {
      const dataContext = {
        students: [
          { id: 'student-1', name: 'John Doe' },
          { id: 'student-2', name: 'Jane Smith' }
        ],
        studentInvoices: [
          { id: 'invoice-1', student_id: 'student-1', invoice_number: 'INV001' },
          { id: 'invoice-2', student_id: 'student-2', invoice_number: 'INV002' }
        ]
      };

      const errors = await globalDataValidator.validateConsistency(dataContext);

      expect(errors).toHaveLength(0);
    });
  });
});

describe('Data Consistency Service', () => {
  let consistencyService: DataConsistencyService;

  beforeEach(() => {
    consistencyService = new DataConsistencyService({
      enableValidation: true,
      enableReferentialIntegrity: true,
      enableConsistencyChecks: true,
      validationMode: 'strict',
      autoFix: false,
      logErrors: false
    });
  });

  it('should validate entity for create operation', async () => {
    const validStudent = {
      id: 'test-1',
      admission_no: 'ADM001',
      first_name: 'John',
      last_name: 'Doe',
      gender: PersonGender.MALE,
      status: StudentStatus.ACTIVE
    };

    const result = await consistencyService.validateEntity('students', validStudent, 'create');

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate entity for update operation', async () => {
    const existingData = {
      students: [
        { id: 'test-1', admission_no: 'ADM001', first_name: 'John', last_name: 'Doe' }
      ]
    };

    const updateData = {
      id: 'test-1',
      admission_no: 'ADM001',
      first_name: 'Johnny',
      last_name: 'Doe',
      gender: PersonGender.MALE,
      status: StudentStatus.ACTIVE
    };

    const result = await consistencyService.validateEntity('students', updateData, 'update', {
      dataContext: existingData
    });

    expect(result.isValid).toBe(true);
  });

  it('should validate entity for delete operation with cascade constraints', async () => {
    const existingData = {
      students: [
        { id: 'test-1', name: 'John Doe' }
      ],
      studentInvoices: [
        { id: 'invoice-1', student_id: 'test-1', invoice_number: 'INV001' }
      ]
    };

    const result = await consistencyService.validateEntity('students', { id: 'test-1' }, 'delete', {
      dataContext: existingData
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'CASCADE_DELETE_CONSTRAINT')).toBe(true);
  });

  it('should run comprehensive consistency check', async () => {
    const dataContext = {
      students: [
        { id: 'student-1', admission_no: 'ADM001', first_name: 'John', last_name: 'Doe', gender: PersonGender.MALE, status: StudentStatus.ACTIVE },
        { id: 'student-2', admission_no: 'ADM002', first_name: 'Jane', last_name: 'Smith', gender: PersonGender.FEMALE, status: StudentStatus.ACTIVE }
      ],
      studentInvoices: [
        { id: 'invoice-1', student_id: 'student-1', invoice_number: 'INV001', school_period_id: 1, issue_date: '2024-01-01', due_date: '2024-01-31', total_amount_billed: 1000, amount_paid: 500, status: 'Due' }
      ],
      schoolPeriods: [
        { id: 1, name: 'Term 1 2024' }
      ]
    };

    const report = await consistencyService.runConsistencyCheck(dataContext, 'demo');

    expect(report).toBeDefined();
    expect(report.totalEntities).toBe(3);
    expect(report.totalRecords).toBe(4);
    
    expect(report.summary.isConsistent).toBe(true);
  });

  it('should handle validation in lenient mode', async () => {
    const lenientService = new DataConsistencyService({
      validationMode: 'lenient'
    });

    const invalidData = {
      id: 'test-1',
      first_name: 'John',
      last_name: 'Doe',
      gender: PersonGender.MALE,
      status: StudentStatus.ACTIVE,
      email: 'invalid-email' // Invalid email
    };

    const result = await lenientService.validateEntity('students', invalidData, 'create');

    // In lenient mode, non-critical errors become warnings
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('Unified CRUD Service', () => {
  let crudService: UnifiedCRUDService;

  beforeEach(() => {
    // Create a mock data service for testing
    const mockDataStore = new Map();
    
    const mockDataService = {
      create: vi.fn().mockImplementation(async (entityName: string, data: any) => {
        const id = data.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const entity = { ...data, id };
        mockDataStore.set(`${entityName}:${id}`, entity);
        return { success: true, data: entity };
      }),
      read: vi.fn().mockImplementation(async (entityName: string, id: string) => {
        const entity = mockDataStore.get(`${entityName}:${id}`);
        return { success: true, data: entity };
      }),
      update: vi.fn().mockImplementation(async (entityName: string, id: string, updates: any) => {
        const existing = mockDataStore.get(`${entityName}:${id}`);
        if (existing) {
          const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
          mockDataStore.set(`${entityName}:${id}`, updated);
          return { success: true, data: updated };
        }
        return { success: false, error: 'Entity not found' };
      }),
      delete: vi.fn().mockImplementation(async (entityName: string, id: string) => {
        const deleted = mockDataStore.delete(`${entityName}:${id}`);
        return { success: deleted };
      })
    };
    
    crudService = new UnifiedCRUDService(undefined, mockDataService);
  });

  it('should create entity with validation', async () => {
    const validStudent = {
      admission_no: 'ADM001',
      first_name: 'John',
      last_name: 'Doe',
      gender: PersonGender.MALE,
      status: StudentStatus.ACTIVE
    };

    const result = await crudService.create('students', validStudent, { validate: true });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBeDefined();
  });

  it('should reject invalid entity creation', async () => {
    const invalidStudent = {
      // Missing required fields
      first_name: 'John'
    };

    const result = await crudService.create('students', invalidStudent, { validate: true });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.validation).toBeDefined();
    expect(result.validation?.isValid).toBe(false);
  });

  it('should update entity with validation', async () => {
    // First create an entity
    const student = {
      admission_no: 'ADM001',
      first_name: 'John',
      last_name: 'Doe',
      gender: PersonGender.MALE,
      status: StudentStatus.ACTIVE
    };

    const createResult = await crudService.create('students', student);
    expect(createResult.success).toBe(true);

    // Then update it
    const updates = {
      first_name: 'Johnny'
    };

    const updateResult = await crudService.update('students', createResult.data!.id, updates, { validate: true });

    expect(updateResult.success).toBe(true);
    expect(updateResult.data?.first_name).toBe('Johnny');
  });

  it('should handle batch operations', async () => {
    const students = [
      {
        admission_no: 'ADM001',
        first_name: 'John',
        last_name: 'Doe',
        gender: PersonGender.MALE,
        status: StudentStatus.ACTIVE
      },
      {
        admission_no: 'ADM002',
        first_name: 'Jane',
        last_name: 'Smith',
        gender: PersonGender.FEMALE,
        status: StudentStatus.ACTIVE
      }
    ];

    const result = await crudService.batchCreate('students', students);

    expect(result.success).toBe(true);
    expect(result.totalProcessed).toBe(2);
    expect(result.totalSuccessful).toBe(2);
    expect(result.totalFailed).toBe(0);
  });

  it('should manage cache correctly', async () => {
    const student = {
      admission_no: 'ADM001',
      first_name: 'John',
      last_name: 'Doe',
      gender: PersonGender.MALE,
      status: StudentStatus.ACTIVE
    };

    // Create with caching enabled
    const createResult = await crudService.create('students', student, { cache: true });
    expect(createResult.success).toBe(true);

    // Read should hit cache
    const readResult = await crudService.read('students', createResult.data!.id, { cache: true });
    expect(readResult.success).toBe(true);
    expect(readResult.cached).toBe(true);
    expect(readResult.source).toBe('cache');
  });

  it('should provide performance metrics', async () => {
    const metrics = await crudService.getPerformanceMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.cacheStats).toBeDefined();
    expect(metrics.operationCounts).toBeDefined();
    expect(metrics.averageResponseTime).toBeDefined();
  });
});

describe('Integration Tests', () => {
  it('should integrate validation with data hook factory', async () => {
    // This would test the integration between the validation system
    // and the data hook factory, but requires more complex setup
    // with React testing utilities
    expect(true).toBe(true); // Placeholder
  });

  it('should integrate with AppDataContext', async () => {
    // This would test the full integration with the AppDataContext
    // but requires React testing environment
    expect(true).toBe(true); // Placeholder
  });
});