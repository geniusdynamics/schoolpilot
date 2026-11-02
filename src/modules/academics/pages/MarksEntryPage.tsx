// ABOUTME: Hub page for marks entry
// ABOUTME: Holds the marks-entry screens in tabs; entry by token retired with the old collections

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ClipboardDocumentListIcon,
  TableCellsIcon,
} from '@/components/ui/icons';
import { StudentExamResultsEntryPageContent } from './StudentExamResultsEntryPage';
import { ClassMarksEntryPage, MarkEntryV2PageContent } from './marks';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const MarksEntryPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'grid',
      label: t('marksEntry.grid.tab', 'Mark Entry v2'),
      icon: <TableCellsIcon className="w-4 h-4" />,
      component: <MarkEntryV2PageContent />,
    },
    {
      id: 'class-grid',
      label: t('marksEntry.classGrid.tab', 'Class grid'),
      icon: <TableCellsIcon className="w-4 h-4" />,
      component: <ClassMarksEntryPage initialMode="class" />,
    },
    {
      id: 'student-grid',
      label: t('marksEntry.studentGrid.tab', 'Student grid'),
      icon: <TableCellsIcon className="w-4 h-4" />,
      component: <ClassMarksEntryPage initialMode="student" />,
    },
    {
      id: 'student-results',
      label: t('studentExamResultsEntry.title', 'Student Results'),
      icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
      component: <StudentExamResultsEntryPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'grid';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'grid') {
        navigate('/academics/marks-entry', { replace: true });
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
        title={t('marksEntry.title', 'Marks Entry')}
        info={t(
          'marksEntry.subtitle',
          'Enter marks by teaching group, whole class or one student, and manage token-based entries'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="green"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default MarksEntryPage;
