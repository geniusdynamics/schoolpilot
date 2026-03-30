
import React from 'react';
import { BriefcaseIcon, UsersIcon, ListBulletIcon, CalendarDaysIcon, CogIcon, WalletIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; 
import Spinner from '@/components/ui/Spinner';
import { ChartData } from '@/types';
import DonutChart from '@/components/ui/DonutChart'; 
import ModuleDashboardShell, { DashboardMetric, DashboardPanel, DashboardNotification, DashboardQuickAction } from '@/components/ModuleDashboardShell';

const HRDashboardPage: React.FC = () => {
  const { 
    staff, 
    payrollPeriods,
    payrollItemTypes,
    staffSalarySettings,
    loading 
  } = useAppData(); 

  const pageIsLoading = loading.staff || loading.payrollPeriods || loading.payrollItemTypes || loading.staffSalarySettings;

  if (pageIsLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }
  
  const employmentTypeCounts = (staff || []).reduce<Record<string, number>>((accumulator: Record<string, number>, member: any) => {
    const key = String(member.employment_type || member.employmentType || member.contract_type || 'Unspecified');
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const staffByEmploymentTypeData: ChartData[] = Object.entries(employmentTypeCounts)
    .map(([name, value]) => ({ name, value }))
    .filter((entry) => entry.value > 0);

  const metrics: DashboardMetric[] = [
    { key: 'staff', label: 'Total Staff', value: staff.length, icon: <UsersIcon className="h-6 w-6 text-cyan-700" /> },
    { key: 'payroll-periods', label: 'Payroll Periods Defined', value: payrollPeriods.length, icon: <CalendarDaysIcon className="h-6 w-6 text-indigo-700" /> },
    { key: 'payroll-items', label: 'Payroll Item Types', value: payrollItemTypes.length, icon: <ListBulletIcon className="h-6 w-6 text-emerald-700" /> },
    { key: 'salary-settings', label: 'Staff with Salary Settings', value: staffSalarySettings.length, icon: <WalletIcon className="h-6 w-6 text-violet-700" /> },
  ];

  const quickActions: DashboardQuickAction[] = [
    { key: 'manage-staff', label: 'Manage Staff', to: '/administration/staff', icon: <UsersIcon className="h-5 w-5" /> },
    { key: 'payroll-periods', label: 'Payroll Periods', to: '/hr/payroll-periods', icon: <CalendarDaysIcon className="h-5 w-5" /> },
    { key: 'salary-settings', label: 'Salary Settings', to: '/hr/salary-settings', icon: <CogIcon className="h-5 w-5" /> },
  ];

  const charts: DashboardPanel[] = staffByEmploymentTypeData.length > 0
    ? [{
      key: 'staff-by-employment-type',
      title: 'Staff by Employment Type',
      content: <DonutChart data={staffByEmploymentTypeData} title="" innerRadius="50%" outerRadius="70%" />,
    }]
    : [];

  const notifications: DashboardNotification[] = [
    {
      id: 'salary-coverage',
      title: 'Salary Settings Coverage',
      message: `${staffSalarySettings.length} of ${staff.length} staff members have salary settings.`,
      severity: staff.length > 0 && staffSalarySettings.length < staff.length ? 'warning' : 'normal',
    },
  ];

  return (
    <ModuleDashboardShell
      title="Human Resources Dashboard"
      subtitle="Manage staffing, payroll configuration, and compensation readiness with live operational data."
      heroIcon={<BriefcaseIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      charts={charts}
      notifications={notifications}
    />
  );
};

export default HRDashboardPage;
