// ABOUTME: Dynamically loads and aggregates all modular mock data for the app.
// ABOUTME: Used as the only source of mock data for AppDataContext in mock/demo mode.
// ABOUTME: Delegates CRUD operations to module-specific hooks to respect modular architecture.

import { useState, useEffect } from 'react';
import type { AppDataType, AppDataContextType, AppDataLoadingStates } from '../core/types';

// --- Modular Loader: Dynamically import all module mockData.ts files ---
const mockDataModules = import.meta.glob('../modules/*/data/mockData.ts', { eager: true });

function aggregateModularMockData(): Partial<AppDataType> {
  const merged: any = {};
  for (const modPath in mockDataModules) {
    const mod = mockDataModules[modPath] as Record<string, any>;
    for (const [key, value] of Object.entries(mod)) {
      if (Array.isArray(value)) {
        merged[key] = (merged[key] || []).concat(value);
      } else {
        merged[key] = value;
      }
    }
  }
  return merged;
}

function fillAllAppDataKeys(data: Partial<AppDataType>): AppDataType {
  const APP_DATA_KEYS: (keyof AppDataType)[] = [
    'schoolDetails', 'roles', 'users', 'students', 'staff', 'classes', 'classStreams', 'subjects', 'departments', 'designations', 'studentCategories', 'dormitories', 'academicYears', 'schoolPeriods', 'academicYearStructures', 'academicPeriodDefinitions', 'financialYears', 'partners', 'clubs', 'customers', 'studentHealthRecords', 'studentAttendance', 'timetablePeriodDefs', 'templatesComm', 'campaigns', 'subjectPapers', 'examSessions', 'examPaperSettings', 'gradingSchemes', 'chartOfAccounts', 'expenseCategories', 'banks', 'suppliers', 'feeTemplates', 'feeTemplateItems', 'expenseClaims', 'studentInvoices', 'studentInvoiceItems', 'studentPayments', 'feeAdjustments', 'invoicePaymentApplications', 'customerInvoices', 'supplierInvoices', 'studentExamResults', 'classSubjectAllocations', 'teacherSubjectAssignments', 'studentSubjectEnrollments', 'timetableEntries', 'warehouses', 'itemCategoriesInv', 'itemsInv', 'fixedAssets', 'requisitions', 'purchaseOrders', 'stockLevels', 'stockTransactions', 'payrollPeriods', 'payrollItemTypes', 'staffSalarySettings', 'payslips', 'bookCategories', 'books', 'loans', 'fines', 'parentsGuardians', 'workflows', 'mealPlans', 'menus', 'merchants', 'auditLogs', 'studentOpeningBalances', 'transportRoutes', 'studentTransportAssignments', 'generalPayments', 'generalLedgerEntries', 'rfqs'
  ];
  const filled: any = {};
  for (const key of APP_DATA_KEYS) {
    if (key === 'schoolDetails') {
      filled[key] = data[key] ?? null;
    } else {
      filled[key] = Array.isArray(data[key]) ? data[key] : [];
    }
  }
  return filled as AppDataType;
}

const rawInitialData: AppDataType = fillAllAppDataKeys(aggregateModularMockData());

// Helper to create loading states for all entities
const createLoadingStates = (): AppDataLoadingStates => {
  const keys = Object.keys(rawInitialData) as Array<keyof AppDataType>;
  const states = keys.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {} as Record<keyof AppDataType, boolean>);
  return { ...states, all: true };
};

// Dynamically collect all keys from all loaded mockData modules
const allMockKeys = Array.from(
  new Set(
    Object.values(rawInitialData)
      .flatMap(mod => (typeof mod === 'object' && mod !== null ? Object.keys(mod) : []))
  )
);

// Helper to determine if a value is an array (for defaulting to [])
const isArrayType = (val: any) => Array.isArray(val);

export const useModularMockData = (): AppDataContextType => {
  // Only use the merged mock data
  const [loading, setLoading] = useState<AppDataLoadingStates>(createLoadingStates());

  useEffect(() => {
    // Simulate async loading
    const timer = setTimeout(() => {
      setLoading(prev => {
        // Set all loading states to false
        const newLoading = { ...prev };
        Object.keys(newLoading).forEach(key => {
          newLoading[key as keyof AppDataLoadingStates] = false;
        });
        return newLoading;
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Use only the merged mock data for all entities
  const fullData: any = { ...rawInitialData };

  // Patch: All context methods must return Promises
  const getStudentDetailsById = async (studentId: string) => {
    const student = rawInitialData.students.find((s: any) => s.id === studentId);
    if (student) {
      // Create a detailed student profile with all required fields
      const studentProfile = {
        ...student,
        // Ensure all required fields are present
        photo_path: student.photo_path || null,
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        admission_no: student.admission_no || '',
        current_class_name: student.current_class_name || '',
        current_class_stream_name: student.current_class_stream_name || '',
        email: student.email || '',
        phone: student.phone || '',
        date_of_birth: student.date_of_birth || null,
        gender: student.gender || '',
        address: student.address || '',
        religion: student.religion || '',
        remarks: student.remarks || '',
        primary_guardian: student.primary_guardian || null,
        // Mock enrolled subjects
        enrolled_subjects: [
          {
            id: 1,
            courseName: 'Mathematics',
            professorInstructorName: 'Dr. Smith',
            status: 'Active'
          },
          {
            id: 2,
            courseName: 'English Literature',
            professorInstructorName: 'Ms. Johnson',
            status: 'Active'
          },
          {
            id: 3,
            courseName: 'Physics',
            professorInstructorName: 'Prof. Wilson',
            status: 'Active'
          },
          {
            id: 4,
            courseName: 'Chemistry',
            professorInstructorName: 'Dr. Brown',
            status: 'Active'
          }
        ],
        // Mock payment history
        payment_history: [
          {
            id: `PAY_${studentId}_001`,
            transactionId: `TXN${studentId}001`,
            paymentDate: '2024-01-15',
            amount: 50000
          }
        ]
      };
      return studentProfile;
    }
    return null;
  };

  const getStudentFinancialDetailsById = async (studentId: string) => {
    const student = rawInitialData.students.find((s: any) => s.id === studentId);
    if (student) {
      // Create mock financial details
      const financialDetails = {
        student_id: studentId,
        student_name: `${student.first_name} ${student.last_name}`,
        admission_no: student.admission_no,
        current_class_name: student.current_class_name,
        current_class_stream_name: student.current_class_stream_name,
        
        // Financial summary
        total_fees_charged: 75000,
        total_amount_paid: 65000,
        outstanding_balance: 10000,
        overpayment: 0,
        
        // Invoice/charges breakdown
        invoices_charges: [
          {
            id: `INV_${studentId}_001`,
            description: 'Term 1 Tuition Fees',
            amount: 25000,
            due_date: '2024-01-31',
            status: 'Paid'
          },
          {
            id: `INV_${studentId}_002`,
            description: 'Term 2 Tuition Fees',
            amount: 25000,
            due_date: '2024-04-30',
            status: 'Paid'
          },
          {
            id: `INV_${studentId}_003`,
            description: 'Term 3 Tuition Fees',
            amount: 25000,
            due_date: '2024-08-31',
            status: 'Partially Paid'
          }
        ],
        
        // Payment history (same as in student details)
        payment_history: [
          {
            id: `PAY_${studentId}_001`,
            transactionId: `TXN${studentId}001`,
            paymentDate: '2024-01-15',
            amount: 25000,
            paymentMethod: 'Bank Transfer',
            description: 'Term 1 School Fees'
          },
          {
            id: `PAY_${studentId}_002`,
            transactionId: `TXN${studentId}002`,
            paymentDate: '2024-04-10',
            amount: 25000,
            paymentMethod: 'M-Pesa',
            description: 'Term 2 School Fees'
          },
          {
            id: `PAY_${studentId}_003`,
            transactionId: `TXN${studentId}003`,
            paymentDate: '2024-08-20',
            amount: 15000,
            paymentMethod: 'Cash',
            description: 'Partial Term 3 School Fees'
          }
        ]
      };

      console.log(`✅ Found financial details for student ID ${studentId}`);
      return financialDetails;
    }
    console.warn(`Student with ID ${studentId} not found for financial details`);
    return null;
  };

  return {
    ...fullData,
    loading,
    initializationError: null,
    isRxDBModeActive: false,
    isUsingRxDBDummyData: false,
    rawInitialData,
    triggerSeedRxDB: async () => console.warn('Seeding not available in mock mode.'),
    triggerClearRxDB: async () => console.warn('Clearing not available in mock mode.'),
    getStudentDetailsById,
    getStudentFinancialDetailsById,
    // All the CRUD functions from module hooks
    // addPartner, updatePartner, deletePartner, // Removed as per edit hint
    // addClubAndSociety: async () => {}, // Removed as per edit hint
    // updateClubAndSociety: async () => {}, // Removed as per edit hint
    // deleteClubAndSociety: async () => {}, // Removed as per edit hint
    // addCustomer: async () => {}, // Removed as per edit hint
    // updateCustomer: async () => {}, // Removed as per edit hint
    // deleteCustomer: async () => {}, // Removed as per edit hint
    // addStudentHealthRecord: async () => {}, // Removed as per edit hint
    // updateStudentHealthRecord: async () => {}, // Removed as per edit hint
    // deleteStudentHealthRecord: async () => {}, // Removed as per edit hint
    // addTemplateComm: async () => {}, // Removed as per edit hint
    // updateTemplateComm: async () => {}, // Removed as per edit hint
    // deleteTemplateComm: async () => {}, // Removed as per edit hint
    // addCampaign: async () => {}, // Removed as per edit hint
    // updateCampaign: async () => {}, // Removed as per edit hint
    // deleteCampaign: async () => {}, // Removed as per edit hint
    // addSchoolPeriod: async () => {}, // Removed as per edit hint
    // updateSchoolPeriod: async () => {}, // Removed as per edit hint
    // deleteSchoolPeriod: async () => {}, // Removed as per edit hint
    // addTimetablePeriodDef: async () => {}, // Removed as per edit hint
    // updateTimetablePeriodDef: async () => {}, // Removed as per edit hint
    // deleteTimetablePeriodDef: async () => {}, // Removed as per edit hint
    // addClass: addClass, // Removed as per edit hint
    // updateClass: updateClass, // Removed as per edit hint
    // deleteClass: deleteClass, // Removed as per edit hint
    // addClassStream: addClassStream, // Removed as per edit hint
    // updateClassStream: updateClassStream, // Removed as per edit hint
    // deleteClassStream: deleteClassStream, // Removed as per edit hint
    generateStudentInvoices: async () => [],
    permissions: [],
    roles: [],
    userRoles: [],
    addPermission: async () => {},
    updatePermission: async () => {},
    deletePermission: async () => {},
    addRole: async () => {},
    updateRole: async () => {},
    deleteRole: async () => {},
    assignRoleToUser: async () => {},
    removeRoleFromUser: async () => {},
  };
};

export { rawInitialData }; 