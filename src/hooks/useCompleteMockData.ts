// hooks/useCompleteMockData.ts
import { useState, useEffect } from 'react';
import { 
    AppDataContextType, 
    AppDataLoadingStates, 
    AppDataType,
    StudentPaperMark, 
    StudentHealthRecord, 
    ClubAndSociety, 
    Partner, 
    TemplateComm, 
    Campaign, 
    RFQ, 
    Customer, 
    SupplierInvoice, 
    Workflow, 
    AuditLog,
    StudentAttendance,
    AcademicPeriodDefinition,
    AcademicYear,
    AcademicYearStructure,
    SchoolPeriod
} from '../core/types';
import { MOCK_API_DELAY } from '../constants';

// --- Import Modular Mock Data ---
// Administration
import {
    initialMockSchoolDetails,
    initialMockUsers,
    initialMockRoles,
    initialMockStaff,
    initialMockParentsGuardians,
    initialMockStudents,
    initialMockClasses,
    initialMockClassStreams,
    initialMockDepartments,
    initialMockDesignations,
    initialMockStudentCategories,
    initialMockDormitories,
    initialMockWorkflows,
} from '../modules/administration/data/mockData';

// Academics
import {
    initialMockSubjects,
    initialMockSubjectPapers,
    initialMockGradingSchemes,
    initialMockExamSessions,
    initialMockExamPaperSettings,
    initialMockStudentExamResults,
    initialMockClassSubjectAllocations,
    initialMockTeacherSubjectAssignments,
    initialMockStudentSubjectEnrollments,
    initialMockTimetablePeriodDefs,
    initialMockTimetableEntries,
} from '../modules/academics/data/mockData';

// Finance
import {
    initialMockFinancialYears,
    initialMockExpenseCategories,
    initialMockChartOfAccounts,
    initialMockBanks,
    initialMockSuppliers,
    initialMockFeeTemplates,
    initialMockFeeTemplateItems,
    initialMockStudentInvoices,
    initialMockStudentInvoiceItems,
    initialMockStudentPayments,
    initialMockInvoicePaymentApplications,
    initialMockExpenseClaims,
    initialMockStudentOpeningBalances,
    initialMockFeeAdjustments,
    initialMockTransportRoutes,
    initialMockStudentTransportAssignments,
    initialMockCustomerInvoices,
    initialMockGeneralPayments,
    initialMockGeneralLedgerEntries,
} from '../modules/finance/data/mockData';

// HR
import {
    initialMockPayrollPeriods,
    initialMockPayrollItemTypes,
    initialMockStaffSalarySettings,
    initialMockStaffRecurringItems,
    initialMockPayslips,
    initialMockPayslipItems,
} from '../modules/hr/data/mockData';

// Inventory
import {
    initialMockWarehouses,
    initialMockItemCategoriesInv,
    initialMockItemsInv,
    initialMockFixedAssets,
    initialMockAssetDepreciationLogs,
    initialMockStockLevels,
    initialMockStockTransactions,
    initialMockRequisitions,
    initialMockRequisitionItems,
    initialMockPurchaseOrders,
    initialMockPurchaseOrderItems,
} from '../modules/inventory/data/mockData';

// Library
import {
    initialMockBookCategories,
    initialMockBooks,
    initialMockLoans,
    initialMockFines,
} from '../modules/library/data/mockData';

// Nutrition
import {
    initialMockMealPlans,
    initialMockStudentMealPlans,
    initialMockMenus,
    initialMockMealConsumptionLogs,
    initialMockMerchants,
    initialMockStudentWallets,
    initialMockWalletTransactions,
} from '../modules/nutrition/data/mockData';

// Simulating a delay for API calls
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to create loading states for all entities
const createLoadingStates = (): AppDataLoadingStates => {
    const keys = Object.keys(rawInitialData) as Array<keyof AppDataType>;
    const states = keys.reduce((acc, key) => {
        acc[key] = true;
        return acc;
    }, {} as Record<keyof AppDataType, boolean>);
    return { ...states, all: true };
};


// Combine all imported mock data into a single object
export const rawInitialData: AppDataType = {
    // Administration
    schoolDetails: initialMockSchoolDetails,
    users: initialMockUsers,
    roles: initialMockRoles,
    staff: initialMockStaff,
    parentsGuardians: initialMockParentsGuardians,
    students: initialMockStudents,
    classes: initialMockClasses,
    classStreams: initialMockClassStreams,
    departments: initialMockDepartments,
    designations: initialMockDesignations,
    studentCategories: initialMockStudentCategories,
    dormitories: initialMockDormitories,
    
    // Academics
    subjects: initialMockSubjects,
    subjectPapers: initialMockSubjectPapers,
    gradingSchemes: initialMockGradingSchemes,
    examSessions: initialMockExamSessions,
    examPaperSettings: initialMockExamPaperSettings,
    studentExamResults: initialMockStudentExamResults,
    classSubjectAllocations: initialMockClassSubjectAllocations,
    teacherSubjectAssignments: initialMockTeacherSubjectAssignments,
    studentSubjectEnrollments: initialMockStudentSubjectEnrollments,
    timetablePeriodDefs: initialMockTimetablePeriodDefs,
    timetableEntries: initialMockTimetableEntries,
    
    // Finance
    financialYears: initialMockFinancialYears,
    chartOfAccounts: initialMockChartOfAccounts,
    expenseCategories: initialMockExpenseCategories,
    banks: initialMockBanks,
    suppliers: initialMockSuppliers,
    feeTemplates: initialMockFeeTemplates,
    feeTemplateItems: initialMockFeeTemplateItems,
    studentInvoices: initialMockStudentInvoices,
    studentInvoiceItems: initialMockStudentInvoiceItems,
    studentPayments: initialMockStudentPayments,
    invoicePaymentApplications: initialMockInvoicePaymentApplications,
    expenseClaims: initialMockExpenseClaims,
    customerInvoices: initialMockCustomerInvoices,
    studentOpeningBalances: initialMockStudentOpeningBalances,
    feeAdjustments: initialMockFeeAdjustments,
    transportRoutes: initialMockTransportRoutes,
    studentTransportAssignments: initialMockStudentTransportAssignments,
    generalPayments: initialMockGeneralPayments,
    generalLedgerEntries: initialMockGeneralLedgerEntries,

    // HR
    payrollPeriods: initialMockPayrollPeriods,
    payrollItemTypes: initialMockPayrollItemTypes,
    staffSalarySettings: initialMockStaffSalarySettings,
    payslips: initialMockPayslips,

    // Inventory
    warehouses: initialMockWarehouses,
    itemCategoriesInv: initialMockItemCategoriesInv,
    itemsInv: initialMockItemsInv,
    fixedAssets: initialMockFixedAssets,
    requisitions: initialMockRequisitions,
    purchaseOrders: initialMockPurchaseOrders,
    stockLevels: initialMockStockLevels,
    stockTransactions: initialMockStockTransactions,

    // Library
    bookCategories: initialMockBookCategories,
    books: initialMockBooks,
    loans: initialMockLoans,
    fines: initialMockFines,

    // Nutrition
    mealPlans: initialMockMealPlans,
    menus: initialMockMenus,
    merchants: initialMockMerchants,
    studentMealPlans: initialMockStudentMealPlans,
    mealConsumptionLogs: initialMockMealConsumptionLogs,
    walletTransactions: initialMockWalletTransactions,
    studentWallets: initialMockStudentWallets,

    // Placeholders for data not yet modularized or empty
    academicYearStructures: [] as AcademicYearStructure[],
    academicPeriodDefinitions: [] as AcademicPeriodDefinition[],
    academicYears: [] as AcademicYear[],
    schoolPeriods: [] as SchoolPeriod[],
    partners: [] as Partner[],
    clubs: [] as ClubAndSociety[],
    customers: [] as Customer[],
    studentHealthRecords: [] as StudentHealthRecord[],
    studentAttendance: [] as StudentAttendance[],
    templatesComm: [] as TemplateComm[],
    campaigns: [] as Campaign[],
    supplierInvoices: [] as SupplierInvoice[],
    workflows: initialMockWorkflows,
    auditLogs: [] as AuditLog[],
    rfqs: [] as RFQ[],
};

export const useMockData = (): AppDataContextType => {
  const [data, setData] = useState<Partial<AppDataType>>({});
  const [loading, setLoading] = useState<AppDataLoadingStates>(createLoadingStates());

  useEffect(() => {
    const loadAllData = async () => {
      console.log("useMockData: Starting to load all modular mock data...");
      setLoading(createLoadingStates());

      await delay(MOCK_API_DELAY);

      // Set all data at once from the composed rawInitialData object
      setData(rawInitialData);

      // Turn off all loading flags
      const newLoadingStates = createLoadingStates();
      Object.keys(newLoadingStates).forEach(key => {
        (newLoadingStates as any)[key] = false;
      });
      setLoading(newLoadingStates);

      console.log("useMockData: All mock data loaded and context is set.");
    };

    loadAllData();
  }, []);

  return {
    ...(data as AppDataType),
    loading,
    rawInitialData,
  } as AppDataContextType;
};