import React, { useState, useMemo, useEffect } from 'react';
import { StudentPayment, Student, InvoiceStatus, StudentInvoice, StudentInvoiceItem, InvoicePaymentApplication } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, ReceiptRefundIcon, CheckCircleIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type StudentPaymentFormData = Omit<Partial<StudentPayment>, 'id' | 'created_at' | 'updated_at' | 'student_name'>;
interface InvoiceItemApplicationData {
    invoice_item_id: string;
    amount_to_apply: string; // Input as string
    item_balance: number;
    item_description: string;
}

const StudentPaymentsPage: React.FC = () => {
  const { 
    studentPayments, 
    students,
    studentInvoices,
    studentInvoiceItems, // Needed for detailed application
    invoicePaymentApplications, // Added this line
    loading, 
    addStudentPayment, 
    updateStudentPayment, 
    deleteStudentPayment,
    applyPaymentToInvoices
  } = useAppData();
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  
  const [editingPayment, setEditingPayment] = useState<StudentPayment | null>(null);
  const [currentPaymentForApplication, setCurrentPaymentForApplication] = useState<StudentPayment | null>(null);
  
  const initialPaymentFormData: StudentPaymentFormData = { 
    student_id: undefined, 
    receipt_no: '', 
    total_amount_paid: 0, 
    payment_method: 'Cash', 
    transaction_date: new Date().toISOString().split('T')[0], 
    reference_no: '' 
  };
  const [paymentFormData, setPaymentFormData] = useState<StudentPaymentFormData>(initialPaymentFormData);
  const [itemApplications, setItemApplications] = useState<InvoiceItemApplicationData[]>([]);


  const openPaymentModal = (payment?: StudentPayment) => {
    setEditingPayment(payment || null);
    setPaymentFormData(payment ? 
      { 
        student_id: payment.student_id, 
        receipt_no: payment.receipt_no, 
        total_amount_paid: payment.total_amount_paid, 
        payment_method: payment.payment_method, 
        transaction_date: new Date(payment.transaction_date).toISOString().split('T')[0],
        reference_no: payment.reference_no
      } : 
      initialPaymentFormData
    );
    setIsPaymentModalOpen(true);
  };
  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setEditingPayment(null);
    setPaymentFormData(initialPaymentFormData);
  };

  const openApplicationModal = (payment: StudentPayment) => {
    setCurrentPaymentForApplication(payment);
    const studentUnpaidInvoices = studentInvoices.filter(
      inv => inv.student_id === payment.student_id && 
             (inv.status === InvoiceStatus.DUE || inv.status === InvoiceStatus.PARTIALLY_PAID || inv.status === InvoiceStatus.OVERDUE)
    );
    const applications: InvoiceItemApplicationData[] = [];
    studentUnpaidInvoices.forEach(inv => {
        (inv.items || []).forEach(item => {
            const paidOnItem = invoicePaymentApplications
                .filter(ipa => ipa.invoice_item_id === item.id)
                .reduce((sum, ipa) => sum + ipa.amount_applied, 0);
            const itemBalance = item.amount - paidOnItem;
            if (itemBalance > 0) {
                 applications.push({ 
                    invoice_item_id: item.id, 
                    amount_to_apply: '0', 
                    item_balance: itemBalance,
                    item_description: `${item.description} (Inv: ${inv.invoice_number})`
                });
            }
        });
    });
    setItemApplications(applications);
    setIsApplicationModalOpen(true);
  };
  const closeApplicationModal = () => {
    setIsApplicationModalOpen(false);
    setCurrentPaymentForApplication(null);
    setItemApplications([]);
  };

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPaymentFormData(prev => ({ ...prev, [name]: (name === 'total_amount_paid') ? parseFloat(value) : value }));
  };

  const handleApplicationAmountChange = (itemId: string, amountStr: string) => {
    setItemApplications(prev => prev.map(app => 
      app.invoice_item_id === itemId ? { ...app, amount_to_apply: amountStr } : app
    ));
  };
  
  const handlePaymentSubmit = async () => {
    if (!paymentFormData.student_id || !paymentFormData.receipt_no || paymentFormData.total_amount_paid <= 0 || !paymentFormData.transaction_date) {
      alert("Student, Receipt No, valid Amount Paid, and Transaction Date are required.");
      return;
    }
    const payload: Omit<StudentPayment, 'id'|'created_at'|'updated_at'|'student_name'> = {
      student_id: paymentFormData.student_id!,
      receipt_no: paymentFormData.receipt_no!,
      total_amount_paid: Number(paymentFormData.total_amount_paid),
      payment_method: paymentFormData.payment_method || undefined,
      transaction_date: paymentFormData.transaction_date!,
      reference_no: paymentFormData.reference_no || undefined,
    };

    if (editingPayment) {
      await updateStudentPayment({ ...editingPayment, ...payload });
    } else {
      await addStudentPayment(payload);
    }
    closePaymentModal();
  };

  const handleApplyPaymentSubmit = async () => {
    if (!currentPaymentForApplication) return;

    const validApplications = itemApplications
        .filter(app => parseFloat(app.amount_to_apply) > 0)
        .map(app => ({
            payment_id: currentPaymentForApplication.id, // Added payment_id
            invoice_item_id: app.invoice_item_id,
            amount_applied: parseFloat(app.amount_to_apply)
        }));
    
    const totalApplied = validApplications.reduce((sum, app) => sum + app.amount_applied, 0);
    if (totalApplied > currentPaymentForApplication.total_amount_paid) {
        alert("Total applied amount cannot exceed the payment amount.");
        return;
    }
    // Further validation: ensure applied amount doesn't exceed item balance
    for (const app of validApplications) {
        const itemAppData = itemApplications.find(ia => ia.invoice_item_id === app.invoice_item_id);
        if (app.amount_applied > (itemAppData?.item_balance || 0)) {
            alert(`Amount applied to "${itemAppData?.item_description}" exceeds its balance.`);
            return;
        }
    }

    if (validApplications.length > 0) {
        await applyPaymentToInvoices(currentPaymentForApplication.id, validApplications);
    }
    closeApplicationModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this payment record? This may affect invoice statuses.')) {
      await deleteStudentPayment(id);
    }
  };

  const paymentColumns = [
    { header: 'Receipt No', accessor: 'receipt_no' as keyof StudentPayment },
    { header: 'Student Name', accessor: 'student_name' as keyof StudentPayment },
    { header: 'Amount Paid (KES)', accessor: 'total_amount_paid' as keyof StudentPayment, render: (item: StudentPayment) => item.total_amount_paid.toFixed(2) },
    { header: 'Payment Method', accessor: 'payment_method' as keyof StudentPayment },
    { header: 'Date', accessor: 'transaction_date' as keyof StudentPayment, render: (item: StudentPayment) => new Date(item.transaction_date).toLocaleDateString() },
    {
      header: 'Actions',
      accessor: 'id' as keyof StudentPayment,
      render: (item: StudentPayment) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openPaymentModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="secondary" onClick={() => openApplicationModal(item)} leftIcon={<CheckCircleIcon className="w-4 h-4" />}>Apply</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];
  
  const isLoadingData = loading.studentPayments || loading.students || loading.studentInvoices || loading.studentInvoiceItems || loading.invoicePaymentApplications;

  if (isLoadingData && !isPaymentModalOpen && !isApplicationModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Student Payments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Student Payments" actions={
        <Button onClick={() => openPaymentModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Record Payment
        </Button>
      }>
        <Table columns={paymentColumns} data={studentPayments} isLoading={loading.studentPayments && isPaymentModalOpen} />
      </Card>

      <Modal isOpen={isPaymentModalOpen} onClose={closePaymentModal} title={editingPayment ? 'Edit Student Payment' : 'Record New Student Payment'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closePaymentModal}>Cancel</Button>
            <Button onClick={handlePaymentSubmit} disabled={loading.studentPayments}>
              {loading.studentPayments ? <Spinner size="sm"/> : (editingPayment ? 'Save Changes' : 'Record Payment')}
            </Button>
          </>
        }
      >
        <Select name="student_id" label="Student" value={paymentFormData.student_id || ''} onChange={handlePaymentInputChange} required>
            <option value="">Select Student</option>
            {students.map((student: Student) => (<option key={student.id} value={student.id}>{student.first_name} {student.last_name} ({student.admission_no})</option>))}
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
      </Modal>

      {/* Payment Application Modal */}
      <Modal 
        isOpen={isApplicationModalOpen} 
        onClose={closeApplicationModal} 
        title={`Apply Payment: ${currentPaymentForApplication?.receipt_no} (Amount: KES ${currentPaymentForApplication?.total_amount_paid.toFixed(2)})`}
        size="xl"
        footer={
            <>
             <Button variant="secondary" onClick={closeApplicationModal}>Cancel</Button>
             <Button onClick={handleApplyPaymentSubmit} disabled={loading.studentInvoices || loading.invoicePaymentApplications}>
                { (loading.studentInvoices || loading.invoicePaymentApplications) ? <Spinner size="sm"/> : 'Apply Payment to Invoices'}
            </Button>
            </>
        }
        >
            {currentPaymentForApplication && itemApplications.length > 0 ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-600">Enter amounts to apply against each unpaid invoice item for <strong>{students.find(s=>s.id === currentPaymentForApplication.student_id)?.display_name}</strong>. Total applied cannot exceed payment amount.</p>
                    {itemApplications.map(app => (
                        <div key={app.invoice_item_id} className="grid grid-cols-3 gap-3 items-center p-2 border rounded-md hover:bg-gray-50">
                            <div className="col-span-2">
                                <label htmlFor={`apply-${app.invoice_item_id}`} className="block text-sm font-medium text-gray-700">{app.item_description}</label>
                                <span className="text-xs text-gray-500">Balance: KES {app.item_balance.toFixed(2)}</span>
                            </div>
                            <Input
                                id={`apply-${app.invoice_item_id}`}
                                type="number"
                                step="0.01"
                                min="0"
                                max={app.item_balance}
                                placeholder="Amount to Apply"
                                value={app.amount_to_apply}
                                onChange={e => handleApplicationAmountChange(app.invoice_item_id, e.target.value)}
                                containerClassName="mb-0"
                            />
                        </div>
                    ))}
                    <div className="text-right font-semibold mt-3">
                        Total Applied: KES {itemApplications.reduce((sum, app) => sum + (parseFloat(app.amount_to_apply) || 0), 0).toFixed(2)}
                    </div>
                     <div className="text-right font-semibold mt-1 text-blue-600">
                        Remaining Payment Amount: KES {(currentPaymentForApplication.total_amount_paid - itemApplications.reduce((sum, app) => sum + (parseFloat(app.amount_to_apply) || 0), 0)).toFixed(2)}
                    </div>
                </div>
            ) : (
                 <p className="text-center text-gray-500 py-4">No unpaid invoices found for this student to apply the payment to, or payment amount fully applied.</p>
            )}
      </Modal>

    </div>
  );
};

export default StudentPaymentsPage;
