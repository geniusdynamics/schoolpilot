// ABOUTME: Authentication service for user login, logout, and session management
// ABOUTME: Works seamlessly in both demo mode (mock data) and production mode (RxDB)

import { useAppData } from '../contexts/AppDataContext';
import * as rxdbService from './rxdbService';
import { userPermissionsService } from './userPermissionsService';
import { rbacService } from '../core/rbacService';
import { APP_MODE } from '../contexts/config';
import { users as adminMockUsers } from '../modules/administration/data/mockData';

// Authentication Types
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

// Service Result Types
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
}

class AuthService {
  private isDemoMode: boolean = true;
  private currentSession: AuthSession | null = null;
  private sessionKey = 'schoolpilot_auth_session';

  constructor() {
    // Check if RxDB is available to determine mode
    rxdbService.getDatabase()
      .then(() => { this.isDemoMode = false; })
      .catch(() => { this.isDemoMode = true; });
    
    // Restore session from localStorage
    this.restoreSession();
  }

  // ===== SESSION MANAGEMENT =====

  private saveSession(session: AuthSession): void {
    this.currentSession = session;
    localStorage.setItem(this.sessionKey, JSON.stringify({
      ...session,
      user: { ...session.user },
      expiresAt: session.expiresAt.toISOString()
    }));
  }

  private restoreSession(): AuthSession | null {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);
      const expiresAt = new Date(session.expiresAt);
      
      // Check if session is expired
      if (expiresAt < new Date()) {
        this.clearSession();
        return null;
      }

      this.currentSession = {
        ...session,
        expiresAt,
        user: { ...session.user }
      };
      
      return this.currentSession;
    } catch (error) {
      console.error('Error restoring session:', error);
      this.clearSession();
      return null;
    }
  }

  private clearSession(): void {
    this.currentSession = null;
    localStorage.removeItem(this.sessionKey);
  }

  public getCurrentSession(): AuthSession | null {
    if (!this.currentSession) {
      return this.restoreSession();
    }
    return this.currentSession;
  }

  public isAuthenticated(): boolean {
    const session = this.getCurrentSession();
    return session !== null && session.expiresAt > new Date();
  }

  // ===== AUTHENTICATION METHODS =====

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      if (this.isDemoMode) {
        return this.loginDemo(credentials);
      } else {
        return this.loginProduction(credentials);
      }
    } catch (error) {
      return {
        success: false,
        message: 'Login failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async logout(): Promise<ServiceResult<void>> {
    try {
      this.clearSession();
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Logout failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const session = this.getCurrentSession();
    return session?.user || null;
  }

  async refreshSession(): Promise<AuthResult> {
    const session = this.getCurrentSession();
    if (!session) {
      return {
        success: false,
        message: 'No active session to refresh'
      };
    }

    // Extend session by 24 hours
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const newSession: AuthSession = {
      ...session,
      expiresAt: newExpiresAt
    };

    this.saveSession(newSession);
    return {
      success: true,
      session: newSession,
      message: 'Session refreshed successfully'
    };
  }

  // ===== DEMO MODE AUTHENTICATION =====

  private async loginDemo(credentials: LoginCredentials): Promise<AuthResult> {
    // Demo users for testing different roles
    const demoUsers: { [key: string]: AuthUser } = {
      'admin': {
        id: 'USR_DEMO_ADMIN',
        username: 'admin',
        email: 'admin@school.com',
        fullName: 'System Administrator',
        role: 'super_admin',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: ['*'], // All permissions
        moduleAccess: ['dashboard', 'administration', 'academics', 'finance', 'hr', 'inventory', 'library', 'nutrition', 'reports', 'settings']
      },
      'teacher': {
        id: 'USR_DEMO_TEACHER',
        username: 'teacher',
        email: 'teacher@school.com',
        fullName: 'John Smith (Teacher)',
        role: 'teacher',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: [
          'dashboard.view',
          'academics.view', 'academics.read', 'academics.update',
          'settings.view', 'settings.workflows.view'
        ],
        moduleAccess: ['dashboard', 'academics', 'settings']
      },
      'finance': {
        id: 'USR_DEMO_FINANCE',
        username: 'finance',
        email: 'finance@school.com',
        fullName: 'Jane Doe (Finance)',
        role: 'finance_officer',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: [
          'dashboard.view',
          'finance.view', 'finance.read', 'finance.update',
          'settings.view', 'settings.workflows.view'
        ],
        moduleAccess: ['dashboard', 'finance', 'settings']
      },
      'student': {
        id: 'USR_DEMO_STUDENT',
        username: 'student',
        email: 'student@school.com',
        fullName: 'Alice Johnson (Student)',
        role: 'student',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: [
          'dashboard.view',
          'academics.view', 'academics.read'
        ],
        moduleAccess: ['dashboard', 'academics']
      }
    };

    // Add all adminMockUsers to demoUsers
    for (const user of adminMockUsers) {
      demoUsers[user.username] = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: String(user.display_name ?? user.username),
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: new Date(),
        createdAt: new Date(String(user.created_at ?? new Date().toISOString())),
        updatedAt: new Date(String(user.updated_at ?? new Date().toISOString())),
        permissions: ['*'],
        moduleAccess: ['dashboard', 'administration', 'academics', 'finance', 'hr', 'inventory', 'library', 'nutrition', 'reports', 'settings']
      };
    }

    const user = demoUsers[credentials.username];
    if (!user) {
      return {
        success: false,
        message: 'Invalid username or password'
      };
    }

    // In demo mode, accept any password
    if (credentials.password.length < 1) {
      return {
        success: false,
        message: 'Password is required'
      };
    }

    // Create session
    const session: AuthSession = {
      user,
      token: `demo_token_${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      isDemo: true
    };

    this.saveSession(session);

    // Assign role to RBAC service
    rbacService.assignRoleToUser(user.id, user.role, 'system');

    return {
      success: true,
      user,
      session,
      message: 'Login successful'
    };
  }

  // ===== PRODUCTION MODE AUTHENTICATION =====

  private async loginProduction(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const db = await rxdbService.getDatabase();
      
      // Find user by username
      const userDoc = await db.users.findOne({ selector: { username: credentials.username } }).exec();
      if (!userDoc) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      const user = userDoc.toJSON();
      
      // Check if user is active
      if (!user.is_active) {
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }

      // TODO: Add password hashing and verification
      // For now, accept any password in production mode
      if (credentials.password.length < 1) {
        return {
          success: false,
          message: 'Password is required'
        };
      }

      // Get user permissions
      const permissions = await userPermissionsService.getUserPermissions(user.id);
      
      // Get user roles and module access
      const userRoles = await db.user_roles.find({ selector: { userId: user.id } }).exec();
      const moduleAccess: string[] = [];
      
      for (const userRole of userRoles) {
        const roleDoc = await db.rbac_roles.findOne({ selector: { id: userRole.roleId } }).exec();
        if (roleDoc) {
          const role = roleDoc.toJSON();
          Object.keys(role.moduleAccess || {}).forEach(moduleId => {
            if (role.moduleAccess[moduleId].enabled && !moduleAccess.includes(moduleId)) {
              moduleAccess.push(moduleId);
            }
          });
        }
      }

      // Create AuthUser object
      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: userRoles[0]?.roleId || 'user',
        isActive: user.is_active,
        lastLoginAt: new Date(),
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
        permissions,
        moduleAccess
      };

      // Create session
      const session: AuthSession = {
        user: authUser,
        token: `prod_token_${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        isDemo: false
      };

      this.saveSession(session);

      // Update last login
      await userDoc.atomicPatch({ last_login_at: new Date().toISOString() });

      return {
        success: true,
        user: authUser,
        session,
        message: 'Login successful'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Login failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // ===== UTILITY METHODS =====

  async hasPermission(permissionId: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;

    // Super admin has all permissions
    if (user.role === 'super_admin' || user.permissions.includes('*')) {
      return true;
    }

    return user.permissions.includes(permissionId);
  }

  async hasModuleAccess(moduleId: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;

    // Super admin has access to all modules
    if (user.role === 'super_admin') {
      return true;
    }

    return user.moduleAccess.includes(moduleId);
  }

  async getUserRoles(): Promise<string[]> {
    const user = await this.getCurrentUser();
    if (!user) return [];

    return [user.role];
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export React hooks for easy use in components
export const useAuth = () => {
  const { isRxDBModeActive } = useAppData();
  
  return {
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    getCurrentUser: authService.getCurrentUser.bind(authService),
    refreshSession: authService.refreshSession.bind(authService),
    isAuthenticated: authService.isAuthenticated.bind(authService),
    hasPermission: authService.hasPermission.bind(authService),
    hasModuleAccess: authService.hasModuleAccess.bind(authService),
    getUserRoles: authService.getUserRoles.bind(authService),
    isDemoMode: !isRxDBModeActive
  };
}; 