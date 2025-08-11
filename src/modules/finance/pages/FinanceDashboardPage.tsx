import React from 'react';
import Card from '@/components/ui/Card';
import { CurrencyDollarIcon, BanknotesIcon, CircleStackIcon, BuildingStorefrontIcon, TicketIcon, IconProps, PlusIcon, ReceiptRefundIcon } from '@/components/ui/icons';
import BarChart from '@/components/ui/BarChart'; // Using the existing BarChart component
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { BarChartData } from '@/types'; 
import Button from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';


const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode, iconBgColor?: string, iconColor?: string }> = 
    ({ title, value, icon, iconBgColor = 'bg-yellow-100', iconColor = 'text-yellow-600' }) => (
  <Card className="shadow-md">
    <div className="flex items-center p-4">
      <div className={`p-3 rounded-full ${iconBgColor} ${iconColor}`}>
        {React.cloneElement(icon as React.ReactElement<IconProps>, {className: "w-7 h-7"})}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </Card>
);


const FinanceDashboardPage: React.FC = () => {
  const { 
    loading, 
    banks,
    chartOfAccounts,
    suppliers,
    feeTemplates,
    studentInvoices
  } = useAppData();

  const pageIsLoading = loading.all || loading.banks || loading.chartOfAccounts || loading.suppliers || loading.feeTemplates || loading.studentInvoices;

  if (pageIsLoading) { 
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }
  
  // Mock data for new stats
  const mockTotalIncome = 5850000;
  const mockTotalExpenses = 2340000;
  const mockNetPosition = mockTotalIncome - mockTotalExpenses;
  const mockOutstandingInvoices = (studentInvoices || []).filter(inv => inv.status === 'Due' || inv.status === 'Overdue').length;


  const incomeExpenseData: BarChartData[] = [
    { name: 'Jan', uv: 400000, pv: 240000 }, // uv for income, pv for expenses
    { name: 'Feb', uv: 300000, pv: 139800 },
    { name: 'Mar', uv: 500000, pv: 380000 },
    { name: 'Apr', uv: 478000, pv: 290800 },
    { name: 'May', uv: 589000, pv: 380000 },
    { name: 'Jun', uv: 439000, pv: 250000 },
  ];


  return (
    <div className="space-y-6">
      <Card title="Finance Dashboard" className="bg-white shadow-xl">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard title="Total Income (Mock)" value={`Ksh ${mockTotalIncome.toLocaleString()}`} icon={<CurrencyDollarIcon />} iconBgColor="bg-green-100" iconColor="text-green-600"/>
            <StatCard title="Total Expenses (Mock)" value={`Ksh ${mockTotalExpenses.toLocaleString()}`} icon={<CurrencyDollarIcon />} iconBgColor="bg-red-100" iconColor="text-red-600"/>
            <StatCard title="Net Position (Mock)" value={`Ksh ${mockNetPosition.toLocaleString()}`} icon={<CurrencyDollarIcon />} iconBgColor="bg-blue-100" iconColor="text-blue-600"/>
            <StatCard title="Outstanding Invoices" value={mockOutstandingInvoices} icon={<ReceiptRefundIcon />} iconBgColor="bg-orange-100" iconColor="text-orange-600"/>
          </div>

          <Card title="Quick Links" className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                <Button as={Link} to="/finance/student-payments" variant="outline" leftIcon={<ReceiptRefundIcon className="w-5 h-5"/>}>
                    Record Payment
                </Button>
                <Button as={Link} to="/finance/expenses" variant="outline" leftIcon={<CurrencyDollarIcon className="w-5 h-5"/>}>
                    New Expense
                </Button>
                <Button as={Link} to="/finance/fee-templates" variant="outline" leftIcon={<TicketIcon className="w-5 h-5"/>}>
                    Fee Templates
                </Button>
                <Button as={Link} to="/finance/general-receipts" variant="outline" leftIcon={<PlusIcon className="w-5 h-5"/>}>
                    General Receipts
                </Button>
            </div>
          </Card>

          <Card title="Income vs Expenses (Last 6 Months - Mock)" className="mt-6">
             <BarChart 
                data={incomeExpenseData} 
                xAxisKey="name" 
                barDataKey="uv" // Primary bar (Income)
                // To show expenses as a second bar, BarChart component needs enhancement or use two separate bars.
                // For simplicity, this example shows 'uv' as income. A real chart might plot 'uv' (income) and 'pv' (expenses).
                // If your BarChart supports multiple bars, you'd configure that here.
                // title="Income (uv) vs Expenses (pv)" // Example if BarChart supports it
            />
             {/* To display expenses as a second bar, you'd typically need to map over an array of bar definitions:
                <Bar dataKey="pv" fill="#ff7300" name="Expenses" /> 
                This requires BarChart component to accept multiple <Bar /> children or a config for them.
             */}
          </Card>
          
          <div className="text-center py-8 mt-6">
            <CurrencyDollarIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Financial Management Hub</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Oversee all financial operations, including fee management, expenses, payroll links, and reporting.
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

export default FinanceDashboardPage;
