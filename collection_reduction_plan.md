# RxDB Collection Reduction Plan

## Problem
- Current collections: 88
- RxDB open-source limit: 16
- Need to reduce by: 72 collections

## Strategy: Minimal Viable Product (MVP) Collections

Keep only the most essential collections for core school management:

### Core Essential Collections (16 total)

1. **users** - Authentication and user management
2. **students** - Student records (core entity)
3. **staff** - Staff records (core entity)
4. **classes** - Class/grade management
5. **subjects** - Academic subjects
6. **academic_years** - Academic year structure
7. **departments** - Organizational structure
8. **student_exam_results** - Academic performance tracking
9. **student_attendance** - Attendance tracking
10. **fee_templates** - Basic fee structure
11. **student_invoices** - Student billing
12. **student_payments** - Payment tracking
13. **books** - Library book management
14. **loans** - Library loan tracking
15. **permissions** - RBAC permissions
16. **rbac_roles** - User roles

### Collections to Temporarily Disable

#### Administration Module (7 collections disabled)
- partners, clubs, customers, student_health_records, communication_templates, message_campaigns

#### Finance Module (14 collections disabled)
- financial_years, chart_of_accounts, expense_categories, banks, suppliers, expense_claims, fee_adjustments, transport_routes, student_transport_assignments, invoice_payment_applications, customer_invoices, supplier_invoices, general_payments, general_ledger_entries

#### HR Module (4 collections disabled)
- payroll_periods, payroll_item_types, staff_salary_settings, payslips

#### Inventory Module (10 collections disabled)
- warehouses, item_categories_inv, items_inv, fixed_assets, asset_depreciation_logs, requisitions, purchase_orders, stock_levels, stock_transactions, rfqs

#### Nutrition Module (7 collections disabled)
- meal_plans, student_meal_plans, menus, meal_consumption_logs, merchants, student_wallets, wallet_transactions

#### Academics Module (9 collections disabled)
- subject_papers, exam_sessions, exam_schedules, grading_schemes, class_subject_allocations, teacher_subject_assignments, student_subject_enrollments, timetable_period_definitions, timetable_entries

#### Core Module (22 collections disabled)
- app_settings, school_details, roles, academic_year_structures, academic_period_definitions, workflows, workflow_states, education_system_configurations, audit_logs, parents_guardians, student_guardian_relationships, designations, student_categories, dormitories, class_streams, student_invoice_items, user_roles

#### Library Module (2 collections disabled)
- book_categories, fines

## Implementation Plan

1. Create a `ESSENTIAL_COLLECTIONS_ONLY` flag
2. Modify `collectionsDefinition` to only include essential collections when flag is true
3. Update type definitions to match
4. Test core functionality
5. Gradually re-enable collections as needed

## Future Solutions

1. **Purchase RxDB Premium** - Removes the 16 collection limit
2. **Collection Consolidation** - Merge related collections using nested documents
3. **Lazy Loading** - Load collections on-demand
4. **Alternative Database** - Consider switching to a different local database solution