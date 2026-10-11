import { logger } from '@/utils/logging';

// ABOUTME: Authentication service for user login, logout, session management and first administrator creation
// ABOUTME: Fails closed: demo login only for demo databases; storage errors or an empty users table never fall back to demo

import { databaseService } from '../database/databaseService';
// Using unified database service (SQLite-WASM/PouchDB)
import { userPermissionsService } from './userPermissionsService';
import { rbacService } from '../../core/rbacService';
import { unifiedConfigManager, getStoredDataMode } from '../../config/unifiedConfig';
import { reportError } from '../../config/errorTracking';
import { hashPassword, verifyPassword, generateSecureToken } from '../../utils/passwordHash';
import { CapabilityDetector } from '@/services/database/detection/CapabilityDetector';

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

/** Why a login was refused when the reason is not simply bad credentials. */
export type AuthFailureReason = 'storage-unavailable' | 'no-administrator';

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  message: string;
  errors?: string[];
  reason?: AuthFailureReason;
}

/** What the login page should offer: demo accounts, a sign-in form, or the create-administrator path. */
export interface LoginState {
  mode: 'demo' | 'live';
  status: 'ready' | 'needs-administrator' | 'storage-unavailable';
}

export interface InitialAdministratorInput {
  username: string;
  displayName: string;
  password: string;
  email?: string;
}

export const MIN_ADMIN_PASSWORD_LENGTH = 10;
const SUPER_ADMIN_ROLE = 'super_admin';
const STORAGE_UNAVAILABLE_MESSAGE = 'The school database is not available on this device. Sign-in is disabled until storage is working.';
const NO_ADMINISTRATOR_MESSAGE = 'No administrator account exists yet. Create the administrator to continue.';

/** True when a users row is active. SQLite rows carry the schema column is_active (1/0); older rows use isActive. */
const isUserRowActive = (user: { is_active?: unknown; isActive?: unknown }): boolean => {
  const flag = user.is_active ?? user.isActive;
  return flag === true || flag === 1 || flag === '1' || flag === 'true';
};

// Service Result Types
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
}

class AuthService {
  private isDemoMode: boolean = false;
  private currentSession: AuthSession | null = null;
  private sessionKey = 'schoolpilot_auth_session';
  private databaseAvailable: boolean = false;
  private initializationComplete: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private detectedProvider: 'sqlite-wasm' | 'pouchdb' | 'livestore' | 'hybrid' | 'unknown' = 'unknown';

  constructor() {
    // Start initialization immediately but don't wait
    this.initializationPromise = this.initialize();
  }

  private async initialize() {
    logger.info('🔐 [AuthService] initialize() called');
    try {
      // Demo login is decided only by the persisted data mode, never by failures or environment defaults.
      this.isDemoMode = await this.persistedModeIsDemo();

      // Check if IndexedDB is available using centralized CapabilityDetector
      const detector = CapabilityDetector.getInstance();
      const hasIndexedDB = await detector.hasCapability('hasIndexedDB');
      logger.info('🔐 [AuthService] IndexedDB available?', hasIndexedDB);

      if (hasIndexedDB) {
        try {
          const dbInitPromise = databaseService.initialize({
            name: 'schoolpilot_db',
            multiInstance: true,
            ignoreDuplicate: true
          });

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Database init timeout')), 10000);
          });

          await Promise.race([dbInitPromise, timeoutPromise]);

          this.databaseAvailable = databaseService.isServiceInitialized();
          this.detectedProvider = databaseService.getDetectedProviderType() || 'unknown';
        } catch (error) {
          logger.error('🔐 [AuthService] Database initialisation failed; sign-in is disabled until storage works:', error);
          this.databaseAvailable = false;
          this.detectedProvider = 'unknown';
        }
      } else {
        logger.error('🔐 [AuthService] IndexedDB not available; sign-in is disabled until storage works');
        this.databaseAvailable = false;
      }

      logger.info(`AuthService initialized: Demo mode = ${this.isDemoMode}, DB available = ${this.databaseAvailable}, Provider = ${this.detectedProvider}`);
    } catch (error) {
      logger.error('AuthService initialization failed:', error);
      this.databaseAvailable = false;
    } finally {
      this.initializationComplete = true;
      this.restoreSession();
    }
  }

  /**
   * True only when the stored configuration says this is a demo database. The configuration is
   * loaded first (so a legacy data-mode key is migrated); unloaded or default values never count.
   */
  private async persistedModeIsDemo(): Promise<boolean> {
    try {
      await unifiedConfigManager.init();
    } catch (error) {
      logger.error('🔐 [AuthService] Could not load configuration; treating as live mode:', error);
      return false;
    }
    try {
      return getStoredDataMode() === 'demo';
    } catch (error) {
      logger.error('🔐 [AuthService] Could not read the stored data mode; treating as live mode:', error);
      return false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initializationComplete && this.initializationPromise) {
      await this.initializationPromise;
    }
    // Re-read on every call so a data-mode switch after start-up (e.g. the setup wizard) is honoured.
    this.isDemoMode = await this.persistedModeIsDemo();
  }

  private storageUnavailable(): AuthResult {
    return { success: false, reason: 'storage-unavailable', message: STORAGE_UNAVAILABLE_MESSAGE };
  }

  /** Returns the users collection, or null when live storage cannot be used. */
  private async getUsersCollection() {
    if (!this.databaseAvailable) return null;
    await databaseService.getDatabase();
    if (!databaseService.getProvider()) return null;
    return databaseService.getCollection('users') || null;
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
      
      // Check if session is expired; a demo session is never valid outside a demo database
      if (expiresAt < new Date() || (session.isDemo && !this.isDemoMode)) {
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
      logger.error('Error restoring session:', error);
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
      logger.warn('AuthService not fully initialized');
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
      await this.ensureInitialized();

      if (this.isDemoMode) {
        return this.loginDemo(credentials);
      } else {
        return this.loginProduction(credentials);
      }
    } catch (error) {
      logger.error('AuthService login error:', error);
      
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
    logger.warn('🔐 [AuthService] DEMO MODE LOGIN - This is insecure and should only be used for testing');
    
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
    try {
      const usersCollection = await this.getUsersCollection();
      if (!usersCollection) {
        logger.error('🔐 [AuthService] Live sign-in refused: users storage is unavailable');
        return this.storageUnavailable();
      }

      // Fresh install: the administrator must be created; never fall back to demo accounts
      const allUsers = await usersCollection.find({ selector: {} });
      if (!allUsers || allUsers.length === 0) {
        return { success: false, reason: 'no-administrator', message: NO_ADMINISTRATOR_MESSAGE };
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
      if (!isUserRowActive(user)) {
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
      // Passwords are stored in the canonical `hashed_password` field using the
      // serialized format `hash:salt:iterations` written by SettingsUsersPage.
      if (!user.hashed_password) {
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
      
      // Parse the stored `hash:salt:iterations` triple. Placeholder values such as the
      // legacy 'mockhashedpassword' seed have no salt and are rejected below.
      const [storedHash, storedSalt, storedIterations] = String(user.hashed_password).split(':');

      if (!storedHash || !storedSalt) {
        reportError(new Error('Production login failed: Malformed password hash'), {
          username: credentials.username,
          userId: user.id,
          loginType: 'production',
          errorContext: 'malformed_password_hash',
          timestamp: new Date().toISOString()
        });
        
        return {
          success: false,
          message: 'Account not properly configured. Please contact administrator.'
        };
      }
      
      // Verify password using PBKDF2 hashing
      const passwordValid = await verifyPassword(credentials.password, {
        hash: storedHash,
        salt: storedSalt,
        iterations: parseInt(storedIterations, 10) || 100000
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
      
      // user_roles rows use the schema columns user_id/role_id.
      const userRoles = userRolesCollection ? await userRolesCollection.find({ selector: { user_id: user.id } }) : [];
      const moduleAccess: string[] = [];
      
      for (const userRole of userRoles) {
        if (rolesCollection) {
          const role = await rolesCollection.findOne({ selector: { id: userRole.role_id } });
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
        fullName: user.display_name,
        role: userRoles[0]?.role_id || user.role || 'user',
        isActive: isUserRowActive(user),
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
          logger.warn('Failed to update last login time:', updateError);
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
        reason: 'storage-unavailable',
        message: 'Login failed: the school database could not be read',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // ===== FIRST RUN =====

  /** Tells the login page whether to offer demo accounts, sign-in, or the create-administrator path. */
  async getLoginState(): Promise<LoginState> {
    await this.ensureInitialized();
    if (this.isDemoMode) return { mode: 'demo', status: 'ready' };
    try {
      const usersCollection = await this.getUsersCollection();
      if (!usersCollection) return { mode: 'live', status: 'storage-unavailable' };
      const users = await usersCollection.find({ selector: {} });
      return { mode: 'live', status: users && users.length > 0 ? 'ready' : 'needs-administrator' };
    } catch (error) {
      logger.error('🔐 [AuthService] Could not read users:', error);
      return { mode: 'live', status: 'storage-unavailable' };
    }
  }

  /** Creates the first administrator of a live database. Refused once any user exists. */
  async createInitialAdministrator(input: InitialAdministratorInput): Promise<AuthResult> {
    await this.ensureInitialized();
    const username = input.username.trim();
    const displayName = input.displayName.trim();
    if (this.isDemoMode) {
      return { success: false, message: 'Administrator accounts cannot be created in a demo database.' };
    }
    if (username.length < 3 || !displayName) {
      return { success: false, message: 'Enter a username (at least 3 characters) and a display name.' };
    }
    if (input.password.length < MIN_ADMIN_PASSWORD_LENGTH) {
      return { success: false, message: `The password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.` };
    }
    try {
      const usersCollection = await this.getUsersCollection();
      if (!usersCollection) return this.storageUnavailable();
      const existing = await usersCollection.find({ selector: {} });
      if (existing && existing.length > 0) {
        return { success: false, message: 'An administrator already exists. Sign in instead.' };
      }

      const hashed = await hashPassword(input.password);
      const now = new Date().toISOString();
      const created = await usersCollection.insert({
        username,
        display_name: displayName,
        email: input.email?.trim() || '',
        userType: 'Administrator',
        role: SUPER_ADMIN_ROLE,
        role_id: SUPER_ADMIN_ROLE,
        is_active: true,
        hashed_password: `${hashed.hash}:${hashed.salt}:${hashed.iterations}`,
        created_at: now,
        updated_at: now,
      });

      const userRolesCollection = databaseService.getCollection('user_roles');
      if (userRolesCollection && created?.id) {
        await userRolesCollection.insert({ user_id: created.id, role_id: SUPER_ADMIN_ROLE, created_at: now, updated_at: now });
      }
      return { success: true, message: 'Administrator created. You can now sign in.' };
    } catch (error) {
      logger.error('🔐 [AuthService] Creating the administrator failed:', error);
      return {
        success: false,
        message: 'Could not create the administrator',
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
