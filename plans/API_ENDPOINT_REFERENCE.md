# SchoolPilot3 API Endpoint Reference
## Complete REST API Documentation

**Document Version:** 1.0.0  
**Date:** February 17, 2026  
**API Version:** v1

---

# TABLE OF CONTENTS

1. [Introduction](#1-introduction)
2. [Authentication](#2-authentication)
3. [Users & Roles](#3-users--roles)
4. [Students](#4-students)
5. [Staff](#5-staff)
6. [Academics](#6-academics)
7. [Finance](#7-finance)
8. [Human Resources](#8-human-resources)
9. [Library](#9-library)
10. [Inventory](#10-inventory)
11. [Nutrition](#11-nutrition)
12. [Admissions](#12-admissions)
13. [Reports & Dashboards](#13-reports--dashboards)
14. [System](#14-system)

---

# 1. INTRODUCTION

## 1.1 Base URL

| Environment | URL |
|------------|-----|
| Development | `http://localhost:8080/v1` |
| Staging | `https://api-staging.schoolpilot.example.com/v1` |
| Production | `https://api.schoolpilot.example.com/v1` |

## 1.2 Request Headers

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <access_token>
X-Request-ID: <uuid>
X-Correlation-ID: <uuid>
```

## 1.3 Response Envelopes

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-02-17T10:30:00Z"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [...]
  }
}
```

## 1.4 Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number | 1 |
| `per_page` | integer | Items per page (max 100) | 20 |
| `sort` | string | Sort field (prefix with `-` for desc) | created_at |
| `search` | string | Search term | - |
| `filter[field]` | string | Filter by field value | - |
| `fields` | string | Comma-separated fields to return | all |

---

# 2. AUTHENTICATION

## 2.1 Login

### POST /auth/login

Login with credentials and receive tokens.

**Request:**
```json
{
  "username": "admin",
  "password": "secure_password_123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "username": "admin",
      "email": "admin@school.edu",
      "first_name": "John",
      "last_name": "Doe",
      "role": "admin"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900
  }
}
```

### POST /auth/logout

Logout and invalidate tokens.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 2.2 Token Refresh

### POST /auth/refresh

Refresh expired access token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900
  }
}
```

## 2.3 Password Management

### POST /auth/forgot-password

Request password reset.

**Request:**
```json
{
  "email": "user@school.edu"
}
```

### POST /auth/reset-password

Reset password with token.

**Request:**
```json
{
  "token": "reset_token_here",
  "new_password": "new_secure_password"
}
```

## 2.4 Profile

### GET /auth/me

Get current authenticated user.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "username": "admin",
    "email": "admin@school.edu",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+254700000000",
    "role": "admin",
    "permissions": ["*"],
    "last_login_at": "2026-02-17T08:00:00Z"
  }
}
```

### PUT /auth/profile

Update current user profile.

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+254700000001"
}
```

### PUT /auth/change-password

Change password.

**Request:**
```json
{
  "current_password": "old_password",
  "new_password": "new_password"
}
```

---

# 3. USERS & ROLES

## 3.1 Users

### GET /users

List all users.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `role_id` | string | Filter by role |
| `is_active` | boolean | Filter by active status |
| `search` | string | Search by name/email |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "usr_abc123",
      "username": "jdoe",
      "email": "john@school.edu",
      "first_name": "John",
      "last_name": "Doe",
      "role": "teacher",
      "is_active": true,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "pagination": { "page": 1, "per_page": 20, "total": 50 }
  }
}
```

### POST /users

Create a new user.

**Request:**
```json
{
  "username": "jsmith",
  "email": "smith@school.edu",
  "first_name": "Jane",
  "last_name": "Smith",
  "password": "secure_password",
  "role_id": "role_teacher",
  "phone": "+254700000000"
}
```

### GET /users/:id

Get user by ID.

### PUT /users/:id

Update user.

### DELETE /users/:id

Soft delete user.

### POST /users/:id/roles

Assign role to user.

**Request:**
```json
{
  "role_id": "role_teacher"
}
```

### DELETE /users/:id/roles/:roleId

Remove role from user.

### GET /users/:id/permissions

Get user effective permissions.

## 3.2 Roles

### GET /roles

List all roles.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "role_admin",
      "name": "Administrator",
      "description": "Full system access",
      "is_system": true,
      "permissions": ["students:*", "staff:*", "finance:*"],
      "user_count": 3
    }
  ]
}
```

### POST /roles

Create role.

**Request:**
```json
{
  "name": "Teacher",
  "description": "Teaching staff role",
  "permissions": ["students:read", "academics:*", "attendance:*"]
}
```

### GET /roles/:id

Get role details.

### PUT /roles/:id

Update role.

### DELETE /roles/:id

Delete role (non-system only).

## 3.3 Permissions

### GET /permissions

List all available permissions.

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "perm_students_read", "resource": "students", "action": "read" },
    { "id": "perm_students_create", "resource": "students", "action": "create" },
    { "id": "perm_finance_approve", "resource": "finance", "action": "approve" }
  ]
}
```

---

# 4. STUDENTS

## 4.1 Student Management

### GET /students

List students.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `class_stream_id` | string | Filter by class |
| `status` | string | Filter by status (active, alumni, transferred) |
| `search` | string | Search by name/admission no |
| `gender` | string | Filter by gender |
| `student_category_id` | string | Filter by category |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "std_001",
      "admission_no": "ADM/2025/001",
      "first_name": "John",
      "last_name": "Doe",
      "gender": "Male",
      "date_of_birth": "2010-05-15",
      "current_class_name": "Grade 5",
      "current_stream_name": "A",
      "status": "active",
      "photo_url": "https://...",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": { "pagination": { "page": 1, "per_page": 20, "total": 500 } }
}
```

### POST /students

Create student.

**Request:**
```json
{
  "admission_no": "ADM/2025/001",
  "first_name": "John",
  "middle_name": "Michael",
  "last_name": "Doe",
  "gender": "Male",
  "date_of_birth": "2010-05-15",
  "admission_date": "2025-01-15",
  "current_class_stream_id": "cls_grade5_a",
  "student_category_id": "cat_boarding",
  "dormitory_id": "dorm_boys_a",
  "nationality": "Kenyan",
  "religion": "Christian",
  "address": "123 Main St, Nairobi",
  "phone": "+254700000000",
  "email": "john.doe@student.school.edu"
}
```

### GET /students/:id

Get student details.

### PUT /students/:id

Update student.

### DELETE /students/:id

Soft delete student (change status to withdrawn).

## 4.2 Student Profile

### GET /students/:id/profile

Get comprehensive student profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "personal": { ...student fields... },
    "guardians": [
      {
        "id": "grd_001",
        "name": "Jane Doe",
        "relationship_type": "Mother",
        "phone": "+254700000001",
        "email": "jane@email.com",
        "is_primary": true
      }
    ],
    "academic": {
      "current_class": "Grade 5",
      "stream": "A",
      "enrollment_date": "2025-01-15",
      "attendance_rate": "98.5%"
    },
    "medical": {
      "blood_type": "O+",
      "allergies": "None",
      "medical_conditions": "None"
    }
  }
}
```

## 4.3 Student Finance

### GET /students/:id/finance

Get student financial summary.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "outstanding_balance": 25000,
    "total_billed": 150000,
    "total_paid": 125000,
    "pending_invoices": [
      {
        "id": "inv_001",
        "invoice_number": "INV/2025/T1/001",
        "amount": 50000,
        "amount_paid": 25000,
        "due_date": "2025-02-28",
        "status": "partially_paid"
      }
    ],
    "recent_payments": [...],
    "adjustments": [...]
  }
}
```

## 4.4 Student Academics

### GET /students/:id/academics

Get student academic records.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "enrolled_subjects": [
      { "name": "Mathematics", "teacher": "Mr. Smith", "status": "enrolled" },
      { "name": "English", "Mrs. Johnson", "status": "enrolled" }
    ],
    "exam_results": [
      {
        "exam_name": "Term 1 Exam",
        "total_marks": 385,
        "mean_grade": "A",
        "class_rank": 5,
        "stream_rank": 2
      }
    ],
    "attendance": {
      "total_days": 45,
      "present": 44,
      "absent": 1,
      "rate": "97.8%"
    }
  }
}
```

## 4.5 Student Attendance

### GET /students/:id/attendance

Get student attendance records.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `start_date` | date | Start of range |
| `end_date` | date | End of range |
| `status` | string | Present/Absent/Late |

## 4.6 Student Documents

### GET /students/:id/documents

List student documents.

### POST /students/:id/documents

Upload document.

**Request (multipart/form-data):**
```
file: <binary>
document_type: passport_photo
```

## 4.7 Student Actions

### POST /students/:id/promote

Promote student to next class.

**Request:**
```json
{
  "academic_year_id": "ay_2026",
  "class_stream_id": "cls_grade6_a"
}
```

### POST /students/:id/transfer

Transfer student to another class.

### POST /students/:id/status

Change student status.

**Request:**
```json
{
  "status": "transferred",
  "reason": "Relocation",
  "effective_date": "2026-02-01"
}
```

---

# 5. STAFF

## 5.1 Staff Management

### GET /staff

List staff members.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `department_id` | string | Filter by department |
| `designation_id` | string | Filter by designation |
| `is_teaching_staff` | boolean | Filter by type |
| `is_active` | boolean | Filter by status |

### POST /staff

Create staff member.

**Request:**
```json
{
  "staff_no": "STF/001",
  "first_name": "John",
  "last_name": "Smith",
  "email": "john.smith@school.edu",
  "phone": "+254700000000",
  "department_id": "dept_science",
  "designation_id": "des_teacher",
  "is_teaching_staff": true,
  "employment_date": "2025-01-15",
  "id_number": "12345678",
  "kra_pin": "A123456789"
}
```

### GET /staff/:id

Get staff details.

### PUT /staff/:id

Update staff.

### DELETE /staff/:id

Soft delete staff.

## 5.2 Staff Profile

### GET /staff/:id/profile

Get comprehensive staff profile.

### GET /staff/:id/salary

Get staff salary information.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "basic_salary": 80000,
    "bank_name": "KCB",
    "bank_account": "1234567890",
    "kra_pin": "A123456789",
    "nssf_number": "NSSF12345",
    "nhif_number": "NHIF12345",
    "recurring_allowances": [
      { "name": "House Allowance", "amount": 20000 },
      { "name": "Transport", "amount": 5000 }
    ],
    "recent_payslips": [...]
  }
}
```

## 5.3 Staff Attendance

### GET /staff/:id/attendance

Get staff attendance records.

### POST /staff/:id/terminate

Terminate staff employment.

**Request:**
```json
{
  "termination_date": "2026-02-28",
  "reason": "Resignation",
  "notice_period_served": true
}
```

---

# 6. ACADEMICS

## 6.1 Academic Years

### GET /academic-years

List academic years.

### POST /academic-years

Create academic year.

**Request:**
```json
{
  "name": "2025",
  "structure_id": "struct_8_4_4",
  "start_date": "2025-01-06",
  "end_date": "2025-11-15"
}
```

### POST /academic-years/:id/set-current

Set as current academic year.

## 6.2 School Periods

### GET /school-periods

List periods (terms/semesters).

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `academic_year_id` | string | Filter by year |
| `is_active` | boolean | Filter active |

### POST /school-periods

Create period.

## 6.3 Classes & Streams

### GET /classes

List classes.

### POST /classes

Create class.

**Request:**
```json
{
  "name": "Grade 5",
  "code": "G5",
  "level": 5
}
```

### GET /classes/:id/students

Get students in class.

### GET /classes/:id/timetable

Get class timetable.

### GET /streams

List streams.

### POST /streams

Create stream.

**Request:**
```json
{
  "class_id": "cls_grade5",
  "name": "A",
  "capacity": 40,
  "class_teacher_id": "staff_001"
}
```

### POST /streams/:id/class-teacher

Assign class teacher.

## 6.4 Subjects

### GET /subjects

List subjects.

### POST /subjects

Create subject.

**Request:**
```json
{
  "name": "Mathematics",
  "code": "MATH",
  "abbreviation": "Math",
  "department_id": "dept_science",
  "is_compulsory": true,
  "subject_grouping": "Group 1 (Compulsory)"
}
```

### GET /subjects/:id/classes

Get classes offering this subject.

## 6.5 Subject Allocations

### GET /subject-allocation

List subject-class allocations.

### POST /subject-allocation

Create allocation.

**Request:**
```json
{
  "class_stream_id": "cls_grade5_a",
  "subject_id": "subj_math",
  "academic_year_id": "ay_2025"
}
```

### POST /subject-allocation/:id/assign-teacher

Assign teacher to subject.

**Request:**
```json
{
  "teacher_id": "staff_001",
  "is_primary": true
}
```

## 6.6 Enrollments

### GET /enrollments

List enrollments.

### POST /enrollments

Enroll student in subjects.

**Request:**
```json
{
  "student_id": "std_001",
  "allocation_id": "alloc_001"
}
```

### POST /enrollments/bulk

Bulk enroll students.

**Request:**
```json
{
  "allocation_id": "alloc_001",
  "student_ids": ["std_001", "std_002", "std_003"]
}
```

### POST /enrollments/promote

Promote entire class.

**Request:**
```json
{
  "from_class_stream_id": "cls_grade5_a",
  "to_class_stream_id": "cls_grade6_a",
  "academic_year_id": "ay_2026"
}
```

## 6.7 Timetable

### GET /timetable

List timetable entries.

### POST /timetable

Create timetable entry.

**Request:**
```json
{
  "class_stream_id": "cls_grade5_a",
  "subject_id": "subj_math",
  "teacher_id": "staff_001",
  "day_of_week": "MONDAY",
  "period_slot_id": "period_1",
  "room": "Rm101"
}
```

### GET /timetable/class/:classId

Get class timetable.

### GET /timetable/teacher/:teacherId

Get teacher timetable.

## 6.8 Exam Sessions

### GET /exam-sessions

List exam sessions.

### POST /exam-sessions

Create exam session.

**Request:**
```json
{
  "name": "Term 1 Exam 2025",
  "school_period_id": "period_term1",
  "start_date": "2025-03-01",
  "end_date": "2025-03-15"
}
```

### POST /exam-sessions/:id/publish

Publish exam results.

### POST /exam-sessions/:id/lock

Lock exam results.

## 6.9 Exam Results

### GET /exam-results

List exam results.

### POST /exam-results

Create exam result.

**Request:**
```json
{
  "student_id": "std_001",
  "exam_session_id": "exam_term1",
  "paper_marks": [
    { "paper_setting_id": "paper_001", "marks_obtained": 85 },
    { "paper_setting_id": "paper_002", "marks_obtained": 78 }
  ]
}
```

### POST /exam-results/bulk

Bulk enter marks.

**Request:**
```json
{
  "exam_session_id": "exam_term1",
  "class_stream_id": "cls_grade5_a",
  "results": [
    { "student_id": "std_001", "paper_marks": [...] },
    { "student_id": "std_002", "paper_marks": [...] }
  ]
}
```

### GET /exam-results/student/:studentId

Get student exam results.

## 6.10 Grading Schemes

### GET /grading-schemes

List grading schemes.

### POST /grading-schemes

Create grading scheme.

**Request:**
```json
{
  "name": "8-4-4 Grading",
  "education_system": "8-4-4",
  "is_default": true,
  "levels": [
    { "grade": "A", "min_score": 80, "points": 12 },
    { "grade": "B", "min_score": 70, "points": 10 },
    { "grade": "C", "min_score": 60, "points": 8 },
    { "grade": "D", "min_score": 50, "points": 6 },
    { "grade": "E", "min_score": 0, "points": 0 }
  ]
}
```

---

# 7. FINANCE

## 7.1 Fee Templates

### GET /fee-templates

List fee templates.

### POST /fee-templates

Create fee template.

**Request:**
```json
{
  "name": "Grade 5 Term 1 2025",
  "school_period_id": "period_term1",
  "academic_year_id": "ay_2025",
  "student_category_id": "cat_boarding",
  "items": [
    { "description": "Tuition", "amount": 35000, "revenue_account_id": "acc_tuition" },
    { "description": "Boarding", "amount": 15000, "revenue_account_id": "acc_boarding" },
    { "description": "Transport (Optional)", "amount": 5000, "is_optional": true, "revenue_account_id": "acc_transport" }
  ]
}
```

### POST /fee-templates/:id/generate-invoices

Generate invoices from template.

**Request:**
```json
{
  "class_stream_id": "cls_grade5_a",
  "due_date": "2025-02-28"
}
```

## 7.2 Invoices

### GET /invoices

List invoices.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `student_id` | string | Filter by student |
| `school_period_id` | string | Filter by period |
| `status` | string | Filter by status |

### POST /invoices

Create invoice manually.

### POST /invoices/:id/void

Void invoice.

**Request:**
```json
{
  "reason": "Duplicate invoice"
}
```

### GET /invoices/:id/pdf

Download invoice PDF.

## 7.3 Payments

### GET /payments

List payments.

### POST /payments

Record payment.

**Request:**
```json
{
  "student_id": "std_001",
  "payment_date": "2025-02-15",
  "payment_method": "M-Pesa",
  "reference_number": "MPE123456",
  "total_amount": 50000,
  "applications": [
    { "invoice_id": "inv_001", "amount": 50000 }
  ]
}
```

### POST /payments/apply

Apply payment to multiple invoices.

### GET /payments/:id/receipt

Download payment receipt PDF.

### POST /payments/:id/reverse

Reverse payment.

## 7.4 Fee Adjustments

### GET /fee-adjustments

List fee adjustments.

### POST /fee-adjustments

Create adjustment.

**Request:**
```json
{
  "student_id": "std_001",
  "school_period_id": "period_term1",
  "adjustment_type": "scholarship",
  "amount": 10000,
  "reason": "Academic excellence",
  "effective_from": "2025-01-01"
}
```

## 7.5 Transport

### GET /transport-routes

List transport routes.

### POST /transport-routes

Create route.

**Request:**
```json
{
  "name": "Route 1 - Westlands",
  "area": "Westlands",
  "cost_per_term": 5000,
  "vehicle_number": "KAA 123A",
  "stops": ["Stop 1", "Stop 2", "Stop 3"]
}
```

### GET /transport-assignments

List assignments.

### POST /transport-assignments

Assign student to route.

**Request:**
```json
{
  "student_id": "std_001",
  "route_id": "route_1",
  "school_period_id": "period_term1",
  "stop_name": "Stop 2"
}
```

## 7.6 Chart of Accounts

### GET /chart-of-accounts

List accounts.

### POST /chart-of-accounts

Create account.

**Request:**
```json
{
  "account_code": "4000",
  "name": "School Fees Income",
  "account_type": "Revenue",
  "is_active": true
}
```

## 7.7 General Ledger

### GET /ledger/entries

List ledger entries.

### POST /ledger/entries

Create journal entry.

**Request:**
```json
{
  "transaction_date": "2025-02-15",
  "entries": [
    { "account_id": "acc_cash", "debit": 50000, "credit": 0 },
    { "account_id": "acc_fees", "debit": 0, "credit": 50000 }
  ],
  "description": "Fee payment received"
}
```

### GET /ledger/trial-balance

Get trial balance.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `financial_year_id` | string | Filter by year |
| `as_of_date` | date | Balance as of date |

### GET /ledger/balance-sheet

Get balance sheet.

### GET /ledger/income-statement

Get income statement.

---

# 8. HUMAN RESOURCES

## 8.1 Payroll Periods

### GET /payroll-periods

List payroll periods.

### POST /payroll-periods

Create period.

**Request:**
```json
{
  "name": "January 2025",
  "period_type": "monthly",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "payment_date": "2025-01-30",
  "financial_year_id": "fy_2025"
}
```

### POST /payroll-periods/:id/lock

Lock period (prevent changes).

## 8.2 Payroll Item Types

### GET /payroll-item-types

List item types (allowances, deductions).

### POST /payroll-item-types

Create item type.

**Request:**
```json
{
  "name": "House Allowance",
  "category": "earning",
  "sub_category": "allowance",
  "tax_implication": "taxable",
  "calculation_type": "fixed",
  "calculation_value": 20000
}
```

## 8.3 Staff Salary Settings

### GET /staff-salary-settings

List salary settings.

### POST /staff-salary-settings

Create salary setting.

**Request:**
```json
{
  "staff_id": "staff_001",
  "basic_salary": 80000,
  "payment_bank": "KCB",
  "bank_account_name": "John Smith",
  "bank_account_number": "1234567890",
  "kra_pin": "A123456789"
}
```

## 8.4 Payslips

### GET /payslips

List payslips.

### POST /payslips/generate

Generate payslips for period.

**Request:**
```json
{
  "payroll_period_id": "period_jan2025"
}
```

### GET /payslips/:id

Get payslip details.

### POST /payslips/:id/approve

Approve payslip.

### POST /payslips/:id/process

Mark as processed for payment.

### GET /payslips/:id/pdf

Download payslip PDF.

### GET /payroll-summary

Get payroll summary for period.

### GET /payroll/bank-file

Generate bank payment file.

## 8.5 Leave Management

### GET /leave-types

List leave types.

### POST /leave-types

Create leave type.

### GET /leave-requests

List leave requests.

### POST /leave-requests

Request leave.

**Request:**
```json
{
  "staff_id": "staff_001",
  "leave_type_id": "leave_annual",
  "start_date": "2025-03-01",
  "end_date": "2025-03-10",
  "days": 10,
  "reason": "Personal leave"
}
```

### POST /leave-requests/:id/approve

Approve leave request.

### POST /leave-requests/:id/reject

Reject leave request.

### GET /leave-balances

Get staff leave balances.

---

# 9. LIBRARY

## 9.1 Books

### GET /books

List books.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category_id` | string | Filter by category |
| `status` | string | Filter by status |
| `search` | string | Search by title/author/ISBN |

### POST /books

Add book.

**Request:**
```json
{
  "title": "Introduction to Mathematics",
  "author": "John Smith",
  "isbn": "978-0-123456-78-9",
  "publisher": "Education Press",
  "category_id": "cat_math",
  "accession_number": "ACC/001",
  "purchase_cost": 500,
  "shelf_location": "A-12"
}
```

### GET /books/:id/availability

Check book availability.

## 9.2 Loans

### GET /loans

List loans.

### POST /loans

Issue book.

**Request:**
```json
{
  "book_id": "book_001",
  "user_id": "std_001",
  "user_type": "student",
  "due_date": "2025-03-15"
}
```

### PUT /loans/:id/return

Process return.

**Request:**
```json
{
  "condition": "good",
  "notes": "Returned on time"
}
```

### POST /loans/:id/renew

Renew loan.

## 9.3 Fines

### GET /fines

List fines.

### POST /fines/:id/waive

Waive fine.

**Request:**
```json
{
  "amount": 50,
  "reason": "First offense"
}
```

## 9.4 Reservations

### GET /reservations

List reservations.

### POST /reservations

Create reservation.

### DELETE /reservations/:id

Cancel reservation.

---

# 10. INVENTORY

## 10.1 Items

### GET /items

List items.

### POST /items

Create item.

**Request:**
```json
{
  "name": "A4 Paper",
  "code": "PAP/A4/001",
  "category_id": "cat_paper",
  "unit_of_measure": "Ream",
  "item_type": "consumable",
  "current_price": 450,
  "reorder_level": 50,
  "reorder_quantity": 100
}
```

## 10.2 Stock

### GET /stock-levels

List stock levels.

### POST /stock/adjust

Adjust stock.

**Request:**
```json
{
  "item_id": "item_001",
  "warehouse_id": "wh_main",
  "adjustment": 10,
  "reason": "Stock count",
  "transaction_date": "2025-02-15"
}
```

### GET /stock/transactions

List stock transactions.

## 10.3 Fixed Assets

### GET /fixed-assets

List fixed assets.

### POST /fixed-assets

Register asset.

**Request:**
```json
{
  "item_id": "item_laptop",
  "asset_tag": "AST/001",
  "serial_number": "SN123456",
  "purchase_date": "2025-01-15",
  "purchase_cost": 80000,
  "depreciation_method": "straight_line",
  "useful_life_years": 4
}
```

### GET /fixed-assets/:id/depreciation

Get depreciation schedule.

## 10.4 Purchase Orders

### GET /purchase-orders

List purchase orders.

### POST /purchase-orders

Create purchase order.

**Request:**
```json
{
  "supplier_id": "sup_001",
  "warehouse_id": "wh_main",
  "expected_delivery_date": "2025-03-01",
  "items": [
    { "item_id": "item_001", "quantity_ordered": 50, "unit_price": 450 }
  ]
}
```

### POST /purchase-orders/:id/receive

Receive items.

**Request:**
```json
{
  "items": [
    { "item_id": "item_001", "quantity_received": 50 }
  ],
  "receive_date": "2025-03-01"
}
```

## 10.5 Requisitions

### GET /requisitions

List requisitions.

### POST /requisitions

Create requisition.

### POST /requisitions/:id/approve

Approve requisition.

### POST /requisitions/:id/fulfill

Fulfill requisition.

---

# 11. NUTRITION

## 11.1 Meal Plans

### GET /meal-plans

List meal plans.

### POST /meal-plans

Create meal plan.

**Request:**
```json
{
  "name": "Full Boarding",
  "meal_types": ["breakfast", "lunch", "dinner"],
  "cost_per_term": 15000
}
```

## 11.2 Student Meal Plans

### GET /student-meal-plans

List student meal plan assignments.

### POST /student-meal-plans

Assign meal plan to student.

**Request:**
```json
{
  "student_id": "std_001",
  "meal_plan_id": "plan_full",
  "school_period_id": "period_term1"
}
```

## 11.3 Menus

### GET /menus

List menus.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `menu_date` | date | Filter by date |
| `meal_type` | string | breakfast/lunch/dinner |

### POST /menus

Create menu.

## 11.4 Wallets

### GET /student-wallets/:studentId

Get student wallet.

### POST /student-wallets/:studentId/deposit

Deposit to wallet.

**Request:**
```json
{
  "amount": 5000,
  "payment_method": "M-Pesa",
  "reference": "MPE123456"
}
```

### POST /student-wallets/:studentId/withdraw

Withdraw from wallet.

---

# 12. ADMISSIONS

## 12.1 Applications

### GET /applications

List applications.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `academic_year_id` | string | Filter by year |
| `intended_class_id` | string | Filter by class |

### POST /applications

Create application.

**Request:**
```json
{
  "academic_year_id": "ay_2026",
  "intended_class_id": "cls_grade5_a",
  "application_type": "new",
  "first_name": "Jane",
  "last_name": "Doe",
  "date_of_birth": "2011-05-20",
  "gender": "Female",
  "guardian_name": "John Doe",
  "guardian_phone": "+254700000000",
  "previous_school": "ABC Primary"
}
```

### POST /applications/:id/submit

Submit application.

### POST /applications/:id/approve

Approve application.

**Request:**
```json
{
  "assigned_class_id": "cls_grade5_a",
  "assigned_stream_id": "cls_grade5_a",
  "admission_number": "ADM/2026/001"
}
```

### POST /applications/:id/reject

Reject application.

### POST /applications/:id/enroll

Enroll as student.

## 12.2 Application Reviews

### GET /application-reviews

List reviews.

### POST /application-reviews

Create review.

**Request:**
```json
{
  "application_id": "app_001",
  "reviewer_id": "staff_001",
  "review_stage": "academic",
  "academic_score": 85,
  "recommendation": "recommend"
}
```

## 12.3 Application Interviews

### GET /application-interviews

List interviews.

### POST /application-interviews

Schedule interview.

**Request:**
```json
{
  "application_id": "app_001",
  "interviewer_id": "staff_002",
  "scheduled_date": "2025-03-15",
  "scheduled_time": "09:00",
  "duration_minutes": 30,
  "interview_type": "in_person"
}
```

---

# 13. REPORTS & DASHBOARDS

## 13.1 Dashboards

### GET /dashboard/summary

Get dashboard summary.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "students": { "total": 500, "active": 480, "new_this_month": 10 },
    "staff": { "total": 50, "teaching": 40, "non_teaching": 10 },
    "finance": {
      "outstanding": 2500000,
      "collected_this_month": 5000000,
      "pending_invoices": 45
    },
    "academics": {
      "current_attendance": "96.5%",
      "exams_pending": 2
    }
  }
}
```

### GET /dashboard/enrollment

Get enrollment statistics.

### GET /dashboard/finance

Get finance statistics.

### GET /dashboard/attendance

Get attendance statistics.

## 13.2 Reports

### GET /reports/:type

Generate report.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Report type |
| `start_date` | date | Report start |
| `end_date` | date | Report end |

**Report Types:**
- `students-list`
- `fee-collection`
- `attendance-summary`
- `exam-results`
- `payroll-summary`
- `inventory-value`
- `audit-log`

### GET /reports/:id/download

Download generated report.

**Response:** Binary file (PDF/Excel/CSV)

---

# 14. SYSTEM

## 14.1 Health Check

### GET /health

Check API health.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": "86400",
    "database": "connected",
    "timestamp": "2026-02-17T10:30:00Z"
  }
}
```

## 14.2 Configuration

### GET /config

Get configuration.

### PUT /config

Update configuration.

**Request:**
```json
{
  "key": "school.name",
  "value": "ABC Primary School"
}
```

## 14.3 Schools

### GET /schools

List schools (multi-tenant).

### PUT /schools/:id

Update school details.

## 14.4 Audit Logs

### GET /audit-logs

List audit logs.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | Filter by user |
| `entity_type` | string | Filter by entity |
| `action` | string | Filter by action |
| `start_date` | date | Filter by date |
| `end_date` | date | Filter by date |

---

# APPENDIX: COMMON ERROR CODES

| Code | HTTP | Description |
|------|------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 422 | Invalid input data |
| CONFLICT | 409 | Resource conflict |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

**Document Version:** 1.0  
**Last Updated:** February 17, 2026
