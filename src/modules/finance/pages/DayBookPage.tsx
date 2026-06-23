import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { BookOpenIcon, CalendarIcon, ArrowDownIcon, ArrowUpIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { DayBookEntry } from '../data/types';

export const DayBookPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { dayBookEntries, generalLedgerEntries, chartOfAccounts, loading } = useAppData();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const mockDayBookEntries: DayBookEntry[] = useMemo(() => {
    let filtered = (dayBookEntries || []).map((e: DayBookEntry) => ({ ...e, transaction_date: selectedDate }));

    if (searchTerm) {
      return filtered.filter(entry =>
        (entry.description?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (entry.reference_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (entry.account_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [selectedDate, searchTerm]);

  // Calculate totals
  const totals = useMemo(() => {
    return mockDayBookEntries.reduce((acc, entry) => ({
      debit: acc.debit + entry.debit,
      credit: acc.credit + entry.credit
    }), { debit: 0, credit: 0 });
  }, [mockDayBookEntries]);

  const columns: DataGridColumn<DayBookEntry>[] = [
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
      key: 'account_name',
      header: 'Account',
      sortable: true,
      filterable: true
    },
    {
      key: 'debit',
      header: 'Debit',
      sortable: true,
      render: (value) => value > 0 ? (
        <span className="text-red-600 font-semibold">KES {value.toLocaleString()}</span>
      ) : '-'
    },
    {
      key: 'credit',
      header: 'Credit',
      sortable: true,
      render: (value) => value > 0 ? (
        <span className="text-green-600 font-semibold">KES {value.toLocaleString()}</span>
      ) : '-'
    },
    {
      key: 'source',
      header: 'Source',
      sortable: true,
      filterable: true
    }
  ];

  if (loading?.all && mockDayBookEntries.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading day book...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <BookOpenIcon className="w-6 h-6 text-blue-600" />
            <span>Day Book</span>
          </div>
        }
      >
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <BookOpenIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Daily Transaction Log</h3>
              <p className="text-sm text-blue-700 mt-1">
                The Day Book records all daily financial transactions with debit and credit entries.
                Use this to track all money in and out on a daily basis for reconciliation purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              type="text"
              placeholder="Search by description, reference, or account..."
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
              <ArrowUpIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Debits</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              KES {totals.debit.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ArrowDownIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Credits</span>
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
              {mockDayBookEntries.length}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <BookOpenIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Net Position</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${totals.credit > totals.debit ? 'text-green-600' : 'text-red-600'}`}>
              KES {(totals.credit - totals.debit).toLocaleString()}
            </p>
          </div>
        </div>

        <DataGrid
          data={mockDayBookEntries}
          columns={columns}
          pageSize={50}
          searchable={false}
          exportable={true}
        />
      </Card>
    </div>
  );
};
const DayBookPage: React.FC = () => (
  <div className="space-y-6">
    <DayBookPageContent />
  </div>
);

export default DayBookPage;
