/**
 * RBAC Types
 * 
 * Type definitions for Role-Based Access Control system.
 */

export type Permission = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'manage'
  | string;

export type Resource = 
  | 'students'
  | 'teachers'
  | 'classes'
  | 'subjects'
  | 'attendance'
  | 'exams'
  | 'grades'
  | 'fees'
  | 'reports'
  | 'settings'
  | 'users'
  | 'roles'
  | 'all'
  | string;

export interface PermissionRule {
  resource: Resource;
  permissions: Permission[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: PermissionRule[];
  inherits?: string[];  // Role IDs to inherit from
  isSystem?: boolean;   // Cannot be deleted
  metadata?: Record<string, any>;
}

export interface UserRole {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
}

export interface RBACUser {
  id: string;
  roles: string[];
  permissions?: PermissionRule[];  // Direct permissions
  attributes?: Record<string, any>; // For dynamic conditions
}

export interface AccessRequest {
  user: RBACUser;
  resource: Resource;
  permission: Permission;
  resourceData?: Record<string, any>; // Data being accessed
}

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  matchedRule?: PermissionRule;
}

export interface RBACConfig {
  superAdminRole?: string;
  defaultRole?: string;
  allowMultipleRoles?: boolean;
  enableAttributeBasedAccess?: boolean;
}

// Predefined roles
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  ACCOUNTANT: 'accountant',
  LIBRARIAN: 'librarian',
  RECEPTIONIST: 'receptionist',
} as const;

// Common permission sets
export const PERMISSION_SETS = {
  FULL_ACCESS: ['create', 'read', 'update', 'delete', 'export', 'import', 'manage'],
  READ_ONLY: ['read'],
  WRITE: ['create', 'read', 'update'],
  MANAGE: ['create', 'read', 'update', 'delete', 'manage'],
} as const;
