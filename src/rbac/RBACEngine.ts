/**
 * RBAC Engine
 * 
 * Core Role-Based Access Control engine with attribute-based conditions.
 */

import type {
  Role,
  RBACUser,
  PermissionRule,
  PermissionCondition,
  AccessRequest,
  AccessResult,
  Resource,
  Permission,
  RBACConfig,
} from './types';
import { SYSTEM_ROLES, PERMISSION_SETS } from './types';

export class RBACEngine {
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, Set<string>> = new Map();
  private config: RBACConfig;

  constructor(config: RBACConfig = {}) {
    this.config = {
      superAdminRole: SYSTEM_ROLES.SUPER_ADMIN,
      allowMultipleRoles: true,
      enableAttributeBasedAccess: true,
      ...config,
    };

    this.initializeDefaultRoles();
  }

  // ============================================================================
  // Role Management
  // ============================================================================

  /**
   * Register a role
   */
  registerRole(role: Role): void {
    // Expand inherited permissions
    const expandedRole = this.expandRole(role);
    this.roles.set(role.id, expandedRole);
  }

  /**
   * Get a role by ID
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get all roles
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Delete a role
   */
  deleteRole(roleId: string): boolean {
    const role = this.roles.get(roleId);
    if (role?.isSystem) {
      throw new Error(`Cannot delete system role: ${roleId}`);
    }
    return this.roles.delete(roleId);
  }

  /**
   * Update a role
   */
  updateRole(roleId: string, updates: Partial<Role>): Role {
    const existing = this.roles.get(roleId);
    if (!existing) {
      throw new Error(`Role not found: ${roleId}`);
    }

    const updated = { ...existing, ...updates, id: roleId };
    const expanded = this.expandRole(updated);
    this.roles.set(roleId, expanded);

    return expanded;
  }

  // ============================================================================
  // User Role Assignment
  // ============================================================================

  /**
   * Assign role to user
   */
  assignRole(userId: string, roleId: string): void {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role not found: ${roleId}`);
    }

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }

    const userRoleSet = this.userRoles.get(userId)!;
    
    if (!this.config.allowMultipleRoles && userRoleSet.size > 0) {
      // Remove existing roles if only one allowed
      userRoleSet.clear();
    }

    userRoleSet.add(roleId);
  }

  /**
   * Remove role from user
   */
  removeRole(userId: string, roleId: string): boolean {
    const userRoleSet = this.userRoles.get(userId);
    if (!userRoleSet) return false;

    return userRoleSet.delete(roleId);
  }

  /**
   * Get user's roles
   */
  getUserRoles(userId: string): string[] {
    return Array.from(this.userRoles.get(userId) || []);
  }

  /**
   * Get user's effective permissions
   */
  getUserPermissions(userId: string): PermissionRule[] {
    const roleIds = this.getUserRoles(userId);
    const permissions: PermissionRule[] = [];

    for (const roleId of roleIds) {
      const role = this.roles.get(roleId);
      if (role) {
        permissions.push(...role.permissions);
      }
    }

    return permissions;
  }

  // ============================================================================
  // Permission Checking
  // ============================================================================

  /**
   * Check if user has permission
   */
  checkAccess(request: AccessRequest): AccessResult {
    const { user, resource, permission, resourceData } = request;

    // Super admin has all permissions
    if (this.config.superAdminRole && user.roles.includes(this.config.superAdminRole)) {
      return { allowed: true, reason: 'Super admin access' };
    }

    // Get all applicable rules
    const rules = this.getApplicableRules(user, resource);

    // Check each rule
    for (const rule of rules) {
      if (rule.permissions.includes(permission) || rule.permissions.includes('manage')) {
        // Check conditions if present
        if (rule.conditions && resourceData) {
          if (this.evaluateConditions(rule.conditions, resourceData, user)) {
            return { allowed: true, matchedRule: rule };
          }
        } else {
          return { allowed: true, matchedRule: rule };
        }
      }
    }

    return { allowed: false, reason: 'Permission denied' };
  }

  /**
   * Check permission (simplified)
   */
  can(user: RBACUser, resource: Resource, permission: Permission): boolean {
    return this.checkAccess({ user, resource, permission }).allowed;
  }

  /**
   * Check if user can access any of the specified resources
   */
  canAny(user: RBACUser, resources: Resource[], permission: Permission): boolean {
    return resources.some(r => this.can(user, r, permission));
  }

  /**
   * Check if user can access all of the specified resources
   */
  canAll(user: RBACUser, resources: Resource[], permission: Permission): boolean {
    return resources.every(r => this.can(user, r, permission));
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private initializeDefaultRoles(): void {
    // Super Admin
    this.registerRole({
      id: SYSTEM_ROLES.SUPER_ADMIN,
      name: 'Super Administrator',
      description: 'Full system access',
      isSystem: true,
      permissions: [
        { resource: 'all', permissions: [...PERMISSION_SETS.FULL_ACCESS] },
      ],
    });

    // Admin
    this.registerRole({
      id: SYSTEM_ROLES.ADMIN,
      name: 'Administrator',
      description: 'Administrative access',
      isSystem: true,
      permissions: [
        { resource: 'students', permissions: [...PERMISSION_SETS.MANAGE] },
        { resource: 'teachers', permissions: [...PERMISSION_SETS.MANAGE] },
        { resource: 'classes', permissions: [...PERMISSION_SETS.MANAGE] },
        { resource: 'subjects', permissions: [...PERMISSION_SETS.MANAGE] },
        { resource: 'attendance', permissions: [...PERMISSION_SETS.MANAGE] },
        { resource: 'exams', permissions: [...PERMISSION_SETS.MANAGE] },
        { resource: 'grades', permissions: [...PERMISSION_SETS.MANAGE] },
        { resource: 'fees', permissions: [...PERMISSION_SETS.MANAGE] },
        { resource: 'reports', permissions: [...PERMISSION_SETS.FULL_ACCESS] },
        { resource: 'settings', permissions: [...PERMISSION_SETS.MANAGE] },
        { resource: 'users', permissions: ['read', 'create', 'update'] },
        { resource: 'roles', permissions: ['read'] },
      ],
    });

    // Teacher
    this.registerRole({
      id: SYSTEM_ROLES.TEACHER,
      name: 'Teacher',
      description: 'Teaching staff access',
      isSystem: true,
      permissions: [
        { resource: 'students', permissions: ['read'] },
        { resource: 'attendance', permissions: ['create', 'read', 'update'] },
        { resource: 'grades', permissions: ['create', 'read', 'update'] },
        { resource: 'exams', permissions: ['read'] },
        { resource: 'classes', permissions: ['read'] },
        { resource: 'subjects', permissions: ['read'] },
        { resource: 'reports', permissions: ['read', 'export'] },
      ],
    });

    // Student
    this.registerRole({
      id: SYSTEM_ROLES.STUDENT,
      name: 'Student',
      description: 'Student access',
      isSystem: true,
      permissions: [
        { 
          resource: 'students', 
          permissions: ['read'],
          conditions: [{ field: 'id', operator: 'eq', value: '{{user.id}}' }]
        },
        { 
          resource: 'grades', 
          permissions: ['read'],
          conditions: [{ field: 'studentId', operator: 'eq', value: '{{user.id}}' }]
        },
        { resource: 'attendance', permissions: ['read'] },
        { resource: 'classes', permissions: ['read'] },
        { resource: 'subjects', permissions: ['read'] },
        { resource: 'timetable', permissions: ['read'] },
      ],
    });

    // Accountant
    this.registerRole({
      id: SYSTEM_ROLES.ACCOUNTANT,
      name: 'Accountant',
      description: 'Financial access',
      isSystem: true,
      permissions: [
        { resource: 'students', permissions: ['read'] },
        { resource: 'fees', permissions: [...PERMISSION_SETS.MANAGE] },
        { resource: 'reports', permissions: ['read', 'export'] },
      ],
    });

    // Librarian
    this.registerRole({
      id: SYSTEM_ROLES.LIBRARIAN,
      name: 'Librarian',
      description: 'Library access',
      isSystem: true,
      permissions: [
        { resource: 'students', permissions: ['read'] },
        { resource: 'reports', permissions: ['read'] },
      ],
    });

    // Receptionist
    this.registerRole({
      id: SYSTEM_ROLES.RECEPTIONIST,
      name: 'Receptionist',
      description: 'Front desk access',
      isSystem: true,
      permissions: [
        { resource: 'students', permissions: ['read', 'create', 'update'] },
        { resource: 'attendance', permissions: ['read', 'create'] },
        { resource: 'classes', permissions: ['read'] },
      ],
    });
  }

  private expandRole(role: Role): Role {
    if (!role.inherits || role.inherits.length === 0) {
      return role;
    }

    const inheritedPermissions: PermissionRule[] = [];

    for (const parentId of role.inherits) {
      const parent = this.roles.get(parentId);
      if (parent) {
        inheritedPermissions.push(...parent.permissions);
      }
    }

    return {
      ...role,
      permissions: [...inheritedPermissions, ...role.permissions],
    };
  }

  private getApplicableRules(user: RBACUser, resource: Resource): PermissionRule[] {
    const rules: PermissionRule[] = [];

    // Add direct permissions
    if (user.permissions) {
      rules.push(...user.permissions.filter(r => 
        r.resource === resource || r.resource === 'all'
      ));
    }

    // Add role permissions
    for (const roleId of user.roles) {
      const role = this.roles.get(roleId);
      if (role) {
        rules.push(...role.permissions.filter(r => 
          r.resource === resource || r.resource === 'all'
        ));
      }
    }

    return rules;
  }

  private evaluateConditions(
    conditions: PermissionCondition[],
    resourceData: Record<string, any>,
    user: RBACUser
  ): boolean {
    return conditions.every(condition => {
      let value = resourceData[condition.field];
      let expectedValue = condition.value;

      // Handle template variables
      if (typeof expectedValue === 'string' && expectedValue.startsWith('{{')) {
        const varName = expectedValue.slice(2, -2).trim();
        if (varName.startsWith('user.')) {
          const userField = varName.slice(5);
          expectedValue = user.attributes?.[userField] || user[userField as keyof RBACUser];
        }
      }

      switch (condition.operator) {
        case 'eq':
          return value === expectedValue;
        case 'ne':
          return value !== expectedValue;
        case 'gt':
          return value > expectedValue;
        case 'gte':
          return value >= expectedValue;
        case 'lt':
          return value < expectedValue;
        case 'lte':
          return value <= expectedValue;
        case 'in':
          return Array.isArray(expectedValue) && expectedValue.includes(value);
        case 'contains':
          if (Array.isArray(value)) {
            return value.includes(expectedValue);
          }
          if (typeof value === 'string') {
            return value.includes(String(expectedValue));
          }
          return false;
        default:
          return false;
      }
    });
  }
}

// Singleton instance
let rbacInstance: RBACEngine | null = null;

export function initRBAC(config?: RBACConfig): RBACEngine {
  rbacInstance = new RBACEngine(config);
  return rbacInstance;
}

export function getRBAC(): RBACEngine {
  if (!rbacInstance) {
    rbacInstance = new RBACEngine();
  }
  return rbacInstance;
}

export default RBACEngine;
