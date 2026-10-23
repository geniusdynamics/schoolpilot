// ABOUTME: Hub page for student reports
// ABOUTME: Consolidates student masterlist, class lists, teacher assignments, financial summary, votehead statement, and exam results into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  UsersIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartBarIcon,
} from '@/components/ui/icons';
import { StudentMasterlistPageContent } from './StudentMasterlistPage';
import { ClassListsPageContent } from './ClassListsPage';
import { TeacherAssignmentsPageContent } from './TeacherAssignmentsPage';
import { StudentFinancialSummaryPageContent } from './StudentFinancialSummaryPage';
import { StudentVoteheadStatementPageContent } from './StudentVoteheadStatementPage';
import { ExamResultsHorizontalPageContent } from './ExamResultsHorizontalPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const StudentReportsHubPage: React.FC = () => {
  const { t } = useTranslation('reports');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'masterlist',
      label: t('studentMasterlist.title', 'Masterlist'),
      icon: <UsersIcon className="w-4 h-4" />,
      component: <StudentMasterlistPageContent />,
    },
    {
      id: 'class-lists',
      label: t('classLists.title', 'Class Lists'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: <ClassListsPageContent />,
    },
    {
      id: 'teacher-assignments',
      label: t('teacherAssignments.title', 'Teacher Assignments'),
      icon: <AcademicCapIcon className="w-4 h-4" />,
      component: <TeacherAssignmentsPageContent />,
    },
    {
      id: 'financial-summary',
      label: t('studentFinancialSummary.title', 'Financial Summary'),
      icon: <CurrencyDollarIcon className="w-4 h-4" />,
      component: <StudentFinancialSummaryPageContent />,
    },
    {
      id: 'votehead-statement',
      label: t('studentVoteheadStatement.title', 'Votehead Statement'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <StudentVoteheadStatementPageContent />,
    },
    {
      id: 'exam-results',
      label: t('examResultsHorizontal.title', 'Exam Results'),
      icon: <ChartBarIcon className="w-4 h-4" />,
      component: <ExamResultsHorizontalPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'masterlist';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'masterlist') {
        navigate('/reports/student-reports', { replace: true });
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
        title={t('studentReports.title', 'Student Reports')}
        info={t(
          'studentReports.subtitle',
          'View student masterlist, class lists, teacher assignments, financial summaries, votehead statements, and exam results'
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

export default StudentReportsHubPage;
