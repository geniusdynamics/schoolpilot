// ABOUTME: Hub page for exam setup
// ABOUTME: Consolidates exam scheduling, subject papers, exam sessions, and tokens into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  CalendarDaysIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  DocumentDuplicateIcon,
} from '@/components/ui/icons';
import { ExamSchedulingPageContent } from './ExamSchedulingPage';
import { SubjectPapersManagementContent } from './SubjectPapersManagementPage';
import { ExamSessionsPageContent } from './ExamSessionsPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const ExamSetupHubPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'scheduling',
      label: t('examScheduling.title', 'Scheduling'),
      icon: <CalendarDaysIcon className="w-4 h-4" />,
      component: <ExamSchedulingPageContent />,
    },
    {
      id: 'subject-papers',
      label: t('subjectPapers.title', 'Subject Papers'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <SubjectPapersManagementContent />,
    },
    {
      id: 'exam-sessions',
      label: t('examSessions.title', 'Exam Sessions'),
      icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
      component: <ExamSessionsPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'scheduling';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'scheduling') {
        navigate('/academics/exam-setup', { replace: true });
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
        title={t('examSetup.title', 'Exam Setup')}
        subtitle={t(
          'examSetup.subtitle',
          'Configure exam schedules, subject papers, sessions, and access tokens'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="indigo"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default ExamSetupHubPage;
