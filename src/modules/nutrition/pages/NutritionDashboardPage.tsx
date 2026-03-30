import React from 'react';
import { CakeIcon, UsersIcon, ListBulletIcon, BuildingStorefrontIcon, WalletIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { StudentMealPlanStatus, ChartData } from '@/types';
import DonutChart from '@/components/ui/DonutChart';
import ModuleDashboardShell, { DashboardMetric, DashboardPanel, DashboardNotification, DashboardQuickAction } from '@/components/ModuleDashboardShell';

const NutritionDashboardPage: React.FC = () => {
  const { 
    mealPlans, 
    studentMealPlans, 
    menus, 
    merchants, 
    studentWallets,
    loading 
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
  const totalMenusCreated = (menus || []).length;
  const activeMerchants = (merchants || []).length; 
  const aggregateWalletBalance = (studentWallets || []).reduce((sum, wallet) => sum + wallet.balance, 0);


  const studentMealPlanStatusData: ChartData[] = Object.values(StudentMealPlanStatus).map(status => ({
    name: status,
    value: (studentMealPlans || []).filter(smp => smp.status === status).length
  })).filter(d => d.value > 0);


  const metrics: DashboardMetric[] = [
    { key: 'meal-plans', label: 'Total Meal Plans', value: totalMealPlans, icon: <ListBulletIcon className="h-6 w-6 text-orange-700" /> },
    { key: 'active-assignment', label: 'Active Meal Assignments', value: activeStudentAssignments, icon: <UsersIcon className="h-6 w-6 text-blue-700" /> },
    { key: 'menus', label: 'Total Menus Created', value: totalMenusCreated, icon: <CakeIcon className="h-6 w-6 text-rose-700" /> },
    { key: 'merchants', label: 'Active Merchants', value: activeMerchants, icon: <BuildingStorefrontIcon className="h-6 w-6 text-emerald-700" /> },
    { key: 'wallet', label: 'Total Student Wallet Balance', value: `Ksh ${aggregateWalletBalance.toFixed(2)}`, icon: <WalletIcon className="h-6 w-6 text-violet-700" /> },
  ];

  const quickActions: DashboardQuickAction[] = [
    { key: 'meal-plans', label: 'Manage Meal Plans', to: '/nutrition/meal-plans', icon: <ListBulletIcon className="h-5 w-5" /> },
    { key: 'menus', label: 'Manage Menus', to: '/nutrition/menus', icon: <CakeIcon className="h-5 w-5" /> },
    { key: 'wallet', label: 'Student Wallets', to: '/nutrition/student-wallet', icon: <WalletIcon className="h-5 w-5" /> },
    { key: 'consumption', label: 'Log Consumption', to: '/nutrition/meal-consumption-log', icon: <UsersIcon className="h-5 w-5" /> },
  ];

  const charts: DashboardPanel[] = studentMealPlanStatusData.length > 0
    ? [{ key: 'meal-plan-status', title: 'Student Meal Plan Assignment Statuses', content: <DonutChart data={studentMealPlanStatusData} title="" /> }]
    : [];

  const notifications: DashboardNotification[] = [
    {
      id: 'wallet-balance',
      title: 'Wallet Exposure',
      message: `Current aggregate student wallet balance is Ksh ${aggregateWalletBalance.toFixed(2)}.`,
      severity: aggregateWalletBalance === 0 ? 'warning' : 'normal',
    },
  ];

  return (
    <ModuleDashboardShell
      title="Nutrition & Wallet Dashboard"
      subtitle="Track meal plans, consumption assignments, merchant readiness, and student wallet balances in one view."
      heroIcon={<CakeIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      charts={charts}
      notifications={notifications}
    />
  );
};

export default NutritionDashboardPage;
