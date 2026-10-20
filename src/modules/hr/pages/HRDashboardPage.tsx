import React from 'react';
import { BriefcaseIcon, UsersIcon, ListBulletIcon, CalendarDaysIcon, CogIcon, WalletIcon, ArrowRightIcon, ClockIcon, DocumentTextIcon, BanknotesIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { ChartData } from '@/types';
import DonutChart from '@/components/ui/DonutChart';
import Card from '@/components/ui/Card';
import ModuleDashboardShell, {
  DashboardMetric,
  DashboardPanel,
  DashboardNotification,
  DashboardQuickAction,
  DashboardAlertBanner,
} from '@/components/ModuleDashboardShell';

export const HRDashboardPageContent: React.FC = () => {
  const {
    staff,
    payrollPeriods,
    payrollItemTypes,
    staffSalarySettings,
    payslips,
    departments,
    loading,
  } = useAppData();

  const pageIsLoading = loading.staff || loading.payrollPeriods || loading.payrollItemTypes || loading.staffSalarySettings || loading.payslips;

  if (pageIsLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  // Employment type distribution
  const employmentTypeCounts = (staff || []).reduce<Record<string, number>>((accumulator: Record<string, number>, member: any) => {
    const key = String(member.employment_type || member.employmentType || member.contract_type || 'Unspecified');
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const staffByEmploymentTypeData: ChartData[] = Object.entries(employmentTypeCounts)
    .map(([name, value]) => ({ name, value }))
    .filter((entry) => entry.value > 0);

  // Department distribution
  const staffByDepartmentData: ChartData[] = (departments || [])
    .map(dept => ({
      name: dept.name,
      value: (staff || []).filter((s: any) => s.department_id === dept.id).length,
    }))
    .filter(d => d.value > 0);

  // Alert calculations
  const staffWithoutSalary = (staff || []).filter((s: any) =>
    !(staffSalarySettings || []).some((sss: any) => sss.staff_id === s.id)
  ).length;
  const unprocessedPayslips = (payslips || []).filter((p: any) => p.status === 'draft' || p.status === 'pending').length;
  const activePayrollPeriods = (payrollPeriods || []).filter((pp: any) => pp.status === 'active').length;

  // Enhanced metrics with trends and color schemes
  const metrics: DashboardMetric[] = [
    {
      key: 'staff',
      label: 'Total Staff',
      value: (staff || []).length.toLocaleString(),
      icon: <UsersIcon className="h-6 w-6" />,
      trend: 'up',
      trendValue: '+2',
      to: '/administration/staff',
      colorScheme: 'indigo',
      description: 'Active employees',
    },
    {
      key: 'payroll-periods',
      label: 'Payroll Periods',
      value: (payrollPeriods || []).length,
      icon: <CalendarDaysIcon className="h-6 w-6" />,
      trend: activePayrollPeriods > 0 ? 'up' : 'neutral',
      trendValue: activePayrollPeriods > 0 ? `${activePayrollPeriods} active` : 'None active',
      to: '/hr/payroll-periods',
      colorScheme: 'cyan',
      description: 'Defined pay periods',
    },
    {
      key: 'payroll-items',
      label: 'Payroll Items',
      value: (payrollItemTypes || []).length,
      icon: <ListBulletIcon className="h-6 w-6" />,
      trend: (payrollItemTypes || []).length > 0 ? 'up' : 'down',
      trendValue: (payrollItemTypes || []).length > 0 ? 'Configured' : 'Need setup',
      to: '/hr/payroll-item-types',
      colorScheme: 'emerald',
      description: 'Earnings & deductions',
    },
    {
      key: 'salary-settings',
      label: 'Salary Coverage',
      value: `${(staffSalarySettings || []).length}/${(staff || []).length}`,
      icon: <WalletIcon className="h-6 w-6" />,
      trend: staffWithoutSalary > 0 ? 'down' : 'up',
      trendValue: staffWithoutSalary > 0 ? `${staffWithoutSalary} missing` : 'Complete',
      to: '/hr/salary-settings',
      colorScheme: staffWithoutSalary > 0 ? 'amber' : 'violet',
      description: 'Staff with salary setup',
    },
  ];

  // Alert banners
  const alertBanners: DashboardAlertBanner[] = [
    {
      type: 'overdue',
      count: staffWithoutSalary,
      label: 'Missing Salary Settings',
      description: 'Staff need salary configuration',
      to: '/hr/salary-settings',
    },
    {
      type: 'task',
      count: unprocessedPayslips,
      label: 'Pending Payslips',
      description: 'Awaiting processing',
      to: '/hr/payslips',
    },
    {
      type: 'approval',
      count: activePayrollPeriods,
      label: 'Active Periods',
      description: 'Current pay cycles',
      to: '/hr/payroll-periods',
    },
    {
      type: 'message',
      count: (payrollItemTypes || []).length,
      label: 'Payroll Items',
      description: 'Earnings & deductions',
      to: '/hr/payroll-item-types',
    },
  ];

  // Enhanced quick actions with descriptions
  const quickActions: DashboardQuickAction[] = [
    {
      key: 'manage-staff',
      label: 'Manage Staff',
      description: 'View and edit staff records',
      to: '/administration/staff',
      icon: <UsersIcon className="h-5 w-5" />,
      colorScheme: 'indigo',
    },
    {
      key: 'payroll-periods',
      label: 'Payroll Periods',
      description: 'Configure pay cycles',
      to: '/hr/payroll-periods',
      icon: <CalendarDaysIcon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
    {
      key: 'salary-settings',
      label: 'Salary Settings',
      description: 'Set up staff compensation',
      to: '/hr/salary-settings',
      icon: <CogIcon className="h-5 w-5" />,
      colorScheme: 'violet',
    },
    {
      key: 'payroll-items',
      label: 'Payroll Items',
      description: 'Manage earnings & deductions',
      to: '/hr/payroll-item-types',
      icon: <ListBulletIcon className="h-5 w-5" />,
      colorScheme: 'emerald',
    },
    {
      key: 'payslips',
      label: 'Payslips',
      description: 'Generate and view payslips',
      to: '/hr/payslips',
      icon: <DocumentTextIcon className="h-5 w-5" />,
      colorScheme: 'blue',
    },
    {
      key: 'payroll-process',
      label: 'Process Payroll',
      description: 'Run monthly payroll',
      to: '/hr/payroll-periods',
      icon: <BanknotesIcon className="h-5 w-5" />,
      colorScheme: 'amber',
    },
  ];

  // Enhanced charts
  const charts: DashboardPanel[] = [
    ...(staffByEmploymentTypeData.length > 0 ? [{
      key: 'staff-by-employment-type',
      title: 'Staff by Employment Type',
      content: <DonutChart data={staffByEmploymentTypeData} title="" innerRadius="50%" outerRadius="70%" />,
    }] : []),
    ...(staffByDepartmentData.length > 0 ? [{
      key: 'staff-by-department',
      title: 'Staff by Department',
      content: <DonutChart data={staffByDepartmentData} title="" />,
    }] : []),
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'salary-coverage',
      title: 'Salary Settings Coverage',
      message: staffWithoutSalary > 0
        ? `${staffWithoutSalary} staff members need salary configuration.`
        : 'All staff members have salary settings configured.',
      severity: staffWithoutSalary > 0 ? 'warning' : 'normal',
    },
    {
      id: 'payslip-status',
      title: 'Payslip Processing',
      message: unprocessedPayslips > 0
        ? `${unprocessedPayslips} payslips pending processing.`
        : 'All payslips processed for current period.',
      severity: unprocessedPayslips > 5 ? 'warning' : 'normal',
    },
  ];

  // Mock recent HR activity
  const recentActivity = [
    { action: 'New payslip generated', time: '1 hour ago', type: 'payslip' },
    { action: 'Salary settings updated', time: '3 hours ago', type: 'salary' },
    { action: 'Payroll period closed', time: '1 day ago', type: 'payroll' },
    { action: 'New staff member added', time: '2 days ago', type: 'staff' },
  ];

  return (
    <ModuleDashboardShell
      title="Human Resources Dashboard"
      subtitle="Manage staffing, payroll configuration, and compensation readiness with live operational data."
      heroIcon={<BriefcaseIcon className="h-8 w-8 text-white" />}
      accentColor="indigo"
      metrics={metrics}
      alertBanners={alertBanners}
      quickActions={quickActions}
      quickNavCards={true}
      charts={charts}
      notifications={notifications}
    >
      {/* Additional HR Info Panels */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Payroll Summary */}
        <Card title="Payroll Summary" className="border-slate-200 bg-surface-card shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-surface-muted-fg">Payroll Periods</span>
              <span className="font-semibold text-surface-foreground">{(payrollPeriods || []).length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-surface-muted-fg">Active Periods</span>
              <span className="font-semibold text-cyan-600">{activePayrollPeriods}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-surface-muted-fg">Payroll Item Types</span>
              <span className="font-semibold text-emerald-600">{(payrollItemTypes || []).length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-surface-muted-fg">Generated Payslips</span>
              <span className="font-semibold text-violet-600">{(payslips || []).length}</span>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" className="border-slate-200 bg-surface-card shadow-sm">
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 py-2">
                <div className={`
                  flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0
                  ${activity.type === 'payslip' ? 'bg-violet-100 text-violet-600' :
                    activity.type === 'salary' ? 'bg-emerald-100 text-emerald-600' :
                    activity.type === 'payroll' ? 'bg-cyan-100 text-cyan-600' :
                    'bg-indigo-100 text-indigo-600'}
                `}>
                  {activity.type === 'payslip' ? <DocumentTextIcon className="h-4 w-4" /> :
                   activity.type === 'salary' ? <WalletIcon className="h-4 w-4" /> :
                   activity.type === 'payroll' ? <CalendarDaysIcon className="h-4 w-4" /> :
                   <UsersIcon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-foreground">{activity.action}</p>
                  <p className="text-xs text-surface-muted-fg flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Overview */}
        <Card title="Quick Overview" className="border-slate-200 bg-surface-card shadow-sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-indigo-50 p-3 text-center">
                <p className="text-2xl font-bold text-indigo-700">{(staff || []).length}</p>
                <p className="text-xs text-indigo-600">Total Staff</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{Object.keys(employmentTypeCounts).length}</p>
                <p className="text-xs text-emerald-600">Employment Types</p>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700">Salary Coverage</span>
                <span className="font-bold text-amber-700">
                  {(staff || []).length > 0
                    ? `${Math.round(((staffSalarySettings || []).length / (staff || []).length) * 100)}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-2 mt-2">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{
                    width: `${(staff || []).length > 0 ? ((staffSalarySettings || []).length / (staff || []).length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-lg bg-cyan-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-cyan-700">Departments with Staff</span>
                <span className="font-bold text-cyan-700">
                  {staffByDepartmentData.length}
                </span>
              </div>
            </div>
            <button
              onClick={() => window.location.hash = '#/hr/payslips'}
              className="w-full py-2 px-4 bg-surface-accent hover:bg-gray-200 rounded-lg text-sm font-medium text-surface-foreground transition-colors flex items-center justify-center gap-2"
            >
              View Payslips <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </section>
    </ModuleDashboardShell>
  );
};
const HRDashboardPage: React.FC = () => (
  <div className="space-y-6">
    <HRDashboardPageContent />
  </div>
);

export default HRDashboardPage;
