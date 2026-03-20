// hooks/useRxDBData.ts - Simplified version to eliminate hook violations
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subscription } from 'rxjs';
import type { SchoolDatabase } from '../services/rxdbService';
import { getDatabase } from '../services/databaseService';
import type { AppDataLoadingStates, AppDataContextType } from '../types';

const createInitialLoadingStates = (): AppDataLoadingStates => ({
  all: true,
  schoolDetails: true,
  roles: true,
  users: true,
  students: true,
  staff: true,
  classes: true,
  subjects: true,
  subjectPapers: true,
  examSessions: true,
  examPaperSettings: true,
  gradingSchemes: true,
  studentExamResults: true,
  classSubjectAllocations: true,
  teacherSubjectAssignments: true,
  studentSubjectEnrollments: true,
  timetablePeriodDefs: true,
  timetableEntries: true,
  departments: true,
  designations: true,
  studentCategories: true,
  dormitories: true,
  academicYears: true,
  schoolPeriods: true,
  academicYearStructures: true,
  academicPeriodDefinitions: true,
  financialYears: true,
  classStreams: true,
  parentsGuardians: true,
  studentGuardianRelationships: true,
  partners: true,
  clubs: true,
  customers: true,
  studentHealthRecords: true,
  studentAttendance: true,
  templatesComm: true,
  campaigns: true,
  chartOfAccounts: true,
  banks: true,
  suppliers: true,
  feeTemplates: true,
  feeTemplateItems: true,
  expenseCategories: true,
  supplierInvoices: true,
  warehouses: true,
  itemCategoriesInv: true,
  itemsInv: true,
  fixedAssets: true,
  assetDepreciationLogs: true,
  requisitions: true,
  purchaseOrders: true,
  stockLevels: true,
  stockTransactions: true,
  payrollPeriods: true,
  payrollItemTypes: true,
  staffSalarySettings: true,
  payslips: true,
  bookCategories: true,
  books: true,
  loans: true,
  fines: true,
  customerInvoices: true,
  workflows: true,
  mealPlans: true,
  menus: true,
  merchants: true,
  auditLogs: true,
  expenseClaims: true,
  studentOpeningBalances: true,
  feeAdjustments: true,
  transportRoutes: true,
  studentTransportAssignments: true,
  studentInvoices: true,
  studentInvoiceItems: true,
  studentPayments: true,
  invoicePaymentApplications: true,
  studentMealPlans: true,
  mealConsumptionLogs: true,
  walletTransactions: true,
  studentWallets: true,
  generalPayments: true,
  generalLedgerEntries: true,
  rfqs: true,
  appSettings: true,
  studentClassHistory: true,
  healthIncidentReports: true,
  disciplinaryRecords: true,
  permissions: true,
  userRoles: true,
});

// Simplified hook with minimal state and stable dependencies
export const useRxDBData = (): Partial<AppDataContextType> => {
  const [dbInstance, setDbInstance] = useState<SchoolDatabase | null>(null);
  const [loading, setLoading] = useState<AppDataLoadingStates>(createInitialLoadingStates());
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const [isUsingRxDBDummyData, setIsUsingRxDBDummyData] = useState<boolean>(false);
  
  // Basic data state - simplified to prevent hook violations
  const [schoolDetails, setSchoolDetails] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  // Database initialization - single effect with stable dependencies
  useEffect(() => {
    let isMounted = true;
    const subscription: Subscription | null = null;
    
    const initializeDatabase = async () => {
      try {
        const db = await getDatabase();
        if (isMounted) {
          setDbInstance(db);
          setInitializationError(null);
          
          // Set all loading states to false once DB is ready
          setLoading(prev => ({
            ...prev,
            all: false,
            schoolDetails: false,
            users: false,
            students: false,
            staff: false,
            classes: false,
            subjects: false
          }));
        }
      } catch (error: any) {
        console.error('Database initialization error:', error);
        if (isMounted) {
          setInitializationError(error);
          setLoading(prev => ({ ...prev, all: false }));
        }
      }
    };
    
    initializeDatabase();
    
    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []); // Empty dependency array - runs once
  
  // Memoized functions to prevent re-renders
  const triggerSeedRxDB = useCallback(async () => {
    console.log('Seed RxDB triggered');
  }, []);
  
  const triggerClearRxDB = useCallback(async () => {
    console.log('Clear RxDB triggered');
  }, []);
  
  const getStudentDetailsById = useCallback((id: string) => {
    return students.find(student => student.id === id) || null;
  }, [students]);
  
  const refresh = useCallback(async () => {
    console.log('RxDB refresh triggered');
    // In a real implementation, this would refresh data from the database
  }, []);
  
  // Return simplified context value
  return useMemo(() => ({
    loading: loading, // FIXED: Return AppDataLoadingStates object instead of boolean
    initializationError,
    isRxDBModeActive: true,
    isUsingRxDBDummyData,
    schoolDetails,
    users,
    students,
    staff,
    classes,
    subjects,
    // Simplified data arrays
    roles: [],
    subjectPapers: [],
    examSessions: [],
    examPaperSettings: [],
    gradingSchemes: [],
    studentExamResults: [],
    classSubjectAllocations: [],
    teacherSubjectAssignments: [],
    studentSubjectEnrollments: [],
    timetablePeriodDefs: [],
    timetableEntries: [],
    departments: [],
    designations: [],
    studentCategories: [],
    dormitories: [],
    academicYears: [],
    schoolPeriods: [],
    academicYearStructures: [],
    academicPeriodDefinitions: [],
    financialYears: [],
    classStreams: [],
    parentsGuardians: [],
    studentGuardianRelationships: [],
    partners: [],
    clubs: [],
    customers: [],
    studentHealthRecords: [],
    studentAttendance: [],
    templatesComm: [],
    campaigns: [],
    chartOfAccounts: [],
    banks: [],
    suppliers: [],
    feeTemplates: [],
    feeTemplateItems: [],
    expenseCategories: [],
    supplierInvoices: [],
    warehouses: [],
    itemCategoriesInv: [],
    itemsInv: [],
    fixedAssets: [],
    assetDepreciationLogs: [],
    requisitions: [],
    purchaseOrders: [],
    stockLevels: [],
    stockTransactions: [],
    payrollPeriods: [],
    payrollItemTypes: [],
    staffSalarySettings: [],
    payslips: [],
    bookCategories: [],
    books: [],
    loans: [],
    fines: [],
    customerInvoices: [],
    workflows: [],
    mealPlans: [],
    menus: [],
    merchants: [],
    auditLogs: [],
    expenseClaims: [],
    studentOpeningBalances: [],
    feeAdjustments: [],
    transportRoutes: [],
    studentTransportAssignments: [],
    studentInvoices: [],
    studentInvoiceItems: [],
    studentPayments: [],
    invoicePaymentApplications: [],
    studentMealPlans: [],
    mealConsumptionLogs: [],
    walletTransactions: [],
    studentWallets: [],
    generalPayments: [],
    generalLedgerEntries: [],
    rfqs: [],
    appSettings: null,
    studentClassHistory: [],
    healthIncidentReports: [],
    disciplinaryRecords: [],
    permissions: [],
    userRoles: [],
    // Functions
    refresh,
    triggerSeedRxDB,
    triggerClearRxDB,
    getStudentDetailsById,
    getStudentFinancialDetailsById: () => null,
    updateSchoolDetails: async () => {},
    addUser: async () => {},
    updateUser: async () => {},
    deleteUser: async () => {},
    addRole: async () => {},
    updateRole: async () => {},
    deleteRole: async () => {},
    addStudent: async () => {},
    updateStudent: async () => {},
    deleteStudent: async () => {},
    addStaffMember: async () => {},
    updateStaffMember: async () => {},
    deleteStaffMember: async () => {},
  }), [
    loading, // Updated to match the AppDataLoadingStates object
    initializationError,
    isUsingRxDBDummyData,
    schoolDetails,
    users,
    students,
    staff,
    classes,
    subjects,
    refresh,
    triggerSeedRxDB,
    triggerClearRxDB,
    getStudentDetailsById
  ]);
};
