// ABOUTME: Hub page for analytics and data insights
// ABOUTME: Consolidates teacher dashboard, subject analysis, class analysis, exports, and trends into tabbed interface

import React, { Suspense, lazy, useState, useCallback } from 'react';
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

const AnalyticsTeacherDashboard = lazy(() => import('./analytics/AnalyticsTeacherDashboardPage'));
const AnalyticsSubject = lazy(() => import('./analytics/AnalyticsSubjectPage'));
const AnalyticsClass = lazy(() => import('./analytics/AnalyticsClassPage'));
const AnalyticsExport = lazy(() => import('./analytics/AnalyticsExportPage'));
const AnalyticsTrends = lazy(() => import('./analytics/AnalyticsTrendsPage'));

const TabFallback: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
  </div>
);

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
      component: (
        <Suspense fallback={<TabFallback />}>
          <AnalyticsTeacherDashboard />
        </Suspense>
      ),
    },
    {
      id: 'subject-analysis',
      label: t('analytics.subjectAnalysis', 'Subject Analysis'),
      icon: <ChartBarIcon className="w-4 h-4" />,
      component: (
        <Suspense fallback={<TabFallback />}>
          <AnalyticsSubject />
        </Suspense>
      ),
    },
    {
      id: 'class-analysis',
      label: t('analytics.classAnalysis', 'Class Analysis'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: (
        <Suspense fallback={<TabFallback />}>
          <AnalyticsClass />
        </Suspense>
      ),
    },
    {
      id: 'exports',
      label: t('analytics.exports', 'Exports'),
      icon: <ArrowDownTrayIcon className="w-4 h-4" />,
      component: (
        <Suspense fallback={<TabFallback />}>
          <AnalyticsExport />
        </Suspense>
      ),
    },
    {
      id: 'trends',
      label: t('analytics.trends', 'Trends'),
      icon: <ChartPieIcon className="w-4 h-4" />,
      component: (
        <Suspense fallback={<TabFallback />}>
          <AnalyticsTrends />
        </Suspense>
      ),
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
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default AnalyticsHubPage;
