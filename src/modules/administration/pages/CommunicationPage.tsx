// ABOUTME: Hub page for communication management
// ABOUTME: Consolidates templates, campaigns, SMS reports, auto-SMS settings, and newsletters into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  EnvelopeIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  NewspaperIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { CommunicationTemplatesContent } from './CommunicationTemplatesPage';
import { MessageCampaignsContent } from './MessageCampaignsPage';
import { SMSCategoriesContent } from './SMSCategoriesPage';
import { SMSReportsContent } from './SMSReportsPage';
import { AutoSMSSettingsContent } from './AutoSMSSettingsPage';
import { NewslettersContent } from './NewslettersPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const CommunicationPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'templates',
      label: t('communication.templates', 'Templates'),
      icon: <EnvelopeIcon className="w-4 h-4" />,
      component: <CommunicationTemplatesContent />,
    },
    {
      id: 'campaigns',
      label: t('communication.campaigns', 'Campaigns'),
      icon: <MegaphoneIcon className="w-4 h-4" />,
      component: <MessageCampaignsContent />,
    },
    {
      id: 'sms-categories',
      label: t('communication.smsCategories', 'SMS Categories'),
      icon: <UsersIcon className="w-4 h-4" />,
      component: <SMSCategoriesContent />,
    },
    {
      id: 'reports',
      label: t('communication.reports', 'Reports'),
      icon: <ChatBubbleLeftRightIcon className="w-4 h-4" />,
      component: <SMSReportsContent />,
    },
    {
      id: 'settings',
      label: t('communication.settings', 'Settings'),
      icon: <BellIcon className="w-4 h-4" />,
      component: <AutoSMSSettingsContent />,
    },
    {
      id: 'newsletters',
      label: t('communication.newsletters', 'Newsletters'),
      icon: <NewspaperIcon className="w-4 h-4" />,
      component: <NewslettersContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'templates';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'templates') {
        navigate('/administration/communication', { replace: true });
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
        title={t('communicationHub.title', 'Communication')}
        subtitle={t(
          'communicationHub.subtitle',
          'Manage communication templates, campaigns, SMS reports, auto-settings, and newsletters'
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

export default CommunicationHubPage;
