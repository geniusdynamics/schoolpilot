// ABOUTME: This file provides modular mock data using module-specific hooks for live data.
// ABOUTME: It aggregates data from all module hooks and provides a unified interface for the app context.
// DEBUG: This file has been partially restored to test the ACADEMICS module hooks.

import { useState, useEffect } from 'react';
import { AppDataContextType, AppDataLoadingStates } from '../types';

// Import all module hooks
import { useAcademicYearData } from '../modules/academics/data/useAcademicYearData';
import { useClassSubjectAllocationData } from '../modules/academics/data/useClassSubjectAllocationData';
import { useEducationSystemData } from '../modules/academics/data/useEducationSystemData';
import { useExamPaperSettingData } from '../modules/academics/data/useExamPaperSettingData';
import { useExamSessionData } from '../modules/academics/data/useExamSessionData';
import { useGradingSchemeData } from '../modules/academics/data/useGradingSchemeData';
import { useGradingSchemeLevelData } from '../modules/academics/data/useGradingSchemeLevelData';
import { useStudentExamResultData } from '../modules/academics/data/useStudentExamResultData';
import { useStudentPaperMarkData } from '../modules/academics/data/useStudentPaperMarkData';
import { useStudentSubjectEnrollmentData } from '../modules/academics/data/useStudentSubjectEnrollmentData';
import { useSubjectData } from '../modules/academics/data/useSubjectData';
import { useSubjectPaperData } from '../modules/academics/data/useSubjectPaperData';
import { useTeacherSubjectAssignmentData } from '../modules/academics/data/useTeacherSubjectAssignmentData';
import { useTimetableEntryData } from '../modules/academics/data/useTimetableEntryData';
import { useTimetablePeriodDefData } from '../modules/academics/data/useTimetablePeriodDefData';
// ... other module imports are kept for when we re-enable them

// Dynamically import all mockData.ts files from modules for fallback data
const mockDataModules = import.meta.glob('../modules/*/data/mockData.ts', { eager: true });

// Aggregate all exported mock data into a single object for fallback
export const rawInitialData: any = {};
for (const mod of Object.values(mockDataModules)) {
  if (typeof mod === 'object' && mod !== null) {
    Object.entries(mod).forEach(([key, value]) => {
      rawInitialData[key] = value;
    });
  }
}

// Helper function to create loading states
const createLoadingStates = (): AppDataLoadingStates => ({ all: true });

export const useModularMockData = (): AppDataContextType => {
  console.log('🔧 [useModularMockData] DEBUG: Running with ACADEMICS hooks enabled.');

  const [loading, setLoading] = useState<AppDataLoadingStates>(createLoadingStates());

  // --- ACADEMICS HOOKS (ENABLED) ---
  const { data: academicyears, create: addAcademicYear, update: updateAcademicYear, remove: deleteAcademicYear } = useAcademicYearData();
  const { data: classsubjectallocations, create: addClassSubjectAllocation, update: updateClassSubjectAllocation, remove: deleteClassSubjectAllocation } = useClassSubjectAllocationData();
  const { data: exampapersettings, create: addExamPaperSetting, update: updateExamPaperSetting, remove: deleteExamPaperSetting } = useExamPaperSettingData();
  const { data: examsessions, create: addExamSession, update: updateExamSession, remove: deleteExamSession } = useExamSessionData();
  const { data: gradingschemes, create: addGradingScheme, update: updateGradingScheme, remove: deleteGradingScheme } = useGradingSchemeData();
  const { data: gradingschemelevels, create: addGradingSchemeLevel, update: updateGradingSchemeLevel, remove: deleteGradingSchemeLevel } = useGradingSchemeLevelData();
  const { data: studentexamresults, create: addStudentExamResult, update: updateStudentExamResult, remove: deleteStudentExamResult } = useStudentExamResultData();
  const { data: studentpapermarks, create: addStudentPaperMark, update: updateStudentPaperMark, remove: deleteStudentPaperMark } = useStudentPaperMarkData();
  const { data: studentsubjectenrollments, create: addStudentSubjectEnrollment, update: updateStudentSubjectEnrollment, remove: deleteStudentSubjectEnrollment } = useStudentSubjectEnrollmentData();
  const { data: subjects, create: addSubject, update: updateSubject, remove: deleteSubject } = useSubjectData();
  const { data: subjectpapers, create: addSubjectPaper, update: updateSubjectPaper, remove: deleteSubjectPaper } = useSubjectPaperData();
  const { data: teachersubjectassignments, create: addTeacherSubjectAssignment, update: updateTeacherSubjectAssignment, remove: deleteTeacherSubjectAssignment } = useTeacherSubjectAssignmentData();
  const { data: timetableentrys, create: addTimetableEntry, update: updateTimetableEntry, remove: deleteTimetableEntry } = useTimetableEntryData();
  const { data: timetablePeriodDefs, create: addTimetablePeriodDef, update: updateTimetablePeriodDef, remove: deleteTimetablePeriodDef } = useTimetablePeriodDefData();
  const { data: educationSystemConfigurations, create: addEducationSystemConfiguration, update: updateEducationSystemConfiguration, remove: deleteEducationSystemConfiguration } = useEducationSystemData();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading({ all: false });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const emptyFunc = async () => { console.warn("Called a no-op function from debug mock data."); };
  const emptyGetFunc = async () => {
    console.warn("Called a no-op function from debug mock data.");
    return null;
  };

  const fullData: AppDataType = {
    // --- ACADEMICS DATA (LIVE) ---
    academicYears: academicyears || [],
    classSubjectAllocations: classsubjectallocations || [],
    examPaperSettings: exampapersettings || [],
    examSessions: examsessions || [],
    gradingSchemes: gradingschemes || [],
    gradingSchemelevels: gradingschemelevels || [],
    studentExamResults: studentexamresults || [],
    studentPaperMarks: studentpapermarks || [],
    studentSubjectEnrollments: studentsubjectenrollments || [],
    subjects: subjects || [],
    subjectPapers: subjectpapers || [],
    teacherSubjectAssignments: teachersubjectassignments || [],
    timetableEntries: timetableentrys || [],
    timetablePeriodDefs: timetablePeriodDefs || [],
    educationSystemConfigurations: educationSystemConfigurations || [],
    examSchedules: rawInitialData.examSchedules || [],

    // --- OTHER MODULES (FALLBACK MOCK / SAFE DEFAULTS) ---
    schoolDetails: rawInitialData.schoolDetails || null,
    roles: rawInitialData.roles || [],
    users: rawInitialData.users || [],
    students: rawInitialData.students || [],
    staff: rawInitialData.staff || [],
    classes: rawInitialData.classes || [],
    classStreams: rawInitialData.classStreams || [],
    departments: rawInitialData.departments || [],
    designations: rawInitialData.designations || [],
    studentCategories: rawInitialData.studentCategories || [],
    dormitories: rawInitialData.dormitories || [],
    schoolPeriods: rawInitialData.schoolPeriods || [],
    academicYearStructures: rawInitialData.academicYearStructures || [],
    academicPeriodDefinitions: rawInitialData.academicPeriodDefinitions || [],
    financialYears: rawInitialData.financialYears || [],
    partners: rawInitialData.partners || [],
    clubs: rawInitialData.clubs || [],
    customers: rawInitialData.customers || [],
    studentHealthRecords: rawInitialData.studentHealthRecords || [],
    studentAttendance: rawInitialData.studentAttendance || [],
    templatesComm: rawInitialData.templatesComm || [],
    campaigns: rawInitialData.campaigns || [],
    chartOfAccounts: rawInitialData.chartOfAccounts || [],
    expenseCategories: rawInitialData.expenseCategories || [],
    banks: rawInitialData.banks || [],
    suppliers: rawInitialData.suppliers || [],
    feeTemplates: rawInitialData.feeTemplates || [],
    feeTemplateItems: rawInitialData.feeTemplateItems || [],
    expenseClaims: rawInitialData.expenseClaims || [],
    studentInvoices: rawInitialData.studentInvoices || [],
    studentInvoiceItems: rawInitialData.studentInvoiceItems || [],
    studentPayments: rawInitialData.studentPayments || [],
    feeAdjustments: rawInitialData.feeAdjustments || [],
    invoicePaymentApplications: rawInitialData.invoicePaymentApplications || [],
    customerInvoices: rawInitialData.customerInvoices || [],
    supplierInvoices: rawInitialData.supplierInvoices || [],
    warehouses: rawInitialData.warehouses || [],
    itemCategoriesInv: rawInitialData.itemCategoriesInv || [],
    itemsInv: rawInitialData.itemsInv || [],
    fixedAssets: rawInitialData.fixedAssets || [],
    requisitions: rawInitialData.requisitions || [],
    purchaseOrders: rawInitialData.purchaseOrders || [],
    stockLevels: rawInitialData.stockLevels || [],
    stockTransactions: rawInitialData.stockTransactions || [],
    payrollPeriods: rawInitialData.payrollPeriods || [],
    payrollItemTypes: rawInitialData.payrollItemTypes || [],
    staffSalarySettings: rawInitialData.staffSalarySettings || [],
    payslips: rawInitialData.payslips || [],
    bookCategories: rawInitialData.bookCategories || [],
    books: rawInitialData.books || [],
    loans: rawInitialData.loans || [],
    fines: rawInitialData.fines || [],
    parentsGuardians: rawInitialData.parentsGuardians || [],
    workflows: rawInitialData.workflows || [],
    mealPlans: rawInitialData.mealPlans || [],
    menus: rawInitialData.menus || [],
    merchants: rawInitialData.merchants || [],
    auditLogs: rawInitialData.auditLogs || [],
    studentOpeningBalances: rawInitialData.studentOpeningBalances || [],
    transportRoutes: rawInitialData.transportRoutes || [],
    studentTransportAssignments: rawInitialData.studentTransportAssignments || [],
    generalPayments: rawInitialData.generalPayments || [],
    generalLedgerEntries: rawInitialData.generalLedgerEntries || [],
    rfqs: rawInitialData.rfqs || [],
  };

  return {
    ...fullData,
    loading: loading.all,
    error: null,
    refresh: emptyFunc,
    getStudentDetailsById: emptyGetFunc,
    getStudentFinancialDetailsById: emptyGetFunc,
    // --- ACADEMICS CRUD (LIVE) ---
    addAcademicYear, updateAcademicYear, deleteAcademicYear,
    addClassSubjectAllocation, updateClassSubjectAllocation, deleteClassSubjectAllocation,
    addExamPaperSetting, updateExamPaperSetting, deleteExamPaperSetting,
    addExamSession, updateExamSession, deleteExamSession,
    addGradingScheme, updateGradingScheme, deleteGradingScheme,
    addGradingSchemeLevel, updateGradingSchemeLevel, deleteGradingSchemeLevel,
    addStudentExamResult, updateStudentExamResult, deleteStudentExamResult,
    addStudentPaperMark, updateStudentPaperMark, deleteStudentPaperMark,
    addStudentSubjectEnrollment, updateStudentSubjectEnrollment, deleteStudentSubjectEnrollment,
    addSubject, updateSubject, deleteSubject,
    addSubjectPaper, updateSubjectPaper, deleteSubjectPaper,
    addTeacherSubjectAssignment, updateTeacherSubjectAssignment, deleteTeacherSubjectAssignment,
    addTimetableEntry, updateTimetableEntry, deleteTimetableEntry,
    addTimetablePeriodDef, updateTimetablePeriodDef, deleteTimetablePeriodDef,
    addEducationSystemConfiguration, updateEducationSystemConfiguration, deleteEducationSystemConfiguration,
    getTimetableEntries: (classStreamId: number) => {
      return (timetableentrys || []).filter((entry: any) => entry.class_stream_id === classStreamId);
    },
    addExamSchedule: emptyFunc, updateExamSchedule: emptyFunc, deleteExamSchedule: emptyFunc,

    // --- OTHER CRUD (NO-OP) ---
    addStudent: emptyFunc, updateStudent: emptyFunc, deleteStudent: emptyFunc,
    addStaffMember: emptyFunc, updateStaffMember: emptyFunc, deleteStaffMember: emptyFunc,
    addPartner: emptyFunc, updatePartner: emptyFunc, deletePartner: emptyFunc,
    addClub: emptyFunc, updateClub: emptyFunc, deleteClub: emptyFunc,
    addCustomer: emptyFunc, updateCustomer: emptyFunc, deleteCustomer: emptyFunc,
    addStudentHealthRecord: emptyFunc, updateStudentHealthRecord: emptyFunc, deleteStudentHealthRecord: emptyFunc,
    addTemplateComm: emptyFunc, updateTemplateComm: emptyFunc, deleteTemplateComm: emptyFunc,
    addCampaign: emptyFunc, updateCampaign: emptyFunc, deleteCampaign: emptyFunc,
    addSchoolPeriod: emptyFunc, updateSchoolPeriod: emptyFunc, deleteSchoolPeriod: emptyFunc,
    addClass: emptyFunc, updateClass: emptyFunc, deleteClass: emptyFunc,
    addClassStream: emptyFunc, updateClassStream: emptyFunc, deleteClassStream: emptyFunc,
    generateStudentInvoices: emptyFunc,
    addPermission: emptyFunc, updatePermission: emptyFunc, deletePermission: emptyFunc,
    addRole: emptyFunc, updateRole: emptyFunc, deleteRole: emptyFunc,
    assignRoleToUser: emptyFunc, removeRoleFromUser: emptyFunc,
    saveStudentAttendance: emptyFunc,
    getStudentAttendanceByFilters: () => [],
    getTimetablePeriodDefs: () => [],
    addChartOfAccount: emptyFunc, updateChartOfAccount: emptyFunc, deleteChartOfAccount: emptyFunc,
    addExpenseCategory: emptyFunc, updateExpenseCategory: emptyFunc, removeExpenseCategory: emptyFunc,
    addBank: emptyFunc, updateBank: emptyFunc, removeBank: emptyFunc,
    addSupplier: emptyFunc, updateSupplier: emptyFunc, removeSupplier: emptyFunc,
    addFeeTemplate: emptyFunc, updateFeeTemplate: emptyFunc, deleteFeeTemplate: emptyFunc,
    addFeeTemplateItem: emptyFunc, updateFeeTemplateItem: emptyFunc, removeFeeTemplateItem: emptyFunc,
    addExpenseClaim: emptyFunc, updateExpenseClaim: emptyFunc, removeExpenseClaim: emptyFunc,
    addCustomerInvoice: emptyFunc, updateCustomerInvoice: emptyFunc, removeCustomerInvoice: emptyFunc,
    addSupplierInvoice: emptyFunc, updateSupplierInvoice: emptyFunc, removeSupplierInvoice: emptyFunc,
    addStudentOpeningBalance: emptyFunc, updateStudentOpeningBalance: emptyFunc, deleteStudentOpeningBalance: emptyFunc,
    addFeeAdjustment: emptyFunc, updateFeeAdjustment: emptyFunc, deleteFeeAdjustment: emptyFunc,
    addTransportRoute: emptyFunc, updateTransportRoute: emptyFunc, deleteTransportRoute: emptyFunc,
    addStudentTransportAssignment: emptyFunc, updateStudentTransportAssignment: emptyFunc, deleteStudentTransportAssignment: emptyFunc,
    addStudentInvoice: emptyFunc, updateStudentInvoice: emptyFunc, deleteStudentInvoice: emptyFunc,
    addStudentInvoiceItem: emptyFunc, updateStudentInvoiceItem: emptyFunc, deleteStudentInvoiceItem: emptyFunc,
    addStudentPayment: emptyFunc, updateStudentPayment: emptyFunc, deleteStudentPayment: emptyFunc,
    addInvoicePaymentApplication: emptyFunc, updateInvoicePaymentApplication: emptyFunc, removeInvoicePaymentApplication: emptyFunc,
    addGeneralPayment: emptyFunc, updateGeneralPayment: emptyFunc, removeGeneralPayment: emptyFunc,
    addGeneralLedgerEntry: emptyFunc, updateGeneralLedgerEntry: emptyFunc, removeGeneralLedgerEntry: emptyFunc,
    addRFQ: emptyFunc, updateRFQ: emptyFunc, deleteRFQ: emptyFunc,
    addWarehouse: emptyFunc, updateWarehouse: emptyFunc, removeWarehouse: emptyFunc,
    addItemCategory: emptyFunc, updateItemCategory: emptyFunc, removeItemCategory: emptyFunc,
    addItem: emptyFunc, updateItem: emptyFunc, removeItem: emptyFunc,
    addFixedAsset: emptyFunc, updateFixedAsset: emptyFunc, removeFixedAsset: emptyFunc,
    addAssetDepreciationLog: emptyFunc, updateAssetDepreciationLog: emptyFunc, removeAssetDepreciationLog: emptyFunc,
    addStockLevel: emptyFunc, updateStockLevel: emptyFunc, removeStockLevel: emptyFunc,
    addStockTransaction: emptyFunc, updateStockTransaction: emptyFunc, removeStockTransaction: emptyFunc,
    addRequisition: emptyFunc, updateRequisition: emptyFunc, removeRequisition: emptyFunc,
    addRequisitionItem: emptyFunc, updateRequisitionItem: emptyFunc, removeRequisitionItem: emptyFunc,
    addPurchaseOrder: emptyFunc, updatePurchaseOrder: emptyFunc, removePurchaseOrder: emptyFunc,
    addPurchaseOrderItem: emptyFunc, updatePurchaseOrderItem: emptyFunc, removePurchaseOrderItem: emptyFunc,
    addBookCategory: emptyFunc, updateBookCategory: emptyFunc, removeBookCategory: emptyFunc,
    addBook: emptyFunc, updateBook: emptyFunc, removeBook: emptyFunc,
    addLoan: emptyFunc, updateLoan: emptyFunc, removeLoan: emptyFunc,
    addFine: emptyFunc, updateFine: emptyFunc, removeFine: emptyFunc,
    addMealPlan: emptyFunc, updateMealPlan: emptyFunc, removeMealPlan: emptyFunc,
    addMenu: emptyFunc, updateMenu: emptyFunc, removeMenu: emptyFunc,
    addMerchant: emptyFunc, updateMerchant: emptyFunc, removeMerchant: emptyFunc,
    addStudentMealPlan: emptyFunc, updateStudentMealPlan: emptyFunc, removeStudentMealPlan: emptyFunc,
    addStudentWallet: emptyFunc, updateStudentWallet: emptyFunc, removeStudentWallet: emptyFunc,
    addWalletTransaction: emptyFunc, updateWalletTransaction: emptyFunc, removeWalletTransaction: emptyFunc,
    addMealConsumptionLog: emptyFunc, updateMealConsumptionLog: emptyFunc, removeMealConsumptionLog: emptyFunc,
    addPayrollItemType: emptyFunc, updatePayrollItemType: emptyFunc, removePayrollItemType: emptyFunc,
    addPayrollPeriod: emptyFunc, updatePayrollPeriod: emptyFunc, removePayrollPeriod: emptyFunc,
    addPayslip: emptyFunc, updatePayslip: emptyFunc, removePayslip: emptyFunc,
    addPayslipItem: emptyFunc, updatePayslipItem: emptyFunc, removePayslipItem: emptyFunc,
    addStaffRecurringItem: emptyFunc, updateStaffRecurringItem: emptyFunc, removeStaffRecurringItem: emptyFunc,
    addStaffSalarySetting: emptyFunc, updateStaffSalarySetting: emptyFunc, removeStaffSalarySetting: emptyFunc,
  };
};
