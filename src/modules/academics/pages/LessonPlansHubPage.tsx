import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  CalendarDaysIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
} from '@/components/ui/icons';
import WeeklyPlansPage from './lessonplans/WeeklyPlansPage';
import LessonNotesPage from './lessonplans/LessonNotesPage';
import ApprovalPage from './lessonplans/ApprovalPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const LessonPlansHubPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'plans',
      label: t('lessonPlans.plans', 'Weekly Plans'),
      icon: <CalendarDaysIcon className="w-4 h-4" />,
      component: <WeeklyPlansPage />,
    },
    {
      id: 'notes',
      label: t('lessonPlans.notes', 'Lesson Notes'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <LessonNotesPage />,
    },
    {
      id: 'approval',
      label: t('lessonPlans.approval', 'Approval'),
      icon: <ClipboardDocumentCheckIcon className="w-4 h-4" />,
      component: <ApprovalPage />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'plans';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'plans') {
        navigate('/academics/lesson-plans', { replace: true });
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
        title={t('lessonPlansHub.title', 'Lesson Plans')}
        subtitle={t(
          'lessonPlansHub.subtitle',
          'Manage weekly plans, lesson notes, and approvals'
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

export default LessonPlansHubPage;
