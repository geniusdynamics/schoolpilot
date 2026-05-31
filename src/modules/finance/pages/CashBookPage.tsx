import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CurrencyDollarIcon, ArrowDownIcon, ArrowUpIcon, CalendarIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { CashBookEntry } from '../data/types';

export const CashBookPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { cashBookEntries, studentPayments, generalPayments, loading } = useAppData();

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const mockCashBookEntries: CashBookEntry[] = useMemo(() => {
    let filtered = (cashBookEntries || []).map((e: CashBookEntry) => ({ ...e, transaction_date: startDate }));

    if (searchTerm) {
      return filtered.filter(entry =>
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.reference_no.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [startDate, endDate, searchTerm]);

  // Calculate totals
  const totals = useMemo(() => {
    return mockCashBookEntries.reduce((acc, entry) => ({
      debit: acc.debit + entry.debit,
      credit: acc.credit + entry.credit
    }), { debit: 0, credit: 0 });
  }, [mockCashBookEntries]);

  const columns: DataGridColumn<CashBookEntry>[] = [
    {
      key: 'transaction_date',
      header: 'Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'reference_no',
      header: 'Reference',
      sortable: true,
      filterable: true
    },
    {
      key: 'description',
      header: 'Description',
      sortable: false,
      filterable: true
    },
    {
      key: 'payment_method',
      header: 'Payment Method',
      sortable: true,
      filterable: true
    },
    {
      key: 'debit',
      header: 'Debit (Out)',
      sortable: true,
      render: (value) => value > 0 ? (
        <span className="text-red-600 font-semibold">KES {value.toLocaleString()}</span>
      ) : '-'
    },
    {
      key: 'credit',
      header: 'Credit (In)',
      sortable: true,
      render: (value) => value > 0 ? (
        <span className="text-green-600 font-semibold">KES {value.toLocaleString()}</span>
      ) : '-'
    },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      render: (value) => (
        <span className="font-bold text-gray-800">KES {value.toLocaleString()}</span>
      )
    }
  ];

  if (loading && mockCashBookEntries.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading cash book...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
            <span>Cash Book</span>
          </div>
        }
      >
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CurrencyDollarIcon className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-800">Cash-Only Transaction Register</h3>
              <p className="text-sm text-green-700 mt-1">
                The Cash Book records all cash transactions including cash receipts and cash payments.
                Use this to track actual cash flow and reconcile with physical cash on hand.
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
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              type="text"
              placeholder="Search by description or reference..."
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
              <ArrowUpIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Total Cash Out</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              KES {totals.debit.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ArrowDownIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Total Cash In</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              KES {totals.credit.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Transactions</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {mockCashBookEntries.length}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Cash Balance</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${totals.credit > totals.debit ? 'text-green-600' : 'text-red-600'}`}>
              KES {(totals.credit - totals.debit).toLocaleString()}
            </p>
          </div>
        </div>

        <DataGrid
          data={mockCashBookEntries}
          columns={columns}
          pageSize={50}
          searchable={false}
          exportable={true}
        />
      </Card>
    </div>
  );
};
const CashBookPage: React.FC = () => (
  <div className="space-y-6">
    <CashBookPageContent />
  </div>
);

export default CashBookPage;
