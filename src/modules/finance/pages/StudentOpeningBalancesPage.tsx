// ABOUTME: Student Opening Balances page - records each learner's brought-forward fee balance.
// ABOUTME: CRUD goes through useFinance() with update(id, patch); learner names resolved at read time, errors shown in the dialog.

import React, { useState, useMemo } from 'react';
import { StudentOpeningBalance, OpeningBalanceType } from '@/modules/finance';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { PlusIcon, EditIcon, DeleteIcon, BookOpenIcon } from '@/components/ui/icons';
import { useFinance } from '@/modules/finance/hooks/useFinance';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/format';

interface StudentOption { id: string | number; first_name?: string; last_name?: string; admission_no?: string; status?: string | null }

type BalanceRow = StudentOpeningBalance & { student_name: string | null };

interface StudentOpeningBalanceFormData {
  student_id: string;
  balance_type: OpeningBalanceType;
  amount?: number;
  as_of_date: string;
  is_billed: boolean;
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const idOf = (value: unknown): string => (value == null ? '' : String(value));
const studentName = (s: StudentOption) => [s.first_name, s.last_name].filter(Boolean).join(' ');
const isActive = (s: StudentOption) => !s.status || String(s.status).toLowerCase() === 'active';

export const StudentOpeningBalancesPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const {
    studentOpeningBalances,
    addStudentOpeningBalance,
    updateStudentOpeningBalance,
    deleteStudentOpeningBalance
  } = useFinance();
  const { data: students } = useDatabaseCollection<StudentOption>('students');
  const { showSuccess, showError } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState<BalanceRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initialFormData: StudentOpeningBalanceFormData = {
    student_id: '',
    balance_type: OpeningBalanceType.DEBIT,
    amount: 0,
    as_of_date: new Date().toISOString().split('T')[0],
    is_billed: false
  };
  const [formData, setFormData] = useState<StudentOpeningBalanceFormData>(initialFormData);

  const rows = useMemo<BalanceRow[]>(() => studentOpeningBalances.map(balance => {
    const student = students.find(s => idOf(s.id) === idOf(balance.student_id));
    return { ...balance, id: idOf(balance.id), student_name: student ? studentName(student) : balance.student_name ?? null };
  }), [studentOpeningBalances, students]);

  const studentsWithoutOB = useMemo(() => {
    const studentIdsWithOB = new Set(studentOpeningBalances.map(ob => idOf(ob.student_id)));
    return students.filter(s => !studentIdsWithOB.has(idOf(s.id)) && isActive(s));
  }, [students, studentOpeningBalances]);

  const openModal = (balance?: BalanceRow) => {
    setEditingBalance(balance || null);
    setFormError(null);
    setFormData(balance ?
      {
        student_id: idOf(balance.student_id),
        balance_type: balance.balance_type,
        amount: balance.amount,
        as_of_date: balance.as_of_date,
        is_billed: balance.is_billed
      } :
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBalance(null);
    setFormError(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormError(null);
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      const checked = e.target.checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: name === 'amount' ? (value === '' ? undefined : parseFloat(value)) : value }));
  };

  const handleSubmit = async () => {
    if (saving) return;
    const amount = Number(formData.amount);
    if (!formData.student_id || formData.amount === undefined || !Number.isFinite(amount) || !formData.as_of_date) {
      setFormError(t('openingBalances.validation', 'Student, Amount, and As Of Date are required.'));
      return;
    }
    const payload = {
      student_id: formData.student_id,
      balance_type: formData.balance_type,
      amount,
      as_of_date: formData.as_of_date,
      is_billed: formData.is_billed,
    };

    setSaving(true);
    try {
      if (editingBalance) {
        await updateStudentOpeningBalance(editingBalance.id, payload);
      } else {
        await addStudentOpeningBalance(payload as Parameters<typeof addStudentOpeningBalance>[0]);
      }
      showSuccess(t('openingBalances.saved', 'Opening balance saved.'));
      closeModal();
    } catch (error) {
      setFormError(`${t('openingBalances.saveFailed', 'Failed to save opening balance:')} ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if (!(await confirm({ variant: 'danger', message: 'Are you sure you want to delete this opening balance record?' }))) return;
    try {
      await deleteStudentOpeningBalance(id);
      showSuccess(t('openingBalances.deleted', 'Opening balance deleted.'));
    } catch (error) {
      showError(`${t('openingBalances.deleteFailed', 'Failed to delete opening balance:')} ${errorMessage(error)}`);
    }
  };

  const columns: DataGridColumn<BalanceRow>[] = [
    {
      key: 'student_name',
      header: 'Student Name',
      sortable: true,
      filterable: true,
      width: 200,
      render: (value) => <span className="font-medium">{value}</span>
    },
    {
      key: 'balance_type',
      header: 'Balance Type',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, row) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.balance_type === OpeningBalanceType.DEBIT ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
      }`}>{value}</span>
    },
    {
      key: 'amount',
      header: 'Amount (KES)',
      sortable: true,
      filterable: true,
      width: 120,
      render: (_value, row) => <span className="font-mono text-green-600">{row.amount?.toFixed?.(2) ?? '0.00'}</span>
    },
    {
      key: 'as_of_date',
      header: 'As Of Date',
      sortable: true,
      filterable: true,
      width: 120,
      render: (_value, row) => <span className="text-primary-600">{row.as_of_date ? formatDate(row.as_of_date) : '-'}</span>
    },
    {
      key: 'is_billed',
      header: 'Billed',
      sortable: true,
      filterable: true,
      width: 80,
      render: (_value, row) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.is_billed ? 'bg-primary-100 text-primary-800' : 'bg-surface-accent text-surface-foreground'
      }`}>{row.is_billed ? 'Yes' : 'No'}</span>
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (_value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="Student Opening Fee Balances" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />} disabled={studentsWithoutOB.length === 0}>
          Add Opening Balance
        </Button>
      }>
        {students.length > 0 && studentsWithoutOB.length === 0 && !editingBalance && (
            <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md">All active students seem to have opening balances recorded.</p>
        )}
        <DataGrid
          columns={columns}
          data={rows}
          sortable
          filterable
          emptyState={{
            icon: <BookOpenIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: "No opening balances found",
            description: "Set up opening fee balances for students to track their financial history from the beginning of the academic period.",
          }}
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingBalance ? 'Edit Opening Balance' : 'Add Student Opening Balance'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editingBalance ? 'Save Changes' : 'Add Balance'}
            </Button>
          </>
        }
      >
        {formError && <Alert variant="destructive" className="mb-4">{formError}</Alert>}
        <Select name="student_id" label="Student" value={formData.student_id} onChange={handleInputChange} required disabled={!!editingBalance}>
            <option value="">Select Student</option>
            {(editingBalance ? students : studentsWithoutOB).map(student => (
              <option key={student.id} value={idOf(student.id)}>{studentName(student)}{student.admission_no ? ` (${student.admission_no})` : ''}</option>
            ))}
        </Select>
        <Select name="balance_type" label="Balance Type" value={formData.balance_type} onChange={handleInputChange} required>
            {Object.values(OpeningBalanceType).map(type => (<option key={type} value={type}>{type}</option>))}
        </Select>
        <Input name="amount" label="Amount (KES)" type="number" step="0.01" value={formData.amount ?? ''} onChange={handleInputChange} required />
        <Input name="as_of_date" label="As Of Date" type="date" value={formData.as_of_date} onChange={handleInputChange} required />
        <div className="mt-4 flex items-center">
            <input id="is_billed" name="is_billed" type="checkbox" className="h-4 w-4 text-indigo-600 border-surface-border rounded focus:ring-indigo-500"
                checked={formData.is_billed} onChange={handleInputChange} />
            <label htmlFor="is_billed" className="ml-2 block text-sm text-surface-foreground">Consider this amount as already billed (affects statement)</label>
        </div>
      </DialogForm>
    </div>
  );
};

const StudentOpeningBalancesPage: React.FC = () => (
  <div className="space-y-6">
    <StudentOpeningBalancesPageContent />
  </div>
);

export default StudentOpeningBalancesPage;
