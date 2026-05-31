// ABOUTME: Hub page for fee configuration
// ABOUTME: Consolidates fee templates, structures, and receipt templates into tabbed interface
// ABOUTME: Fines, installments, and adjustments moved to FeeRulesPage per spec

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  DocumentDuplicateIcon,
  DocumentTextIcon,
  TableCellsIcon,
} from '@/components/ui/icons';
import { FeeTemplatesContent } from './FeeTemplatesPage';
import { EffectFeeStructuresPageContent } from './EffectFeeStructuresPage';
import { FeesReceiptTemplatePageContent } from './FeesReceiptTemplatePage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const FeeConfigurationHubPage: React.FC = () => {
  const { t } = useTranslation('finance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'templates',
      label: t('feeTemplates.title', 'Templates'),
      icon: <DocumentDuplicateIcon className="w-4 h-4" />,
      component: <FeeTemplatesContent />,
    },
    {
      id: 'structures',
      label: t('effectFeeStructures.title', 'Structures'),
      icon: <TableCellsIcon className="w-4 h-4" />,
      component: <EffectFeeStructuresPageContent />,
    },
    {
      id: 'receipt-template',
      label: t('feesReceiptTemplate.title', 'Receipt Template'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <FeesReceiptTemplatePageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'templates';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'templates') {
        navigate('/finance/fee-configuration', { replace: true });
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
        title={t('feeConfiguration.title', 'Fee Configuration')}
        subtitle={t(
          'feeConfiguration.subtitle',
          'Manage fee templates, structures, adjustments, fines, installments, and receipt templates'
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
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default FeeConfigurationHubPage;

