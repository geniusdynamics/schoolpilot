# SchoolPilot - User Stories

This document outlines user stories for SchoolPilot, categorized by user role and organized in a logical, chronological flow from initial setup to daily operations.

## User Roles

*   **Administrator**: The system superuser. Responsible for initial setup, user management, and configuring core system settings.
*   **Registrar / Admissions Officer**: Manages student data, admissions, and class assignments.
*   **HR Manager**: Manages staff data and payroll settings.
*   **Academic Dean / HOD**: Manages curriculum, subjects, and teacher assignments.
*   **Teacher**: Manages attendance, exam results entry, and views student information.
*   **Bursar / Accountant**: Manages all financial aspects, including fees, invoices, payments, and expenses.
*   **Librarian**: Manages the library catalog, loans, and fines.
*   **Store Keeper**: Manages inventory, stock levels, and requisitions.

---

## Phase 1: Initial System Setup

*As an **Administrator**...*
1.  **I want to** configure the basic School Profile, including its name, contact details, and logo, **so that** all system-generated documents and reports are correctly branded.
2.  **I want to** create user accounts for key staff members (Registrar, Accountant, etc.), **so that** they can begin their respective setup tasks.
3.  **I want to** define user Roles (e.g., "Teacher", "Bursar") and their basic permissions, **so that** I can assign them to users to control system access.
4.  **I want to** define the school's Academic Year Structures (e.g., "3-Term System"), **so that** I can create academic years based on a consistent template.
5.  **I want to** define the school's Financial Years, **so that** all financial transactions can be correctly periodized.

---

## Phase 2: Core Data Population

*As a **Registrar**...*
1.  **I want to** create Departments, including both academic (e.g., "Sciences") and administrative (e.g., "Finance") ones, **so that** staff and subjects can be correctly categorized.
2.  **I want to** create a list of staff Designations (e.g., "Principal", "Teacher", "Accountant"), **so that** staff members can be assigned appropriate job titles.
3.  **I want to** create Student Categories (e.g., "Boarder", "Day Scholar"), **so that** they can be used for filtering and applying different fee structures.
4.  **I want to** create Dormitories and assign a staff member as the master/mistress, **so that** boarding students can be assigned to a dorm.

*As an **Academic Dean**...*
1.  **I want to** create all the Subjects offered by the school, assigning each to a department and grouping (e.g., Sciences, Humanities), **so that** a master list of subjects is available for timetabling and exams.
2.  **I want to** define specific Papers for each subject where applicable (e.g., "Physics Paper 1 - Theory", "Physics Paper 2 - Practical"), **so that** exam results can be entered granularly.

*As an **HR Manager**...*
1.  **I want to** add all Staff members to the system, assigning them to a department and designation, **so that** a complete staff directory is available.

*As a **Registrar**...*
1.  **I want to** add a new Student to the system, capturing their personal details, admission number, and date of admission, **so that** their official record is created.
2.  **I want to** add the student's primary Parent/Guardian details at the same time I add the student, **so that** contact information is immediately available.

---

## Phase 3: Academic & Financial Configuration (For a New Academic Year)

*As a **Registrar**...*
1.  **I want to** create a new Academic Year (e.g., "AY 2024/2025").
2.  **I want to** define the School Periods (terms/semesters) for that academic year, setting their start and end dates and linking them to a Financial Year.
3.  **I want to** create Classes (e.g., "Form 1") and their corresponding Streams (e.g., "Form 1A", "Form 1B").
4.  **I want to** assign a Class Teacher to each stream, **so that** there is a primary point of contact for that group of students.
5.  **I want to** enroll new and continuing students into their respective class streams for the new academic year.

*As an **Academic Dean**...*
1.  **I want to** allocate which Subjects will be taught in each class stream for the academic year, **so that** the curriculum for each class is defined.
2.  **I want to** assign specific Teachers to the subjects they will teach in each class stream, **so that** the teaching timetable can be created.

*As a **Bursar**...*
1.  **I want to** create a new Fee Template for the upcoming school period (e.g., "Term 1 2024 - Day Scholars").
2.  **I want to** add specific fee items (voteheads) like "Tuition", "Transport", and "Lunch" with their respective amounts to the fee template.

---

## Phase 4: Termly & Daily Operations

*As a **Teacher**...*
1.  **I want to** view the Timetable for my assigned classes, **so that** I know which class I need to be in at what time.
2.  **I want to** take Attendance for each lesson, marking students as present, absent, or late, **so that** the school has an accurate record of student presence.

*As a **Bursar**...*
1.  **I want to** use the "Effect Fee Structures" feature to generate invoices for all students in a category or class based on a fee template, **so that** billing for the term is done efficiently.
2.  **I want to** record a fee Payment made by a student, specifying the amount and payment method, **so that** their account is credited.
3.  **I want to** apply a student's payment to their outstanding invoices, **so that** their balance is correctly updated.
4.  **I want to** record an Expense claim made by a staff member, **so that** it can enter the approval workflow for reimbursement.

*As a **Store Keeper**...*
1.  **I want to** process a stock Requisition from a teacher, **so that** I can prepare the requested items.
2.  **I want to** create a Purchase Order to a supplier for items that are low in stock, **so that** we can replenish our inventory.
3.  **I want to** record a stock Issuance when I give out items to a department or staff member, **so that** the stock levels are updated.

*As a **Librarian**...*
1.  **I want to** issue a Book to a student or staff member, recording the due date, **so that** I can track who has the book.
2.  **I want to** mark a book as Returned when a user brings it back, **so that** it becomes available for others.

*As a **Nutrition Manager**...*
1.  **I want to** log a Meal consumed by a student, **so that** the system can either check their meal plan or deduct the cost from their student wallet.

*As a **Teacher**...*
1.  **I want to** enter the Marks my students scored in an exam paper for a specific exam session, **so that** their results are recorded.

---

## Phase 5: End of Term / Reporting

*As an **Academic Dean**...*
1.  **I want to** view the Exam Analysis for a subject in a specific class, **so that** I can understand student performance.
2.  **I want to** generate a Report Card for a student, **so that** it can be shared with parents.

*As a **Bursar**...*
1.  **I want to** generate a Fee Collection Summary report, **so that** I can see how much has been collected against what was expected for each votehead.
2.  **I want to** generate a Fee Statement for a specific student, **so that** they or their parent can see a detailed breakdown of charges and payments.

*As an **Administrator**...*
1.  **I want to** view the Audit Log, **so that** I can track important actions performed by users in the system for accountability.
