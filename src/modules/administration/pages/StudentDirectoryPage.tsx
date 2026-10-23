// ABOUTME: Hub page for student management
// ABOUTME: Consolidates student directory, bio data, health records, and clearance into tabbed interface

import React, { useState, useCallback } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  UsersIcon,
  IdentificationIcon,
  HeartIcon,
  CheckBadgeIcon,
  ArrowUpTrayIcon,
} from '@/components/ui/icons';
import { StudentsListContent } from './StudentsListPage';
import { StudentBioDataContent } from './StudentBioDataPage';
import { StudentHealthRecordsContent } from './StudentHealthRecordsPage';
import { StudentClearanceContent } from './StudentClearancePage';
import { TransferredStudentsContent } from './TransferredStudentsPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const StudentDirectoryPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'directory',
      label: t('students.directory.title', 'Directory'),
      icon: <UsersIcon className="w-4 h-4" />,
      component: <StudentsListContent />,
    },
    {
      id: 'bio-data',
      label: t('students.bioData.title', 'Bio Data'),
      icon: <IdentificationIcon className="w-4 h-4" />,
      component: <StudentBioDataContent />,
    },
    {
      id: 'health',
      label: t('students.health.title', 'Health Records'),
      icon: <HeartIcon className="w-4 h-4" />,
      component: <StudentHealthRecordsContent />,
    },
    {
      id: 'clearance',
      label: t('students.clearance.title', 'Clearance'),
      icon: <CheckBadgeIcon className="w-4 h-4" />,
      component: <StudentClearanceContent />,
    },
    {
      id: 'transferred',
      label: t('students.transferred.title', 'Transferred'),
      icon: <ArrowUpTrayIcon className="w-4 h-4" />,
      component: <TransferredStudentsContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'directory';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'directory') {
        navigate('/administration/students', { replace: true });
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
        title={t('studentDirectory.title', 'Student Directory')}
        info={t(
          'studentDirectory.subtitle',
          'Manage students across all stages: directory, bio data, health records, and clearance'
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

const StudentDirectoryPageWithRepository = withCanonicalRepository(StudentDirectoryPage);
export default StudentDirectoryPageWithRepository;
