import React, { useState, useMemo } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useCanonicalStaff } from '../data/useCanonicalStaff';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { CurrencyDollarIcon, UserIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import type { WalletTransaction, WalletTransactionType } from '../data/types';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';

export const StaffWalletContent: React.FC = () => {
  const { staff } = useCanonicalStaff();
  const walletCollection = useDatabaseCollection<WalletTransaction>('staff_wallet_transactions');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [transactionType, setTransactionType] = useState<WalletTransactionType>('Advance');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Live wallet transactions from the database
  const transactions: WalletTransaction[] = useMemo(() => {
    let filtered = walletCollection.data;

    if (selectedDepartment) {
      filtered = filtered.filter(t => t.department === selectedDepartment);
    }

    if (typeFilter) {
      filtered = filtered.filter(t => t.transaction_type === typeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(t =>
        (t.staff_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (t.employee_id?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [walletCollection.data, selectedDepartment, typeFilter, searchTerm]);

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

  const toast = useToast();
  const handleSubmit = () => {
    if (!selectedStaff || !amount) {
      toast.showWarning('Staff and amount are required.');
      return;
    }
    const staffMember = staff?.find(s => String(s.id) === String(selectedStaff));
    const signedAmount = transactionType === 'Deduction' ? -Math.abs(Number(amount)) : Number(amount);
    const previousBalance = walletCollection.data
      .filter(t => String(t.staff_id) === String(selectedStaff))
      .reduce((sum, t) => sum + (t.transaction_type === 'Deduction' ? -t.amount : t.amount), 0);
    logger.info('Creating transaction:', {
      staff_id: selectedStaff,
      transaction_type: transactionType,
      amount: Number(amount),
      description
    });
    void walletCollection.insert({
      staff_id: selectedStaff,
      staff_name: staffMember?.display_name || `${staffMember?.first_name ?? ''} ${staffMember?.last_name ?? ''}`.trim(),
      employee_id: staffMember?.staff_no || '',
      department: staffMember?.department_name || '',
      transaction_type: transactionType,
      amount: Number(amount),
      date: new Date().toISOString().split('T')[0],
      description,
      status: 'Approved',
      balance: previousBalance + signedAmount,
      created_at: new Date().toISOString()
    } as Omit<WalletTransaction, 'id'> & { id?: string }).then(() => {
      toast.showSuccess('Wallet transaction added.');
      closeModal();
    }).catch((err: unknown) => {
      logger.error('Failed to create wallet transaction:', err);
      toast.showError('Failed to add wallet transaction.');
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-primary-100 text-primary-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Completed': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: WalletTransactionType) => {
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
    const depts = [...new Set(transactions.map(t => t.department))];
    return depts;
  }, [transactions]);

  const transactionTypes: WalletTransactionType[] = ['Advance', 'Loan', 'Deduction', 'Repayment'];

  const totals = useMemo(() => {
    return {
      totalTransactions: transactions.length,
      totalAdvances: transactions.filter(t => t.transaction_type === 'Advance').reduce((sum, t) => sum + t.amount, 0),
      totalLoans: transactions.filter(t => t.transaction_type === 'Loan').reduce((sum, t) => sum + t.amount, 0),
      totalDeductions: transactions.filter(t => t.transaction_type === 'Deduction').reduce((sum, t) => sum + t.amount, 0),
      outstandingBalance: transactions.reduce((sum, t) => sum + t.balance, 0)
    };
  }, [transactions]);

  if (walletCollection.loading && transactions.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading wallet transactions...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card
        title="Staff Wallet"
        info="Track staff financial transactions including advances, loans, deductions, and repayments. Monitor outstanding balances and transaction statuses."
        actions={
          <Button onClick={openModal} variant="primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        }
      >

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Transactions</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">
              {totals.totalTransactions}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ArrowUpIcon className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium">Total Advances</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              ${totals.totalAdvances.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ArrowUpIcon className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-medium">Total Loans</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600 mt-2">
              ${totals.totalLoans.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ArrowDownIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Total Deductions</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              ${totals.totalDeductions.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
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
            <label className="block text-sm font-medium text-surface-foreground mb-1">Department</label>
            <Select
              value={selectedDepartment}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDepartment(e.target.value)}
              className="w-full"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Transaction Type</label>
            <Select
              value={typeFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)}
              className="w-full"
            >
              <option value="">All Types</option>
              {transactionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Staff, employee ID..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={transactions}
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
            <Select
              value={selectedStaff}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStaff(e.target.value)}
              className="w-full"
            >
              <option value="">Select staff</option>
              {staff?.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Transaction Type" required>
            <Select
              value={transactionType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTransactionType(e.target.value as WalletTransactionType)}
              className="w-full"
            >
              {transactionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Amount" required>
            <input
              type="number"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              min="0"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Description">
            <input
              type="text"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
              placeholder="Transaction description"
              className="w-full border border-surface-border rounded-md px-3 py-2"
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
  <div className="space-y-3">
    <StaffWalletContent />
  </div>
);

const StaffWalletPageWithRepository = withCanonicalRepository(StaffWalletPage);
export default StaffWalletPageWithRepository;
