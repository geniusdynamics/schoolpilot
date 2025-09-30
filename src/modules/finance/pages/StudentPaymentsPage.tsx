import React, { useState } from 'react';
import { FinStudentPaymentType as StudentPayment, Student } from '../../../types';
import Card from '../../../components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, CreditCardIcon } from '../../../components/ui/icons';
import { useAppData } from '../../../hooks/useAppData';
import { useToast } from '../../../hooks/useToast';
import Spinner from '../../../components/ui/Spinner';

type StudentPaymentFormData = Omit<Partial<StudentPayment>, 'id' | 'created_at' | 'updated_at' | 'student_name'>;

const StudentPaymentsPage: React.FC = () => {
  const {
    studentPayments,
    students,
    loading,
    addStudentPayment,
    updateStudentPayment,
    deleteStudentPayment
  } = useAppData();

  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<StudentPayment | null>(null);

  const initialPaymentFormData: StudentPaymentFormData = {
    student_id: undefined,
    receipt_no: '',
    total_amount_paid: 0,
    payment_method: 'Cash',
    transaction_date: new Date().toISOString().split('T')[0],
    reference_no: ''
  };
  const [paymentFormData, setPaymentFormData] = useState<StudentPaymentFormData>(initialPaymentFormData);


  const openModal = (payment?: StudentPayment) => {
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
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    setPaymentFormData(initialPaymentFormData);
  };

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPaymentFormData(prev => ({ ...prev, [name]: (name === 'total_amount_paid') ? parseFloat(value) : value }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!paymentFormData.student_id || !paymentFormData.receipt_no || (paymentFormData.total_amount_paid || 0) <= 0 || !paymentFormData.transaction_date) {
      showToast('Student, Receipt No, valid Amount Paid, and Transaction Date are required.', 'error');
      return;
    }

    try {
      if (editingPayment) {
        // Update existing payment
        await updateStudentPayment(editingPayment.id, paymentFormData);
        showToast('Student payment updated successfully!', 'success');
      } else {
        // Add new payment
        await addStudentPayment(paymentFormData);
        showToast('Student payment added successfully!', 'success');
      }
      setIsModalOpen(false);
      setEditingPayment(null);
      setPaymentFormData(initialPaymentFormData);
    } catch (error) {
      showToast('Failed to save student payment. Please try again.', 'error');
      console.error('Error saving student payment:', error);
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) {
      return;
    }
    
    try {
      await deleteStudentPayment(paymentId);
      showToast('Student payment deleted successfully!', 'success');
    } catch (error) {
      showToast('Failed to delete student payment. Please try again.', 'error');
      console.error('Error deleting student payment:', error);
    }
  };

  const paymentColumns: DataGridColumn<StudentPayment>[] = [
    { 
      key: 'receipt_no', 
      header: 'Receipt No', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, row) => <span className="font-mono text-sm">{value}</span>
    },
    { 
      key: 'student_name', 
      header: 'Student Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, row) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'total_amount_paid', 
      header: 'Amount Paid (KES)', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, row) => <span className="font-mono text-green-600">{`KES ${row.total_amount_paid?.toFixed(2) || '0.00'}`}</span>
    },
    { 
      key: 'payment_method', 
      header: 'Payment Method', 
      sortable: true, 
      filterable: true, 
      width: 130,
      render: (value, row) => <span className="text-blue-600">{value}</span>
    },
    { 
      key: 'transaction_date', 
      header: 'Date', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, row) => <span className="text-gray-700">{new Date(row.transaction_date).toLocaleDateString()}</span>
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (value, row) => (
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
          data={studentPayments || []} 
          isLoading={loading.studentPayments}
          sortable
          filterable
          emptyState={{
            icon: <CreditCardIcon className="w-12 h-12 text-gray-400" />,
            title: "No Student Payments Found",
            description: "Record your first student payment to track fee collections and payment history.",
            action: {
              label: "Record Payment",
              onClick: () => openModal()
            }
          }}
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPayment ? 'Edit Student Payment' : 'Record New Student Payment'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.studentPayments}>
              {loading.studentPayments ? <Spinner size="sm" /> : (editingPayment ? 'Save Changes' : 'Record Payment')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select name="student_id" label="Student" value={paymentFormData.student_id || ''} onChange={handlePaymentInputChange} required>
            <option value="">Select Student</option>
            {students.map((student: Student) => (
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
      </Modal>
    </div>
  );
};

export default StudentPaymentsPage;
