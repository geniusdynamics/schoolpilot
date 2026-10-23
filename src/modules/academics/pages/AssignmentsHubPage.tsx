import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@/components/ui/icons';
import AssignmentsListPage from './assignments/AssignmentsListPage';
import AssignmentGradingPage from './assignments/AssignmentGradingPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const AssignmentsHubPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'list',
      label: t('assignments.list', 'Assignments'),
      icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
      component: <AssignmentsListPage />,
    },
    {
      id: 'grading',
      label: t('assignments.grading', 'Grading'),
      icon: <ClipboardDocumentCheckIcon className="w-4 h-4" />,
      component: <AssignmentGradingPage />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'list';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'list') {
        navigate('/academics/assignments', { replace: true });
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
        title={t('assignmentsHub.title', 'Assignments')}
        info={t(
          'assignmentsHub.subtitle',
          'Manage assignments, submissions, and grading'
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
  );
};

export default AssignmentsHubPage;
