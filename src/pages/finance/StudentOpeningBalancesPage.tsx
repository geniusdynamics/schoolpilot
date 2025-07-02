import React, { useState, useMemo } from 'react';
import { FinStudentOpeningBalanceType as StudentOpeningBalance, Student, FinOpeningBalanceTypeEnum as OpeningBalanceType, StudentStatus } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, BookOpenIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type StudentOpeningBalanceFormData = Omit<Partial<StudentOpeningBalance>, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'balance_type'> & {
    balance_type: OpeningBalanceType;
};

const StudentOpeningBalancesPage: React.FC = () => {
  const { 
    studentOpeningBalances, 
    students,
    loading, 
    addStudentOpeningBalance, 
    updateStudentOpeningBalance, 
    deleteStudentOpeningBalance 
  } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState<StudentOpeningBalance | null>(null);
  
  const initialFormData: StudentOpeningBalanceFormData = { 
    student_id: undefined, 
    balance_type: OpeningBalanceType.DEBIT, 
    amount: 0, 
    as_of_date: new Date().toISOString().split('T')[0], 
    is_billed: false 
  };
  const [formData, setFormData] = useState<StudentOpeningBalanceFormData>(initialFormData);

  const studentsWithoutOB = useMemo(() => {
    const studentIdsWithOB = new Set(studentOpeningBalances.map(ob => ob.student_id));
    return students.filter(s => !studentIdsWithOB.has(s.id) && s.status === StudentStatus.ACTIVE);
  }, [students, studentOpeningBalances]);

  const openModal = (balance?: StudentOpeningBalance) => {
    setEditingBalance(balance || null);
    setFormData(balance ? 
      { 
        student_id: balance.student_id, 
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
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const val = type === 'checkbox' ? e.target.checked : (name === 'amount' ? parseFloat(value) : value);
    setFormData(prev => ({ ...prev, [name]: val }));
  };
  
  const handleSubmit = async () => {
    if (!formData.student_id || formData.amount === undefined || !formData.as_of_date) {
      alert("Student, Amount, and As Of Date are required.");
      return;
    }
    const payload: Omit<StudentOpeningBalance, 'id'|'created_at'|'updated_at'|'student_name'> = {
      student_id: formData.student_id!,
      balance_type: formData.balance_type,
      amount: Number(formData.amount),
      as_of_date: formData.as_of_date!,
      is_billed: formData.is_billed || false,
    };

    if (editingBalance) {
      await updateStudentOpeningBalance({ ...editingBalance, ...payload });
    } else {
      await addStudentOpeningBalance(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this opening balance record?')) {
      await deleteStudentOpeningBalance(id);
    }
  };

  const columns = [
    { header: 'Student Name', accessor: 'student_name' as keyof StudentOpeningBalance },
    { header: 'Balance Type', accessor: 'balance_type' as keyof StudentOpeningBalance },
    { header: 'Amount (KES)', accessor: 'amount' as keyof StudentOpeningBalance, render: (item: StudentOpeningBalance) => item.amount.toFixed(2) },
    { header: 'As Of Date', accessor: 'as_of_date' as keyof StudentOpeningBalance, render: (item: StudentOpeningBalance) => new Date(item.as_of_date).toLocaleDateString() },
    { header: 'Billed', accessor: 'is_billed' as keyof StudentOpeningBalance },
    {
      header: 'Actions',
      accessor: 'id' as keyof StudentOpeningBalance,
      render: (item: StudentOpeningBalance) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];
  
  const isLoadingData = loading.studentOpeningBalances || loading.students;

  if (isLoadingData && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Student Opening Balances...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Student Opening Fee Balances" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />} disabled={studentsWithoutOB.length === 0}>
          Add Opening Balance
        </Button>
      }>
        {studentsWithoutOB.length === 0 && !editingBalance && (
            <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md">All active students seem to have opening balances recorded.</p>
        )}
        <Table columns={columns} data={studentOpeningBalances} isLoading={loading.studentOpeningBalances && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingBalance ? 'Edit Opening Balance' : 'Add Student Opening Balance'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.studentOpeningBalances}>
              {loading.studentOpeningBalances ? <Spinner size="sm"/> : (editingBalance ? 'Save Changes' : 'Add Balance')}
            </Button>
          </>
        }
      >
        <Select name="student_id" label="Student" value={formData.student_id || ''} onChange={handleInputChange} required disabled={!!editingBalance}>
            <option value="">Select Student</option>
            {(editingBalance ? students : studentsWithoutOB).map((student: Student) => (<option key={student.id} value={student.id}>{student.first_name} {student.last_name} ({student.admission_no})</option>))}
        </Select>
        <Select name="balance_type" label="Balance Type" value={formData.balance_type} onChange={handleInputChange} required>
            {Object.values(OpeningBalanceType).map(type => (<option key={type} value={type}>{type}</option>))}
        </Select>
        <Input name="amount" label="Amount (KES)" type="number" step="0.01" value={formData.amount || ''} onChange={handleInputChange} required />
        <Input name="as_of_date" label="As Of Date" type="date" value={formData.as_of_date || ''} onChange={handleInputChange} required />
        <div className="mt-4 flex items-center">
            <input id="is_billed" name="is_billed" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
                checked={formData.is_billed || false} onChange={handleInputChange} />
            <label htmlFor="is_billed" className="ml-2 block text-sm text-gray-900">Consider this amount as already billed (affects statement)</label>
        </div>
      </Modal>
    </div>
  );
};

export default StudentOpeningBalancesPage;
