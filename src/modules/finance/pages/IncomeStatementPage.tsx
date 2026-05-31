import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ChartBarIcon, CalendarIcon, CurrencyDollarIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { IncomeStatementItem } from '../data/types';

export const IncomeStatementPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { incomeStatementItems, loading } = useAppData();

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [comparisonPeriod, setComparisonPeriod] = useState(false);

  const incomeStatement: IncomeStatementItem[] = useMemo(() => {
    return incomeStatementItems || [];
  }, [incomeStatementItems]);

  // Calculate totals
  const totals = useMemo(() => {
    const revenue = incomeStatement
      .filter(item => item.category === 'Revenue')
      .reduce((sum, item) => sum + item.amount, 0);

    const expenses = incomeStatement
      .filter(item => item.category === 'Expense')
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      revenue,
      expenses,
      netIncome: revenue - expenses,
      profitMargin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0
    };
  }, [incomeStatement]);

  const getCategoryBadge = (category: string) => {
    const styles = {
      'Revenue': 'bg-green-100 text-green-800',
      'Expense': 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[category as keyof typeof styles]}`}>
        {category}
      </span>
    );
  };

  const columns: DataGridColumn<IncomeStatementItem>[] = [
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
      render: (value) => getCategoryBadge(value)
    },
    {
      key: 'account_name',
      header: 'Account',
      sortable: true,
      filterable: true
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (value, item) => (
        <span className={`font-semibold ${item.category === 'Revenue' ? 'text-green-600' : 'text-red-600'}`}>
          KES {value.toLocaleString()}
        </span>
      )
    },
    {
      key: 'percentage',
      header: '% of Total',
      sortable: true,
      render: (value) => value !== undefined ? `${value.toFixed(1)}%` : '-'
    }
  ];

  if (loading && incomeStatement.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading income statement...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-6 h-6 text-blue-600" />
            <span>Income Statement</span>
          </div>
        }
      >
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ChartBarIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Revenue vs Expenses for Period</h3>
              <p className="text-sm text-blue-700 mt-1">
                The Income Statement shows the financial performance over a period, comparing revenue against expenses 
                to determine net income or loss. Use this to analyze profitability and identify cost-saving opportunities.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px] flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={comparisonPeriod}
                onChange={(e) => setComparisonPeriod(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Compare with Previous Period</span>
            </label>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ChartBarIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              KES {totals.revenue.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ChartBarIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Total Expenses</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              KES {totals.expenses.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Net Income</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${totals.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              KES {totals.netIncome.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ChartBarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Profit Margin</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${totals.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totals.profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-3">Revenue Breakdown</h4>
            {mockIncomeStatement.filter(i => i.category === 'Revenue').map(item => (
              <div key={item.id} className="flex justify-between py-2 border-b border-green-100 last:border-0">
                <span className="text-sm text-green-700">{item.account_name}</span>
                <span className="text-sm font-semibold text-green-800">
                  KES {item.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-3">Expense Breakdown</h4>
            {mockIncomeStatement.filter(i => i.category === 'Expense').map(item => (
              <div key={item.id} className="flex justify-between py-2 border-b border-red-100 last:border-0">
                <span className="text-sm text-red-700">{item.account_name}</span>
                <span className="text-sm font-semibold text-red-800">
                  KES {item.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <DataGrid
          data={incomeStatement}
          columns={columns}
          pageSize={50}
          searchable={false}
          exportable={true}
        />
      </Card>
    </div>
  );
};
const IncomeStatementPage: React.FC = () => (
  <div className="space-y-6">
    <IncomeStatementPageContent />
  </div>
);

export default IncomeStatementPage;
