// ABOUTME: Hub page for student life configuration
// ABOUTME: Consolidates dormitories, student categories, and partners into a tabbed interface (3 tabs)

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  BuildingLibraryIcon,
  UserGroupIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { DormitoriesContent } from './DormitoriesPage';
import { StudentCategoriesContent } from './StudentCategoriesPage';
import { PartnersContent } from './PartnersPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const StudentLifePage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'dormitories',
      label: t('dormitories.management', 'Dormitories'),
      icon: <BuildingLibraryIcon className="w-4 h-4" />,
      component: <DormitoriesContent />,
    },
    {
      id: 'categories',
      label: t('studentCategories.title', 'Student Categories'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: <StudentCategoriesContent />,
    },
    {
      id: 'partners',
      label: t('partners.title', 'Partners & Customers'),
      icon: <UsersIcon className="w-4 h-4" />,
      component: <PartnersContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'dormitories';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'dormitories') {
        navigate('/administration/student-life', { replace: true });
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
        title={t('studentLife.title', 'Student Life')}
        subtitle={t(
          'studentLife.subtitle',
          'Manage dormitories, student categories, and partners'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="teal"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default StudentLifePage;
