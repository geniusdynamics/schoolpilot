// ABOUTME: The frame every portal page sits in: the greeting, the child switcher a guardian needs, the
// ABOUTME: loading, error and not-linked states, and nothing else.

import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { PortalAccessNotice } from './PortalAccessNotice';
import { PortalLearnerSwitcher } from './PortalLearnerSwitcher';
import type { PortalSession } from '../data/usePortalSession';

interface PortalShellProps {
  readonly session: PortalSession;
  readonly title: string;
  readonly children: ReactNode;
}

/**
 * Renders the portal page inside the viewer's session.
 *
 * Loading, an error and an account with no linked learner are page-level states, not empty tables:
 * each says what happened and what to do, and none of them pretends the portal has no data.
 */
export const PortalShell: React.FC<PortalShellProps> = ({ session, title, children }) => {
  const { t } = useTranslation('portal');

  if (session.loading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
        <Spinner size="lg" />
        <span className="ml-3 text-surface-muted-fg">{t('common.loading', 'Loading…')}</span>
      </div>
    );
  }

  if (session.error) {
    return (
      <Card className="border-rose-200 bg-rose-50">
        <div role="alert" className="py-6 text-center">
          <h2 className="text-lg font-semibold text-rose-800">
            {t('errors.title', 'The portal could not load')}
          </h2>
          <p className="mt-2 text-sm text-rose-700">{session.error}</p>
        </div>
      </Card>
    );
  }

  if (session.status !== 'linked' || !session.selectedLearner) {
    return <PortalAccessNotice status="no-linked-student" />;
  }

  const learner = session.selectedLearner;

  return (
    <div className="space-y-3">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-surface-foreground">{title}</h1>
        <p className="text-sm text-surface-muted-fg">
          {session.role === 'guardian'
            ? t('shell.guardianGreeting', 'Signed in as {{name}}', { name: session.displayName })
            : t('shell.learnerGreeting', 'Signed in as {{name}}', { name: session.displayName })}
        </p>
      </header>

      <Card className="border-slate-200 bg-surface-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-surface-muted-fg">
              {session.role === 'guardian'
                ? t('shell.child', 'Child')
                : t('shell.learner', 'Learner')}
            </p>
            <p className="text-base font-medium text-surface-foreground">{learner.name}</p>
            <p className="text-sm text-surface-muted-fg">
              {learner.admissionNumber}
              {learner.className ? ` · ${learner.className}` : ''}
            </p>
          </div>
          {session.learners.length > 1 ? (
            <PortalLearnerSwitcher
              learners={session.learners}
              selectedId={learner.id}
              onSelect={session.selectLearner}
            />
          ) : null}
        </div>
      </Card>

      {children}
    </div>
  );
};
