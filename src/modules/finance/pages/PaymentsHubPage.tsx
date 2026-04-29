// ABOUTME: Hub page for payments
// ABOUTME: Consolidates student payments, opening balances, fee collection summary, financial summary, payment allocation, and general receipts into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  CreditCardIcon,
  ChartBarIcon,
  WalletIcon,
  ClipboardDocumentListIcon,
} from '@/components/ui/icons';
import { StudentPaymentsPageContent } from './StudentPaymentsPage';
import { FeeCollectionSummaryPageContent } from './FeeCollectionSummaryPage';
import { StudentFinancialSummaryPageContent } from './StudentFinancialSummaryPage';
import { PaymentAllocationPageContent } from './PaymentAllocationPage';
import { GeneralReceiptsPageContent } from './GeneralReceiptsPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const PaymentsHubPage: React.FC = () => {
  const { t } = useTranslation('finance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'student-payments',
      label: t('studentPayments.title', 'Student Payments'),
      icon: <CreditCardIcon className="w-4 h-4" />,
      component: <StudentPaymentsPageContent />,
    },
    {
      id: 'collection-summary',
      label: t('feeCollectionSummary.title', 'Collection Summary'),
      icon: <ChartBarIcon className="w-4 h-4" />,
      component: <FeeCollectionSummaryPageContent />,
    },
    {
      id: 'financial-summary',
      label: t('studentFinancialSummary.title', 'Financial Summary'),
      icon: <WalletIcon className="w-4 h-4" />,
      component: <StudentFinancialSummaryPageContent />,
    },
    {
      id: 'payment-allocation',
      label: t('paymentAllocation.title', 'Payment Allocation'),
      icon: <CreditCardIcon className="w-4 h-4" />,
      component: <PaymentAllocationPageContent />,
    },
    {
      id: 'general-receipts',
      label: t('generalReceipts.title', 'General Receipts'),
      icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
      component: <GeneralReceiptsPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'student-payments';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'student-payments') {
        navigate('/finance/payments', { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    },
    [navigate, setSearchParams]
  );

  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('payments.title', 'Payments')}
        subtitle={t(
          'payments.subtitle',
          'Manage student payments, balances, collection summaries, and receipts'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="green"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default PaymentsHubPage;

