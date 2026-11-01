// ABOUTME: The header's setup nag: while the school has no profile, system, year, classes or subjects,
// ABOUTME: a button in the main window offers the setup wizard instead of leaving the user to find it.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/AuthContext';
import { useSetupChecklist } from '@/hooks/useSetupChecklist';
import { ArrowRightIcon, ExclamationTriangleIcon } from '@/components/ui/icons';

type SetupUser = { readonly role?: string; readonly permissions?: readonly string[] } | null;

/** The signed-in login, or null outside the app shell (a header rendered on its own in a test). */
function useOptionalUser(): SetupUser {
  try {
    return useAuth().user as SetupUser;
  } catch {
    return null;
  }
}

/** Navigation, or null outside a router (a header rendered on its own in a test). */
function useOptionalNavigate(): ((to: string) => void) | null {
  try {
    const navigate = useNavigate();
    return (to: string) => navigate(to);
  } catch {
    return null;
  }
}

/** Roles that can complete setup: the first administrator and anyone who may change settings. */
function canSetUpSchool(user: SetupUser): boolean {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'administrator' || user.role === 'admin') {
    return true;
  }
  return Boolean(
    user.permissions?.some(
      (permission) => permission === '*' || permission.startsWith('settings.')
    )
  );
}

export const SetupNag: React.FC = () => {
  const navigate = useOptionalNavigate();
  const { t } = useTranslation('common');
  const user = useOptionalUser();
  const checklist = useSetupChecklist();

  if (!canSetUpSchool(user) || navigate === null) return null;
  if (checklist.loading || !checklist.readable || checklist.complete) return null;

  const missing = checklist.missing.map((item) => item.label).join(', ');
  const label = t('setupNag.label', 'Finish setup');
  const progress = `${checklist.completed}/${checklist.total}`;

  return (
    <button
      type="button"
      onClick={() => navigate('/setup')}
      title={t('setupNag.missing', 'Still to record: {{missing}}', { missing })}
      aria-label={t('setupNag.action', 'Finish setting up the school')}
      data-testid="setup-nag"
      className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <ExclamationTriangleIcon className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      <span className="rounded-full bg-amber-200/70 px-1.5 py-0.5 font-mono text-[11px] text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
        {progress}
      </span>
      <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
};

export default SetupNag;
