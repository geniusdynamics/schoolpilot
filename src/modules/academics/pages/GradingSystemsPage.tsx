// ABOUTME: Hub page for grading management
// ABOUTME: Consolidates grading schemes, education systems, and system configuration into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ListBulletIcon,
  ChartBarIcon,
  CogIcon,
} from '@/components/ui/icons';
import { GradingSchemesContent } from './GradingSchemesPage';
import { EducationSystemsPageContent } from './EducationSystemsPage';
import { EducationSystemConfigPageContent } from './EducationSystemConfigPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const GradingSystemsPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'grading-schemes',
      label: t('gradingSchemes.title', 'Grading Schemes'),
      icon: <ListBulletIcon className="w-4 h-4" />,
      component: <GradingSchemesContent />,
    },
    {
      id: 'education-systems',
      label: t('educationSystems.title', 'Education Systems'),
      icon: <ChartBarIcon className="w-4 h-4" />,
      component: <EducationSystemsPageContent />,
    },
    {
      id: 'system-config',
      label: t('educationSystemConfig.title', 'System Config'),
      icon: <CogIcon className="w-4 h-4" />,
      component: <EducationSystemConfigPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'grading-schemes';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
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
        subtitle={t(
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
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default GradingSystemsPage;
