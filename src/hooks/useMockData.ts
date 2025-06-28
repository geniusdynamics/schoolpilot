// ABOUTME: This hook provides a complete in-memory mock data layer for the application.
// ABOUTME: It's used in "demo" mode and for seeding RxDB in "production" mode.

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as allTypes from '../types'; 
import { AppDataContextType, RawInitialData, AppDataLoadingStates } from '../types';

import { MOCK_API_DELAY } from '../constants';

// Simulating a delay for API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ID Generation
export const generateId = (): string => crypto.randomUUID(); 
let numericIdCounter = Date.now();
export const generateNumericId = (): number => ++numericIdCounter; 

// Placeholder for unimplemented functions
const unimplementedAsync = async (..._args: any[]): Promise<any | null> => { console.warn("Mock function not implemented yet."); return null; };
const unimplementedSync = (..._args: any[]): any[] => { console.warn("Mock getter not implemented yet."); return []; };


// Helper to create loading states for all entities
const createLoadingStates = (): AppDataLoadingStates => ({
  all: true, schoolDetails: true, roles: true, users: true, students: true, staff: true, classes: true,
  subjects: true, departments: true, designations: true, studentCategories: true, dormitories: true,
  academicYears: true, schoolPeriods: true, academicYearStructures: true, academicPeriodDefinitions: true,
  financialYears: true, classStreams: true, parentsGuardians: true, studentGuardianRelationships: true,
  partners: true, clubs: true, customers: true, studentHealthRecords: true, studentAttendance: true,
  timetablePeriodDefs: true, templatesComm: true, campaigns: true, subjectPapers: true, examSessions: true,
  examPaperSettings: true, gradingSchemes: true, chartOfAccounts: true, banks: true, suppliers: true,
  feeTemplates: true, feeTemplateItems: true, expenseCategories: true, supplierInvoices: true,
  studentExamResults: true, classSubjectAllocations: true, teacherSubjectAssignments: true,
  studentSubjectEnrollments: true, timetableEntries: true, warehouses: true, itemCategoriesInv: true,
  itemsInv: true, fixedAssets: true, assetDepreciationLogs: true, requisitions: true, purchaseOrders: true,
  stockLevels: true, stockTransactions: true, payrollPeriods: true, payrollItemTypes: true,
  staffSalarySettings: true, payslips: true, bookCategories: true, books: true, loans: true, fines: true,
  customerInvoices: true, workflows: true, mealPlans: true, menus: true, merchants: true, auditLogs: true,
  expenseClaims: true, studentOpeningBalances: true, feeAdjustments: true, transportRoutes: true,
  studentTransportAssignments: true, studentInvoices: true, studentInvoiceItems: true, studentPayments: true,
  invoicePaymentApplications: true, studentMealPlans: true, mealConsumptionLogs: true,
  walletTransactions: true, studentWallets: true, generalPayments: true, generalLedgerEntries: true,
  rfqs: true, appSettings: true, studentClassHistory: true, healthIncidentReports: true, disciplinaryRecords: true,
});

export let rawInitialData: RawInitialData; // Will be populated dynamically

export const useMockData = (): AppDataContextType => {
  const [data, setData] = useState<Omit<AppDataContextType, 'loading' | 'rawInitialData' | 'initializationError' | 'isRxDBModeActive' | 'isUsingRxDBDummyData' | 'triggerSeedRxDB' | 'triggerClearRxDB' | 'getStudentDetailsById' | 'getStudentFinancialDetailsById' | 'updateSchoolDetails'| 'addUser' | 'updateUser'| 'deleteUser' | 'addRole'| 'updateRole'|'deleteRole'|'addStudent'|'updateStudent'|'deleteStudent'|'addStaffMember'|'updateStaffMember'|'deleteStaffMember'|'addParentGuardian'|'updateParentGuardian'|'deleteParentGuardian'|'addStudentGuardianRelationship'|'updateStudentGuardianRelationship'|'deleteStudentGuardianRelationship'|'addDepartment'|'updateDepartment'|'deleteDepartment'|'addDesignation'|'updateDesignation'|'deleteDesignation'|'addStudentCategory'|'updateStudentCategory'|'deleteStudentCategory'|'addDormitory'|'updateDormitory'|'deleteDormitory'|'addAcademicYearStructure'|'updateAcademicYearStructure'|'deleteAcademicYearStructure'|'addAcademicPeriodDefinition'|'updateAcademicPeriodDefinition'|'deleteAcademicPeriodDefinition'|'addAcademicYear'|'updateAcademicYear'|'deleteAcademicYear'|'addSchoolPeriod'|'updateSchoolPeriod'|'deleteSchoolPeriod'|'addPartner'|'updatePartner'|'deletePartner'|'addClub'|'updateClub'|'deleteClub'|'addCustomer'|'updateCustomer'|'deleteCustomer'|'addStudentHealthRecord'|'updateStudentHealthRecord'|'saveStudentAttendance'|'getStudentAttendanceByFilters'|'addTemplateComm'|'updateTemplateComm'|'deleteTemplateComm'|'addCampaign'|'updateCampaign'|'deleteCampaign'|'addAuditLog'|'addClass'|'updateClass'|'deleteClass'|'addClassStream'|'updateClassStream'|'deleteClassStream'|'addSubject'|'updateSubject'|'deleteSubject'|'addSubjectPaper'|'updateSubjectPaper'|'deleteSubjectPaper'|'addExamSession'|'updateExamSession'|'deleteExamSession'|'addExamPaperSetting'|'updateExamPaperSetting'|'deleteExamPaperSetting'|'addGradingScheme'|'updateGradingScheme'|'deleteGradingScheme'|'getStudentsForExamEntry'|'getExamPaperSettingsForSession'|'saveStudentExamResult'|'getTimetablePeriodDefs'|'addTimetablePeriodDef'|'updateTimetablePeriodDef'|'deleteTimetablePeriodDef'|'getTimetableEntries'|'addTimetableEntry'|'updateTimetableEntry'|'deleteTimetableEntry'|'addClassSubjectAllocation'|'updateClassSubjectAllocation'|'deleteClassSubjectAllocation'|'addTeacherSubjectAssignment'|'deleteTeacherSubjectAssignment'|'addStudentSubjectEnrollment'|'updateStudentSubjectEnrollment'|'deleteStudentSubjectEnrollment'|'addChartOfAccount'|'updateChartOfAccount'|'deleteChartOfAccount'|'addBank'|'updateBank'|'deleteBank'|'addSupplier'|'updateSupplier'|'deleteSupplier'|'addFeeTemplate'|'updateFeeTemplate'|'deleteFeeTemplate'|'addExpenseClaim'|'updateExpenseClaim'|'deleteExpenseClaim'|'addExpenseCategory'|'updateExpenseCategory'|'deleteExpenseCategory'|'addCustomerInvoice'|'updateCustomerInvoice'|'deleteCustomerInvoice'|'addSupplierInvoice'|'updateSupplierInvoice'|'deleteSupplierInvoice'|'addStudentOpeningBalance'|'updateStudentOpeningBalance'|'deleteStudentOpeningBalance'|'addFeeAdjustment'|'updateFeeAdjustment'|'deleteFeeAdjustment'|'addTransportRoute'|'updateTransportRoute'|'deleteTransportRoute'|'addStudentTransportAssignment'|'updateStudentTransportAssignment'|'deleteStudentTransportAssignment'|'generateStudentInvoices'|'addStudentPayment'|'updateStudentPayment'|'deleteStudentPayment'|'applyPaymentToInvoices'|'addGeneralPayment'|'updateGeneralPayment'|'deleteGeneralPayment'|'addFinancialYear'|'updateFinancialYear'|'deleteFinancialYear'|'addPayrollPeriod'|'updatePayrollPeriod'|'deletePayrollPeriod'|'addPayrollItemType'|'updatePayrollItemType'|'deletePayrollItemType'|'updateStaffSalarySetting'|'generatePayslipsForPeriod'|'addWarehouse'|'updateWarehouse'|'deleteWarehouse'|'addItemCategoryInv'|'updateItemCategoryInv'|'deleteItemCategoryInv'|'addItemInv'|'updateItemInv'|'deleteItemInv'|'addFixedAsset'|'updateFixedAsset'|'deleteFixedAsset'|'addAssetDepreciationLog'|'addRequisition'|'updateRequisition'|'deleteRequisition'|'updateRequisitionStatus'|'addPurchaseOrder'|'updatePurchaseOrder'|'deletePurchaseOrder'|'addStockTransaction'|'addRfq'|'updateRfq'|'deleteRfq'|'addBookCategory'|'updateBookCategory'|'deleteBookCategory'|'addBook'|'updateBook'|'deleteBook'|'addLoan'|'updateLoan'|'addFine'|'updateFineStatus'|'addMealPlan'|'updateMealPlan'|'deleteMealPlan'|'addMenu'|'updateMenu'|'deleteMenu'|'addStudentMealPlan'|'updateStudentMealPlan'|'deleteStudentMealPlan'|'addMealConsumptionLog'|'addMerchant'|'updateMerchant'|'deleteMerchant'|'addWalletTransaction'|'addWorkflow'|'updateWorkflow'|'deleteWorkflow'|'addWorkflowState'|'updateWorkflowState'|'deleteWorkflowState'>>({} as any);
  const [loading, setLoading] = useState<AppDataLoadingStates>(createLoadingStates());
  const [aggregatedRawData, setAggregatedRawData] = useState<RawInitialData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      console.log("useMockData: Starting to load mock data (modular)...");
      setLoading(createLoadingStates());
      
      const mockModules = import.meta.glob('/src/modules/**/data/mockData.ts', { eager: true });
      let combinedRawData: Partial<RawInitialData> = {};

      for (const path in mockModules) {
        const moduleExports = mockModules[path] as Record<string, any[]>;
        if (moduleExports) {
          combinedRawData = { ...combinedRawData, ...moduleExports };
        }
      }

      await delay(MOCK_API_DELAY);

      if (isMounted) {
        rawInitialData = combinedRawData as RawInitialData;
        setAggregatedRawData(rawInitialData);

        setData(prev => ({
          ...prev,
          ...Object.keys(rawInitialData).reduce((acc, key) => {
              const stateKey = key.replace('initialMock', '').charAt(0).toLowerCase() + key.slice('initialMock'.length + 1);
              acc[stateKey as keyof typeof acc] = (rawInitialData as any)[key] || (key.endsWith('s') ? [] : null);
              return acc;
          }, {} as any)
        }));

        setLoading(Object.keys(createLoadingStates()).reduce((acc, key) => ({...acc, [key]: false}), {} as AppDataLoadingStates));
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  const contextValue: AppDataContextType = useMemo(() => ({
    ...(data as any),
    loading,
    rawInitialData: aggregatedRawData!,
    initializationError: null,
    isRxDBModeActive: false,
    isUsingRxDBDummyData: null,
    triggerClearRxDB: async () => console.warn("Not in RxDB mode"),
    triggerSeedRxDB: async () => console.warn("Not in RxDB mode"),
    
    updateSchoolDetails: unimplementedAsync as any, addUser: unimplementedAsync as any, updateUser: unimplementedAsync as any,
    deleteUser: unimplementedAsync as any, addRole: unimplementedAsync as any, updateRole: unimplementedAsync as any,
    deleteRole: unimplementedAsync as any, addStudent: unimplementedAsync as any, updateStudent: unimplementedAsync as any,
    deleteStudent: unimplementedAsync as any, addStaffMember: unimplementedAsync as any, updateStaffMember: unimplementedAsync as any,
    deleteStaffMember: unimplementedAsync as any, getStudentDetailsById: unimplementedAsync as any,
    getStudentFinancialDetailsById: unimplementedAsync as any, addParentGuardian: unimplementedAsync as any,
    updateParentGuardian: unimplementedAsync as any, deleteParentGuardian: unimplementedAsync as any,
    addStudentGuardianRelationship: unimplementedAsync as any, updateStudentGuardianRelationship: unimplementedAsync as any,
    deleteStudentGuardianRelationship: unimplementedAsync as any, addDepartment: unimplementedAsync as any,
    updateDepartment: unimplementedAsync as any, deleteDepartment: unimplementedAsync as any, addDesignation: unimplementedAsync as any,
    updateDesignation: unimplementedAsync as any, deleteDesignation: unimplementedAsync as any, addStudentCategory: unimplementedAsync as any,
    updateStudentCategory: unimplementedAsync as any, deleteStudentCategory: unimplementedAsync as any,
    addDormitory: unimplementedAsync as any, updateDormitory: unimplementedAsync as any, deleteDormitory: unimplementedAsync as any,
    addAcademicYearStructure: unimplementedAsync as any, updateAcademicYearStructure: unimplementedAsync as any,
    deleteAcademicYearStructure: unimplementedAsync as any, addAcademicPeriodDefinition: unimplementedAsync as any,
    updateAcademicPeriodDefinition: unimplementedAsync as any, deleteAcademicPeriodDefinition: unimplementedAsync as any,
    addAcademicYear: unimplementedAsync as any, updateAcademicYear: unimplementedAsync as any, deleteAcademicYear: unimplementedAsync as any,
    addSchoolPeriod: unimplementedAsync as any, updateSchoolPeriod: unimplementedAsync as any, deleteSchoolPeriod: unimplementedAsync as any,
    addPartner: unimplementedAsync as any, updatePartner: unimplementedAsync as any, deletePartner: unimplementedAsync as any,
    addClub: unimplementedAsync as any, updateClub: unimplementedAsync as any, deleteClub: unimplementedAsync as any,
    addCustomer: unimplementedAsync as any, updateCustomer: unimplementedAsync as any, deleteCustomer: unimplementedAsync as any,
    addStudentHealthRecord: unimplementedAsync as any, updateStudentHealthRecord: unimplementedAsync as any,
    saveStudentAttendance: unimplementedAsync as any, getStudentAttendanceByFilters: unimplementedSync as any,
    addTemplateComm: unimplementedAsync as any, updateTemplateComm: unimplementedAsync as any, deleteTemplateComm: unimplementedAsync as any,
    addCampaign: unimplementedAsync as any, updateCampaign: unimplementedAsync as any, deleteCampaign: unimplementedAsync as any,
    addAuditLog: unimplementedAsync as any, addClass: unimplementedAsync as any, updateClass: unimplementedAsync as any,
    deleteClass: unimplementedAsync as any, addClassStream: unimplementedAsync as any, updateClassStream: unimplementedAsync as any,
    deleteClassStream: unimplementedAsync as any, addSubject: unimplementedAsync as any, updateSubject: unimplementedAsync as any,
    deleteSubject: unimplementedAsync as any, addSubjectPaper: unimplementedAsync as any, updateSubjectPaper: unimplementedAsync as any,
    deleteSubjectPaper: unimplementedAsync as any, addExamSession: unimplementedAsync as any, updateExamSession: unimplementedAsync as any,
    deleteExamSession: unimplementedAsync as any, addExamPaperSetting: unimplementedAsync as any,
    updateExamPaperSetting: unimplementedAsync as any, deleteExamPaperSetting: unimplementedAsync as any,
    addGradingScheme: unimplementedAsync as any, updateGradingScheme: unimplementedAsync as any, deleteGradingScheme: unimplementedAsync as any,
    getStudentsForExamEntry: unimplementedSync as any, getExamPaperSettingsForSession: unimplementedSync as any,
    saveStudentExamResult: unimplementedAsync as any, getTimetablePeriodDefs: unimplementedSync as any,
    addTimetablePeriodDef: unimplementedAsync as any, updateTimetablePeriodDef: unimplementedAsync as any,
    deleteTimetablePeriodDef: unimplementedAsync as any, getTimetableEntries: unimplementedSync as any,
    addTimetableEntry: unimplementedAsync as any, updateTimetableEntry: unimplementedAsync as any, deleteTimetableEntry: unimplementedAsync as any,
    addClassSubjectAllocation: unimplementedAsync as any, updateClassSubjectAllocation: unimplementedAsync as any,
    deleteClassSubjectAllocation: unimplementedAsync as any, addTeacherSubjectAssignment: unimplementedAsync as any,
    deleteTeacherSubjectAssignment: unimplementedAsync as any, addStudentSubjectEnrollment: unimplementedAsync as any,
    updateStudentSubjectEnrollment: unimplementedAsync as any, deleteStudentSubjectEnrollment: unimplementedAsync as any,
    addChartOfAccount: unimplementedAsync as any, updateChartOfAccount: unimplementedAsync as any, deleteChartOfAccount: unimplementedAsync as any,
    addBank: unimplementedAsync as any, updateBank: unimplementedAsync as any, deleteBank: unimplementedAsync as any,
    addSupplier: unimplementedAsync as any, updateSupplier: unimplementedAsync as any, deleteSupplier: unimplementedAsync as any,
    addFeeTemplate: unimplementedAsync as any, updateFeeTemplate: unimplementedAsync as any, deleteFeeTemplate: unimplementedAsync as any,
    addExpenseClaim: unimplementedAsync as any, updateExpenseClaim: unimplementedAsync as any, deleteExpenseClaim: unimplementedAsync as any,
    addExpenseCategory: unimplementedAsync as any, updateExpenseCategory: unimplementedAsync as any, deleteExpenseCategory: unimplementedAsync as any,
    addCustomerInvoice: unimplementedAsync as any, updateCustomerInvoice: unimplementedAsync as any, deleteCustomerInvoice: unimplementedAsync as any,
    addSupplierInvoice: unimplementedAsync as any, updateSupplierInvoice: unimplementedAsync as any, deleteSupplierInvoice: unimplementedAsync as any,
    addStudentOpeningBalance: unimplementedAsync as any, updateStudentOpeningBalance: unimplementedAsync as any, deleteStudentOpeningBalance: unimplementedAsync as any,
    addFeeAdjustment: unimplementedAsync as any, updateFeeAdjustment: unimplementedAsync as any, deleteFeeAdjustment: unimplementedAsync as any,
    addTransportRoute: unimplementedAsync as any, updateTransportRoute: unimplementedAsync as any, deleteTransportRoute: unimplementedAsync as any,
    addStudentTransportAssignment: unimplementedAsync as any, updateStudentTransportAssignment: unimplementedAsync as any, deleteStudentTransportAssignment: unimplementedAsync as any,
    generateStudentInvoices: unimplementedAsync as any, addStudentPayment: unimplementedAsync as any, updateStudentPayment: unimplementedAsync as any,
    deleteStudentPayment: unimplementedAsync as any, applyPaymentToInvoices: unimplementedAsync as any, addGeneralPayment: unimplementedAsync as any,
    updateGeneralPayment: unimplementedAsync as any, deleteGeneralPayment: unimplementedAsync as any, addFinancialYear: unimplementedAsync as any,
    updateFinancialYear: unimplementedAsync as any, deleteFinancialYear: unimplementedAsync as any, addPayrollPeriod: unimplementedAsync as any,
    updatePayrollPeriod: unimplementedAsync as any, deletePayrollPeriod: unimplementedAsync as any, addPayrollItemType: unimplementedAsync as any,
    updatePayrollItemType: unimplementedAsync as any, deletePayrollItemType: unimplementedAsync as any, updateStaffSalarySetting: unimplementedAsync as any,
    generatePayslipsForPeriod: unimplementedAsync as any, addWarehouse: unimplementedAsync as any, updateWarehouse: unimplementedAsync as any,
    deleteWarehouse: unimplementedAsync as any, addItemCategoryInv: unimplementedAsync as any, updateItemCategoryInv: unimplementedAsync as any,
    deleteItemCategoryInv: unimplementedAsync as any, addItemInv: unimplementedAsync as any, updateItemInv: unimplementedAsync as any,
    deleteItemInv: unimplementedAsync as any, addFixedAsset: unimplementedAsync as any, updateFixedAsset: unimplementedAsync as any,
    deleteFixedAsset: unimplementedAsync as any, addAssetDepreciationLog: unimplementedAsync as any, addRequisition: unimplementedAsync as any,
    updateRequisition: unimplementedAsync as any, deleteRequisition: unimplementedAsync as any, updateRequisitionStatus: unimplementedAsync as any,
    addPurchaseOrder: unimplementedAsync as any, updatePurchaseOrder: unimplementedAsync as any, deletePurchaseOrder: unimplementedAsync as any,
    addStockTransaction: unimplementedAsync as any, addRfq: unimplementedAsync as any, updateRfq: unimplementedAsync as any, deleteRfq: unimplementedAsync as any,
    addBookCategory: unimplementedAsync as any, updateBookCategory: unimplementedAsync as any, deleteBookCategory: unimplementedAsync as any,
    addBook: unimplementedAsync as any, updateBook: unimplementedAsync as any, deleteBook: unimplementedAsync as any,
    addLoan: unimplementedAsync as any, updateLoan: unimplementedAsync as any, addFine: unimplementedAsync as any, updateFineStatus: unimplementedAsync as any,
    addMealPlan: unimplementedAsync as any, updateMealPlan: unimplementedAsync as any, deleteMealPlan: unimplementedAsync as any,
    addMenu: unimplementedAsync as any, updateMenu: unimplementedAsync as any, deleteMenu: unimplementedAsync as any,
    addStudentMealPlan: unimplementedAsync as any, updateStudentMealPlan: unimplementedAsync as any, deleteStudentMealPlan: unimplementedAsync as any,
    addMealConsumptionLog: unimplementedAsync as any, addMerchant: unimplementedAsync as any, updateMerchant: unimplementedAsync as any,
    deleteMerchant: unimplementedAsync as any, addWalletTransaction: unimplementedAsync as any, addWorkflow: unimplementedAsync as any,
    updateWorkflow: unimplementedAsync as any, deleteWorkflow: unimplementedAsync as any, addWorkflowState: unimplementedAsync as any,
    updateWorkflowState: unimplementedAsync as any, deleteWorkflowState: unimplementedAsync as any,
  }), [data, loading, aggregatedRawData]);
  
  return contextValue;
};
