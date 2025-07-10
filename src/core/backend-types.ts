/**
 * ABOUTME: This file contains the complete and consolidated set of backend types.
 * ABOUTME: It uses Branded Types for type-safe IDs and relationships.
 */

// =================================================================================
// CONSOLIDATED BACKEND TYPES (V3.0 - BRANDED IDS)
//
// Designed by Gemini for Mr. GENIUS
//
// This single file serves as the complete source of truth for all backend
// data structures. It uses the "Branded Type" pattern to ensure that
// different kinds of IDs (e.g., StudentId, StaffId) are not interchangeable,
// providing compile-time safety for all relationships.
// =================================================================================


// =================================================================================
// SECTION 1: BRANDING UTILITY & BASE MODEL
// =================================================================================

/**
 * A generic utility to create "branded" types for type-safe IDs.
 * This ensures, for example, that a StudentId cannot be assigned to a StaffId.
 */
export type Brand<K, T> = K & { __brand: T };

/**
 * An enhanced base interface for all database models.
 */
export interface BaseModel {
  id: string; // This will be overridden by branded IDs in specific interfaces
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  created_by_user_id: CoreUserId;
  updated_by_user_id: CoreUserId;
}

// =================================================================================
// SECTION 2: BRANDED ID DEFINITIONS
// =================================================================================

// Core
export type CoreUserId = Brand<string, 'CoreUser'>;
export type CoreRoleId = Brand<string, 'CoreRole'>;
export type CoreRolePermissionId = Brand<string, 'CoreRolePermission'>;
export type CoreFinancialYearId = Brand<string, 'CoreFinancialYear'>;
export type CoreAcademicYearId = Brand<string, 'CoreAcademicYear'>;
export type CoreSchoolPeriodId = Brand<string, 'CoreSchoolPeriod'>;

// Administration
export type AdmStudentId = Brand<string, 'AdmStudent'>;
export type AdmParentGuardianId = Brand<string, 'AdmParentGuardian'>;
export type AdmStudentParentGuardianId = Brand<string, 'AdmStudentParentGuardian'>;
export type AdmStaffId = Brand<string, 'AdmStaff'>;
export type AdmDepartmentId = Brand<string, 'AdmDepartment'>;
export type AdmDesignationId = Brand<string, 'AdmDesignation'>;
export type AdmClassLevelId = Brand<string, 'AdmClassLevel'>;
export type AdmClassStreamId = Brand<string, 'AdmClassStream'>;
export type AdmStudentClassHistoryId = Brand<string, 'AdmStudentClassHistory'>;
export type AdmDisciplinaryRecordId = Brand<string, 'AdmDisciplinaryRecord'>;
export type AdmDormitoryId = Brand<string, 'AdmDormitory'>;
export type AdmDormitoryAllocationId = Brand<string, 'AdmDormitoryAllocation'>;
export type AdmClubId = Brand<string, 'AdmClub'>;
export type AdmClubMembershipId = Brand<string, 'AdmClubMembership'>;
export type AdmCommunicationLogId = Brand<string, 'AdmCommunicationLog'>;

// Academics
export type EdmSubjectId = Brand<string, 'EdmSubject'>;
export type EdmGradingSchemeId = Brand<string, 'EdmGradingScheme'>;
export type EdmGradingSchemeLevelId = Brand<string, 'EdmGradingSchemeLevel'>;
export type EdmSubjectPaperId = Brand<string, 'EdmSubjectPaper'>;
export type EdmClassSubjectAllocationId = Brand<string, 'EdmClassSubjectAllocation'>;
export type EdmTeacherSubjectAssignmentId = Brand<string, 'EdmTeacherSubjectAssignment'>;
export type EdmStudentSubjectEnrollmentId = Brand<string, 'EdmStudentSubjectEnrollment'>;
export type EdmExamSessionId = Brand<string, 'EdmExamSession'>;
export type EdmExamPaperSettingId = Brand<string, 'EdmExamPaperSetting'>;
export type EdmStudentPaperMarkId = Brand<string, 'EdmStudentPaperMark'>;
export type EdmStudentExamResultId = Brand<string, 'EdmStudentExamResult'>;
export type EdmTimetablePeriodDefId = Brand<string, 'EdmTimetablePeriodDef'>;
export type EdmTimetableEntryId = Brand<string, 'EdmTimetableEntry'>;

// Finance
export type FinBankId = Brand<string, 'FinBank'>;
export type FinChartOfAccountId = Brand<string, 'FinChartOfAccount'>;
export type FinGeneralLedgerId = Brand<string, 'FinGeneralLedger'>;
export type FinFeeTemplateId = Brand<string, 'FinFeeTemplate'>;
export type FinFeeTemplateItemId = Brand<string, 'FinFeeTemplateItem'>;
export type FinStudentInvoiceId = Brand<string, 'FinStudentInvoice'>;
export type FinStudentInvoiceItemId = Brand<string, 'FinStudentInvoiceItem'>;
export type FinStudentPaymentId = Brand<string, 'FinStudentPayment'>;
export type FinInvoicePaymentApplicationId = Brand<string, 'FinInvoicePaymentApplication'>;
export type FinVendorId = Brand<string, 'FinVendor'>;
export type FinExpenseId = Brand<string, 'FinExpense'>;

// HR
export type HrPayrollPeriodId = Brand<string, 'HrPayrollPeriod'>;
export type HrPayrollItemTypeId = Brand<string, 'HrPayrollItemType'>;
export type HrStaffSalarySettingId = Brand<string, 'HrStaffSalarySetting'>;
export type HrPayslipId = Brand<string, 'HrPayslip'>;
export type HrPayslipItemId = Brand<string, 'HrPayslipItem'>;

// Inventory
export type InvWarehouseId = Brand<string, 'InvWarehouse'>;
export type InvItemCategoryId = Brand<string, 'InvItemCategory'>;
export type InvItemId = Brand<string, 'InvItem'>;
export type InvAssetId = Brand<string, 'InvAsset'>;
export type InvStockTransactionId = Brand<string, 'InvStockTransaction'>;
export type InvRequisitionId = Brand<string, 'InvRequisition'>;
export type InvRequisitionItemId = Brand<string, 'InvRequisitionItem'>;

// Library
export type LibBookCategoryId = Brand<string, 'LibBookCategory'>;
export type LibBookId = Brand<string, 'LibBook'>;
export type LibLoanId = Brand<string, 'LibLoan'>;
export type LibFineId = Brand<string, 'LibFine'>;

// Nutrition
export type NutFoodItemId = Brand<string, 'NutFoodItem'>;
export type NutMenuId = Brand<string, 'NutMenu'>;
export type NutMenuItemId = Brand<string, 'NutMenuItem'>;
export type NutMealPlanId = Brand<string, 'NutMealPlan'>;
export type NutMealPlanEntryId = Brand<string, 'NutMealPlanEntry'>;
export type NutMealConsumptionLogId = Brand<string, 'NutMealConsumptionLog'>;
export type NutStudentWalletId = Brand<string, 'NutStudentWallet'>;
export type NutWalletTransactionId = Brand<string, 'NutWalletTransaction'>;

// Audit & Workflow
export type LogAuditId = Brand<string, 'LogAudit'>;
export type FlowWorkflowId = Brand<string, 'FlowWorkflow'>;
export type FlowWorkflowStateId = Brand<string, 'FlowWorkflowState'>;
export type FlowWorkflowTransitionId = Brand<string, 'FlowWorkflowTransition'>;
export type FlowDocumentHistoryId = Brand<string, 'FlowDocumentHistory'>;

// Settings
export type SettingsSchoolProfileId = Brand<string, 'SettingsSchoolProfile'>;
export type SettingsModuleConfigurationId = Brand<string, 'SettingsModuleConfiguration'>;


// =================================================================================
// SECTION 3: SHARED ENUMS
// =================================================================================

export type PeriodStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type InvoiceStatus = 'DRAFT' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type StudentStatus = 'APPLICANT' | 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN' | 'ALUMNI';
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type BorrowerType = 'STUDENT' | 'STAFF';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type PayrollStatus = 'DRAFT' | 'PROCESSED' | 'PAID';


// =================================================================================
// SECTION 4: CORE MODULE (`core_`)
// =================================================================================

export interface CoreUser extends BaseModel {
  id: CoreUserId;
  username: string;
  password_hash: string;
  email: string;
  role_id: CoreRoleId;
  is_active: boolean;
}

export interface CoreRole extends BaseModel {
  id: CoreRoleId;
  name: string;
  description: string;
}

export interface CoreRolePermission extends BaseModel {
  id: CoreRolePermissionId;
  role_id: CoreRoleId;
  permission_key: string;
}

export interface CoreFinancialYear extends BaseModel {
  id: CoreFinancialYearId;
  name: string;
  start_date: Date;
  end_date: Date;
  status: PeriodStatus;
}

export interface CoreAcademicYear extends BaseModel {
  id: CoreAcademicYearId;
  financial_year_id: CoreFinancialYearId;
  name: string;
  start_date: Date;
  end_date: Date;
  status: PeriodStatus;
}

export interface CoreSchoolPeriod extends BaseModel {
  id: CoreSchoolPeriodId;
  academic_year_id: CoreAcademicYearId;
  name: string;
  start_date: Date;
  end_date: Date;
  status: PeriodStatus;
}


// =================================================================================
// SECTION 5: ADMINISTRATION MODULE (`adm_`)
// =================================================================================

export interface AdmStudent extends BaseModel {
  id: AdmStudentId;
  admission_no: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: Date;
  gender: Gender;
  current_class_stream_id: AdmClassStreamId;
  status: StudentStatus;
  admission_date: Date;
  user_id?: CoreUserId;
}

export interface AdmParentGuardian extends BaseModel {
  id: AdmParentGuardianId;
  first_name: string;
  last_name: string;
  primary_contact: string;
  email?: string;
  user_id?: CoreUserId;
}

export interface AdmStudentParentGuardian extends BaseModel {
  id: AdmStudentParentGuardianId;
  student_id: AdmStudentId;
  parent_guardian_id: AdmParentGuardianId;
  relationship_type: string;
}

export interface AdmStaff extends BaseModel {
  id: AdmStaffId;
  staff_no: string;
  first_name: string;
  last_name: string;
  designation_id: AdmDesignationId;
  employment_date: Date;
  is_teaching_staff: boolean;
  user_id: CoreUserId;
}

export interface AdmDepartment extends BaseModel {
  id: AdmDepartmentId;
  name: string;
  hod_staff_id?: AdmStaffId;
}

export interface AdmDesignation extends BaseModel {
  id: AdmDesignationId;
  name: string;
  department_id: AdmDepartmentId;
}

export interface AdmClassLevel extends BaseModel {
  id: AdmClassLevelId;
  name: string;
  numeric_level: number;
}

export interface AdmClassStream extends BaseModel {
  id: AdmClassStreamId;
  class_level_id: AdmClassLevelId;
  name: string;
  class_teacher_id?: AdmStaffId;
}

export interface AdmStudentClassHistory extends BaseModel {
  id: AdmStudentClassHistoryId;
  student_id: AdmStudentId;
  class_stream_id: AdmClassStreamId;
  academic_year_id: CoreAcademicYearId;
  start_date: Date;
  end_date: Date | null;
  reason: string;
}

export interface AdmDisciplinaryRecord extends BaseModel {
  id: AdmDisciplinaryRecordId;
  student_id: AdmStudentId;
  offense: string;
  action_taken: string;
  incident_date: Date;
  reported_by_staff_id: AdmStaffId;
}

export interface AdmDormitory extends BaseModel {
  id: AdmDormitoryId;
  name: string;
  capacity: number;
  warden_staff_id?: AdmStaffId;
}

export interface AdmDormitoryAllocation extends BaseModel {
  id: AdmDormitoryAllocationId;
  student_id: AdmStudentId;
  dormitory_id: AdmDormitoryId;
  room_number: string;
  academic_year_id: CoreAcademicYearId;
}

export interface AdmClub extends BaseModel {
  id: AdmClubId;
  name: string;
  description: string;
  patron_staff_id?: AdmStaffId;
}

export interface AdmClubMembership extends BaseModel {
  id: AdmClubMembershipId;
  student_id: AdmStudentId;
  club_id: AdmClubId;
  role: string;
  academic_year_id: CoreAcademicYearId;
}

export interface AdmCommunicationLog extends BaseModel {
  id: AdmCommunicationLogId;
  channel: 'SMS' | 'EMAIL' | 'PORTAL_NOTIFICATION';
  recipient_id: string; // Generic ID since it can be student, staff, etc.
  recipient_type: 'STUDENT' | 'STAFF' | 'PARENT_GUARDIAN' | 'GROUP';
  subject?: string;
  message: string;
  status: 'SENT' | 'FAILED' | 'DELIVERED' | 'READ';
}


// =================================================================================
// SECTION 6: ACADEMICS MODULE (`edm_`)
// =================================================================================

export interface EdmSubject extends BaseModel {
  id: EdmSubjectId;
  name: string;
  code: string;
  department_id: AdmDepartmentId;
}

export interface EdmGradingScheme extends BaseModel {
  id: EdmGradingSchemeId;
  name: string;
  description?: string;
}

export interface EdmGradingSchemeLevel extends BaseModel {
  id: EdmGradingSchemeLevelId;
  grading_scheme_id: EdmGradingSchemeId;
  grade: string;
  min_mark: number;
  max_mark: number;
  comment: string;
}

export interface EdmSubjectPaper extends BaseModel {
  id: EdmSubjectPaperId;
  subject_id: EdmSubjectId;
  paper_name: string;
  paper_code: string;
}

export interface EdmClassSubjectAllocation extends BaseModel {
  id: EdmClassSubjectAllocationId;
  class_stream_id: AdmClassStreamId;
  subject_id: EdmSubjectId;
  academic_year_id: CoreAcademicYearId;
}

export interface EdmTeacherSubjectAssignment extends BaseModel {
  id: EdmTeacherSubjectAssignmentId;
  class_subject_allocation_id: EdmClassSubjectAllocationId;
  teacher_id: AdmStaffId;
  is_primary_teacher: boolean;
}

export interface EdmStudentSubjectEnrollment extends BaseModel {
  id: EdmStudentSubjectEnrollmentId;
  student_id: AdmStudentId;
  class_subject_allocation_id: EdmClassSubjectAllocationId;
  enrollment_date: Date;
  is_active: boolean;
}

export interface EdmExamSession extends BaseModel {
  id: EdmExamSessionId;
  name: string;
  school_period_id: CoreSchoolPeriodId;
  grading_scheme_id: EdmGradingSchemeId;
}

export interface EdmExamPaperSetting extends BaseModel {
  id: EdmExamPaperSettingId;
  exam_session_id: EdmExamSessionId;
  subject_paper_id: EdmSubjectPaperId;
  marks_out_of: number;
  weight_percentage: number;
  exam_date: Date;
}

export interface EdmStudentPaperMark extends BaseModel {
  id: EdmStudentPaperMarkId;
  student_id: AdmStudentId;
  exam_paper_setting_id: EdmExamPaperSettingId;
  marks_obtained: number;
}

export interface EdmStudentExamResult extends BaseModel {
  id: EdmStudentExamResultId;
  student_id: AdmStudentId;
  exam_session_id: EdmExamSessionId;
  subject_id: EdmSubjectId;
  final_mark: number;
  grade: string;
  comment: string;
  subject_position_in_class: number;
  overall_position_in_class: number;
}

export interface EdmTimetablePeriodDef extends BaseModel {
  id: EdmTimetablePeriodDefId;
  name: string;
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
}

export interface EdmTimetableEntry extends BaseModel {
  id: EdmTimetableEntryId;
  period_id: EdmTimetablePeriodDefId;
  class_subject_allocation_id: EdmClassSubjectAllocationId;
  day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  teacher_id: AdmStaffId;
}


// =================================================================================
// SECTION 7: FINANCE MODULE (`fin_`)
// =================================================================================

export interface FinBank extends BaseModel {
  id: FinBankId;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string;
  linked_chart_of_account_id: FinChartOfAccountId;
}

export interface FinChartOfAccount extends BaseModel {
  id: FinChartOfAccountId;
  account_name: string;
  account_code: string;
  account_type: AccountType;
  parent_account_id?: FinChartOfAccountId;
  is_active: boolean;
}

export interface FinGeneralLedger extends BaseModel {
  id: FinGeneralLedgerId;
  transaction_date: Date;
  description: string;
  account_id: FinChartOfAccountId;
  debit: number;
  credit: number;
  reference_id: string;
  reference_type: string;
}

export interface FinFeeTemplate extends BaseModel {
  id: FinFeeTemplateId;
  name: string;
  description: string;
  academic_year_id: CoreAcademicYearId;
}

export interface FinFeeTemplateItem extends BaseModel {
  id: FinFeeTemplateItemId;
  template_id: FinFeeTemplateId;
  description: string;
  amount: number;
  revenue_account_id: FinChartOfAccountId;
}

export interface FinStudentInvoice extends BaseModel {
  id: FinStudentInvoiceId;
  student_id: AdmStudentId;
  school_period_id: CoreSchoolPeriodId;
  invoice_date: Date;
  due_date: Date;
  status: InvoiceStatus;
  total_amount: number;
  paid_amount: number;
  balance: number;
}

export interface FinStudentInvoiceItem extends BaseModel {
  id: FinStudentInvoiceItemId;
  invoice_id: FinStudentInvoiceId;
  description: string;
  amount: number;
  revenue_account_id: FinChartOfAccountId;
}

export interface FinStudentPayment extends BaseModel {
  id: FinStudentPaymentId;
  student_id: AdmStudentId;
  payment_date: Date;
  amount: number;
  payment_method: string;
  reference_number?: string;
  bank_id?: FinBankId;
  is_allocated: boolean;
}

export interface FinInvoicePaymentApplication extends BaseModel {
  id: FinInvoicePaymentApplicationId;
  payment_id: FinStudentPaymentId;
  invoice_item_id: FinStudentInvoiceItemId;
  amount_applied: number;
}

export interface FinVendor extends BaseModel {
  id: FinVendorId;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface FinExpense extends BaseModel {
  id: FinExpenseId;
  vendor_id?: FinVendorId;
  expense_date: Date;
  description: string;
  amount: number;
  expense_account_id: FinChartOfAccountId;
  paid_from_account_id: FinChartOfAccountId;
}


// =================================================================================
// SECTION 8: HUMAN RESOURCES MODULE (`hr_`)
// =================================================================================

export interface HrPayrollPeriod extends BaseModel {
  id: HrPayrollPeriodId;
  name: string;
  start_date: Date;
  end_date: Date;
  status: PayrollStatus;
}

export interface HrPayrollItemType extends BaseModel {
  id: HrPayrollItemTypeId;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  linked_chart_of_account_id: FinChartOfAccountId;
}

export interface HrStaffSalarySetting extends BaseModel {
  id: HrStaffSalarySettingId;
  staff_id: AdmStaffId;
  payroll_item_type_id: HrPayrollItemTypeId;
  amount: number;
}

export interface HrPayslip extends BaseModel {
  id: HrPayslipId;
  payroll_period_id: HrPayrollPeriodId;
  staff_id: AdmStaffId;
  gross_earnings: number;
  total_deductions: number;
  net_salary: number;
  status: 'DRAFT' | 'CONFIRMED' | 'PAID';
}

export interface HrPayslipItem extends BaseModel {
  id: HrPayslipItemId;
  payslip_id: HrPayslipId;
  payroll_item_type_id: HrPayrollItemTypeId;
  description: string;
  amount: number;
}


// =================================================================================
// SECTION 9: INVENTORY MODULE (`inv_`)
// =================================================================================

export interface InvWarehouse extends BaseModel {
  id: InvWarehouseId;
  name: string;
  location?: string;
}

export interface InvItemCategory extends BaseModel {
  id: InvItemCategoryId;
  name: string;
  description?: string;
}

export interface InvItem extends BaseModel {
  id: InvItemId;
  name: string;
  sku: string;
  description?: string;
  category_id: InvItemCategoryId;
  warehouse_id: InvWarehouseId;
  quantity_on_hand: number;
  reorder_level: number;
  unit_cost: number;
}

export interface InvAsset extends BaseModel {
  id: InvAssetId;
  name: string;
  asset_tag: string;
  description?: string;
  category_id: InvItemCategoryId;
  location: string;
  purchase_date: Date;
  purchase_cost: number;
  status: 'IN_USE' | 'IN_STORAGE' | 'UNDER_MAINTENANCE' | 'DISPOSED';
}

export interface InvStockTransaction extends BaseModel {
  id: InvStockTransactionId;
  item_id: InvItemId;
  transaction_type: 'RECEIPT' | 'ISSUANCE' | 'ADJUSTMENT';
  quantity: number;
  notes?: string;
  reference_id: string;
}

export interface InvRequisition extends BaseModel {
  id: InvRequisitionId;
  requisition_date: Date;
  requested_by_staff_id: AdmStaffId;
  department_id: AdmDepartmentId;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  notes?: string;
}

export interface InvRequisitionItem extends BaseModel {
  id: InvRequisitionItemId;
  requisition_id: InvRequisitionId;
  item_name_or_description: string;
  quantity_requested: number;
  quantity_approved?: number;
}


// =================================================================================
// SECTION 10: LIBRARY MODULE (`lib_`)
// =================================================================================

export interface LibBookCategory extends BaseModel {
  id: LibBookCategoryId;
  name: string;
  description?: string;
}

export interface LibBook extends BaseModel {
  id: LibBookId;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  category_id: LibBookCategoryId;
  total_stock: number;
  available_stock: number;
}

export interface LibLoan extends BaseModel {
  id: LibLoanId;
  book_id: LibBookId;
  borrower_id: AdmStudentId | AdmStaffId;
  borrower_type: BorrowerType;
  loan_date: Date;
  due_date: Date;
  returned_at: Date | null;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';
}

export interface LibFine extends BaseModel {
  id: LibFineId;
  loan_id: LibLoanId;
  amount: number;
  reason: string;
  status: 'OUTSTANDING' | 'PAID';
  payment_id?: FinStudentPaymentId;
}


// =================================================================================
// SECTION 11: NUTRITION MODULE (`nut_`)
// =================================================================================

export interface NutFoodItem extends BaseModel {
  id: NutFoodItemId;
  name: string;
  description?: string;
  category: string;
}

export interface NutMenu extends BaseModel {
  id: NutMenuId;
  name: string;
  description?: string;
  date_applicable: Date;
}

export interface NutMenuItem extends BaseModel {
  id: NutMenuItemId;
  menu_id: NutMenuId;
  food_item_id: NutFoodItemId;
}

export interface NutMealPlan extends BaseModel {
  id: NutMealPlanId;
  name: string;
  start_date: Date;
  end_date: Date;
}

export interface NutMealPlanEntry extends BaseModel {
  id: NutMealPlanEntryId;
  meal_plan_id: NutMealPlanId;
  menu_id: NutMenuId;
  date: Date;
  meal_type: 'BREAKFAST' | 'LUNCH' | 'SNACK' | 'DINNER';
}

export interface NutMealConsumptionLog extends BaseModel {
  id: NutMealConsumptionLogId;
  student_id: AdmStudentId;
  meal_plan_entry_id: NutMealPlanEntryId;
  consumption_time: Date;
}

export interface NutStudentWallet extends BaseModel {
  id: NutStudentWalletId;
  student_id: AdmStudentId; // Unique
  balance: number;
}

export interface NutWalletTransaction extends BaseModel {
  id: NutWalletTransactionId;
  wallet_id: NutStudentWalletId;
  transaction_type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  reference_id?: string;
}


// =================================================================================
// SECTION 12: AUDIT & WORKFLOW MODULES (`log_`, `flow_`)
// =================================================================================

export interface LogAudit extends BaseModel {
  id: LogAuditId;
  user_id: CoreUserId;
  action: AuditAction;
  table_name: string;
  record_id: string;
  old_value: any | null;
  new_value: any | null;
}

export interface FlowWorkflow extends BaseModel {
  id: FlowWorkflowId;
  name: string;
  description: string;
  applies_to_document_type: string;
}

export interface FlowWorkflowState extends BaseModel {
  id: FlowWorkflowStateId;
  workflow_id: FlowWorkflowId;
  name: string;
  description: string;
  is_initial_state: boolean;
  is_final_state: boolean;
}

export interface FlowWorkflowTransition extends BaseModel {
  id: FlowWorkflowTransitionId;
  from_state_id: FlowWorkflowStateId;
  to_state_id: FlowWorkflowStateId;
  required_role_id: CoreRoleId;
}

export interface FlowDocumentHistory extends BaseModel {
  id: FlowDocumentHistoryId;
  document_id: string; // Generic ID for any document type
  document_type: string;
  from_state_id: FlowWorkflowStateId;
  to_state_id: FlowWorkflowStateId;
  user_id: CoreUserId;
  comment?: string;
}


// =================================================================================
// SECTION 13: SETTINGS MODULE (`settings_`)
// =================================================================================

export interface SettingsSchoolProfile extends BaseModel {
  id: SettingsSchoolProfileId;
  school_name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo_url?: string;
}

export interface SettingsModuleConfiguration extends BaseModel {
  id: SettingsModuleConfigurationId;
  module_key: string;
  is_enabled: boolean;
}


// =================================================================================
// SECTION 14: REPORTS MODULE (READ-ONLY TYPES)
// These do not extend BaseModel as they are not database tables.
// =================================================================================

export interface ReportStudentMasterlistEntry {
  student_id: AdmStudentId;
  admission_no: string;
  full_name: string;
  class_name: string;
  gender: string;
  date_of_birth: Date;
  status: string;
  parent_name: string;
  parent_contact: string;
}

export interface ReportFeeCollectionSummary {
  fee_template_name: string;
  total_billed: number;
  total_collected: number;
  total_outstanding: number;
  collection_percentage: number;
}

export interface ReportAccountLedgerEntry {
  transaction_date: Date;
  description: string;
  reference_type: string;
  reference_id: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface ReportExamResultsHorizontalRow {
  student_id: AdmStudentId;
  admission_no: string;
  student_name: string;
  total_marks: number;
  average_mark: number;
  class_rank: number;
  [subject_code: string]: any;
}

export interface ReportTeacherAssignmentsEntry {
  teacher_id: AdmStaffId;
  teacher_name: string;
  class_name: string;
  subject_name: string;
  number_of_students: number;
} 