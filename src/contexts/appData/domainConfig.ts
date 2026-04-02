export const DOMAIN_GROUPS = {
  core: [
    'users', 'roles', 'audit_logs', 'education_system_configurations', 'workflows',
    'academic_years', 'school_periods', 'academic_year_structures', 'academic_period_definitions', 'app_settings', 'school_details'
  ],
  academics: [
    'students', 'classes', 'class_streams', 'subjects', 'student_categories', 'subject_papers',
    'exam_sessions', 'exam_paper_settings', 'grading_schemes', 'student_exam_results',
    'class_subject_allocations', 'teacher_subject_assignments', 'student_subject_enrollments',
    'timetable_entries', 'timetable_period_defs', 'student_attendance', 'student_health_records'
  ],
  hr: [
    'staff', 'departments', 'designations', 'payroll_periods', 'payroll_item_types',
    'staff_salary_settings', 'payslips'
  ],
  finance: [
    'financial_years', 'chart_of_accounts', 'expense_categories', 'banks', 'fee_templates',
    'fee_template_items', 'expense_claims', 'student_invoices', 'student_invoice_items',
    'student_payments', 'fee_adjustments', 'invoice_payment_applications', 'customer_invoices',
    'supplier_invoices', 'student_opening_balances', 'general_payments', 'general_ledger_entries'
  ],
  inventory: [
    'warehouses', 'item_categories_inv', 'items_inv', 'fixed_assets', 'requisitions',
    'purchase_orders', 'stock_levels', 'stock_transactions', 'suppliers', 'supplier_contracts'
  ],
  shared: [
    'book_categories', 'books', 'loans', 'fines', 'transport_routes', 'student_transport_assignments',
    'meal_plans', 'menus', 'merchants', 'dormitories', 'partners', 'clubs', 'customers',
    'parents_guardians', 'templates_comm', 'campaigns', 'rfqs'
  ]
};
