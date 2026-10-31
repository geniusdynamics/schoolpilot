// ABOUTME: Hub page for student bulk operations
// ABOUTME: Consolidates bulk student updates, data import, roll number assignment and year-end promotion into tabs

import React, { useState, useCallback } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  UserIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  AcademicCapIcon,
} from '@/components/ui/icons';
import { BulkStudentUpdateContent } from './BulkStudentUpdatePage';
import { StudentDataImportContent } from './StudentDataImportPage';
import { BulkAssignRollNumbersContent } from './BulkAssignRollNumbersPage';
import PromotionRunPage from './promotion/PromotionRunPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const StudentBulkOperationsPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'bulk-update',
      label: t('bulkOperations.bulkUpdate', 'Bulk Update'),
      icon: <UserIcon className="w-4 h-4" />,
      component: <BulkStudentUpdateContent />,
    },
    {
      id: 'data-import',
      label: t('bulkOperations.dataImport', 'Data Import'),
      icon: <ArrowUpTrayIcon className="w-4 h-4" />,
      component: <StudentDataImportContent />,
    },
    {
      id: 'roll-numbers',
      label: t('bulkOperations.rollNumbers', 'Roll Numbers'),
      icon: <ArrowPathIcon className="w-4 h-4" />,
      component: <BulkAssignRollNumbersContent />,
    },
    {
      id: 'promotion',
      label: t('bulkOperations.promotion', 'Promotion'),
      icon: <AcademicCapIcon className="w-4 h-4" />,
      // One promotion implementation: the canonical pack-driven run, not the legacy class-stream mover.
      component: <PromotionRunPage />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'bulk-update';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'bulk-update') {
        navigate('/administration/student-bulk-operations', { replace: true });
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
        title={t('studentBulkOperations.title', 'Student Bulk Operations')}
        info={t(
          'studentBulkOperations.subtitle',
          'Perform bulk updates, import student data, and assign roll numbers'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="amber"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

const StudentBulkOperationsPageWithRepository = withCanonicalRepository(StudentBulkOperationsPage);
export default StudentBulkOperationsPageWithRepository;
