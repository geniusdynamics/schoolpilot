# SchoolPilot - Feature List

This document provides a comprehensive list of the features implemented in SchoolPilot, categorized by module. It also includes potential future additions for each feature.

---

## Module: Administration

The Administration module forms the backbone of the school's operational setup.

### Feature: Student Management
- **Description**: Handles the entire lifecycle of a student from admission to alumni status.
- **Requirements**:
  - Add new students with detailed personal and guardian information.
  - View a filterable and searchable list of all students.
  - Edit student details.
  - View a detailed student profile page with tabs for different information categories (bio, financials, academics).
  - Assign students to classes, streams, categories, and dormitories.
- **Future Potential**:
  - Bulk import/export of student data.
  - Student and Parent portal access.
  - Advanced document management for student records.

### Feature: Staff Management
- **Description**: Manages all school staff, both academic and non-academic.
- **Requirements**:
  - Add new staff members with personal and employment details.
  - Assign staff to departments and designations.
  - Designate Heads of Department (HODs).
  - View and filter staff lists.
- **Future Potential**:
  - Staff portal.
  - Leave management system.
  - Performance appraisal module.

### Feature: Academic Calendar Setup
- **Description**: Allows for the definition of the school's academic structure, years, and terms/semesters.
- **Requirements**:
  - **Academic Structures**: Define the high-level structure (e.g., 3-Term System, Semester System).
  - **Academic Period Definitions**: Define the components of a structure (e.g., "Term 1", "Term 2").
  - **Academic Years**: Create specific academic years (e.g., "AY 2024/2025") based on a structure.
  - **School Periods**: Define the actual terms/semesters within an academic year, linking them to a financial year and setting start/end dates.
- **Future Potential**:
  - Automated rollover process for creating new academic years.

### Feature: Communications
- **Description**: Facilitates communication with students, parents, and staff.
- **Requirements**:
  - **Communication Templates**: Create reusable templates for SMS and Email.
  - **Message Campaigns**: Create and manage bulk messaging campaigns targeting specific audiences (e.g., all parents, students of a specific class).
- **Future Potential**:
  - Real-time chat functionality.
  - Integration with WhatsApp and other messaging platforms.
  - Automated communication triggers (e.g., fee reminders, attendance alerts).

### Feature: Foundational Setup
- **Description**: Core administrative entities that support other modules.
- **Requirements**:
  - **Departments**: Manage academic and administrative departments.
  - **Designations**: Manage staff job titles.
  - **Student Categories**: Define categories like "Boarder" or "Day Scholar".
  - **Dormitories**: Manage school dormitories and assign masters/mistresses.
  - **Partners & Customers**: Manage external entities.
  - **Clubs & Societies**: Manage extracurricular groups and their patrons.

---

## Module: Academics

This module handles all teaching and learning-related activities.

### Feature: Curriculum Management
- **Description**: Defines the subjects and papers offered by the school.
- **Requirements**:
  - **Subjects**: Create and manage subjects, assign them to departments and groupings.
  - **Subject Papers**: Define specific papers for each subject (e.g., "Physics Paper 1 (Theory)").
- **Future Potential**:
  - Detailed curriculum mapping and syllabus management.

### Feature: Class & Subject Allocation
- **Description**: Manages how subjects and teachers are assigned to classes.
- **Requirements**:
  - **Classes & Streams**: Create classes (e.g., Form 1) and their streams (e.g., A, B, North).
  - **Class Subject Allocations**: Assign subjects to specific class streams for an academic year.
  - **Teacher Assignments**: Assign teachers to the allocated subjects for each class stream.
  - **Student Enrollment**: Enroll students into optional/elective subjects.

### Feature: Examinations & Grading
- **Description**: Manages the entire examination process from setup to results analysis.
- **Requirements**:
  - **Grading Schemes**: Define custom grading systems (e.g., A, B, C or 8-4-4 system points).
  - **Exam Sessions**: Create exam sessions for a school period (e.g., "Mid-Term Exams", "End-Term Exams").
  - **Paper Settings**: Configure the papers to be included in an exam session, including marks out of and weighting.
  - **Results Entry**: A marksheet-style interface for teachers to enter student scores for each paper.
- **Future Potential**:
  - Online examination portal for students.

### Feature: Timetabling
- **Description**: Manages the school's class schedules.
- **Requirements**:
  - **Timetable Periods**: Define standard lesson periods for the day (e.g., Lesson 1, 8:00-9:00).
  - **Timetable Entries**: Create a visual timetable by assigning subjects and teachers to periods for each class stream.
- **Future Potential**:
  - Automated timetable generation with clash detection.
  - Teacher and student personal timetable views.

### Feature: Academic Analysis
- **Description**: Provides tools to analyze academic performance.
- **Requirements**:
  - **Exam Analysis**: View subject-wise performance analysis for a given exam and class, including highest, lowest, and average scores.
- **Future Potential**:
  - Detailed student performance tracking over time.
  - Cohort analysis and subject correlation reports.

---

## Module: Finance

Handles all financial aspects of the school.

### Feature: Fee Management
- **Description**: Manages student fees, invoicing, and payments.
- **Requirements**:
  - **Fee Templates**: Create reusable fee structures with different voteheads (e.g., Tuition, Transport).
  - **Effect Fee Structures**: Generate bulk invoices for students based on a fee template and target criteria (category or class).
  - **Student Payments**: Record fee payments received from students.
  - **Payment Application**: Apply received payments to specific invoice items.
  - **Fee Adjustments**: Record scholarships, discounts, or fines.
- **Future Potential**:
  - Online payment gateway integration.
  - Automated late fee calculation.

### Feature: General Accounting
- **Description**: Core accounting functionalities.
- **Requirements**:
  - **Chart of Accounts**: Manage all financial accounts (Assets, Liabilities, Revenue, etc.).
  - **Bank Accounts**: Manage school bank accounts.
  - **General Receipts**: Record miscellaneous income not related to student fees.
  - **Expense Management**: Record and categorize school expenses.
- **Future Potential**:
  - Budgeting module.
  - Financial statements generation (Balance Sheet, P&L).

### Feature: Transport Management
- **Description**: Manages school transport routes and student assignments.
- **Requirements**:
  - **Transport Routes**: Define bus routes and their associated fees.
  - **Student Assignments**: Assign students to specific transport routes for a given period.
- **Future Potential**:
  - Vehicle management and route optimization.

### Feature: Procurement & Suppliers
- **Description**: Manages school suppliers and their invoices.
- **Requirements**:
  - **Suppliers**: Maintain a database of suppliers.
  - **Supplier Invoices**: Record invoices received from suppliers.
- **Future Potential**:
  - Full procurement workflow from requisition to payment.

---

## Module: Human Resources (HR)

Manages staff payroll and related settings.

### Feature: Payroll Management
- **Description**: Handles the process of calculating and managing staff salaries.
- **Requirements**:
  - **Payroll Periods**: Define monthly or custom payroll periods.
  - **Payroll Item Types**: Define earnings (allowances), deductions (loans), and contributions.
  - **Salary Settings**: Configure basic salary and recurring items for each staff member.
  - **Payslip Generation**: Generate payslips for all staff for a given period.
- **Future Potential**:
  - Tax compliance and statutory deductions reports.
  - Staff loan management module.

---

## Module: Inventory

Manages school stores, stock, and procurement.

### Feature: Stores & Stock Management
- **Description**: Manages inventory items and their locations.
- **Requirements**:
  - **Warehouses**: Define physical store locations.
  - **Item Categories**: Categorize inventory items.
  - **Items Master**: Maintain a master list of all consumable and fixed asset items.
  - **Fixed Assets**: Track details of fixed assets like furniture and equipment.
  - **Stock Levels**: View current quantity on hand for all items in each warehouse.
  - **Stock Issuance**: Record items being issued from a store.
- **Future Potential**:
  - Barcode/QR code integration for stock taking.
  - Automated reorder level alerts.

### Feature: Procurement Workflow
- **Description**: Manages the process of requesting and ordering new stock.
- **Requirements**:
  - **Requisitions**: Staff can request items from the store.
  - **Purchase Orders (LPOs)**: Create and manage purchase orders to suppliers.
- **Future Potential**:
  - RFQ (Request for Quotation) and vendor bidding process.
  - Goods Received Note (GRN) functionality to update stock upon delivery.

---

## Module: Library

Manages all library resources and activities.

### Feature: Catalog Management
- **Description**: Manages the library's collection of books.
- **Requirements**:
  - **Book Categories**: Define categories for books.
  - **Books**: Maintain a detailed catalog of all library books with their status.
- **Future Potential**:
  - Digital resource management.
  - Barcode generation for books.

### Feature: Circulation Management
- **Description**: Handles the loaning and returning of books.
- **Requirements**:
  - **Book Loans**: Record when a book is issued to a user and its due date.
  - **Returns**: Mark books as returned, which updates their status.
  - **Fines**: Manage fines for overdue or damaged books.
- **Future Potential**:
  - Online book reservation system.
  - Automated overdue reminders.

---

## Module: Nutrition & Wallet

Manages school meals and student pocket money accounts.

### Feature: Meal Management
- **Description**: Manages meal plans and daily menus.
- **Requirements**:
  - **Meal Plans**: Define meal plans and their costs.
  - **Student Assignments**: Assign students to meal plans.
  - **Menus**: Create daily menus for different meal types.
  - **Consumption Logging**: A point-of-sale style interface to log meals consumed by students.
- **Future Potential**:
  - Nutritional information tracking for menu items.

### Feature: Student Wallet
- **Description**: Manages a cashless "pocket money" system for students.
- **Requirements**:
  - **Wallet Management**: View balances for all students.
  - **Manual Transactions**: Admins can deposit funds or make adjustments to student wallets.
- **Future Potential**:
  - Parent portal for online wallet top-ups.
  - Spending reports for parents.

---

## Module: Reports

Provides data analysis and printable documents from across all modules.

### Feature: Standard Reports
- **Description**: A collection of pre-defined reports.
- **Requirements**:
  - **Student Masterlist**: A comprehensive, filterable list of all students.
  - **Exam Results Marksheet**: Horizontal report showing all subject scores for a class.
  - **Student Financial Summary**: A summary of fees billed, paid, and balance for students.
  - **And many others...** (Fee Collection, Teacher Assignments, etc.)
- **Future Potential**:
  - Custom report builder.
  - Advanced data visualization and analytics.

---

## Module: Settings

Central configuration for the entire application.

### Feature: System Configuration
- **Description**: Allows administrators to configure core aspects of the system.
- **Requirements**:
  - **School Profile**: Manage the school's name, contacts, and other details.
  - **User & Role Management**: Create users and define roles with permissions.
  - **Workflow Management**: Define approval workflows for processes like requisitions.
  - **Database Management**: (Production Mode Only) Tools to seed and clear the local RxDB database.
  - **Audit Log**: View a log of significant actions taken within the system.
- **Future Potential**:
  - Granular permission control for roles.
  - Customizable dashboard widgets.