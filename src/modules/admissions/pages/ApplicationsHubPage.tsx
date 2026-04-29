// ABOUTME: Hub page for application management
// ABOUTME: Consolidates applications list, review queue, application detail, and tracking into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ClipboardDocumentListIcon,
  EyeIcon,
  DocumentTextIcon,
  PencilSquareIcon,
} from '@/components/ui/icons';
import { ApplicationsListPageContent } from './ApplicationsListPage';
import { ApplicationReviewPageContent } from './ApplicationReviewPage';
import { FormBuilderPageContent } from './FormBuilderPage';
import { ApplicationTrackingPageContent } from './ApplicationTrackingPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const ApplicationsHubPage: React.FC = () => {
  const { t } = useTranslation('admissions');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'applications',
      label: t('applications.title', 'Applications'),
      icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
      component: <ApplicationsListPageContent />,
    },
    {
      id: 'review-queue',
      label: t('reviewQueue.title', 'Review Queue'),
      icon: <EyeIcon className="w-4 h-4" />,
      component: <ApplicationReviewPageContent />,
    },
    {
      id: 'form-builder',
      label: t('formBuilder.title', 'Form Builder'),
      icon: <PencilSquareIcon className="w-4 h-4" />,
      component: <FormBuilderPageContent />,
    },
    {
      id: 'tracking',
      label: t('tracking.title', 'Tracking'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <ApplicationTrackingPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'applications';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'applications') {
        navigate('/admissions/applications-hub', { replace: true });
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
        title={t('applicationsHub.title', 'Application Management')}
        subtitle={t(
          'applicationsHub.subtitle',
          'Manage applications, review queue, details, and tracking'
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

export default ApplicationsHubPage;

