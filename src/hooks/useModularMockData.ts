import { logger } from '@/utils/logging';

// ABOUTME: This file provides modular mock data using module-specific hooks for live data.
// ABOUTME: It aggregates data from all module hooks and provides a unified interface for the app context.
// DEBUG: This file has been partially restored to test the ACADEMICS module hooks.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppDataContextType, AppDataLoadingStates } from '../types';
import { createAppDataLoadingState } from '@/contexts/appData/appDataCollections';

// Import all module hooks
import { useAcademicYearData } from '@/modules/academics/data/useAcademicYearData';
import { useClassSubjectAllocationData } from '@/modules/academics/data/useClassSubjectAllocationData';
import { useEducationSystemData } from '@/modules/academics/data/useEducationSystemData';
import { useExamPaperSettingData } from '@/modules/academics/data/useExamPaperSettingData';
import { useExamSessionData } from '@/modules/academics/data/useExamSessionData';
import { useGradingSchemeData } from '@/modules/academics/data/useGradingSchemeData';
import { useGradingSchemeLevelData } from '@/modules/academics/data/useGradingSchemeLevelData';
import { useStudentExamResultData } from '@/modules/academics/data/useStudentExamResultData';
import { useStudentPaperMarkData } from '@/modules/academics/data/useStudentPaperMarkData';
import { useStudentSubjectEnrollmentData } from '@/modules/academics/data/useStudentSubjectEnrollmentData';
import { useSubjectData } from '@/modules/academics/data/useSubjectData';
import { useSubjectPaperData } from '@/modules/academics/data/useSubjectPaperData';
import { useTeacherSubjectAssignmentData } from '@/modules/academics/data/useTeacherSubjectAssignmentData';
import { useTimetableEntryData } from '@/modules/academics/data/useTimetableEntryData';
import { useTimetablePeriodDefData } from '@/modules/academics/data/useTimetablePeriodDefData';

// Import finance module hooks
import { useFeeTemplateData } from '@/modules/finance/data/useFeeTemplateData';
import { useFeeTemplateItemData } from '@/modules/finance/data/useFeeTemplateItemData';
import { useCustomerInvoiceData } from '@/modules/finance/data/useCustomerInvoiceData';
import { useStudentInvoiceData } from '@/modules/finance/data/useStudentInvoiceData';
import { useStudentOpeningBalanceData } from '@/modules/finance/data/useStudentOpeningBalanceData';
import { useStudentPaymentData } from '@/modules/finance/data/useStudentPaymentData';
import { useChartOfAccountData } from '@/modules/finance/data/useChartOfAccountData';
import { useExpenseCategoryData } from '@/modules/finance/data/useExpenseCategoryData';
import { useBankData } from '@/modules/finance/data/useBankData';
import { useSupplierData } from '@/modules/finance/data/useSupplierData';
import { useExpenseClaimData } from '@/modules/finance/data/useExpenseClaimData';
import { useSupplierInvoiceData } from '@/modules/finance/data/useSupplierInvoiceData';
import { useFeeAdjustmentData } from '@/modules/finance/data/useFeeAdjustmentData';
import { useTransportRouteData } from '@/modules/finance/data/useTransportRouteData';
import { useInvoicePaymentApplicationData } from '@/modules/finance/data/useInvoicePaymentApplicationData';
import { useGeneralPaymentData } from '@/modules/finance/data/useGeneralPaymentData';
import { useGeneralLedgerEntryData } from '@/modules/finance/data/useGeneralLedgerEntryData';
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
const createLoadingStates = (isLoading: boolean): AppDataLoadingStates => createAppDataLoadingState(isLoading);

export const useModularMockData = (): AppDataContextType => {
  logger.info('🔧 [useModularMockData] DEBUG: Running with ACADEMICS hooks enabled.');

  const [loading, setLoading] = useState<AppDataLoadingStates>(createLoadingStates(true));

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

  const academicsData = useMemo(() => ({
    academicyears, addAcademicYear, updateAcademicYear, deleteAcademicYear,
    classsubjectallocations, addClassSubjectAllocation, updateClassSubjectAllocation, deleteClassSubjectAllocation,
    exampapersettings, addExamPaperSetting, updateExamPaperSetting, deleteExamPaperSetting,
    examsessions, addExamSession, updateExamSession, deleteExamSession,
    gradingschemes, addGradingScheme, updateGradingScheme, deleteGradingScheme,
    gradingschemelevels, addGradingSchemeLevel, updateGradingSchemeLevel, deleteGradingSchemeLevel,
    studentexamresults, addStudentExamResult, updateStudentExamResult, deleteStudentExamResult,
    studentpapermarks, addStudentPaperMark, updateStudentPaperMark, deleteStudentPaperMark,
    studentsubjectenrollments, addStudentSubjectEnrollment, updateStudentSubjectEnrollment, deleteStudentSubjectEnrollment,
    subjects, addSubject, updateSubject, deleteSubject,
    subjectpapers, addSubjectPaper, updateSubjectPaper, deleteSubjectPaper,
    teachersubjectassignments, addTeacherSubjectAssignment, updateTeacherSubjectAssignment, deleteTeacherSubjectAssignment,
    timetableentrys, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry,
    timetablePeriodDefs, addTimetablePeriodDef, updateTimetablePeriodDef, deleteTimetablePeriodDef,
    educationSystemConfigurations, addEducationSystemConfiguration, updateEducationSystemConfiguration, deleteEducationSystemConfiguration
  }), [
    academicyears, addAcademicYear, updateAcademicYear, deleteAcademicYear,
    classsubjectallocations, addClassSubjectAllocation, updateClassSubjectAllocation, deleteClassSubjectAllocation,
    exampapersettings, addExamPaperSetting, updateExamPaperSetting, deleteExamPaperSetting,
    examsessions, addExamSession, updateExamSession, deleteExamSession,
    gradingschemes, addGradingScheme, updateGradingScheme, deleteGradingScheme,
    gradingschemelevels, addGradingSchemeLevel, updateGradingSchemeLevel, deleteGradingSchemeLevel,
    studentexamresults, addStudentExamResult, updateStudentExamResult, deleteStudentExamResult,
    studentpapermarks, addStudentPaperMark, updateStudentPaperMark, deleteStudentPaperMark,
    studentsubjectenrollments, addStudentSubjectEnrollment, updateStudentSubjectEnrollment, deleteStudentSubjectEnrollment,
    subjects, addSubject, updateSubject, deleteSubject,
    subjectpapers, addSubjectPaper, updateSubjectPaper, deleteSubjectPaper,
    teachersubjectassignments, addTeacherSubjectAssignment, updateTeacherSubjectAssignment, deleteTeacherSubjectAssignment,
    timetableentrys, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry,
    timetablePeriodDefs, addTimetablePeriodDef, updateTimetablePeriodDef, deleteTimetablePeriodDef,
    educationSystemConfigurations, addEducationSystemConfiguration, updateEducationSystemConfiguration, deleteEducationSystemConfiguration
  ]);

  // --- FINANCE HOOKS (ENABLED) ---
  const { data: feeTemplates, create: createFeeTemplateRecord, update: updateFeeTemplateRecord, remove: deleteFeeTemplateRecord } = useFeeTemplateData();
  const { data: feeTemplateItems, create: createFeeTemplateItemRecord, update: updateFeeTemplateItemRecord, remove: deleteFeeTemplateItemRecord } = useFeeTemplateItemData();
  const { data: studentPayments, create: createStudentPaymentRecord, update: updateStudentPaymentRecord, remove: deleteStudentPaymentRecord } = useStudentPaymentData();
  const { data: studentOpeningBalances, create: createStudentOpeningBalanceRecord, update: updateStudentOpeningBalanceRecord, remove: deleteStudentOpeningBalanceRecord } = useStudentOpeningBalanceData();
  const { data: customerInvoices, create: createCustomerInvoiceRecord, update: updateCustomerInvoiceRecord, remove: deleteCustomerInvoiceRecord } = useCustomerInvoiceData();
  const { data: studentInvoices, create: createStudentInvoiceRecord, update: updateStudentInvoiceRecord, remove: deleteStudentInvoiceRecord } = useStudentInvoiceData();
  const { data: chartOfAccounts, create: createChartOfAccountRecord, update: updateChartOfAccountRecord, remove: deleteChartOfAccountRecord } = useChartOfAccountData();
  const { data: expenseCategories, create: createExpenseCategoryRecord, update: updateExpenseCategoryRecord, remove: deleteExpenseCategoryRecord } = useExpenseCategoryData();
  const { data: banks, create: createBankRecord, update: updateBankRecord, remove: deleteBankRecord } = useBankData();
  const { data: suppliers, create: createSupplierRecord, update: updateSupplierRecord, remove: deleteSupplierRecord } = useSupplierData();
  const { data: expenseClaims, create: createExpenseClaimRecord, update: updateExpenseClaimRecord, remove: deleteExpenseClaimRecord } = useExpenseClaimData();
  const { data: supplierInvoices, create: createSupplierInvoiceRecord, update: updateSupplierInvoiceRecord, remove: deleteSupplierInvoiceRecord } = useSupplierInvoiceData();
  const { data: feeAdjustments, create: createFeeAdjustmentRecord, update: updateFeeAdjustmentRecord, remove: deleteFeeAdjustmentRecord } = useFeeAdjustmentData();
  const { data: transportRoutes, create: createTransportRouteRecord, update: updateTransportRouteRecord, remove: deleteTransportRouteRecord } = useTransportRouteData();
  const { data: invoicePaymentApplications, create: createInvoicePaymentApplicationRecord, update: updateInvoicePaymentApplicationRecord, remove: deleteInvoicePaymentApplicationRecord } = useInvoicePaymentApplicationData();
  const { data: generalPayments, create: createGeneralPaymentRecord, update: updateGeneralPaymentRecord, remove: deleteGeneralPaymentRecord } = useGeneralPaymentData();
  const { data: generalLedgerEntries, create: createGeneralLedgerEntryRecord, update: updateGeneralLedgerEntryRecord, remove: deleteGeneralLedgerEntryRecord } = useGeneralLedgerEntryData();

  const students = useMemo(() => rawInitialData.students || [], []);
  const customers = useMemo(() => rawInitialData.customers || [], []);
  const schoolPeriods = useMemo(() => rawInitialData.schoolPeriods || [], []);
  const studentCategories = useMemo(() => rawInitialData.studentCategories || [], []);

  const resolveStudentName = useCallback((studentId?: string) => {
    if (!studentId) {
      return undefined;
    }

    const student = students.find((entry: any) => entry.id === studentId);
    if (!student) {
      return undefined;
    }

    return student.display_name || [student.first_name, student.last_name].filter(Boolean).join(' ').trim() || undefined;
  }, [students]);

  const resolveCustomerName = useCallback((customerId?: number) => {
    if (customerId === undefined) {
      return undefined;
    }

    const customer = customers.find((entry: any) => entry.id === customerId);
    return customer?.name || customer?.display_name || undefined;
  }, [customers]);

  const resolveSchoolPeriodName = useCallback((schoolPeriodId?: number) => {
    if (schoolPeriodId === undefined) {
      return undefined;
    }

    return schoolPeriods.find((entry: any) => entry.id === schoolPeriodId)?.name;
  }, [schoolPeriods]);

  const resolveStudentCategoryName = useCallback((studentCategoryId?: number) => {
    if (studentCategoryId === undefined) {
      return undefined;
    }

    return studentCategories.find((entry: any) => entry.id === studentCategoryId)?.name;
  }, [studentCategories]);

  const resolveSupplierName = useCallback((supplierId?: number) => {
    if (supplierId === undefined) {
      return undefined;
    }

    return suppliers.find((entry: any) => Number(entry.id) === Number(supplierId))?.name;
  }, [suppliers]);

  const financeData = useMemo(() => ({
    feeTemplates,
    feeTemplateItems,
    chartOfAccounts,
    expenseCategories,
    banks,
    suppliers,
    expenseClaims,
    studentPayments,
    studentOpeningBalances,
    customerInvoices,
    studentInvoices,
    supplierInvoices,
    feeAdjustments,
    transportRoutes,
    invoicePaymentApplications,
    generalPayments,
    generalLedgerEntries,
    addFeeTemplate: async (templateData: any) => createFeeTemplateRecord({
      ...templateData,
      items: templateData.items || [],
      school_period_name: resolveSchoolPeriodName(templateData.school_period_id),
      student_category_name: resolveStudentCategoryName(templateData.student_category_id)
    }),
    updateFeeTemplate: async (updatedTemplate: any) => updateFeeTemplateRecord(updatedTemplate.id, {
      ...updatedTemplate,
      items: updatedTemplate.items || [],
      school_period_name: resolveSchoolPeriodName(updatedTemplate.school_period_id),
      student_category_name: resolveStudentCategoryName(updatedTemplate.student_category_id)
    }),
    deleteFeeTemplate: async (templateId: number) => deleteFeeTemplateRecord(templateId),
    addFeeTemplateItem: async (itemData: any) => createFeeTemplateItemRecord(itemData),
    updateFeeTemplateItem: async (itemId: string, updatedItem: any) => updateFeeTemplateItemRecord(itemId, updatedItem),
    removeFeeTemplateItem: async (itemId: string) => deleteFeeTemplateItemRecord(itemId),
    addChartOfAccount: async (accountData: any) => createChartOfAccountRecord(accountData),
    updateChartOfAccount: async (id: string, updatedAccount: any) => updateChartOfAccountRecord(id, updatedAccount),
    deleteChartOfAccount: async (id: string) => deleteChartOfAccountRecord(id),
    addExpenseCategory: async (categoryData: any) => createExpenseCategoryRecord(categoryData),
    updateExpenseCategory: async (id: string, updatedCategory: any) => updateExpenseCategoryRecord(id, updatedCategory),
    removeExpenseCategory: async (id: string) => deleteExpenseCategoryRecord(id),
    addBank: async (bankData: any) => createBankRecord(bankData),
    updateBank: async (id: string, updatedBank: any) => updateBankRecord(id, updatedBank),
    removeBank: async (id: string) => deleteBankRecord(id),
    addSupplier: async (supplierData: any) => createSupplierRecord(supplierData),
    updateSupplier: async (id: number, updatedSupplier: any) => updateSupplierRecord(id, updatedSupplier),
    removeSupplier: async (id: number) => deleteSupplierRecord(id),
    addStudentPayment: async (paymentData: any) => createStudentPaymentRecord({
      ...paymentData,
      student_name: resolveStudentName(paymentData.student_id)
    }),
    updateStudentPayment: async (paymentId: string, updatedPayment: any) => updateStudentPaymentRecord(paymentId, {
      ...updatedPayment,
      student_name: resolveStudentName(updatedPayment.student_id)
    }),
    deleteStudentPayment: async (paymentId: string) => deleteStudentPaymentRecord(paymentId),
    addExpenseClaim: async (claimData: any) => createExpenseClaimRecord({
      ...claimData,
      supplier_name: resolveSupplierName(claimData.supplier_id)
    }),
    updateExpenseClaim: async (id: string, updatedClaim: any) => updateExpenseClaimRecord(id, {
      ...updatedClaim,
      supplier_name: resolveSupplierName(updatedClaim.supplier_id)
    }),
    removeExpenseClaim: async (id: string) => deleteExpenseClaimRecord(id),
    addStudentOpeningBalance: async (balanceData: any) => createStudentOpeningBalanceRecord({
      ...balanceData,
      is_billed: balanceData.is_billed || false,
      student_name: resolveStudentName(balanceData.student_id)
    }),
    updateStudentOpeningBalance: async (updatedBalance: any) => updateStudentOpeningBalanceRecord(updatedBalance.id, {
      ...updatedBalance,
      is_billed: updatedBalance.is_billed || false,
      student_name: resolveStudentName(updatedBalance.student_id)
    }),
    deleteStudentOpeningBalance: async (balanceId: string) => deleteStudentOpeningBalanceRecord(balanceId),
    addCustomerInvoice: async (invoiceData: any) => createCustomerInvoiceRecord({
      ...invoiceData,
      items: invoiceData.items || [],
      total_amount: invoiceData.total_amount ?? 0,
      customer_name: resolveCustomerName(invoiceData.customer_id)
    }),
    updateCustomerInvoice: async (updatedInvoice: any) => updateCustomerInvoiceRecord(updatedInvoice.id, {
      ...updatedInvoice,
      items: updatedInvoice.items || [],
      total_amount: updatedInvoice.total_amount ?? 0,
      customer_name: resolveCustomerName(updatedInvoice.customer_id)
    }),
    deleteCustomerInvoice: async (invoiceId: string) => deleteCustomerInvoiceRecord(invoiceId),
    addSupplierInvoice: async (invoiceData: any) => createSupplierInvoiceRecord({
      ...invoiceData,
      supplier_name: resolveSupplierName(invoiceData.supplier_id)
    }),
    updateSupplierInvoice: async (id: string, updatedInvoice: any) => updateSupplierInvoiceRecord(id, {
      ...updatedInvoice,
      supplier_name: resolveSupplierName(updatedInvoice.supplier_id)
    }),
    removeSupplierInvoice: async (id: string) => deleteSupplierInvoiceRecord(id),
    addStudentInvoice: async (invoiceData: any) => createStudentInvoiceRecord({
      ...invoiceData,
      items: invoiceData.items || [],
      total_amount_billed: invoiceData.total_amount_billed ?? 0,
      amount_paid: invoiceData.amount_paid ?? 0,
      student_name: resolveStudentName(invoiceData.student_id),
      school_period_name: resolveSchoolPeriodName(invoiceData.school_period_id)
    }),
    updateStudentInvoice: async (updatedInvoice: any) => updateStudentInvoiceRecord(updatedInvoice.id, {
      ...updatedInvoice,
      items: updatedInvoice.items || [],
      total_amount_billed: updatedInvoice.total_amount_billed ?? 0,
      amount_paid: updatedInvoice.amount_paid ?? 0,
      student_name: resolveStudentName(updatedInvoice.student_id),
      school_period_name: resolveSchoolPeriodName(updatedInvoice.school_period_id)
    }),
    deleteStudentInvoice: async (invoiceId: string) => deleteStudentInvoiceRecord(invoiceId),
    addFeeAdjustment: async (adjustmentData: any) => createFeeAdjustmentRecord({
      ...adjustmentData,
      student_name: resolveStudentName(adjustmentData.student_id)
    }),
    updateFeeAdjustment: async (id: string, updatedAdjustment: any) => updateFeeAdjustmentRecord(id, {
      ...updatedAdjustment,
      student_name: resolveStudentName(updatedAdjustment.student_id)
    }),
    deleteFeeAdjustment: async (id: string) => deleteFeeAdjustmentRecord(id),
    addTransportRoute: async (routeData: any) => createTransportRouteRecord(routeData),
    updateTransportRoute: async (id: string, updatedRoute: any) => updateTransportRouteRecord(id, updatedRoute),
    deleteTransportRoute: async (id: string) => deleteTransportRouteRecord(id),
    addInvoicePaymentApplication: async (applicationData: any) => createInvoicePaymentApplicationRecord(applicationData),
    updateInvoicePaymentApplication: async (id: string, updatedApplication: any) => updateInvoicePaymentApplicationRecord(id, updatedApplication),
    removeInvoicePaymentApplication: async (id: string) => deleteInvoicePaymentApplicationRecord(id),
    addGeneralPayment: async (paymentData: any) => createGeneralPaymentRecord(paymentData),
    updateGeneralPayment: async (id: string, updatedPayment: any) => updateGeneralPaymentRecord(id, updatedPayment),
    removeGeneralPayment: async (id: string) => deleteGeneralPaymentRecord(id),
    addGeneralLedgerEntry: async (entryData: any) => createGeneralLedgerEntryRecord(entryData),
    updateGeneralLedgerEntry: async (id: string, updatedEntry: any) => updateGeneralLedgerEntryRecord(id, updatedEntry),
    removeGeneralLedgerEntry: async (id: string) => deleteGeneralLedgerEntryRecord(id)
  }), [
    feeTemplates,
    feeTemplateItems,
    studentPayments,
    studentOpeningBalances,
    customerInvoices,
    studentInvoices,
    createFeeTemplateRecord,
    updateFeeTemplateRecord,
    deleteFeeTemplateRecord,
    createFeeTemplateItemRecord,
    updateFeeTemplateItemRecord,
    deleteFeeTemplateItemRecord,
    createChartOfAccountRecord,
    updateChartOfAccountRecord,
    deleteChartOfAccountRecord,
    createExpenseCategoryRecord,
    updateExpenseCategoryRecord,
    deleteExpenseCategoryRecord,
    createBankRecord,
    updateBankRecord,
    deleteBankRecord,
    createSupplierRecord,
    updateSupplierRecord,
    deleteSupplierRecord,
    createExpenseClaimRecord,
    updateExpenseClaimRecord,
    deleteExpenseClaimRecord,
    createStudentPaymentRecord,
    updateStudentPaymentRecord,
    deleteStudentPaymentRecord,
    createStudentOpeningBalanceRecord,
    updateStudentOpeningBalanceRecord,
    deleteStudentOpeningBalanceRecord,
    createCustomerInvoiceRecord,
    updateCustomerInvoiceRecord,
    deleteCustomerInvoiceRecord,
    createStudentInvoiceRecord,
    updateStudentInvoiceRecord,
    deleteStudentInvoiceRecord,
    createSupplierInvoiceRecord,
    updateSupplierInvoiceRecord,
    deleteSupplierInvoiceRecord,
    createFeeAdjustmentRecord,
    updateFeeAdjustmentRecord,
    deleteFeeAdjustmentRecord,
    createTransportRouteRecord,
    updateTransportRouteRecord,
    deleteTransportRouteRecord,
    createInvoicePaymentApplicationRecord,
    updateInvoicePaymentApplicationRecord,
    deleteInvoicePaymentApplicationRecord,
    createGeneralPaymentRecord,
    updateGeneralPaymentRecord,
    deleteGeneralPaymentRecord,
    createGeneralLedgerEntryRecord,
    updateGeneralLedgerEntryRecord,
    deleteGeneralLedgerEntryRecord,
    resolveSchoolPeriodName,
    resolveStudentCategoryName,
    resolveStudentName,
    resolveCustomerName,
    resolveSupplierName
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(createLoadingStates(false));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const emptyFunc = async () => { logger.warn("Called a no-op function from debug mock data."); };
  const emptyGetFunc = async () => {
    logger.warn("Called a no-op function from debug mock data.");
    return null;
  };

  return useMemo(() => ({
    // --- ACADEMICS DATA ---
    academicyears: academicsData.academicyears || [],
    classsubjectallocations: academicsData.classsubjectallocations || [],
    exampapersettings: academicsData.exampapersettings || [],
    examsessions: academicsData.examsessions || [],
    gradingschemes: academicsData.gradingschemes || [],
    gradingschemelevels: academicsData.gradingschemelevels || [],
    studentexamresults: academicsData.studentexamresults || [],
    studentpapermarks: academicsData.studentpapermarks || [],
    studentsubjectenrollments: academicsData.studentsubjectenrollments || [],
    subjects: academicsData.subjects || [],
    subjectpapers: academicsData.subjectpapers || [],
    teachersubjectassignments: academicsData.teachersubjectassignments || [],
    timetableentrys: academicsData.timetableentrys || [],
    timetablePeriodDefs: academicsData.timetablePeriodDefs || [],
    educationSystemConfigurations: academicsData.educationSystemConfigurations || [],

    // --- FINANCE DATA ---
    feeTemplates: financeData.feeTemplates || [],
    feeTemplateItems: financeData.feeTemplateItems || [],
    chartOfAccounts: financeData.chartOfAccounts || [],
    expenseCategories: financeData.expenseCategories || [],
    banks: financeData.banks || [],
    suppliers: financeData.suppliers || [],
    expenseClaims: financeData.expenseClaims || [],

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
    studentInvoices: financeData.studentInvoices || [],
    studentInvoiceItems: rawInitialData.studentInvoiceItems || [],
    studentPayments: financeData.studentPayments || [],
    feeAdjustments: financeData.feeAdjustments || [],
    invoicePaymentApplications: financeData.invoicePaymentApplications || [],
    customerInvoices: financeData.customerInvoices || [],
    supplierInvoices: financeData.supplierInvoices || [],
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
    studentOpeningBalances: financeData.studentOpeningBalances || [],
    transportRoutes: financeData.transportRoutes || [],
    studentTransportAssignments: rawInitialData.studentTransportAssignments || [],
    generalPayments: financeData.generalPayments || [],
    generalLedgerEntries: financeData.generalLedgerEntries || [],
    rfqs: rawInitialData.rfqs || [],
    
    // --- ADDITIONAL PROPERTIES ---
    loading,
    error: null,
    refresh: emptyFunc,
    getStudentDetailsById: emptyGetFunc,
    getStudentFinancialDetailsById: emptyGetFunc,
    // --- ACADEMICS CRUD (LIVE) ---
    addAcademicYear: academicsData.addAcademicYear, updateAcademicYear: academicsData.updateAcademicYear, deleteAcademicYear: academicsData.deleteAcademicYear,
    addClassSubjectAllocation: academicsData.addClassSubjectAllocation, updateClassSubjectAllocation: academicsData.updateClassSubjectAllocation, deleteClassSubjectAllocation: academicsData.deleteClassSubjectAllocation,
    addExamPaperSetting: academicsData.addExamPaperSetting, updateExamPaperSetting: academicsData.updateExamPaperSetting, deleteExamPaperSetting: academicsData.deleteExamPaperSetting,
    addExamSession: academicsData.addExamSession, updateExamSession: academicsData.updateExamSession, deleteExamSession: academicsData.deleteExamSession,
    addGradingScheme: academicsData.addGradingScheme, updateGradingScheme: academicsData.updateGradingScheme, deleteGradingScheme: academicsData.deleteGradingScheme,
    addGradingSchemeLevel: academicsData.addGradingSchemeLevel, updateGradingSchemeLevel: academicsData.updateGradingSchemeLevel, deleteGradingSchemeLevel: academicsData.deleteGradingSchemeLevel,
    addStudentExamResult: academicsData.addStudentExamResult, updateStudentExamResult: academicsData.updateStudentExamResult, deleteStudentExamResult: academicsData.deleteStudentExamResult,
    addStudentPaperMark: academicsData.addStudentPaperMark, updateStudentPaperMark: academicsData.updateStudentPaperMark, deleteStudentPaperMark: academicsData.deleteStudentPaperMark,
    addStudentSubjectEnrollment: academicsData.addStudentSubjectEnrollment, updateStudentSubjectEnrollment: academicsData.updateStudentSubjectEnrollment, deleteStudentSubjectEnrollment: academicsData.deleteStudentSubjectEnrollment,
    addSubject: academicsData.addSubject, updateSubject: academicsData.updateSubject, deleteSubject: academicsData.deleteSubject,
    addSubjectPaper: academicsData.addSubjectPaper, updateSubjectPaper: academicsData.updateSubjectPaper, deleteSubjectPaper: academicsData.deleteSubjectPaper,
    addTeacherSubjectAssignment: academicsData.addTeacherSubjectAssignment, updateTeacherSubjectAssignment: academicsData.updateTeacherSubjectAssignment, deleteTeacherSubjectAssignment: academicsData.deleteTeacherSubjectAssignment,
    addTimetableEntry: academicsData.addTimetableEntry, updateTimetableEntry: academicsData.updateTimetableEntry, deleteTimetableEntry: academicsData.deleteTimetableEntry,
    addTimetablePeriodDef: academicsData.addTimetablePeriodDef, updateTimetablePeriodDef: academicsData.updateTimetablePeriodDef, deleteTimetablePeriodDef: academicsData.deleteTimetablePeriodDef,
    addEducationSystemConfiguration: academicsData.addEducationSystemConfiguration, updateEducationSystemConfiguration: academicsData.updateEducationSystemConfiguration, deleteEducationSystemConfiguration: academicsData.deleteEducationSystemConfiguration,
    getTimetableEntries: (classStreamId: number) => {
      return (academicsData.timetableentrys || []).filter((entry: any) => entry.class_stream_id === classStreamId);
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
    addChartOfAccount: financeData.addChartOfAccount, updateChartOfAccount: financeData.updateChartOfAccount, deleteChartOfAccount: financeData.deleteChartOfAccount,
    addExpenseCategory: financeData.addExpenseCategory, updateExpenseCategory: financeData.updateExpenseCategory, removeExpenseCategory: financeData.removeExpenseCategory,
    addBank: financeData.addBank, updateBank: financeData.updateBank, removeBank: financeData.removeBank,
    addSupplier: financeData.addSupplier, updateSupplier: financeData.updateSupplier, removeSupplier: financeData.removeSupplier,
    addFeeTemplate: financeData.addFeeTemplate, updateFeeTemplate: financeData.updateFeeTemplate, deleteFeeTemplate: financeData.deleteFeeTemplate,
    addFeeTemplateItem: financeData.addFeeTemplateItem, updateFeeTemplateItem: financeData.updateFeeTemplateItem, removeFeeTemplateItem: financeData.removeFeeTemplateItem,
    addExpenseClaim: financeData.addExpenseClaim, updateExpenseClaim: financeData.updateExpenseClaim, removeExpenseClaim: financeData.removeExpenseClaim,
    addCustomerInvoice: financeData.addCustomerInvoice, updateCustomerInvoice: financeData.updateCustomerInvoice, deleteCustomerInvoice: financeData.deleteCustomerInvoice,
    addSupplierInvoice: financeData.addSupplierInvoice, updateSupplierInvoice: financeData.updateSupplierInvoice, removeSupplierInvoice: financeData.removeSupplierInvoice,
    addStudentOpeningBalance: financeData.addStudentOpeningBalance, updateStudentOpeningBalance: financeData.updateStudentOpeningBalance, deleteStudentOpeningBalance: financeData.deleteStudentOpeningBalance,
    addFeeAdjustment: financeData.addFeeAdjustment, updateFeeAdjustment: financeData.updateFeeAdjustment, deleteFeeAdjustment: financeData.deleteFeeAdjustment,
    addTransportRoute: financeData.addTransportRoute, updateTransportRoute: financeData.updateTransportRoute, deleteTransportRoute: financeData.deleteTransportRoute,
    addStudentTransportAssignment: emptyFunc, updateStudentTransportAssignment: emptyFunc, deleteStudentTransportAssignment: emptyFunc,
    addStudentInvoice: financeData.addStudentInvoice, updateStudentInvoice: financeData.updateStudentInvoice, deleteStudentInvoice: financeData.deleteStudentInvoice,
    addStudentInvoiceItem: emptyFunc, updateStudentInvoiceItem: emptyFunc, deleteStudentInvoiceItem: emptyFunc,
    addStudentPayment: financeData.addStudentPayment, updateStudentPayment: financeData.updateStudentPayment, deleteStudentPayment: financeData.deleteStudentPayment,
    addInvoicePaymentApplication: financeData.addInvoicePaymentApplication, updateInvoicePaymentApplication: financeData.updateInvoicePaymentApplication, removeInvoicePaymentApplication: financeData.removeInvoicePaymentApplication,
    addGeneralPayment: financeData.addGeneralPayment, updateGeneralPayment: financeData.updateGeneralPayment, removeGeneralPayment: financeData.removeGeneralPayment,
    addGeneralLedgerEntry: financeData.addGeneralLedgerEntry, updateGeneralLedgerEntry: financeData.updateGeneralLedgerEntry, removeGeneralLedgerEntry: financeData.removeGeneralLedgerEntry,
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
  }), [academicsData, financeData, loading]);
};
