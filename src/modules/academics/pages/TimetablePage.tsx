// ABOUTME: Hub page for timetable management
// ABOUTME: Consolidates timetable periods and timetable entries into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ClockIcon,
  CalendarDaysIcon,
} from '@/components/ui/icons';
import { TimetablePeriodsContent } from './TimetablePeriodsPage';
import { TimetableEntriesContent } from './TimetableEntriesPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const TimetablePage: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'periods',
      label: t('timetablePeriods.title', 'Periods'),
      icon: <ClockIcon className="w-4 h-4" />,
      component: <TimetablePeriodsContent />,
    },
    {
      id: 'entries',
      label: t('timetableEntries.title', 'Entries'),
      icon: <CalendarDaysIcon className="w-4 h-4" />,
      component: <TimetableEntriesContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'periods';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'periods') {
        navigate('/academics/timetable', { replace: true });
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
        title={t('timetable.title', 'Timetable Management')}
        subtitle={t(
          'timetable.subtitle',
          'Define timetable periods and manage class schedule entries'
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

export default TimetablePage;
