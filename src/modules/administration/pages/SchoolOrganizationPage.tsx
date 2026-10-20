// ABOUTME: Hub page for school organizational structure
// ABOUTME: Consolidates departments, designations, and clubs into a tabbed interface (3 tabs)

import React from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
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
import { useHubNavigation } from '@/hooks/useHubNavigation';
import type { HubConfig } from '@/core/types/hub';

const hubConfig: HubConfig = {
  module: 'administration',
  titleKey: 'schoolOrganization.title',
  titleDefault: 'School Organization',
  subtitleKey: 'schoolOrganization.subtitle',
  subtitleDefault: 'Manage departments, designations, and clubs & societies',
  basePath: '/administration/organization',
  defaultTab: 'departments',
  colorScheme: 'indigo',
  tabs: [
    { id: 'departments', label: 'Departments', icon: <BuildingOffice2Icon className="w-4 h-4" />, component: DepartmentsContent },
    { id: 'designations', label: 'Designations', icon: <IdentificationIcon className="w-4 h-4" />, component: DesignationsContent },
    { id: 'clubs', label: 'Clubs & Societies', icon: <UsersIcon className="w-4 h-4" />, component: ClubsContent },
  ],
};

const SchoolOrganizationPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const { activeTab, handleTabChange, tabs, ActiveComponent } = useHubNavigation(hubConfig);

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t(hubConfig.titleKey, hubConfig.titleDefault)}
        subtitle={t(hubConfig.subtitleKey, hubConfig.subtitleDefault)}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme={hubConfig.colorScheme}
      >
        <ActiveComponent />
      </PageHeaderWithTabs>
    </div>
  );
};

const SchoolOrganizationPageWithRepository = withCanonicalRepository(SchoolOrganizationPage);
export default SchoolOrganizationPageWithRepository;
