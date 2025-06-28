// ABOUTME: This file defines global TypeScript interfaces, enums, and type aliases.
// ABOUTME: It acts as a central re-export hub for all module-specific types.

// =================================================================================
// TYPE & ENUM RE-EXPORTS FROM MODULES
// =================================================================================
export * from './modules/academics/data/types';
export * from './modules/administration/data/types';
export * from './modules/finance/data/types';
export * from './modules/hr/data/types';
export * from './modules/inventory/data/types';
export * from './modules/library/data/types';
export * from './modules/nutrition/data/types';


// =================================================================================
// UI & NAVIGATION TYPES
// =================================================================================
export interface IconProps extends React.SVGProps<SVGSVGElement> {}

export interface NavItem {
  name: string; // This will be treated as a translation key
  path: string;
  icon?: React.ReactElement<IconProps> | React.ReactNode;
  isGroup?: boolean;
  modulePath?: string;
  children?: NavItem[];
}

export interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

export interface BarChartData {
  name: string;
  uv?: number;
  pv?: number;
  amt?: number;
  [key: string]: string | number | undefined;
}

// =================================================================================
// CORE ENUMERATIONS (Used across multiple modules or fundamental to the app)
// =================================================================================
// These are truly global enums that don't fit into a single module.
export enum PersonGender { MALE = 'Male', FEMALE = 'Female', OTHER = 'Other' }
export enum StudentStatus { ACTIVE = 'Active', INACTIVE = 'Inactive', ALUMNI = 'Alumni', SUSPENDED = 'Suspended', EXPELLED = 'Expelled', TRANSFERRED = 'Transferred Out' }
export enum UserType { STAFF = 'Staff', STUDENT = 'Student', PARENT = 'Parent', SYSTEM = 'System' }
export enum AuditAction { CREATE = 'Create', UPDATE = 'Update', DELETE = 'Delete', LOGIN = 'Login', LOGOUT = 'Logout', VIEW = 'View' }

// Note: Module-specific enums like PayrollPeriodStatus are now imported from their modules via the re-exports above.

// Import Module-specific types for AppDataContextType and RawInitialData
import {
    AcademicsSubjectType, AcademicsSubjectPaperType, AcademicsClassSubjectAllocationType,
    AcademicsTeacherSubjectAssignmentType, AcademicsStudentSubjectEnrollmentType, AcademicsExamPaperSettingType,
    AcademicsExamSessionType, AcademicsGradingSchemeType, AcademicsStudentExamResultWithDetailsType,
    AcademicsTimetablePeriodDefType, AcademicsTimetableEntryType, AcademicsExamResultSummaryType
} from './modules/academics/data/types';

import {
    LibBookCategoryType, LibBookType, LibLoanType, LibFineType, LibBookStatusEnum, LibFineStatusEnum
} from './modules/library/data/types';

import {
    InvRFQType, InvWarehouseType, InvItemCategoryType, InvItemType, InvFixedAssetType, InvAssetDepreciationLogType, InvStockLevelType,
    InvStockTransactionType, InvRequisitionItemType, InvRequisitionType, InvPurchaseOrderItemType, InvPurchaseOrderType, InvRequisitionStatusEnum
} from './modules/inventory/data/types';

import {
    NutrMealPlanType, NutrStudentMealPlanType, NutrMenuType, NutrMealConsumptionLogType, NutrWalletTransactionType,
    NutrStudentWalletType, NutrMerchantType, NutrStudentMealPlanStatusEnum, NutrMealTypeEnum, NutrWalletTransactionType as NutrWalletTransactionTypeEnum
} from './modules/nutrition/data/types';

import {
    AdminPartnerType, AdminClubAndSocietyType, AdminCustomerType, AdminStudentHealthRecordType, AdminStudentAttendanceType,
    AdminTemplateCommType, AdminCampaignType
} from './modules/administration/data/types';

import {
    FinChartOfAccountType, FinExpenseCategoryType, FinBankType, FinSupplierType, FinFeeTemplateItemType, FinFeeTemplateType,
    FinExpenseClaimType, FinStudentOpeningBalanceType, FinFeeAdjustmentType, FinTransportRouteType, FinStudentTransportAssignmentType,
    FinStudentInvoiceItemType, FinStudentInvoiceType, FinStudentPaymentType, FinInvoicePaymentApplicationType, FinCustomerInvoiceItemType,
    FinCustomerInvoiceType, FinSupplierInvoiceType, FinGeneralPaymentItemType, FinGeneralPaymentType, FinGeneralLedgerEntryType,
    FinFinancialYearStatusEnum, FinInvoiceStatusEnum, FinCustomerInvoiceStatusEnum
} from './modules/finance/data/types';

import {
    HRPayrollPeriodType, HRPayrollItemTypeType, HRStaffRecurringItemType, HRStaffSalarySettingType, HRPayslipType
} from './modules/hr/data/types';


// =================================================================================
// CORE SCHEMA TYPES (Entities not specific to one module, or foundational)
// =================================================================================
export interface AppSetting {
  id: string;
  using_dummy_data?: boolean;
}

export interface SchoolDetails {
  id: number;
  name: string;
  telephone?: string;
  email?: string;
  postal_address?: string;
  town?: string;
  motto?: string;
  logo_path?: string;
  created_at: string;
  updated_at: string;
  school_gender?: 'Mixed' | 'Boys Only' | 'Girls Only' | string;
  school_type?: 'Public' | 'Private' | 'International' | string;
  head_teacher_name?: string;
  school_code?: string;
}

export interface User {
  id: string;
  username: string;
  hashed_password?: string;
  password?: string;
  email: string;
  user_type: UserType;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  role_id?: number;
  role?: string;
  display_name?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: string[];
  created_at: string;
  updated_at: string;
}

export interface AcademicYearStructure {
  id: number;
  name: string;
}

export interface AcademicPeriodDefinition {
  id: number;
  structure_id: number;
  name: string;
  sequence_order: number;
  structure_name?: string;
}

export interface AcademicYear {
  id: number;
  name: string;
  structure_id: number;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  structure_name?: string;
}

export interface FinancialYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: FinFinancialYearStatusEnum;
  created_at: string;
  updated_at: string;
}

export interface SchoolPeriod {
  id: number;
  academic_year_id: number;
  period_definition_id: number;
  financial_year_id: number;
  start_date: string;
  end_date: string;
  mid_break_start?: string;
  mid_break_end?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  name?: string;
  academic_year_name?: string;
  period_definition_name?: string;
  financial_year_name?: string;
}

export interface WorkflowState {
  id: number;
  workflow_id: number;
  name: string;
  sequence_order: number;
}

export interface Workflow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  states?: WorkflowState[];
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: AuditAction;
  table_name?: string;
  record_pk?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  changed_at: string;
  ip_address?: string;
  user_agent?: string;
}

// =================================================================================
// ADMINISTRATION MODULE TYPES (Core entities often managed under Administration)
// =================================================================================

export interface ParentGuardian {
  id: string;
  user_id?: string;
  name: string;
  phone: string;
  email?: string;
  relationship_type?: string;
  location?: string;
  address?: string;
  photo_path?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Student {
  id: string;
  admission_no: string;
  upi_no?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: PersonGender;
  date_of_birth?: string;
  photo_path?: string;
  current_class_stream_id?: number;
  student_category_id?: number;
  dormitory_id?: number;
  admission_date?: string;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  current_class_name?: string;
  current_class_stream_name?: string;
  student_category_name?: string;
  dormitory_name?: string;
  primary_guardian?: ParentGuardian;
  exam_result_summary?: AcademicsExamResultSummaryType;
  email?: string;
  phone?: string;
  address?: string;
  remarks?: string;
  religion?: string;
  county?: string;
  district?: string;
  student_type?: string;
  primary_school?: string;
  marks_attained_primary?: string;
  class_admitted?: string;
  stream_admitted?: string;
  user_id?: string;
  display_name?: string;
}

export interface StudentGuardianRelationship {
  id: string;
  student_id: string;
  guardian_id: string;
  is_primary: boolean;
  relationship_type: string;
  can_pickup: boolean;
  receives_communication: boolean;
  created_at: string;
  updated_at: string;
}


export interface Staff {
  id: string;
  user_id?: string;
  staff_no: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  department_id?: number;
  designation_id?: number;
  hod_of_department_id?: number;
  is_active: boolean;
  date_of_employment?: string;
  contract_expiry_date?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  department_name?: string;
  designation_title?: string;
  hod_of_department_name?: string;
  user_username?: string;
  display_name?: string;
}

export interface Department {
  id: number;
  name: string;
  is_academic: boolean;
  created_at: string;
  updated_at: string;
}

export interface Designation {
  id: number;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentCategory {
  id: number;
  name: string;
}

export interface Dormitory {
  id: number;
  name: string;
  master_id?: string;
  capacity?: number;
  master_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: number;
  name: string;
  streams?: ClassStream[];
}

export interface ClassStream {
  id: number;
  class_id: number;
  name: string;
  class_teacher_id?: string;
  class_name?: string;
  class_teacher_name?: string;
}


// =================================================================================
// STUDENT DETAIL PAGE SPECIFIC (Complex/Combined types for UI)
// =================================================================================
export interface StudentEnrolledSubject {
  courseName: string;
  professorInstructorName?: string;
  status?: string;
}

export interface StudentPaymentLogItem {
  id: string;
  transactionId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  description: string;
}

export interface StudentFinancialSummary {
  totalFees: number;
  totalPaid: number;
  totalDiscount: number;
  totalFine: number;
  currentBalance: number;
}

export interface StudentInvoiceChargeItem {
  id: string;
  invoiceId: string;
  feeTypeDescription: string;
  dueDate: string;
  amount: number;
  status: FinInvoiceStatusEnum;
}

export interface StudentDetailProfile extends Student {
  financial_summary?: StudentFinancialSummary;
  invoices_charges?: StudentInvoiceChargeItem[];
  payment_history?: StudentPaymentLogItem[];
  enrolled_subjects?: StudentEnrolledSubject[];
}

// =================================================================================
// APP DATA LOADING STATES & INITIAL MOCK DATA SHAPE
// =================================================================================
export interface AppDataLoadingStates {
  all: boolean; schoolDetails: boolean; roles: boolean; users: boolean; students: boolean; staff: boolean; classes: boolean;
  subjects: boolean; departments: boolean; designations: boolean; studentCategories: boolean; dormitories: boolean;
  academicYears: boolean; schoolPeriods: boolean; academicYearStructures: boolean; academicPeriodDefinitions: boolean;
  financialYears: boolean; classStreams: boolean; parentsGuardians: boolean; studentGuardianRelationships: boolean;
  partners: boolean; clubs: boolean; customers: boolean; studentHealthRecords: boolean; studentAttendance: boolean;
  timetablePeriodDefs: boolean; templatesComm: boolean; campaigns: boolean; subjectPapers: boolean; examSessions: boolean;
  examPaperSettings: boolean; gradingSchemes: boolean; chartOfAccounts: boolean; banks: boolean; suppliers: boolean;
  feeTemplates: boolean; feeTemplateItems: boolean; expenseCategories: boolean; supplierInvoices: boolean;
  studentExamResults: boolean; classSubjectAllocations: boolean; teacherSubjectAssignments: boolean;
  studentSubjectEnrollments: boolean; timetableEntries: boolean; warehouses: boolean; itemCategoriesInv: boolean;
  itemsInv: boolean; fixedAssets: boolean; assetDepreciationLogs: boolean; requisitions: boolean; purchaseOrders: boolean;
  stockLevels: boolean; stockTransactions: boolean; payrollPeriods: boolean; payrollItemTypes: boolean;
  staffSalarySettings: boolean; payslips: boolean; bookCategories: boolean; books: boolean; loans: boolean; fines: boolean;
  customerInvoices: boolean; workflows: boolean; mealPlans: boolean; menus: boolean; merchants: boolean; auditLogs: boolean;
  expenseClaims: boolean; studentOpeningBalances: boolean; feeAdjustments: boolean; transportRoutes: boolean;
  studentTransportAssignments: boolean; studentInvoices: boolean; studentInvoiceItems: boolean; studentPayments: boolean;
  invoicePaymentApplications: boolean; studentMealPlans: boolean; mealConsumptionLogs: boolean;
  walletTransactions: boolean; studentWallets: boolean; generalPayments: boolean; generalLedgerEntries: boolean;
  rfqs: boolean; appSettings: boolean; studentClassHistory: boolean; healthIncidentReports: boolean; disciplinaryRecords: boolean;
}


export interface RawInitialData {
  initialMockSchoolDetails: SchoolDetails | null;
  initialMockRoles: Role[];
  initialMockUsers: User[];
  initialMockStudents: Student[];
  initialMockStaff: Staff[];
  initialMockClasses: Class[];
  initialMockClassStreams: ClassStream[];
  initialMockSubjects?: AcademicsSubjectType[];
  initialMockSubjectPapers?: AcademicsSubjectPaperType[];
  initialMockExamSessions?: AcademicsExamSessionType[];
  initialMockExamPaperSettings?: AcademicsExamPaperSettingType[];
  initialMockGradingSchemes?: AcademicsGradingSchemeType[];
  initialMockStudentExamResults?: AcademicsStudentExamResultWithDetailsType[];
  initialMockClassSubjectAllocations?: AcademicsClassSubjectAllocationType[];
  initialMockTeacherSubjectAssignments?: AcademicsTeacherSubjectAssignmentType[];
  initialMockStudentSubjectEnrollments?: AcademicsStudentSubjectEnrollmentType[];
  initialMockTimetablePeriodDefs?: AcademicsTimetablePeriodDefType[];
  initialMockTimetableEntries?: AcademicsTimetableEntryType[];
  initialMockDepartments: Department[];
  initialMockDesignations: Designation[];
  initialMockStudentCategories: StudentCategory[];
  initialMockDormitories: Dormitory[];
  initialMockAcademicYears: AcademicYear[];
  initialMockSchoolPeriods: SchoolPeriod[];
  initialMockAcademicYearStructures: AcademicYearStructure[];
  initialMockAcademicPeriodDefinitions: AcademicPeriodDefinition[];
  initialMockFinancialYears: FinancialYear[];
  initialMockPartners: AdminPartnerType[];
  initialMockClubs: AdminClubAndSocietyType[];
  initialMockCustomers: AdminCustomerType[];
  initialMockStudentHealthRecords: AdminStudentHealthRecordType[];
  initialMockStudentAttendance: AdminStudentAttendanceType[];
  initialMockTemplatesComm: AdminTemplateCommType[];
  initialMockCampaigns: AdminCampaignType[];
  initialMockChartOfAccounts: FinChartOfAccountType[];
  initialMockBanks: FinBankType[];
  initialMockSuppliers: FinSupplierType[];
  initialMockFeeTemplates: FinFeeTemplateType[];
  initialMockFeeTemplateItems: FinFeeTemplateItemType[];
  initialMockExpenseCategories: FinExpenseCategoryType[];
  initialMockExpenseClaims: FinExpenseClaimType[];
  initialMockCustomerInvoices: FinCustomerInvoiceType[];
  initialMockSupplierInvoices: FinSupplierInvoiceType[];
  initialMockStudentOpeningBalances: FinStudentOpeningBalanceType[];
  initialMockFeeAdjustments: FinFeeAdjustmentType[];
  initialMockTransportRoutes: FinTransportRouteType[];
  initialMockStudentTransportAssignments: FinStudentTransportAssignmentType[];
  initialMockStudentInvoices: FinStudentInvoiceType[];
  initialMockStudentInvoiceItems: FinStudentInvoiceItemType[];
  initialMockStudentPayments: FinStudentPaymentType[];
  initialMockInvoicePaymentApplications: FinInvoicePaymentApplicationType[];
  initialMockGeneralPayments: FinGeneralPaymentType[];
  initialMockGeneralLedgerEntries: FinGeneralLedgerEntryType[];
  initialMockWarehouses?: InvWarehouseType[];
  initialMockItemCategoriesInv?: InvItemCategoryType[];
  initialMockItemsInv?: InvItemType[];
  initialMockFixedAssets?: InvFixedAssetType[];
  initialMockAssetDepreciationLogs?: InvAssetDepreciationLogType[];
  initialMockStudentGuardianRelationships: StudentGuardianRelationship[];
  initialMockRequisitions?: InvRequisitionType[];
  initialMockPurchaseOrders?: InvPurchaseOrderType[];
  initialMockStockLevels?: InvStockLevelType[];
  initialMockStockTransactions?: InvStockTransactionType[];
  initialMockPayrollPeriods: HRPayrollPeriodType[];
  initialMockPayrollItemTypes: HRPayrollItemTypeType[];
  initialMockStaffSalarySettings: HRStaffSalarySettingType[];
  initialMockPayslips: HRPayslipType[];
  initialMockBookCategories?: LibBookCategoryType[];
  initialMockBooks?: LibBookType[];
  initialMockLoans?: LibLoanType[];
  initialMockFines?: LibFineType[];
  initialMockParentsGuardians: ParentGuardian[];
  initialMockWorkflows: Workflow[];
  initialMockMealPlans?: NutrMealPlanType[];
  initialMockMenus?: NutrMenuType[];
  initialMockMerchants?: NutrMerchantType[];
  initialMockAuditLogs: AuditLog[];
  initialMockRfqs?: InvRFQType[];
  initialMockAppSettings?: AppSetting;
  initialMockStudentMealPlans?: NutrStudentMealPlanType[];
  initialMockMealConsumptionLogs?: NutrMealConsumptionLogType[];
  initialMockWalletTransactions?: NutrWalletTransactionType[];
  initialMockStudentWallets?: NutrStudentWalletType[];
}

// Input Payloads for CRUD operations
export type CreatePayload<T, K extends keyof T = Extract<keyof T, 'id' | 'created_at' | 'updated_at'>> = Omit<
  T,
  | K
  | Extract<keyof T, `${string}_name` | `${string}_title` | 'display_name' | 'user_username' | 'items' | 'levels' | 'states' | 'paper_settings' | 'recurring_items' | 'primary_guardian' | 'exam_result_summary' | 'streams' | 'papers' | 'deleted_at' | 'running_balance'>
>;


export interface AppDataContextType {
  schoolDetails: SchoolDetails | null;
  roles: Role[];
  users: User[];
  students: Student[];
  staff: Staff[];
  classes: Class[];
  classStreams: ClassStream[];
  subjects: AcademicsSubjectType[];
  departments: Department[];
  designations: Designation[];
  studentCategories: StudentCategory[];
  dormitories: Dormitory[];
  academicYears: AcademicYear[];
  schoolPeriods: SchoolPeriod[];
  academicYearStructures: AcademicYearStructure[];
  academicPeriodDefinitions: AcademicPeriodDefinition[];
  financialYears: FinancialYear[];
  parentsGuardians: ParentGuardian[];
  studentGuardianRelationships: StudentGuardianRelationship[];
  partners: AdminPartnerType[];
  clubs: AdminClubAndSocietyType[];
  customers: AdminCustomerType[];
  studentHealthRecords: AdminStudentHealthRecordType[];
  studentAttendance: AdminStudentAttendanceType[];
  timetablePeriodDefs: AcademicsTimetablePeriodDefType[];
  templatesComm: AdminTemplateCommType[];
  campaigns: AdminCampaignType[];
  subjectPapers: AcademicsSubjectPaperType[];
  examSessions: AcademicsExamSessionType[];
  examPaperSettings: AcademicsExamPaperSettingType[];
  gradingSchemes: AcademicsGradingSchemeType[];
  chartOfAccounts: FinChartOfAccountType[];
  expenseCategories: FinExpenseCategoryType[];
  banks: FinBankType[];
  suppliers: FinSupplierType[];
  feeTemplates: FinFeeTemplateType[];
  feeTemplateItems: FinFeeTemplateItemType[];
  expenseClaims: FinExpenseClaimType[];
  customerInvoices: FinCustomerInvoiceType[];
  supplierInvoices: FinSupplierInvoiceType[];
  studentExamResults: AcademicsStudentExamResultWithDetailsType[];
  classSubjectAllocations: AcademicsClassSubjectAllocationType[];
  teacherSubjectAssignments: AcademicsTeacherSubjectAssignmentType[];
  studentSubjectEnrollments: AcademicsStudentSubjectEnrollmentType[];
  timetableEntries: AcademicsTimetableEntryType[];
  warehouses: InvWarehouseType[];
  itemCategoriesInv: InvItemCategoryType[];
  itemsInv: InvItemType[];
  fixedAssets: InvFixedAssetType[];
  assetDepreciationLogs: InvAssetDepreciationLogType[];
  requisitions: InvRequisitionType[];
  purchaseOrders: InvPurchaseOrderType[];
  stockLevels: InvStockLevelType[];
  stockTransactions: InvStockTransactionType[];
  payrollPeriods: HRPayrollPeriodType[];
  payrollItemTypes: HRPayrollItemTypeType[];
  staffSalarySettings: HRStaffSalarySettingType[];
  payslips: HRPayslipType[];
  bookCategories: LibBookCategoryType[];
  books: LibBookType[];
  loans: LibLoanType[];
  fines: LibFineType[];
  workflows: Workflow[];
  mealPlans: NutrMealPlanType[];
  menus: NutrMenuType[];
  merchants: NutrMerchantType[];
  auditLogs: AuditLog[];
  studentOpeningBalances: FinStudentOpeningBalanceType[];
  feeAdjustments: FinFeeAdjustmentType[];
  transportRoutes: FinTransportRouteType[];
  studentTransportAssignments: FinStudentTransportAssignmentType[];
  studentInvoices: FinStudentInvoiceType[];
  studentInvoiceItems: FinStudentInvoiceItemType[];
  studentPayments: FinStudentPaymentType[];
  invoicePaymentApplications: FinInvoicePaymentApplicationType[];
  studentMealPlans: NutrStudentMealPlanType[];
  mealConsumptionLogs: NutrMealConsumptionLogType[];
  walletTransactions: NutrWalletTransactionType[];
  studentWallets: NutrStudentWalletType[];
  generalPayments: FinGeneralPaymentType[];
  generalLedgerEntries: FinGeneralLedgerEntryType[];
  rfqs: InvRFQType[];
  appSettings: AppSetting | null;

  loading: AppDataLoadingStates;
  initializationError?: Error | null;
  rawInitialData: RawInitialData;

  isRxDBModeActive: boolean;
  isUsingRxDBDummyData: boolean | null;
  triggerSeedRxDB?: () => Promise<void>;
  triggerClearRxDB?: () => Promise<void>;

  // Core CRUD
  updateSchoolDetails: (details: Partial<SchoolDetails>) => Promise<SchoolDetails | null>;
  addUser: (data: CreatePayload<User, 'id' | 'created_at' | 'updated_at' | 'last_login_at' | 'hashed_password' | 'display_name' | 'role' | 'deleted_at' >) => Promise<User>;
  updateUser: (updatedUser: User) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  addRole: (data: CreatePayload<Role>) => Promise<Role>;
  updateRole: (updatedRole: Role) => Promise<Role>;
  deleteRole: (roleId: number) => Promise<void>;

  // Administration
  addStudent: (studentData: CreatePayload<Student, 'id' | 'created_at' | 'updated_at' | 'primary_guardian' | 'exam_result_summary' | 'current_class_name' | 'current_class_stream_name' | 'student_category_name' | 'dormitory_name' | 'display_name' | 'deleted_at'>, guardianData?: CreatePayload<ParentGuardian, 'id'|'created_at'|'updated_at'|'deleted_at'>) => Promise<Student>;
  updateStudent: (updatedStudentData: Student, guardianData?: ParentGuardian) => Promise<StudentDetailProfile>;
  deleteStudent: (studentId: string) => Promise<void>;
  addStaffMember: (staffData: CreatePayload<Staff>) => Promise<Staff>;
  updateStaffMember: (updatedStaffData: Staff) => Promise<Staff>;
  deleteStaffMember: (staffId: string) => Promise<void>;
  getStudentDetailsById: (studentId: string) => Promise<StudentDetailProfile | null>;
  getStudentFinancialDetailsById: (studentId: string) => Promise<StudentDetailProfile | null>;
  addParentGuardian: (data: CreatePayload<ParentGuardian>) => Promise<ParentGuardian>;
  updateParentGuardian: (data: ParentGuardian) => Promise<ParentGuardian>;
  deleteParentGuardian: (id: string) => Promise<void>;
  addStudentGuardianRelationship: (data: CreatePayload<StudentGuardianRelationship>) => Promise<StudentGuardianRelationship>;
  updateStudentGuardianRelationship: (data: StudentGuardianRelationship) => Promise<StudentGuardianRelationship>;
  deleteStudentGuardianRelationship: (id: string) => Promise<void>;
  addDepartment: (data: CreatePayload<Department>) => Promise<Department>;
  updateDepartment: (updatedDept: Department) => Promise<Department>;
  deleteDepartment: (departmentId: number) => Promise<void>;
  addDesignation: (data: CreatePayload<Designation>) => Promise<Designation>;
  updateDesignation: (updatedDesignation: Designation) => Promise<Designation>;
  deleteDesignation: (designationId: number) => Promise<void>;
  addStudentCategory: (data: Omit<StudentCategory, 'id'>) => Promise<StudentCategory>;
  updateStudentCategory: (updatedCategory: StudentCategory) => Promise<StudentCategory>;
  deleteStudentCategory: (categoryId: number) => Promise<void>;
  addDormitory: (data: CreatePayload<Dormitory>) => Promise<Dormitory>;
  updateDormitory: (updatedDorm: Dormitory) => Promise<Dormitory>;
  deleteDormitory: (dormId: number) => Promise<void>;
  addAcademicYearStructure: (data: CreatePayload<AcademicYearStructure>) => Promise<AcademicYearStructure>;
  updateAcademicYearStructure: (updatedStructure: AcademicYearStructure) => Promise<AcademicYearStructure>;
  deleteAcademicYearStructure: (structureId: number) => Promise<void>;
  addAcademicPeriodDefinition: (data: CreatePayload<AcademicPeriodDefinition>) => Promise<AcademicPeriodDefinition>;
  updateAcademicPeriodDefinition: (updatedDefinition: AcademicPeriodDefinition) => Promise<AcademicPeriodDefinition>;
  deleteAcademicPeriodDefinition: (definitionId: number) => Promise<void>;
  addAcademicYear: (data: CreatePayload<AcademicYear>) => Promise<AcademicYear>;
  updateAcademicYear: (updatedYear: AcademicYear) => Promise<AcademicYear>;
  deleteAcademicYear: (yearId: number) => Promise<void>;
  addSchoolPeriod: (data: CreatePayload<SchoolPeriod>) => Promise<SchoolPeriod>;
  updateSchoolPeriod: (updatedPeriod: SchoolPeriod) => Promise<SchoolPeriod>;
  deleteSchoolPeriod: (periodId: number) => Promise<void>;
  addPartner: (data: CreatePayload<AdminPartnerType>) => Promise<AdminPartnerType>;
  updatePartner: (updatedPartner: AdminPartnerType) => Promise<AdminPartnerType>;
  deletePartner: (partnerId: string) => Promise<void>;
  addClub: (data: CreatePayload<AdminClubAndSocietyType>) => Promise<AdminClubAndSocietyType>;
  updateClub: (updatedClub: AdminClubAndSocietyType) => Promise<AdminClubAndSocietyType>;
  deleteClub: (clubId: number) => Promise<void>;
  addCustomer: (data: CreatePayload<AdminCustomerType>) => Promise<AdminCustomerType>;
  updateCustomer: (updatedCustomer: AdminCustomerType) => Promise<AdminCustomerType>;
  deleteCustomer: (customerId: number) => Promise<void>;
  addStudentHealthRecord: (data: CreatePayload<AdminStudentHealthRecordType>) => Promise<AdminStudentHealthRecordType>;
  updateStudentHealthRecord: (updatedRecord: AdminStudentHealthRecordType) => Promise<AdminStudentHealthRecordType>;
  saveStudentAttendance: (records: Array<Omit<AdminStudentAttendanceType, 'id' | 'created_at'|'student_name'|'period_name'>>) => Promise<void>;
  getStudentAttendanceByFilters: (date: string, classStreamId: number, periodId: number) => AdminStudentAttendanceType[];
  addTemplateComm: (data: CreatePayload<AdminTemplateCommType>) => Promise<AdminTemplateCommType>;
  updateTemplateComm: (updatedTemplate: AdminTemplateCommType) => Promise<AdminTemplateCommType>;
  deleteTemplateComm: (templateId: number) => Promise<void>;
  addCampaign: (data: CreatePayload<AdminCampaignType, 'id'|'created_at'|'updated_at'|'approved_by'|'template_name'|'created_by_name'|'target_audience_display'|'approved_by_name'|'sent_at'>) => Promise<AdminCampaignType>;
  updateCampaign: (updatedCampaign: AdminCampaignType) => Promise<AdminCampaignType>;
  deleteCampaign: (campaignId: string) => Promise<void>;
  addAuditLog: (data: Omit<AuditLog, 'id'|'changed_at'>) => Promise<AuditLog>;


  // Academics
  addClass: (data: CreatePayload<Class>) => Promise<Class>;
  updateClass: (updatedClass: Class) => Promise<Class>;
  deleteClass: (classId: number) => Promise<void>;
  addClassStream: (classId: number, data: CreatePayload<ClassStream, 'id'|'class_id'|'class_name'|'class_teacher_name'>) => Promise<ClassStream>;
  updateClassStream: (updatedStream: ClassStream) => Promise<ClassStream>;
  deleteClassStream: (streamId: number) => Promise<void>;
  addSubject: (data: CreatePayload<AcademicsSubjectType>) => Promise<AcademicsSubjectType>;
  updateSubject: (updatedSubject: AcademicsSubjectType) => Promise<AcademicsSubjectType>;
  deleteSubject: (subjectId: number) => Promise<void>;
  addSubjectPaper: (data: CreatePayload<AcademicsSubjectPaperType>) => Promise<AcademicsSubjectPaperType>;
  updateSubjectPaper: (updatedPaper: AcademicsSubjectPaperType) => Promise<AcademicsSubjectPaperType>;
  deleteSubjectPaper: (paperId: number) => Promise<void>;
  addExamSession: (data: CreatePayload<AcademicsExamSessionType>) => Promise<AcademicsExamSessionType>;
  updateExamSession: (updatedSession: AcademicsExamSessionType) => Promise<AcademicsExamSessionType>;
  deleteExamSession: (sessionId: string) => Promise<void>;
  addExamPaperSetting: (data: CreatePayload<AcademicsExamPaperSettingType>) => Promise<AcademicsExamPaperSettingType>;
  updateExamPaperSetting: (updatedSetting: AcademicsExamPaperSettingType) => Promise<AcademicsExamPaperSettingType>;
  deleteExamPaperSetting: (settingId: string, examSessionId: string) => Promise<void>;
  addGradingScheme: (data: CreatePayload<AcademicsGradingSchemeType>) => Promise<AcademicsGradingSchemeType>;
  updateGradingScheme: (updatedScheme: AcademicsGradingSchemeType) => Promise<AcademicsGradingSchemeType>;
  deleteGradingScheme: (schemeId: number) => Promise<void>;
  getStudentsForExamEntry: (classStreamId: number) => Student[];
  getExamPaperSettingsForSession: (examSessionId: string) => AcademicsExamPaperSettingType[];
  saveStudentExamResult: (resultData: Omit<allTypes.AcademicsStudentExamResultType, 'id'|'created_at'|'updated_at'|'marks'>, marksData: Array<Omit<allTypes.AcademicsStudentPaperMarkType, 'id' | 'student_exam_result_id'>>) => Promise<AcademicsStudentExamResultWithDetailsType>;
  getTimetablePeriodDefs: () => AcademicsTimetablePeriodDefType[];
  addTimetablePeriodDef: (data: Omit<AcademicsTimetablePeriodDefType, 'id'>) => Promise<AcademicsTimetablePeriodDefType>;
  updateTimetablePeriodDef: (updatedDef: AcademicsTimetablePeriodDefType) => Promise<AcademicsTimetablePeriodDefType>;
  deleteTimetablePeriodDef: (defId: number) => Promise<void>;
  getTimetableEntries: (classStreamId: number) => AcademicsTimetableEntryType[];
  addTimetableEntry: (data: CreatePayload<AcademicsTimetableEntryType>) => Promise<AcademicsTimetableEntryType>;
  updateTimetableEntry: (updatedEntry: AcademicsTimetableEntryType) => Promise<AcademicsTimetableEntryType>;
  deleteTimetableEntry: (entryId: string) => Promise<void>;
  addClassSubjectAllocation: (data: CreatePayload<AcademicsClassSubjectAllocationType>) => Promise<AcademicsClassSubjectAllocationType>;
  updateClassSubjectAllocation: (updatedAllocation: AcademicsClassSubjectAllocationType) => Promise<AcademicsClassSubjectAllocationType>;
  deleteClassSubjectAllocation: (allocationId: string) => Promise<void>;
  addTeacherSubjectAssignment: (data: CreatePayload<AcademicsTeacherSubjectAssignmentType>) => Promise<AcademicsTeacherSubjectAssignmentType>;
  deleteTeacherSubjectAssignment: (assignmentId: string) => Promise<void>;
  addStudentSubjectEnrollment: (data: CreatePayload<AcademicsStudentSubjectEnrollmentType>) => Promise<AcademicsStudentSubjectEnrollmentType>;
  updateStudentSubjectEnrollment: (updatedEnrollment: AcademicsStudentSubjectEnrollmentType) => Promise<AcademicsStudentSubjectEnrollmentType>;
  deleteStudentSubjectEnrollment: (enrollmentId: string) => Promise<void>;

  // Finance
  addChartOfAccount: (data: CreatePayload<FinChartOfAccountType>) => Promise<FinChartOfAccountType>;
  updateChartOfAccount: (updatedAccount: FinChartOfAccountType) => Promise<FinChartOfAccountType>;
  deleteChartOfAccount: (accountId: number) => Promise<void>;
  addBank: (data: CreatePayload<FinBankType>) => Promise<FinBankType>;
  updateBank: (updatedBank: FinBankType) => Promise<FinBankType>;
  deleteBank: (bankId: number) => Promise<void>;
  addSupplier: (data: CreatePayload<FinSupplierType>) => Promise<FinSupplierType>;
  updateSupplier: (updatedSupplier: FinSupplierType) => Promise<FinSupplierType>;
  deleteSupplier: (supplierId: number) => Promise<void>;
  addFeeTemplate: (data: CreatePayload<FinFeeTemplateType> & {items: CreatePayload<FinFeeTemplateItemType, 'id'|'fee_template_id'|'revenue_account_name'|'linked_expense_category_name'>[]}) => Promise<FinFeeTemplateType>;
  updateFeeTemplate: (updatedTemplate: FinFeeTemplateType) => Promise<FinFeeTemplateType>;
  deleteFeeTemplate: (templateId: number) => Promise<void>;
  addExpenseClaim: (data: CreatePayload<FinExpenseClaimType>) => Promise<FinExpenseClaimType>;
  updateExpenseClaim: (updatedClaim: FinExpenseClaimType) => Promise<FinExpenseClaimType>;
  deleteExpenseClaim: (claimId: string) => Promise<void>;
  addExpenseCategory: (data: Omit<FinExpenseCategoryType, 'id'>) => Promise<FinExpenseCategoryType>;
  updateExpenseCategory: (updatedCategory: FinExpenseCategoryType) => Promise<FinExpenseCategoryType>;
  deleteExpenseCategory: (categoryId: number) => Promise<void>;
  addCustomerInvoice: (data: CreatePayload<FinCustomerInvoiceType> & {items: CreatePayload<FinCustomerInvoiceItemType, 'id'|'invoice_id'|'revenue_account_name'>[]}) => Promise<FinCustomerInvoiceType>;
  updateCustomerInvoice: (updatedInvoice: FinCustomerInvoiceType) => Promise<FinCustomerInvoiceType>;
  deleteCustomerInvoice: (invoiceId: string) => Promise<void>;
  addSupplierInvoice: (data: CreatePayload<FinSupplierInvoiceType>) => Promise<FinSupplierInvoiceType>;
  updateSupplierInvoice: (updatedInvoice: FinSupplierInvoiceType) => Promise<FinSupplierInvoiceType>;
  deleteSupplierInvoice: (invoiceId: string) => Promise<void>;
  addStudentOpeningBalance: (data: CreatePayload<FinStudentOpeningBalanceType>) => Promise<FinStudentOpeningBalanceType>;
  updateStudentOpeningBalance: (updatedBalance: FinStudentOpeningBalanceType) => Promise<FinStudentOpeningBalanceType>;
  deleteStudentOpeningBalance: (balanceId: string) => Promise<void>;
  addFeeAdjustment: (data: CreatePayload<FinFeeAdjustmentType>) => Promise<FinFeeAdjustmentType>;
  updateFeeAdjustment: (updatedAdjustment: FinFeeAdjustmentType) => Promise<FinFeeAdjustmentType>;
  deleteFeeAdjustment: (adjustmentId: string) => Promise<void>;
  addTransportRoute: (data: CreatePayload<FinTransportRouteType>) => Promise<FinTransportRouteType>;
  updateTransportRoute: (updatedRoute: FinTransportRouteType) => Promise<FinTransportRouteType>;
  deleteTransportRoute: (routeId: number) => Promise<void>;
  addStudentTransportAssignment: (data: CreatePayload<FinStudentTransportAssignmentType, 'id'|'created_at'|'updated_at'|'student_name'|'route_name'|'school_period_name'|'invoice_id'>) => Promise<FinStudentTransportAssignmentType>;
  updateStudentTransportAssignment: (updatedAssignment: FinStudentTransportAssignmentType) => Promise<FinStudentTransportAssignmentType>;
  deleteStudentTransportAssignment: (assignmentId: string) => Promise<void>;
  generateStudentInvoices: (feeTemplateId: number, schoolPeriodId: number, studentCriteria: { categoryId?: number, classStreamId?: number}) => Promise<FinStudentInvoiceType[]>;
  addStudentPayment: (data: CreatePayload<FinStudentPaymentType>) => Promise<FinStudentPaymentType>;
  updateStudentPayment: (updatedPayment: FinStudentPaymentType) => Promise<FinStudentPaymentType>;
  deleteStudentPayment: (paymentId: string) => Promise<void>;
  applyPaymentToInvoices: (paymentId: string, applications: Array<Omit<FinInvoicePaymentApplicationType, 'id'>>) => Promise<void>;
  addGeneralPayment: (data: CreatePayload<FinGeneralPaymentType, 'id'|'created_at'|'updated_at'|'total_amount_paid'|'payer_name_resolved'|'items'> & {items: CreatePayload<FinGeneralPaymentItemType, 'id'|'general_payment_id'|'revenue_account_name'>[]}) => Promise<FinGeneralPaymentType>;
  updateGeneralPayment: (updatedPayment: FinGeneralPaymentType) => Promise<FinGeneralPaymentType>;
  deleteGeneralPayment: (paymentId: string) => Promise<void>;
  addFinancialYear: (data: CreatePayload<FinancialYear>) => Promise<FinancialYear>;
  updateFinancialYear: (updatedFY: FinancialYear) => Promise<FinancialYear>;
  deleteFinancialYear: (fyId: number) => Promise<void>;

  // HR
  addPayrollPeriod: (data: CreatePayload<HRPayrollPeriodType>) => Promise<HRPayrollPeriodType>;
  updatePayrollPeriod: (updatedPeriod: HRPayrollPeriodType) => Promise<HRPayrollPeriodType>;
  deletePayrollPeriod: (periodId: number) => Promise<void>;
  addPayrollItemType: (data: CreatePayload<HRPayrollItemTypeType>) => Promise<HRPayrollItemTypeType>;
  updatePayrollItemType: (updatedItemType: HRPayrollItemTypeType) => Promise<HRPayrollItemTypeType>;
  deletePayrollItemType: (itemTypeId: number) => Promise<void>;
  updateStaffSalarySetting: (staffId: string, settingData: CreatePayload<HRStaffSalarySettingType, 'id'|'staff_id'|'created_at'|'updated_at'|'staff_name'|'recurring_items'>, recurringItemsData: Array<CreatePayload<HRStaffRecurringItemType, 'id' | 'staff_salary_setting_id' | 'created_at' | 'item_type_name' | 'item_category'>>) => Promise<HRStaffSalarySettingType>;
  generatePayslipsForPeriod: (payrollPeriodId: number) => Promise<HRPayslipType[]>;

  // Inventory
  addWarehouse: (data: Omit<InvWarehouseType, 'id'>) => Promise<InvWarehouseType>;
  updateWarehouse: (updatedWarehouse: InvWarehouseType) => Promise<InvWarehouseType>;
  deleteWarehouse: (warehouseId: number) => Promise<void>;
  addItemCategoryInv: (data: Omit<InvItemCategoryType, 'id'>) => Promise<InvItemCategoryType>;
  updateItemCategoryInv: (updatedCategory: InvItemCategoryType) => Promise<InvItemCategoryType>;
  deleteItemCategoryInv: (categoryId: number) => Promise<void>;
  addItemInv: (data: CreatePayload<InvItemType>) => Promise<InvItemType>;
  updateItemInv: (updatedItem: InvItemType) => Promise<InvItemType>;
  deleteItemInv: (itemId: string) => Promise<void>;
  addFixedAsset: (data: CreatePayload<InvFixedAssetType>) => Promise<InvFixedAssetType>;
  updateFixedAsset: (updatedAsset: InvFixedAssetType) => Promise<InvFixedAssetType>;
  deleteFixedAsset: (assetId: string) => Promise<void>;
  addAssetDepreciationLog: (data: Omit<InvAssetDepreciationLogType, 'id'>) => Promise<InvAssetDepreciationLogType>;
  addRequisition: (data: CreatePayload<InvRequisitionType>, items: CreatePayload<InvRequisitionItemType, 'id' | 'requisition_id' | 'item_name' | 'line_total'| 'fulfillment_stock_transaction_id' | 'quantity_issued'>[]) => Promise<InvRequisitionType>;
  updateRequisition: (updatedReq: InvRequisitionType, items: InvRequisitionItemType[]) => Promise<InvRequisitionType>;
  deleteRequisition: (reqId: string) => Promise<void>;
  updateRequisitionStatus: (reqId: string, status: InvRequisitionStatusEnum) => Promise<InvRequisitionType>;
  addPurchaseOrder: (data: CreatePayload<InvPurchaseOrderType>, items: CreatePayload<InvPurchaseOrderItemType, 'id' | 'purchase_order_id' | 'item_name' | 'line_total' | 'quantity_received'>[]) => Promise<InvPurchaseOrderType>;
  updatePurchaseOrder: (updatedPO: InvPurchaseOrderType, items: InvPurchaseOrderItemType[]) => Promise<InvPurchaseOrderType>;
  deletePurchaseOrder: (poId: string) => Promise<void>;
  addStockTransaction: (data: CreatePayload<InvStockTransactionType>) => Promise<InvStockTransactionType>;
  addRfq: (data: CreatePayload<InvRFQType>) => Promise<InvRFQType>;
  updateRfq: (updatedRfq: InvRFQType) => Promise<InvRFQType>;
  deleteRfq: (rfqId: string) => Promise<void>;

  // Library
  addBookCategory: (data: Omit<LibBookCategoryType, 'id'>) => Promise<LibBookCategoryType>;
  updateBookCategory: (updatedCategory: LibBookCategoryType) => Promise<LibBookCategoryType>;
  deleteBookCategory: (categoryId: number) => Promise<void>;
  addBook: (data: CreatePayload<LibBookType>) => Promise<LibBookType>;
  updateBook: (updatedBook: LibBookType) => Promise<LibBookType>;
  deleteBook: (bookId: string) => Promise<void>;
  addLoan: (data: CreatePayload<LibLoanType>) => Promise<LibLoanType>;
  updateLoan: (updatedLoan: LibLoanType) => Promise<LibLoanType>;
  addFine: (data: CreatePayload<LibFineType>) => Promise<LibFineType>;
  updateFineStatus: (updatedFine: LibFineType) => Promise<LibFineType>;

  // Nutrition & Wallet
  addMealPlan: (data: CreatePayload<NutrMealPlanType>) => Promise<NutrMealPlanType>;
  updateMealPlan: (updatedPlan: NutrMealPlanType) => Promise<NutrMealPlanType>;
  deleteMealPlan: (planId: number) => Promise<void>;
  addMenu: (data: CreatePayload<NutrMenuType>) => Promise<NutrMenuType>;
  updateMenu: (updatedMenu: NutrMenuType) => Promise<NutrMenuType>;
  deleteMenu: (menuId: string) => Promise<void>;
  addStudentMealPlan: (data: CreatePayload<NutrStudentMealPlanType>) => Promise<NutrStudentMealPlanType>;
  updateStudentMealPlan: (updatedAssignment: NutrStudentMealPlanType) => Promise<NutrStudentMealPlanType>;
  deleteStudentMealPlan: (assignmentId: string) => Promise<void>;
  addMealConsumptionLog: (data: CreatePayload<NutrMealConsumptionLogType, 'id' | 'consumption_time' | 'student_name' | 'menu_description' | 'menu_meal_type' | 'menu_date' | 'wallet_transaction_id'| 'charged_amount'>) => Promise<NutrMealConsumptionLogType>;
  addMerchant: (data: CreatePayload<NutrMerchantType>) => Promise<NutrMerchantType>;
  updateMerchant: (updatedMerchant: NutrMerchantType) => Promise<NutrMerchantType>;
  deleteMerchant: (merchantId: number) => Promise<void>;
  addWalletTransaction: (data: CreatePayload<NutrWalletTransactionType, 'id' | 'transaction_date' | 'running_balance' | 'student_name' | 'reference_id' | 'reference_type'>) => Promise<NutrWalletTransactionType>;

  // Settings & Workflows
  addWorkflow: (data: CreatePayload<Workflow>) => Promise<Workflow>;
  updateWorkflow: (updatedWorkflow: Workflow) => Promise<Workflow>;
  deleteWorkflow: (workflowId: number) => Promise<void>;
  addWorkflowState: (workflowId: number, data: Pick<WorkflowState, 'name' | 'sequence_order'>) => Promise<WorkflowState>;
  updateWorkflowState: (workflowId: number, updatedState: WorkflowState) => Promise<WorkflowState>;
  deleteWorkflowState: (workflowId: number, stateId: number) => Promise<void>;
}
