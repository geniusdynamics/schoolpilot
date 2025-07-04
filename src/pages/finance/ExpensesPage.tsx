import React, { useState, useMemo } from 'react';
import { ExpenseClaim, FinExpenseClaimantTypeEnum, Staff, Student, FinExpenseCategoryType } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, CurrencyDollarIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type ExpenseClaimFormData = Omit<Partial<ExpenseClaim>, 'id' | 'created_at' | 'updated_at' | 'claimant_name' | 'expense_category_name' | 'claimant_type'> & {
    claimant_type: FinExpenseClaimantTypeEnum; // Ensure this is required for form logic
};

const ExpensesPage: React.FC = () => {
  const { 
    expenseClaims, 
    expenseCategories,
    staff,
    students,
    loading, 
    addExpenseClaim, 
    updateExpenseClaim, 
    deleteExpenseClaim 
  } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<ExpenseClaim | null>(null);
  
  const initialFormData: ExpenseClaimFormData = { 
    claimant_type: FinExpenseClaimantTypeEnum.STAFF, 
    claimant_id: undefined, 
    claim_date: new Date().toISOString().split('T')[0], 
    description: '', 
    amount: 0, 
    expense_category_id: undefined 
  };
  const [formData, setFormData] = useState<ExpenseClaimFormData>(initialFormData);

  const claimantList = useMemo(() => {
    if (formData.claimant_type === FinExpenseClaimantTypeEnum.STAFF) {
      return (staff || []).filter(s => s.is_active).map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name} (Staff)` }));
    } else if (formData.claimant_type === FinExpenseClaimantTypeEnum.STUDENT) {
      return (students || []).filter(s => s.status === 'Active').map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name} (Student)` }));
    }
    return [];
  }, [formData.claimant_type, staff, students]);

  const openModal = (claim?: ExpenseClaim) => {
    setEditingClaim(claim || null);
    setFormData(claim ? 
      { 
        claimant_type: claim.claimant_type, 
        claimant_id: claim.claimant_id, 
        claim_date: new Date(claim.claim_date).toISOString().split('T')[0], 
        description: claim.description, 
        amount: claim.amount, 
        expense_category_id: claim.expense_category_id 
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClaim(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | undefined = value;
    if (name === 'expense_category_id' || name === 'claimant_id') {
        processedValue = value || undefined;
    } else if (name === 'amount') {
        processedValue = parseFloat(value) || 0;
    }
    
    setFormData(prev => {
        const newState = { ...prev, [name]: processedValue };
        if (name === 'claimant_type') { // Reset claimant_id if type changes
            newState.claimant_id = undefined;
        }
        return newState;
    });
  };

  const handleSubmit = async () => {
    if (!formData.claimant_id || !formData.claim_date || !formData.description || formData.amount <= 0 || !formData.expense_category_id) {
      alert("Claimant, Claim Date, Description, valid Amount, and Expense Category are required.");
      return;
    }
    const payload: Omit<ExpenseClaim, 'id' | 'created_at' | 'updated_at' | 'claimant_name' | 'expense_category_name'> = {
      claimant_type: formData.claimant_type,
      claimant_id: formData.claimant_id!,
      claim_date: formData.claim_date!,
      description: formData.description!,
      amount: Number(formData.amount),
      expense_category_id: Number(formData.expense_category_id!),
      // workflow_state_id and approved_by would be handled by a workflow system
    };

    if (editingClaim) {
      await updateExpenseClaim({ ...editingClaim, ...payload });
    } else {
      await addExpenseClaim(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense claim?')) {
      await deleteExpenseClaim(id);
    }
  };

  const columns = [
    { header: 'Claim ID', accessor: 'id' as keyof ExpenseClaim },
    { header: 'Claimant', accessor: 'claimant_name' as keyof ExpenseClaim },
    { header: 'Type', accessor: 'claimant_type' as keyof ExpenseClaim },
    { header: 'Date', accessor: 'claim_date' as keyof ExpenseClaim, render: (item: ExpenseClaim) => new Date(item.claim_date).toLocaleDateString() },
    { header: 'Amount (KES)', accessor: 'amount' as keyof ExpenseClaim, render: (item: ExpenseClaim) => item.amount.toFixed(2) },
    { header: 'Category', accessor: 'expense_category_name' as keyof ExpenseClaim },
    { header: 'Description', accessor: 'description' as keyof ExpenseClaim, render: (item: ExpenseClaim) => <p className="truncate max-w-xs">{item.description}</p> },
    // { header: 'Status', accessor: 'workflow_status_name' as keyof ExpenseClaim }, // Placeholder
    {
      header: 'Actions',
      accessor: 'id' as keyof ExpenseClaim,
      render: (item: ExpenseClaim) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const isLoadingPageData = loading.expenseClaims || loading.expenseCategories || loading.staff || loading.students;

  if (isLoadingPageData && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Expense Claims...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Expense Claims Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Expense Claim
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Record and manage expense claims submitted by staff or students.
        </p>
        <Table columns={columns} data={(expenseClaims || [])} isLoading={loading.expenseClaims && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingClaim ? 'Edit Expense Claim' : 'Add New Expense Claim'} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.expenseClaims}>
              {loading.expenseClaims ? <Spinner size="sm"/> : (editingClaim ? 'Save Changes' : 'Add Claim')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="claimant_type" label="Claimant Type" value={formData.claimant_type} onChange={handleInputChange} required>
                {Object.values(FinExpenseClaimantTypeEnum).map(type => (<option key={type} value={type}>{type}</option>))}
            </Select>
            <Select name="claimant_id" label="Claimant" value={formData.claimant_id || ''} onChange={handleInputChange} required>
                <option value="">Select Claimant</option>
                {(claimantList || []).map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Select>
            <Input name="claim_date" label="Claim Date" type="date" value={formData.claim_date || ''} onChange={handleInputChange} required />
            <Input name="amount" label="Amount (KES)" type="number" step="0.01" value={formData.amount || ''} onChange={handleInputChange} required />
            <Select name="expense_category_id" label="Expense Category" value={formData.expense_category_id || ''} onChange={handleInputChange} required className="md:col-span-2">
                <option value="">Select Expense Category</option>
                {(expenseCategories || []).map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
            </Select>
            <Textarea name="description" label="Description of Expense" value={formData.description || ''} onChange={handleInputChange} required rows={3} containerClassName="md:col-span-2"/>
        </div>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
