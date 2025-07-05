import React, { useState, useMemo } from 'react';
import { Fine, Loan, FineStatus } from '@/types';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, SparklesIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type FineFormData = Omit<Partial<Fine>, 'id' | 'created_at' | 'updated_at' | 'book_title' | 'user_name' | 'loan_due_date' | 'status'> & {
    status: FineStatus; // Ensure status is required for the form
};

const FinesPage: React.FC = () => {
  const { 
    fines, 
    loans,
    loading, 
    addFine, 
    updateFineStatus // Assuming this specific function exists or using generic update
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFine, setEditingFine] = useState<Fine | null>(null);
  
  const initialFormData: FineFormData = { 
    loan_id: undefined, 
    amount: 0, 
    reason: 'Overdue Book', 
    status: FineStatus.PENDING 
  };
  const [formData, setFormData] = useState<FineFormData>(initialFormData);

  const openModal = (fine?: Fine) => {
    setEditingFine(fine || null);
    setFormData(fine ? 
      { 
        loan_id: fine.loan_id, 
        amount: fine.amount, 
        reason: fine.reason, 
        status: fine.status 
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingFine(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | undefined = value;
    if (name === 'loan_id') {
        processedValue = value || undefined;
    } else if (name === 'amount') {
        processedValue = parseFloat(value) || 0;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async () => {
    if (!formData.loan_id || formData.amount <= 0 || !formData.status) {
      alert("Associated Loan, Valid Amount, and Status are required.");
      return;
    }
    const payload: Omit<Fine, 'id' | 'created_at' | 'updated_at' | 'book_title' | 'user_name' | 'loan_due_date'> = {
      loan_id: formData.loan_id!,
      amount: Number(formData.amount),
      reason: formData.reason || undefined,
      status: formData.status!,
    };

    if (editingFine) {
      // Use a specific updateFineStatus or generic update from useMockData
      await updateFineStatus({ ...editingFine, ...payload }); // Assuming updateFineStatus takes full Fine object
    } else {
      await addFine(payload);
    }
    closeModal();
  };


  const columns = [
    { header: 'Fine ID', accessor: 'id' as keyof Fine },
    { header: 'Book Title', accessor: 'book_title' as keyof Fine },
    { header: 'User Name', accessor: 'user_name' as keyof Fine },
    { header: 'Amount (KES)', accessor: 'amount' as keyof Fine, render: (item: Fine) => item.amount.toFixed(2) },
    { header: 'Reason', accessor: 'reason' as keyof Fine },
    { header: 'Status', accessor: 'status' as keyof Fine,
        render: (item: Fine) => (
             <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                item.status === FineStatus.PAID ? 'bg-green-100 text-green-800' :
                item.status === FineStatus.PENDING ? 'bg-yellow-100 text-yellow-800' :
                item.status === FineStatus.BILLED ? 'bg-blue-100 text-blue-800' :
                item.status === FineStatus.WAIVED ? 'bg-gray-100 text-gray-700' :
                'bg-red-100 text-red-800' // For other potential statuses or error
            }`}>{item.status}</span>
        )
    },
    {
      header: 'Actions',
      accessor: 'id' as keyof Fine,
      render: (item: Fine) => (
        <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>
          Update Status
        </Button>
      ),
    },
  ];

  if ((loading.fines || loading.loans) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Fines...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Library Fines Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Manual Fine
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          View and manage library fines. Fines for overdue books are often generated automatically upon return.
        </p>
        <Table columns={columns} data={(fines || [])} isLoading={loading.fines && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingFine ? 'Update Fine Status' : 'Add Manual Fine'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.fines}>
              {loading.fines ? <Spinner size="sm"/> : (editingFine ? 'Save Changes' : 'Add Fine')}
            </Button>
          </>
        }
      >
        <Select 
          name="loan_id" 
          label="Associated Loan" 
          value={formData.loan_id || ''} 
          onChange={handleInputChange}
          required
          disabled={!!editingFine} // Usually loan_id is fixed once fine is created
        >
          <option value="">Select Loan (for context)</option>
          {(loans || []).map(loan => <option key={loan.id} value={loan.id}>{loan.book_title} - {loan.user_name} (Due: {new Date(loan.due_date).toLocaleDateString()})</option>)}
        </Select>
        <Input 
          name="amount" 
          label="Fine Amount (KES)" 
          type="number" 
          step="0.01" 
          value={formData.amount || ''} 
          onChange={handleInputChange} 
          required 
          disabled={!!editingFine} // Amount is typically fixed
        />
        <Textarea 
          name="reason" 
          label="Reason for Fine" 
          value={formData.reason || ''} 
          onChange={handleInputChange} 
          rows={2}
          disabled={!!editingFine} // Reason is typically fixed
        />
        <Select 
          name="status" 
          label="Fine Status" 
          value={formData.status} 
          onChange={handleInputChange}
          required
        >
          {Object.values(FineStatus).map(status => <option key={status} value={status}>{status}</option>)}
        </Select>
      </Modal>
    </div>
  );
};

export default FinesPage;
