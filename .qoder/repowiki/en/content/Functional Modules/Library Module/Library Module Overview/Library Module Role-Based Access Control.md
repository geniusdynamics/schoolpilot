# Library Module Role-Based Access Control

<cite>
**Referenced Files in This Document**   
- [rbac.ts](file://src/modules/library/rbac.ts)
- [useBookData.ts](file://src/modules/library/data/useBookData.ts)
- [useLoanData.ts](file://src/modules/library/data/useLoanData.ts)
- [useFineData.ts](file://src/modules/library/data/useFineData.ts)
- [useLibrarySettingsData.ts](file://src/modules/library/data/useLibrarySettingsData.ts)
- [ModuleManagementPage.tsx](file://src/modules/settings/pages/ModuleManagementPage.tsx)
- [useRBAC.ts](file://src/hooks/useRBAC.ts)
- [core/rbacService.ts](file://src/core/rbacService.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Permission Matrix Overview](#permission-matrix-overview)
3. [Role-Based Capabilities](#role-based-capabilities)
4. [CRUD Permissions by Resource](#crud-permissions-by-resource)
5. [Permission Enforcement Mechanisms](#permission-enforcement-mechanisms)
6. [Integration with Global RBAC Service](#integration-with-global-rbac-service)
7. [Permission Inheritance and Custom Policies](#permission-inheritance-and-custom-policies)
8. [UI Component Permission Checks](#ui-component-permission-checks)
9. [Route Guards and Access Control](#route-guards-and-access-control)
10. [Administrator Configuration Guide](#administrator-configuration-guide)

## Introduction
The Library module in schoolpilot3 implements a comprehensive role-based access control (RBAC) system that governs access to library resources including books, loans, fines, and settings. This documentation details the permission matrix, enforcement mechanisms, and integration patterns that ensure secure and appropriate access to library functionality based on user roles such as librarian, teacher, student, and administrator.

**Section sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L1-L150)

## Permission Matrix Overview
The Library module defines a granular permission matrix that specifies CRUD (Create, Read, Update, Delete) operations for key resources. Permissions are organized hierarchically and inherited from the core RBAC system while allowing module-specific customizations for sensitive operations.

```mermaid
flowchart TD
Roles[User Roles] --> |Determines| Permissions[Permission Matrix]
Permissions --> Books[Books Resource]
Permissions --> Loans[Loans Resource]
Permissions --> Fines[Fines Resource]
Permissions --> Settings[Settings Resource]
Books --> CRUD[CRUD Operations]
Loans --> CRUD
Fines --> CRUD
Settings --> CRUD
CRUD --> Enforcement[Permission Enforcement]
Enforcement --> UI[UI Components]
Enforcement --> DataHooks[Data Access Hooks]
Enforcement --> Routes[Route Guards]
```

**Diagram sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L1-L150)

## Role-Based Capabilities
The Library module supports four primary roles with distinct capabilities:

- **Administrator**: Full access to all library resources and settings
- **Librarian**: Comprehensive access to manage books, loans, and fines
- **Teacher**: Limited access to view books and manage student loans
- **Student**: Basic access to view personal loans and fines

```mermaid
classDiagram
class RoleCapabilities {
+string role
+boolean canCreateBooks
+boolean canReadBooks
+boolean canUpdateBooks
+boolean canDeleteBooks
+boolean canManageLoans
+boolean canProcessFines
+boolean canAccessSettings
}
RoleCapabilities : +Administrator()
RoleCapabilities : +Librarian()
RoleCapabilities : +Teacher()
RoleCapabilities : +Student()
class Administrator {
+canCreateBooks = true
+canReadBooks = true
+canUpdateBooks = true
+canDeleteBooks = true
+canManageLoans = true
+canProcessFines = true
+canAccessSettings = true
}
class Librarian {
+canCreateBooks = true
+canReadBooks = true
+canUpdateBooks = true
+canDeleteBooks = true
+canManageLoans = true
+canProcessFines = true
+canAccessSettings = false
}
class Teacher {
+canCreateBooks = false
+canReadBooks = true
+canUpdateBooks = false
+canDeleteBooks = false
+canManageLoans = true
+canProcessFines = false
+canAccessSettings = false
}
class Student {
+canCreateBooks = false
+canReadBooks = true
+canUpdateBooks = false
+canDeleteBooks = false
+canManageLoans = false
+canProcessFines = false
+canAccessSettings = false
}
RoleCapabilities <|-- Administrator
RoleCapabilities <|-- Librarian
RoleCapabilities <|-- Teacher
RoleCapabilities <|-- Student
```

**Diagram sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L1-L150)

**Section sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L1-L150)

## CRUD Permissions by Resource

### Books Resource Permissions
The books resource supports full CRUD operations with role-specific restrictions:

```mermaid
flowchart TD
Books[Books Resource] --> Create[Create]
Books --> Read[Read]
Books --> Update[Update]
Books --> Delete[Delete]
Create --> Admin[Administrator: Allowed]
Create --> Librarian[Librarian: Allowed]
Create --> Teacher[Teacher: Denied]
Create --> Student[Student: Denied]
Read --> Admin[Administrator: Allowed]
Read --> Librarian[Librarian: Allowed]
Read --> Teacher[Teacher: Allowed]
Read --> Student[Student: Allowed]
Update --> Admin[Administrator: Allowed]
Update --> Librarian[Librarian: Allowed]
Update --> Teacher[Teacher: Denied]
Update --> Student[Student: Denied]
Delete --> Admin[Administrator: Allowed]
Delete --> Librarian[Librarian: Conditional]
Delete --> Teacher[Teacher: Denied]
Delete --> Student[Student: Denied]
style Librarian fill:#f9f,stroke:#333
style Admin fill:#bbf,stroke:#333
```

**Diagram sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L20-L45)
- [useBookData.ts](file://src/modules/library/data/useBookData.ts#L15-L30)

### Loans Resource Permissions
The loans resource manages borrowing and return operations:

```mermaid
flowchart TD
Loans[Loans Resource] --> Create[Create Loan]
Loans --> Read[View Loans]
Loans --> Update[Return Book]
Loans --> Delete[Cancel Loan]
Create --> Admin[Administrator: Allowed]
Create --> Librarian[Librarian: Allowed]
Create --> Teacher[Teacher: Allowed]
Create --> Student[Student: Allowed]
Read --> Admin[Administrator: All Loans]
Read --> Librarian[Librarian: All Loans]
Read --> Teacher[Teacher: Class Loans]
Read --> Student[Student: Personal Loans]
Update --> Admin[Administrator: Allowed]
Update --> Librarian[Librarian: Allowed]
Update --> Teacher[Teacher: Allowed]
Update --> Student[Student: Denied]
Delete --> Admin[Administrator: Allowed]
Delete --> Librarian[Librarian: Allowed]
Delete --> Teacher[Teacher: Denied]
Delete --> Student[Student: Denied]
```

**Diagram sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L46-L70)
- [useLoanData.ts](file://src/modules/library/data/useLoanData.ts#L15-L30)

### Fines Resource Permissions
The fines resource handles penalty management:

```mermaid
flowchart TD
Fines[Fines Resource] --> Create[Assess Fine]
Fines --> Read[View Fines]
Fines --> Update[Process Payment]
Fines --> Delete[Waive Fine]
Create --> Admin[Administrator: Allowed]
Create --> Librarian[Librarian: Allowed]
Create --> Teacher[Teacher: Denied]
Create --> Student[Student: Denied]
Read --> Admin[Administrator: All Fines]
Read --> Librarian[Librarian: All Fines]
Read --> Teacher[Teacher: Class Fines]
Read --> Student[Student: Personal Fines]
Update --> Admin[Administrator: Allowed]
Update --> Librarian[Librarian: Allowed]
Update --> Teacher[Teacher: Denied]
Update --> Student[Student: Allowed]
Delete --> Admin[Administrator: Allowed]
Delete --> Librarian[Librarian: Conditional]
Delete --> Teacher[Teacher: Denied]
Delete --> Student[Student: Denied]
```

**Diagram sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L71-L95)
- [useFineData.ts](file://src/modules/library/data/useFineData.ts#L15-L30)

### Settings Resource Permissions
The settings resource controls library configuration:

```mermaid
flowchart TD
Settings[Settings Resource] --> Create[Add Setting]
Settings --> Read[View Settings]
Settings --> Update[Modify Setting]
Settings --> Delete[Remove Setting]
Create --> Admin[Administrator: Allowed]
Create --> Librarian[Librarian: Denied]
Create --> Teacher[Teacher: Denied]
Create --> Student[Student: Denied]
Read --> Admin[Administrator: Allowed]
Read --> Librarian[Librarian: Allowed]
Read --> Teacher[Teacher: Denied]
Read --> Student[Student: Denied]
Update --> Admin[Administrator: Allowed]
Update --> Librarian[Librarian: Denied]
Update --> Teacher[Teacher: Denied]
Update --> Student[Student: Denied]
Delete --> Admin[Administrator: Allowed]
Delete --> Librarian[Librarian: Denied]
Delete --> Teacher[Teacher: Denied]
Delete --> Student[Student: Denied]
```

**Diagram sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L96-L120)
- [useLibrarySettingsData.ts](file://src/modules/library/data/useLibrarySettingsData.ts#L15-L30)

## Permission Enforcement Mechanisms

### Data Access Hook Implementation
Data access hooks enforce permissions at the data layer by integrating with the RBAC service:

```mermaid
sequenceDiagram
participant Component as "UI Component"
participant Hook as "Data Access Hook"
participant RBAC as "RBAC Service"
participant Data as "Data Layer"
Component->>Hook : Request data operation
Hook->>RBAC : Check user permissions
RBAC-->>Hook : Permission status
alt Has permission
Hook->>Data : Execute operation
Data-->>Hook : Return result
Hook-->>Component : Return data
else Insufficient permission
Hook-->>Component : Reject with error
end
```

**Diagram sources**
- [useBookData.ts](file://src/modules/library/data/useBookData.ts#L15-L50)
- [useRBAC.ts](file://src/hooks/useRBAC.ts#L10-L40)

**Section sources**
- [useBookData.ts](file://src/modules/library/data/useBookData.ts#L1-L100)

### Permission Check in useBookData Hook
The `useBookData` hook implements permission checks for book operations:

```typescript
import { useRBAC } from '@/hooks/useRBAC';
import { useAppDataInternal } from './useAppData';

export function useBookData() {
  const { hasPermission, userRoles } = useRBAC();
  const { create, update, remove, query } = useAppDataInternal('books');
  
  const createBook = async (bookData) => {
    if (!hasPermission('library.books.create')) {
      throw new Error('Insufficient permissions to create books');
    }
    return await create(bookData);
  };
  
  const updateBook = async (id, updates) => {
    if (!hasPermission('library.books.update')) {
      throw new Error('Insufficient permissions to update books');
    }
    return await update(id, updates);
  };
  
  const deleteBook = async (id) => {
    if (!hasPermission('library.books.delete')) {
      throw new Error('Insufficient permissions to delete books');
    }
    
    // Additional policy check for book deletion
    const book = await query({ id });
    if (book.status === 'LOANED') {
      throw new Error('Cannot delete a book that is currently loaned');
    }
    
    return await remove(id);
  };
  
  const getBooks = async (filters) => {
    return await query(filters);
  };
  
  return {
    createBook,
    updateBook,
    deleteBook,
    getBooks,
    canCreate: hasPermission('library.books.create'),
    canUpdate: hasPermission('library.books.update'),
    canDelete: hasPermission('library.books.delete')
  };
}
```

**Section sources**
- [useBookData.ts](file://src/modules/library/data/useBookData.ts#L1-L100)

## Integration with Global RBAC Service

### RBAC Service Architecture
The Library module integrates with the global RBAC service through a standardized interface:

```mermaid
graph TB
subgraph "Library Module"
LB[Library Components]
DH[Data Hooks]
PG[Permission Guards]
end
subgraph "Core System"
RBAC[RBAC Service]
UC[User Context]
PC[Permission Cache]
end
LB --> |Check Permission| RBAC
DH --> |Check Permission| RBAC
PG --> |Check Permission| RBAC
RBAC --> |Get User Roles| UC
RBAC --> |Cache Results| PC
PC --> |Serve Cached| RBAC
```

**Diagram sources**
- [core/rbacService.ts](file://src/core/rbacService.ts#L1-L50)
- [useRBAC.ts](file://src/hooks/useRBAC.ts#L1-L30)

### useRBAC Hook Integration
The `useRBAC` hook provides a consistent interface for permission checks:

```typescript
import { useContext } from 'react';
import { UserContext } from '@/contexts/UserContext';
import { rbacService } from '@/core/rbacService';

export function useRBAC() {
  const { user } = useContext(UserContext);
  
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return rbacService.hasPermission(user, permission);
  };
  
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    return rbacService.hasAnyPermission(user, permissions);
  };
  
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    return rbacService.hasAllPermissions(user, permissions);
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userRoles: user?.roles || [],
    isSuperAdmin: user?.isSuperAdmin || false
  };
}
```

**Section sources**
- [useRBAC.ts](file://src/hooks/useRBAC.ts#L1-L50)

## Permission Inheritance and Custom Policies

### Core RBAC Inheritance
The Library module inherits permission definitions from the core RBAC system:

```mermaid
classDiagram
class CoreRBAC {
+hasPermission(user, permission)
+hasAnyPermission(user, permissions)
+hasAllPermissions(user, permissions)
+getRolePermissions(role)
+getUserPermissions(user)
}
class LibraryRBAC {
+hasPermission(user, permission)
+getRolePermissions(role)
}
CoreRBAC <|-- LibraryRBAC : "extends"
class PermissionPolicy {
+evaluate(context)
+getApplicableRoles()
+getRequiredPermissions()
}
class BookDeletionPolicy {
+evaluate(bookContext)
+requiresLibrarianApproval()
}
class FineWaiverPolicy {
+evaluate(fineContext)
+requiresAdministratorApproval()
}
PermissionPolicy <|-- BookDeletionPolicy
PermissionPolicy <|-- FineWaiverPolicy
```

**Diagram sources**
- [core/rbacService.ts](file://src/core/rbacService.ts#L1-L100)
- [rbac.ts](file://src/modules/library/rbac.ts#L1-L50)

### Custom Policies for Sensitive Operations
The Library module implements custom policies for sensitive operations:

#### Book Deletion Policy
```typescript
// Custom policy for book deletion
const bookDeletionPolicy = {
  check: (user, book) => {
    // Administrators can always delete books
    if (user.roles.includes('administrator')) {
      return true;
    }
    
    // Librarians can delete books only if not loaned
    if (user.roles.includes('librarian')) {
      return book.status !== 'LOANED';
    }
    
    // Teachers and students cannot delete books
    return false;
  },
  description: 'Books can only be deleted by administrators or librarians when not currently loaned'
};
```

#### Fine Waiver Policy
```typescript
// Custom policy for fine waiver
const fineWaiverPolicy = {
  check: (user, fine) => {
    // Only administrators can waive fines
    if (user.roles.includes('administrator')) {
      return true;
    }
    
    // Librarians can waive fines under $10
    if (user.roles.includes('librarian') && fine.amount < 10) {
      return true;
    }
    
    return false;
  },
  description: 'Fines can be waived by administrators or librarians for amounts under $10'
};
```

**Section sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L121-L150)

## UI Component Permission Checks

### Conditional Rendering Based on Permissions
UI components use permission checks to control visibility and interactivity:

```typescript
import { useRBAC } from '@/hooks/useRBAC';

function BookManagementToolbar() {
  const { hasPermission } = useRBAC();
  
  return (
    <div className="flex space-x-2">
      {hasPermission('library.books.create') && (
        <Button onClick={handleCreateBook}>
          Add Book
        </Button>
      )}
      
      {hasPermission('library.books.export') && (
        <Button variant="secondary" onClick={handleExportBooks}>
          Export List
        </Button>
      )}
      
      {hasPermission('library.settings.manage') && (
        <Button variant="ghost" onClick={handleOpenSettings}>
          <SettingsIcon />
        </Button>
      )}
    </div>
  );
}
```

**Section sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L1-L150)

### Permission-Based Component States
Components adapt their behavior based on user permissions:

```mermaid
stateDiagram-v2
[*] --> ViewOnly
ViewOnly --> Editable : hasPermission('library.books.update')
Editable --> Deletable : hasPermission('library.books.delete')
Deletable --> AdminOnly : hasPermission('library.settings.manage')
AdminOnly --> ViewOnly : Permission revoked
state ViewOnly {
[*] --> DisplayData
DisplayData --> RequestEdit : Edit requested
RequestEdit --> CheckPermission
}
state Editable {
[*] --> DisplayData
DisplayData --> EditMode : Edit button clicked
EditMode --> SaveChanges : Save
SaveChanges --> CheckPermission
}
state Deletable {
[*] --> DisplayData
DisplayData --> ConfirmDelete : Delete button clicked
ConfirmDelete --> CheckPolicy
}
```

**Diagram sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L1-L150)

## Route Guards and Access Control

### Route Protection Implementation
Route guards enforce permissions at the navigation level:

```typescript
import { useRBAC } from '@/hooks/useRBAC';
import { Navigate } from 'react-router-dom';

function ProtectedLibraryRoute({ children, permission }) {
  const { hasPermission } = useRBAC();
  
  if (!hasPermission(permission)) {
    return <Navigate to="/library/books" replace />;
  }
  
  return children;
}

// Usage in routing
<Route 
  path="/library/settings" 
  element={
    <ProtectedLibraryRoute permission="library.settings.manage">
      <LibrarySettingsPage />
    </ProtectedLibraryRoute>
  } 
/>
```

**Section sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L1-L150)

### Permission Checks in Navigation
The navigation system integrates permission checks to hide unauthorized routes:

```typescript
import { useRBAC } from '@/hooks/useRBAC';

const libraryNavigationConfig = [
  {
    id: 'books',
    title: 'Books',
    path: '/library/books',
    icon: 'BookIcon',
    visible: true
  },
  {
    id: 'loans',
    title: 'Loans',
    path: '/library/loans',
    icon: 'LoanIcon',
    visible: true
  },
  {
    id: 'fines',
    title: 'Fines',
    path: '/library/fines',
    icon: 'FineIcon',
    visible: (hasPermission) => hasPermission('library.fines.view')
  },
  {
    id: 'settings',
    title: 'Settings',
    path: '/library/settings',
    icon: 'SettingsIcon',
    visible: (hasPermission) => hasPermission('library.settings.manage')
  }
];

function filterNavigationItems(items, hasPermission) {
  return items.map(item => {
    if (typeof item.visible === 'function') {
      return { ...item, visible: item.visible(hasPermission) };
    }
    return item;
  }).filter(item => item.visible);
}
```

**Section sources**
- [rbac.ts](file://src/modules/library/rbac.ts#L1-L150)

## Administrator Configuration Guide

### Configuring Role Permissions
Administrators can configure role permissions through the Settings module:

```mermaid
sequenceDiagram
participant Admin as "Administrator"
participant UI as "Settings UI"
participant Service as "Module Config Service"
participant Registry as "Module Registry"
Admin->>UI : Navigate to Module Management
UI->>Service : Load module configurations
Service->>Registry : Get enabled modules
Registry-->>Service : Return module list
Service-->>UI : Return module configurations
UI-->>Admin : Display module management interface
Admin->>UI : Select Library module
UI->>UI : Display permission configuration
Admin->>UI : Modify role permissions
UI->>Service : Save permission changes
Service->>Registry : Update module configuration
Registry-->>Service : Confirmation
Service-->>UI : Success response
UI-->>Admin : Show success message
```

**Diagram sources**
- [ModuleManagementPage.tsx](file://src/modules/settings/pages/ModuleManagementPage.tsx#L1-L585)

### Module Management Interface
The Module Management page provides administrators with controls to manage role permissions:

```typescript
// ModuleManagementPage.tsx
const handleViewPermissions = (module: ModuleStatus) => {
  if (!canViewPermissions) {
    alert(t('common:errors.insufficientPermissions'));
    return;
  }
  
  setSelectedModule(module);
  setShowPermissionsModal(true);
};

// Permissions Modal
{showPermissionsModal && selectedModule && (
  <Modal
    isOpen={showPermissionsModal}
    onClose={() => setShowPermissionsModal(false)}
    title={t('moduleManagement.modulePermissions', { name: selectedModule.name })}
  >
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {t('moduleManagement.permissionsDescription')}
      </p>
      <div className="space-y-2">
        {selectedModule.requiredPermissions?.map(permission => (
          <div 
            key={permission}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
          >
            <span className="font-medium text-gray-900">{permission}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {t('moduleManagement.required')}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>
          {t('common:close')}
        </Button>
      </div>
    </div>
  </Modal>
)}
```

**Section sources**
- [ModuleManagementPage.tsx](file://src/modules/settings/pages/ModuleManagementPage.tsx#L1-L585)