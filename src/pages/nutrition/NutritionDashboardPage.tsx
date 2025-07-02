import React from 'react';
import Card from '../../components/ui/Card';
import { CakeIcon, UsersIcon, ListBulletIcon, BuildingStorefrontIcon, WalletIcon, IconProps } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';
import { StudentMealPlanStatus, ChartData, StudentWallet, Merchant, StudentMealPlan } from '../../types';
import DonutChart from '../../components/ui/DonutChart';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card className="shadow-md">
    <div className="flex items-center p-4">
      <div className="p-3 rounded-full bg-orange-100 text-orange-600">
        {React.cloneElement(icon as React.ReactElement<IconProps>, { className: "w-7 h-7" })}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </Card>
);

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

  const totalMealPlans = mealPlans.length;
  const activeStudentAssignments = (studentMealPlans as StudentMealPlan[]).filter(smp => smp.status === StudentMealPlanStatus.ACTIVE).length;
  const totalMenusCreated = menus.length;
  const activeMerchants = (merchants as Merchant[]).length; 
  const aggregateWalletBalance = (studentWallets as StudentWallet[]).reduce((sum, wallet) => sum + wallet.balance, 0);


  const studentMealPlanStatusData: ChartData[] = Object.values(StudentMealPlanStatus).map(status => ({
    name: status,
    value: (studentMealPlans as StudentMealPlan[]).filter(smp => smp.status === status).length
  })).filter(d => d.value > 0);


  return (
    <div className="space-y-6">
      <Card title="Nutrition & Wallet Dashboard" className="bg-white shadow-xl">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
            <StatCard title="Total Meal Plans" value={totalMealPlans} icon={<ListBulletIcon />} />
            <StatCard title="Active Meal Assignments" value={activeStudentAssignments} icon={<UsersIcon />} />
            <StatCard title="Total Menus Created" value={totalMenusCreated} icon={<CakeIcon />} />
            <StatCard title="Active Merchants" value={activeMerchants} icon={<BuildingStorefrontIcon />} />
            <StatCard title="Total Student Wallet Balance" value={`Ksh ${aggregateWalletBalance.toFixed(2)}`} icon={<WalletIcon />} />
          </div>

          <Card title="Quick Links" className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                <Button as={Link} to="/nutrition/meal-plans" variant="outline" leftIcon={<ListBulletIcon className="w-5 h-5"/>}>
                    Manage Meal Plans
                </Button>
                <Button as={Link} to="/nutrition/menus" variant="outline" leftIcon={<CakeIcon className="w-5 h-5"/>}>
                    Manage Menus
                </Button>
                <Button as={Link} to="/nutrition/student-wallet" variant="outline" leftIcon={<WalletIcon className="w-5 h-5"/>}>
                    Student Wallets
                </Button>
                <Button as={Link} to="/nutrition/meal-consumption-log" variant="outline" leftIcon={<UsersIcon className="w-5 h-5"/>}>
                    Log Consumption
                </Button>
            </div>
          </Card>

          {studentMealPlanStatusData.length > 0 && (
            <Card title="Student Meal Plan Assignment Statuses" className="mt-6">
              <DonutChart data={studentMealPlanStatusData} title=""/>
            </Card>
          )}

          <div className="text-center py-8 mt-6">
            <CakeIcon className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Meals & Student Wallet Overview</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Manage school meal plans, menus, meal consumption, and student pocket money accounts.
            </p>
            <div className="mt-6">
              <span className="inline-block bg-sky-100 text-sky-700 text-sm font-semibold px-3 py-1 rounded-full">
                Dashboard enhanced with key stats, charts, and quick links.
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NutritionDashboardPage;