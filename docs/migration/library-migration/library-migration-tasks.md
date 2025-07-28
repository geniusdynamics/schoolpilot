# Library Migration Tasks

This document outlines the detailed migration tasks required to address the gaps identified in the Legacy-to-Current Feature Audit for the Library module.

## LIB-G01: Book Registration Enhancement
- **Layers to Modify**: BooksPage.tsx, useBookData.ts
- **Changes Required**: Enhance book registration form with additional fields (ISBN, author, publication date). Implement validation for these fields.
- **Effort Size**: M
- **Dependencies**: None

## LIB-G02: Import Books
- **Layers to Modify**: New ImportBooksPage.tsx, importBooksService.ts
- **Changes Required**: Develop UI for bulk book import with support for CSV files. Implement backend service to process imports.
- **Effort Size**: M
- **Dependencies**: LIB-G01

## LIB-G03: Damaged Books Management
- **Layers to Modify**: DamagedBooksPage.tsx, useBookData.ts
- **Changes Required**: Create page to manage damaged books and update their status. Add hook functionality to retrieve and update damaged status.
- **Effort Size**: S
- **Dependencies**: None

## LIB-G04: Lost Books Management
- **Layers to Modify**: LostBooksPage.tsx, useBookData.ts
- **Changes Required**: Implement management interface for marking books as lost. Update RxDB schemas accordingly.
- **Effort Size**: S
- **Dependencies**: LIB-G03 (for status handling)

## LIB-G05: User-Library Integration
- **Layers to Modify**: UserManagement.tsx, useUserData.ts
- **Changes Required**: Integrate library privileges into the existing user management system.
- **Effort Size**: M
- **Dependencies**: None

## LIB-G06: Entity Profile Integration
- **Layers to Modify**: EntityProfilePage.tsx, useEntityData.ts
- **Changes Required**: Enhance entity profiles with library-related data (e.g., borrowed books, privileges).
- **Effort Size**: M
- **Dependencies**: LIB-G05

## LIB-G07: Library-Specific Reports
- **Layers to Modify**: LibraryReportsPage.tsx, useLibraryReportData.ts
- **Changes Required**: Add new library-specific reports for overdue books, damaged status, and inventory levels. Implement export options.
- **Effort Size**: M
- **Dependencies**: UseBookData hook updates

## LIB-G08: Report Generation Logic
- **Layers to Modify**: generateReportsService.ts
- **Changes Required**: Develop backend service for generating library-specific reports. Include scheduling capabilities.
- **Effort Size**: M
- **Dependencies**: LIB-G07

## LIB-G09: Database Backup Utility
- **Layers to Modify**: BackupService.ts
- **Changes Required**: Implement utility to manage regular database backups. Integrate scheduling options.
- **Effort Size**: M
- **Dependencies**: None

## LIB-G10: Borrowing Rules UI
- **Layers to Modify**: BorrowingRulesPage.tsx, useLoanData.ts
- **Changes Required**: Develop UI to configure library borrowing rules and limits.
- **Effort Size**: S
- **Dependencies**: LIB-G02 (import affects rules)

## LIB-G11: Generalized Search Component
- **Layers to Modify**: SearchComponent.tsx, useSearchData.ts
- **Changes Required**: Extend search capabilities with advanced filtering for books and authors.
- **Effort Size**: M
- **Dependencies**: LIB-G01 (field requirements)

## LIB-G12: Enhanced Advanced Search
- **Layers to Modify**: SearchPage.tsx, useAdvancedSearch.ts
- **Changes Required**: Implement new filtering and search logic to improve the user experience.
- **Effort Size**: M
- **Dependencies**: Use of generalized search component

---

The tasks defined here provide a clear, prioritized path to close the Library module gaps in the SchoolPilot 3 system. Each task includes scope, requirements, and dependencies to ensure smooth development coordination and successful gap closure.

