// ABOUTME: Hub page for school organizational structure
// ABOUTME: Consolidates departments, designations, and clubs into a tabbed interface (3 tabs)

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  BuildingOffice2Icon,
  IdentificationIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { DepartmentsContent } from './DepartmentsPage';
import { DesignationsContent } from './DesignationsPage';
import { ClubsContent } from './ClubsPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const SchoolOrganizationHubPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'departments',
      label: t('departments.management', 'Departments'),
      icon: <BuildingOffice2Icon className="w-4 h-4" />,
      component: <DepartmentsContent />,
    },
    {
      id: 'designations',
      label: t('designations.management', 'Designations'),
      icon: <IdentificationIcon className="w-4 h-4" />,
      component: <DesignationsContent />,
    },
    {
      id: 'clubs',
      label: t('clubs.title', 'Clubs & Societies'),
      icon: <UsersIcon className="w-4 h-4" />,
      component: <ClubsContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'departments';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'departments') {
        navigate('/administration/organization', { replace: true });
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
        title={t('schoolOrganization.title', 'School Organization')}
        subtitle={t(
          'schoolOrganization.subtitle',
          'Manage departments, designations, and clubs & societies'
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

export default SchoolOrganizationHubPage;
