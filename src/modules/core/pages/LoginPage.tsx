import { logger } from '@/utils/logging';

// ABOUTME: Login page for user authentication; lists demo accounts only for demo databases
// ABOUTME: In live mode shows storage errors explicitly and offers "Create administrator" when no user exists

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { LockClosedIcon, UserCircleIcon, EyeIcon, EyeSlashIcon } from '@/components/ui/icons';
import { MIN_ADMIN_PASSWORD_LENGTH, type LoginState } from '@/services/auth/authService';

// Loaded lazily so the page only touches live storage when it is not a demo database.
let authServiceModule: Promise<typeof import('@/services/auth/authService')> | null = null;
const loadAuthService = async () => {
  authServiceModule ??= import('@/services/auth/authService');
  return (await authServiceModule).authService;
};

interface CreateAdministratorFormProps {
  onCreated: () => void;
}

const CreateAdministratorForm: React.FC<CreateAdministratorFormProps> = ({ onCreated }) => {
  const { t } = useTranslation('common');
  const [form, setForm] = useState({ username: '', displayName: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < MIN_ADMIN_PASSWORD_LENGTH) {
      setError(t('auth.createAdministrator.passwordTooShort', 'The password must be at least 10 characters.'));
      return;
    }
    if (form.password !== form.confirm) {
      setError(t('auth.createAdministrator.passwordMismatch', 'The passwords do not match.'));
      return;
    }
    setBusy(true);
    try {
      const service = await loadAuthService();
      const result = await service.createInitialAdministrator({
        username: form.username,
        displayName: form.displayName,
        password: form.password,
      });
      if (result.success) onCreated();
      else setError(result.message);
    } catch (err) {
      logger.error('Create administrator failed:', err);
      setError(t('auth.createAdministrator.failed', 'Could not create the administrator.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="create-administrator-form">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-semibold text-surface-foreground mb-2">
          {t('auth.createAdministrator.title', 'Create administrator')}
        </h2>
        <p className="text-surface-muted-fg">
          {t('auth.createAdministrator.intro', 'No accounts exist yet. Create the administrator who will manage this school.')}
        </p>
      </div>
      {([
        ['admin-username', 'username', t('auth.createAdministrator.username', 'Username'), 'text'],
        ['admin-display-name', 'displayName', t('auth.createAdministrator.displayName', 'Display name'), 'text'],
        ['admin-password', 'password', t('auth.createAdministrator.password', 'Password'), 'password'],
        ['admin-confirm', 'confirm', t('auth.createAdministrator.confirmPassword', 'Confirm password'), 'password'],
      ] as const).map(([id, field, label, type]) => (
        <div key={id}>
          <label htmlFor={id} className="block text-sm font-medium text-surface-foreground mb-1">{label}</label>
          <Input id={id} type={type} value={form[field]} onChange={change(field)} required disabled={busy} />
        </div>
      ))}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {t('auth.createAdministrator.submit', 'Create administrator')}
      </Button>
    </form>
  );
};

const LoginPage: React.FC = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loginState, setLoginState] = useState<LoginState | null>(null);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');

  // authService.getLoginState() is authoritative; AuthContext.isDemoMode may be stale (e.g. after logout).
  useEffect(() => {
    let cancelled = false;
    loadAuthService()
      .then(service => service.getLoginState())
      .then(state => { if (!cancelled) setLoginState(state); })
      .catch(err => {
        logger.error('Could not determine login state:', err);
        if (!cancelled) setLoginState({ mode: 'live', status: 'storage-unavailable' });
      });
    return () => { cancelled = true; };
  }, []);

  // Demo accounts are offered only for demo databases, never because something failed.
  const showDemoAccounts = loginState?.mode === 'demo';
  const needsAdministrator = loginState?.status === 'needs-administrator';
  const storageUnavailable = loginState?.status === 'storage-unavailable';

  const handleAdministratorCreated = () => {
    setLoginState({ mode: 'live', status: 'ready' });
    setError('');
    setSuccess(t('auth.createAdministrator.created', 'Administrator created. Sign in with your new account.'));
  };

  // Where a successful sign-in goes: the page that sent the visitor here, or the dashboard.
  const redirectPath = ((): string => {
    const candidatePath = location.state?.from?.pathname;
    if (!candidatePath || candidatePath === '/' || candidatePath === '/login') {
      return '/dashboard';
    }
    return candidatePath;
  })();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  // Demo users for quick login
  const demoUsers = [
    { username: 'admin', password: 'admin123', role: 'Super Administrator' },
    { username: 'teacher', password: 'teacher123', role: 'Teacher' },
    { username: 'finance', password: 'finance123', role: 'Finance Officer' },
    { username: 'student', password: 'student123', role: 'Student' }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await login(credentials);
      
      if (result.success) {
        setSuccess('Login successful! Redirecting...');

        // At once: a timer left running here outlived this page and sent a visitor who had already
        // moved on back to where they signed in.
        navigate(redirectPath, { replace: true });
      } else if (result.reason === 'no-administrator') {
        setLoginState({ mode: 'live', status: 'needs-administrator' });
      } else {
        setError(result.message);
      }
    } catch (error) {
      logger.error('Login error:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser: typeof demoUsers[0]) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await login({
        username: demoUser.username,
        password: demoUser.password
      });
      
      if (result.success) {
        setSuccess(`Logged in as ${demoUser.role}! Redirecting...`);

        navigate(redirectPath, { replace: true });
      } else {
        setError(result.message);
      }
    } catch (error) {
      logger.error('Demo login error:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user starts typing
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <LockClosedIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-surface-foreground mb-2">SchoolPilot</h1>
          <p className="text-surface-muted-fg">SchoolPilot</p>
        </div>

        {/* Login Form */}
        <Card className="p-8">
          {storageUnavailable && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
              <p className="text-sm text-red-700">
                {t('auth.login.storageUnavailable', 'The school database is not available on this device. Sign-in is disabled until storage is working.')}
              </p>
            </div>
          )}

          {needsAdministrator ? (
            <CreateAdministratorForm onCreated={handleAdministratorCreated} />
          ) : (
          <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-surface-foreground mb-2">Sign In</h2>
            <p className="text-surface-muted-fg">
              {showDemoAccounts ? 'Demo Mode - Use any of the demo accounts below' : 'Enter your credentials'}
            </p>
          </div>

          {/* Demo Mode Notice */}
          {showDemoAccounts && (
            <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <h3 className="font-medium text-primary-900 mb-2">Demo Mode Active</h3>
              <p className="text-sm text-primary-700 mb-3">
                You can use any of these demo accounts to test different user roles:
              </p>
              <div className="space-y-2">
                {demoUsers.map((demoUser) => (
                  <button
                    key={demoUser.username}
                    onClick={() => handleDemoLogin(demoUser)}
                    disabled={isLoading}
                    className="w-full text-left p-2 text-sm bg-surface-card border border-primary-200 rounded hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    <span className="font-medium">{demoUser.username}</span>
                    <span className="text-surface-muted-fg ml-2">({demoUser.role})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-surface-foreground mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircleIcon className="h-5 w-5 text-surface-muted-fg" />
                </div>
                <Input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter your username"
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-surface-muted-fg" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-surface-muted-fg" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-surface-muted-fg" />
                  )}
                </button>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !credentials.username || !credentials.password}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Spinner size="sm" className="mr-2" />
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Demo Mode Info */}
          {showDemoAccounts && (
            <div className="mt-6 p-3 bg-surface-muted border border-surface-border rounded-lg">
              <p className="text-xs text-surface-muted-fg text-center">
                <strong>Demo Mode:</strong> All passwords are accepted. In production, proper password validation will be enforced.
              </p>
            </div>
          )}
          </>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-surface-muted-fg">
            © 2024 SchoolPilot. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
