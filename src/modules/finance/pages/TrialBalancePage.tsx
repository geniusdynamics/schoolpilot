import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { ScaleIcon, CalendarIcon, CurrencyDollarIcon, DocumentTextIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { TrialBalanceItem } from '../data/types';

export const TrialBalancePageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { trialBalanceItems, loading } = useAppData();

  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountTypeFilter, setAccountTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const allTrialBalanceItems: TrialBalanceItem[] = useMemo(() => {
    return trialBalanceItems || [];
  }, [trialBalanceItems]);

  const filteredTrialBalance: TrialBalanceItem[] = useMemo(() => {
    let filtered = allTrialBalanceItems;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        (item.account_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (item.account_code?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    if (accountTypeFilter) {
      filtered = filtered.filter(item => item.account_type === accountTypeFilter);
    }

    return filtered;
  }, [allTrialBalanceItems, searchTerm, accountTypeFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredTrialBalance.reduce((acc, item) => ({
      debit: acc.debit + item.debit_balance,
      credit: acc.credit + item.credit_balance
    }), { debit: 0, credit: 0 });
  }, [filteredTrialBalance]);

  const getAccountTypeBadge = (type: string) => {
    const styles = {
      'Asset': 'bg-blue-100 text-blue-800',
      'Liability': 'bg-purple-100 text-purple-800',
      'Equity': 'bg-green-100 text-green-800',
      'Revenue': 'bg-yellow-100 text-yellow-800',
      'Expense': 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type as keyof typeof styles]}`}>
        {type}
      </span>
    );
  };

  const columns: DataGridColumn<TrialBalanceItem>[] = [
    {
      key: 'account_code',
      header: 'Account Code',
      sortable: true,
      filterable: true
    },
    {
      key: 'account_name',
      header: 'Account Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'account_type',
      header: 'Account Type',
      sortable: true,
      filterable: true,
      render: (value) => getAccountTypeBadge(value)
    },
    {
      key: 'debit_balance',
      header: 'Debit Balance',
      sortable: true,
      render: (value) => value > 0 ? (
        <span className="text-red-600 font-semibold">KES {value.toLocaleString()}</span>
      ) : '-'
    },
    {
      key: 'credit_balance',
      header: 'Credit Balance',
      sortable: true,
      render: (value) => value > 0 ? (
        <span className="text-green-600 font-semibold">KES {value.toLocaleString()}</span>
      ) : '-'
    }
  ];

  const accountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

  if (loading && mockTrialBalance.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading trial balance...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <ScaleIcon className="w-6 h-6 text-purple-600" />
            <span>Trial Balance</span>
          </div>
        }
      >
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ScaleIcon className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-800">Debit/Credit Balance Summary by Account</h3>
              <p className="text-sm text-purple-700 mt-1">
                The Trial Balance summarizes all ledger account balances to verify that total debits equal total credits. 
                This is a fundamental accounting check before preparing financial statements.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <Select
              value={accountTypeFilter}
              onChange={(e) => setAccountTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Types' },
                ...accountTypes.map(t => ({ value: t, label: t }))
              ]}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              type="text"
              placeholder="Account name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <DocumentTextIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Accounts</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {filteredTrialBalance.length}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CurrencyDollarIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Total Debits</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              KES {totals.debit.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Total Credits</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              KES {totals.credit.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ScaleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Balance Status</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${totals.debit === totals.credit ? 'text-green-600' : 'text-red-600'}`}>
              {totals.debit === totals.credit ? 'Balanced' : 'Unbalanced'}
            </p>
            {totals.debit !== totals.credit && (
              <p className="text-sm text-red-600 mt-1">
                Diff: KES {Math.abs(totals.debit - totals.credit).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <DataGrid
          data={filteredTrialBalance}
          columns={columns}
          pageSize={50}
          searchable={false}
          exportable={true}
        />
      </Card>
    </div>
  );
};
const TrialBalancePage: React.FC = () => (
  <div className="space-y-6">
    <TrialBalancePageContent />
  </div>
);

export default TrialBalancePage;
