
import React, { useState, useMemo } from 'react';
import { FeeAdjustment, Student, SchoolPeriod, FeeAdjustmentType, StudentStatus } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, ReceiptPercentIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';

type FeeAdjustmentFormData = Omit<Partial<FeeAdjustment>, 'id' | 'created_at' | 'student_name' | 'school_period_name' | 'adjustment_type'> & {
    adjustment_type: FeeAdjustmentType;
};

const FeeAdjustmentsPage: React.FC = () => {
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
  const [editingAdjustment, setEditingAdjustment] = useState<FeeAdjustment | null>(null);
  
  const initialFormData: FeeAdjustmentFormData = { 
    student_id: undefined, 
    school_period_id: undefined,
    adjustment_type: FeeAdjustmentType.EXEMPTION, 
    amount: 0, 
    reason: '', 
    applied_invoice_id: undefined 
  };
  const [formData, setFormData] = useState<FeeAdjustmentFormData>(initialFormData);

  const activeStudents = useMemo(() => students.filter(s => s.status === StudentStatus.ACTIVE), [students]);

  const openModal = (adjustment?: FeeAdjustment) => {
    setEditingAdjustment(adjustment || null);
    setFormData(adjustment ? 
      { 
        student_id: adjustment.student_id, 
        school_period_id: adjustment.school_period_id, 
        adjustment_type: adjustment.adjustment_type, 
        amount: adjustment.amount, 
        reason: adjustment.reason,
        applied_invoice_id: adjustment.applied_invoice_id
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAdjustment(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | undefined = value;
    if (name === 'school_period_id') {
        processedValue = value ? parseInt(value) : undefined;
    } else if (name === 'amount') {
        processedValue = parseFloat(value) || 0;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };
  
  const handleSubmit = async () => {
    if (!formData.student_id || !formData.school_period_id || formData.amount === undefined || !formData.adjustment_type) {
      alert("Student, School Period, Adjustment Type, and Amount are required.");
      return;
    }
    const payload: Omit<FeeAdjustment, 'id'|'created_at'|'student_name'|'school_period_name'> = {
      student_id: formData.student_id!,
      school_period_id: Number(formData.school_period_id!),
      adjustment_type: formData.adjustment_type,
      amount: Number(formData.amount),
      reason: formData.reason || undefined,
      applied_invoice_id: formData.applied_invoice_id || undefined,
    };

    if (editingAdjustment) {
      await updateFeeAdjustment({ ...editingAdjustment, ...payload });
    } else {
      await addFeeAdjustment(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this fee adjustment?')) {
      await deleteFeeAdjustment(id);
    }
  };

  const columns = [
    { header: 'Student Name', accessor: 'student_name' as keyof FeeAdjustment },
    { header: 'School Period', accessor: 'school_period_name' as keyof FeeAdjustment },
    { header: 'Type', accessor: 'adjustment_type' as keyof FeeAdjustment },
    { header: 'Amount (KES)', accessor: 'amount' as keyof FeeAdjustment, render: (item: FeeAdjustment) => item.amount.toFixed(2) },
    { header: 'Reason', accessor: 'reason' as keyof FeeAdjustment },
    { header: 'Applied to Invoice', accessor: 'applied_invoice_id' as keyof FeeAdjustment },
    {
      header: 'Actions',
      accessor: 'id' as keyof FeeAdjustment,
      render: (item: FeeAdjustment) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];
  
  const isLoadingData = loading.feeAdjustments || loading.students || loading.schoolPeriods;

  if (isLoadingData && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Fee Adjustments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Student Fee Adjustments" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Adjustment
        </Button>
      }>
        <Table columns={columns} data={feeAdjustments} isLoading={loading.feeAdjustments && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAdjustment ? 'Edit Fee Adjustment' : 'Add New Fee Adjustment'} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.feeAdjustments}>
              {loading.feeAdjustments ? <Spinner size="sm"/> : (editingAdjustment ? 'Save Changes' : 'Add Adjustment')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="student_id" label="Student" value={formData.student_id || ''} onChange={handleInputChange} required>
                <option value="">Select Student</option>
                {activeStudents.map((student: Student) => (<option key={student.id} value={student.id}>{student.first_name} {student.last_name} ({student.admission_no})</option>))}
            </Select>
            <Select name="school_period_id" label="School Period" value={formData.school_period_id || ''} onChange={handleInputChange} required>
                <option value="">Select School Period</option>
                {schoolPeriods.map((period: SchoolPeriod) => (<option key={period.id} value={period.id}>{period.name}</option>))}
            </Select>
            <Select name="adjustment_type" label="Adjustment Type" value={formData.adjustment_type} onChange={handleInputChange} required>
                {Object.values(FeeAdjustmentType).map(type => (<option key={type} value={type}>{type}</option>))}
            </Select>
            <Input name="amount" label="Amount (KES)" type="number" step="0.01" value={formData.amount || ''} onChange={handleInputChange} required placeholder="Negative for discount/scholarship, positive for penalty"/>
            <Input name="applied_invoice_id" label="Applied Invoice ID (Optional)" value={formData.applied_invoice_id || ''} onChange={handleInputChange} placeholder="e.g., SINV123"/>
             <Textarea name="reason" label="Reason for Adjustment" value={formData.reason || ''} onChange={handleInputChange} rows={3} containerClassName="md:col-span-2"/>
        </div>
      </Modal>
    </div>
  );
};

export default FeeAdjustmentsPage;
