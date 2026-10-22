// src/core/types/common.ts
// ABOUTME: Shared interfaces and types used across all modules in the SchoolPilot system.

import React from 'react';
import type { AuditAction } from './enums';

// --- Chart Data Types ---
export interface ChartData {
  name: string;
  value: number;
}

export interface BarChartData {
  name: string;
  uv?: number;
  pv?: number;
  [key: string]: any;
}

// --- Core Shared Interfaces ---

export interface SchoolDetails {
  id: number;
  name: string;
  telephone?: string | null;
  email?: string | null;
  postal_address?: string | null;
  town?: string | null;
  motto?: string | null;
  logo_path?: string | null;
  created_at: string;
  updated_at: string;
  school_gender?: string | null;
  school_type?: string | null;
  head_teacher_name?: string | null;
  school_code?: string | null;
  // Additional properties for settings pages
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  principal?: string | null;
}

export interface User {
  id: string;
  username: string;
  hashed_password?: string | null;
  password?: string | null; // For creation/update, not stored
  email: string;
  role_id?: number | null;
  // Denormalized
  role?: string | null;
  display_name?: string | null;
  userType: string; // Broad user category (e.g., Staff, Student, Parent, Supplier, etc.)
  isActive: boolean; // Whether the user is active
}

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
    id: string;
    user_id?: string | null;
    action: AuditAction;
    table_name?: string | null;
    record_pk?: string | null;
    old_data?: Record<string, any> | null;
    new_data?: Record<string, any> | null;
    changed_at: string;
    ip_address?: string | null;
    user_agent?: string | null;
    // Denormalized
    user_name?: string | null;
}

/**
 * One allowed move of a workflow: from a set of states to a state, for a set of roles.
 *
 * This is the row form of the engine's `WorkflowTransitionDefinition`; the engine's catalogue holds
 * the same shape in code. It exists so a workflow a school keeps in the settings collections can
 * carry its moves as well as its states.
 */
export interface WorkflowTransition {
    id: number;
    workflow_id: number;
    /** The action name, e.g. `approve`. */
    name: string;
    /** The state the move leaves; 0 means any state. */
    from_state_id: number;
    /** The state the move enters. */
    to_state_id: number;
    /** The roles one of which may make the move, when it is role-guarded. */
    allowed_roles?: string[];
    /** True when the move is an exception and needs a reason. */
    requires_reason?: boolean;
}

export interface WorkflowState {
    id: number;
    workflow_id: number;
    name: string;
    sequence_order: number;
    /** The stable key the engine stores on a record; the name when absent. */
    key?: string;
    /** The state a record with no stored state is in. */
    is_initial?: boolean;
    /** A state a record does not leave by the ordinary path. */
    is_terminal?: boolean;
    /** True when changing the record in this state is an override and needs a reason. */
    requires_reason_on_leave?: boolean;
}

export interface Workflow {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    states?: WorkflowState[];
    /** The stable key the engine names the workflow by, e.g. `academics.marks_lifecycle`. */
    key?: string;
    description?: string;
    /** A system workflow cannot be deleted or disabled, and may only be added to. */
    is_system?: boolean;
    /** False when the workflow is switched off; absent means enabled. */
    is_active?: boolean;
    /** The moves, for a workflow that names them; absent for a plain ordered state list. */
    transitions?: WorkflowTransition[];
}

// Navigation and Module Types
export interface NavItem {
  name: string; // Translation key
  path: string;
  icon?: React.ComponentType<any>;
  isGroup?: boolean;
  modulePath?: string;
  children?: NavItem[];
  permissions?: string[]; // Optional permissions required
  isActive?: boolean; // Whether this module/feature is active
  page?: string; // Optional explicit page component name for dynamic import
  deprecated?: boolean; // Mark item as deprecated; UI should hide or redirect
  redirectTo?: string; // Destination for deprecated routes
  showInModes?: ('standard' | 'fullwidth')[]; // Which layout modes show this item
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string; // Country code for flag emoji or flag icon
  isRTL?: boolean;
}

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

// Enhanced ModuleDependency structure for versioned dependencies
export interface ModuleDependency {
  moduleId: string;
  version: string; // Semver range (e.g., "^1.2.0", "~1.2.3")
  required: boolean;
  optional?: boolean;
}

// Enhanced ModuleDefinition with RBAC and versioned dependency support
export interface ModuleDefinition {
  id: string;
  name: string; // Translation key for module name
  description?: string; // Translation key for module description
  icon: React.ComponentType<any>;
  path: string; // Base path for the module
  isActive: boolean; // Whether the module is enabled
  version: string;
  dependencies?: ModuleDependency[]; // Required and optional dependencies with version constraints
  optionalDependencies?: ModuleDependency[]; // Optional dependencies with version constraints
  permissions?: string[]; // Permissions required to access this module
  navigation: NavItem[]; // Navigation items for this module
  features?: string[]; // List of features this module provides
  routes?: Array<{ path: string; page: string }>; // Custom/dynamic routes for this module
  settings?: {
    category: string; // Settings category
    items: Array<{
      key: string;
      type: 'boolean' | 'string' | 'number' | 'select';
      defaultValue: any;
      options?: Array<{ value: any; label: string }>;
    }>;
  };
  // RBAC-specific properties
  rbacPermissions?: Permission[];
  defaultRoles?: string[]; // Roles that have access by default
  requiresAuthentication?: boolean;
  publicAccess?: boolean; // Whether module can be accessed without authentication
}

// RBAC Role for the new permission system
export interface RbacRole {
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
