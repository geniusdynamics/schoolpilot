// ABOUTME: Hub page for meal planning
// ABOUTME: Consolidates meal plans, menus, meal consumption log, and student meal assignments into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
} from '@/components/ui/icons';
import { MealPlansPageContent } from './MealPlansPage';
import { MenusPageContent } from './MenusPage';
import { MealConsumptionLogPageContent } from './MealConsumptionLogPage';
import { StudentMealAssignmentsPageContent } from './StudentMealAssignmentsPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const MealPlanningHubPage: React.FC = () => {
  const { t } = useTranslation('nutrition');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'meal-plans',
      label: t('mealPlans.title', 'Meal Plans'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <MealPlansPageContent />,
    },
    {
      id: 'menus',
      label: t('menus.title', 'Menus'),
      icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
      component: <MenusPageContent />,
    },
    {
      id: 'consumption-log',
      label: t('mealConsumptionLog.title', 'Consumption Log'),
      icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
      component: <MealConsumptionLogPageContent />,
    },
    {
      id: 'assignments',
      label: t('studentMealAssignments.title', 'Assignments'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: <StudentMealAssignmentsPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'meal-plans';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'meal-plans') {
        navigate('/nutrition/meal-planning', { replace: true });
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
        title={t('mealPlanning.title', 'Meal Planning')}
        info={t(
          'mealPlanning.subtitle',
          'Manage meal plans, menus, consumption logs, and student assignments'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="green"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default MealPlanningHubPage;

