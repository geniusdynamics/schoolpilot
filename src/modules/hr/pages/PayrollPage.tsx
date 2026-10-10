// ABOUTME: Hub page for payroll management
// ABOUTME: Consolidates item types, periods, payslips, and salary settings into tabbed interface

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  DocumentTextIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
} from '@/components/ui/icons';
import { PayrollItemTypesPageContent } from './PayrollItemTypesPage';
import { PayrollPeriodsPageContent } from './PayrollPeriodsPage';
import { PayslipsPageContent } from './PayslipsPage';
import { StaffSalarySettingsPageContent } from './StaffSalarySettingsPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  path: string;
}

export const PayrollPageContent: React.FC = () => {
  const { t } = useTranslation('hr');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = useMemo(() => [
    {
      id: 'item-types',
      label: t('payrollHub.itemTypes', 'Item Types'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <PayrollItemTypesPageContent />,
      path: '/hr/payroll',
    },
    {
      id: 'periods',
      label: t('payrollHub.periods', 'Periods'),
      icon: <CalendarDaysIcon className="w-4 h-4" />,
      component: <PayrollPeriodsPageContent />,
      path: '/hr/payroll?tab=periods',
    },
    {
      id: 'payslips',
      label: t('payrollHub.payslips', 'Payslips'),
      icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
      component: <PayslipsPageContent />,
      path: '/hr/payroll?tab=payslips',
    },
    {
      id: 'salary-settings',
      label: t('payrollHub.salarySettings', 'Salary Settings'),
      icon: <CurrencyDollarIcon className="w-4 h-4" />,
      component: <StaffSalarySettingsPageContent />,
      path: '/hr/payroll?tab=salary-settings',
    },
  ], [t]);

  const activeTabFromUrl = searchParams.get('tab') || 'item-types';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        if (tabId === 'item-types') {
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
        title={t('payrollHub.title', 'Payroll Management')}
        subtitle={t(
          'payrollHub.subtitle',
          'Manage payroll item types, periods, payslips, and staff salary settings'
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
const PayrollPage: React.FC = () => (
  <div className="space-y-6">
    <PayrollPageContent />
  </div>
);

export default PayrollPage;

