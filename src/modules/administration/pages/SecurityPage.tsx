// ABOUTME: Hub page for security management
// ABOUTME: Consolidates visitors management and gate pass into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  UserPlusIcon,
  TicketIcon,
} from '@/components/ui/icons';
import { VisitorsManagementContent } from './VisitorsManagementPage';
import { GatePassContent } from './GatePassPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const SecurityPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'visitors',
      label: t('security.visitors', 'Visitors'),
      icon: <UserPlusIcon className="w-4 h-4" />,
      component: <VisitorsManagementContent />,
    },
    {
      id: 'gate-pass',
      label: t('security.gatePass', 'Gate Pass'),
      icon: <TicketIcon className="w-4 h-4" />,
      component: <GatePassContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'visitors';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'visitors') {
        navigate('/administration/security', { replace: true });
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
        title={t('securityHub.title', 'Security')}
        info={t(
          'securityHub.subtitle',
          'Manage visitor logs and gate pass requests'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="rose"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default SecurityPage;
