import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { BuildingLibraryIcon, CalendarIcon, CurrencyDollarIcon, ScaleIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { BalanceSheetItem } from '../data/types';

// ABOUTME: BalanceSheetPage displays the school's financial position snapshot
// ABOUTME: with assets, liabilities, and equity breakdowns

export const BalanceSheetPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { balanceSheetItems, loading } = useAppData();

  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const mockBalanceSheet: BalanceSheetItem[] = useMemo(() => {
    let filtered = balanceSheetItems || [];

    if (searchTerm) {
      filtered = filtered.filter(item => 
        (item.account_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (item.subcategory?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    return filtered;
  }, [searchTerm, categoryFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    const assets = mockBalanceSheet
      .filter(item => item.category === 'Asset')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const liabilities = mockBalanceSheet
      .filter(item => item.category === 'Liability')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const equity = mockBalanceSheet
      .filter(item => item.category === 'Equity')
      .reduce((sum, item) => sum + item.amount, 0);

    const currentAssets = mockBalanceSheet
      .filter(item => item.category === 'Asset' && item.subcategory === 'Current Assets')
      .reduce((sum, item) => sum + item.amount, 0);

    const currentLiabilities = mockBalanceSheet
      .filter(item => item.category === 'Liability' && item.subcategory === 'Current Liabilities')
      .reduce((sum, item) => sum + item.amount, 0);
    
    return {
      assets,
      liabilities,
      equity,
      currentAssets,
      currentLiabilities,
      totalLiabilitiesAndEquity: liabilities + equity,
      workingCapital: currentAssets - currentLiabilities,
      debtRatio: assets > 0 ? (liabilities / assets) * 100 : 0
    };
  }, [mockBalanceSheet]);

  const getCategoryBadge = (category: string) => {
    const styles = {
      'Asset': 'bg-blue-100 text-blue-800',
      'Liability': 'bg-red-100 text-red-800',
      'Equity': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[category as keyof typeof styles]}`}>
        {category}
      </span>
    );
  };

  const columns: DataGridColumn<BalanceSheetItem>[] = [
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
      render: (value) => getCategoryBadge(value)
    },
    {
      key: 'subcategory',
      header: 'Subcategory',
      sortable: true,
      filterable: true
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
        <span className={`font-semibold ${item.category === 'Asset' || item.category === 'Equity' ? 'text-blue-600' : 'text-red-600'}`}>
          KES {value.toLocaleString()}
        </span>
      )
    },
    {
      key: 'percentage',
      header: '% of Category',
      sortable: true,
      render: (value) => value !== undefined ? `${value.toFixed(1)}%` : '-'
    }
  ];

  const categories = ['Asset', 'Liability', 'Equity'];

  if (loading && mockBalanceSheet.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading balance sheet...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card title="Balance Sheet">
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-3">
            <BuildingLibraryIcon className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-800">Assets, Liabilities, Equity Snapshot</h3>
              <p className="text-sm text-purple-700 mt-1">
                The Balance Sheet provides a snapshot of the school's financial position at a specific point in time, 
                showing what the school owns (assets), what it owes (liabilities), and the residual interest (equity).
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAsOfDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Account or subcategory..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">Total Assets</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              KES {(totals.assets / 1000000).toFixed(1)}M
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CurrencyDollarIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Total Liabilities</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              KES {(totals.liabilities / 1000000).toFixed(1)}M
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Total Equity</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              KES {(totals.equity / 1000000).toFixed(1)}M
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ScaleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Working Capital</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${totals.workingCapital >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              KES {totals.workingCapital.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <BuildingLibraryIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Debt Ratio</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${totals.debtRatio < 50 ? 'text-green-600' : 'text-red-600'}`}>
              {totals.debtRatio.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-3">Assets Breakdown</h4>
            <div className="space-y-2">
              {mockBalanceSheet.filter(i => i.category === 'Asset').map(item => (
                <div key={item.id} className="flex justify-between py-1 border-b border-blue-100 last:border-0">
                  <span className="text-sm text-blue-700">{item.account_name}</span>
                  <span className="text-sm font-semibold text-blue-800">
                    KES {(item.amount / 1000000).toFixed(2)}M
                  </span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t-2 border-blue-300 font-bold">
                <span className="text-sm text-blue-800">Total Assets</span>
                <span className="text-sm text-blue-800">KES {(totals.assets / 1000000).toFixed(2)}M</span>
              </div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-3">Liabilities & Equity</h4>
            <div className="space-y-2">
              {mockBalanceSheet.filter(i => i.category === 'Liability' || i.category === 'Equity').map(item => (
                <div key={item.id} className="flex justify-between py-1 border-b border-red-100 last:border-0">
                  <span className="text-sm text-red-700">{item.account_name}</span>
                  <span className="text-sm font-semibold text-red-800">
                    KES {(item.amount / 1000000).toFixed(2)}M
                  </span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t-2 border-red-300 font-bold">
                <span className="text-sm text-red-800">Total Liabilities & Equity</span>
                <span className="text-sm text-red-800">KES {(totals.totalLiabilitiesAndEquity / 1000000).toFixed(2)}M</span>
              </div>
            </div>
          </div>
        </div>

        <DataGrid
          data={mockBalanceSheet}
          columns={columns}
          searchable={false}
          exportable={true}
        />
      </Card>
    </div>
  );
};
const BalanceSheetPage: React.FC = () => (
  <div className="space-y-6">
    <BalanceSheetPageContent />
  </div>
);

export default BalanceSheetPage;
