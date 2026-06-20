// ABOUTME: Hub page for transport finance
// ABOUTME: Consolidates transport routes and student transport assignments into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  TruckIcon,
} from '@/components/ui/icons';
import { TransportRoutesPageContent } from './TransportRoutesPage';
import { StudentTransportAssignmentsPageContent } from './StudentTransportAssignmentsPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const TransportHubPage: React.FC = () => {
  const { t } = useTranslation('finance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'routes',
      label: t('transportRoutes.title', 'Routes'),
      icon: <TruckIcon className="w-4 h-4" />,
      component: <TransportRoutesPageContent />,
    },
    {
      id: 'assignments',
      label: t('studentTransportAssignments.title', 'Assignments'),
      icon: <TruckIcon className="w-4 h-4" />,
      component: <StudentTransportAssignmentsPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'routes';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'routes') {
        navigate('/finance/transport', { replace: true });
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
        title={t('transport.title', 'Transport Finance')}
        subtitle={t(
          'transport.subtitle',
          'Manage transport routes and student transport assignments'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="cyan"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default TransportFinancePage;

