# Akademiko Library Module Migration Specification

## 1. Introduction
This document outlines the strategy for migrating the existing Akademiko Library module functionalities from the old system to the new SchoolPilot platform. The goal is to identify key features, assess their current implementation, and propose a roadmap for integrating them into the modern, scalable architecture.

## 2. Missing Features / Areas for Improvement in Old System
While the old library system provided core functionalities, several areas could be improved or are entirely missing, which the new system should address:

*   **Advanced Search and Filtering**: More robust search capabilities beyond basic keyword matching, including filtering by categories, authors, publication year, and availability.
*   **Digital Resource Management**: Support for managing digital books, journals, and other media, including access control and versioning.
*   **Automated Notifications**: System-generated notifications for overdue books, new arrivals, and reservation availability.
*   **User Self-Service Portal**: A portal for students/staff to view their borrowed books, renew, reserve, and check their borrowing history.
*   **Integration with Academic Records**: Seamless integration with student and staff academic profiles for better tracking and reporting.
*   **Inventory Management**: Enhanced features for tracking library assets, including auditing, stocktaking, and depreciation.
*   **Reporting and Analytics**: More comprehensive and customizable reports on library usage, popular books, overdue items, and user activity.
*   **Multi-Branch Support**: Ability to manage multiple library branches and their respective inventories.

## 3. Proposed Module Placements
The library functionalities will be integrated into the new system, primarily within a dedicated `Library` module, with touchpoints in `Academics` and `Reports`.

*   **Library Management Module**: This will be the core module for all library-specific operations, including:
    *   Book/Resource Cataloging (Physical and Digital)
    *   Borrowing and Returning Management
    *   User (Borrower) Management
    *   Fine Management
    *   Reservations and Holds
    *   Inventory and Stocktaking
    *   Configuration (Categories, Shelves, Borrowing Rules)

*   **Academics Module Integration**: Integration points for:
    *   Student/Staff profiles to link with borrowing history.
    *   Academic reporting that might include library usage statistics.

*   **Reports Module Integration**: For generating comprehensive library-related reports and analytics.

## 4. Implementation Checklist
This checklist outlines the key functionalities to be implemented or enhanced in the new Library module:

*   **Resource Cataloging**: Implement forms and processes for adding, editing, and managing physical and digital library resources.
    *   Book Categories (`frmBookCategories.cs`): **Covered by** <mcfile name="BookCategoriesPage.tsx" path="src/modules/library/pages/BookCategoriesPage.tsx"></mcfile> and <mcfile name="useBookCategoryData.ts" path="src/modules/library/data/useBookCategoryData.ts"></mcfile>.
    *   Book Registration (`frmBookRegistration.cs`): **Partially covered by** <mcfile name="BooksPage.tsx" path="src/modules/library/pages/BooksPage.tsx"></mcfile> and <mcfile name="useBookData.ts" path="src/modules/library/data/useBookData.ts"></mcfile>. Needs enhancement for full registration flow.
    *   Import Books (`frmImportBooks.cs`): **Missing**. Requires new implementation.
*   **Borrowing & Returns**: Develop the core logic and UI for issuing and returning books.
    *   Issue Book (`frmIssueBook.cs`): **Covered by** <mcfile name="BookLoansPage.tsx" path="src/modules/library/pages/BookLoansPage.tsx"></mcfile> and <mcfile name="useLoanData.ts" path="src/modules/library/data/useLoanData.ts"></mcfile>.
    *   Return Book (`frmReturnBook.cs`): **Covered by** <mcfile name="BookLoansPage.tsx" path="src/modules/library/pages/BookLoansPage.tsx"></mcfile> and <mcfile name="useLoanData.ts" path="src/modules/library/data/useLoanData.ts"></mcfile>.
*   **User Management**: Integrate with the system's user management for library patrons.
    *   Users (`frmUsers.cs`): **Covered by** existing system-wide user management. Integration needed.
    *   Entity Profile (`frmEntityProfile.cs`): **Covered by** existing system-wide entity management. Integration needed.
*   **Inventory & Maintenance**: Features for managing the physical state and availability of books.
    *   Damaged Books (`frmDamagedBooks.cs`): **Missing**. Requires new implementation, possibly extending <mcfile name="useBookData.ts" path="src/modules/library/data/useBookData.ts"></mcfile>.
    *   Lost Books (`frmLostBooks.cs`): **Missing**. Requires new implementation, possibly extending <mcfile name="useBookData.ts" path="src/modules/library/data/useBookData.ts"></mcfile>.
*   **Reporting**: Develop various reports for library operations.
    *   Reports (`frmReports.cs`): **Partially covered by** <mcfile name="LibraryDashboardPage.tsx" path="src/modules/library/pages/LibraryDashboardPage.tsx"></mcfile> and general <mcfolder name="reports" path="src/modules/reports"></mcfolder> module. Needs dedicated library reports.
    *   Generate Reports (`generateReports.cs`): **Partially covered by** general <mcfolder name="reports" path="src/modules/reports"></mcfolder> module. Needs specific library report generation logic.
*   **System Utilities**: Core system functionalities.
    *   Database Processes (`dbProcesses.cs`): **Covered by** RxDB and backend services.
    *   SQL Statements (`Sql_Statements.cs`): **Covered by** RxDB and backend services.
    *   Common Functions (`CommonFunctions.cs`): **Covered by** shared utility functions in `src/utils`.
    *   Login (`frmLogin.cs`): **Covered by** system-wide authentication module.
    *   Main Form (`frmMainForm.cs`): **Covered by** main application layout.
    *   Dashboard (`frmDashboard.cs`): **Covered by** <mcfile name="LibraryDashboardPage.tsx" path="src/modules/library/pages/LibraryDashboardPage.tsx"></mcfile>.
    *   DB Connection (`frmDbConnection.cs`): **Covered by** system-wide database configuration.
    *   DB Backup (`frmDBBackups.cs`, `frmDBBackupcs.cs`): **Missing**. Requires new implementation, possibly as a system-level utility.
    *   Privileges (`frmPriviledges.cs`): **Covered by** <mcfile name="rbac.ts" path="src/modules/library/rbac.ts"></mcfile> and system-wide RBAC.
    *   Rules (`frmRules.cs`): **Partially covered by** <mcfile name="useLoanData.ts" path="src/modules/library/data/useLoanData.ts"></mcfile> (for borrowing rules). Needs a dedicated configuration UI for rules.
    *   Search Entity (`frmSearchEntity.cs`): **Partially covered by** existing search functionalities within <mcfile name="BooksPage.tsx" path="src/modules/library/pages/BooksPage.tsx"></mcfile>, <mcfile name="BookLoansPage.tsx" path="src/modules/library/pages/BookLoansPage.tsx"></mcfile>, etc. Needs a more generalized search component.
## 5. Old System Reference
This section provides a brief overview of the key functionalities and relevant files in the old Akademiko Library system.

*   **Book Management**: The old system allowed for the registration of new books, categorization, and basic search. It also handled damaged and lost books.
    *   `frmBookCategories.cs`: Manages categories for books.
    *   `frmBookNumber.cs`: Likely for managing book unique identifiers.
    *   `frmBookRegistration.cs`: Handles the registration of new books into the system.
    *   `frmImportBooks.cs`: Functionality to import book data, possibly from external sources.
    *   `frmDamagedBooks.cs`: Records and manages books that are damaged.
    *   `frmLostBooks.cs`: Records and manages books that are lost.

*   **Borrowing and Returning**: Core functionality for issuing books to users and recording their return.
    *   `frmIssueBook.cs`: Manages the process of issuing books to borrowers.
    *   `frmReturnBook.cs`: Manages the process of returning borrowed books.

*   **User and Entity Management**: Handled user accounts and general entity profiles within the library context.
    *   `frmUsers.cs`: Manages user accounts with access to the library system.
    *   `frmEntityProfile.cs`: Manages profiles for entities (e.g., students, staff) who interact with the library.
    *   `frmPriviledges.cs`: Manages user privileges and roles within the system.

*   **Reporting**: Provided basic reports on library operations.
    *   `frmReports.cs`: Interface for generating various library reports.
    *   `generateReports.cs`: Contains logic for generating reports.

*   **System Utilities and Core Logic**: Various forms and classes for system administration, database interaction, and common functions.
    *   `dbProcesses.cs`: Handles database operations and interactions.
    *   `Sql_Statements.cs`: Contains SQL queries and statements used throughout the application.
    *   `CommonFunctions.cs`: Provides common utility functions used across the application.
    *   `frmLogin.cs`: Handles user authentication and login.
    *   `frmMainForm.cs`: The main application interface.
    *   `frmDashboard.cs`: Displays an overview or summary of library activities.
    *   `frmDbConnection.cs`: Manages database connection settings.
    *   `frmDBBackups.cs`, `frmDBBackupcs.cs`: Handles database backup and restore operations.
    *   `frmRules.cs`: Manages rules or policies related to library operations (e.g., borrowing rules).
    *   `frmSearchEntity.cs`: Provides a generic search interface for entities.

## 6. Current Library Module Implementations
This section maps the proposed module placements to the actual files and components found in the `src/modules/library` directory, providing an overview of the existing implementations.

*   **Data Management Hooks and Schemas (`src/modules/library/data`)**:
    *   `collections.ts`: Defines RxDB collections for library data.
    *   `index.ts`: Entry point for library data module.
    *   `mockData.ts`: Provides mock data for development and testing.
    *   `schema.ts`: Defines the data schemas for library entities (e.g., books, loans, fines, categories).
    *   `types.ts`: Defines TypeScript types for library data.
    *   `useBookCategoryData.ts`: Hook for managing book category data.
    *   `useBookData.ts`: Hook for managing book data.
    *   `useFineData.ts`: Hook for managing fine data.
    *   `useLoanData.ts`: Hook for managing loan data.

*   **UI Pages (`src/modules/library/pages`)**:
    *   `BookCategoriesPage.tsx`: UI for managing book categories.
    *   `BookLoansPage.tsx`: UI for managing book loans (issuing and returning).
    *   `BooksPage.tsx`: UI for displaying and managing books.
    *   `FinesPage.tsx`: UI for managing fines.
    *   `LibraryDashboardPage.tsx`: Dashboard for the library module.

*   **Module Definition and RBAC**:
    *   `moduleDefinition.tsx`: Defines the library module's entry point and configuration.
    *   `rbac.ts`: Defines Role-Based Access Control (RBAC) permissions for the library module.

## 7. Detailed Gap Analysis and Proposed Solutions
Based on the comparison between the old system's functionalities, the desired new system features, and the current implementations in `src/modules/library`, the following key gaps have been identified:

### Gap 1: Limited Support for Advanced Search and Digital Resource Management
*   **Analysis**: The current `BooksPage.tsx` and `useBookData.ts` provide basic book management. However, there's no explicit support for advanced search filters (e.g., by publication year, availability status, specific keywords within content) or for managing digital resources (e.g., e-books, journals, multimedia) with access control and versioning.
*   **Proposed Solution**: Enhance the `useBookData.ts` hook and `BooksPage.tsx` to support advanced search queries. Introduce new data schemas and hooks (e.g., `useDigitalResourceData.ts`) and corresponding UI components to manage digital assets, including file uploads, access permissions, and version control.

### Gap 2: Absence of Automated Notifications and User Self-Service Portal
*   **Analysis**: The existing module lacks mechanisms for automated notifications (e.g., overdue book reminders, new arrival alerts) and a dedicated self-service portal for users to manage their loans, reservations, and view their history. While `BookLoansPage.tsx` handles loan operations, it's primarily for staff.
*   **Proposed Solution**: Implement a notification service (possibly integrated with a system-wide notification module) to send automated alerts. Develop a new `UserLibraryPortalPage.tsx` that leverages `useLoanData.ts` and `useBookData.ts` to provide a personalized view for users, allowing them to renew books, place holds, and view their borrowing history.

### Gap 3: Insufficient Inventory Management and Reporting/Analytics
*   **Analysis**: The current implementation does not explicitly cover features for managing damaged/lost books, comprehensive inventory tracking (auditing, stocktaking), or generating detailed, customizable reports beyond basic lists. The `FinesPage.tsx` and `LibraryDashboardPage.tsx` provide some overview but lack depth.
*   **Proposed Solution**: Extend `useBookData.ts` to include status fields for damaged/lost books and implement UI for updating these statuses. Develop new components for inventory management (e.g., `InventoryAuditPage.tsx`). Enhance the reporting capabilities by integrating with the general `src/modules/reports` module, allowing for dynamic report generation based on various library metrics (e.g., popular books, overdue rates, user activity).

### Gap 4: Lack of Configurable Borrowing Rules and Multi-Branch Support
*   **Analysis**: While `useLoanData.ts` handles loan logic, there's no clear mechanism for configuring complex borrowing rules (e.g., different loan periods for different user types or book categories, fine calculation logic). Multi-branch support is entirely missing.
*   **Proposed Solution**: Introduce a `useLibrarySettingsData.ts` hook and a `LibrarySettingsPage.tsx` to manage configurable borrowing rules. For multi-branch support, modify existing data schemas (e.g., `schema.ts` for books and loans) to include a `branchId` field and update relevant UI components to filter/display data based on the selected branch.

## 8. Implementation Plan

1.  **Phase 1: Core Enhancements (Resource Cataloging & Search)**
    *   Modify `src/modules/library/data/schema.ts` to include fields for advanced search attributes and digital resource metadata.
    *   Update `src/modules/library/data/useBookData.ts` and `src/modules/library/pages/BooksPage.tsx` to support advanced search and filtering.
    *   Create new data hooks and UI components for digital resource management (e.g., `useDigitalResourceData.ts`, `DigitalResourcesPage.tsx`).

2.  **Phase 2: User Interaction & Notifications**
    *   Develop a new `src/modules/library/pages/UserLibraryPortalPage.tsx` for user self-service.
    *   Implement automated notification logic within a new service (e.g., `src/modules/library/services/notificationService.ts`) that integrates with a system-wide notification mechanism.

3.  **Phase 3: Inventory & Reporting Deep Dive**
    *   Extend `src/modules/library/data/schema.ts` and `useBookData.ts` for damaged/lost book tracking.
    *   Develop `src/modules/library/pages/InventoryAuditPage.tsx` for stocktaking and auditing.
    *   Integrate with `src/modules/reports` to create dynamic and customizable library reports.

4.  **Phase 4: Configuration & Scalability**
    *   Create `src/modules/library/data/useLibrarySettingsData.ts` and `src/modules/library/pages/LibrarySettingsPage.tsx` for configurable borrowing rules.
    *   Update relevant schemas and data hooks to incorporate `branchId` for multi-branch support.
    *   Review and enhance RBAC (`src/modules/library/rbac.ts`) for new functionalities.

## 9. Validation Strategy
To ensure the successful implementation and robustness of the new Library module functionalities, the following validation strategy will be employed:

*   **Unit Tests**: Develop comprehensive unit tests for all new and modified data hooks, utility functions, and business logic to ensure individual components function as expected.
*   **Integration Tests**: Create integration tests to verify the seamless interaction between different components within the Library module (e.g., UI components with data hooks, data hooks with RxDB) and with other system modules (e.g., user management, reports).
*   **End-to-End Tests**: Implement end-to-end tests to simulate real-world user flows, covering critical paths such as book cataloging, borrowing/returning, fine management, and user self-service operations. These tests will validate the entire system from the UI to the database.
*   **User Acceptance Testing (UAT)**: Conduct UAT with library staff and end-users to gather feedback and ensure the implemented features meet their operational needs and expectations. This will involve testing with realistic data and scenarios.
*   **Performance Testing**: For features like advanced search and reporting, conduct performance tests to ensure they remain responsive and efficient under various data loads.
*   **Security Audits**: Perform security audits, especially for digital resource management and user self-service portals, to identify and mitigate potential vulnerabilities.

## 10. New System Considerations
The new system should be designed with the following considerations to ensure flexibility, scalability, and modern functionality:

*   **Configurable Borrowing Rules**: Ability to define flexible borrowing periods, limits, and fine structures based on user type, resource type, and other criteria.
*   **Digital Rights Management (DRM) Integration**: For digital resources, consider integration with DRM solutions to manage access and usage.
*   **Interlibrary Loan Support**: Functionality to manage requests and fulfillment of resources from other libraries.
*   **RFID/Barcode Integration**: Support for modern inventory tracking technologies.
*   **API-First Design**: Expose library functionalities via APIs for easier integration with other modules or external systems.
*   **Scalable Database Schema**: Design a database schema that can handle a large volume of resources and transactions efficiently.
*   **User Experience (UX)**: A modern, intuitive, and responsive user interface for both library staff and patrons.
*   **Security**: Robust authentication, authorization, and data protection mechanisms.

## 11. External References
*   [Akademiko Library Module Source Code (Old System)](file:///D:/DevCenter/abuilds/EduGen/old_system/schoolpilot3/docs/AkademicoNotes/Akademico_Library)