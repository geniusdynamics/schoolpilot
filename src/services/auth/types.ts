/**
 * Auth Service Types
 *
 * Type definitions and interfaces for authentication services.
 * Enables dependency injection and testability.
 */

// ============================================================================
// Core Auth Types
// ============================================================================

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  permissions: string[];
  moduleAccess: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: Date;
  isDemo: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  message: string;
  errors?: string[];
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
}

// ============================================================================
// Permission Types
// ============================================================================

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage' | '*';
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  moduleAccess: Record<string, { enabled: boolean; permissions: string[] }>;
  isSystem: boolean;
}

export interface UserRole {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Authentication Service Interface
 *
 * Provides user authentication, session management, and authorization checks.
 */
export interface IAuthService {
  /**
   * Authenticate user with credentials
   */
  login(credentials: LoginCredentials): Promise<AuthResult>;

  /**
   * Logout current user and clear session
   */
  logout(): Promise<ServiceResult<void>>;

  /**
   * Get currently authenticated user
   */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * Refresh the current session extending its expiry
   */
  refreshSession(): Promise<AuthResult>;

  /**
   * Check if user has a specific permission
   */
  hasPermission(permissionId: string): Promise<boolean>;

  /**
   * Check if user has access to a module
   */
  hasModuleAccess(moduleId: string): Promise<boolean>;

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Get the current session
   */
  getCurrentSession(): AuthSession | null;

  /**
   * Check if auth service is initialized
   */
  isInitialized(): boolean;

  /**
   * Get user roles
   */
  getUserRoles(): Promise<string[]>;
}

/**
 * User Permissions Service Interface
 *
 * Manages user permissions, roles, and access control.
 */
export interface IUserPermissionsService {
  /**
   * Get all permissions for a user
   */
  getUserPermissions(userId: string): Promise<string[]>;

  /**
   * Check if user has a specific permission
   */
  hasPermission(userId: string, permissionId: string): Promise<boolean>;

  /**
   * Get role permissions
   */
  getRolePermissions(roleId: string): Promise<string[]>;

  /**
   * Get user roles
   */
  getUserRoles(userId: string): Promise<Role[]>;

  /**
   * Assign role to user
   */
  assignRole(userId: string, roleId: string, assignedBy: string): Promise<ServiceResult<void>>;

  /**
   * Remove role from user
   */
  removeRole(userId: string, roleId: string): Promise<ServiceResult<void>>;

  /**
   * Get all available permissions
   */
  getAllPermissions(): Promise<Permission[]>;

  /**
   * Get all roles
   */
  getAllRoles(): Promise<Role[]>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AuthConfig {
  sessionDuration: number; // in milliseconds
  enableDemoMode: boolean;
  enablePasswordHashing: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number; // in milliseconds
  requireEmailVerification: boolean;
  passwordPolicy: PasswordPolicy;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export type AuthEventType =
  | 'login'
  | 'logout'
  | 'session_expired'
  | 'session_refreshed'
  | 'permission_denied'
  | 'role_changed';

export interface AuthEvent {
  type: AuthEventType;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type AuthEventListener = (event: AuthEvent) => void;
