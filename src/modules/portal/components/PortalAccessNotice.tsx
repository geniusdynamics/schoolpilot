import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { UserCircleIcon, LockClosedIcon, IdentificationIcon } from '@/components/ui/icons';

// ABOUTME: Shared notice shown when the signed-in account cannot be resolved to
// a linked student record. Replaces silent empty grids with actionable feedback.

export type PortalAccessStatus =
  | 'loading'
  | 'not-authenticated'
  | 'no-linked-student'
  | 'linked';

interface PortalAccessNoticeProps {
  status: Exclude<PortalAccessStatus, 'linked'>;
}

const ICONS: Record<PortalAccessNoticeProps['status'], React.ReactNode> = {
  loading: <UserCircleIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-pulse" />,
  'not-authenticated': <LockClosedIcon className="w-16 h-16 mx-auto mb-4 text-surface-muted-fg" />,
  'no-linked-student': <IdentificationIcon className="w-16 h-16 mx-auto mb-4 text-amber-400" />,
};

const MESSAGES: Record<
  PortalAccessNoticeProps['status'],
  { title: string; description: string }
> = {
  loading: {
    title: 'Loading your portal…',
    description: 'We are resolving your account and student record.',
  },
  'not-authenticated': {
    title: 'Sign in required',
    description:
      'The parent/student portal is only available to signed-in accounts. Please sign in with the student or guardian account provided by the school.',
  },
  'no-linked-student': {
    title: 'No student linked to this account',
    description:
      'This account is not linked to a student record, so there is no portal data to show. Please contact the school office to have your account linked.',
  },
};

export const PortalAccessNotice: React.FC<PortalAccessNoticeProps> = ({ status }) => {
  const { t } = useTranslation('portal');
  const message = MESSAGES[status];

  return (
    <Card className="border-slate-200 bg-surface-card shadow-sm">
      <div className="text-center py-12">
        {ICONS[status]}
        <h3 className="text-lg font-medium text-surface-foreground">{t(message.title, message.title)}</h3>
        <p className="text-sm text-surface-muted-fg mt-2 max-w-md mx-auto">
          {t(message.description, message.description)}
        </p>
      </div>
    </Card>
  );
};

/**
 * True when the given access status should render the full-page notice
 * instead of normal portal content.
 */
export const shouldShowAccessNotice = (
  status: PortalAccessStatus
): status is Exclude<PortalAccessStatus, 'linked'> => status !== 'linked' && status !== 'loading';
