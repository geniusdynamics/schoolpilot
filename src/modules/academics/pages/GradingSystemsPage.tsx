// ABOUTME: Hub page for grading management
// ABOUTME: Consolidates grading schemes, education systems, and system configuration into tabbed interface

import React, { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ListBulletIcon,
  ChartBarIcon,
  CogIcon,
} from '@/components/ui/icons';
import { listAvailablePacks } from '@/components/setup/packs/packLibrary';

import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { GradingScalesTab } from './grading/GradingScalesTab';
import { AssessmentSchemesTab } from './grading/AssessmentSchemesTab';
import { SystemConfigTab } from './grading/SystemConfigTab';
import { packDeclarationsOf } from './grading/provenance';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const GradingSystemsHub: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // The packs the installation ships; a programme's pin resolves to the codes its pack owns.
  const packs = useMemo(() => packDeclarationsOf(listAvailablePacks()), []);

  const tabs: HubTab[] = [
    {
      id: 'grading-schemes',
      label: t('gradingSchemes.title', 'Grading Schemes'),
      icon: <ListBulletIcon className="w-4 h-4" />,
      component: <GradingScalesTab packs={packs} />,
    },
    {
      id: 'education-systems',
      label: t('educationSystems.title', 'Education Systems'),
      icon: <ChartBarIcon className="w-4 h-4" />,
      component: <AssessmentSchemesTab packs={packs} />,
    },
    {
      id: 'system-config',
      label: t('educationSystemConfig.title', 'System Config'),
      icon: <CogIcon className="w-4 h-4" />,
      component: <SystemConfigTab packs={packs} />,
    },
  ];

  const activeTab = searchParams.get('tab') || 'grading-schemes';

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (tabId === 'grading-schemes') {
        navigate('/academics/grading-systems', { replace: true });
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
        title={t('grading.title', 'Grading & Systems')}
        info={t(
          'grading.subtitle',
          'Manage grading schemes, education systems, and system configurations'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="orange"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

const GradingSystemsPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <GradingSystemsHub />
  </CanonicalRepositoryProvider>
);

export default GradingSystemsPage;
