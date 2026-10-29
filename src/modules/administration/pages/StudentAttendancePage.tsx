// ABOUTME: Hub page for student attendance management
// ABOUTME: Consolidates manual entry, dynamic tracker, attendance view, and reports into tabbed interface

import React, { useState, useCallback } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@/components/ui/icons';
import { ManualAttendanceContent } from './ManualAttendancePage';
import { DynamicAttendanceContent } from './DynamicAttendancePage';
import { AttendanceReportsContent } from './AttendanceReportsPage';
import { StudentAttendanceView } from './StudentAttendanceView';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const StudentAttendancePage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'manual',
      label: t('attendance.manualEntry', 'Manual Entry'),
      icon: <CalendarDaysIcon className="w-4 h-4" />,
      component: <ManualAttendanceContent />,
    },
    {
      id: 'dynamic',
      label: t('attendance.dynamicTracker', 'Dynamic Tracker'),
      icon: <ClockIcon className="w-4 h-4" />,
      component: <DynamicAttendanceContent />,
    },
    {
      id: 'student-view',
      label: t('attendance.studentView', 'Attendance View'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: <StudentAttendanceView />,
    },
    {
      id: 'reports',
      label: t('attendance.reports', 'Reports'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <AttendanceReportsContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'manual';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'manual') {
        navigate('/administration/attendance', { replace: true });
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
        title={t('attendanceHub.title', 'Student Attendance')}
        info={t(
          'attendanceHub.subtitle',
          'Manage student attendance through manual entry, dynamic tracking, and comprehensive reports'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="emerald"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

const StudentAttendancePageWithRepository = withCanonicalRepository(StudentAttendancePage);
export default StudentAttendancePageWithRepository;
