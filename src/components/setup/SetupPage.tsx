// ABOUTME: The setup wizard's own page, reachable from the header nag after onboarding: re-running it
// ABOUTME: is safe because every step writes through idempotent writers.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SetupWizard } from '@/components/setup/SetupWizard';

export const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const finish = () => {
    // The wizard writes school_details.setup_completed_at; a reload is what makes the header, the
    // navigation and the canonical pages read the rows it just wrote.
    window.location.hash = '#/dashboard';
    window.location.reload();
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-surface-foreground">
          {t('setup.title', 'Set up the school')}
        </h1>
        <p className="text-sm text-surface-muted-fg">
          {t(
            'setup.subtitle',
            'Record the school profile, the education system, the academic year, the classes and the subjects. Every step saves as you go, so stopping halfway keeps what you entered.'
          )}
        </p>
      </header>
      <SetupWizard onComplete={finish} onCancel={() => navigate('/dashboard')} />
    </div>
  );
};

export default SetupPage;
