import React from 'react';
import { CakeIcon, UsersIcon, ListBulletIcon, BuildingStorefrontIcon, WalletIcon, ArrowRightIcon, ClockIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { StudentMealPlanStatus, ChartData } from '@/types';
import DonutChart from '@/components/ui/DonutChart';
import BarChart from '@/components/ui/BarChart';
import Card from '@/components/ui/Card';
import ModuleDashboardShell, {
  DashboardMetric,
  DashboardPanel,
  DashboardNotification,
  DashboardQuickAction,
  DashboardAlertBanner,
} from '@/components/ModuleDashboardShell';

export const NutritionDashboardPageContent: React.FC = () => {
  const {
    mealPlans,
    studentMealPlans,
    menus,
    merchants,
    studentWallets,
    mealConsumptionLogs,
    students,
    loading,
  } = useAppData();

  if (loading.all || loading.mealPlans || loading.studentMealPlans || loading.menus || loading.merchants || loading.studentWallets) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading Nutrition Data...</span>
      </div>
    );
  }

  const totalMealPlans = (mealPlans || []).length;
  const activeStudentAssignments = (studentMealPlans || []).filter(smp => smp.status === StudentMealPlanStatus.ACTIVE).length;
  const inactiveAssignments = (studentMealPlans || []).filter(smp => smp.status !== StudentMealPlanStatus.ACTIVE).length;
  const totalMenusCreated = (menus || []).length;
  const activeMerchants = (merchants || []).length;
  const inactiveMerchants = (merchants || []).filter((m: any) => !m.active).length;
  const aggregateWalletBalance = (studentWallets || []).reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
  const zeroBalanceWallets = (studentWallets || []).filter(w => w.balance === 0).length;
  const todayLogs = (mealConsumptionLogs || []).filter((log: any) => {
    const logDate = new Date(log.created_at || log.date);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length;

  const studentMealPlanStatusData: ChartData[] = Object.values(StudentMealPlanStatus).map(status => ({
    name: status,
    value: (studentMealPlans || []).filter(smp => smp.status === status).length,
  })).filter(d => d.value > 0);

  // Wallet balance distribution for chart
  const walletRanges = [
    { name: 'Zero', value: (studentWallets || []).filter(w => w.balance === 0).length },
    { name: '1-500', value: (studentWallets || []).filter(w => w.balance > 0 && w.balance <= 500).length },
    { name: '501-1000', value: (studentWallets || []).filter(w => w.balance > 500 && w.balance <= 1000).length },
    { name: '1000+', value: (studentWallets || []).filter(w => w.balance > 1000).length },
  ].filter(d => d.value > 0);

  // Enhanced metrics with trends and color schemes
  const metrics: DashboardMetric[] = [
    {
      key: 'meal-plans',
      label: 'Meal Plans',
      value: totalMealPlans,
      icon: <ListBulletIcon className="h-6 w-6" />,
      trend: 'up',
      trendValue: `${activeStudentAssignments} active`,
      to: '/nutrition/meal-plans',
      colorScheme: 'orange',
      description: 'Available meal options',
    },
    {
      key: 'active-assignment',
      label: 'Active Assignments',
      value: activeStudentAssignments,
      icon: <UsersIcon className="h-6 w-6" />,
      trend: activeStudentAssignments > 0 ? 'up' : 'down',
      trendValue: `${inactiveAssignments} inactive`,
      to: '/nutrition/student-meal-plans',
      colorScheme: 'emerald',
      description: 'Students with meal plans',
    },
    {
      key: 'menus',
      label: 'Menus',
      value: totalMenusCreated,
      icon: <CakeIcon className="h-6 w-6" />,
      trend: totalMenusCreated > 0 ? 'up' : 'neutral',
      trendValue: totalMenusCreated > 0 ? 'Configured' : 'Need setup',
      to: '/nutrition/menus',
      colorScheme: 'rose',
      description: 'Created meal menus',
    },
    {
      key: 'merchants',
      label: 'Merchants',
      value: activeMerchants,
      icon: <BuildingStorefrontIcon className="h-6 w-6" />,
      trend: inactiveMerchants > 0 ? 'down' : 'up',
      trendValue: inactiveMerchants > 0 ? `${inactiveMerchants} inactive` : 'All active',
      to: '/nutrition/merchants',
      colorScheme: inactiveMerchants > 0 ? 'amber' : 'cyan',
      description: 'Food service providers',
    },
  ];

  // Alert banners
  const alertBanners: DashboardAlertBanner[] = [
    {
      type: 'overdue',
      count: zeroBalanceWallets,
      label: 'Empty Wallets',
      description: 'Students need top-up',
      to: '/nutrition/student-wallet',
    },
    {
      type: 'task',
      count: inactiveAssignments,
      label: 'Inactive Meal Plans',
      description: 'Need reactivation',
      to: '/nutrition/student-meal-plans',
    },
    {
      type: 'approval',
      count: todayLogs,
      label: "Today's Meals",
      description: 'Consumption logged',
      to: '/nutrition/meal-consumption-log',
    },
    {
      type: 'message',
      count: activeMerchants,
      label: 'Active Merchants',
      description: 'Service providers',
      to: '/nutrition/merchants',
    },
  ];

  // Enhanced quick actions with descriptions
  const quickActions: DashboardQuickAction[] = [
    {
      key: 'meal-plans',
      label: 'Manage Meal Plans',
      description: 'Configure meal options',
      to: '/nutrition/meal-plans',
      icon: <ListBulletIcon className="h-5 w-5" />,
      colorScheme: 'orange',
    },
    {
      key: 'assign-meals',
      label: 'Assign Meals',
      description: 'Assign plans to students',
      to: '/nutrition/student-meal-plans',
      icon: <UsersIcon className="h-5 w-5" />,
      colorScheme: 'emerald',
    },
    {
      key: 'menus',
      label: 'Manage Menus',
      description: 'Create meal menus',
      to: '/nutrition/menus',
      icon: <CakeIcon className="h-5 w-5" />,
      colorScheme: 'rose',
    },
    {
      key: 'merchants',
      label: 'Merchants',
      description: 'Manage food vendors',
      to: '/nutrition/merchants',
      icon: <BuildingStorefrontIcon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
    {
      key: 'wallet',
      label: 'Student Wallets',
      description: 'Manage balances',
      to: '/nutrition/student-wallet',
      icon: <WalletIcon className="h-5 w-5" />,
      colorScheme: 'violet',
    },
    {
      key: 'consumption',
      label: 'Log Consumption',
      description: 'Record meals consumed',
      to: '/nutrition/meal-consumption-log',
      icon: <CakeIcon className="h-5 w-5" />,
      colorScheme: 'amber',
    },
  ];

  // Enhanced charts
  const charts: DashboardPanel[] = [
    ...(studentMealPlanStatusData.length > 0 ? [{
      key: 'meal-plan-status',
      title: 'Meal Plan Status Distribution',
      content: <DonutChart data={studentMealPlanStatusData} title="" />,
    }] : []),
    ...(walletRanges.length > 0 ? [{
      key: 'wallet-distribution',
      title: 'Wallet Balance Distribution',
      content: <BarChart data={walletRanges} title="" />,
    }] : []),
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'wallet-balance',
      title: 'Wallet Exposure',
      message: aggregateWalletBalance === 0
        ? 'No wallet funds available. Students cannot purchase meals.'
        : `Total wallet balance: Ksh ${aggregateWalletBalance.toLocaleString()}. ${zeroBalanceWallets} students have zero balance.`,
      severity: aggregateWalletBalance === 0 ? 'high' : zeroBalanceWallets > 10 ? 'warning' : 'normal',
    },
    {
      id: 'meal-coverage',
      title: 'Meal Plan Coverage',
      message: `${activeStudentAssignments} of ${(students || []).length} students have active meal plans.`,
      severity: activeStudentAssignments < (students || []).length * 0.5 ? 'warning' : 'normal',
    },
    {
      id: 'merchant-status',
      title: 'Merchant Network',
      message: inactiveMerchants > 0
        ? `${activeMerchants} active merchants, ${inactiveMerchants} inactive.`
        : `${activeMerchants} merchants ready for meal service.`,
      severity: inactiveMerchants > activeMerchants ? 'warning' : 'normal',
    },
  ];

  // Mock recent nutrition activity
  const recentActivity = [
    { action: 'Meal consumed - Lunch', time: '10 minutes ago', type: 'consumption' },
    { action: 'Wallet top-up: Ksh 500', time: '1 hour ago', type: 'wallet' },
    { action: 'New meal plan assigned', time: '3 hours ago', type: 'assignment' },
    { action: 'Menu updated', time: '1 day ago', type: 'menu' },
  ];

  return (
    <ModuleDashboardShell
      title="Nutrition & Wallet Dashboard"
      subtitle="Track meal plans, consumption assignments, merchant readiness, and student wallet balances in one view."
      heroIcon={<CakeIcon className="h-8 w-8 text-white" />}
      accentColor="orange"
      metrics={metrics}
      alertBanners={alertBanners}
      quickActions={quickActions}
      quickNavCards={true}
      charts={charts}
      notifications={notifications}
    >
      {/* Additional Nutrition Info Panels */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Wallet Summary */}
        <Card title="Wallet Summary" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Balance</span>
              <span className="font-semibold text-violet-600">Ksh {aggregateWalletBalance.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Active Wallets</span>
              <span className="font-semibold text-emerald-600">{(studentWallets || []).length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Zero Balance</span>
              <span className="font-semibold text-rose-600">{zeroBalanceWallets}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Avg. Balance</span>
              <span className="font-semibold text-gray-900">
                Ksh {(studentWallets || []).length > 0 ? Math.round(aggregateWalletBalance / (studentWallets || []).length) : 0}
              </span>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 py-2">
                <div className={`
                  flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0
                  ${activity.type === 'consumption' ? 'bg-orange-100 text-orange-600' :
                    activity.type === 'wallet' ? 'bg-violet-100 text-violet-600' :
                    activity.type === 'assignment' ? 'bg-emerald-100 text-emerald-600' :
                    'bg-rose-100 text-rose-600'}
                `}>
                  {activity.type === 'consumption' ? <CakeIcon className="h-4 w-4" /> :
                   activity.type === 'wallet' ? <WalletIcon className="h-4 w-4" /> :
                   activity.type === 'assignment' ? <UsersIcon className="h-4 w-4" /> :
                   <CakeIcon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Overview */}
        <Card title="Quick Overview" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{activeStudentAssignments}</p>
                <p className="text-xs text-emerald-600">Active Plans</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3 text-center">
                <p className="text-2xl font-bold text-orange-700">{todayLogs}</p>
                <p className="text-xs text-orange-600">Today&apos;s Meals</p>
              </div>
            </div>
            <div className="rounded-lg bg-cyan-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-cyan-700">Meal Plan Coverage</span>
                <span className="font-bold text-cyan-700">
                  {(students || []).length > 0 ? `${Math.round((activeStudentAssignments / (students || []).length) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="w-full bg-cyan-200 rounded-full h-2 mt-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full"
                  style={{ width: `${(students || []).length > 0 ? (activeStudentAssignments / (students || []).length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg bg-violet-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-violet-700">Avg. Wallet per Student</span>
                <span className="font-bold text-violet-700">
                  Ksh {(students || []).length > 0 ? Math.round(aggregateWalletBalance / (students || []).length) : 0}
                </span>
              </div>
            </div>
            <button
              onClick={() => window.location.hash = '#/nutrition/meal-consumption-log'}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              Log Consumption <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </section>
    </ModuleDashboardShell>
  );
};
const NutritionDashboardPage: React.FC = () => (
  <div className="space-y-6">
    <NutritionDashboardPageContent />
  </div>
);

export default NutritionDashboardPage;
