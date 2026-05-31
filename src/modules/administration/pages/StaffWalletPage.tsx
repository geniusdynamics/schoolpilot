import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { CurrencyDollarIcon, UserIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { initialMockWalletTransactions } from '../data/mockData';
import type { WalletTransaction, WalletTransactionType } from '../data/types';

export const StaffWalletContent: React.FC = () => {
  const { t } = useTranslation('administration');
  const { staff, loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [transactionType, setTransactionType] = useState<WalletTransactionType>('Advance');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Use centralized mock data (in production, this would come from useAppData)
  const mockTransactions: WalletTransaction[] = useMemo(() => {
    let filtered = initialMockWalletTransactions;

    if (selectedDepartment) {
      filtered = filtered.filter(t => t.department === selectedDepartment);
    }

    if (typeFilter) {
      filtered = filtered.filter(t => t.transaction_type === typeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.staff_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [selectedDepartment, typeFilter, searchTerm]);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStaff('');
    setTransactionType('Advance');
    setAmount('');
    setDescription('');
  };

  const handleSubmit = () => {
    if (!selectedStaff || !amount) {
      alert('Staff and amount are required.');
      return;
    }
    console.log('Creating transaction:', {
      staff_id: selectedStaff,
      transaction_type: transactionType,
      amount: Number(amount),
      description
    });
    closeModal();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-blue-100 text-blue-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Completed': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: TransactionType) => {
    const styles = {
      'Advance': 'bg-purple-100 text-purple-800',
      'Loan': 'bg-indigo-100 text-indigo-800',
      'Deduction': 'bg-red-100 text-red-800',
      'Repayment': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type]}`}>
        {type}
      </span>
    );
  };

  const columns: DataGridColumn<WalletTransaction>[] = [
    {
      key: 'staff_name',
      header: 'Staff Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'employee_id',
      header: 'Employee ID',
      sortable: true,
      filterable: true
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      filterable: true
    },
    {
      key: 'transaction_type',
      header: 'Type',
      sortable: true,
      render: (value) => getTypeBadge(value)
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (value, record) => (
        <span className={record.transaction_type === 'Deduction' ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
          {record.transaction_type === 'Deduction' ? '-' : '+'}${value.toLocaleString()}
        </span>
      )
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'description',
      header: 'Description',
      sortable: false,
      render: (value) => value || '-'
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      render: (value) => (
        <span className={`font-semibold ${value < 0 ? 'text-red-600' : 'text-green-600'}`}>
          ${value.toLocaleString()}
        </span>
      )
    }
  ];

  const uniqueDepartments = useMemo(() => {
    const depts = [...new Set(mockTransactions.map(t => t.department))];
    return depts;
  }, [mockTransactions]);

  const transactionTypes: TransactionType[] = ['Advance', 'Loan', 'Deduction', 'Repayment'];
  const statuses = ['Pending', 'Approved', 'Rejected', 'Completed'];

  const totals = useMemo(() => {
    return {
      totalTransactions: mockTransactions.length,
      totalAdvances: mockTransactions.filter(t => t.transaction_type === 'Advance').reduce((sum, t) => sum + t.amount, 0),
      totalLoans: mockTransactions.filter(t => t.transaction_type === 'Loan').reduce((sum, t) => sum + t.amount, 0),
      totalDeductions: mockTransactions.filter(t => t.transaction_type === 'Deduction').reduce((sum, t) => sum + t.amount, 0),
      outstandingBalance: mockTransactions.reduce((sum, t) => sum + t.balance, 0)
    };
  }, [mockTransactions]);

  if (loading && mockTransactions.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading wallet transactions...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Staff Wallet</h1>
        <Button onClick={openModal} variant="primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CurrencyDollarIcon className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-emerald-800">Staff Advance/Loan/Deduction Tracking</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Track staff financial transactions including advances, loans, deductions, and repayments. 
                Monitor outstanding balances and transaction statuses.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Transactions</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {totals.totalTransactions}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ArrowUpIcon className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium">Total Advances</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              ${totals.totalAdvances.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ArrowUpIcon className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-medium">Total Loans</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600 mt-2">
              ${totals.totalLoans.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ArrowDownIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Total Deductions</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              ${totals.totalDeductions.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CurrencyDollarIcon className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              ${totals.outstandingBalance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
            <select
              value={typeFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Types</option>
              {transactionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Staff, employee ID..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockTransactions}
          columns={columns}
        />
      </Card>

      {/* Add Transaction Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Add Wallet Transaction"
      >
        <FormSection>
          <FormField label="Staff" required>
            <select
              value={selectedStaff}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStaff(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select staff</option>
              {staff?.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Transaction Type" required>
            <select
              value={transactionType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTransactionType(e.target.value as TransactionType)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {transactionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Amount" required>
            <input
              type="number"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Description">
            <input
              type="text"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
              placeholder="Transaction description"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="primary">
            Add Transaction
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};

const StaffWalletPage: React.FC = () => (
  <div className="space-y-6">
    <StaffWalletContent />
  </div>
);

export default StaffWalletPage;
