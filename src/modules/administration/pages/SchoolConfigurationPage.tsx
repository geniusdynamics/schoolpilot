// ABOUTME: Hub page for school configuration settings
// ABOUTME: Consolidates departments, designations, classes, clubs, and dormitories into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  BuildingOffice2Icon,
  IdentificationIcon,
  UserGroupIcon,
  UsersIcon,
  BuildingLibraryIcon,
} from '@/components/ui/icons';
import { DepartmentsContent } from './DepartmentsPage';
import { DesignationsContent } from './DesignationsPage';
import { ClubsContent } from './ClubsPage';
import { DormitoriesContent } from './DormitoriesPage';
import { StudentCategoriesContent } from './StudentCategoriesPage';
import { PartnersContent } from './PartnersPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  path: string;
}

const SchoolConfigurationPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'departments',
      label: t('departments.management', 'Departments'),
      icon: <BuildingOffice2Icon className="w-4 h-4" />,
      component: <DepartmentsContent />,
      path: '/administration/configuration',
    },
    {
      id: 'designations',
      label: t('designations.management', 'Designations'),
      icon: <IdentificationIcon className="w-4 h-4" />,
      component: <DesignationsContent />,
      path: '/administration/configuration?tab=designations',
    },
    {
      id: 'clubs',
      label: t('clubs.title', 'Clubs & Societies'),
      icon: <UsersIcon className="w-4 h-4" />,
      component: <ClubsContent />,
      path: '/administration/configuration?tab=clubs',
    },
    {
      id: 'dormitories',
      label: t('dormitories.management', 'Dormitories'),
      icon: <BuildingLibraryIcon className="w-4 h-4" />,
      component: <DormitoriesContent />,
      path: '/administration/configuration?tab=dormitories',
    },
    {
      id: 'categories',
      label: t('studentCategories.title', 'Student Categories'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: <StudentCategoriesContent />,
      path: '/administration/configuration?tab=categories',
    },
    {
      id: 'partners',
      label: t('partners.title', 'Partners'),
      icon: <UsersIcon className="w-4 h-4" />,
      component: <PartnersContent />,
      path: '/administration/configuration?tab=partners',
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'departments';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        if (tabId === 'departments') {
          navigate(tab.path, { replace: true });
        } else {
          setSearchParams({ tab: tabId }, { replace: true });
        }
      }
    },
    [navigate, setSearchParams, tabs]
  );

  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('schoolConfiguration.title', 'School Configuration')}
        subtitle={t(
          'schoolConfiguration.subtitle',
          'Manage school structure, departments, staff designations, classes, clubs, and dormitories'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="indigo"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default SchoolConfigurationPage;
