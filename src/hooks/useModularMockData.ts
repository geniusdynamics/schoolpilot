// ABOUTME: This file provides modular mock data using module-specific hooks for live data.
// ABOUTME: It aggregates data from all module hooks and provides a unified interface for the app context.

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
import { useAcademicPeriodDefinitionData } from '../modules/administration/data/useAcademicPeriodDefinitionData';
import { useAcademicYearStructureData } from '../modules/administration/data/useAcademicYearStructureData';
import { useCampaignData } from '../modules/administration/data/useCampaignData';
import { useClassData } from '../modules/administration/data/useClassData';
import { useClassStreamData } from '../modules/administration/data/useClassStreamData';
import { useClubAndSocietyData } from '../modules/administration/data/useClubAndSocietyData';
import { useCustomerData } from '../modules/administration/data/useCustomerData';
import { useDepartmentData } from '../modules/administration/data/useDepartmentData';
import { useDesignationData } from '../modules/administration/data/useDesignationData';
import { useDormitoryData } from '../modules/administration/data/useDormitoryData';
import { usePartnerData } from '../modules/administration/data/usePartnerData';
import { useSchoolPeriodData } from '../modules/administration/data/useSchoolPeriodData';
import { useStudentAttendanceData } from '../modules/administration/data/useStudentAttendanceData';
import { useStudentCategoryData } from '../modules/administration/data/useStudentCategoryData';
import { useStudentHealthRecordData } from '../modules/administration/data/useStudentHealthRecordData';
import { useTemplateCommData } from '../modules/administration/data/useTemplateCommData';
import { useBankData } from '../modules/finance/data/useBankData';
import { useChartOfAccountData } from '../modules/finance/data/useChartOfAccountData';
import { useCustomerInvoiceData } from '../modules/finance/data/useCustomerInvoiceData';
import { useExpenseCategoryData } from '../modules/finance/data/useExpenseCategoryData';
import { useExpenseClaimData } from '../modules/finance/data/useExpenseClaimData';
import { useFeeAdjustmentData } from '../modules/finance/data/useFeeAdjustmentData';
import { useFeeTemplateData } from '../modules/finance/data/useFeeTemplateData';
import { useFeeTemplateItemData } from '../modules/finance/data/useFeeTemplateItemData';
import { useFinancialYearData } from '../modules/finance/data/useFinancialYearData';
import { useGeneralLedgerEntryData } from '../modules/finance/data/useGeneralLedgerEntryData';
import { useGeneralPaymentData } from '../modules/finance/data/useGeneralPaymentData';
import { useInvoicePaymentApplicationData } from '../modules/finance/data/useInvoicePaymentApplicationData';
import { useStudentInvoiceData } from '../modules/finance/data/useStudentInvoiceData';
import { useStudentInvoiceItemData } from '../modules/finance/data/useStudentInvoiceItemData';
import { useStudentOpeningBalanceData } from '../modules/finance/data/useStudentOpeningBalanceData';
import { useStudentPaymentData } from '../modules/finance/data/useStudentPaymentData';
import { useStudentTransportAssignmentData } from '../modules/finance/data/useStudentTransportAssignmentData';
import { useSupplierData } from '../modules/finance/data/useSupplierData';
import { useSupplierInvoiceData } from '../modules/finance/data/useSupplierInvoiceData';
import { useTransportRouteData } from '../modules/finance/data/useTransportRouteData';
import { usePayrollItemTypeData } from '../modules/hr/data/usePayrollItemTypeData';
import { usePayrollPeriodData } from '../modules/hr/data/usePayrollPeriodData';
import { usePayslipData } from '../modules/hr/data/usePayslipData';
import { usePayslipItemData } from '../modules/hr/data/usePayslipItemData';
import { useStaffRecurringItemData } from '../modules/hr/data/useStaffRecurringItemData';
import { useStaffSalarySettingData } from '../modules/hr/data/useStaffSalarySettingData';
import { useAssetDepreciationLogData } from '../modules/inventory/data/useAssetDepreciationLogData';
import { useFixedAssetData } from '../modules/inventory/data/useFixedAssetData';
import { useItemCategoryData } from '../modules/inventory/data/useItemCategoryData';
import { useItemData } from '../modules/inventory/data/useItemData';
import { usePurchaseOrderData } from '../modules/inventory/data/usePurchaseOrderData';
import { usePurchaseOrderItemData } from '../modules/inventory/data/usePurchaseOrderItemData';
import { useRequisitionData } from '../modules/inventory/data/useRequisitionData';
import { useRequisitionItemData } from '../modules/inventory/data/useRequisitionItemData';
import { useRFQData } from '../modules/inventory/data/useRFQData';
import { useStockLevelData } from '../modules/inventory/data/useStockLevelData';
import { useStockTransactionData } from '../modules/inventory/data/useStockTransactionData';
import { useWarehouseData } from '../modules/inventory/data/useWarehouseData';
import { useBookCategoryData } from '../modules/library/data/useBookCategoryData';
import { useBookData } from '../modules/library/data/useBookData';
import { useFineData } from '../modules/library/data/useFineData';
import { useLoanData } from '../modules/library/data/useLoanData';
import { useMealConsumptionLogData } from '../modules/nutrition/data/useMealConsumptionLogData';
import { useMealPlanData } from '../modules/nutrition/data/useMealPlanData';
import { useMenuData } from '../modules/nutrition/data/useMenuData';
import { useMerchantData } from '../modules/nutrition/data/useMerchantData';
import { useStudentMealPlanData } from '../modules/nutrition/data/useStudentMealPlanData';
import { useStudentWalletData } from '../modules/nutrition/data/useStudentWalletData';
import { useWalletTransactionData } from '../modules/nutrition/data/useWalletTransactionData';

// Dynamically import all mockData.ts files from modules for fallback data
const mockDataModules = import.meta.glob('../modules/*/data/mockData.ts', { eager: true });

// Aggregate all exported mock data into a single object for fallback
export const rawInitialData: any = {};
for (const mod of Object.values(mockDataModules)) {
  if (typeof mod === 'object' && mod !== null) {
    Object.entries(mod).forEach(([key, value]) => {
      // Only add if not already present (last-in wins for duplicate keys)
      rawInitialData[key] = value;
    });
  }
}

// Helper function to create loading states
const createLoadingStates = (): AppDataLoadingStates => ({
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
  educationSystemConfigurations: true,
  financialYears: true,
  classStreams: true,
  parentsGuardians: true,
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
  generalPayments: true,
  generalLedgerEntries: true,
  rfqs: true
});

export const useModularMockData = (): AppDataContextType => {
  // Use module-specific hooks for live data
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
  const { data: academicperioddefinitions, create: addAcademicPeriodDefinition, update: updateAcademicPeriodDefinition, remove: deleteAcademicPeriodDefinition } = useAcademicPeriodDefinitionData();
  const { data: academicyearstructures, create: addAcademicYearStructure, update: updateAcademicYearStructure, remove: deleteAcademicYearStructure } = useAcademicYearStructureData();
  const { data: educationSystemConfigurations, create: addEducationSystemConfiguration, update: updateEducationSystemConfiguration, remove: deleteEducationSystemConfiguration } = useEducationSystemData();
  const { data: campaigns, create: addCampaign, update: updateCampaign, remove: deleteCampaign } = useCampaignData();
  const { data: classs, create: addClass, update: updateClass, remove: deleteClass } = useClassData();
  const { data: classstreams, create: addClassStream, update: updateClassStream, remove: deleteClassStream } = useClassStreamData();
  const { data: clubandsocietys, create: addClubAndSociety, update: updateClubAndSociety, remove: deleteClubAndSociety } = useClubAndSocietyData();
  const { data: customers, create: addCustomer, update: updateCustomer, remove: deleteCustomer } = useCustomerData();
  const { data: departments, create: addDepartment, update: updateDepartment, remove: deleteDepartment } = useDepartmentData();
  const { data: designations, create: addDesignation, update: updateDesignation, remove: deleteDesignation } = useDesignationData();
  const { data: dormitorys, create: addDormitory, update: updateDormitory, remove: deleteDormitory } = useDormitoryData();
  const { data: partners, create: addPartner, update: updatePartner, remove: deletePartner } = usePartnerData();
  const { data: schoolperiods, create: addSchoolPeriod, update: updateSchoolPeriod, remove: deleteSchoolPeriod } = useSchoolPeriodData();
  const { data: studentattendances, create: addStudentAttendance, update: updateStudentAttendance, remove: deleteStudentAttendance } = useStudentAttendanceData();
  const { data: studentcategorys, create: addStudentCategory, update: updateStudentCategory, remove: deleteStudentCategory } = useStudentCategoryData();
  const { data: studenthealthrecords, create: addStudentHealthRecord, update: updateStudentHealthRecord, remove: deleteStudentHealthRecord } = useStudentHealthRecordData();
  const { data: templatecomms, create: addTemplateComm, update: updateTemplateComm, remove: deleteTemplateComm } = useTemplateCommData();
  const { data: banks, create: addBank, update: updateBank, remove: deleteBank } = useBankData();
  const { data: chartofaccounts, create: addChartOfAccount, update: updateChartOfAccount, remove: deleteChartOfAccount } = useChartOfAccountData();
  const { data: customerinvoices, create: addCustomerInvoice, update: updateCustomerInvoice, remove: deleteCustomerInvoice } = useCustomerInvoiceData();
  const { data: expensecategorys, create: addExpenseCategory, update: updateExpenseCategory, remove: deleteExpenseCategory } = useExpenseCategoryData();
  const { data: expenseclaims, create: addExpenseClaim, update: updateExpenseClaim, remove: deleteExpenseClaim } = useExpenseClaimData();
  const { data: feeadjustments, create: addFeeAdjustment, update: updateFeeAdjustment, remove: deleteFeeAdjustment } = useFeeAdjustmentData();
  const { data: feetemplates, create: addFeeTemplate, update: updateFeeTemplate, remove: deleteFeeTemplate } = useFeeTemplateData();
  const { data: feetemplateitems, create: addFeeTemplateItem, update: updateFeeTemplateItem, remove: deleteFeeTemplateItem } = useFeeTemplateItemData();
  const { data: financialyears, create: addFinancialYear, update: updateFinancialYear, remove: deleteFinancialYear } = useFinancialYearData();
  const { data: generalledgerentrys, create: addGeneralLedgerEntry, update: updateGeneralLedgerEntry, remove: deleteGeneralLedgerEntry } = useGeneralLedgerEntryData();
  const { data: generalpayments, create: addGeneralPayment, update: updateGeneralPayment, remove: deleteGeneralPayment } = useGeneralPaymentData();
  const { data: invoicepaymentapplications, create: addInvoicePaymentApplication, update: updateInvoicePaymentApplication, remove: deleteInvoicePaymentApplication } = useInvoicePaymentApplicationData();
  const { data: studentinvoices, create: addStudentInvoice, update: updateStudentInvoice, remove: deleteStudentInvoice } = useStudentInvoiceData();
  const { data: studentinvoiceitems, create: addStudentInvoiceItem, update: updateStudentInvoiceItem, remove: deleteStudentInvoiceItem } = useStudentInvoiceItemData();
  const { data: studentopeningbalances, create: addStudentOpeningBalance, update: updateStudentOpeningBalance, remove: deleteStudentOpeningBalance } = useStudentOpeningBalanceData();
  const { data: studentpayments, create: addStudentPayment, update: updateStudentPayment, remove: deleteStudentPayment } = useStudentPaymentData();
  const { data: studenttransportassignments, create: addStudentTransportAssignment, update: updateStudentTransportAssignment, remove: deleteStudentTransportAssignment } = useStudentTransportAssignmentData();
  const { data: suppliers, create: addSupplier, update: updateSupplier, remove: deleteSupplier } = useSupplierData();
  const { data: supplierinvoices, create: addSupplierInvoice, update: updateSupplierInvoice, remove: deleteSupplierInvoice } = useSupplierInvoiceData();
  const { data: transportroutes, create: addTransportRoute, update: updateTransportRoute, remove: deleteTransportRoute } = useTransportRouteData();
  const { data: payrollitemtypes, create: addPayrollItemType, update: updatePayrollItemType, remove: deletePayrollItemType } = usePayrollItemTypeData();
  const { data: payrollperiods, create: addPayrollPeriod, update: updatePayrollPeriod, remove: deletePayrollPeriod } = usePayrollPeriodData();
  const { data: payslips, create: addPayslip, update: updatePayslip, remove: deletePayslip } = usePayslipData();
  const { data: payslipitems, create: addPayslipItem, update: updatePayslipItem, remove: deletePayslipItem } = usePayslipItemData();
  const { data: staffrecurringitems, create: addStaffRecurringItem, update: updateStaffRecurringItem, remove: deleteStaffRecurringItem } = useStaffRecurringItemData();
  const { data: staffsalarysettings, create: addStaffSalarySetting, update: updateStaffSalarySetting, remove: deleteStaffSalarySetting } = useStaffSalarySettingData();
  const { data: assetdepreciationlogs, create: addAssetDepreciationLog, update: updateAssetDepreciationLog, remove: deleteAssetDepreciationLog } = useAssetDepreciationLogData();
  const { data: fixedassets, create: addFixedAsset, update: updateFixedAsset, remove: deleteFixedAsset } = useFixedAssetData();
  const { data: itemcategorys, create: addItemCategory, update: updateItemCategory, remove: deleteItemCategory } = useItemCategoryData();
  const { data: items, create: addItem, update: updateItem, remove: deleteItem } = useItemData();
  const { data: purchaseorders, create: addPurchaseOrder, update: updatePurchaseOrder, remove: deletePurchaseOrder } = usePurchaseOrderData();
  const { data: purchaseorderitems, create: addPurchaseOrderItem, update: updatePurchaseOrderItem, remove: deletePurchaseOrderItem } = usePurchaseOrderItemData();
  const { data: requisitions, create: addRequisition, update: updateRequisition, remove: deleteRequisition } = useRequisitionData();
  const { data: requisitionitems, create: addRequisitionItem, update: updateRequisitionItem, remove: deleteRequisitionItem } = useRequisitionItemData();
  const { data: rfqs, create: addRFQ, update: updateRFQ, remove: deleteRFQ } = useRFQData();
  const { data: stocklevels, create: addStockLevel, update: updateStockLevel, remove: deleteStockLevel } = useStockLevelData();
  const { data: stocktransactions, create: addStockTransaction, update: updateStockTransaction, remove: deleteStockTransaction } = useStockTransactionData();
  const { data: warehouses, create: addWarehouse, update: updateWarehouse, remove: deleteWarehouse } = useWarehouseData();
  const { data: bookcategorys, create: addBookCategory, update: updateBookCategory, remove: deleteBookCategory } = useBookCategoryData();
  const { data: books, create: addBook, update: updateBook, remove: deleteBook } = useBookData();
  const { data: fines, create: addFine, update: updateFine, remove: deleteFine } = useFineData();
  const { data: loans, create: addLoan, update: updateLoan, remove: deleteLoan } = useLoanData();
  const { data: mealconsumptionlogs, create: addMealConsumptionLog, update: updateMealConsumptionLog, remove: deleteMealConsumptionLog } = useMealConsumptionLogData();
  const { data: mealplans, create: addMealPlan, update: updateMealPlan, remove: deleteMealPlan } = useMealPlanData();
  const { data: menus, create: addMenu, update: updateMenu, remove: deleteMenu } = useMenuData();
  const { data: merchants, create: addMerchant, update: updateMerchant, remove: deleteMerchant } = useMerchantData();
  const { data: studentmealplans, create: addStudentMealPlan, update: updateStudentMealPlan, remove: deleteStudentMealPlan } = useStudentMealPlanData();
  const { data: studentwallets, create: addStudentWallet, update: updateStudentWallet, remove: deleteStudentWallet } = useStudentWalletData();
  const { data: wallettransactions, create: addWalletTransaction, update: updateWalletTransaction, remove: deleteWalletTransaction } = useWalletTransactionData();

  const [loading, setLoading] = useState<AppDataLoadingStates>(createLoadingStates());

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(prev => {
        const newLoading = { ...prev };
        Object.keys(newLoading).forEach(key => {
          newLoading[key as keyof AppDataLoadingStates] = false;
        });
        return newLoading;
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const getStudentDetailsById = async (studentId: string) => {
    console.log('Getting student details for ID:', studentId);

    // Aggregate all students from mock data
    const allStudents = rawInitialData.students || [];

    // Find student by id or admission number
    const student = allStudents.find((s: any) => s.id === studentId || s.admission_no === studentId);

    if (!student) {
      console.log('Student not found:', studentId);
      return null;
    }

    // Enhance student with enrolled subjects (mocked data)
    const enrolledSubjects = [
      { courseName: 'Mathematics', professorInstructorName: 'Mr. Johnson', status: 'A-' },
      { courseName: 'English Language', professorInstructorName: 'Ms. Smith', status: 'B+' },
      { courseName: 'Science', professorInstructorName: 'Dr. Brown', status: 'A' },
      { courseName: 'History', professorInstructorName: 'Mr. Davis', status: 'B' },
      { courseName: 'Geography', professorInstructorName: 'Ms. Wilson', status: 'A-' }
    ];

    // Mock payment history
    const paymentHistory = [
      {
        transactionId: 'PAY001',
        paymentDate: '2024-01-10',
        amount: 15000,
        paymentMethod: 'Bank Transfer',
        description: 'Tuition Fee - Term 1',
        id: '1'
      },
      {
        transactionId: 'PAY002',
        paymentDate: '2024-01-28',
        amount: 2500,
        paymentMethod: 'Cash',
        description: 'Activity Fee',
        id: '2'
      },
      {
        transactionId: 'PAY003',
        paymentDate: null,
        amount: 15000,
        paymentMethod: null,
        description: 'Tuition Fee - Term 2',
        id: '3'
      }
    ];

    return {
      ...student,
      enrolled_subjects: enrolledSubjects,
      payment_history: paymentHistory
    };
  };

  const getStudentFinancialDetailsById = async (studentId: string) => {
    console.log('Getting student financial details for ID:', studentId);

    const student = await getStudentDetailsById(studentId);
    if (!student) {
      return null;
    }

    // Mock financial summary
    const financialSummary = {
      currentBalance: 15000,
      totalFees: 32500,
      totalPaid: 17500,
      totalDiscount: 0,
      totalFine: 0
    };

    // Mock invoices and charges
    const invoicesCharges = [
      {
        invoiceId: 'INV001',
        feeTypeDescription: 'Tuition Fee - Term 1',
        dueDate: '2024-01-15',
        amount: 15000,
        status: 'Paid',
        id: '1'
      },
      {
        invoiceId: 'INV002',
        feeTypeDescription: 'Activity Fee',
        dueDate: '2024-02-01',
        amount: 2500,
        status: 'Paid',
        id: '2'
      },
      {
        invoiceId: 'INV003',
        feeTypeDescription: 'Tuition Fee - Term 2',
        dueDate: '2024-04-15',
        amount: 15000,
        status: 'Pending',
        id: '3'
      }
    ];

    return {
      ...student,
      financial_summary: financialSummary,
      invoices_charges: invoicesCharges,
      payment_history: student.payment_history
    };
  };

  const fullData: any = {
    // Academic data with correct naming
    academicYears: academicyears,
    classSubjectAllocations: classsubjectallocations,
    examPaperSettings: exampapersettings,
    examSessions: examsessions,
    gradingSchemes: gradingschemes,
    gradingSchemelevels: gradingschemelevels,
    studentExamResults: studentexamresults,
    studentPaperMarks: studentpapermarks,
    studentSubjectEnrollments: studentsubjectenrollments,
    subjects: subjects,
    subjectPapers: subjectpapers,
    teacherSubjectAssignments: teachersubjectassignments,
    timetableEntries: timetableentrys,
    timetablePeriodDefs: timetablePeriodDefs,
    academicPeriodDefinitions: academicperioddefinitions,
    academicYearStructures: academicyearstructures,
    educationSystemConfigurations: educationSystemConfigurations,
    examSchedules: rawInitialData.examSchedules || [],
    
    // Administration data with correct naming
    campaigns: campaigns,
    classes: classs,
    classStreams: classstreams,
    clubs: clubandsocietys,
    customers: customers,
    departments: departments,
    designations: designations,
    dormitories: dormitorys,
    partners: partners,
    schoolPeriods: schoolperiods,
    studentAttendance: studentattendances,
    studentCategories: studentcategorys,
    studentHealthRecords: studenthealthrecords,
    templateComms: templatecomms,
    
    // Finance data with correct naming
    banks: banks,
    chartOfAccounts: chartofaccounts,
    customerInvoices: customerinvoices,
    expenseCategories: expensecategorys,
    expenseClaims: expenseclaims,
    feeAdjustments: feeadjustments,
    feeTemplates: feetemplates,
    feeTemplateItems: feetemplateitems,
    financialYears: financialyears,
    generalLedgerEntries: generalledgerentrys,
    generalPayments: generalpayments,
    invoicePaymentApplications: invoicepaymentapplications,
    studentInvoices: studentinvoices,
    studentInvoiceItems: studentinvoiceitems,
    studentOpeningBalances: studentopeningbalances,
    studentPayments: studentpayments,
    studentTransportAssignments: studenttransportassignments,
    suppliers: suppliers,
    supplierInvoices: supplierinvoices,
    transportRoutes: transportroutes,
    
    // HR data with correct naming
    payrollItemTypes: payrollitemtypes,
    payrollPeriods: payrollperiods,
    payslips: payslips,
    payslipItems: payslipitems,
    staffRecurringItems: staffrecurringitems,
    staffSalarySettings: staffsalarysettings,
    
    // Inventory data with correct naming
    assetDepreciationLogs: assetdepreciationlogs,
    fixedAssets: fixedassets,
    itemCategories: itemcategorys,
    items: items,
    purchaseOrders: purchaseorders,
    purchaseOrderItems: purchaseorderitems,
    requisitions: requisitions,
    requisitionItems: requisitionitems,
    rfqs: rfqs,
    stockLevels: stocklevels,
    stockTransactions: stocktransactions,
    warehouses: warehouses,
    
    // Library data with correct naming
    bookCategories: bookcategorys,
    books: books,
    fines: fines,
    loans: loans,
    
    // Nutrition data with correct naming
    mealConsumptionLogs: mealconsumptionlogs,
    mealPlans: mealplans,
    menus: menus,
    merchants: merchants,
    studentMealPlans: studentmealplans,
    studentWallets: studentwallets,
    walletTransactions: wallettransactions,

    // Fallback to static data for other entities
    ...rawInitialData,
    
    // Add CRUD operations with correct naming
    addClass: addClass,
    updateClass: updateClass,
    deleteClass: deleteClass,
    addClassStream: addClassStream,
    updateClassStream: updateClassStream,
    deleteClassStream: deleteClassStream,
    addChartOfAccount: addChartOfAccount,
    updateChartOfAccount: updateChartOfAccount,
    deleteChartOfAccount: deleteChartOfAccount,
    addCampaign: addCampaign,
    updateCampaign: updateCampaign,
    deleteCampaign: deleteCampaign,
    addSchoolPeriod: addSchoolPeriod,
    updateSchoolPeriod: updateSchoolPeriod,
    deleteSchoolPeriod: deleteSchoolPeriod,
    addSubject: addSubject,
    updateSubject: updateSubject,
    deleteSubject: deleteSubject,
    addTimetableEntry: addTimetableEntry,
    updateTimetableEntry: updateTimetableEntry,
    deleteTimetableEntry: deleteTimetableEntry,
    addClassSubjectAllocation: addClassSubjectAllocation,
    updateClassSubjectAllocation: updateClassSubjectAllocation,
    deleteClassSubjectAllocation: deleteClassSubjectAllocation,
    addTeacherSubjectAssignment: addTeacherSubjectAssignment,
    updateTeacherSubjectAssignment: updateTeacherSubjectAssignment,
    deleteTeacherSubjectAssignment: deleteTeacherSubjectAssignment,
    addStudentSubjectEnrollment: addStudentSubjectEnrollment,
    updateStudentSubjectEnrollment: updateStudentSubjectEnrollment,
    deleteStudentSubjectEnrollment: deleteStudentSubjectEnrollment,
    getTimetableEntries: (classStreamId: number) => {
      return (timetableentrys || []).filter((entry: any) => entry.class_stream_id === classStreamId);
    }
  };

  return {
    ...fullData,
    loading,
    getStudentDetailsById,
    getStudentFinancialDetailsById,
    // Add CRUD operations
    addStudent: async (data: any) => { /* implementation */ },
    updateStudent: async (id: string, data: any) => { /* implementation */ },
    deleteStudent: async (id: string) => { /* implementation */ },
    // Student Payment CRUD operations
    addStudentPayment,
    updateStudentPayment,
    deleteStudentPayment,
    // Fee Adjustment CRUD operations
    addFeeAdjustment,
    updateFeeAdjustment,
    deleteFeeAdjustment,
    // Education System CRUD operations
    addEducationSystemConfiguration,
    updateEducationSystemConfiguration,
    deleteEducationSystemConfiguration,
    // Exam Schedule CRUD operations
    addExamSchedule: async (schedule: any) => {
      // Mock implementation - would connect to API
      console.log('Adding exam schedule:', schedule);
    },
    updateExamSchedule: async (schedule: any) => {
      // Mock implementation - would connect to API
      console.log('Updating exam schedule:', schedule);
    },
    deleteExamSchedule: async (id: string) => {
      // Mock implementation - would connect to API
      console.log('Deleting exam schedule:', id);
    },
  };
};
