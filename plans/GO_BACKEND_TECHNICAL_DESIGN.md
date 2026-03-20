# SchoolPilot3 Backend Technical Design Document
## Go API Server with SurrealDB

**Document Version:** 1.0.0  
**Date:** February 17, 2026  
**Status:** Technical Specification  
**Authors:** Backend Architecture Team

---

# TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Database Architecture](#5-database-architecture)
6. [API Design](#6-api-design)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Business Logic Services](#8-business-logic-services)
9. [Module-Specific Implementations](#9-module-specific-implementations)
10. [Error Handling & Validation](#10-error-handling--validation)
11. [Testing Strategy](#11-testing-strategy)
12. [Security](#12-security)
13. [Performance & Optimization](#13-performance--optimization)
14. [Deployment](#14-deployment)
15. [Migration Strategy](#15-migration-strategy)
16. [Appendices](#16-appendices)

---

# 1. EXECUTIVE SUMMARY

## 1.1 Purpose

This document provides a comprehensive technical design specification for the SchoolPilot3 backend re-architecture project. The system will be rebuilt using **Go** for the API server and **SurrealDB** as the primary database, replacing the existing React frontend + SQLite/PouchDB architecture.

## 1.2 Goals

1. **Replace** the frontend-driven data layer with a proper RESTful API
2. **Leverage** SurrealDB's document-graph hybrid capabilities for complex relationships
3. **Implement** enterprise-grade authentication and authorization
4. **Support** all 13 existing functional modules with feature parity
5. **Enable** real-time capabilities through SurrealDB's live queries
6. **Provide** a scalable foundation for future growth

## 1.3 Scope

| Component | Scope |
|----------|-------|
| **Backend** | Go HTTP API Server |
| **Database** | SurrealDB (embedded or standalone) |
| **Authentication** | JWT-based with refresh tokens |
| **Authorization** | RBAC with resource-level permissions |
| **API Style** | RESTful with OpenAPI 3.0 documentation |
| **Real-time** | WebSocket support via SurrealDB live queries |

---

# 2. SYSTEM OVERVIEW

## 2.1 Architecture Diagram

```
+-----------------------------------------------------------------------------+
|                                      CLIENTS                                 |
|  +-----------------+    +-----------------+    +-----------------+          |
|  |   Vue.js SPA    |    |   Mobile App    |    |   Desktop App    |          |
|  +--------+--------+    +--------+--------+    +--------+--------+          |
+----------+----------------+----------------+----------------+----------------+
           |                |                |                |
           |   HTTPS/WSS   |   HTTPS/WSS   |   HTTPS/WSS   |
           |                |                |                |
+----------+----------------+----------------+----------------+----------------+
           v                v                v                v
+-----------------------------------------------------------------------------+
|                          LOAD BALANCER / REVERSE PROXY                      |
|                          (Nginx / Caddy / Traefik)                         |
+--------------------------------------+--------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                           GO API GATEWAY                                    |
|  +-------------+  +-------------+  +-------------+  +-----------------+  |
|  |   Router    |  |  Middleware |  |  Rate Limit |  | Request Validation |  |
|  +-------------+  +-------------+  +-------------+  +-----------------+  |
+--------------------------------------+--------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                           APPLICATION LAYER                                 |
|  +----------------------------------------------------------------------+ |
|  |                        HANDLERS (Controllers)                        | |
|  +----------------------------------------------------------------------+ |
|  +----------------------------------------------------------------------+ |
|  |                          SERVICE LAYER                                | |
|  +----------------------------------------------------------------------+ |
+--------------------------------------+--------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                           DATA ACCESS LAYER                                 |
|  +----------------------------------------------------------------------+ |
|  |                    SurrealDB Client / Repository                     | |
|  +----------------------------------------------------------------------+ |
+--------------------------------------+--------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                              SURREALDB                                      |
+-----------------------------------------------------------------------------+
```

## 2.2 System Boundaries

| Boundary | Description |
|----------|-------------|
| **External** | Vue.js frontend, mobile apps, 3rd party integrations |
| **API** | RESTful HTTP endpoints, WebSocket for real-time |
| **Internal** | Go services, business logic, data access |
| **Data** | SurrealDB database, file storage |

---

# 3. TECHNOLOGY STACK

## 3.1 Backend Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Language** | Go | 1.22+ | Core API server |
| **Web Framework** | Chi | v1.21 | HTTP routing |
| **ORM/Query Builder** | SurrealDB Go Client | v2.0 | Database access |
| **Validation** | Go-playground/validator | v10 | Request validation |
| **Auth** | golang-jwt/jwt | v5 | JWT handling |
| **Config** | spf13/viper | v1.18 | Configuration management |
| **Logging** | zerolog | v1.31 | Structured logging |
| **OpenAPI** | swaggo/swag | v1.16 | API documentation |
| **Testing** | stretchr/testify | v1.8 | Unit testing |
| **Mocking** | gomock | v1.6 | Interface mocking |

## 3.2 Database Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Primary Database** | SurrealDB | 2.1+ | Document-graph hybrid DB |
| **File Storage** | Local filesystem / S3 | - | Document storage |
| **Caching** | Redis (optional) | 7.x | Session/cache |

---

# 4. PROJECT STRUCTURE

## 4.1 Directory Layout

```
schoolpilot-backend/
├── cmd/
│   └── server/
│       ├── main.go                 # Application entry point
│       └── main_test.go            # Integration tests
│
├── internal/
│   ├── config/
│   │   ├── config.go              # Configuration struct
│   │   └── environments/          # Environment-specific configs
│   │
│   ├── middleware/
│   │   ├── authentication.go      # JWT authentication
│   │   ├── authorization.go       # RBAC authorization
│   │   ├── cors.go                # CORS handling
│   │   ├── rate_limiter.go        # Rate limiting
│   │   ├── logging.go             # Request logging
│   │   ├── recovery.go            # Panic recovery
│   │   └── validation.go          # Request validation
│   │
│   ├── handlers/                  # HTTP Handlers (Controllers)
│   │   ├── auth/
│   │   ├── users/
│   │   ├── students/
│   │   ├── staff/
│   │   ├── academics/
│   │   ├── finance/
│   │   ├── hr/
│   │   ├── library/
│   │   ├── inventory/
│   │   ├── nutrition/
│   │   ├── admissions/
│   │   ├── reports/
│   │   └── system/
│   │
│   ├── services/                  # Business Logic Layer
│   │   ├── auth_service.go
│   │   ├── fee_calculation_service.go
│   │   ├── payroll_service.go
│   │   ├── grading_service.go
│   │   └── ...
│   │
│   ├── repository/                # Data Access Layer
│   │   ├── repository.go         # Base repository interface
│   │   ├── user_repository.go
│   │   ├── student_repository.go
│   │   └── ...
│   │
│   ├── models/                   # Domain Models
│   │   ├── user.go
│   │   ├── student.go
│   │   ├── staff.go
│   │   └── ...
│   │
│   ├── dto/                      # Data Transfer Objects
│   │   ├── request/             # Request DTOs
│   │   └── response/            # Response DTOs
│   │
│   ├── database/
│   │   ├── surrealdb.go         # Database connection
│   │   ├── migrations.go        # Schema migrations
│   │   └── seeder.go            # Initial data seeding
│   │
│   ├── utils/
│   │   ├── password.go          # Password hashing
│   │   ├── uuid.go              # UUID generation
│   │   └── datetime.go          # Date utilities
│   │
│   ├── errors/
│   │   ├── errors.go            # Custom error types
│   │   ├── codes.go             # Error codes
│   │   └── handler.go           # Error handling
│   │
│   └── websocket/
│       ├── hub.go               # WebSocket hub
│       ├── client.go            # WebSocket client
│       └── handler.go           # WebSocket handler
│
├── pkg/                          # Reusable packages
│   ├── logger/
│   ├── validator/
│   └── response/
│
├── api/
│   ├── docs.go                  # Swagger generated
│   └── swagger.yaml             # OpenAPI specification
│
├── scripts/
│   ├── migrate.sh               # Run migrations
│   ├── seed.sh                 # Seed database
│   └── docker/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── mocks/
│
├── .env.example
├── go.mod
├── go.sum
├── Makefile
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

# 5. DATABASE ARCHITECTURE

## 5.1 SurrealDB Schema Design

### 5.1.1 Design Principles

1. **Document + Graph Hybrid**: Use SurrealDB's ability to store complex documents while maintaining relational links
2. **Embedded Documents**: For 1:1 relationships where data is frequently accessed together
3. **Record Links**: For 1:N and N:M relationships requiring independent queries
4. **Live Queries**: For real-time UI updates

### 5.1.2 Namespace Strategy

```
schoolpilot
├── system          # Users, roles, permissions, config
├── core            # Academic years, periods, workflows
├── administration  # Students, staff, attendance
├── academics       # Subjects, classes, exams
├── finance         # Invoices, payments, ledger
├── hr              # Payroll, leaves
├── library         # Books, loans
├── inventory       # Stock, assets
├── nutrition       # Meal plans, wallets
├── admissions      # Applications
└── audit           # Audit logs
```

---

## 5.2 Complete Schema Definitions

### 5.2.1 System Namespace (system)

```sql
-- =============================================================================
-- USERS & AUTHENTICATION
-- =============================================================================

DEFINE TABLE system.users SCHEMAFULL;
DEFINE FIELD username ON system.users TYPE string;
DEFINE FIELD email ON system.users TYPE string;
DEFINE FIELD password_hash ON system.users TYPE string;
DEFINE FIELD first_name ON system.users TYPE string;
DEFINE FIELD last_name ON system.users TYPE string;
DEFINE FIELD phone ON system.users TYPE option<string>;
DEFINE FIELD photo_url ON system.users TYPE option<string>;
DEFINE FIELD role_id ON system.users TYPE record(system.roles);
DEFINE FIELD is_active ON system.users TYPE bool DEFAULT true;
DEFINE FIELD is_super_admin ON system.users TYPE bool DEFAULT false;
DEFINE FIELD last_login_at ON system.users TYPE option<datetime>;
DEFINE FIELD password_changed_at ON system.users TYPE option<datetime>;
DEFINE FIELD failed_login_attempts ON system.users TYPE int DEFAULT 0;
DEFINE FIELD locked_until ON system.users TYPE option<datetime>;
DEFINE FIELD email_verified ON system.users TYPE bool DEFAULT false;
DEFINE FIELD created_at ON system.users TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON system.users TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_users_username ON system.users COLUMNS username UNIQUE;
DEFINE INDEX idx_users_email ON system.users COLUMNS email UNIQUE;

-- =============================================================================
-- ROLES & PERMISSIONS
-- =============================================================================

DEFINE TABLE system.roles SCHEMAFULL;
DEFINE FIELD name ON system.roles TYPE string;
DEFINE FIELD description ON system.roles TYPE option<string>;
DEFINE FIELD permissions ON system.roles TYPE array<record> DEFAULT [];
DEFINE FIELD is_system ON system.roles TYPE bool DEFAULT false;
DEFINE FIELD is_active ON system.roles TYPE bool DEFAULT true;
DEFINE FIELD created_at ON system.roles TYPE datetime DEFAULT time::now();

DEFINE TABLE system.permissions SCHEMAFULL;
DEFINE FIELD name ON system.permissions TYPE string;
DEFINE FIELD resource ON system.permissions TYPE string;
DEFINE FIELD action ON system.permissions TYPE string;
DEFINE FIELD description ON system.permissions TYPE option<string>;

DEFINE TABLE system.user_roles SCHEMAFULL;
DEFINE FIELD user_id ON system.user_roles TYPE record(system.users);
DEFINE FIELD role_id ON system.user_roles TYPE record(system.roles);
DEFINE FIELD assigned_at ON system.user_roles TYPE datetime DEFAULT time::now();

-- =============================================================================
-- SESSIONS & TOKENS
-- =============================================================================

DEFINE TABLE system.sessions SCHEMAFULL;
DEFINE FIELD user_id ON system.sessions TYPE record(system.users);
DEFINE FIELD token ON system.sessions TYPE string;
DEFINE FIELD refresh_token ON system.sessions TYPE string;
DEFINE FIELD ip_address ON system.sessions TYPE option<string>;
DEFINE FIELD user_agent ON system.sessions TYPE option<string>;
DEFINE FIELD expires_at ON system.sessions TYPE datetime;

DEFINE INDEX idx_sessions_token ON system.sessions COLUMNS token UNIQUE;

-- =============================================================================
-- SYSTEM CONFIGURATION
-- =============================================================================

DEFINE TABLE system.config SCHEMAFULL;
DEFINE FIELD key ON system.config TYPE string;
DEFINE FIELD value ON system.config TYPE any;
DEFINE FIELD category ON system.config TYPE string;
DEFINE FIELD is_public ON system.config TYPE bool DEFAULT false;
DEFINE FIELD updated_at ON system.config TYPE datetime DEFAULT time::now();

-- =============================================================================
-- SCHOOL DETAILS
-- =============================================================================

DEFINE TABLE system.schools SCHEMAFULL;
DEFINE FIELD name ON system.schools TYPE string;
DEFINE FIELD code ON system.schools TYPE string;
DEFINE FIELD address ON system.schools TYPE option<string>;
DEFINE FIELD phone ON system.schools TYPE option<string>;
DEFINE FIELD email ON system.schools TYPE option<string>;
DEFINE FIELD website ON system.schools TYPE option<string>;
DEFINE FIELD logo_url ON system.schools TYPE option<string>;
DEFINE FIELD motto ON system.schools TYPE option<string>;
DEFINE FIELD school_type ON system.schools TYPE string;
DEFINE FIELD gender_type ON system.schools TYPE string;
DEFINE FIELD country ON system.schools TYPE string DEFAULT 'Kenya';
DEFINE FIELD currency ON system.schools TYPE string DEFAULT 'KES';
DEFINE FIELD timezone ON system.schools TYPE string DEFAULT 'Africa/Nairobi';
DEFINE FIELD is_active ON system.schools TYPE bool DEFAULT true;
```

### 5.2.2 Core Namespace (core)

```sql
-- =============================================================================
-- ACADEMIC STRUCTURE
-- =============================================================================

DEFINE TABLE core.academic_year_structures SCHEMAFULL;
DEFINE FIELD name ON core.academic_year_structures TYPE string;
DEFINE FIELD description ON core.academic_year_structures TYPE option<string>;

DEFINE TABLE core.academic_years SCHEMAFULL;
DEFINE FIELD name ON core.academic_years TYPE string;
DEFINE FIELD structure_id ON core.academic_years TYPE record(core.academic_year_structures);
DEFINE FIELD start_date ON core.academic_years TYPE datetime;
DEFINE FIELD end_date ON core.academic_years TYPE datetime;
DEFINE FIELD is_current ON core.academic_years TYPE bool DEFAULT false;
DEFINE FIELD status ON core.academic_years TYPE string DEFAULT 'active';

DEFINE TABLE core.period_definitions SCHEMAFULL;
DEFINE FIELD structure_id ON core.period_definitions TYPE record(core.academic_year_structures);
DEFINE FIELD name ON core.period_definitions TYPE string;
DEFINE FIELD sequence_order ON core.period_definitions TYPE int;
DEFINE FIELD type ON core.period_definitions TYPE string;

DEFINE TABLE core.school_periods SCHEMAFULL;
DEFINE FIELD academic_year_id ON core.school_periods TYPE record(core.academic_years);
DEFINE FIELD period_definition_id ON core.school_periods TYPE record(core.period_definitions);
DEFINE FIELD name ON core.school_periods TYPE string;
DEFINE FIELD start_date ON core.school_periods TYPE datetime;
DEFINE FIELD end_date ON core.school_periods TYPE datetime;
DEFINE FIELD is_active ON core.school_periods TYPE bool DEFAULT true;

-- =============================================================================
-- FINANCIAL STRUCTURE
-- =============================================================================

DEFINE TABLE core.financial_years SCHEMAFULL;
DEFINE FIELD name ON core.financial_years TYPE string;
DEFINE FIELD start_date ON core.financial_years TYPE datetime;
DEFINE FIELD end_date ON core.financial_years TYPE datetime;
DEFINE FIELD status ON core.financial_years TYPE string DEFAULT 'open';
DEFINE FIELD is_current ON core.financial_years TYPE bool DEFAULT false;

-- =============================================================================
-- TIMETABLE
-- =============================================================================

DEFINE TABLE core.period_slots SCHEMAFULL;
DEFINE FIELD name ON core.period_slots TYPE string;
DEFINE FIELD start_time ON core.period_slots TYPE string;
DEFINE FIELD end_time ON core.period_slots TYPE string;
DEFINE FIELD sequence_order ON core.period_slots TYPE int;
DEFINE FIELD is_break ON core.period_slots TYPE bool DEFAULT false;
```

### 5.2.3 Administration Namespace (administration)

```sql
-- =============================================================================
-- STUDENTS
-- =============================================================================

DEFINE TABLE administration.students SCHEMAFULL;
DEFINE FIELD admission_no ON administration.students TYPE string;
DEFINE FIELD upi_no ON administration.students TYPE option<string>;
DEFINE FIELD first_name ON administration.students TYPE string;
DEFINE FIELD middle_name ON administration.students TYPE option<string>;
DEFINE FIELD last_name ON administration.students TYPE string;
DEFINE FIELD gender ON administration.students TYPE string;
DEFINE FIELD date_of_birth ON administration.students TYPE option<datetime>;
DEFINE FIELD photo_url ON administration.students TYPE option<string>;
DEFINE FIELD current_class_stream_id ON administration.students TYPE option<record>;
DEFINE FIELD student_category_id ON administration.students TYPE option<record>;
DEFINE FIELD dormitory_id ON administration.students TYPE option<record>;
DEFINE FIELD admission_date ON administration.students TYPE option<datetime>;
DEFINE FIELD status ON administration.students TYPE string DEFAULT 'active';
DEFINE FIELD address ON administration.students TYPE option<string>;
DEFINE FIELD email ON administration.students TYPE option<string>;
DEFINE FIELD phone ON administration.students TYPE option<string>;
DEFINE FIELD user_id ON administration.students TYPE option<record>;
DEFINE FIELD created_at ON administration.students TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON administration.students TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_students_admission ON administration.students COLUMNS admission_no UNIQUE;

-- =============================================================================
-- PARENTS/GUARDIANS
-- =============================================================================

DEFINE TABLE administration.parents_guardians SCHEMAFULL;
DEFINE FIELD first_name ON administration.parents_guardians TYPE string;
DEFINE FIELD last_name ON administration.parents_guardians TYPE string;
DEFINE FIELD full_name ON administration.parents_guardians TYPE string;
DEFINE FIELD email ON administration.parents_guardians TYPE option<string>;
DEFINE FIELD phone ON administration.parents_guardians TYPE string;
DEFINE FIELD relationship_type ON administration.parents_guardians TYPE string;
DEFINE FIELD id_number ON administration.parents_guardians TYPE option<string>;
DEFINE FIELD occupation ON administration.parents_guardians TYPE option<string>;
DEFINE FIELD employer ON administration.parents_guardians TYPE option<string>;
DEFINE FIELD is_primary ON administration.parents_guardians TYPE bool DEFAULT false;

-- =============================================================================
-- STUDENT-GUARDIAN RELATIONSHIPS
-- =============================================================================

DEFINE TABLE administration.student_guardians SCHEMAFULL;
DEFINE FIELD student_id ON administration.student_guardians TYPE record(administration.students);
DEFINE FIELD guardian_id ON administration.student_guardians TYPE record(administration.parents_guardians);
DEFINE FIELD relationship_type ON administration.student_guardians TYPE string;
DEFINE FIELD is_primary_contact ON administration.student_guardians TYPE bool DEFAULT false;

-- =============================================================================
-- STAFF
-- =============================================================================

DEFINE TABLE administration.staff SCHEMAFULL;
DEFINE FIELD staff_no ON administration.staff TYPE string;
DEFINE FIELD user_id ON administration.staff TYPE option<record>;
DEFINE FIELD first_name ON administration.staff TYPE string;
DEFINE FIELD last_name ON administration.staff TYPE string;
DEFINE FIELD full_name ON administration.staff TYPE string;
DEFINE FIELD gender ON administration.staff TYPE string;
DEFINE FIELD date_of_birth ON administration.staff TYPE option<datetime>;
DEFINE FIELD email ON administration.staff TYPE option<string>;
DEFINE FIELD phone ON administration.staff TYPE option<string>;
DEFINE FIELD photo_url ON administration.staff TYPE option<string>;
DEFINE FIELD department_id ON administration.staff TYPE option<record>;
DEFINE FIELD designation_id ON administration.staff TYPE option<record>;
DEFINE FIELD employment_type ON administration.staff TYPE string DEFAULT 'permanent';
DEFINE FIELD is_teaching_staff ON administration.staff TYPE bool DEFAULT false;
DEFINE FIELD is_active ON administration.staff TYPE bool DEFAULT true;

DEFINE INDEX idx_staff_no ON administration.staff COLUMNS staff_no UNIQUE;

-- =============================================================================
-- DEPARTMENTS
-- =============================================================================

DEFINE TABLE administration.departments SCHEMAFULL;
DEFINE FIELD name ON administration.departments TYPE string;
DEFINE FIELD code ON administration.departments TYPE option<string>;
DEFINE FIELD is_academic ON administration.departments TYPE bool DEFAULT false;
DEFINE FIELD hod_id ON administration.departments TYPE option<record>;

-- =============================================================================
-- DESIGNATIONS
-- =============================================================================

DEFINE TABLE administration.designations SCHEMAFULL;
DEFINE FIELD title ON administration.designations TYPE string;
DEFINE FIELD department_id ON administration.designations TYPE option<record>;
DEFINE FIELD is_teaching ON administration.designations TYPE bool DEFAULT false;

-- =============================================================================
-- CLASSES & STREAMS
-- =============================================================================

DEFINE TABLE administration.classes SCHEMAFULL;
DEFINE FIELD name ON administration.classes TYPE string;
DEFINE FIELD code ON administration.classes TYPE option<string>;
DEFINE FIELD level ON administration.classes TYPE int;
DEFINE FIELD is_active ON administration.classes TYPE bool DEFAULT true;

DEFINE TABLE administration.class_streams SCHEMAFULL;
DEFINE FIELD class_id ON administration.class_streams TYPE record(administration.classes);
DEFINE FIELD name ON administration.class_streams TYPE string;
DEFINE FIELD capacity ON administration.class_streams TYPE option<int>;
DEFINE FIELD class_teacher_id ON administration.class_streams TYPE option<record>;
DEFINE FIELD is_active ON administration.class_streams TYPE bool DEFAULT true;

-- =============================================================================
-- STUDENT CATEGORIES
-- =============================================================================

DEFINE TABLE administration.student_categories SCHEMAFULL;
DEFINE FIELD name ON administration.student_categories TYPE string;

-- =============================================================================
-- DORMITORIES
-- =============================================================================

DEFINE TABLE administration.dormitories SCHEMAFULL;
DEFINE FIELD name ON administration.dormitories TYPE string;
DEFINE FIELD gender ON administration.dormitories TYPE string;
DEFINE FIELD capacity ON administration.dormitories TYPE option<int>;
DEFINE FIELD master_id ON administration.dormitories TYPE option<record>;

-- =============================================================================
-- ATTENDANCE
-- =============================================================================

DEFINE TABLE administration.student_attendance SCHEMAFULL;
DEFINE FIELD student_id ON administration.student_attendance TYPE record(administration.students);
DEFINE FIELD class_stream_id ON administration.student_attendance TYPE record(administration.class_streams);
DEFINE FIELD school_period_id ON administration.student_attendance TYPE record(core.school_periods);
DEFINE FIELD date ON administration.student_attendance TYPE datetime;
DEFINE FIELD status ON administration.student_attendance TYPE string;
DEFINE FIELD marked_by ON administration.student_attendance TYPE record;
DEFINE FIELD marked_at ON administration.student_attendance TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_student_attendance ON administration.student_attendance COLUMNS student_id, date;

-- =============================================================================
-- HEALTH RECORDS
-- =============================================================================

DEFINE TABLE administration.health_records SCHEMAFULL;
DEFINE FIELD student_id ON administration.health_records TYPE record(administration.students);
DEFINE FIELD blood_type ON administration.health_records TYPE option<string>;
DEFINE FIELD allergies ON administration.health_records TYPE option<string>;
DEFINE FIELD medical_conditions ON administration.health_records TYPE option<string>;
DEFINE FIELD emergency_contact_name ON administration.health_records TYPE option<string>;
DEFINE FIELD emergency_contact_phone ON administration.health_records TYPE option<string>;
```

### 5.2.4 Academics Namespace (academics)

```sql
-- =============================================================================
-- SUBJECTS
-- =============================================================================

DEFINE TABLE academics.subjects SCHEMAFULL;
DEFINE FIELD name ON academics.subjects TYPE string;
DEFINE FIELD code ON academics.subjects TYPE string;
DEFINE FIELD abbreviation ON academics.subjects TYPE string;
DEFINE FIELD description ON academics.subjects TYPE option<string>;
DEFINE FIELD department_id ON academics.subjects TYPE option<record>;
DEFINE FIELD is_compulsory ON academics.subjects TYPE bool DEFAULT false;
DEFINE FIELD subject_grouping ON academics.subjects TYPE option<string>;

DEFINE INDEX idx_subjects_code ON academics.subjects COLUMNS code UNIQUE;

DEFINE TABLE academics.subject_papers SCHEMAFULL;
DEFINE FIELD subject_id ON academics.subject_papers TYPE record(academics.subjects);
DEFINE FIELD name ON academics.subject_papers TYPE string;
DEFINE FIELD code ON academics.subject_papers TYPE string;

-- =============================================================================
-- CLASS SUBJECT ALLOCATIONS
-- =============================================================================

DEFINE TABLE academics.class_subject_allocations SCHEMAFULL;
DEFINE FIELD class_stream_id ON academics.class_subject_allocations TYPE record(administration.class_streams);
DEFINE FIELD subject_id ON academics.class_subject_allocations TYPE record(academics.subjects);
DEFINE FIELD academic_year_id ON academics.class_subject_allocations TYPE record(core.academic_years);
DEFINE FIELD is_optional ON academics.class_subject_allocations TYPE bool DEFAULT false;

-- =============================================================================
-- TEACHER ASSIGNMENTS
-- =============================================================================

DEFINE TABLE academics.teacher_subject_assignments SCHEMAFULL;
DEFINE FIELD allocation_id ON academics.teacher_subject_assignments TYPE record(academics.class_subject_allocations);
DEFINE FIELD teacher_id ON academics.teacher_subject_assignments TYPE record(administration.staff);
DEFINE FIELD is_primary ON academics.teacher_subject_assignments TYPE bool DEFAULT true;

-- =============================================================================
-- STUDENT SUBJECT ENROLLMENTS
-- =============================================================================

DEFINE TABLE academics.student_enrollments SCHEMAFULL;
DEFINE FIELD student_id ON academics.student_enrollments TYPE record(administration.students);
DEFINE FIELD allocation_id ON academics.student_enrollments TYPE record(academics.class_subject_allocations);
DEFINE FIELD academic_year_id ON academics.student_enrollments TYPE record(core.academic_years);
DEFINE FIELD enrollment_date ON academics.student_enrollments TYPE datetime DEFAULT time::now();
DEFINE FIELD status ON academics.student_enrollments TYPE string DEFAULT 'enrolled';

-- =============================================================================
-- TIMETABLE
-- =============================================================================

DEFINE TABLE academics.timetable_entries SCHEMAFULL;
DEFINE FIELD class_stream_id ON academics.timetable_entries TYPE record(administration.class_streams);
DEFINE FIELD subject_id ON academics.timetable_entries TYPE record(academics.subjects);
DEFINE FIELD teacher_id ON academics.timetable_entries TYPE record(administration.staff);
DEFINE FIELD day_of_week ON academics.timetable_entries TYPE string;
DEFINE FIELD period_slot_id ON academics.timetable_entries TYPE record(core.period_slots);
DEFINE FIELD room ON academics.timetable_entries TYPE option<string>;

-- =============================================================================
-- EXAM SESSIONS
-- =============================================================================

DEFINE TABLE academics.exam_sessions SCHEMAFULL;
DEFINE FIELD name ON academics.exam_sessions TYPE string;
DEFINE FIELD school_period_id ON academics.exam_sessions TYPE record(core.school_periods);
DEFINE FIELD start_date ON academics.exam_sessions TYPE datetime;
DEFINE FIELD end_date ON academics.exam_sessions TYPE datetime;
DEFINE FIELD status ON academics.exam_sessions TYPE string DEFAULT 'planning';

-- =============================================================================
-- EXAM RESULTS
-- =============================================================================

DEFINE TABLE academics.exam_results SCHEMAFULL;
DEFINE FIELD student_id ON academics.exam_results TYPE record(administration.students);
DEFINE FIELD exam_session_id ON academics.exam_results TYPE record(academics.exam_sessions);
DEFINE FIELD total_marks ON academics.exam_results TYPE option<float>;
DEFINE FIELD mean_grade ON academics.exam_results TYPE option<string>;
DEFINE FIELD class_rank ON academics.exam_results TYPE option<int>;
DEFINE FIELD stream_rank ON academics.exam_results TYPE option<int>;
DEFINE FIELD is_published ON academics.exam_results TYPE bool DEFAULT false;

-- =============================================================================
-- GRADING SCHEMES
-- =============================================================================

DEFINE TABLE academics.grading_schemes SCHEMAFULL;
DEFINE FIELD name ON academics.grading_schemes TYPE string;
DEFINE FIELD is_default ON academics.grading_schemes TYPE bool DEFAULT false;
DEFINE FIELD education_system ON academics.grading_schemes TYPE string;

DEFINE TABLE academics.grading_levels SCHEMAFULL;
DEFINE FIELD scheme_id ON academics.grading_levels TYPE record(academics.grading_schemes);
DEFINE FIELD grade ON academics.grading_levels TYPE string;
DEFINE FIELD min_score ON academics.grading_levels TYPE int;
DEFINE FIELD max_score ON academics.grading_levels TYPE int;
DEFINE FIELD points ON academics.grading_levels TYPE option<float>;
```

### 5.2.5 Finance Namespace (finance)

```sql
-- =============================================================================
-- CHART OF ACCOUNTS
-- =============================================================================

DEFINE TABLE finance.chart_of_accounts SCHEMAFULL;
DEFINE FIELD account_code ON finance.chart_of_accounts TYPE string;
DEFINE FIELD name ON finance.chart_of_accounts TYPE string;
DEFINE FIELD account_type ON finance.chart_of_accounts TYPE string;
DEFINE FIELD category ON finance.chart_of_accounts TYPE option<string>;
DEFINE FIELD parent_account_id ON finance.chart_of_accounts TYPE option<record>;
DEFINE FIELD is_active ON finance.chart_of_accounts TYPE bool DEFAULT true;
DEFINE FIELD is_contra ON finance.chart_of_accounts TYPE bool DEFAULT false;

DEFINE INDEX idx_coa_code ON finance.chart_of_accounts COLUMNS account_code UNIQUE;

-- =============================================================================
-- FEE TEMPLATES
-- =============================================================================

DEFINE TABLE finance.fee_templates SCHEMAFULL;
DEFINE FIELD name ON finance.fee_templates TYPE string;
DEFINE FIELD school_period_id ON finance.fee_templates TYPE record(core.school_periods);
DEFINE FIELD academic_year_id ON finance.fee_templates TYPE record(core.academic_years);
DEFINE FIELD student_category_id ON finance.fee_templates TYPE option<record>;
DEFINE FIELD is_active ON finance.fee_templates TYPE bool DEFAULT true;

DEFINE TABLE finance.fee_template_items SCHEMAFULL;
DEFINE FIELD fee_template_id ON finance.fee_template_items TYPE record(finance.fee_templates);
DEFINE FIELD description ON finance.fee_template_items TYPE string;
DEFINE FIELD amount ON finance.fee_template_items TYPE float;
DEFINE FIELD is_optional ON finance.fee_template_items TYPE bool DEFAULT false;
DEFINE FIELD revenue_account_id ON finance.fee_template_items TYPE record(finance.chart_of_accounts);

-- =============================================================================
-- STUDENT INVOICES
-- =============================================================================

DEFINE TABLE finance.student_invoices SCHEMAFULL;
DEFINE FIELD invoice_number ON finance.student_invoices TYPE string;
DEFINE FIELD student_id ON finance.student_invoices TYPE record(administration.students);
DEFINE FIELD school_period_id ON finance.student_invoices TYPE record(core.school_periods);
DEFINE FIELD issue_date ON finance.student_invoices TYPE datetime;
DEFINE FIELD due_date ON finance.student_invoices TYPE datetime;
DEFINE FIELD total_amount_billed ON finance.student_invoices TYPE float;
DEFINE FIELD total_amount_paid ON finance.student_invoices TYPE float DEFAULT 0;
DEFINE FIELD status ON finance.student_invoices TYPE string DEFAULT 'due';
DEFINE FIELD notes ON finance.student_invoices TYPE option<string>;

DEFINE INDEX idx_invoice_number ON finance.student_invoices COLUMNS invoice_number UNIQUE;

-- =============================================================================
-- STUDENT PAYMENTS
-- =============================================================================

DEFINE TABLE finance.student_payments SCHEMAFULL;
DEFINE FIELD receipt_number ON finance.student_payments TYPE string;
DEFINE FIELD student_id ON finance.student_payments TYPE record(administration.students);
DEFINE FIELD payment_date ON finance.student_payments TYPE datetime;
DEFINE FIELD payment_method ON finance.student_payments TYPE string;
DEFINE FIELD total_amount ON finance.student_payments TYPE float;
DEFINE FIELD amount_applied ON finance.student_payments TYPE float DEFAULT 0;
DEFINE FIELD status ON finance.student_payments TYPE string DEFAULT 'completed';

DEFINE INDEX idx_receipt_number ON finance.student_payments COLUMNS receipt_number UNIQUE;

-- =============================================================================
-- FEE ADJUSTMENTS
-- =============================================================================

DEFINE TABLE finance.fee_adjustments SCHEMAFULL;
DEFINE FIELD student_id ON finance.fee_adjustments TYPE record(administration.students);
DEFINE FIELD school_period_id ON finance.fee_adjustments TYPE record(core.school_periods);
DEFINE FIELD adjustment_type ON finance.fee_adjustments TYPE string;
DEFINE FIELD amount ON finance.fee_adjustments TYPE float;
DEFINE FIELD reason ON finance.fee_adjustments TYPE option<string>;
DEFINE FIELD is_auto_applied ON finance.fee_adjustments TYPE bool DEFAULT false;
DEFINE FIELD approved_by ON finance.fee_adjustments TYPE option<record>;

-- =============================================================================
-- TRANSPORT
-- =============================================================================

DEFINE TABLE finance.transport_routes SCHEMAFULL;
DEFINE FIELD name ON finance.transport_routes TYPE string;
DEFINE FIELD area ON finance.transport_routes TYPE option<string>;
DEFINE FIELD cost_per_term ON finance.transport_routes TYPE float;
DEFINE FIELD is_active ON finance.transport_routes TYPE bool DEFAULT true;

DEFINE TABLE finance.student_transport SCHEMAFULL;
DEFINE FIELD student_id ON finance.student_transport TYPE record(administration.students);
DEFINE FIELD route_id ON finance.student_transport TYPE record(finance.transport_routes);
DEFINE FIELD school_period_id ON finance.student_transport TYPE record(core.school_periods);
DEFINE FIELD status ON finance.student_transport TYPE string DEFAULT 'active';
DEFINE FIELD cost_override ON finance.student_transport TYPE option<float>;

-- =============================================================================
-- GENERAL LEDGER
-- =============================================================================

DEFINE TABLE finance.general_ledger_entries SCHEMAFULL;
DEFINE FIELD entry_number ON finance.general_ledger_entries TYPE string;
DEFINE FIELD transaction_date ON finance.general_ledger_entries TYPE datetime;
DEFINE FIELD financial_year_id ON finance.general_ledger_entries TYPE record(core.financial_years);
DEFINE FIELD account_id ON finance.general_ledger_entries TYPE record(finance.chart_of_accounts);
DEFINE FIELD debit_amount ON finance.general_ledger_entries TYPE float DEFAULT 0;
DEFINE FIELD credit_amount ON finance.general_ledger_entries TYPE float DEFAULT 0;
DEFINE FIELD description ON finance.general_ledger_entries TYPE string;
DEFINE FIELD source_table ON finance.general_ledger_entries TYPE option<string>;
DEFINE FIELD source_id ON finance.general_ledger_entries TYPE option<string>;

DEFINE INDEX idx_ledger_entry ON finance.general_ledger_entries COLUMNS entry_number UNIQUE;
```

### 5.2.6 HR/Payroll Namespace (hr)

```sql
-- =============================================================================
-- PAYROLL PERIODS
-- =============================================================================

DEFINE TABLE hr.payroll_periods SCHEMAFULL;
DEFINE FIELD name ON hr.payroll_periods TYPE string;
DEFINE FIELD period_type ON hr.payroll_periods TYPE string;
DEFINE FIELD start_date ON hr.payroll_periods TYPE datetime;
DEFINE FIELD end_date ON hr.payroll_periods TYPE datetime;
DEFINE FIELD payment_date ON hr.payroll_periods TYPE datetime;
DEFINE FIELD financial_year_id ON hr.payroll_periods TYPE record(core.financial_years);
DEFINE FIELD status ON hr.payroll_periods TYPE string DEFAULT 'open';

-- =============================================================================
-- PAYROLL ITEM TYPES
-- =============================================================================

DEFINE TABLE hr.payroll_item_types SCHEMAFULL;
DEFINE FIELD name ON hr.payroll_item_types TYPE string;
DEFINE FIELD category ON hr.payroll_item_types TYPE string;
DEFINE FIELD sub_category ON hr.payroll_item_types TYPE option<string>;
DEFINE FIELD tax_implication ON hr.payroll_item_types TYPE string;
DEFINE FIELD is_recurring ON hr.payroll_item_types TYPE bool DEFAULT false;

-- =============================================================================
-- STAFF SALARY SETTINGS
-- =============================================================================

DEFINE TABLE hr.staff_salary_settings SCHEMAFULL;
DEFINE FIELD staff_id ON hr.staff_salary_settings TYPE record(administration.staff);
DEFINE FIELD basic_salary ON hr.staff_salary_settings TYPE float;
DEFINE FIELD payment_bank ON hr.staff_salary_settings TYPE option<string>;
DEFINE FIELD bank_account_name ON hr.staff_salary_settings TYPE option<string>;
DEFINE FIELD bank_account_number ON hr.staff_salary_settings TYPE option<string>;
DEFINE FIELD kra_pin ON hr.staff_salary_settings TYPE option<string>;

-- =============================================================================
-- PAYSLIPS
-- =============================================================================

DEFINE TABLE hr.payslips SCHEMAFULL;
DEFINE FIELD payslip_number ON hr.payslips TYPE string;
DEFINE FIELD staff_id ON hr.payslips TYPE record(administration.staff);
DEFINE FIELD payroll_period_id ON hr.payslips TYPE record(hr.payroll_periods);
DEFINE FIELD basic_salary ON hr.payslips TYPE float;
DEFINE FIELD total_earnings ON hr.payslips TYPE float DEFAULT 0;
DEFINE FIELD total_deductions ON hr.payslips TYPE float DEFAULT 0;
DEFINE FIELD gross_salary ON hr.payslips TYPE float DEFAULT 0;
DEFINE FIELD net_salary ON hr.payslips TYPE float DEFAULT 0;
DEFINE FIELD status ON hr.payslips TYPE string DEFAULT 'draft';

DEFINE INDEX idx_payslip_number ON hr.payslips COLUMNS payslip_number UNIQUE;

-- =============================================================================
-- LEAVE MANAGEMENT
-- =============================================================================

DEFINE TABLE hr.leave_types SCHEMAFULL;
DEFINE FIELD name ON hr.leave_types TYPE string;
DEFINE FIELD days_allowed ON hr.leave_types TYPE int;
DEFINE FIELD is_paid ON hr.leave_types TYPE bool DEFAULT true;

DEFINE TABLE hr.leave_requests SCHEMAFULL;
DEFINE FIELD staff_id ON hr.leave_requests TYPE record(administration.staff);
DEFINE FIELD leave_type_id ON hr.leave_requests TYPE record(hr.leave_types);
DEFINE FIELD start_date ON hr.leave_requests TYPE datetime;
DEFINE FIELD end_date ON hr.leave_requests TYPE datetime;
DEFINE FIELD days ON hr.leave_requests TYPE float;
DEFINE FIELD status ON hr.leave_requests TYPE string DEFAULT 'pending';
```

### 5.2.7 Library, Inventory, Nutrition, Admissions Namespaces

Due to length constraints, here's a summary of remaining namespaces:

```sql
-- LIBRARY NAMESPACE
DEFINE TABLE library.book_categories;
DEFINE TABLE library.books;           -- accession_number, isbn, status
DEFINE TABLE library.loans;            -- book_id, user_id, due_date
DEFINE TABLE library.fines;            -- loan_id, amount, status
DEFINE TABLE library.reservations;

-- INVENTORY NAMESPACE
DEFINE TABLE inventory.warehouses;
DEFINE TABLE inventory.item_categories;
DEFINE TABLE inventory.items;
DEFINE TABLE inventory.fixed_assets;   -- asset_tag, depreciation
DEFINE TABLE inventory.stock_levels;
DEFINE TABLE inventory.stock_transactions;
DEFINE TABLE inventory.purchase_orders;
DEFINE TABLE inventory.requisitions;

-- NUTRITION NAMESPACE
DEFINE TABLE nutrition.meal_plans;
DEFINE TABLE nutrition.student_meal_plans;
DEFINE TABLE nutrition.menus;
DEFINE TABLE nutrition.meal_consumption;
DEFINE TABLE nutrition.student_wallets;
DEFINE TABLE nutrition.wallet_transactions;

-- ADMISSIONS NAMESPACE
DEFINE TABLE admissions.applications;  -- application_number, status
DEFINE TABLE admissions.application_reviews;
DEFINE TABLE admissions.application_interviews;
DEFINE TABLE admissions.application_approvals;
DEFINE TABLE admissions.application_documents;

-- AUDIT NAMESPACE
DEFINE TABLE audit.audit_logs;        -- user_id, action, entity_type, changes
```

---

# 6. API DESIGN

## 6.1 API Versioning Strategy

- **URL-based versioning**: `/api/v1/{resource}`
- **Major version only**: v1, v2 (no minor versions in URL)
- **Deprecation policy**: 12 months notice for breaking changes

## 6.2 Request/Response Format

### 6.2.1 Success Response

```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-02-17T10:30:00Z"
  }
}
```

### 6.2.2 Pagination Response

```json
{
  "success": true,
  "data": [
    { "id": "1", "name": "Student 1" },
    { "id": "2", "name": "Student 2" }
  ],
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

### 6.2.3 Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "first_name", "message": "First name is required" }
    ]
  }
}
```

## 6.3 API Endpoints Summary

| Module | Endpoints | CRUD | Business Logic |
|--------|-----------|------|----------------|
| **Auth** | 9 | Login, logout, refresh, password reset | Token management |
| **Users** | 12 | Full CRUD | Role assignment |
| **Students** | 20 | Full CRUD | Profile, finance, academics |
| **Staff** | 12 | Full CRUD | Salary, attendance |
| **Academics** | 35 | Full CRUD | Grading, timetable, exams |
| **Finance** | 45 | Full CRUD | Invoices, payments, GL |
| **HR** | 25 | Full CRUD | Payroll, leaves |
| **Library** | 15 | Full CRUD | Loans, fines |
| **Inventory** | 20 | Full CRUD | Stock, assets |
| **Nutrition** | 15 | Full CRUD | Wallets, consumption |
| **Admissions** | 18 | Full CRUD | Applications, interviews |
| **Reports** | 15 | Generation | Dashboard analytics |

---

# 7. AUTHENTICATION & AUTHORIZATION

## 7.1 Authentication Flow

### 7.1.1 Login Sequence

```
1. Client POST /auth/login { username, password }
2. API Verify password hash
3. API Generate JWT access token (15 min)
4. API Generate JWT refresh token (7 days)
5. API Store session in SurrealDB
6. API Return tokens + user data
```

### 7.1.2 Token Structure

**Access Token Claims:**
```go
type AccessTokenClaims struct {
    UserID    string   `json:"sub"`
    Username  string   `json:"username"`
    Email     string   `json:"email"`
    RoleIDs   []string `json:"roles"`
    Type      string   `json:"type"` // "access"
    Exp       int64   `json:"exp"`
    Iat       int64   `json:"iat"`
}
```

## 7.2 Authorization (RBAC)

### 7.2.1 Permission Model

```
Permission = Resource + Action

Examples:
- students:read     - View students
- students:create  - Create students
- students:update   - Update students
- students:delete   - Delete students
- invoices:read     - View invoices
- invoices:approve - Approve invoices
```

### 7.2.2 Role Hierarchy

```
Super Admin
    |
    ├── Admin
    │   ├── Finance Manager
    │   │   ├── Accountant
    │   │   └── Fee Collector
    │   ├── Academic Manager
    │   │   ├── Teacher
    │   │   └── Exam Officer
    │   ├── HR Manager
    │   │   └── Payroll Officer
    │   ├── Librarian
    │   └── Bursar
    │
    ├── Parent
    │
    └── Student
```

---

# 8. BUSINESS LOGIC SERVICES

## 8.1 Fee Calculation Service

### 8.1.1 Invoice Generation Algorithm

```go
func (s *FeeService) GenerateInvoice(ctx context.Context, studentID, periodID string) (*Invoice, error) {
    // 1. Get student category
    // 2. Get applicable fee template
    // 3. Calculate base fees
    // 4. Apply category discounts
    // 5. Add transport costs (if applicable)
    // 6. Add meal plan costs (if applicable)
    // 7. Calculate pro-rata (mid-term enrollment)
    // 8. Generate invoice items
    // 9. Create GL entries
    // 10. Return invoice
}
```

## 8.2 Payroll Service

### 8.2.1 Payroll Processing Algorithm

```go
func (s *PayrollService) ProcessPayroll(ctx context.Context, periodID string) error {
    // 1. Get all active staff
    // 2. For each staff:
    //    a. Get basic salary
    //    b. Add recurring allowances
    //    c. Calculate overtime
    //    d. Calculate tax
    //    e. Calculate deductions
    //    f. Create payslip
    // 3. Create bank payment file
    // 4. Create GL entries
    // 5. Lock period
}
```

## 8.3 Grading Service

```go
func (s *GradingService) CalculateGrade(examSessionID, studentID string) (*ExamResult, error) {
    // 1. Get all paper marks
    // 2. Apply weights
    // 3. Calculate total
    // 4. Determine grade from scheme
    // 5. Calculate rank
    // 6. Save result
}
```

---

# 9. MODULE-SPECIFIC IMPLEMENTATIONS

## 9.1 Finance Module

### 9.1.1 Invoice Lifecycle
```
Draft -> Issued -> Due -> Partial Payment -> Paid / Overdue -> Closed
                |
            Voided
```

### 9.1.2 Payment Application Algorithm
```go
func (s *PaymentService) ApplyPayment(paymentID string) error {
    // 1. Get outstanding invoices (oldest first)
    // 2. For each invoice:
    //    a. Calculate outstanding
    //    b. Apply payment
    //    c. Create GL entries
    //    d. Break if payment exhausted
    // 3. Generate receipt
}
```

## 9.2 Library Module

### 9.2.1 Loan Lifecycle
```
Available -> On Loan -> Returned / Lost / Damaged
                   |
              Overdue -> Fine Generated
```

## 9.3 Inventory Module

### 9.3.1 Stock Movement Flow
```
Requisition -> Approval -> Issue -> Stock Reduction
                  |
            Rejection
                  |
Purchase Order -> Receiving -> Stock Addition
```

---

# 10. ERROR HANDLING & VALIDATION

## 10.1 Error Types

```go
type AppError struct {
    Code      string        `json:"code"`
    Message   string        `json:"message"`
    Details   []FieldError  `json:"details,omitempty"`
    StackTrace string      `json:"-"`
}

type FieldError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}
```

## 10.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 422 | Invalid input data |
| CONFLICT | 409 | Resource conflict |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## 10.3 Validation Examples

```go
type StudentValidation struct {
    FirstName   string `validate:"required,min=1,max=50"`
    LastName    string `validate:"required,min=1,max=50"`
    Gender      string `validate:"required,oneof=Male Female Other"`
    DateOfBirth string `validate:"required,datetime=2006-01-02"`
    AdmissionNo string `validate:"required,alphanum,max=20"`
    Email       string `validate:"omitempty,email"`
    Phone       string `validate:"omitempty,phonenumber"`
}
```

---

# 11. TESTING STRATEGY

## 11.1 Testing Pyramid

```
         +-------------+
         |     E2E     |  <- Few, Critical paths
         |   Tests     |
        +--------------+
        | Integration  |  <- Moderate, Module interactions
        |   Tests      |
       +---------------+
       |  Unit Tests  |  <- Many, Individual functions
       +---------------+
```

## 11.2 Test Coverage Targets

| Type | Target |
|------|--------|
| Unit Tests | 80% coverage |
| Integration Tests | 60% coverage |
| Critical Paths | 100% E2E |

---

# 12. SECURITY

## 12.1 Security Measures

| Measure | Implementation |
|---------|----------------|
| **Password Hashing** | bcrypt with cost factor 12 |
| **TLS** | TLS 1.3 minimum |
| **CORS** | Whitelist allowed origins |
| **Rate Limiting** | 100 req/min per IP |
| **Input Validation** | All user input validated |
| **SQL Injection** | Parameterized queries only |
| **Audit Logging** | All sensitive operations logged |

## 12.2 Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

---

# 13. PERFORMANCE & OPTIMIZATION

## 13.1 Performance Targets

| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 200ms |
| Database Query Time (p95) | < 50ms |
| Concurrent Users | 1000+ |
| Uptime | 99.9% |

## 13.2 Optimization Strategies

- **Database**: Proper indexing, live queries, connection pooling
- **API**: Response compression, ETag caching, pagination
- **Caching**: Redis for frequently accessed data

---

# 14. DEPLOYMENT

## 14.1 Docker Configuration

```dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/api ./api

EXPOSE 8080
CMD ["./server"]
```

## 14.2 Environment Variables

```bash
ENV=production
SERVER_PORT=8080

# Database
SURREALDB_HOST=surrealdb
SURREALDB_PORT=8000
SURREALDB_USER=root
SURREALDB_PASS=root

# JWT
JWT_SECRET_KEY=your-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

---

# 15. MIGRATION STRATEGY

## 15.1 Migration Phases

| Phase | Duration | Tasks |
|-------|----------|-------|
| Foundation | 4 weeks | Project setup, auth, core CRUD |
| Core Modules | 8 weeks | Academics, Finance, HR |
| Supporting Modules | 8 weeks | Library, Inventory, Nutrition |
| Integration | 4 weeks | Frontend, real-time, reports |
| Testing & Deployment | 4 weeks | Testing, security audit, deployment |

**Total: 28 weeks (~7 months)**

---

# 16. APPENDICES

## 16.1 API Endpoint Reference

See separate **API_ENDPOINT_REFERENCE.md** for complete endpoint documentation.

## 16.2 Database Schema Reference

See separate **SCHEMA_REFERENCE.md** for complete field definitions.

## 16.3 Configuration Reference

See separate **CONFIG_REFERENCE.md** for all configuration options.

---

**Document Version:** 1.0  
**Last Updated:** February 17, 2026  
**Next Review:** March 17, 2026
