# RBAC Implementation Guide

## Overview

This document explains how Role-Based Access Control (RBAC) is implemented in the SchoolPilot3 system using the new modular architecture. The RBAC system provides granular permission management that works seamlessly with the plugin-like module structure.

## Architecture Overview

### RBAC Integration with Modular Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RBAC Service Layer                       │
├─────────────────────────────────────────────────────────────┤
│  • Permission Management                                    │
│  • Role Management                                          │
│  • User-Role Assignment                                     │
│  • Module Access Control                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Module Definitions                          │
├─────────────────────────────────────────────────────────────┤
│  • Self-contained permissions                              │
│  • Module-specific features                                │
│  • Navigation item permissions                             │
│  • Default role assignments                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 React Components                           │
├─────────────────────────────────────────────────────────────┤
│  • useRBAC Hook                                            │
│  • Permission Gates                                        │
│  • Module Gates                                            │
│  • Feature Gates                                           │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. RBAC Service (`src/core/rbacService.ts`)

The central RBAC service that manages all permissions, roles, and access control logic.

#### Key Features:
- **Permission Management**: Granular permissions for each module and feature
- **Role Management**: System and custom roles with specific permissions
- **Module Access Control**: Module-level access control
- **Navigation Filtering**: Dynamic navigation based on permissions
- **Feature Access Control**: Feature-level permissions within modules

#### System Roles:
```typescript
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',        // Full system access
  ADMINISTRATOR: 'administrator',     // School administration
  TEACHER: 'teacher',                // Academic staff
  STUDENT: 'student',                // Students
  PARENT: 'parent',                  // Parents/Guardians
  STAFF: 'staff',                    // General staff
  FINANCE_OFFICER: 'finance_officer', // Finance management
  HR_OFFICER: 'hr_officer',          // HR management
  LIBRARIAN: 'librarian',            // Library management
  INVENTORY_MANAGER: 'inventory_manager', // Inventory management
  NUTRITION_OFFICER: 'nutrition_officer', // Nutrition management
};
```

### 2. RBAC Hook (`src/hooks/useRBAC.ts`)

React hook that provides RBAC functionality to components.

#### Usage Example:
```typescript
import { useRBAC } from '../hooks/useRBAC';

const MyComponent = () => {
  const { 
    hasPermission, 
    hasModuleAccess, 
    canCreate, 
    canRead,
    accessibleModules 
  } = useRBAC(userId, userType);

  // Check specific permission
  if (hasPermission('admin.students.create')) {
    // Show create student button
  }

  // Check module access
  if (hasModuleAccess('administration')) {
    // Show administration module
  }

  // Check resource permissions
  if (canCreate('administration.students')) {
    // Show create functionality
  }

  return (
    <div>
      {accessibleModules.map(moduleId => (
        <ModuleCard key={moduleId} moduleId={moduleId} />
      ))}
    </div>
  );
};
```

## Permission Structure

### Permission Format
```typescript
interface Permission {
  id: string;           // e.g., 'admin.students.create'
  name: string;         // e.g., 'Create Students'
  description: string;  // e.g., 'Create new students'
  resource: string;     // e.g., 'administration.students'
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  moduleId: string;     // e.g., 'administration'
  feature?: string;     // e.g., 'student-management'
}
```

### Module Permissions Example
```typescript
// Administration Module Permissions
administration: [
  { 
    id: 'admin.students.read', 
    name: 'View Students', 
    description: 'View student information', 
    resource: 'administration.students', 
    action: 'read', 
    moduleId: 'administration', 
    feature: 'student-management' 
  },
  { 
    id: 'admin.students.create', 
    name: 'Create Students', 
    description: 'Create new students', 
    resource: 'administration.students', 
    action: 'create', 
    moduleId: 'administration', 
    feature: 'student-management' 
  },
  // ... more permissions
]
```

## Module Integration

### 1. Module Definition with RBAC

Each module can define its own permissions in its `moduleDefinition.tsx`:

```typescript
export const administrationModule: ModuleDefinition = {
  id: 'administration',
  name: 'navigation:administration.title',
  description: 'navigation:administration.description',
  icon: <AcademicCapIcon />,
  path: '/administration',
  isActive: true,
  version: '1.0.0',
  navigation: [
    // Navigation items with permissions
    { 
      name: 'navigation:administration.students', 
      path: '/administration/students', 
      icon: <UsersIcon />,
      permissions: ['admin.students.read'] // Required permissions
    },
  ],
  features: ['student-management', 'staff-management'],
  // RBAC-specific properties
  rbacPermissions: [
    // Module-specific permissions
    { 
      id: 'admin.students.read', 
      name: 'View Students', 
      description: 'View student information', 
      resource: 'administration.students', 
      action: 'read', 
      moduleId: 'administration', 
      feature: 'student-management' 
    },
  ],
  defaultRoles: ['administrator', 'super_admin'], // Roles with default access
  requiresAuthentication: true,
  publicAccess: false,
};
```

### 2. Navigation Filtering

The RBAC system automatically filters navigation items based on user permissions:

```typescript
// In a component
const { filterNavigationItems } = useRBAC(userId, userType);

const filteredNavigation = filterNavigationItems(
  'administration', 
  module.navigation
);
```

### 3. Feature Access Control

Modules can control access to specific features:

```typescript
const { hasFeatureAccess } = useRBAC(userId, userType);

if (hasFeatureAccess('administration', 'student-management')) {
  // Show student management features
}
```

## Usage Patterns

### 1. Permission Gates

Use permission gates for conditional rendering:

```typescript
import { usePermissionGate } from '../hooks/useRBAC';

const StudentList = () => {
  const canCreateStudents = usePermissionGate('admin.students.create', userId, userType);
  const canDeleteStudents = usePermissionGate('admin.students.delete', userId, userType);

  return (
    <div>
      <h1>Students</h1>
      {canCreateStudents && (
        <button onClick={createStudent}>Add Student</button>
      )}
      {students.map(student => (
        <StudentCard 
          key={student.id} 
          student={student}
          showDeleteButton={canDeleteStudents}
        />
      ))}
    </div>
  );
};
```

### 2. Module Gates

Control access to entire modules:

```typescript
import { useModuleGate } from '../hooks/useRBAC';

const ModuleSelector = () => {
  const hasAdminAccess = useModuleGate('administration', userId, userType);
  const hasFinanceAccess = useModuleGate('finance', userId, userType);

  return (
    <div>
      {hasAdminAccess && <AdminModuleCard />}
      {hasFinanceAccess && <FinanceModuleCard />}
    </div>
  );
};
```

### 3. Resource-Based Permissions

Check permissions for specific resources:

```typescript
const { canCreate, canRead, canUpdate, canDelete } = useRBAC(userId, userType);

// Check if user can create students
if (canCreate('administration.students')) {
  // Show create form
}

// Check if user can read student records
if (canRead('administration.students')) {
  // Show student list
}

// Check if user can update student information
if (canUpdate('administration.students')) {
  // Show edit buttons
}

// Check if user can delete students
if (canDelete('administration.students')) {
  // Show delete buttons
}
```

## Role Management

### 1. System Roles

System roles are predefined and cannot be deleted:

- **Super Admin**: Full system access
- **Administrator**: School administration and academics
- **Teacher**: Academic responsibilities
- **Student**: Limited access to academics and library
- **Finance Officer**: Finance module access
- **HR Officer**: HR module access
- **Librarian**: Library module access
- **Inventory Manager**: Inventory module access
- **Nutrition Officer**: Nutrition module access

### 2. Custom Roles

Custom roles can be created with specific permissions:

```typescript
// Create a custom role
const customRoleId = rbacService.createRole({
  name: 'Department Head',
  description: 'Department head with limited admin access',
  permissions: [
    'admin.students.read',
    'admin.staff.read',
    'academics.subjects.read',
    'academics.exams.read',
  ],
  isActive: true,
  moduleAccess: {
    administration: { enabled: true, permissions: ['admin.students.read', 'admin.staff.read'] },
    academics: { enabled: true, permissions: ['academics.subjects.read', 'academics.exams.read'] },
    finance: { enabled: false, permissions: [] },
    // ... other modules
  },
});
```

### 3. Role Assignment

Assign roles to users:

```typescript
// Assign role to user
rbacService.assignRoleToUser(userId, roleId, assignedBy);

// Remove role from user
rbacService.removeRoleFromUser(userId, roleId);
```

## Security Features

### 1. Permission Inheritance

Roles can inherit permissions from other roles:

```typescript
const isAdministrator = userRoles.includes('administrator') || isSuperAdmin;
const isTeacher = userRoles.includes('teacher') || isAdministrator;
```

### 2. Module-Level Security

Each module can define its own security requirements:

```typescript
{
  requiresAuthentication: true,  // Requires user to be logged in
  publicAccess: false,           // Not accessible to public
  defaultRoles: ['administrator'], // Default roles with access
}
```

### 3. Feature-Level Security

Features within modules can have their own permissions:

```typescript
// Check feature access
if (hasFeatureAccess('administration', 'student-management')) {
  // Show student management features
}
```

## Best Practices

### 1. Permission Naming Convention

Use consistent naming for permissions:

```
[module].[resource].[action]
```

Examples:
- `admin.students.create`
- `finance.payments.read`
- `academics.exams.update`
- `library.books.delete`

### 2. Module Permission Organization

Organize permissions by module and feature:

```typescript
const MODULE_PERMISSIONS = {
  administration: [
    // Student management permissions
    { id: 'admin.students.read', feature: 'student-management' },
    { id: 'admin.students.create', feature: 'student-management' },
    // Staff management permissions
    { id: 'admin.staff.read', feature: 'staff-management' },
    { id: 'admin.staff.create', feature: 'staff-management' },
  ],
  // ... other modules
};
```

### 3. Role Design

Design roles with the principle of least privilege:

- Start with minimal permissions
- Add permissions as needed
- Use role inheritance for common permissions
- Create specific roles for specific use cases

### 4. Component Security

Always check permissions in components:

```typescript
// Good: Check permissions before rendering
const MyComponent = () => {
  const { hasPermission } = useRBAC(userId, userType);
  
  if (!hasPermission('admin.students.read')) {
    return <AccessDenied />;
  }
  
  return <StudentList />;
};

// Better: Use permission gates
const MyComponent = () => {
  const canReadStudents = usePermissionGate('admin.students.read', userId, userType);
  
  if (!canReadStudents) {
    return <AccessDenied />;
  }
  
  return <StudentList />;
};
```

## Testing RBAC

### 1. Unit Testing

Test RBAC functionality:

```typescript
describe('RBAC Service', () => {
  it('should check user permissions correctly', () => {
    const rbac = new RBACService();
    rbac.assignRoleToUser('user1', 'administrator', 'system');
    
    expect(rbac.hasPermission('user1', 'admin.students.read')).toBe(true);
    expect(rbac.hasPermission('user1', 'finance.payments.create')).toBe(false);
  });
});
```

### 2. Integration Testing

Test RBAC with components:

```typescript
describe('RBAC Hook', () => {
  it('should provide correct permissions', () => {
    const { result } = renderHook(() => useRBAC('user1', 'Staff'));
    
    expect(result.current.hasModuleAccess('administration')).toBe(false);
    expect(result.current.hasModuleAccess('academics')).toBe(true);
  });
});
```

## Conclusion

The RBAC implementation provides a robust, scalable, and secure access control system that integrates seamlessly with the modular architecture. Key benefits include:

- **Granular Permissions**: Fine-grained control over every action
- **Module Integration**: Each module defines its own permissions
- **Dynamic Navigation**: Navigation adapts based on user permissions
- **Scalable Design**: Easy to add new roles and permissions
- **Security**: Comprehensive security at module and feature levels
- **Developer-Friendly**: Simple hooks and utilities for components

This implementation ensures that the SchoolPilot3 system can handle complex permission requirements while maintaining the flexibility and modularity of the architecture.