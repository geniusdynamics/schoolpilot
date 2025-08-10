// ABOUTME: Authentication service for user login, logout, and session management
// ABOUTME: Works seamlessly in both demo mode (mock data) and production mode (RxDB)

import * as rxdbService from './databaseService';
import { userPermissionsService } from './userPermissionsService';
import { rbacService } from '../core/rbacService';
import { unifiedConfigManager } from '../config/unifiedConfig';
import { reportError } from '../config/errorTracking';

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
  private rxDBAvailable: boolean = false;
  private initializationComplete: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Start initialization immediately but don't wait
    this.initializationPromise = this.initialize();
  }

  private async initialize() {
    console.log('🔐 [AuthService] initialize() called');
    try {
      // Check RxDB availability using the new service methods
      const hasIndexedDB = typeof window !== 'undefined' && window.indexedDB;
      console.log('🔐 [AuthService] IndexedDB available?', hasIndexedDB);
      
      if (!hasIndexedDB) {
        console.warn('🔐 [AuthService] IndexedDB not available, forcing demo mode');
        this.isDemoMode = true;
        this.rxDBAvailable = false;
        this.initializationComplete = true;
        this.restoreSession();
        return;
      }

      // Try to access RxDB with timeout
      try {
        const dbPromise = rxdbService.getDatabase();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('RxDB initialization timeout')), 5000)
        );
        
        await Promise.race([dbPromise, timeoutPromise]);
        this.rxDBAvailable = rxdbService.isDatabaseAvailable?.() || true;
        console.log('RxDB is available:', this.rxDBAvailable);
      } catch (error) {
        console.warn('RxDB initialization failed, forcing demo mode:', error);
        this.rxDBAvailable = false;
      }

      // Use unified configuration to determine mode
      const config = unifiedConfigManager.getConfig();
      
      // Force demo mode if RxDB is not available
      if (!this.rxDBAvailable) {
        console.warn('RxDB not available, forcing demo mode');
        this.isDemoMode = true;
        unifiedConfigManager.switchToDemo();
      } else {
        this.isDemoMode = config.mode === 'demo';
      }
      
      this.initializationComplete = true;
      console.log(`AuthService initialized: Demo mode = ${this.isDemoMode}, RxDB available = ${this.rxDBAvailable}`);
      
      // Restore session from localStorage
      this.restoreSession();
      
    } catch (error) {
      console.error('AuthService initialization failed:', error);
      // Force demo mode on any initialization error
      this.isDemoMode = true;
      this.initializationComplete = true;
      this.restoreSession();
    }
  }

  private async checkRxDBAvailability(): Promise<boolean> {
    try {
      // Check if RxDB modules can be loaded
      await import('../services/databaseService');
      
      // Check if IndexedDB is available
      if (typeof window !== 'undefined' && window.indexedDB) {
        const test = indexedDB.open('_rxdb_test');
        await new Promise((resolve, reject) => {
          test.onerror = () => reject(new Error('IndexedDB not available'));
          test.onsuccess = () => {
            indexedDB.deleteDatabase('_rxdb_test');
            resolve(true);
          };
        });
        this.rxDBAvailable = true;
        return true;
      }
      
      this.rxDBAvailable = false;
      return false;
    } catch (error) {
      console.warn('RxDB availability check failed:', error);
      this.rxDBAvailable = false;
      return false;
    }
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
    if (!this.initializationComplete) {
      console.warn('AuthService not fully initialized');
      return null;
    }
    
    if (!this.currentSession) {
      return this.restoreSession();
    }
    return this.currentSession;
  }

  public async isAuthenticated(): Promise<boolean> {
    // Wait for initialization if needed
    if (!this.initializationComplete && this.initializationPromise) {
      await this.initializationPromise;
    }
    
    const session = this.getCurrentSession();
    return session !== null && session.expiresAt > new Date();
  }

  public isInitialized(): boolean {
    return this.initializationComplete;
  }

  // ===== AUTHENTICATION METHODS =====

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Wait for initialization if not complete
      if (!this.initializationComplete && this.initializationPromise) {
        await this.initializationPromise;
      }

      if (this.isDemoMode) {
        return this.loginDemo(credentials);
      } else {
        return this.loginProduction(credentials);
      }
    } catch (error) {
      console.error('AuthService login error:', error);
      
      // Report login error to Bugsink
      reportError(error instanceof Error ? error : new Error('Unknown login error'), {
        username: credentials.username,
        loginType: this.isDemoMode ? 'demo' : 'production',
        errorContext: 'authentication_failure',
        timestamp: new Date().toISOString()
      });
      
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

    const user = demoUsers[credentials.username];
    
    if (!user) {
      // Report demo login failure to Bugsink
      const loginError = new Error('Demo login failed: Invalid username');
      reportError(loginError, {
        username: credentials.username,
        loginType: 'demo',
        errorContext: 'invalid_username',
        availableUsers: Object.keys(demoUsers),
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        message: 'Invalid username or password'
      };
    }

    // In demo mode, accept any password
    if (credentials.password.length < 1) {
      // Report demo login failure to Bugsink
      const loginError = new Error('Demo login failed: Password required');
      reportError(loginError, {
        username: credentials.username,
        loginType: 'demo',
        errorContext: 'empty_password',
        timestamp: new Date().toISOString()
      });
      
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
    if (!this.rxDBAvailable) {
      return {
        success: false,
        message: 'Database not available. Please contact system administrator.',
        errors: ['Database initialization failed']
      };
    }

    try {
      const db = await rxdbService.getDatabase();
      
      // Find user by username
      const userDoc = await db.users.findOne({ selector: { username: credentials.username } }).exec();
      if (!userDoc) {
        // Report production login failure to Bugsink
        const loginError = new Error('Production login failed: User not found');
        reportError(loginError, {
          username: credentials.username,
          loginType: 'production',
          errorContext: 'user_not_found',
          timestamp: new Date().toISOString()
        });
        
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      const user = userDoc.toJSON();
      
      // Check if user is active
      if (!user.is_active) {
        // Report production login failure to Bugsink
        const loginError = new Error('Production login failed: Account deactivated');
        reportError(loginError, {
          username: credentials.username,
          userId: user.id,
          loginType: 'production',
          errorContext: 'account_deactivated',
          timestamp: new Date().toISOString()
        });
        
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }

      // TODO: Add password hashing and verification
      // For now, accept any password in production mode
      if (credentials.password.length < 1) {
        // Report production login failure to Bugsink
        const loginError = new Error('Production login failed: Password required');
        reportError(loginError, {
          username: credentials.username,
          userId: user.id,
          loginType: 'production',
          errorContext: 'empty_password',
          timestamp: new Date().toISOString()
        });
        
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
      // Report production login error to Bugsink
      reportError(error instanceof Error ? error : new Error('Unknown production login error'), {
        username: credentials.username,
        loginType: 'production',
        errorContext: 'database_error',
        timestamp: new Date().toISOString()
      });
      
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

// Note: useAuth hook is exported from AuthContext.tsx to avoid circular dependencies
// Import { useAuth } from '@/contexts/AuthContext' instead
