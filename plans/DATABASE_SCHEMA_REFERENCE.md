# SchoolPilot3 Database Schema Reference
## Complete SurrealDB Schema Documentation

**Document Version:** 1.0.0  
**Date:** February 17, 2026  
**Database:** SurrealDB 2.1+

---

# TABLE OF CONTENTS

1. [Introduction](#1-introduction)
2. [Namespace Overview](#2-namespace-overview)
3. [System Namespace](#3-system-namespace)
4. [Core Namespace](#4-core-namespace)
5. [Administration Namespace](#5-administration-namespace)
6. [Academics Namespace](#6-academics-namespace)
7. [Finance Namespace](#7-finance-namespace)
8. [HR Namespace](#8-hr-namespace)
9. [Library Namespace](#9-library-namespace)
10. [Inventory Namespace](#10-inventory-namespace)
11. [Nutrition Namespace](#11-nutrition-namespace)
12. [Admissions Namespace](#12-admissions-namespace)
13. [Audit Namespace](#13-audit-namespace)
14. [Indexes](#14-indexes)

---

# 1. INTRODUCTION

## 1.1 Database Overview

| Attribute | Value |
|----------|-------|
| Database Type | SurrealDB (Document-Graph Hybrid) |
| Version | 2.1+ |
| Namespaces | 12 |
| Tables | 80+ |
| Indexes | 50+ |

## 1.2 Naming Conventions

| Entity | Convention | Example |
|--------|------------|---------|
| Namespaces | lowercase | `system`, `finance` |
| Tables | lowercase_snake | `student_invoices` |
| Fields | lowercase_snake | `first_name` |
| Indexes | `idx_<table>_<field>` | `idx_students_admission` |

## 1.3 Field Types

| Type | Description |
|------|-------------|
| `string` | Text data |
| `int` | Integer numbers |
| `float` | Decimal numbers |
| `bool` | Boolean (true/false) |
| `datetime` | ISO 8601 timestamp |
| `option<T>` | Nullable field |
| `array<T>` | Array of type T |
| `record` | Reference to another table |

---

# 2. NAMESPACE OVERVIEW

```
schoolpilot (Root Namespace)
├── system          # Authentication, users, roles
├── core            # Academic years, periods, workflows
├── administration  # Students, staff, attendance
├── academics      # Subjects, exams, results
├── finance        # Invoices, payments, ledger
├── hr             # Payroll, leaves
├── library        # Books, loans
├── inventory      # Stock, assets
├── nutrition      # Meal plans, wallets
├── admissions    # Applications
└── audit         # Audit logs
```

---

# 3. SYSTEM NAMESPACE

The `system` namespace handles authentication, authorization, and core user management.

## 3.1 Tables

### system.users

Main user table for authentication.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| username | string | yes | Unique username |
| email | string | yes | User email (unique) |
| password_hash | string | yes | Bcrypt hashed password |
| first_name | string | yes | First name |
| last_name | string | yes | Last name |
| phone | option\<string\> | no | Phone number |
| photo_url | option\<string\> | no | Profile photo URL |
| role_id | record(roles) | yes | Associated role |
| is_active | bool | yes | Account active status |
| is_super_admin | bool | yes | Super admin flag |
| last_login_at | option\<datetime\> | no | Last login timestamp |
| password_changed_at | option\<datetime\> | no | Last password change |
| failed_login_attempts | int | yes | Failed login count |
| locked_until | option\<datetime\> | no | Account lockout time |
| email_verified | bool | yes | Email verified flag |
| created_at | datetime | auto | Creation timestamp |
| updated_at | datetime | auto | Update timestamp |

### system.roles

User roles for RBAC.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Role name |
| description | option\<string\> | no | Role description |
| permissions | array\<record\> | yes | Array of permission IDs |
| is_system | bool | yes | System role flag |
| is_active | bool | yes | Role active status |
| created_at | datetime | auto | Creation timestamp |

### system.permissions

Granular permissions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Permission name |
| resource | string | yes | Resource (e.g., "students") |
| action | string | yes | Action (e.g., "read", "create") |
| description | option\<string\> | no | Description |

### system.user_roles

User-role assignments (many-to-many).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| user_id | record(users) | yes | User reference |
| role_id | record(roles) | yes | Role reference |
| assigned_at | datetime | auto | Assignment timestamp |
| assigned_by | record(users) | yes | Assigned by user |

### system.sessions

Active user sessions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| user_id | record(users) | yes | User reference |
| token | string | yes | Access token |
| refresh_token | string | yes | Refresh token |
| ip_address | option\<string\> | no | Client IP |
| user_agent | option\<string\> | no | Client user agent |
| expires_at | datetime | yes | Token expiry |

### system.config

Application configuration key-value store.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| key | string | yes | Configuration key |
| value | any | yes | Configuration value |
| category | string | yes | Config category |
| is_public | bool | yes | Public visibility |
| updated_at | datetime | auto | Update timestamp |

### system.schools

Multi-tenant school records.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | School name |
| code | string | yes | School code |
| address | option\<string\> | no | Address |
| phone | option\<string\> | no | Phone |
| email | option\<string\> | no | Email |
| website | option\<string\> | no | Website |
| logo_url | option\<string\> | no | Logo URL |
| motto | option\<string\> | no | School motto |
| school_type | string | yes | Government/Private/NGO |
| gender_type | string | yes | Boys/Girls/Mixed |
| country | string | yes | Country |
| currency | string | yes | Currency code |
| timezone | string | yes | Timezone |
| is_active | bool | yes | Active status |

---

# 4. CORE NAMESPACE

The `core` namespace contains shared infrastructure like academic years, periods, and workflows.

## 4.1 Tables

### core.academic_year_structures

Defines the structure of academic years (e.g., 8-4-4, CBC).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Structure name |
| description | option\<string\> | no | Description |

### core.academic_years

Actual academic years.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Year name (e.g., "2025") |
| structure_id | record(academic_year_structures) | yes | Structure reference |
| start_date | datetime | yes | Year start date |
| end_date | datetime | yes | Year end date |
| is_current | bool | yes | Current year flag |
| status | string | yes | active/archived |
| created_at | datetime | auto | Creation timestamp |

### core.period_definitions

Defines period types within a structure (terms, semesters).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| structure_id | record(academic_year_structures) | yes | Structure reference |
| name | string | yes | Period name (e.g., "Term 1") |
| sequence_order | int | yes | Order in year |
| type | string | yes | term/semester/quarter |

### core.school_periods

Actual active periods within an academic year.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| academic_year_id | record(academic_years) | yes | Year reference |
| period_definition_id | record(period_definitions) | yes | Definition reference |
| name | string | yes | Period display name |
| start_date | datetime | yes | Period start |
| end_date | datetime | yes | Period end |
| mid_break_start | option\<datetime\> | no | Mid-break start |
| mid_break_end | option\<datetime\> | no | Mid-break end |
| is_active | bool | yes | Active flag |
| created_at | datetime | auto | Creation timestamp |

### core.financial_years

Fiscal years for finance.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Year name |
| start_date | datetime | yes | Year start |
| end_date | datetime | yes | Year end |
| status | string | yes | open/closed/archived |
| is_current | bool | yes | Current year flag |

### core.period_slots

Time slots for timetable periods.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Period name (e.g., "Period 1") |
| start_time | string | yes | Start time (HH:MM) |
| end_time | string | yes | End time (HH:MM) |
| sequence_order | int | yes | Order in day |
| is_break | bool | yes | Break period flag |
| duration_minutes | int | yes | Duration in minutes |

### core.workflows

Approval workflow definitions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Workflow name |
| description | option\<string\> | no | Description |
| entity_type | string | yes | Target entity type |
| is_active | bool | yes | Active flag |

### core.workflow_states

States within a workflow.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| workflow_id | record(workflows) | yes | Parent workflow |
| name | string | yes | State name |
| sequence_order | int | yes | Order in workflow |
| is_initial | bool | yes | Initial state |
| is_final | bool | yes | Final state |

---

# 5. ADMINISTRATION NAMESPACE

The `administration` namespace manages students, staff, and organizational data.

## 5.1 Tables

### administration.students

Enrolled students.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| admission_no | string | yes | Admission number (unique) |
| upi_no | option\<string\> | no | UPI number |
| first_name | string | yes | First name |
| middle_name | option\<string\> | no | Middle name |
| last_name | string | yes | Last name |
| gender | string | yes | Male/Female/Other |
| date_of_birth | option\<datetime\> | no | Date of birth |
| photo_url | option\<string\> | no | Photo URL |
| current_class_stream_id | option\<record\> | no | Current class |
| student_category_id | option\<record\> | no | Category |
| dormitory_id | option\<record\> | no | Dormitory |
| admission_date | option\<datetime\> | no | Admission date |
| status | string | yes | active/alumni/transferred/suspended/expelled/withdrawn |
| address | option\<string\> | no | Address |
| county | option\<string\> | no | County |
| nationality | option\<string\> | no | Nationality |
| religion | option\<string\> | no | Religion |
| email | option\<string\> | no | Email |
| phone | option\<string\> | no | Phone |
| user_id | option\<record\> | no | Linked user account |
| created_at | datetime | auto | Creation timestamp |
| updated_at | datetime | auto | Update timestamp |
| deleted_at | option\<datetime\> | no | Soft delete timestamp |

### administration.parents_guardians

Student guardians/parents.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| first_name | string | yes | First name |
| last_name | string | yes | Last name |
| full_name | string | yes | Full name |
| email | option\<string\> | no | Email |
| phone | string | yes | Primary phone |
| alt_phone | option\<string\> | no | Alternative phone |
| relationship_type | string | yes | Father/Mother/Guardian/Other |
| id_number | option\<string\> | no | ID number |
| occupation | option\<string\> | no | Occupation |
| employer | option\<string\> | no | Employer |
| address | option\<string\> | no | Address |
| user_id | option\<record\> | no | Linked user account |
| is_primary | bool | yes | Primary guardian |

### administration.student_guardians

Student-guardian relationships (many-to-many).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| student_id | record(students) | yes | Student reference |
| guardian_id | record(parents_guardians) | yes | Guardian reference |
| relationship_type | string | yes | Relationship type |
| is_primary_contact | bool | yes | Primary contact flag |
| is_emergency_contact | bool | yes | Emergency contact flag |

### administration.staff

Staff/employee records.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| staff_no | string | yes | Staff number (unique) |
| user_id | option\<record\> | no | Linked user |
| first_name | string | yes | First name |
| last_name | string | yes | Last name |
| full_name | string | yes | Full name |
| gender | string | yes | Gender |
| date_of_birth | option\<datetime\> | no | DOB |
| email | option\<string\> | no | Email |
| phone | option\<string\> | no | Phone |
| photo_url | option\<string\> | no | Photo URL |
| id_number | option\<string\> | no | National ID |
| kra_pin | option\<string\> | no | KRA PIN |
| department_id | option\<record\> | no | Department |
| designation_id | option\<record\> | no | Designation |
| employment_type | string | yes | permanent/contract/part-time |
| employment_date | option\<datetime\> | no | Hire date |
| is_teaching_staff | bool | yes | Teaching staff flag |
| is_active | bool | yes | Active flag |
| created_at | datetime | auto | Creation timestamp |

### administration.departments

Organizational departments.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Department name |
| code | option\<string\> | no | Code |
| is_academic | bool | yes | Academic department flag |
| hod_id | option\<record\> | no | Head of department |

### administration.designations

Job titles/positions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| title | string | yes | Title |
| department_id | option\<record\> | no | Department |
| is_teaching | bool | yes | Teaching position flag |

### administration.classes

Grade levels (e.g., Grade 1, Form 1).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Class name |
| code | option\<string\> | no | Code |
| level | int | yes | Numeric level |
| is_active | bool | yes | Active flag |

### administration.class_streams

Class sections (e.g., Grade 1A, Grade 1B).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| class_id | record(classes) | yes | Parent class |
| name | string | yes | Stream name (A, B, etc.) |
| capacity | option\<int\> | no | Maximum students |
| class_teacher_id | option\<record\> | no | Class teacher |
| room_no | option\<string\> | no | Room number |
| is_active | bool | yes | Active flag |

### administration.student_categories

Student categories (Boarding, Day, etc.).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Category name |

### administration.dormitories

Boarding dormitories.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Dormitory name |
| gender | string | yes | Boys/Girls/Mixed |
| capacity | option\<int\> | no | Capacity |
| master_id | option\<record\> | no | Dorm master |

### administration.student_attendance

Daily student attendance.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| student_id | record(students) | yes | Student |
| class_stream_id | record(class_streams) | yes | Class |
| school_period_id | record(core.school_periods) | yes | Period |
| date | datetime | yes | Attendance date |
| status | string | yes | Present/Absent/Late/Excused |
| remarks | option\<string\> | no | Notes |
| marked_by | record | yes | Recorded by |
| marked_at | datetime | auto | Recorded timestamp |

### administration.health_records

Student medical records.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| student_id | record(students) | yes | Student |
| blood_type | option\<string\> | no | Blood type |
| allergies | option\<string\> | no | Allergies |
| medical_conditions | option\<string\> | no | Medical conditions |
| medications | option\<string\> | no | Current medications |
| emergency_contact_name | option\<string\> | no | Emergency contact |
| emergency_contact_phone | option\<string\> | no | Emergency phone |
| last_checkup | option\<datetime\> | no | Last checkup |

---

# 6. ACADEMICS NAMESPACE

The `academics` namespace handles subjects, enrollments, exams, and grades.

## 6.1 Tables

### academics.subjects

Courses/subjects offered.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Subject name |
| code | string | yes | Subject code (unique) |
| abbreviation | string | yes | Short name |
| description | option\<string\> | no | Description |
| department_id | option\<record\> | no | Department |
| is_compulsory | bool | yes | Compulsory flag |
| subject_grouping | option\<string\> | no | Group 1/2/3/4/5 |
| is_active | bool | yes | Active flag |

### academics.subject_papers

Subject papers (Paper 1, Paper 2, etc.).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| subject_id | record(subjects) | yes | Parent subject |
| name | string | yes | Paper name |
| code | string | yes | Paper code |
| is_active | bool | yes | Active flag |

### academics.class_subject_allocations

Subjects assigned to classes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| class_stream_id | record(class_streams) | yes | Class stream |
| subject_id | record(subjects) | yes | Subject |
| academic_year_id | record(academic_years) | yes | Academic year |
| is_optional | bool | yes | Optional flag |

### academics.teacher_subject_assignments

Teachers assigned to subjects.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| allocation_id | record(class_subject_allocations) | yes | Subject allocation |
| teacher_id | record(staff) | yes | Teacher |
| is_primary | bool | yes | Primary teacher |
| academic_year_id | record(academic_years) | yes | Academic year |

### academics.student_enrollments

Student subject enrollments.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| student_id | record(students) | yes | Student |
| allocation_id | record(class_subject_allocations) | yes | Subject allocation |
| academic_year_id | record(academic_years) | yes | Academic year |
| enrollment_date | datetime | auto | Enrollment date |
| status | string | yes | enrolled/withdrawn/completed |

### academics.timetable_entries

Weekly timetable.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| class_stream_id | record(class_streams) | yes | Class |
| subject_id | record(subjects) | yes | Subject |
| teacher_id | record(staff) | yes | Teacher |
| day_of_week | string | yes | MONDAY-FRIDAY |
| period_slot_id | record(core.period_slots) | yes | Period |
| room | option\<string\> | no | Room |
| academic_year_id | record(academic_years) | yes | Year |

### academics.exam_sessions

Exam periods.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Session name |
| school_period_id | record(core.school_periods) | yes | Period |
| start_date | datetime | yes | Start date |
| end_date | datetime | yes | End date |
| status | string | yes | planning/marks_entry/published/closed |
| is_published | bool | yes | Published flag |

### academics.exam_paper_settings

Exam paper configuration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| exam_session_id | record(exam_sessions) | yes | Exam session |
| subject_id | record(subjects) | yes | Subject |
| paper_id | option\<record\> | no | Subject paper |
| class_stream_id | record(class_streams) | yes | Class |
| marks_out_of | int | yes | Maximum marks |
| weight_percentage | float | yes | Weight |
| date | option\<datetime\> | no | Exam date |
| duration_minutes | option\<int\> | no | Duration |
| invigilator_id | option\<record\> | no | Invigilator |
| room | option\<string\> | no | Room |

### academics.exam_results

Student exam results.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| student_id | record(students) | yes | Student |
| exam_session_id | record(exam_sessions) | yes | Exam session |
| class_stream_id | record(class_streams) | yes | Class |
| total_marks | option\<float\> | no | Total marks |
| mean_grade | option\<string\> | no | Mean grade |
| points | option\<float\> | no | Grade points |
| class_rank | option\<int\> | no | Class rank |
| stream_rank | option\<int\> | no | Stream rank |
| is_published | bool | yes | Published flag |
| approved_by | option\<record\> | no | Approver |
| approved_at | option\<datetime\> | no | Approval timestamp |

### academics.paper_marks

Individual paper marks.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| exam_result_id | record(exam_results) | yes | Result |
| paper_setting_id | record(exam_paper_settings) | yes | Paper setting |
| marks_obtained | option\<float\> | no | Marks |
| grade | option\<string\> | no | Grade |
| entered_by | record | yes | Entered by |
| entered_at | datetime | auto | Entry timestamp |

### academics.grading_schemes

Grade definitions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Scheme name |
| description | option\<string\> | no | Description |
| is_default | bool | yes | Default scheme |
| education_system | string | yes | 8-4-4/CBC/etc |
| is_active | bool | yes | Active flag |

### academics.grading_levels

Grade boundaries within a scheme.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| scheme_id | record(grading_schemes) | yes | Parent scheme |
| grade | string | yes | Grade letter |
| min_score | int | yes | Minimum score |
| max_score | int | yes | Maximum score |
| points | option\<float\> | no | Grade points |
| description | option\<string\> | no | Description |

---

# 7. FINANCE NAMESPACE

The `finance` namespace handles fees, invoices, payments, and general ledger.

## 7.1 Tables

### finance.chart_of_accounts

General ledger accounts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| account_code | string | yes | Account code (unique) |
| name | string | yes | Account name |
| account_type | string | yes | Asset/Liability/Equity/Revenue/Expense |
| category | option\<string\> | no | Sub-category |
| parent_account_id | option\<record\> | no | Parent account |
| template_type | string | yes | core/custom |
| is_active | bool | yes | Active flag |
| is_contra | bool | yes | Contra account flag |
| accepts_transactions | bool | yes | Accepts transactions |

### finance.fee_templates

Fee structure templates.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Template name |
| description | option\<string\> | no | Description |
| school_period_id | record(core.school_periods) | yes | Period |
| academic_year_id | record(core.academic_years) | yes | Year |
| student_category_id | option\<record\> | no | Category |
| class_stream_id | option\<record\> | no | Class |
| is_active | bool | yes | Active flag |

### finance.fee_template_items

Items within a fee template.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| fee_template_id | record(fee_templates) | yes | Parent template |
| description | string | yes | Item description |
| amount | float | yes | Amount |
| is_optional | bool | yes | Optional flag |
| revenue_account_id | record(chart_of_accounts) | yes | Revenue GL |
| linked_expense_category_id | option\<record\> | no | Linked expense |
| linked_meal_plan_id | option\<record\> | no | Linked meal plan |
| linked_transport_route_id | option\<record\> | no | Linked route |
| sort_order | int | yes | Display order |

### finance.student_invoices

Student fee invoices.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| invoice_number | string | yes | Invoice number (unique) |
| student_id | record(students) | yes | Student |
| school_period_id | record(core.school_periods) | yes | Period |
| academic_year_id | record(core.academic_years) | yes | Year |
| issue_date | datetime | yes | Issue date |
| due_date | datetime | yes | Due date |
| total_amount_billed | float | yes | Total billed |
| total_amount_paid | float | yes | Total paid |
| total_discount | float | yes | Total discount |
| total_penalty | float | yes | Total penalty |
| status | string | yes | draft/due/partially_paid/paid/overdue/voided |
| notes | option\<string\> | no | Notes |
| generated_by | record | yes | Generated by |
| voided_at | option\<datetime\> | no | Void timestamp |
| voided_by | option\<record\> | no | Voided by |
| void_reason | option\<string\> | no | Void reason |

### finance.invoice_items

Line items on invoices.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| invoice_id | record(student_invoices) | yes | Parent invoice |
| fee_template_item_id | option\<record\> | no | Source template item |
| description | string | yes | Description |
| quantity | int | yes | Quantity |
| unit_price | float | yes | Unit price |
| amount | float | yes | Line total |
| discount_amount | float | yes | Discount |
| net_amount | float | yes | Net amount |
| revenue_account_id | record | yes | Revenue account |

### finance.student_payments

Student payments/receipts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| receipt_number | string | yes | Receipt number (unique) |
| student_id | record(students) | yes | Student |
| payment_date | datetime | yes | Payment date |
| payment_method | string | yes | Cash/M-Pesa/Cheque/Card |
| reference_number | option\<string\> | no | Reference |
| bank_reference | option\<string\> | no | Bank ref |
| total_amount | float | yes | Total amount |
| amount_applied | float | yes | Amount applied |
| change_amount | float | yes | Change given |
| status | string | yes | pending/completed/reversed/failed |
| collected_by | record | yes | Collected by |
| notes | option\<string\> | no | Notes |

### finance.payment_applications

Payment allocation to invoices.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| payment_id | record(student_payments) | yes | Payment |
| invoice_id | record(student_invoices) | yes | Invoice |
| invoice_item_id | option\<record\> | no | Specific item |
| amount_applied | float | yes | Amount applied |
| applied_at | datetime | auto | Application timestamp |
| applied_by | record | yes | Applied by |

### finance.fee_adjustments

Fee discounts, scholarships, penalties.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| student_id | record(students) | yes | Student |
| school_period_id | record(core.school_periods) | yes | Period |
| adjustment_type | string | yes | scholarship/discount/exemption/penalty |
| amount | float | yes | Adjustment amount |
| percentage | option\<float\> | no | Percentage |
| reason | option\<string\> | no | Reason |
| applied_invoice_id | option\<record\> | no | Applied to invoice |
| is_auto_applied | bool | yes | Auto-apply flag |
| approved_by | option\<record\> | no | Approver |
| approved_at | option\<datetime\> | no | Approval timestamp |
| status | string | yes | active/revoked/expired |
| effective_from | datetime | yes | Effective from |
| effective_to | option\<datetime\> | no | Effective to |
| created_by | record | yes | Created by |

### finance.transport_routes

Bus/transport routes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Route name |
| description | option\<string\> | no | Description |
| area | option\<string\> | no | Area covered |
| cost_per_term | float | yes | Cost per term |
| cost_per_month | option\<float\> | no | Cost per month |
| vehicle_number | option\<string\> | no | Vehicle |
| driver_name | option\<string\> | no | Driver |
| driver_phone | option\<string\> | no | Driver phone |
| stops | array | yes | Array of stops |
| is_active | bool | yes | Active flag |

### finance.student_transport

Student transport assignments.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| student_id | record(students) | yes | Student |
| route_id | record(transport_routes) | yes | Route |
| school_period_id | record(core.school_periods) | yes | Period |
| status | string | yes | active/inactive/cancelled |
| cost_override | option\<float\> | no | Custom cost |
| stop_name | option\<string\> | no | Pickup stop |
| pickup_time | option\<string\> | no | Pickup time |
| assigned_at | datetime | auto | Assigned timestamp |

### finance.general_ledger_entries

Journal entries.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| entry_number | string | yes | Entry number (unique) |
| transaction_date | datetime | yes | Transaction date |
| effective_date | datetime | yes | Effective date |
| financial_year_id | record(core.financial_years) | yes | Year |
| account_id | record(chart_of_accounts) | yes | Account |
| debit_amount | float | yes | Debit amount |
| credit_amount | float | yes | Credit amount |
| description | string | yes | Description |
| source_table | option\<string\> | no | Source entity |
| source_id | option\<string\> | no | Source ID |
| reference_number | option\<string\> | no | Reference |
| is_reversed | bool | yes | Reversed flag |
| reversed_entry_id | option\<record\> | no | Reversal entry |
| created_by | record | yes | Created by |

---

# 8. HR NAMESPACE

The `hr` namespace handles payroll and leave management.

## 8.1 Tables

### hr.payroll_periods

Payroll processing periods.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Period name |
| period_type | string | yes | monthly/bi-weekly/weekly |
| start_date | datetime | yes | Period start |
| end_date | datetime | yes | Period end |
| payment_date | datetime | yes | Payment date |
| financial_year_id | record(core.financial_years) | yes | Year |
| status | string | yes | open/closed/processed |
| is_locked | bool | yes | Locked flag |

### hr.payroll_item_types

Salary item types (allowances, deductions).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Item name |
| category | string | yes | earning/deduction |
| sub_category | option\<string\> | no | Sub-category |
| tax_implication | string | yes | taxable/non_taxable/relief |
| is_recurring | bool | yes | Recurring flag |
| gl_expense_account_id | option\<record\> | no | Expense account |
| gl_liability_account_id | option\<record\> | no | Liability account |
| calculation_type | string | yes | fixed/percentage/formula |
| calculation_value | option\<float\> | no | Calculation value |
| is_active | bool | yes | Active flag |

### hr.staff_salary_settings

Staff salary configuration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| staff_id | record(staff) | yes | Staff member |
| basic_salary | float | yes | Basic salary |
| payment_bank | option\<string\> | no | Bank name |
| bank_account_name | option\<string\> | no | Account name |
| bank_account_number | option\<string\> | no | Account number |
| bank_branch | option\<string\> | no | Branch |
| kra_pin | option\<string\> | no | KRA PIN |
| nssf_number | option\<string\> | no | NSSF number |
| nhif_number | option\<string\> | no | NHIF number |
| is_active | bool | yes | Active flag |
| effective_from | datetime | yes | Effective from |

### hr.staff_salary_items

Recurring salary items.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| salary_setting_id | record(staff_salary_settings) | yes | Parent setting |
| item_type_id | record(payroll_item_types) | yes | Item type |
| amount | float | yes | Amount |
| percentage | option\<float\> | no | Percentage |
| is_taxable | bool | yes | Taxable flag |
| effective_from | datetime | yes | Effective from |
| effective_to | option\<datetime\> | no | Effective to |

### hr.payslips

Generated payslips.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| payslip_number | string | yes | Payslip number (unique) |
| staff_id | record(staff) | yes | Staff |
| payroll_period_id | record(payroll_periods) | yes | Period |
| basic_salary | float | yes | Basic salary |
| total_earnings | float | yes | Total earnings |
| total_deductions | float | yes | Total deductions |
| gross_salary | float | yes | Gross salary |
| net_salary | float | yes | Net salary |
| income_tax | float | yes | Income tax |
| nssf_contribution | float | yes | NSSF |
| nhif_contribution | float | yes | NHIF |
| status | string | yes | draft/computed/approved/paid |
| payment_method | option\<string\> | no | Payment method |
| payment_date | option\<datetime\> | no | Payment date |
| processed_by | option\<record\> | no | Processed by |
| approved_by | option\<record\> | no | Approved by |

### hr.payslip_items

Payslip line items.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| payslip_id | record(payslips) | yes | Parent payslip |
| item_type_id | record(payroll_item_types) | yes | Item type |
| category | string | yes | Category |
| description | string | yes | Description |
| amount | float | yes | Amount |

### hr.leave_types

Leave type definitions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Leave type |
| description | option\<string\> | no | Description |
| days_allowed | int | yes | Days per year |
| is_paid | bool | yes | Paid leave |
| requires_approval | bool | yes | Approval required |

### hr.leave_requests

Leave requests.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| staff_id | record(staff) | yes | Staff |
| leave_type_id | record(leave_types) | yes | Leave type |
| start_date | datetime | yes | Start date |
| end_date | datetime | yes | End date |
| days | float | yes | Number of days |
| reason | option\<string\> | no | Reason |
| status | string | yes | pending/approved/rejected/cancelled |
| approved_by | option\<record\> | no | Approver |
| approved_at | option\<datetime\> | no | Approval timestamp |
| rejection_reason | option\<string\> | no | Rejection reason |

---

# 9. LIBRARY NAMESPACE

## 9.1 Tables

### library.book_categories

Book categories/genres.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Category name |
| description | option\<string\> | no | Description |
| parent_category_id | option\<record\> | no | Parent category |

### library.books

Book catalog.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| title | string | yes | Book title |
| author | option\<string\> | no | Author |
| co_authors | array | no | Co-authors |
| isbn | option\<string\> | no | ISBN |
| publisher | option\<string\> | no | Publisher |
| publish_year | option\<int\> | no | Year |
| category_id | option\<record\> | no | Category |
| accession_number | string | yes | Accession number (unique) |
| barcode | option\<string\> | no | Barcode |
| purchase_date | option\<datetime\> | no | Purchase date |
| purchase_cost | option\<float\> | no | Cost |
| status | string | yes | available/on_loan/lost/damaged |
| condition | option\<string\> | no | Condition |
| shelf_location | option\<string\> | no | Location |

### library.loans

Book loans.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| book_id | record(books) | yes | Book |
| user_id | record | yes | Borrower |
| user_type | string | yes | student/staff |
| loan_date | datetime | yes | Loan date |
| due_date | datetime | yes | Due date |
| return_date | option\<datetime\> | no | Return date |
| status | string | yes | active/returned/overdue/lost |
| renewed_count | int | yes | Renewal count |
| issued_by | record | yes | Issued by |

### library.fines

Library fines.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| loan_id | record(loans) | yes | Loan |
| fine_type | string | yes | overdue/damage/lost |
| amount | float | yes | Fine amount |
| status | string | yes | pending/paid/waived |
| reason | option\<string\> | no | Reason |
| waiver_amount | option\<float\> | no | Waived amount |
| waived_by | option\<record\> | no | Waived by |
| paid_at | option\<datetime\> | no | Paid timestamp |

---

# 10. INVENTORY NAMESPACE

## 10.1 Tables

### inventory.warehouses

Storage locations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Warehouse name |
| code | string | yes | Code |
| location | option\<string\> | no | Location |
| manager_id | option\<record\> | no | Manager |

### inventory.item_categories

Item categories.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Category name |
| code | string | yes | Code |
| parent_category_id | option\<record\> | no | Parent |

### inventory.items

Inventory items.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Item name |
| code | string | yes | Item code |
| description | option\<string\> | no | Description |
| category_id | option\<record\> | no | Category |
| unit_of_measure | string | yes | Unit |
| item_type | string | yes | consumable/fixed_asset |
| reorder_level | option\<int\> | no | Reorder level |
| reorder_quantity | option\<int\> | no | Reorder qty |
| current_price | option\<float\> | no | Price |

### inventory.fixed_assets

Fixed assets.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| item_id | record(items) | yes | Item |
| asset_tag | string | yes | Asset tag |
| serial_number | option\<string\> | no | Serial number |
| purchase_date | option\<datetime\> | no | Purchase date |
| purchase_cost | option\<float\> | no | Cost |
| current_value | option\<float\> | no | Current value |
| depreciation_method | option\<string\> | no | Method |
| useful_life_years | option\<int\> | no | Life years |
| status | string | yes | active/disposed |

### inventory.stock_levels

Current stock quantities.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| item_id | record(items) | yes | Item |
| warehouse_id | record(warehouses) | yes | Warehouse |
| quantity | int | yes | Quantity |
| reserved_quantity | int | yes | Reserved qty |

### inventory.stock_transactions

Stock movements.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| item_id | record(items) | yes | Item |
| warehouse_id | record(warehouses) | yes | Warehouse |
| transaction_type | string | yes | receive/issue/adjustment |
| quantity | int | yes | Quantity |
| unit_cost | option\<float\> | no | Unit cost |
| reference_type | option\<string\> | no | Source type |
| reference_id | option\<string\> | no | Source ID |
| transaction_date | datetime | yes | Date |
| performed_by | record | yes | Done by |

### inventory.purchase_orders

Purchase orders.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| order_number | string | yes | Order number (unique) |
| supplier_id | record(finance.suppliers) | yes | Supplier |
| warehouse_id | record(warehouses) | yes | Warehouse |
| order_date | datetime | yes | Order date |
| expected_delivery_date | option\<datetime\> | no | Expected date |
| status | string | yes | draft/sent/confirmed/received |
| total_amount | float | yes | Total |
| approved_by | option\<record\> | no | Approved by |

### inventory.requisitions

Stock requisitions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| requisition_number | string | yes | Number |
| requesting_staff_id | record(staff) | yes | Requester |
| request_date | datetime | yes | Request date |
| status | string | yes | draft/pending/approved/rejected |
| notes | option\<string\> | no | Notes |
| approved_by | option\<record\> | no | Approver |

---

# 11. NUTRITION NAMESPACE

## 11.1 Tables

### nutrition.meal_plans

Meal plan types.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| name | string | yes | Plan name |
| description | option\<string\> | no | Description |
| meal_types | array | yes | breakfast/lunch/dinner |
| cost_per_term | option\<float\> | no | Term cost |
| cost_per_month | option\<float\> | no | Monthly cost |
| is_active | bool | yes | Active flag |

### nutrition.student_meal_plans

Student meal plan assignments.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| student_id | record(students) | yes | Student |
| meal_plan_id | record(meal_plans) | yes | Plan |
| school_period_id | record(core.school_periods) | yes | Period |
| status | string | yes | active/inactive |
| effective_from | datetime | yes | Effective from |

### nutrition.menus

Daily menu items.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| menu_date | datetime | yes | Date |
| meal_type | string | yes | breakfast/lunch/dinner |
| description | string | yes | Description |
| items | array | no | Items |
| price | option\<float\> | no | Price |
| is_available | bool | yes | Available |

### nutrition.meal_consumption

Meal consumption log.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| student_id | record(students) | yes | Student |
| menu_id | record(menus) | yes | Menu |
| consumption_date | datetime | yes | Date |
| charged_amount | float | yes | Amount |
| payment_status | string | yes | paid/unpaid |

### nutrition.student_wallets

Student wallet balances.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| student_id | record(students) | yes | Student |
| balance | float | yes | Current balance |
| last_updated | datetime | yes | Last update |

### nutrition.wallet_transactions

Wallet transactions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| wallet_id | record(student_wallets) | yes | Wallet |
| transaction_type | string | yes | deposit/withdrawal |
| amount | float | yes | Amount |
| running_balance | float | yes | Balance after |
| transaction_date | datetime | yes | Date |
| description | option\<string\> | no | Description |

---

# 12. ADMISSIONS NAMESPACE

## 12.1 Tables

### admissions.applications

Student applications.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| application_number | string | yes | Number (unique) |
| academic_year_id | record(core.academic_years) | yes | Year |
| application_type | string | yes | new/transfer/readmission |
| intended_class_id | option\<record\> | no | Applied class |
| first_name | string | yes | First name |
| last_name | string | yes | Last name |
| date_of_birth | option\<datetime\> | no | DOB |
| gender | string | yes | Gender |
| guardian_name | option\<string\> | no | Guardian |
| guardian_phone | option\<string\> | no | Guardian phone |
| previous_school | option\<string\> | no | Previous school |
| status | string | yes | draft/submitted/approved/rejected/enrolled |
| created_by | record | yes | Created by |

### admissions.application_reviews

Application reviews.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| application_id | record(applications) | yes | Application |
| reviewer_id | record(staff) | yes | Reviewer |
| review_stage | string | yes | initial/academic/interview/final |
| academic_score | option\<int\> | no | Academic score |
| interview_score | option\<int\> | no | Interview score |
| recommendation | string | yes | Recommendation |
| comments | option\<string\> | no | Comments |

### admissions.application_interviews

Interview schedules.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| application_id | record(applications) | yes | Application |
| interviewer_id | record(staff) | yes | Interviewer |
| scheduled_date | datetime | yes | Date |
| scheduled_time | string | yes | Time |
| duration_minutes | int | yes | Duration |
| status | string | yes | scheduled/completed/no_show |

---

# 13. AUDIT NAMESPACE

## 13.1 Tables

### audit.audit_logs

System audit trail.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | record | auto | Unique identifier |
| user_id | option\<record\> | no | User |
| user_type | option\<string\> | no | User type |
| action | string | yes | Action |
| entity_type | string | yes | Entity type |
| entity_id | string | yes | Entity ID |
| old_values | option\<any\> | no | Old values |
| new_values | option\<any\> | no | New values |
| changes | option\<any\> | no | Change summary |
| ip_address | option\<string\> | no | IP |
| user_agent | option\<string\> | no | User agent |
| timestamp | datetime | auto | Timestamp |

---

# 14. INDEXES

## 14.1 Performance Indexes

| Table | Index Name | Fields | Type |
|-------|-----------|--------|------|
| system.users | idx_users_username | username | unique |
| system.users | idx_users_email | email | unique |
| system.sessions | idx_sessions_token | token | unique |
| administration.students | idx_students_admission | admission_no | unique |
| administration.students | idx_students_class | current_class_stream_id | index |
| administration.students | idx_students_status | status | index |
| academics.subjects | idx_subjects_code | code | unique |
| finance.student_invoices | idx_invoices_number | invoice_number | unique |
| finance.student_invoices | idx_invoices_student | student_id | index |
| finance.student_invoices | idx_invoices_period | school_period_id | index |
| finance.student_payments | idx_payments_receipt | receipt_number | unique |
| finance.student_payments | idx_payments_student | student_id | index |
| finance.general_ledger | idx_ledger_entry | entry_number | unique |
| finance.general_ledger | idx_ledger_account | account_id | index |
| hr.payslips | idx_payslips_number | payslip_number | unique |
| library.books | idx_books_accession | accession_number | unique |
| library.loans | idx_loans_book | book_id | index |
| library.loans | idx_loans_user | user_id | index |
| inventory.items | idx_items_code | code | unique |
| admissions.applications | idx_applications_number | application_number | unique |
| audit.audit_logs | idx_audit_entity | entity_type, entity_id | compound |
| audit.audit_logs | idx_audit_user | user_id | index |
| audit.audit_logs | idx_audit_timestamp | timestamp | index |

---

**Document Version:** 1.0  
**Last Updated:** February 17, 2026
