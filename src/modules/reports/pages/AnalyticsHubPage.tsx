// ABOUTME: Hub page for analytics and data insights
// ABOUTME: Consolidates teacher dashboard, subject analysis, class analysis, exports, and trends into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ChartBarIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ArrowDownTrayIcon,
  ChartPieIcon,
} from '@/components/ui/icons';
import { AnalyticsTeacherDashboardPageContent } from './analytics/AnalyticsTeacherDashboardPage';
import { AnalyticsSubjectPageContent } from './analytics/AnalyticsSubjectPage';
import { AnalyticsClassPageContent } from './analytics/AnalyticsClassPage';
import { AnalyticsExportPageContent } from './analytics/AnalyticsExportPage';
import { AnalyticsTrendsPageContent } from './analytics/AnalyticsTrendsPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const AnalyticsHubPage: React.FC = () => {
  const { t } = useTranslation('reports');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'teacher-dashboard',
      label: t('analytics.teacherDashboard', 'Teacher Dashboard'),
      icon: <AcademicCapIcon className="w-4 h-4" />,
      component: <AnalyticsTeacherDashboardPageContent />,
    },
    {
      id: 'subject-analysis',
      label: t('analytics.subjectAnalysis', 'Subject Analysis'),
      icon: <ChartBarIcon className="w-4 h-4" />,
      component: <AnalyticsSubjectPageContent />,
    },
    {
      id: 'class-analysis',
      label: t('analytics.classAnalysis', 'Class Analysis'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: <AnalyticsClassPageContent />,
    },
    {
      id: 'exports',
      label: t('analytics.exports', 'Exports'),
      icon: <ArrowDownTrayIcon className="w-4 h-4" />,
      component: <AnalyticsExportPageContent />,
    },
    {
      id: 'trends',
      label: t('analytics.trends', 'Trends'),
      icon: <ChartPieIcon className="w-4 h-4" />,
      component: <AnalyticsTrendsPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'teacher-dashboard';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'teacher-dashboard') {
        navigate('/reports/analytics', { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    },
    [navigate, setSearchParams]
  );

  const activeTabData = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('analyticsHub.title', 'Analytics')}
        subtitle={t(
          'analyticsHub.subtitle',
          'Teacher dashboard, subject and class analysis, data exports, and trends'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="purple"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default AnalyticsHubPage;
