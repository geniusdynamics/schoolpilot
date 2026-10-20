// ABOUTME: Hub page for fee rules configuration
// ABOUTME: Consolidates fines, installments, and adjustments into tabbed interface
// ABOUTME: Split from FeeConfigurationHubPage per spec — focuses on rules/penalties

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import {
  ExclamationTriangleIcon,
  CalendarIcon,
  PencilSquareIcon,
} from '@/components/ui/icons';
import { FeesFinesPageContent } from './FeesFinesPage';
import { FeesInstallmentsPageContent } from './FeesInstallmentsPage';
import { FeeAdjustmentsPageContent } from './FeeAdjustmentsPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const FeeRulesPage: React.FC = () => {
  const { t } = useTranslation('finance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'fines',
      label: t('feesFines.title', 'Fines'),
      icon: <ExclamationTriangleIcon className="w-4 h-4" />,
      component: <FeesFinesPageContent />,
    },
    {
      id: 'installments',
      label: t('feesInstallments.title', 'Installments'),
      icon: <CalendarIcon className="w-4 h-4" />,
      component: <FeesInstallmentsPageContent />,
    },
    {
      id: 'adjustments',
      label: t('feeAdjustments.title', 'Adjustments'),
      icon: <PencilSquareIcon className="w-4 h-4" />,
      component: <FeeAdjustmentsPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'fines';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'fines') {
        navigate('/finance/fee-rules', { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    },
    [navigate, setSearchParams]
  );

  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <CanonicalRepositoryProvider>
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('feeRules.title', 'Fee Rules')}
        subtitle={t(
          'feeRules.subtitle',
          'Manage fines, installments, and fee adjustments'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="blue"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
    </CanonicalRepositoryProvider>
  );
};

export default FeeRulesPage;
