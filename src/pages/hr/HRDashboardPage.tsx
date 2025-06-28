
import React from 'react';
import Card from '../../components/ui/Card';
import { BriefcaseIcon, UsersIcon, ListBulletIcon, CalendarDaysIcon, CogIcon, WalletIcon, IconProps } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; 
import Spinner from '../../components/ui/Spinner';
import { ChartData, Staff } from '../../types';
import DonutChart from '../../components/ui/DonutChart'; 
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card className="shadow-md">
    <div className="flex items-center p-4">
      <div className="p-3 rounded-full bg-cyan-100 text-cyan-600">
         {React.cloneElement(icon as React.ReactElement<IconProps>, {className: "w-7 h-7"})}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </Card>
);

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
  
  // Mock data for employment type chart
  const staffByEmploymentTypeData: ChartData[] = [
    { name: 'Full-time', value: Math.max(0, staff.length - 5) }, // Example calculation
    { name: 'Part-time', value: 3 },
    { name: 'Contract', value: 2 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <Card title="Human Resources Dashboard" className="bg-white shadow-xl">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard title="Total Staff" value={staff.length} icon={<UsersIcon />} />
            <StatCard title="Payroll Periods Defined" value={payrollPeriods.length} icon={<CalendarDaysIcon />} />
            <StatCard title="Payroll Item Types" value={payrollItemTypes.length} icon={<ListBulletIcon />} />
            <StatCard title="Staff with Salary Settings" value={staffSalarySettings.length} icon={<WalletIcon />} />
          </div>

          <Card title="Quick Links" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                <Button as={Link} to="/administration/staff" variant="outline" leftIcon={<UsersIcon className="w-5 h-5"/>}>
                    Manage Staff
                </Button>
                <Button as={Link} to="/hr/payroll-periods" variant="outline" leftIcon={<CalendarDaysIcon className="w-5 h-5"/>}>
                    Payroll Periods
                </Button>
                <Button as={Link} to="/hr/salary-settings" variant="outline" leftIcon={<CogIcon className="w-5 h-5"/>}>
                    Salary Settings
                </Button>
            </div>
          </Card>

          {staffByEmploymentTypeData.length > 0 && (
            <Card title="Staff by Employment Type (Mock)" className="mt-6">
              <DonutChart 
                data={staffByEmploymentTypeData} 
                title="" 
                innerRadius="50%" 
                outerRadius="70%"
              />
            </Card>
          )}
          
          <div className="text-center py-8 mt-6">
            <BriefcaseIcon className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">HR & Payroll Overview</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Manage staff records, payroll, salary settings, and other HR-related tasks.
            </p>
            <div className="mt-6">
              <span className="inline-block bg-sky-100 text-sky-700 text-sm font-semibold px-3 py-1 rounded-full">
                Dashboard enhanced with quick links and employment type chart.
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HRDashboardPage;
