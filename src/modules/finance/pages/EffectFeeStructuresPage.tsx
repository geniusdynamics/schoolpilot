// ABOUTME: Fee structures tab: previews and posts the billing run for a period's fee schedules.
// ABOUTME: The run writes canonical invoices and lines; the old template collections are gone from here.

import React from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';

import { BillingRunPanel } from '../components/BillingRunPanel';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';

export const EffectFeeStructuresPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  return (
    <Card title={t('feeStructures.title', 'Fee structures and billing run')}>
      <BillingRunPanel compact />
    </Card>
  );
};

const EffectFeeStructuresPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-6">
      <EffectFeeStructuresPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default EffectFeeStructuresPage;
