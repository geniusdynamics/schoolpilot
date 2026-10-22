// ABOUTME: Hub page for marks entry
// ABOUTME: Consolidates student exam results entry and marks entry by token into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ClipboardDocumentListIcon,
  DocumentDuplicateIcon,
  TableCellsIcon,
} from '@/components/ui/icons';
import { StudentExamResultsEntryPageContent } from './StudentExamResultsEntryPage';
import { MarksEntryByTokenPageContent } from './MarksEntryByTokenPage';
import { MarkEntryV2PageContent } from './marks';

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
      id: 'student-results',
      label: t('studentExamResultsEntry.title', 'Student Results'),
      icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
      component: <StudentExamResultsEntryPageContent />,
    },
    {
      id: 'entry-by-token',
      label: t('marksEntryByToken.title', 'Entry by Token'),
      icon: <DocumentDuplicateIcon className="w-4 h-4" />,
      component: <MarksEntryByTokenPageContent />,
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
        subtitle={t(
          'marksEntry.subtitle',
          'Enter and manage student exam marks and token-based entries'
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
