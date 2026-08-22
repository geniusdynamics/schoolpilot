import React, { useState, useMemo } from 'react';
import { StudentOpeningBalance, OpeningBalanceType } from '@/modules/finance';
import { Student, StudentStatus } from '@/core/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, BookOpenIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';

type StudentOpeningBalanceFormData = Omit<Partial<StudentOpeningBalance>, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'balance_type'> & {
    balance_type: OpeningBalanceType;
};

export const StudentOpeningBalancesPageContent: React.FC = () => {
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
    if (!studentOpeningBalances || !students) return [];
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

  const columns: DataGridColumn<StudentOpeningBalance>[] = [
    { 
      key: 'student_name', 
      header: 'Student Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, row) => <span className="font-medium">{value}</span>
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
      render: (value, row) => <span className="font-mono text-green-600">{row.amount?.toFixed?.(2) ?? '0.00'}</span>
    },
    { 
      key: 'as_of_date', 
      header: 'As Of Date', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, row) => <span className="text-blue-600">{row.as_of_date ? new Date(row.as_of_date).toLocaleDateString() : '-'}</span>
    },
    { 
      key: 'is_billed', 
      header: 'Billed', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value, row) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.is_billed ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
      }`}>{row.is_billed ? 'Yes' : 'No'}</span>
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
  
  const isLoadingData = loading.studentOpeningBalances || loading.students;

  if (isLoadingData && !isModalOpen && !studentOpeningBalances && !students) {
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
        <DataGrid 
          columns={columns} 
          data={studentOpeningBalances || []} 
          isLoading={loading.studentOpeningBalances && isModalOpen}
          sortable
          filterable
          emptyState={{
            icon: <BookOpenIcon className="w-12 h-12 text-gray-400" />,
            title: "No opening balances found",
            description: "Set up opening fee balances for students to track their financial history from the beginning of the academic period.",
            action: studentsWithoutOB.length > 0 ? {
              label: "Add Opening Balance",
              onClick: () => openModal()
            } : undefined
          }}
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingBalance ? 'Edit Opening Balance' : 'Add Student Opening Balance'} size="lg"
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
