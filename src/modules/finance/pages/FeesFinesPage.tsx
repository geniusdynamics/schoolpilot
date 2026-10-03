import React, { useState, useMemo } from 'react';
import { FeeAdjustment, FeeAdjustmentType } from '@/modules/finance/data/types';
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
import { ExclamationTriangleIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';

type FineFormData = Omit<Partial<FeeAdjustment>, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'school_period_name'>;

export const FeesFinesPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { 
    feeAdjustments,
    students,
    schoolPeriods,
    loading,
    addFeeAdjustment,
    updateFeeAdjustment,
    deleteFeeAdjustment
  } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFine, setEditingFine] = useState<FeeAdjustment | null>(null);
  
  const initialFormData: FineFormData = {
    student_id: '',
    school_period_id: undefined,
    adjustment_type: FeeAdjustmentType.FINE,
    amount: 0,
    reason: '',
    applied_invoice_id: ''
  };
  const [formData, setFormData] = useState<FineFormData>(initialFormData);

  // Filter for fines and penalties only
  const finesList = useMemo(() => 
    (feeAdjustments || []).filter(
      adj => adj.adjustment_type === FeeAdjustmentType.FINE || adj.adjustment_type === FeeAdjustmentType.PENALTY
    ),
    [feeAdjustments]
  );

  const openModal = (fine?: FeeAdjustment) => {
    setEditingFine(fine || null);
    setFormData(fine ? {
      student_id: fine.student_id,
      school_period_id: fine.school_period_id,
      adjustment_type: fine.adjustment_type,
      amount: fine.amount,
      reason: fine.reason || '',
      applied_invoice_id: fine.applied_invoice_id || ''
    } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingFine(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let val: string | number | undefined = value;
    
    if (name === 'school_period_id') {
      val = value ? parseInt(value) : undefined;
    } else if (name === 'amount') {
      val = parseFloat(value) || 0;
    }
    
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async () => {
    if (!formData.student_id || !formData.school_period_id || !formData.amount) {
      toast.showWarning('Student, school period, and amount are required.');
      return;
    }

    const payload: Omit<FeeAdjustment, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'school_period_name'> = {
      student_id: formData.student_id!,
      school_period_id: Number(formData.school_period_id!),
      adjustment_type: formData.adjustment_type as FeeAdjustmentType,
      amount: Number(formData.amount),
      reason: formData.reason || undefined,
      applied_invoice_id: formData.applied_invoice_id || undefined
    };

    try {
      if (editingFine) {
        await updateFeeAdjustment(editingFine.id, payload);
      } else {
        await addFeeAdjustment(payload);
      }
      closeModal();
    } catch (error) {
      logger.error('Error saving fine:', error);
      toast.showError('Error saving fine. Please try again.');
    }
  };

  const confirm = useConfirm();
  const toast = useToast();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this fine?' }))) {
      try {
        await deleteFeeAdjustment(id);
      } catch (error) {
        logger.error('Error deleting fine:', error);
        toast.showError('Error deleting fine. Please try again.');
      }
    }
  };

  const columns: DataGridColumn<FeeAdjustment>[] = [
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
      key: 'adjustment_type',
      header: 'Type',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === FeeAdjustmentType.FINE ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-red-600">
          {value != null ? `KES ${value?.toLocaleString?.() ?? value}` : '-'}
        </span>
      )
    },
    {
      key: 'reason',
      header: 'Reason',
      sortable: false,
      render: (value) => value || '-'
    },
    {
      key: 'created_at',
      header: 'Date Applied',
      sortable: true,
      render: (value) => value ? formatDate(value) : '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_, item) => (
        <div className="flex gap-2">
          <button
            onClick={() => openModal(item)}
            className="text-primary-600 hover:text-primary-800"
            title="Edit"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  if (loading?.feeAdjustments && finesList.length === 0 && !feeAdjustments) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading fines...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            <span>Fees Fines & Penalties</span>
          </div>
        }
        extra={
          <Button onClick={() => openModal()} variant="primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Fine
          </Button>
        }
      >
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800">About Fines & Penalties</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Fines and penalties are applied to student accounts for late payments, damaged materials, or other infractions. 
                These adjustments can be applied to specific invoices or added as standalone charges.
              </p>
            </div>
          </div>
        </div>

        <DataGrid
          data={finesList}
          columns={columns}
          pageSize={20}
          searchable={true}
          exportable={true}
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingFine ? 'Edit Fine/Penalty' : 'Add Fine/Penalty'}
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

          <FormField label="Type" required>
            <Select
              name="adjustment_type"
              value={formData.adjustment_type}
              onChange={handleInputChange}
              options={[
                { value: FeeAdjustmentType.FINE, label: 'Fine' },
                { value: FeeAdjustmentType.PENALTY, label: 'Penalty' }
              ]}
            />
          </FormField>

          <FormField label="Amount" required>
            <Input
              type="number"
              name="amount"
              value={formData.amount || ''}
              onChange={handleInputChange}
              placeholder="Enter amount"
              min="0"
              step="0.01"
            />
          </FormField>

          <FormField label="Reason">
            <Textarea
              name="reason"
              value={formData.reason || ''}
              onChange={handleInputChange}
              placeholder="Reason for fine/penalty (e.g., late payment, damaged book)"
              rows={3}
            />
          </FormField>

          <FormField label="Applied Invoice (Optional)">
            <Input
              name="applied_invoice_id"
              value={formData.applied_invoice_id || ''}
              onChange={handleInputChange}
              placeholder="Invoice reference if applicable"
            />
          </FormField>
        </FormSection>

        <FormActions
          onCancel={closeModal}
          onSubmit={handleSubmit}
          submitLabel={editingFine ? 'Update' : 'Add Fine'}
        />
      </DialogForm>
    </div>
  );
};

const FeesFinesPage: React.FC = () => (
  <div className="space-y-6">
    <FeesFinesPageContent />
  </div>
);

export default FeesFinesPage;
