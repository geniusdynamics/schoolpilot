// ABOUTME: Authentication service for user login, logout, and session management
// ABOUTME: Works seamlessly in both demo mode (mock data) and production mode (RxDB/PouchDB)

import { databaseService } from './database/databaseService';
import * as rxdbService from './rxdbService';
import { userPermissionsService } from './userPermissionsService';
import { rbacService } from '../core/rbacService';
import { unifiedConfigManager } from '../config/unifiedConfig';
import { reportError } from '../config/errorTracking';
import { hashPassword, verifyPassword, generateSecureToken, checkPasswordComplexity } from '../utils/passwordHash';

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
  private detectedProvider: 'pouchdb' | 'rxdb' | 'unknown' = 'unknown';

  constructor() {
    // Start initialization immediately but don't wait
    this.initializationPromise = this.initialize();
  }

  private async initialize() {
    console.log('🔐 [AuthService] initialize() called');
    try {
      // Check if IndexedDB is available
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

      // Try to initialize the dynamic database service
      try {
        await databaseService.initialize({
          name: 'schoolpilot_db',
          multiInstance: true,
          ignoreDuplicate: true
        });
        
        this.rxDBAvailable = databaseService.isServiceInitialized();
        this.detectedProvider = databaseService.getDetectedProviderType() || 'unknown';
        
        console.log(`Database service initialized: Provider = ${this.detectedProvider}, Available = ${this.rxDBAvailable}`);
      } catch (error) {
        console.warn('Database service initialization failed, forcing demo mode:', error);
        this.rxDBAvailable = false;
        this.detectedProvider = 'unknown';
      }

      // Use unified configuration to determine mode
      const config = unifiedConfigManager.getConfig();
      
      // Force demo mode if database is not available
      if (!this.rxDBAvailable) {
        console.warn('Database not available, forcing demo mode');
        this.isDemoMode = true;
        unifiedConfigManager.switchToDemo();
      } else {
        this.isDemoMode = config.mode === 'demo';
      }
      
      this.initializationComplete = true;
      console.log(`AuthService initialized: Demo mode = ${this.isDemoMode}, DB available = ${this.rxDBAvailable}, Provider = ${this.detectedProvider}`);
      
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

  // ===== DATABASE PROVIDER DETECTION (Legacy - now handled by dynamic service) =====
  // Note: These methods are kept for backward compatibility but are no longer used

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
    // SECURITY WARNING: Demo mode accepts any password and should only be used for testing
    console.warn('🔐 [AuthService] DEMO MODE LOGIN - This is insecure and should only be used for testing');
    
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

    // Create session with secure token (even for demo mode)
    const session: AuthSession = {
      user,
      token: `demo_${generateSecureToken(32)}`, // Secure token with demo prefix
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
      // Get database provider from the dynamic service
      const provider = databaseService.getProvider();
      if (!provider) {
        throw new Error('Database provider not available');
      }
      
      // Get users collection
      const usersCollection = databaseService.getCollection('users');
      if (!usersCollection) {
        throw new Error('Users collection not available');
      }
      
      // Check if any users exist in the database
      const allUsers = await usersCollection.find({ selector: {} });
      if (!allUsers || allUsers.length === 0) {
        console.log('🔐 [AuthService] No users found in production database, switching to demo mode');
        
        // Switch to demo mode automatically
        await unifiedConfigManager.switchToDemo();
        this.isDemoMode = true;
        
        // Log the fallback to demo mode
        console.warn('🔐 [AuthService] Automatically switched to demo mode due to empty user database');
        reportError(new Error('Production database empty - switched to demo mode'), {
          username: credentials.username,
          loginType: 'production_fallback_to_demo',
          errorContext: 'empty_database_fallback',
          timestamp: new Date().toISOString()
        });
        
        // Use demo login instead
        return this.loginDemo(credentials);
      }
      
      // Find user by username
      const user = await usersCollection.findOne({ selector: { username: credentials.username } });
      if (!user) {
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

      // CRITICAL FIX: Implement proper password verification (CRIT-003, SEC-002)
      // Check if user has a password hash stored
      if (!user.password_hash) {
        // No password set - this shouldn't happen in production
        reportError(new Error('Production login failed: No password hash'), {
          username: credentials.username,
          userId: user.id,
          loginType: 'production',
          errorContext: 'missing_password_hash',
          timestamp: new Date().toISOString()
        });
        
        return {
          success: false,
          message: 'Account not properly configured. Please contact administrator.'
        };
      }
      
      // Verify password using PBKDF2 hashing
      const passwordValid = await verifyPassword(credentials.password, {
        hash: user.password_hash,
        salt: user.password_salt,
        iterations: user.password_iterations || 100000
      });
      
      if (!passwordValid) {
        // Report production login failure to Bugsink
        const loginError = new Error('Production login failed: Invalid password');
        reportError(loginError, {
          username: credentials.username,
          userId: user.id,
          loginType: 'production',
          errorContext: 'invalid_password',
          timestamp: new Date().toISOString()
        });
        
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Get user permissions
      const permissions = await userPermissionsService.getUserPermissions(user.id);
      
      // Get user roles and module access using collections
      const userRolesCollection = databaseService.getCollection('user_roles');
      const rolesCollection = databaseService.getCollection('rbac_roles');
      
      const userRoles = userRolesCollection ? await userRolesCollection.find({ selector: { userId: user.id } }) : [];
      const moduleAccess: string[] = [];
      
      for (const userRole of userRoles) {
        if (rolesCollection) {
          const role = await rolesCollection.findOne({ selector: { id: userRole.roleId } });
          if (role) {
            Object.keys(role.moduleAccess || {}).forEach(moduleId => {
              if (role.moduleAccess[moduleId].enabled && !moduleAccess.includes(moduleId)) {
                moduleAccess.push(moduleId);
              }
            });
          }
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

      // Create session with secure token (CRIT-004)
      const session: AuthSession = {
        user: authUser,
        token: generateSecureToken(32), // Cryptographically secure random token
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        isDemo: false
      };

      this.saveSession(session);

      // Update last login using collection
      if (usersCollection && user.id) {
        try {
          await usersCollection.update(user.id, { last_login_at: new Date().toISOString() });
        } catch (updateError) {
          console.warn('Failed to update last login time:', updateError);
          // Don't fail the login process if we can't update last login
        }
      }

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
