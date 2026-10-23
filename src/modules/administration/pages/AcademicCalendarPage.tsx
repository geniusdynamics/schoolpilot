// ABOUTME: Hub page for academic calendar management
// ABOUTME: Consolidates academic years, school periods, period definitions, and structures into tabbed interface

import React, { useState, useCallback } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  CalendarDaysIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  PuzzlePieceIcon,
} from '@/components/ui/icons';
import { AcademicYearsContent } from './AcademicYearsPage';
import { SchoolPeriodsContent } from './SchoolPeriodsPage';
import { AcademicPeriodDefinitionsContent } from './AcademicPeriodDefinitionsPage';
import { AcademicStructureContent } from './AcademicStructurePage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const AcademicCalendarPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'academic-years',
      label: t('academicYears.title', 'Academic Years'),
      icon: <CalendarDaysIcon className="w-4 h-4" />,
      component: <AcademicYearsContent />,
    },
    {
      id: 'school-periods',
      label: t('schoolPeriods.title', 'School Periods'),
      icon: <ClockIcon className="w-4 h-4" />,
      component: <SchoolPeriodsContent />,
    },
    {
      id: 'period-definitions',
      label: t('periodDefinitions.title', 'Period Definitions'),
      icon: <DocumentDuplicateIcon className="w-4 h-4" />,
      component: <AcademicPeriodDefinitionsContent />,
    },
    {
      id: 'structure',
      label: t('academicStructure.title', 'Structures'),
      icon: <PuzzlePieceIcon className="w-4 h-4" />,
      component: <AcademicStructureContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'academic-years';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'academic-years') {
        navigate('/administration/academic-calendar', { replace: true });
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
        title={t('academicCalendar.title', 'Academic Calendar')}
        info={t(
          'academicCalendar.subtitle',
          'Manage academic years, school periods, period definitions, and year structures'
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
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

const AcademicCalendarPageWithRepository = withCanonicalRepository(AcademicCalendarPage);
export default AcademicCalendarPageWithRepository;

