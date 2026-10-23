// ABOUTME: The billing-run page: the dedicated route for the v2 run, hosting the panel that previews
// ABOUTME: a run with its reasons and exceptions and posts it, over the canonical repository.

import React from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';

import { BillingRunPanel } from '../../components/BillingRunPanel';

export const BillingRunsPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  return (
    <Card title={t('billingRuns.title', 'Billing runs')}>
      <BillingRunPanel />
    </Card>
  );
};

const BillingRunsPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <BillingRunsPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default BillingRunsPage;
