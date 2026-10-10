// ABOUTME: Student Payments page: lists fee payments and records/edits them in a dialog.
// ABOUTME: New payments go through recordStudentPayment with auto RCT/<year>/<seq> receipts; failures show in the dialog.

import React, { useState } from 'react';
import { StudentPayment } from '@/modules/finance';
import { Student } from '@/core/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { PlusIcon, EditIcon, DeleteIcon, CreditCardIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { useToast } from '@/hooks/useToast';
import Spinner from '@/components/ui/Spinner';
import { logger } from '@/utils/logging';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { formatDate } from '@/utils/format';
import { nextReceiptNumber } from '@/domain/sequences';

type StudentPaymentFormData = Omit<Partial<StudentPayment>, 'id' | 'created_at' | 'updated_at' | 'student_name'>;

const todayIsoDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const toIsoDate = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().split('T')[0];
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const StudentPaymentsPageContent: React.FC = () => {
  const {
    studentPayments,
    students,
    loading,
    recordStudentPayment,
    refreshData,
  } = useAppData();
  // Edits and deletes write the student_payments collection directly (AppData exposes no update/delete
  // for payments); the AppData list is reloaded afterwards so the grid and balances stay in step.
  const paymentsCollection = useDatabaseCollection<StudentPayment>('student_payments', {
    loadOnMount: false,
    subscribeToChanges: false,
  });

  const { showSuccess, showError } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<StudentPayment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // The receipt number we generated for the open form; replaced if the date moves to another year.
  const [autoReceiptNo, setAutoReceiptNo] = useState<string | null>(null);

  const payments: StudentPayment[] = Array.isArray(studentPayments) ? studentPayments : [];
  const studentList: Student[] = Array.isArray(students) ? students : [];
  const issuedReceiptNumbers = () => payments.map((payment) => payment.receipt_no);

  const blankPaymentForm = (): StudentPaymentFormData => {
    const transactionDate = todayIsoDate();
    return {
      student_id: undefined,
      receipt_no: nextReceiptNumber(issuedReceiptNumbers(), transactionDate),
      total_amount_paid: 0,
      payment_method: 'Cash',
      transaction_date: transactionDate,
      reference_no: ''
    };
  };
  const [paymentFormData, setPaymentFormData] = useState<StudentPaymentFormData>({});

  const openModal = (payment?: StudentPayment) => {
    setEditingPayment(payment || null);
    setFormError(null);
    if (payment) {
      setAutoReceiptNo(null);
      setPaymentFormData({
        student_id: payment.student_id,
        receipt_no: payment.receipt_no,
        total_amount_paid: payment.total_amount_paid,
        payment_method: payment.payment_method,
        transaction_date: toIsoDate(payment.transaction_date),
        reference_no: payment.reference_no
      });
    } else {
      const blank = blankPaymentForm();
      setAutoReceiptNo(blank.receipt_no ?? null);
      setPaymentFormData(blank);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    setFormError(null);
    setAutoReceiptNo(null);
    setPaymentFormData({});
  };

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormError(null);
    if (name === 'transaction_date' && !editingPayment && paymentFormData.receipt_no === autoReceiptNo) {
      const regenerated = nextReceiptNumber(issuedReceiptNumbers(), value);
      setAutoReceiptNo(regenerated);
      setPaymentFormData(prev => ({ ...prev, transaction_date: value, receipt_no: regenerated }));
      return;
    }
    setPaymentFormData(prev => ({ ...prev, [name]: (name === 'total_amount_paid') ? parseFloat(value) : value }));
  };

  const validatePaymentForm = (receiptNo: string): string | null => {
    const problems: string[] = [];
    if (!paymentFormData.student_id) problems.push('Select a student.');
    if (!receiptNo) problems.push('Enter a receipt number.');
    const amount = Number(paymentFormData.total_amount_paid);
    if (!Number.isFinite(amount) || amount <= 0) problems.push('Enter an amount paid greater than zero.');
    if (!paymentFormData.transaction_date) problems.push('Enter the transaction date.');
    if (receiptNo && payments.some((p) => p.id !== editingPayment?.id && p.receipt_no?.trim() === receiptNo)) {
      problems.push(`Receipt number ${receiptNo} is already in use.`);
    }
    return problems.length ? problems.join(' ') : null;
  };

  const handleSubmit = async () => {
    if (saving) return;
    // An untouched auto number is re-issued at save time so it reflects payments recorded meanwhile.
    const receiptNo = (!editingPayment && paymentFormData.receipt_no === autoReceiptNo
      ? nextReceiptNumber(issuedReceiptNumbers(), paymentFormData.transaction_date)
      : paymentFormData.receipt_no ?? '').trim();

    const validationError = validatePaymentForm(receiptNo);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const student = studentList.find((s) => s.id === paymentFormData.student_id);
    const payload = {
      ...paymentFormData,
      receipt_no: receiptNo,
      total_amount_paid: Number(paymentFormData.total_amount_paid),
      student_name: student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() : undefined,
    };

    setSaving(true);
    setFormError(null);
    try {
      if (editingPayment) {
        await paymentsCollection.update(editingPayment.id, { ...payload, updated_at: new Date().toISOString() });
        showSuccess('Student payment updated successfully!');
      } else {
        await recordStudentPayment(payload);
        showSuccess(`Payment recorded. Receipt ${receiptNo}.`);
      }
      closeModal();
    } catch (error) {
      logger.error('Error saving student payment:', error);
      setFormError(`Failed to save student payment: ${errorMessage(error)}`);
      setSaving(false);
      return;
    }
    setSaving(false);
    if (editingPayment) {
      await refreshData().catch((error: unknown) => logger.error('Error reloading student payments:', error));
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (paymentId: string) => {
    if (!(await confirm({ variant: 'danger', message: 'Are you sure you want to delete this payment record?' }))) {
      return;
    }

    try {
      await paymentsCollection.remove(paymentId);
      showSuccess('Student payment deleted successfully!');
    } catch (error) {
      showError(`Failed to delete student payment: ${errorMessage(error)}`);
      logger.error('Error deleting student payment:', error);
      return;
    }
    await refreshData().catch((error: unknown) => logger.error('Error reloading student payments:', error));
  };

  const paymentColumns: DataGridColumn<StudentPayment>[] = [
    { 
      key: 'receipt_no', 
      header: 'Receipt No', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    { 
      key: 'student_name', 
      header: 'Student Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'total_amount_paid', 
      header: 'Amount Paid (KES)', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (_value, row) => <span className="font-mono text-green-600">{`KES ${row.total_amount_paid?.toFixed(2) || '0.00'}`}</span>
    },
    { 
      key: 'payment_method', 
      header: 'Payment Method', 
      sortable: true, 
      filterable: true, 
      width: 130,
      render: (value) => <span className="text-primary-600">{value}</span>
    },
    { 
      key: 'transaction_date', 
      header: 'Date', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (_value, row) => <span className="text-surface-foreground">{formatDate(row.transaction_date)}</span>
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

  const isLoadingData = loading.studentPayments || loading.students;

  if (isLoadingData && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Student Payments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Student Payments" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Record Payment
        </Button>
      }>
        <DataGrid 
          columns={paymentColumns} 
          data={payments}
          isLoading={loading.studentPayments}
          sortable
          filterable
          emptyState={{
            icon: <CreditCardIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: "No Student Payments Found",
            description: "Record your first student payment to track fee collections and payment history.",
            action: {
              label: "Record Payment",
              onClick: () => openModal()
            }
          }}
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPayment ? 'Edit Student Payment' : 'Record New Student Payment'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editingPayment ? 'Save Changes' : 'Record Payment'}
            </Button>
          </>
        }
      >
        {formError && (
          <Alert variant="destructive" className="mb-4">{formError}</Alert>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select name="student_id" label="Student" value={paymentFormData.student_id || ''} onChange={handlePaymentInputChange} required>
            <option value="">Select Student</option>
            {studentList.map((student: Student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name} ({student.admission_no})
              </option>
            ))}
          </Select>
          <Input name="receipt_no" label="Receipt Number" value={paymentFormData.receipt_no || ''} onChange={handlePaymentInputChange} required />
          <Input name="total_amount_paid" label="Total Amount Paid (KES)" type="number" step="0.01" value={paymentFormData.total_amount_paid || ''} onChange={handlePaymentInputChange} required />
          <Select name="payment_method" label="Payment Method" value={paymentFormData.payment_method || ''} onChange={handlePaymentInputChange}>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
            <option value="Mobile Money">Mobile Money</option>
            <option value="Card">Card</option>
            <option value="Other">Other</option>
          </Select>
          <Input name="transaction_date" label="Transaction Date" type="date" value={paymentFormData.transaction_date || ''} onChange={handlePaymentInputChange} required />
          <Input name="reference_no" label="Reference No. (e.g., Cheque No, M-Pesa Code)" value={paymentFormData.reference_no || ''} onChange={handlePaymentInputChange} />
        </div>
      </DialogForm>
    </div>
  );
};

const StudentPaymentsPage: React.FC = () => (
  <div className="space-y-6">
    <StudentPaymentsPageContent />
  </div>
);

export default StudentPaymentsPage;
