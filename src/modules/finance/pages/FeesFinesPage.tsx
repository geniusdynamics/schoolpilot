// ABOUTME: Fees Fines & Penalties page - fines and penalties stored as fee adjustments against a learner and period.
// ABOUTME: CRUD goes through useFinance() with update(id, patch); ids stay strings and errors show in the dialog.

import React, { useState, useMemo } from 'react';
import { FeeAdjustment, FeeAdjustmentType } from '@/modules/finance/data/types';
import { useFinance } from '@/modules/finance/hooks/useFinance';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { useTranslation } from 'react-i18next';
import { ExclamationTriangleIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';

interface StudentOption { id: string | number; first_name?: string; last_name?: string; admission_no?: string }
interface PeriodOption { id: string | number; name?: string }

/** A fine as shown in the grid; ids are strings and names are resolved at read time. */
type FineRow = Omit<FeeAdjustment, 'school_period_id'> & { school_period_id: string };

interface FineFormData {
  student_id: string;
  school_period_id: string;
  adjustment_type: FeeAdjustmentType;
  amount?: number;
  reason: string;
  applied_invoice_id: string;
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const idOf = (value: unknown): string => (value == null ? '' : String(value));
const studentLabel = (s: StudentOption) =>
  [s.first_name, s.last_name].filter(Boolean).join(' ') + (s.admission_no ? ` (${s.admission_no})` : '');

export const FeesFinesPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { feeAdjustments, addFeeAdjustment, updateFeeAdjustment, deleteFeeAdjustment } = useFinance();
  const { data: students } = useDatabaseCollection<StudentOption>('students');
  const { data: schoolPeriods } = useDatabaseCollection<PeriodOption>('school_periods');
  const { showSuccess, showError } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFine, setEditingFine] = useState<FineRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initialFormData: FineFormData = {
    student_id: '',
    school_period_id: '',
    adjustment_type: FeeAdjustmentType.FINE,
    amount: 0,
    reason: '',
    applied_invoice_id: ''
  };
  const [formData, setFormData] = useState<FineFormData>(initialFormData);

  // Fines and penalties only, with learner and period names resolved from their ids
  const finesList = useMemo<FineRow[]>(() =>
    feeAdjustments
      .filter(adj => adj.adjustment_type === FeeAdjustmentType.FINE || adj.adjustment_type === FeeAdjustmentType.PENALTY)
      .map(adj => {
        const student = students.find(s => idOf(s.id) === idOf(adj.student_id));
        const period = schoolPeriods.find(p => idOf(p.id) === idOf(adj.school_period_id));
        return {
          ...adj,
          id: idOf(adj.id),
          school_period_id: idOf(adj.school_period_id),
          student_name: student ? [student.first_name, student.last_name].filter(Boolean).join(' ') : adj.student_name ?? null,
          school_period_name: period?.name ?? adj.school_period_name ?? null,
        };
      }),
    [feeAdjustments, students, schoolPeriods]
  );

  const openModal = (fine?: FineRow) => {
    setEditingFine(fine || null);
    setFormError(null);
    setFormData(fine ? {
      student_id: idOf(fine.student_id),
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
    setFormError(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormError(null);
    setFormData(prev => ({ ...prev, [name]: name === 'amount' ? (value === '' ? undefined : parseFloat(value)) : value }));
  };

  const handleSubmit = async () => {
    if (saving) return;
    const amount = Number(formData.amount);
    if (!formData.student_id || !formData.school_period_id || !Number.isFinite(amount) || amount <= 0) {
      setFormError(t('fines.validation', 'Student, school period, and an amount greater than zero are required.'));
      return;
    }

    const payload = {
      student_id: formData.student_id,
      school_period_id: formData.school_period_id,
      adjustment_type: formData.adjustment_type,
      amount,
      reason: formData.reason || null,
      applied_invoice_id: formData.applied_invoice_id || null
    };

    setSaving(true);
    try {
      // The finance record types still declare numeric foreign keys (SO-22); stored ids are strings.
      if (editingFine) {
        await updateFeeAdjustment(editingFine.id, payload as unknown as Parameters<typeof updateFeeAdjustment>[1]);
      } else {
        await addFeeAdjustment(payload as unknown as Parameters<typeof addFeeAdjustment>[0]);
      }
      showSuccess(t('fines.saved', 'Fine saved.'));
      closeModal();
    } catch (error) {
      setFormError(`${t('fines.saveFailed', 'Failed to save fine:')} ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if (!(await confirm({ variant: 'danger', message: 'Are you sure you want to delete this fine?' }))) return;
    try {
      await deleteFeeAdjustment(id);
      showSuccess(t('fines.deleted', 'Fine deleted.'));
    } catch (error) {
      showError(`${t('fines.deleteFailed', 'Failed to delete fine:')} ${errorMessage(error)}`);
    }
  };

  const columns: DataGridColumn<FineRow>[] = [
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
          <Button size="sm" variant="ghost" onClick={() => openModal(item)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}>Delete</Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <Card
        title="Fees Fines & Penalties"
        actions={
          <Button onClick={() => openModal()} variant="primary" leftIcon={<PlusIcon className="w-4 h-4" />}>
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

        <DataGrid data={finesList} columns={columns} sortable filterable />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingFine ? 'Edit Fine/Penalty' : 'Add Fine/Penalty'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editingFine ? 'Update' : 'Add Fine'}
            </Button>
          </>
        }
      >
        {formError && <Alert variant="destructive" className="mb-4">{formError}</Alert>}
        <Select name="student_id" label="Student" value={formData.student_id} onChange={handleInputChange} required>
          <option value="">Select student</option>
          {students.map(s => (<option key={s.id} value={idOf(s.id)}>{studentLabel(s)}</option>))}
        </Select>
        <Select name="school_period_id" label="School Period" value={formData.school_period_id} onChange={handleInputChange} required>
          <option value="">Select school period</option>
          {schoolPeriods.map(sp => (<option key={sp.id} value={idOf(sp.id)}>{sp.name}</option>))}
        </Select>
        <Select name="adjustment_type" label="Type" value={formData.adjustment_type} onChange={handleInputChange} required>
          <option value={FeeAdjustmentType.FINE}>Fine</option>
          <option value={FeeAdjustmentType.PENALTY}>Penalty</option>
        </Select>
        <Input
          type="number"
          name="amount"
          label="Amount"
          value={formData.amount ?? ''}
          onChange={handleInputChange}
          placeholder="Enter amount"
          min="0"
          step="0.01"
          required
        />
        <Textarea
          name="reason"
          label="Reason"
          value={formData.reason}
          onChange={handleInputChange}
          placeholder="Reason for fine/penalty (e.g., late payment, damaged book)"
          rows={3}
        />
        <Input
          name="applied_invoice_id"
          label="Applied Invoice (Optional)"
          value={formData.applied_invoice_id}
          onChange={handleInputChange}
          placeholder="Invoice reference if applicable"
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
