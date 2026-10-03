// ABOUTME: AppData collection normalization and loading-state helper utilities
// ABOUTME: Centralizes pure mapping logic used by AppDataContext and compatibility tests

import type { AppDataLoadingStates } from '../../core/types';

const APP_DATA_ARRAY_KEYS = [
  'roles',
  'users',
  'students',
  'staff',
  'classes',
  'classStreams',
  'subjects',
  'departments',
  'designations',
  'studentCategories',
  'dormitories',
  'academicYears',
  'schoolPeriods',
  'academicYearStructures',
  'academicPeriodDefinitions',
  'financialYears',
  'partners',
  'clubs',
  'customers',
  'studentHealthRecords',
  'studentAttendance',
  'timetablePeriodDefs',
  'templatesComm',
  'campaigns',
  'subjectPapers',
  'examSessions',
  'examPaperSettings',
  'gradingSchemes',
  'chartOfAccounts',
  'expenseCategories',
  'banks',
  'suppliers',
  'supplierContracts',
  'feeTemplates',
  'feeTemplateItems',
  'expenseClaims',
  'studentInvoices',
  'studentInvoiceItems',
  'studentPayments',
  'feeAdjustments',
  'invoicePaymentApplications',
  'customerInvoices',
  'supplierInvoices',
  'studentExamResults',
  'classSubjectAllocations',
  'teacherSubjectAssignments',
  'studentSubjectEnrollments',
  'timetableEntries',
  'warehouses',
  'itemCategoriesInv',
  'itemsInv',
  'fixedAssets',
  'requisitions',
  'purchaseOrders',
  'stockLevels',
  'stockTransactions',
  'payrollPeriods',
  'payrollItemTypes',
  'staffSalarySettings',
  'payslips',
  'bookCategories',
  'books',
  'loans',
  'fines',
  'parentsGuardians',
  'workflows',
  'mealPlans',
  'menus',
  'merchants',
  'auditLogs',
  'studentOpeningBalances',
  'transportRoutes',
  'studentTransportAssignments',
  'generalPayments',
  'generalLedgerEntries',
  'rfqs',
  'educationSystemConfigurations',
  'studentImportSessions',
  'studentImportRecords',
  'studentClearances',
  'studentClearanceRequests',
  'disciplinaryCases',
  'disciplinaryRecords'
] as const;

type AppDataArrayKey = typeof APP_DATA_ARRAY_KEYS[number];

const COLLECTION_KEY_ALIASES: Record<string, AppDataArrayKey | 'schoolDetails'> = {
  app_settings: 'schoolDetails',
  school_details: 'schoolDetails',
  users: 'users',
  roles: 'roles',
  students: 'students',
  staff: 'staff',
  classes: 'classes',
  class_streams: 'classStreams',
  subjects: 'subjects',
  departments: 'departments',
  designations: 'designations',
  student_categories: 'studentCategories',
  dormitories: 'dormitories',
  academic_years: 'academicYears',
  school_periods: 'schoolPeriods',
  academic_year_structures: 'academicYearStructures',
  academic_period_definitions: 'academicPeriodDefinitions',
  financial_years: 'financialYears',
  partners: 'partners',
  clubs: 'clubs',
  customers: 'customers',
  student_health_records: 'studentHealthRecords',
  student_attendance: 'studentAttendance',
  timetable_period_definitions: 'timetablePeriodDefs',
  message_campaigns: 'campaigns',
  communication_templates: 'templatesComm',
  subject_papers: 'subjectPapers',
  exam_sessions: 'examSessions',
  exam_paper_settings: 'examPaperSettings',
  grading_schemes: 'gradingSchemes',
  chart_of_accounts: 'chartOfAccounts',
  expense_categories: 'expenseCategories',
  banks: 'banks',
  suppliers: 'suppliers',
  supplier_contracts: 'supplierContracts',
  fee_templates: 'feeTemplates',
  fee_template_items: 'feeTemplateItems',
  expense_claims: 'expenseClaims',
  student_invoices: 'studentInvoices',
  student_invoice_items: 'studentInvoiceItems',
  student_payments: 'studentPayments',
  fee_adjustments: 'feeAdjustments',
  invoice_payment_applications: 'invoicePaymentApplications',
  customer_invoices: 'customerInvoices',
  supplier_invoices: 'supplierInvoices',
  student_exam_results: 'studentExamResults',
  class_subject_allocations: 'classSubjectAllocations',
  teacher_subject_assignments: 'teacherSubjectAssignments',
  student_subject_enrollments: 'studentSubjectEnrollments',
  timetable_entries: 'timetableEntries',
  warehouses: 'warehouses',
  item_categories_inv: 'itemCategoriesInv',
  items_inv: 'itemsInv',
  fixed_assets: 'fixedAssets',
  requisitions: 'requisitions',
  purchase_orders: 'purchaseOrders',
  stock_levels: 'stockLevels',
  stock_transactions: 'stockTransactions',
  payroll_periods: 'payrollPeriods',
  payroll_item_types: 'payrollItemTypes',
  staff_salary_settings: 'staffSalarySettings',
  payslips: 'payslips',
  book_categories: 'bookCategories',
  books: 'books',
  loans: 'loans',
  fines: 'fines',
  parents_guardians: 'parentsGuardians',
  workflows: 'workflows',
  meal_plans: 'mealPlans',
  menus: 'menus',
  merchants: 'merchants',
  audit_logs: 'auditLogs',
  student_opening_balances: 'studentOpeningBalances',
  transport_routes: 'transportRoutes',
  student_transport_assignments: 'studentTransportAssignments',
  general_payments: 'generalPayments',
  general_ledger_entries: 'generalLedgerEntries',
  rfqs: 'rfqs',
  education_system_configurations: 'educationSystemConfigurations',
  student_import_sessions: 'studentImportSessions',
  student_import_records: 'studentImportRecords',
  student_clearances: 'studentClearances',
  student_clearance_requests: 'studentClearanceRequests',
  disciplinary_cases: 'disciplinaryCases',
  disciplinary_records: 'disciplinaryRecords'
};

const snakeToCamel = (value: string): string =>
  value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

export const createAppDataLoadingState = (isLoading: boolean): AppDataLoadingStates => {
  const loadingEntries = APP_DATA_ARRAY_KEYS.reduce<Record<string, boolean>>((accumulator, key) => {
    accumulator[key] = isLoading;
    return accumulator;
  }, {
    all: isLoading,
    schoolDetails: isLoading
  });

  return loadingEntries as AppDataLoadingStates;
};

export const normalizeAppDataCollections = (rawData: Record<string, any[] | undefined>) => {
  const normalizedData = APP_DATA_ARRAY_KEYS.reduce<Record<string, any[]>>((accumulator, key) => {
    accumulator[key] = [];
    return accumulator;
  }, {});

  normalizedData.schoolDetails = [];

  Object.entries(rawData).forEach(([collectionName, collectionValue]) => {
    const alias = COLLECTION_KEY_ALIASES[collectionName] || COLLECTION_KEY_ALIASES[snakeToCamel(collectionName)];
    const normalizedValue = Array.isArray(collectionValue) ? collectionValue : [];

    if (alias) {
      normalizedData[alias] = normalizedValue;
      return;
    }

    const camelKey = snakeToCamel(collectionName);
    if (camelKey in normalizedData) {
      normalizedData[camelKey] = normalizedValue;
    }
  });

  return normalizedData as Record<AppDataArrayKey | 'schoolDetails', any[]>;
};
