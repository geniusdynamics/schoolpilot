// ABOUTME: Role-Based Access Control (RBAC) Service
// ABOUTME: Provides granular permission management for the modular architecture

import { ModuleDefinition } from './types';
import type { SchoolDatabase } from '../services/rxdbService';
import type { RbacRole } from './types';
import { isDemo } from '../config/unifiedConfig';

// RBAC Types
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string; // e.g., 'administration.students', 'finance.payments'
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  moduleId: string;
  feature?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Permission IDs
  isActive: boolean;
  isSystem: boolean; // System roles cannot be deleted
  moduleAccess: {
    [moduleId: string]: {
      enabled: boolean;
      permissions: string[]; // Specific permissions for this module
    };
  };
}

export interface UserRole {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
}

export interface ModulePermission {
  moduleId: string;
  permissions: Permission[];
  navigationItems: string[]; // Navigation item IDs that are accessible
  features: string[]; // Features that are accessible
}

// System Roles
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMINISTRATOR: 'administrator',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  STAFF: 'staff',
  FINANCE_OFFICER: 'finance_officer',
  HR_OFFICER: 'hr_officer',
  LIBRARIAN: 'librarian',
  INVENTORY_MANAGER: 'inventory_manager',
  NUTRITION_OFFICER: 'nutrition_officer',
} as const;

// RBAC Service Class
export class RBACService {
  private roles: Map<string, RbacRole> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private userRoles: Map<string, UserRole[]> = new Map();
  private modules: Map<string, ModuleDefinition> = new Map();

  // RxDB collections
  private db: SchoolDatabase | null = null;

  public setDatabase(db: SchoolDatabase) {
    this.db = db;
  }

  // Load all RBAC data from RxDB
  public async loadFromDb() {
    if (!this.db) return;
    // Permissions
    const permissions = await this.db.permissions.find().exec();
    permissions.forEach(p => this.permissions.set(p.id, p));
    // Roles
    const roles = await this.db.rbac_roles.find().exec();
    roles.forEach(r => this.roles.set(r.id, r));
    // UserRoles
    const userRoles = await this.db.user_roles.find().exec();
    this.userRoles.clear();
    userRoles.forEach(ur => {
      if (!this.userRoles.has(ur.userId)) this.userRoles.set(ur.userId, []);
      this.userRoles.get(ur.userId)!.push(ur);
    });
  }

  // Add/update/delete Permission
  public async addPermission(permission: Permission) {
    if (!this.db) return;
    await this.db.permissions.insert(permission);
    this.permissions.set(permission.id, permission);
  }
  public async updatePermission(permission: Permission) {
    if (!this.db) return;
    const doc = await this.db.permissions.findOne({ selector: { id: permission.id } }).exec();
    if (doc) await doc.atomicPatch(permission);
    this.permissions.set(permission.id, permission);
  }
  public async deletePermission(id: string) {
    if (!this.db) return;
    const doc = await this.db.permissions.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
    this.permissions.delete(id);
  }

  // Add/update/delete Role
  public async addRole(role: RbacRole) {
    if (!this.db) return;
    await this.db.rbac_roles.insert(role);
    this.roles.set(role.id, role);
  }
  public async updateRoleDb(role: RbacRole) {
    if (!this.db) return;
    const doc = await this.db.rbac_roles.findOne({ selector: { id: role.id } }).exec();
    if (doc) await doc.atomicPatch(role);
    this.roles.set(role.id, role);
  }
  public async deleteRoleDb(id: string) {
    if (!this.db) return;
    const doc = await this.db.rbac_roles.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
    this.roles.delete(id);
  }

  // Add/remove UserRole
  public async assignRoleToUserDb(userRole: UserRole) {
    if (!this.db) return;
    await this.db.user_roles.insert(userRole);
    if (!this.userRoles.has(userRole.userId)) this.userRoles.set(userRole.userId, []);
    this.userRoles.get(userRole.userId)!.push(userRole);
  }
  public async removeRoleFromUserDb(userId: string, roleId: string) {
    if (!this.db) return;
    const doc = await this.db.user_roles.findOne({ selector: { userId, roleId } }).exec();
    if (doc) await doc.remove();
    const userRoles = this.userRoles.get(userId) || [];
    this.userRoles.set(userId, userRoles.filter(ur => ur.roleId !== roleId));
  }

  constructor() {
    // No default feature module permissions/roles
  }

  // Register a module with its permissions
  public registerModule(module: ModuleDefinition): void {
    this.modules.set(module.id, module);
    // Add module permissions if they exist
    if (module.rbacPermissions) {
      module.rbacPermissions.forEach(permission => {
        this.permissions.set(permission.id, permission);
      });
    }
    // Add default roles if they exist (optional, for future use)
  }

  // Check if user has permission
  public hasPermission(userId: string, permissionId: string): boolean {
    const userRoles = this.userRoles.get(userId) || [];
    
    for (const userRole of userRoles) {
      const role = this.roles.get(userRole.roleId);
      if (role && role.isActive && role.permissions.includes(permissionId)) {
        return true;
      }
    }
    
    return false;
  }

  // Check if user has access to module
  public hasModuleAccess(userId: string, moduleId: string): boolean {
    const userRoles = this.userRoles.get(userId) || [];
    
    for (const userRole of userRoles) {
      const role = this.roles.get(userRole.roleId);
      if (role && role.isActive && role.moduleAccess[moduleId]?.enabled) {
        return true;
      }
    }
    
    return false;
  }

  // Get user's accessible modules
  public getUserModules(userId: string): string[] {
    const accessibleModules: string[] = [];
    const userRoles = this.userRoles.get(userId) || [];
    
    for (const userRole of userRoles) {
      const role = this.roles.get(userRole.roleId);
      if (role && role.isActive) {
        Object.entries(role.moduleAccess).forEach(([moduleId, access]) => {
          if (access.enabled && !accessibleModules.includes(moduleId)) {
            accessibleModules.push(moduleId);
          }
        });
      }
    }
    
    return accessibleModules;
  }

  // Get user's permissions for a specific module
  public getUserModulePermissions(userId: string, moduleId: string): string[] {
    const permissions: string[] = [];
    const userRoles = this.userRoles.get(userId) || [];
    
    for (const userRole of userRoles) {
      const role = this.roles.get(userRole.roleId);
      if (role && role.isActive && role.moduleAccess[moduleId]?.enabled) {
        permissions.push(...role.moduleAccess[moduleId].permissions);
      }
    }
    
    return [...new Set(permissions)]; // Remove duplicates
  }

  // Assign role to user
  public assignRoleToUser(userId: string, roleId: string, assignedBy: string): boolean {
    const role = this.roles.get(roleId);
    if (!role || !role.isActive) {
      return false;
    }

    const userRoles = this.userRoles.get(userId) || [];
    const userRole: UserRole = {
      userId,
      roleId,
      assignedAt: new Date(),
      assignedBy,
    };

    userRoles.push(userRole);
    this.userRoles.set(userId, userRoles);
    
    return true;
  }

  // Remove role from user
  public removeRoleFromUser(userId: string, roleId: string): boolean {
    const userRoles = this.userRoles.get(userId) || [];
    const filteredRoles = userRoles.filter(ur => ur.roleId !== roleId);
    
    if (filteredRoles.length !== userRoles.length) {
      this.userRoles.set(userId, filteredRoles);
      return true;
    }
    
    return false;
  }

  // Get all roles
  public getAllRoles(): RbacRole[] {
    return Array.from(this.roles.values());
  }

  // Get all permissions
  public getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  // Get permissions for a specific module
  public getModulePermissions(moduleId: string): Permission[] {
    return Array.from(this.permissions.values()).filter(p => p.moduleId === moduleId);
  }

  // Create custom role
  public createRole(role: Omit<RbacRole, 'id'>): string {
    const roleId = `custom_${Date.now()}`;
    const newRole: RbacRole = {
      ...role,
      id: roleId,
      isSystem: false,
    };
    
    this.roles.set(roleId, newRole);
    return roleId;
  }

  // Update role
  public updateRole(roleId: string, updates: Partial<RbacRole>): boolean {
    const role = this.roles.get(roleId);
    if (!role) {
      return false;
    }

    // Prevent updating system roles
    if (role.isSystem && updates.isSystem === false) {
      return false;
    }

    const updatedRole = { ...role, ...updates };
    this.roles.set(roleId, updatedRole);
    return true;
  }

  // Delete role
  public deleteRole(roleId: string): boolean {
    const role = this.roles.get(roleId);
    if (!role || role.isSystem) {
      return false;
    }

    // Remove role from all users
    for (const [userId, userRoles] of this.userRoles.entries()) {
      const filteredRoles = userRoles.filter(ur => ur.roleId !== roleId);
      this.userRoles.set(userId, filteredRoles);
    }

    this.roles.delete(roleId);
    return true;
  }

  public initializeSuperAdminRole() {
    if (isDemo()) {
      const allPermissionIds = Array.from(this.permissions.keys());
      console.log('[RBAC DEBUG] All available permissions:', allPermissionIds);
      
      const superAdminRole: RbacRole = {
        id: SYSTEM_ROLES.SUPER_ADMIN,
        name: 'Super Administrator',
        description: 'Has all permissions in the system.',
        permissions: allPermissionIds,
        isActive: true,
        isSystem: true,
        moduleAccess: {},
      };

      // Grant access to all modules
      for (const moduleId of this.modules.keys()) {
        const modulePermissions = Array.from(this.permissions.values())
          .filter(p => p.moduleId === moduleId)
          .map(p => p.id);
        
        superAdminRole.moduleAccess[moduleId] = {
          enabled: true,
          permissions: modulePermissions,
        };
        
        console.log(`[RBAC DEBUG] Module ${moduleId} permissions:`, modulePermissions);
      }

      this.roles.set(SYSTEM_ROLES.SUPER_ADMIN, superAdminRole);
      console.log('[RBAC DEBUG] Initialized Super Admin role:', superAdminRole);
      console.log('[RBAC DEBUG] Super Admin module access:', superAdminRole.moduleAccess);
    }
  }

  // Filter navigation items based on user permissions
  public filterNavigationItems(userId: string, moduleId: string, navigationItems: any[]): any[] {
    const userPermissions = this.getUserModulePermissions(userId, moduleId);
    
    return navigationItems.filter(item => {
      // If no permissions required, allow access
      if (!item.permissions || item.permissions.length === 0) {
        return true;
      }
      
      // Check if user has any of the required permissions
      return item.permissions.some((permission: string) => 
        userPermissions.includes(permission)
      );
    });
  }

  // Get user's accessible features for a module
  public getUserModuleFeatures(userId: string, moduleId: string): string[] {
    const userPermissions = this.getUserModulePermissions(userId, moduleId);
    const module = this.modules.get(moduleId);
    
    if (!module || !module.features) {
      return [];
    }

    // Filter features based on permissions
    return module.features.filter(feature => {
      const featurePermissions = Array.from(this.permissions.values())
        .filter(p => p.moduleId === moduleId && p.feature === feature)
        .map(p => p.id);
      
      // If no specific permissions for feature, allow access
      if (featurePermissions.length === 0) {
        return true;
      }
      
      // Check if user has any permission for this feature
      return featurePermissions.some(permission => 
        userPermissions.includes(permission)
      );
    });
  }
}

// Export singleton instance
export const rbacService = new RBACService(); 