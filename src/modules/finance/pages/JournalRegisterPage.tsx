import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { BookOpenIcon, CalendarIcon, DocumentTextIcon, CurrencyDollarIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { JournalEntry } from '../data/types';

export const JournalRegisterPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { journalEntries, loading } = useAppData();

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const allJournalEntries: JournalEntry[] = useMemo(() => {
    return journalEntries || [];
  }, [journalEntries]);

  const filteredJournalEntries: JournalEntry[] = useMemo(() => {
    let filtered = allJournalEntries;

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.voucher_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.reference.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(entry => entry.status === statusFilter);
    }

    return filtered;
  }, [allJournalEntries, searchTerm, statusFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredJournalEntries.reduce((acc, entry) => ({
      debit: acc.debit + entry.debit_amount,
      credit: acc.credit + entry.credit_amount
    }), { debit: 0, credit: 0 });
  }, [filteredJournalEntries]);

  const getStatusBadge = (status: string) => {
    const styles = {
      'Posted': 'bg-green-100 text-green-800',
      'Draft': 'bg-yellow-100 text-yellow-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const columns: DataGridColumn<JournalEntry>[] = [
    {
      key: 'voucher_no',
      header: 'Voucher No',
      sortable: true,
      filterable: true
    },
    {
      key: 'transaction_date',
      header: 'Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'description',
      header: 'Description',
      sortable: false,
      filterable: true
    },
    {
      key: 'reference',
      header: 'Reference',
      sortable: true,
      filterable: true
    },
    {
      key: 'debit_account',
      header: 'Debit Account',
      sortable: true,
      filterable: true
    },
    {
      key: 'credit_account',
      header: 'Credit Account',
      sortable: true,
      filterable: true
    },
    {
      key: 'debit_amount',
      header: 'Debit',
      sortable: true,
      render: (value) => (
        <span className="text-red-600 font-semibold">KES {value.toLocaleString()}</span>
      )
    },
    {
      key: 'credit_amount',
      header: 'Credit',
      sortable: true,
      render: (value) => (
        <span className="text-green-600 font-semibold">KES {value.toLocaleString()}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value)
    }
  ];

  const statusOptions = ['Posted', 'Draft', 'Cancelled'];

  if (loading && mockJournalEntries.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading journal register...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <BookOpenIcon className="w-6 h-6 text-blue-600" />
            <span>Journal Register</span>
          </div>
        }
      >
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <BookOpenIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Chronological Journal Voucher Listing</h3>
              <p className="text-sm text-blue-700 mt-1">
                The Journal Register provides a chronological record of all journal vouchers with debit and credit entries. 
                Use this to track all accounting transactions, verify double-entry compliance, and maintain an audit trail.
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                ...statusOptions.map(s => ({ value: s, label: s }))
              ]}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              type="text"
              placeholder="Voucher, description, reference..."
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
              <span className="text-sm font-medium">Journal Entries</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {filteredJournalEntries.length}
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
              <CalendarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Balance</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${totals.debit === totals.credit ? 'text-green-600' : 'text-red-600'}`}>
              {totals.debit === totals.credit ? 'Balanced' : 'Unbalanced'}
            </p>
          </div>
        </div>

        <DataGrid
          data={filteredJournalEntries}
          columns={columns}
          pageSize={50}
          searchable={false}
          exportable={true}
        />
      </Card>
    </div>
  );
};
const JournalRegisterPage: React.FC = () => (
  <div className="space-y-6">
    <JournalRegisterPageContent />
  </div>
);

export default JournalRegisterPage;
