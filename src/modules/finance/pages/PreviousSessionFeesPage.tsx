import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';

import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { PreviousSessionFee } from '../data/types';
import { logger } from '@/utils/logging';
import { ArrowPathIcon, CheckCircleIcon, CurrencyDollarIcon, PlusIcon, UserGroupIcon } from '@/components/ui/icons';
import { useToast } from '@/hooks/useToast';

type PreviousSessionFeeFormData = Omit<Partial<PreviousSessionFee>, 'id' | 'created_at' | 'updated_at'>;

export const PreviousSessionFeesPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { students, schoolPeriods, previousSessionFees, loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PreviousSessionFee | null>(null);
  const [selectedSession, setSelectedSession] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const initialFormData: PreviousSessionFeeFormData = {
    student_id: '',
    previous_session: '',
    carry_over_amount: 0,
    amount_paid: 0,
    balance_remaining: 0,
    status: 'Pending',
    current_session: '',
    notes: ''
  };
  const [formData, setFormData] = useState<PreviousSessionFeeFormData>(initialFormData);

  const allPreviousSessionFees: PreviousSessionFee[] = useMemo(() => {
    return previousSessionFees || [];
  }, [previousSessionFees]);

  const filteredPreviousSessionFees: PreviousSessionFee[] = useMemo(() => {
    let filtered = allPreviousSessionFees;

    if (searchTerm) {
      filtered = filtered.filter(record =>
        (record.student_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (record.admission_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSession) {
      filtered = filtered.filter(record => record.previous_session === selectedSession);
    }

    if (statusFilter) {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    return filtered;
  }, [allPreviousSessionFees, searchTerm, selectedSession, statusFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredPreviousSessionFees.reduce((acc, record) => ({
      carryOver: acc.carryOver + (record.carry_over_amount ?? 0),
      paid: acc.paid + (record.amount_paid ?? 0),
      remaining: acc.remaining + (record.balance_remaining ?? 0)
    }), { carryOver: 0, paid: 0, remaining: 0 });
  }, [filteredPreviousSessionFees]);

  const openModal = (record?: PreviousSessionFee) => {
    setEditingRecord(record || null);
    setFormData(record ? {
      student_id: record.student_id,
      previous_session: record.previous_session,
      carry_over_amount: record.carry_over_amount,
      amount_paid: record.amount_paid,
      balance_remaining: record.balance_remaining,
      status: record.status,
      current_session: record.current_session,
      notes: record.notes
    } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let val: string | number = value;
    
    if (name === 'carry_over_amount' || name === 'amount_paid' || name === 'balance_remaining') {
      val = parseFloat(value) || 0;
    }
    
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.student_id || !formData.previous_session || !formData.current_session) {
      toast.showWarning('Student, previous session, and current session are required.');
      return;
    }
    // In production, this would call addPreviousSessionFee or updatePreviousSessionFee
    logger.info('Saving previous session fee:', formData);
    closeModal();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Partial': 'bg-orange-100 text-orange-800',
      'Paid': 'bg-green-100 text-green-800',
      'Waived': 'bg-blue-100 text-blue-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const columns: DataGridColumn<PreviousSessionFee>[] = [
    {
      key: 'student_name',
      header: 'Student Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'admission_no',
      header: 'Admission No',
      sortable: true,
      filterable: true
    },
    {
      key: 'class_name',
      header: 'Current Class',
      sortable: true,
      filterable: true
    },
    {
      key: 'previous_session',
      header: 'Previous Session',
      sortable: true,
      filterable: true
    },
    {
      key: 'current_session',
      header: 'Current Session',
      sortable: true,
      filterable: true
    },
    {
      key: 'carry_over_amount',
      header: 'Carry Over',
      sortable: true,
      render: (value) => `KES ${value?.toLocaleString?.() ?? '-'}`
    },
    {
      key: 'amount_paid',
      header: 'Paid',
      sortable: true,
      render: (value) => value != null && value > 0 ? `KES ${value?.toLocaleString?.() ?? value}` : '-'
    },
    {
      key: 'balance_remaining',
      header: 'Balance',
      sortable: true,
      render: (value) => (
        <span className={`font-semibold ${value > 0 ? 'text-red-600' : 'text-green-600'}`}>
          KES {value?.toLocaleString?.() ?? '-'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'notes',
      header: 'Notes',
      sortable: false,
      render: (value) => value || '-'
    }
  ];

  const uniqueSessions = useMemo(() => {
    const sessions = [...new Set(filteredPreviousSessionFees.map(r => r.previous_session))];
    return sessions.sort();
  }, [filteredPreviousSessionFees]);

  const statusOptions = ['Pending', 'Partial', 'Paid', 'Waived'];

  if (loading?.all && filteredPreviousSessionFees.length === 0 && !previousSessionFees) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading previous session fees...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="w-6 h-6 text-purple-600" />
            <span>Previous Session Fees</span>
          </div>
        }
        extra={
          <Button onClick={() => openModal()} variant="primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Carry-over
          </Button>
        }
      >
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ArrowPathIcon className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-800">Carry-over Balance Tracking</h3>
              <p className="text-sm text-purple-700 mt-1">
                Track fee balances carried over from previous academic sessions to the current session. 
                Manage outstanding balances, record payments, and waive fees as needed.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Previous Session</label>
            <Select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              options={[
                { value: '', label: 'All Sessions' },
                ...uniqueSessions.map(s => ({ value: s, label: s }))
              ]}
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
              placeholder="Student name or admission no..."
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
              <ArrowPathIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Carry-over</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              KES {totals.carryOver?.toLocaleString?.() ?? '0'}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Paid</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              KES {totals.paid?.toLocaleString?.() ?? '0'}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CurrencyDollarIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              KES {totals.remaining?.toLocaleString?.() ?? '0'}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <UserGroupIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Records</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {filteredPreviousSessionFees.length}
            </p>
          </div>
        </div>

        <DataGrid
          data={filteredPreviousSessionFees}
          columns={columns}
          pageSize={50}
          searchable={false}
          exportable={true}
        />
      </Card>

      {/* Add/Edit Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingRecord ? 'Edit Carry-over' : 'Add Carry-over Balance'}
      >
        <FormSection>
          <FormField label="Student" required>
            <Select
              name="student_id"
              value={formData.student_id}
              onChange={handleInputChange}
              options={students?.map(s => ({ value: s.id, label: [s.first_name, s.last_name].filter(Boolean).join(' ') + (s.admission_no ? ` (${s.admission_no})` : '') })) || []}
              placeholder="Select student"
            />
          </FormField>

          <FormField label="Previous Session" required>
            <Select
              name="previous_session"
              value={formData.previous_session}
              onChange={handleInputChange}
              options={[
                { value: 'Term 1 2023', label: 'Term 1 2023' },
                { value: 'Term 2 2023', label: 'Term 2 2023' },
                { value: 'Term 3 2023', label: 'Term 3 2023' },
                { value: 'Term 1 2022', label: 'Term 1 2022' }
              ]}
              placeholder="Select previous session"
            />
          </FormField>

          <FormField label="Current Session" required>
            <Select
              name="current_session"
              value={formData.current_session}
              onChange={handleInputChange}
              options={[
                { value: 'Term 1 2024', label: 'Term 1 2024' },
                { value: 'Term 2 2024', label: 'Term 2 2024' },
                { value: 'Term 3 2024', label: 'Term 3 2024' }
              ]}
              placeholder="Select current session"
            />
          </FormField>

          <FormField label="Carry-over Amount" required>
            <Input
              type="number"
              name="carry_over_amount"
              value={formData.carry_over_amount || ''}
              onChange={handleInputChange}
              placeholder="Enter carry-over amount"
              min="0"
              step="0.01"
            />
          </FormField>

          <FormField label="Amount Paid">
            <Input
              type="number"
              name="amount_paid"
              value={formData.amount_paid || ''}
              onChange={handleInputChange}
              placeholder="Enter amount paid"
              min="0"
              step="0.01"
            />
          </FormField>

          <FormField label="Balance Remaining">
            <Input
              type="number"
              name="balance_remaining"
              value={formData.balance_remaining || ''}
              onChange={handleInputChange}
              placeholder="Remaining balance"
              min="0"
              step="0.01"
            />
          </FormField>

          <FormField label="Status">
            <Select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              options={statusOptions.map(s => ({ value: s, label: s }))}
            />
          </FormField>

          <FormField label="Notes">
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleInputChange}
              placeholder="Additional notes"
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <FormActions
          onCancel={closeModal}
          onSubmit={handleSubmit}
          submitLabel={editingRecord ? 'Update' : 'Add Carry-over'}
        />
      </DialogForm>
    </div>
  );
};

const PreviousSessionFeesPage: React.FC = () => (
  <div className="space-y-6">
    <PreviousSessionFeesPageContent />
  </div>
);

export default PreviousSessionFeesPage;
