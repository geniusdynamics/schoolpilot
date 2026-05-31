const fs = require('fs');

const portalHub = `// ABOUTME: Portal hub page with tabbed navigation
// ABOUTME: Consolidates all portal views into a single hub with tabs

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  HomeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  MegaphoneIcon,
  UserCircleIcon,
} from '@/components/ui/icons';
import { PortalDashboardContent } from './PortalDashboardPage';
import { PortalAttendanceContent } from './PortalAttendancePage';
import { PortalResultsContent } from './PortalResultsPage';
import { PortalFeesContent } from './PortalFeesPage';
import { PortalAnnouncementsContent } from './PortalAnnouncementsPage';
import { PortalProfileContent } from './PortalProfilePage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const PortalHubPage: React.FC = () => {
  const { t } = useTranslation('portal');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'dashboard',
      label: t('navigation.dashboard', 'Dashboard'),
      icon: <HomeIcon className="w-4 h-4" />,
      component: <PortalDashboardContent />,
    },
    {
      id: 'attendance',
      label: t('navigation.attendance', 'Attendance'),
      icon: <CalendarDaysIcon className="w-4 h-4" />,
      component: <PortalAttendanceContent />,
    },
    {
      id: 'results',
      label: t('navigation.results', 'Results'),
      icon: <ChartBarIcon className="w-4 h-4" />,
      component: <PortalResultsContent />,
    },
    {
      id: 'fees',
      label: t('navigation.fees', 'Fees'),
      icon: <CurrencyDollarIcon className="w-4 h-4" />,
      component: <PortalFeesContent />,
    },
    {
      id: 'announcements',
      label: t('navigation.announcements', 'Announcements'),
      icon: <MegaphoneIcon className="w-4 h-4" />,
      component: <PortalAnnouncementsContent />,
    },
    {
      id: 'profile',
      label: t('navigation.profile', 'Profile'),
      icon: <UserCircleIcon className="w-4 h-4" />,
      component: <PortalProfileContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'dashboard') {
        navigate('/portal', { replace: true });
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
        title={t('portal.title', 'Student Portal')}
        subtitle={t('portal.subtitle', 'Access your academic information, fees, results, and more')}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="blue"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default PortalHubPage;
`;

fs.writeFileSync('src/modules/portal/pages/PortalHubPage.tsx', portalHub);
console.log('Created PortalHubPage.tsx');

// Create pages/index.ts
const indexTs = `// ABOUTME: Portal pages barrel export
// ABOUTME: Centralizes all portal page exports for the module definition

export { default as PortalHubPage } from './PortalHubPage';
export { PortalDashboardContent } from './PortalDashboardPage';
export { PortalAttendanceContent } from './PortalAttendancePage';
export { PortalResultsContent } from './PortalResultsPage';
export { PortalFeesContent } from './PortalFeesPage';
export { PortalAnnouncementsContent } from './PortalAnnouncementsPage';
export { PortalProfileContent } from './PortalProfilePage';
`;

fs.writeFileSync('src/modules/portal/pages/index.ts', indexTs);
console.log('Created portal pages/index.ts');
