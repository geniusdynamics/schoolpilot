// ABOUTME: Hub page for staff operations
// ABOUTME: Consolidates staff directory, attendance, ID cards, wallet, and bulk updates into tabbed interface

import React, { useState, useCallback } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  UserGroupIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
} from '@/components/ui/icons';
import { StaffListContent } from './StaffListPage';
import { StaffAttendanceContent } from './StaffAttendancePage';
import { StaffIDCardsContent } from './StaffIDCardsPage';
import { StaffWalletContent } from './StaffWalletPage';
import { BulkStaffUpdateContent } from './BulkStaffUpdatePage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const StaffOperationsPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'directory',
      label: t('staffOperations.directory', 'Directory'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: <StaffListContent />,
    },
    {
      id: 'attendance',
      label: t('staffOperations.attendance', 'Attendance'),
      icon: <CalendarDaysIcon className="w-4 h-4" />,
      component: <StaffAttendanceContent />,
    },
    {
      id: 'id-cards',
      label: t('staffOperations.idCards', 'ID Cards'),
      icon: <IdentificationIcon className="w-4 h-4" />,
      component: <StaffIDCardsContent />,
    },
    {
      id: 'wallet',
      label: t('staffOperations.wallet', 'Wallet'),
      icon: <CurrencyDollarIcon className="w-4 h-4" />,
      component: <StaffWalletContent />,
    },
    {
      id: 'bulk-update',
      label: t('staffOperations.bulkUpdate', 'Bulk Update'),
      icon: <ArrowPathIcon className="w-4 h-4" />,
      component: <BulkStaffUpdateContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'directory';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'directory') {
        navigate('/administration/staff-operations', { replace: true });
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
        title={t('staffOperations.title', 'Staff Operations')}
        info={t(
          'staffOperations.subtitle',
          'Manage staff directory, attendance, ID cards, wallet transactions, and bulk updates'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="cyan"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

const StaffOperationsPageWithRepository = withCanonicalRepository(StaffOperationsPage);
export default StaffOperationsPageWithRepository;
