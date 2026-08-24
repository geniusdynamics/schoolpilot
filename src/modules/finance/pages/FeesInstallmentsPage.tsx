import React, { useState, useMemo } from 'react';
import { FeeInstallment, InstallmentStatus } from '@/modules/finance/data/types';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';

import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logging';
import { CalendarIcon, PlusIcon } from '@/components/ui/icons';
import { useToast } from '@/hooks/useToast';

type InstallmentFormData = Omit<Partial<FeeInstallment>, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'school_period_name'>;

export const FeesInstallmentsPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { 
    students,
    schoolPeriods,
    loading
  } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<FeeInstallment | null>(null);
  
  const initialFormData: InstallmentFormData = {
    student_id: '',
    school_period_id: undefined,
    installment_number: 1,
    due_date: '',
    amount_due: 0,
    amount_paid: 0,
    status: InstallmentStatus.PENDING,
    invoice_id: '',
    notes: ''
  };
  const [formData, setFormData] = useState<InstallmentFormData>(initialFormData);

  // Mock data for installments (in production, this would come from useAppData)
  const mockInstallments: FeeInstallment[] = useMemo(() => {
    if (!students || students.length === 0) return [];
    return students.slice(0, 5).map((student, idx) => ({
      id: `inst-${idx}`,
      student_id: student.id,
      school_period_id: 1,
      installment_number: idx + 1,
      due_date: new Date(Date.now() + (idx + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount_due: 15000,
      amount_paid: idx % 2 === 0 ? 15000 : 7500,
      status: idx % 2 === 0 ? InstallmentStatus.PAID : (idx === 1 ? InstallmentStatus.PARTIAL : InstallmentStatus.PENDING),
      invoice_id: `INV-${1000 + idx}`,
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      student_name: [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Unknown',
      school_period_name: 'Term 1 2024'
    }));
  }, [students]);

  const openModal = (installment?: FeeInstallment) => {
    setEditingInstallment(installment || null);
    setFormData(installment ? {
      student_id: installment.student_id,
      school_period_id: installment.school_period_id,
      installment_number: installment.installment_number,
      due_date: installment.due_date.split('T')[0],
      amount_due: installment.amount_due,
      amount_paid: installment.amount_paid,
      status: installment.status,
      invoice_id: installment.invoice_id || '',
      notes: installment.notes || ''
    } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInstallment(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let val: string | number | undefined = value;
    
    if (name === 'school_period_id' || name === 'installment_number') {
      val = value ? parseInt(value) : undefined;
    } else if (name === 'amount_due' || name === 'amount_paid') {
      val = parseFloat(value) || 0;
    }
    
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.student_id || !formData.school_period_id || !formData.due_date || !formData.amount_due) {
      toast.showWarning('Student, school period, due date, and amount due are required.');
      return;
    }

    // In production, this would call addFeeInstallment or updateFeeInstallment
    logger.info('Saving installment:', formData);
    closeModal();
  };

  const getStatusBadge = (status: InstallmentStatus) => {
    const styles = {
      [InstallmentStatus.PENDING]: 'bg-gray-100 text-gray-800',
      [InstallmentStatus.PARTIAL]: 'bg-yellow-100 text-yellow-800',
      [InstallmentStatus.PAID]: 'bg-green-100 text-green-800',
      [InstallmentStatus.OVERDUE]: 'bg-red-100 text-red-800',
      [InstallmentStatus.WAIVED]: 'bg-blue-100 text-blue-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const columns: DataGridColumn<FeeInstallment>[] = [
    {
      key: 'student_name',
      header: 'Student',
      sortable: true,
      filterable: true,
      render: (value) => value || '-'
    },
    {
      key: 'school_period_name',
      header: 'School Period',
      sortable: true,
      filterable: true,
      render: (value) => value || '-'
    },
    {
      key: 'installment_number',
      header: '#',
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'amount_due',
      header: 'Amount Due',
      sortable: true,
      render: (value) => value != null ? `KES ${value?.toLocaleString?.() ?? value}` : '-'
    },
    {
      key: 'amount_paid',
      header: 'Amount Paid',
      sortable: true,
      render: (value) => value != null ? `KES ${value?.toLocaleString?.() ?? value}` : '-'
    },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      render: (_, item) => {
        const balance = (item.amount_due ?? 0) - (item.amount_paid ?? 0);
        return (
          <span className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            KES {balance?.toLocaleString?.() ?? balance}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_, item) => (
        <div className="flex gap-2">
          <button
            onClick={() => openModal(item)}
            className="text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            Edit
          </button>
        </div>
      )
    }
  ];

  if (loading?.students && !students && mockInstallments.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading installments...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            <span>Fee Installments</span>
          </div>
        }
        extra={
          <Button onClick={() => openModal()} variant="primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Installment Plan
          </Button>
        }
      >
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">About Fee Installments</h3>
              <p className="text-sm text-blue-700 mt-1">
                Fee installments allow you to break down fee payments into scheduled payments for students. 
                Track due dates, payments, and balances for each installment across the academic period.
              </p>
            </div>
          </div>
        </div>

        <DataGrid
          data={mockInstallments}
          columns={columns}
          pageSize={20}
          searchable={true}
          exportable={true}
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingInstallment ? 'Edit Installment' : 'Add Installment Plan'}
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

          <FormField label="School Period" required>
            <Select
              name="school_period_id"
              value={formData.school_period_id != null ? String(formData.school_period_id) : ''}
              onChange={handleInputChange}
              options={schoolPeriods?.map(sp => ({ value: sp.id != null ? String(sp.id) : '', label: sp.name })) || []}
              placeholder="Select school period"
            />
          </FormField>

          <FormField label="Installment Number" required>
            <Input
              type="number"
              name="installment_number"
              value={formData.installment_number || 1}
              onChange={handleInputChange}
              placeholder="e.g., 1, 2, 3"
              min="1"
            />
          </FormField>

          <FormField label="Due Date" required>
            <Input
              type="date"
              name="due_date"
              value={formData.due_date || ''}
              onChange={handleInputChange}
            />
          </FormField>

          <FormField label="Amount Due" required>
            <Input
              type="number"
              name="amount_due"
              value={formData.amount_due || ''}
              onChange={handleInputChange}
              placeholder="Enter amount due"
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

          <FormField label="Status">
            <Select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              options={[
                { value: InstallmentStatus.PENDING, label: 'Pending' },
                { value: InstallmentStatus.PARTIAL, label: 'Partial' },
                { value: InstallmentStatus.PAID, label: 'Paid' },
                { value: InstallmentStatus.OVERDUE, label: 'Overdue' },
                { value: InstallmentStatus.WAIVED, label: 'Waived' }
              ]}
            />
          </FormField>

          <FormField label="Invoice Reference (Optional)">
            <Input
              name="invoice_id"
              value={formData.invoice_id || ''}
              onChange={handleInputChange}
              placeholder="Invoice reference"
            />
          </FormField>

          <FormField label="Notes">
            <Textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleInputChange}
              placeholder="Additional notes"
              rows={3}
            />
          </FormField>
        </FormSection>

        <FormActions
          onCancel={closeModal}
          onSubmit={handleSubmit}
          submitLabel={editingInstallment ? 'Update' : 'Add Installment'}
        />
      </DialogForm>
    </div>
  );
};

const FeesInstallmentsPage: React.FC = () => (
  <div className="space-y-6">
    <FeesInstallmentsPageContent />
  </div>
);

export default FeesInstallmentsPage;
