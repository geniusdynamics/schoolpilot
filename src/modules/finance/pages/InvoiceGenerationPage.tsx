// ABOUTME: Invoice generation page: the billing run that posts one invoice per learner for a period.
// ABOUTME: Reads canonical fee schedules, learners and enrolments and writes through the repository.

import React from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';

import { BillingRunPanel } from '../components/BillingRunPanel';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';

export const InvoiceGenerationPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  return (
    <Card title={t('invoiceGeneration.title', 'Invoice generation')}>
      <BillingRunPanel />
    </Card>
  );
};

const InvoiceGenerationPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <InvoiceGenerationPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default InvoiceGenerationPage;
