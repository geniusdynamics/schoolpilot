// ABOUTME: New hook that uses the PouchDB-first database service instead of RxDB
// ABOUTME: Provides the same interface as useRxDBData but with the new database architecture

import { useState, useEffect, useCallback } from 'react';
import type { AppDataLoadingStates, RawInitialData, AppDataContextType } from '../types';
import { databaseService } from '../services/databaseService';
import { rbacService } from '../core/rbacService';
import type { RbacRole, Permission, UserRole } from '../core/types';
import * as allTypes from '../types';

const createInitialLoadingStates = (): AppDataLoadingStates => ({
  all: true, schoolDetails: true, roles: true, users: true, students: true, staff: true, classes: true,
  subjects: true, subjectPapers: true, examSessions: true, examPaperSettings: true,
  gradingSchemes: true, studentExamResults: true, classSubjectAllocations: true,
  teacherSubjectAssignments: true, studentSubjectEnrollments: true, timetablePeriodDefs: true, timetableEntries: true,
  departments: true, designations: true, studentCategories: true, dormitories: true,
  academicYears: true, schoolPeriods: true, academicYearStructures: true, academicPeriodDefinitions: true,
  financialYears: true, classStreams: true, parentsGuardians: true, studentGuardianRelationships: true,
  partners: true, clubs: true, customers: true, studentHealthRecords: true, studentAttendance: true,
  templatesComm: true, campaigns: true,
  chartOfAccounts: true, banks: true, suppliers: true,
  feeTemplates: true, feeTemplateItems: true, expenseCategories: true, supplierInvoices: true,
  warehouses: true, itemCategoriesInv: true,
  itemsInv: true, fixedAssets: true, assetDepreciationLogs: true, requisitions: true, purchaseOrders: true,
  stockLevels: true, stockTransactions: true, payrollPeriods: true, payrollItemTypes: true,
  staffSalarySettings: true, payslips: true, bookCategories: true, books: true, loans: true, fines: true,
  customerInvoices: true, workflows: true, mealPlans: true, menus: true, merchants: true, auditLogs: true,
  expenseClaims: true, studentOpeningBalances: true, feeAdjustments: true, transportRoutes: true,
  studentTransportAssignments: true, studentInvoices: true, studentInvoiceItems: true, studentPayments: true,
  invoicePaymentApplications: true, studentMealPlans: true, mealConsumptionLogs: true,
  walletTransactions: true, studentWallets: true, generalPayments: true, generalLedgerEntries: true,
  rfqs: true, appSettings: true, studentClassHistory: true, healthIncidentReports: true, disciplinaryRecords: true,
  permissions: true,
  userRoles: true,
});

const unimplementedAsync = async (..._args: any[]): Promise<any> => { 
  console.warn("Database function not implemented yet."); 
  await new Promise(resolve => setTimeout(resolve, 50)); 
  return null; 
};

const unimplementedSync = (..._args: any[]): any[] => { 
  console.warn("Database getter not implemented yet."); 
  return []; 
};

// Helper function to create standard CRUD operations
const createCrudOperations = (collectionName: string, entityName: string) => {
  return {
    add: useCallback(async (data: any) => {
      try {
        const db = await databaseService.getDatabase();
        const dataWithId = { ...data, id: databaseService.generateId() };
        const result = await db[collectionName]?.insert(dataWithId);
        return result?.doc || null;
      } catch (error) {
        console.error(`Error adding ${entityName}:`, error);
        throw error;
      }
    }, []),
    
    update: useCallback(async (id: string, data: any) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db[collectionName]?.update(id, data);
        return result?.doc || null;
      } catch (error) {
        console.error(`Error updating ${entityName}:`, error);
        throw error;
      }
    }, []),
    
    delete: useCallback(async (id: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db[collectionName]?.remove(id);
        return true;
      } catch (error) {
        console.error(`Error deleting ${entityName}:`, error);
        throw error;
      }
    }, [])
  };
};

export const useDatabaseData = (mockDataForSeeding: RawInitialData): AppDataContextType => {
  const [loading, setLoading] = useState<AppDataLoadingStates>(createInitialLoadingStates());
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const [isUsingRxDBDummyData, setIsUsingRxDBDummyData] = useState<boolean | null>(null);
  const [data, setData] = useState<Omit<AppDataContextType, 'loading' | 'rawInitialData' | 'initializationError' | 'isRxDBModeActive' | 'isUsingRxDBDummyData' | 'triggerSeedRxDB' | 'triggerClearRxDB' | 'getStudentDetailsById' | 'getStudentFinancialDetailsById' | 'updateSchoolDetails'| 'addUser' | 'updateUser'| 'deleteUser' | 'addRole'| 'updateRole'|'deleteRole'|'addStudent'|'updateStudent'|'deleteStudent'|'addStaffMember'|'updateStaffMember'|'deleteStaffMember'|'addParentGuardian'|'updateParentGuardian'|'deleteParentGuardian'|'addStudentGuardianRelationship'|'updateStudentGuardianRelationship'|'deleteStudentGuardianRelationship'|'addDepartment'|'updateDepartment'|'deleteDepartment'|'addDesignation'|'updateDesignation'|'deleteDesignation'|'addStudentCategory'|'updateStudentCategory'|'deleteStudentCategory'|'addDormitory'|'updateDormitory'|'deleteDormitory'|'addAcademicYearStructure'|'updateAcademicYearStructure'|'deleteAcademicYearStructure'|'addAcademicPeriodDefinition'|'updateAcademicPeriodDefinition'|'deleteAcademicPeriodDefinition'|'addAcademicYear'|'updateAcademicYear'|'deleteAcademicYear'|'addSchoolPeriod'|'updateSchoolPeriod'|'deleteSchoolPeriod'|'addPartner'|'updatePartner'|'deletePartner'|'addClub'|'updateClub'|'deleteClub'|'addCustomer'|'updateCustomer'|'deleteCustomer'|'addStudentHealthRecord'|'updateStudentHealthRecord'|'saveStudentAttendance'|'getStudentAttendanceByFilters'|'addTemplateComm'|'updateTemplateComm'|'deleteTemplateComm'|'addCampaign'|'updateCampaign'|'deleteCampaign'|'addAuditLog'|'addClass'|'updateClass'|'deleteClass'|'addClassStream'|'updateClassStream'|'deleteClassStream'|'addSubject'|'updateSubject'|'deleteSubject'|'addSubjectPaper'|'updateSubjectPaper'|'deleteSubjectPaper'|'addExamSession'|'updateExamSession'|'deleteExamSession'|'addExamPaperSetting'|'updateExamPaperSetting'|'deleteExamPaperSetting'|'addGradingScheme'|'updateGradingScheme'|'deleteGradingScheme'|'getStudentsForExamEntry'|'getExamPaperSettingsForSession'|'saveStudentExamResult'|'getTimetablePeriodDefs'|'addTimetablePeriodDef'|'updateTimetablePeriodDef'|'deleteTimetablePeriodDef'|'getTimetableEntries'|'addTimetableEntry'|'updateTimetableEntry'|'deleteTimetableEntry'|'addClassSubjectAllocation'|'updateClassSubjectAllocation'|'deleteClassSubjectAllocation'|'addTeacherSubjectAssignment'|'deleteTeacherSubjectAssignment'|'addStudentSubjectEnrollment'|'updateStudentSubjectEnrollment'|'deleteStudentSubjectEnrollment'|'addChartOfAccount'|'updateChartOfAccount'|'deleteChartOfAccount'|'addBank'|'updateBank'|'deleteBank'|'addSupplier'|'updateSupplier'|'deleteSupplier'|'addFeeTemplate'|'updateFeeTemplate'|'deleteFeeTemplate'|'addExpenseClaim'|'updateExpenseClaim'|'deleteExpenseClaim'|'addExpenseCategory'|'updateExpenseCategory'|'deleteExpenseCategory'|'addCustomerInvoice'|'updateCustomerInvoice'|'deleteCustomerInvoice'|'addSupplierInvoice'|'updateSupplierInvoice'|'deleteSupplierInvoice'|'addStudentOpeningBalance'|'updateStudentOpeningBalance'|'deleteStudentOpeningBalance'|'addFeeAdjustment'|'updateFeeAdjustment'|'deleteFeeAdjustment'|'addTransportRoute'|'updateTransportRoute'|'deleteTransportRoute'|'addStudentTransportAssignment'|'updateStudentTransportAssignment'|'deleteStudentTransportAssignment'|'generateStudentInvoices'|'addStudentPayment'|'updateStudentPayment'|'deleteStudentPayment'|'applyPaymentToInvoices'|'addGeneralPayment'|'updateGeneralPayment'|'deleteGeneralPayment'|'addFinancialYear'|'updateFinancialYear'|'deleteFinancialYear'|'addPayrollPeriod'|'updatePayrollPeriod'|'deletePayrollPeriod'|'addPayrollItemType'|'updatePayrollItemType'|'deletePayrollItemType'|'updateStaffSalarySetting'|'generatePayslipsForPeriod'|'addWarehouse'|'updateWarehouse'|'deleteWarehouse'|'addItemCategoryInv'|'updateItemCategoryInv'|'deleteItemCategoryInv'|'addItemInv'|'updateItemInv'|'deleteItemInv'|'addFixedAsset'|'updateFixedAsset'|'deleteFixedAsset'|'addAssetDepreciationLog'|'addRequisition'|'updateRequisition'|'deleteRequisition'|'updateRequisitionStatus'|'addPurchaseOrder'|'updatePurchaseOrder'|'deletePurchaseOrder'|'addStockTransaction'|'addRfq'|'updateRfq'|'deleteRfq'|'addBookCategory'|'updateBookCategory'|'deleteBookCategory'|'addBook'|'updateBook'|'deleteBook'|'addLoan'|'updateLoan'|'addFine'|'updateFineStatus'|'addMealPlan'|'updateMealPlan'|'deleteMealPlan'|'addMenu'|'updateMenu'|'deleteMenu'|'addStudentMealPlan'|'updateStudentMealPlan'|'deleteStudentMealPlan'|'addMealConsumptionLog'|'addMerchant'|'updateMerchant'|'deleteMerchant'|'addWalletTransaction'|'addWorkflow'|'updateWorkflow'|'deleteWorkflow'|'addWorkflowState'|'updateWorkflowState'|'deleteWorkflowState'>>({} as any);
  const [rbac, setRbac] = useState<{ permissions: Permission[]; roles: RbacRole[]; userRoles: UserRole[] }>({ permissions: [], roles: [], userRoles: [] });
  
  useEffect(() => {
    let isMounted = true;

    const initializeDatabase = async () => {
      try {
        // Initialize the database service
        await databaseService.initialize();
        
        if (isMounted) {
          // Set dummy data flag
          setIsUsingRxDBDummyData(false); // PouchDB service doesn't use dummy data by default
          
          // Load initial data - for now just set empty arrays to stop loading states
          setData({
            schoolDetails: null,
            roles: [],
            users: [],
            students: [],
            staff: [],
            classes: [],
            subjects: [],
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
            disciplinaryRecords: []
          });
          
          // Set RBAC data
          setRbac({
            permissions: [],
            roles: [],
            userRoles: []
          });
          
          // Set all loading states to false
          setLoading({
            all: false, schoolDetails: false, roles: false, users: false, students: false, staff: false, classes: false,
            subjects: false, subjectPapers: false, examSessions: false, examPaperSettings: false,
            gradingSchemes: false, studentExamResults: false, classSubjectAllocations: false,
            teacherSubjectAssignments: false, studentSubjectEnrollments: false, timetablePeriodDefs: false, timetableEntries: false,
            departments: false, designations: false, studentCategories: false, dormitories: false,
            academicYears: false, schoolPeriods: false, academicYearStructures: false, academicPeriodDefinitions: false,
            financialYears: false, classStreams: false, parentsGuardians: false, studentGuardianRelationships: false,
            partners: false, clubs: false, customers: false, studentHealthRecords: false, studentAttendance: false,
            templatesComm: false, campaigns: false,
            chartOfAccounts: false, banks: false, suppliers: false,
            feeTemplates: false, feeTemplateItems: false, expenseCategories: false, supplierInvoices: false,
            warehouses: false, itemCategoriesInv: false,
            itemsInv: false, fixedAssets: false, assetDepreciationLogs: false, requisitions: false, purchaseOrders: false,
            stockLevels: false, stockTransactions: false, payrollPeriods: false, payrollItemTypes: false,
            staffSalarySettings: false, payslips: false, bookCategories: false, books: false, loans: false, fines: false,
            customerInvoices: false, workflows: false, mealPlans: false, menus: false, merchants: false, auditLogs: false,
            expenseClaims: false, studentOpeningBalances: false, feeAdjustments: false, transportRoutes: false,
            studentTransportAssignments: false, studentInvoices: false, studentInvoiceItems: false, studentPayments: false,
            invoicePaymentApplications: false, studentMealPlans: false, mealConsumptionLogs: false,
            walletTransactions: false, studentWallets: false, generalPayments: false, generalLedgerEntries: false,
            rfqs: false, appSettings: false, studentClassHistory: false, healthIncidentReports: false, disciplinaryRecords: false,
            permissions: false, userRoles: false
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setInitializationError(err);
          setLoading(Object.keys(createInitialLoadingStates()).reduce((acc, key) => ({...acc, [key]: false}), {} as AppDataLoadingStates));
        }
      }
    };

    initializeDatabase();
    
    return () => { 
      isMounted = false; 
    };
  }, []);

  const triggerSeedRxDB = useCallback(async () => {
    try {
      const db = await databaseService.getDatabase();
      await databaseService.seedDatabaseWithMockData(db, mockDataForSeeding);
      setIsUsingRxDBDummyData(true);
      console.log('Database seeded with mock data successfully');
    } catch (error) {
      console.error('Failed to seed database:', error);
    }
  }, [mockDataForSeeding]);

  const triggerClearRxDB = useCallback(async () => {
    try {
      const db = await databaseService.getDatabase();
      await databaseService.clearDatabase(db);
      setIsUsingRxDBDummyData(false);
      console.log('Database cleared successfully');
    } catch (error) {
      console.error('Failed to clear database:', error);
    }
  }, []);
  
  const getStudentDetailsById = useCallback(async (studentId: string): Promise<allTypes.StudentDetailProfile | null> => {
    try {
      const db = await databaseService.getDatabase();
      const student = await db.students?.findById(studentId);
      if (!student) return null;
      
      // Get related data
      const guardianRelationships = await db.student_guardian_relationships?.find({ selector: { student_id: studentId } }) || [];
      const guardianIds = guardianRelationships.map(rel => rel.guardian_id);
      const guardians = guardianIds.length > 0 ? await db.parents_guardians?.find({ selector: { id: { $in: guardianIds } } }) || [] : [];
      
      return {
        ...student,
        guardians: guardians
      } as allTypes.StudentDetailProfile;
    } catch (error) {
      console.error('Error fetching student details:', error);
      return null;
    }
  }, []);

  const getStudentFinancialDetailsById = useCallback(async (studentId: string): Promise<any> => {
    try {
      const db = await databaseService.getDatabase();
      
      // Get student invoices, payments, and balances
      const invoices = await db.student_invoices?.find({ selector: { student_id: studentId } }) || [];
      const payments = await db.student_payments?.find({ selector: { student_id: studentId } }) || [];
      const openingBalances = await db.student_opening_balances?.find({ selector: { student_id: studentId } }) || [];
      const wallet = await db.student_wallets?.findOne({ selector: { student_id: studentId } });
      
      return {
        invoices,
        payments,
        openingBalances,
        wallet
      };
    } catch (error) {
      console.error('Error fetching student financial details:', error);
      return null;
    }
  }, []);

  // Return the complete AppDataContextType interface
  return {
    loading,
    rawInitialData: mockDataForSeeding,
    initializationError,
    isRxDBModeActive: true, // Keep this true for compatibility
    isUsingRxDBDummyData,
    triggerSeedRxDB,
    triggerClearRxDB,
    getStudentDetailsById,
    getStudentFinancialDetailsById,
    
    // Data properties
    ...data,
    
    // RBAC properties
    permissions: rbac.permissions,
    roles: rbac.roles.map((role, idx) => ({
      id: idx + 1,
      name: role.name,
      description: role.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    userRoles: rbac.userRoles,
    
    // CRUD operations implemented with PouchDB
    updateSchoolDetails: useCallback(async (schoolDetails: any) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.school_details?.update(schoolDetails.id, schoolDetails);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating school details:', error);
        throw error;
      }
    }, []),
    
    addUser: useCallback(async (userData: Omit<allTypes.User, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const userWithId = { ...userData, id: databaseService.generateId() };
        const result = await db.users?.insert(userWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding user:', error);
        throw error;
      }
    }, []),
    
    updateUser: useCallback(async (userId: string, userData: Partial<allTypes.User>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.users?.update(userId, userData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    }, []),
    
    deleteUser: useCallback(async (userId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.users?.remove(userId);
        return true;
      } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
      }
    }, []),
    addRole: useCallback(async (roleData: Omit<allTypes.Role, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const roleWithId = { ...roleData, id: databaseService.generateNumericId() };
        const result = await db.roles?.insert(roleWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding role:', error);
        throw error;
      }
    }, []),
    
    updateRole: useCallback(async (roleId: string, roleData: Partial<allTypes.Role>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.roles?.update(roleId, roleData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating role:', error);
        throw error;
      }
    }, []),
    
    deleteRole: useCallback(async (roleId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.roles?.remove(roleId);
        return true;
      } catch (error) {
        console.error('Error deleting role:', error);
        throw error;
      }
    }, []),
    
    addStudent: useCallback(async (studentData: Omit<allTypes.Student, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const studentWithId = { ...studentData, id: databaseService.generateId() };
        const result = await db.students?.insert(studentWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding student:', error);
        throw error;
      }
    }, []),
    
    updateStudent: useCallback(async (studentId: string, studentData: Partial<allTypes.Student>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.students?.update(studentId, studentData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating student:', error);
        throw error;
      }
    }, []),
    
    deleteStudent: useCallback(async (studentId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.students?.remove(studentId);
        return true;
      } catch (error) {
        console.error('Error deleting student:', error);
        throw error;
      }
    }, []),
    addStaffMember: useCallback(async (staffData: Omit<allTypes.StaffMember, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const staffWithId = { ...staffData, id: databaseService.generateId() };
        const result = await db.staff?.insert(staffWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding staff member:', error);
        throw error;
      }
    }, []),
    
    updateStaffMember: useCallback(async (staffId: string, staffData: Partial<allTypes.StaffMember>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.staff?.update(staffId, staffData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating staff member:', error);
        throw error;
      }
    }, []),
    
    deleteStaffMember: useCallback(async (staffId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.staff?.remove(staffId);
        return true;
      } catch (error) {
        console.error('Error deleting staff member:', error);
        throw error;
      }
    }, []),
    
    addParentGuardian: useCallback(async (guardianData: Omit<allTypes.ParentGuardian, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const guardianWithId = { ...guardianData, id: databaseService.generateId() };
        const result = await db.parents_guardians?.insert(guardianWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding parent/guardian:', error);
        throw error;
      }
    }, []),
    
    updateParentGuardian: useCallback(async (guardianId: string, guardianData: Partial<allTypes.ParentGuardian>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.parents_guardians?.update(guardianId, guardianData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating parent/guardian:', error);
        throw error;
      }
    }, []),
    
    deleteParentGuardian: useCallback(async (guardianId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.parents_guardians?.remove(guardianId);
        return true;
      } catch (error) {
        console.error('Error deleting parent/guardian:', error);
        throw error;
      }
    }, []),
    
    addStudentGuardianRelationship: useCallback(async (relationshipData: Omit<allTypes.StudentGuardianRelationship, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const relationshipWithId = { ...relationshipData, id: databaseService.generateId() };
        const result = await db.student_guardian_relationships?.insert(relationshipWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding student-guardian relationship:', error);
        throw error;
      }
    }, []),
    
    updateStudentGuardianRelationship: useCallback(async (relationshipId: string, relationshipData: Partial<allTypes.StudentGuardianRelationship>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.student_guardian_relationships?.update(relationshipId, relationshipData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating student-guardian relationship:', error);
        throw error;
      }
    }, []),
    
    deleteStudentGuardianRelationship: useCallback(async (relationshipId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.student_guardian_relationships?.remove(relationshipId);
        return true;
      } catch (error) {
        console.error('Error deleting student-guardian relationship:', error);
        throw error;
      }
    }, []),
    
    addDepartment: useCallback(async (departmentData: Omit<allTypes.Department, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const departmentWithId = { ...departmentData, id: databaseService.generateId() };
        const result = await db.departments?.insert(departmentWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding department:', error);
        throw error;
      }
    }, []),
    
    updateDepartment: useCallback(async (departmentId: string, departmentData: Partial<allTypes.Department>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.departments?.update(departmentId, departmentData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating department:', error);
        throw error;
      }
    }, []),
    
    deleteDepartment: useCallback(async (departmentId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.departments?.remove(departmentId);
        return true;
      } catch (error) {
        console.error('Error deleting department:', error);
        throw error;
      }
    }, []),
    addDesignation: useCallback(async (designationData: Omit<allTypes.Designation, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const designationWithId = { ...designationData, id: databaseService.generateId() };
        const result = await db.designations?.insert(designationWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding designation:', error);
        throw error;
      }
    }, []),
    
    updateDesignation: useCallback(async (designationId: string, designationData: Partial<allTypes.Designation>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.designations?.update(designationId, designationData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating designation:', error);
        throw error;
      }
    }, []),
    
    deleteDesignation: useCallback(async (designationId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.designations?.remove(designationId);
        return true;
      } catch (error) {
        console.error('Error deleting designation:', error);
        throw error;
      }
    }, []),
    
    addStudentCategory: useCallback(async (categoryData: Omit<allTypes.StudentCategory, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const categoryWithId = { ...categoryData, id: databaseService.generateId() };
        const result = await db.student_categories?.insert(categoryWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding student category:', error);
        throw error;
      }
    }, []),
    
    updateStudentCategory: useCallback(async (categoryId: string, categoryData: Partial<allTypes.StudentCategory>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.student_categories?.update(categoryId, categoryData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating student category:', error);
        throw error;
      }
    }, []),
    
    deleteStudentCategory: useCallback(async (categoryId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.student_categories?.remove(categoryId);
        return true;
      } catch (error) {
        console.error('Error deleting student category:', error);
        throw error;
      }
    }, []),
    
    addDormitory: useCallback(async (dormitoryData: Omit<allTypes.Dormitory, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const dormitoryWithId = { ...dormitoryData, id: databaseService.generateId() };
        const result = await db.dormitories?.insert(dormitoryWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding dormitory:', error);
        throw error;
      }
    }, []),
    
    updateDormitory: useCallback(async (dormitoryId: string, dormitoryData: Partial<allTypes.Dormitory>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.dormitories?.update(dormitoryId, dormitoryData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating dormitory:', error);
        throw error;
      }
    }, []),
    
    deleteDormitory: useCallback(async (dormitoryId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.dormitories?.remove(dormitoryId);
        return true;
      } catch (error) {
        console.error('Error deleting dormitory:', error);
        throw error;
      }
    }, []),
    addAcademicYearStructure: useCallback(async (data: Omit<allTypes.AcademicYearStructure, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const dataWithId = { ...data, id: databaseService.generateId() };
        const result = await db.academic_year_structures?.insert(dataWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding academic year structure:', error);
        throw error;
      }
    }, []),
    
    updateAcademicYearStructure: useCallback(async (id: string, data: Partial<allTypes.AcademicYearStructure>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.academic_year_structures?.update(id, data);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating academic year structure:', error);
        throw error;
      }
    }, []),
    
    deleteAcademicYearStructure: useCallback(async (id: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.academic_year_structures?.remove(id);
        return true;
      } catch (error) {
        console.error('Error deleting academic year structure:', error);
        throw error;
      }
    }, []),
    
    addAcademicPeriodDefinition: useCallback(async (data: Omit<allTypes.AcademicPeriodDefinition, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const dataWithId = { ...data, id: databaseService.generateId() };
        const result = await db.academic_period_definitions?.insert(dataWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding academic period definition:', error);
        throw error;
      }
    }, []),
    
    updateAcademicPeriodDefinition: useCallback(async (id: string, data: Partial<allTypes.AcademicPeriodDefinition>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.academic_period_definitions?.update(id, data);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating academic period definition:', error);
        throw error;
      }
    }, []),
    
    deleteAcademicPeriodDefinition: useCallback(async (id: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.academic_period_definitions?.remove(id);
        return true;
      } catch (error) {
        console.error('Error deleting academic period definition:', error);
        throw error;
      }
    }, []),
    
    addAcademicYear: useCallback(async (data: Omit<allTypes.AcademicYear, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const dataWithId = { ...data, id: databaseService.generateId() };
        const result = await db.academic_years?.insert(dataWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding academic year:', error);
        throw error;
      }
    }, []),
    
    updateAcademicYear: useCallback(async (id: string, data: Partial<allTypes.AcademicYear>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.academic_years?.update(id, data);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating academic year:', error);
        throw error;
      }
    }, []),
    
    deleteAcademicYear: useCallback(async (id: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.academic_years?.remove(id);
        return true;
      } catch (error) {
        console.error('Error deleting academic year:', error);
        throw error;
      }
    }, []),
    
    addSchoolPeriod: useCallback(async (data: Omit<allTypes.SchoolPeriod, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const dataWithId = { ...data, id: databaseService.generateId() };
        const result = await db.school_periods?.insert(dataWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding school period:', error);
        throw error;
      }
    }, []),
    
    updateSchoolPeriod: useCallback(async (id: string, data: Partial<allTypes.SchoolPeriod>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.school_periods?.update(id, data);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating school period:', error);
        throw error;
      }
    }, []),
    
    deleteSchoolPeriod: useCallback(async (id: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.school_periods?.remove(id);
        return true;
      } catch (error) {
        console.error('Error deleting school period:', error);
        throw error;
      }
    }, []),
    ...createCrudOperations('partners', 'Partner'),
    ...createCrudOperations('clubs', 'Club'),
    ...createCrudOperations('customers', 'Customer'),
    
    addStudentHealthRecord: useCallback(async (healthData: Omit<allTypes.StudentHealthRecord, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const healthWithId = { ...healthData, id: databaseService.generateId() };
        const result = await db.student_health_records?.insert(healthWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding student health record:', error);
        throw error;
      }
    }, []),
    
    updateStudentHealthRecord: useCallback(async (recordId: string, healthData: Partial<allTypes.StudentHealthRecord>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.student_health_records?.update(recordId, healthData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating student health record:', error);
        throw error;
      }
    }, []),
    
    saveStudentAttendance: useCallback(async (attendanceData: any) => {
      try {
        const db = await databaseService.getDatabase();
        const attendanceWithId = { ...attendanceData, id: databaseService.generateId() };
        const result = await db.student_attendance?.insert(attendanceWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error saving student attendance:', error);
        throw error;
      }
    }, []),
    
    getStudentAttendanceByFilters: useCallback(async (filters: any) => {
      try {
        const db = await databaseService.getDatabase();
        const results = await db.student_attendance?.find(filters);
        return results?.docs || [];
      } catch (error) {
        console.error('Error getting student attendance by filters:', error);
        throw error;
      }
    }, []),
    
    ...createCrudOperations('template_comms', 'TemplateComm'),
    ...createCrudOperations('campaigns', 'Campaign'),
    
    addAuditLog: useCallback(async (logData: Omit<allTypes.AuditLog, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const logWithId = { ...logData, id: databaseService.generateId() };
        const result = await db.audit_logs?.insert(logWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding audit log:', error);
        throw error;
      }
    }, []),
    addClass: useCallback(async (classData: Omit<allTypes.Class, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const classWithId = { ...classData, id: databaseService.generateId() };
        const result = await db.classes?.insert(classWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding class:', error);
        throw error;
      }
    }, []),
    
    updateClass: useCallback(async (classId: string, classData: Partial<allTypes.Class>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.classes?.update(classId, classData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating class:', error);
        throw error;
      }
    }, []),
    
    deleteClass: useCallback(async (classId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.classes?.remove(classId);
        return true;
      } catch (error) {
        console.error('Error deleting class:', error);
        throw error;
      }
    }, []),
    
    addClassStream: useCallback(async (streamData: Omit<allTypes.ClassStream, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const streamWithId = { ...streamData, id: databaseService.generateId() };
        const result = await db.class_streams?.insert(streamWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding class stream:', error);
        throw error;
      }
    }, []),
    
    updateClassStream: useCallback(async (streamId: string, streamData: Partial<allTypes.ClassStream>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.class_streams?.update(streamId, streamData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating class stream:', error);
        throw error;
      }
    }, []),
    
    deleteClassStream: useCallback(async (streamId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.class_streams?.remove(streamId);
        return true;
      } catch (error) {
        console.error('Error deleting class stream:', error);
        throw error;
      }
    }, []),
    
    addSubject: useCallback(async (subjectData: Omit<allTypes.Subject, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const subjectWithId = { ...subjectData, id: databaseService.generateId() };
        const result = await db.subjects?.insert(subjectWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding subject:', error);
        throw error;
      }
    }, []),
    
    updateSubject: useCallback(async (subjectId: string, subjectData: Partial<allTypes.Subject>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.subjects?.update(subjectId, subjectData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating subject:', error);
        throw error;
      }
    }, []),
    
    deleteSubject: useCallback(async (subjectId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.subjects?.remove(subjectId);
        return true;
      } catch (error) {
        console.error('Error deleting subject:', error);
        throw error;
      }
    }, []),
    addSubjectPaper: useCallback(async (paperData: Omit<allTypes.SubjectPaper, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const paperWithId = { ...paperData, id: databaseService.generateId() };
        const result = await db.subject_papers?.insert(paperWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding subject paper:', error);
        throw error;
      }
    }, []),
    
    updateSubjectPaper: useCallback(async (paperId: string, paperData: Partial<allTypes.SubjectPaper>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.subject_papers?.update(paperId, paperData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating subject paper:', error);
        throw error;
      }
    }, []),
    
    deleteSubjectPaper: useCallback(async (paperId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.subject_papers?.remove(paperId);
        return true;
      } catch (error) {
        console.error('Error deleting subject paper:', error);
        throw error;
      }
    }, []),
    
    addExamSession: useCallback(async (sessionData: Omit<allTypes.ExamSession, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const sessionWithId = { ...sessionData, id: databaseService.generateId() };
        const result = await db.exam_sessions?.insert(sessionWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding exam session:', error);
        throw error;
      }
    }, []),
    
    updateExamSession: useCallback(async (sessionId: string, sessionData: Partial<allTypes.ExamSession>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.exam_sessions?.update(sessionId, sessionData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating exam session:', error);
        throw error;
      }
    }, []),
    
    deleteExamSession: useCallback(async (sessionId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.exam_sessions?.remove(sessionId);
        return true;
      } catch (error) {
        console.error('Error deleting exam session:', error);
        throw error;
      }
    }, []),
    
    addExamPaperSetting: useCallback(async (settingData: Omit<allTypes.ExamPaperSetting, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const settingWithId = { ...settingData, id: databaseService.generateId() };
        const result = await db.exam_paper_settings?.insert(settingWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding exam paper setting:', error);
        throw error;
      }
    }, []),
    
    updateExamPaperSetting: useCallback(async (settingId: string, settingData: Partial<allTypes.ExamPaperSetting>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.exam_paper_settings?.update(settingId, settingData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating exam paper setting:', error);
        throw error;
      }
    }, []),
    
    deleteExamPaperSetting: useCallback(async (settingId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.exam_paper_settings?.remove(settingId);
        return true;
      } catch (error) {
        console.error('Error deleting exam paper setting:', error);
        throw error;
      }
    }, []),
    
    addGradingScheme: useCallback(async (schemeData: Omit<allTypes.GradingScheme, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const schemeWithId = { ...schemeData, id: databaseService.generateId() };
        const result = await db.grading_schemes?.insert(schemeWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding grading scheme:', error);
        throw error;
      }
    }, []),
    
    updateGradingScheme: useCallback(async (schemeId: string, schemeData: Partial<allTypes.GradingScheme>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.grading_schemes?.update(schemeId, schemeData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating grading scheme:', error);
        throw error;
      }
    }, []),
    
    deleteGradingScheme: useCallback(async (schemeId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.grading_schemes?.remove(schemeId);
        return true;
      } catch (error) {
        console.error('Error deleting grading scheme:', error);
        throw error;
      }
    }, []),
    getStudentsForExamEntry: useCallback(async (examSessionId: string, classId?: string) => {
      try {
        const db = await databaseService.getDatabase();
        let filters: any = { exam_session_id: examSessionId };
        if (classId) {
          filters.class_id = classId;
        }
        const results = await db.student_subject_enrollments?.find(filters);
        return results?.docs || [];
      } catch (error) {
        console.error('Error getting students for exam entry:', error);
        throw error;
      }
    }, []),
    
    getExamPaperSettingsForSession: useCallback(async (examSessionId: string) => {
      try {
        const db = await databaseService.getDatabase();
        const results = await db.exam_paper_settings?.find({ exam_session_id: examSessionId });
        return results?.docs || [];
      } catch (error) {
        console.error('Error getting exam paper settings for session:', error);
        throw error;
      }
    }, []),
    
    saveStudentExamResult: useCallback(async (resultData: any) => {
      try {
        const db = await databaseService.getDatabase();
        const resultWithId = { ...resultData, id: databaseService.generateId() };
        const result = await db.student_exam_results?.insert(resultWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error saving student exam result:', error);
        throw error;
      }
    }, []),
    
    getTimetablePeriodDefs: useCallback(() => {
      try {
        // This is a sync function that should return cached data
        // For now, return empty array as placeholder
        console.warn('getTimetablePeriodDefs: sync function not fully implemented');
        return [];
      } catch (error) {
        console.error('Error getting timetable period definitions:', error);
        return [];
      }
    }, []),
    addTimetablePeriodDef: useCallback(async (periodData: Omit<allTypes.TimetablePeriodDef, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const periodWithId = { ...periodData, id: databaseService.generateId() };
        const result = await db.timetable_period_defs?.insert(periodWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding timetable period definition:', error);
        throw error;
      }
    }, []),
    
    updateTimetablePeriodDef: useCallback(async (periodId: string, periodData: Partial<allTypes.TimetablePeriodDef>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.timetable_period_defs?.update(periodId, periodData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating timetable period definition:', error);
        throw error;
      }
    }, []),
    
    deleteTimetablePeriodDef: useCallback(async (periodId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.timetable_period_defs?.remove(periodId);
        return true;
      } catch (error) {
        console.error('Error deleting timetable period definition:', error);
        throw error;
      }
    }, []),
    
    addTimetableEntry: useCallback(async (entryData: Omit<allTypes.TimetableEntry, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const entryWithId = { ...entryData, id: databaseService.generateId() };
        const result = await db.timetable_entries?.insert(entryWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding timetable entry:', error);
        throw error;
      }
    }, []),
    
    updateTimetableEntry: useCallback(async (entryId: string, entryData: Partial<allTypes.TimetableEntry>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.timetable_entries?.update(entryId, entryData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating timetable entry:', error);
        throw error;
      }
    }, []),
    
    deleteTimetableEntry: useCallback(async (entryId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.timetable_entries?.remove(entryId);
        return true;
      } catch (error) {
        console.error('Error deleting timetable entry:', error);
        throw error;
      }
    }, []),
    
    addClassSubjectAllocation: useCallback(async (allocationData: Omit<allTypes.ClassSubjectAllocation, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const allocationWithId = { ...allocationData, id: databaseService.generateId() };
        const result = await db.class_subject_allocations?.insert(allocationWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding class subject allocation:', error);
        throw error;
      }
    }, []),
    
    updateClassSubjectAllocation: useCallback(async (allocationId: string, allocationData: Partial<allTypes.ClassSubjectAllocation>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.class_subject_allocations?.update(allocationId, allocationData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating class subject allocation:', error);
        throw error;
      }
    }, []),
    
    deleteClassSubjectAllocation: useCallback(async (allocationId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.class_subject_allocations?.remove(allocationId);
        return true;
      } catch (error) {
        console.error('Error deleting class subject allocation:', error);
        throw error;
      }
    }, []),
    
    addTeacherSubjectAssignment: useCallback(async (assignmentData: Omit<allTypes.TeacherSubjectAssignment, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const assignmentWithId = { ...assignmentData, id: databaseService.generateId() };
        const result = await db.teacher_subject_assignments?.insert(assignmentWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding teacher subject assignment:', error);
        throw error;
      }
    }, []),
    
    updateTeacherSubjectAssignment: useCallback(async (assignmentId: string, assignmentData: Partial<allTypes.TeacherSubjectAssignment>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.teacher_subject_assignments?.update(assignmentId, assignmentData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating teacher subject assignment:', error);
        throw error;
      }
    }, []),
    
    deleteTeacherSubjectAssignment: useCallback(async (assignmentId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.teacher_subject_assignments?.remove(assignmentId);
        return true;
      } catch (error) {
        console.error('Error deleting teacher subject assignment:', error);
        throw error;
      }
    }, []),
    
    addStudentSubjectEnrollment: useCallback(async (enrollmentData: Omit<allTypes.StudentSubjectEnrollment, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const enrollmentWithId = { ...enrollmentData, id: databaseService.generateId() };
        const result = await db.student_subject_enrollments?.insert(enrollmentWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding student subject enrollment:', error);
        throw error;
      }
    }, []),
    
    updateStudentSubjectEnrollment: useCallback(async (enrollmentId: string, enrollmentData: Partial<allTypes.StudentSubjectEnrollment>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.student_subject_enrollments?.update(enrollmentId, enrollmentData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating student subject enrollment:', error);
        throw error;
      }
    }, []),
    
    deleteStudentSubjectEnrollment: useCallback(async (enrollmentId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.student_subject_enrollments?.remove(enrollmentId);
        return true;
      } catch (error) {
        console.error('Error deleting student subject enrollment:', error);
        throw error;
      }
    }, []),
    addChartOfAccount: useCallback(async (accountData: Omit<allTypes.ChartOfAccount, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const accountWithId = { ...accountData, id: databaseService.generateId() };
        const result = await db.chart_of_accounts?.insert(accountWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding chart of account:', error);
        throw error;
      }
    }, []),
    
    updateChartOfAccount: useCallback(async (accountId: string, accountData: Partial<allTypes.ChartOfAccount>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.chart_of_accounts?.update(accountId, accountData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating chart of account:', error);
        throw error;
      }
    }, []),
    
    deleteChartOfAccount: useCallback(async (accountId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.chart_of_accounts?.remove(accountId);
        return true;
      } catch (error) {
        console.error('Error deleting chart of account:', error);
        throw error;
      }
    }, []),
    
    addBank: useCallback(async (bankData: Omit<allTypes.Bank, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const bankWithId = { ...bankData, id: databaseService.generateId() };
        const result = await db.banks?.insert(bankWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding bank:', error);
        throw error;
      }
    }, []),
    
    updateBank: useCallback(async (bankId: string, bankData: Partial<allTypes.Bank>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.banks?.update(bankId, bankData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating bank:', error);
        throw error;
      }
    }, []),
    
    deleteBank: useCallback(async (bankId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.banks?.remove(bankId);
        return true;
      } catch (error) {
        console.error('Error deleting bank:', error);
        throw error;
      }
    }, []),
    
    addSupplier: useCallback(async (supplierData: Omit<allTypes.Supplier, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const supplierWithId = { ...supplierData, id: databaseService.generateId() };
        const result = await db.suppliers?.insert(supplierWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding supplier:', error);
        throw error;
      }
    }, []),
    
    updateSupplier: useCallback(async (supplierId: string, supplierData: Partial<allTypes.Supplier>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.suppliers?.update(supplierId, supplierData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating supplier:', error);
        throw error;
      }
    }, []),
    
    deleteSupplier: useCallback(async (supplierId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.suppliers?.remove(supplierId);
        return true;
      } catch (error) {
        console.error('Error deleting supplier:', error);
        throw error;
      }
    }, []),
    
    addFeeTemplate: useCallback(async (templateData: Omit<allTypes.FeeTemplate, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const templateWithId = { ...templateData, id: databaseService.generateId() };
        const result = await db.fee_templates?.insert(templateWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding fee template:', error);
        throw error;
      }
    }, []),
    
    updateFeeTemplate: useCallback(async (templateId: string, templateData: Partial<allTypes.FeeTemplate>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.fee_templates?.update(templateId, templateData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating fee template:', error);
        throw error;
      }
    }, []),
    
    deleteFeeTemplate: useCallback(async (templateId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.fee_templates?.remove(templateId);
        return true;
      } catch (error) {
        console.error('Error deleting fee template:', error);
        throw error;
      }
    }, []),
    
    addExpenseClaim: useCallback(async (claimData: Omit<allTypes.ExpenseClaim, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const claimWithId = { ...claimData, id: databaseService.generateId() };
        const result = await db.expense_claims?.insert(claimWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding expense claim:', error);
        throw error;
      }
    }, []),
    
    updateExpenseClaim: useCallback(async (claimId: string, claimData: Partial<allTypes.ExpenseClaim>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.expense_claims?.update(claimId, claimData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating expense claim:', error);
        throw error;
      }
    }, []),
    
    deleteExpenseClaim: useCallback(async (claimId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.expense_claims?.remove(claimId);
        return true;
      } catch (error) {
        console.error('Error deleting expense claim:', error);
        throw error;
      }
    }, []),
    
    addExpenseCategory: useCallback(async (categoryData: Omit<allTypes.ExpenseCategory, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const categoryWithId = { ...categoryData, id: databaseService.generateId() };
        const result = await db.expense_categories?.insert(categoryWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding expense category:', error);
        throw error;
      }
    }, []),
    
    updateExpenseCategory: useCallback(async (categoryId: string, categoryData: Partial<allTypes.ExpenseCategory>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.expense_categories?.update(categoryId, categoryData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating expense category:', error);
        throw error;
      }
    }, []),
    
    deleteExpenseCategory: useCallback(async (categoryId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.expense_categories?.remove(categoryId);
        return true;
      } catch (error) {
        console.error('Error deleting expense category:', error);
        throw error;
      }
    }, []),
    addCustomerInvoice: useCallback(async (invoiceData: Omit<allTypes.CustomerInvoice, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const invoiceWithId = { ...invoiceData, id: databaseService.generateId() };
        const result = await db.customer_invoices?.insert(invoiceWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding customer invoice:', error);
        throw error;
      }
    }, []),
    
    updateCustomerInvoice: useCallback(async (invoiceId: string, invoiceData: Partial<allTypes.CustomerInvoice>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.customer_invoices?.update(invoiceId, invoiceData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating customer invoice:', error);
        throw error;
      }
    }, []),
    
    deleteCustomerInvoice: useCallback(async (invoiceId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.customer_invoices?.remove(invoiceId);
        return true;
      } catch (error) {
        console.error('Error deleting customer invoice:', error);
        throw error;
      }
    }, []),
    
    addSupplierInvoice: useCallback(async (invoiceData: Omit<allTypes.SupplierInvoice, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const invoiceWithId = { ...invoiceData, id: databaseService.generateId() };
        const result = await db.supplier_invoices?.insert(invoiceWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding supplier invoice:', error);
        throw error;
      }
    }, []),
    
    updateSupplierInvoice: useCallback(async (invoiceId: string, invoiceData: Partial<allTypes.SupplierInvoice>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.supplier_invoices?.update(invoiceId, invoiceData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating supplier invoice:', error);
        throw error;
      }
    }, []),
    
    deleteSupplierInvoice: useCallback(async (invoiceId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.supplier_invoices?.remove(invoiceId);
        return true;
      } catch (error) {
        console.error('Error deleting supplier invoice:', error);
        throw error;
      }
    }, []),
    
    addStudentOpeningBalance: useCallback(async (balanceData: Omit<allTypes.StudentOpeningBalance, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const balanceWithId = { ...balanceData, id: databaseService.generateId() };
        const result = await db.student_opening_balances?.insert(balanceWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding student opening balance:', error);
        throw error;
      }
    }, []),
    
    updateStudentOpeningBalance: useCallback(async (balanceId: string, balanceData: Partial<allTypes.StudentOpeningBalance>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.student_opening_balances?.update(balanceId, balanceData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating student opening balance:', error);
        throw error;
      }
    }, []),
    
    deleteStudentOpeningBalance: useCallback(async (balanceId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.student_opening_balances?.remove(balanceId);
        return true;
      } catch (error) {
        console.error('Error deleting student opening balance:', error);
        throw error;
      }
    }, []),
    
    addFeeAdjustment: useCallback(async (adjustmentData: Omit<allTypes.FeeAdjustment, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const adjustmentWithId = { ...adjustmentData, id: databaseService.generateId() };
        const result = await db.fee_adjustments?.insert(adjustmentWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding fee adjustment:', error);
        throw error;
      }
    }, []),
    
    updateFeeAdjustment: useCallback(async (adjustmentId: string, adjustmentData: Partial<allTypes.FeeAdjustment>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.fee_adjustments?.update(adjustmentId, adjustmentData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating fee adjustment:', error);
        throw error;
      }
    }, []),
    
    deleteFeeAdjustment: useCallback(async (adjustmentId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.fee_adjustments?.remove(adjustmentId);
        return true;
      } catch (error) {
        console.error('Error deleting fee adjustment:', error);
        throw error;
      }
    }, []),
    
    addTransportRoute: useCallback(async (routeData: Omit<allTypes.TransportRoute, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const routeWithId = { ...routeData, id: databaseService.generateId() };
        const result = await db.transport_routes?.insert(routeWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding transport route:', error);
        throw error;
      }
    }, []),
    
    updateTransportRoute: useCallback(async (routeId: string, routeData: Partial<allTypes.TransportRoute>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.transport_routes?.update(routeId, routeData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating transport route:', error);
        throw error;
      }
    }, []),
    
    deleteTransportRoute: useCallback(async (routeId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.transport_routes?.remove(routeId);
        return true;
      } catch (error) {
        console.error('Error deleting transport route:', error);
        throw error;
      }
    }, []),
    
    addStudentTransportAssignment: useCallback(async (assignmentData: Omit<allTypes.StudentTransportAssignment, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const assignmentWithId = { ...assignmentData, id: databaseService.generateId() };
        const result = await db.student_transport_assignments?.insert(assignmentWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding student transport assignment:', error);
        throw error;
      }
    }, []),
    
    updateStudentTransportAssignment: useCallback(async (assignmentId: string, assignmentData: Partial<allTypes.StudentTransportAssignment>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.student_transport_assignments?.update(assignmentId, assignmentData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating student transport assignment:', error);
        throw error;
      }
    }, []),
    
    deleteStudentTransportAssignment: useCallback(async (assignmentId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.student_transport_assignments?.remove(assignmentId);
        return true;
      } catch (error) {
        console.error('Error deleting student transport assignment:', error);
        throw error;
      }
    }, []),
    
    generateStudentInvoices: useCallback(async (invoiceData: any) => {
      try {
        const db = await databaseService.getDatabase();
        // This would typically involve complex business logic for generating multiple invoices
        // For now, we'll implement a basic version that creates a single invoice
        const invoiceWithId = { ...invoiceData, id: databaseService.generateId() };
        const result = await db.customer_invoices?.insert(invoiceWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error generating student invoices:', error);
        throw error;
      }
    }, []),
    
    addStudentPayment: useCallback(async (paymentData: Omit<allTypes.StudentPayment, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const paymentWithId = { ...paymentData, id: databaseService.generateId() };
        const result = await db.student_payments?.insert(paymentWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding student payment:', error);
        throw error;
      }
    }, []),
    
    updateStudentPayment: useCallback(async (paymentId: string, paymentData: Partial<allTypes.StudentPayment>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.student_payments?.update(paymentId, paymentData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating student payment:', error);
        throw error;
      }
    }, []),
    
    deleteStudentPayment: useCallback(async (paymentId: string) => {
      try {
        const db = await databaseService.getDatabase();
        await db.student_payments?.remove(paymentId);
        return true;
      } catch (error) {
        console.error('Error deleting student payment:', error);
        throw error;
      }
    }, []),
    applyPaymentToInvoices: useCallback(async (paymentId: string, invoiceIds: string[]) => {
      try {
        const db = await databaseService.getDatabase();
        // This would involve complex business logic for applying payments to multiple invoices
        // For now, we'll implement a basic version that updates payment status
        const result = await db.student_payments?.update(paymentId, { applied_to_invoices: invoiceIds });
        return result?.doc || null;
      } catch (error) {
        console.error('Error applying payment to invoices:', error);
        throw error;
      }
    }, []),
    
    ...createCrudOperations('general_payments', 'GeneralPayment'),
    ...createCrudOperations('financial_years', 'FinancialYear'),
    ...createCrudOperations('payroll_periods', 'PayrollPeriod'),
    ...createCrudOperations('payroll_item_types', 'PayrollItemType'),
    
    updateStaffSalarySetting: useCallback(async (staffId: string, salaryData: any) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.staff_members?.update(staffId, { salary_settings: salaryData });
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating staff salary setting:', error);
        throw error;
      }
    }, []),
    
    generatePayslipsForPeriod: useCallback(async (periodId: string) => {
      try {
        const db = await databaseService.getDatabase();
        // This would involve complex business logic for generating payslips
        // For now, we'll implement a basic version
        const payslipData = { period_id: periodId, id: databaseService.generateId(), generated_at: new Date().toISOString() };
        const result = await db.payroll_periods?.update(periodId, { payslips_generated: true });
        return result?.doc || null;
      } catch (error) {
        console.error('Error generating payslips for period:', error);
        throw error;
      }
    }, []),
    ...createCrudOperations('warehouses', 'Warehouse'),
    ...createCrudOperations('item_categories_inv', 'ItemCategoryInv'),
    ...createCrudOperations('items_inv', 'ItemInv'),
    ...createCrudOperations('fixed_assets', 'FixedAsset'),
    
    addAssetDepreciationLog: useCallback(async (logData: Omit<allTypes.AssetDepreciationLog, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const logWithId = { ...logData, id: databaseService.generateId() };
        const result = await db.asset_depreciation_logs?.insert(logWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding asset depreciation log:', error);
        throw error;
      }
    }, []),
    
    ...createCrudOperations('requisitions', 'Requisition'),
    
    updateRequisitionStatus: useCallback(async (requisitionId: string, status: string) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.requisitions?.update(requisitionId, { status });
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating requisition status:', error);
        throw error;
      }
    }, []),
    
    ...createCrudOperations('purchase_orders', 'PurchaseOrder'),
    
    addStockTransaction: useCallback(async (transactionData: Omit<allTypes.StockTransaction, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const transactionWithId = { ...transactionData, id: databaseService.generateId() };
        const result = await db.stock_transactions?.insert(transactionWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding stock transaction:', error);
        throw error;
      }
    }, []),
    
    ...createCrudOperations('rfqs', 'Rfq'),
    ...createCrudOperations('book_categories', 'BookCategory'),
    ...createCrudOperations('books', 'Book'),
    
    addLoan: useCallback(async (loanData: Omit<allTypes.Loan, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const loanWithId = { ...loanData, id: databaseService.generateId() };
        const result = await db.loans?.insert(loanWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding loan:', error);
        throw error;
      }
    }, []),
    
    updateLoan: useCallback(async (loanId: string, loanData: Partial<allTypes.Loan>) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.loans?.update(loanId, loanData);
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating loan:', error);
        throw error;
      }
    }, []),
    
    addFine: useCallback(async (fineData: Omit<allTypes.Fine, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const fineWithId = { ...fineData, id: databaseService.generateId() };
        const result = await db.fines?.insert(fineWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding fine:', error);
        throw error;
      }
    }, []),
    
    updateFineStatus: useCallback(async (fineId: string, status: string) => {
      try {
        const db = await databaseService.getDatabase();
        const result = await db.fines?.update(fineId, { status });
        return result?.doc || null;
      } catch (error) {
        console.error('Error updating fine status:', error);
        throw error;
      }
    }, []),
    
    ...createCrudOperations('meal_plans', 'MealPlan'),
    ...createCrudOperations('menus', 'Menu'),
    ...createCrudOperations('student_meal_plans', 'StudentMealPlan'),
    
    addMealConsumptionLog: useCallback(async (logData: Omit<allTypes.MealConsumptionLog, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const logWithId = { ...logData, id: databaseService.generateId() };
        const result = await db.meal_consumption_logs?.insert(logWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding meal consumption log:', error);
        throw error;
      }
    }, []),
    
    ...createCrudOperations('merchants', 'Merchant'),
    
    addWalletTransaction: useCallback(async (transactionData: Omit<allTypes.WalletTransaction, 'id'>) => {
      try {
        const db = await databaseService.getDatabase();
        const transactionWithId = { ...transactionData, id: databaseService.generateId() };
        const result = await db.wallet_transactions?.insert(transactionWithId);
        return result?.doc || null;
      } catch (error) {
        console.error('Error adding wallet transaction:', error);
        throw error;
      }
    }, []),
    
    ...createCrudOperations('workflows', 'Workflow'),
    ...createCrudOperations('workflow_states', 'WorkflowState')
  };
};