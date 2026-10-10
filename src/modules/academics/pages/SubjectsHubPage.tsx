import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  BookOpenIcon,
  DocumentTextIcon,
} from '@/components/ui/icons';
import { SubjectsContent } from './SubjectsPage';
import { SubjectPapersManagementContent } from './SubjectPapersManagementPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const SubjectsHubPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'subjects',
      label: t('subjects.title', 'Subjects'),
      icon: <BookOpenIcon className="w-4 h-4" />,
      component: <SubjectsContent />,
    },
    {
      id: 'papers',
      label: t('subjectPapers.title', 'Subject Papers'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <SubjectPapersManagementContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'subjects';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'subjects') {
        navigate('/academics/subjects', { replace: true });
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
        title={t('subjectsHub.title', 'Subjects Management')}
        subtitle={t(
          'subjectsHub.subtitle',
          'Manage subjects and subject papers'
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

export default SubjectsHubPage;
