// ABOUTME: Library Fines page - lists library fines and lets staff add manual fines or update their status.
// ABOUTME: Reads fines and loans from the database through the library module hook.

import React, { useState } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormField from '@/components/ui/forms/FormField';
import FormSection from '@/components/ui/forms/FormSection';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, SparklesIcon } from '@/components/ui/icons';
import { useLibraryData } from '../data/useLibraryData';
import Spinner from '@/components/ui/Spinner';
import { FineStatus } from '@/core/types';
import type { Fine } from '@/core/types';

type FineFormData = Omit<Partial<Fine>, 'id' | 'created_at' | 'updated_at' | 'book_title' | 'user_name' | 'loan_due_date' | 'status'> & {
    status: FineStatus; // Ensure status is required for the form
};

export const FinesPageContent: React.FC = () => {
  const { 
    fines, 
    loans,
    loading, 
    addFine, 
    updateFineStatus
  } = useLibraryData();
  
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
      // Only the status is editable on an existing fine.
      await updateFineStatus(editingFine.id, payload.status);
    } else {
      await addFine(payload);
    }
    closeModal();
  };

  const columns: DataGridColumn<Fine>[] = [
    {
      key: 'id',
      header: 'Fine ID',
      sortable: true,
      filterable: true,
      sticky: true,
      width: 120
    },
    {
      key: 'book_title',
      header: 'Book Title',
      sortable: true,
      filterable: true
    },
    {
      key: 'user_name',
      header: 'User Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'amount',
      header: 'Amount (KES)',
      sortable: true,
      filterable: true,
      width: 140,
      render: (value) => Number(value ?? 0).toFixed(2)
    },
    {
      key: 'reason',
      header: 'Reason',
      sortable: true,
      filterable: true
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, item) => (
        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
          item.status === FineStatus.PAID ? 'bg-green-100 text-green-800' :
          item.status === FineStatus.PENDING ? 'bg-yellow-100 text-yellow-800' :
          item.status === FineStatus.BILLED ? 'bg-primary-100 text-primary-800' :
          item.status === FineStatus.WAIVED ? 'bg-surface-accent text-surface-foreground' :
          'bg-red-100 text-red-800' // For other potential statuses or error
        }`}>
          {item.status}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 150,
      render: (_, item) => (
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => openModal(item)} 
          leftIcon={<EditIcon className="w-4 h-4" />}
        >
          Update Status
        </Button>
      )
    }
  ];

  if ((loading?.fines || loading?.loans) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Fines...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card title="Library Fines Management" info="View and manage library fines. Fines for overdue books are often generated automatically upon return." actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Manual Fine
        </Button>
      }>
        <DataGrid
          columns={columns}
          data={fines || []}
          loading={loading.fines && isModalOpen}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-8">
              <SparklesIcon className="w-12 h-12 text-surface-muted-fg mx-auto mb-4" />
              <p className="text-surface-muted-fg">No fines found</p>
            </div>
          }
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingFine ? 'Update Fine Status' : 'Add Manual Fine'} size="lg">
        <FormSection columns={1}>
          <FormField label="Associated Loan" required>
            <Select 
              name="loan_id" 
              value={formData.loan_id || ''} 
              onChange={handleInputChange}
              required
              disabled={!!editingFine}
            >
              <option value="">Select Loan (for context)</option>
              {(loans || []).map(loan => <option key={loan.id} value={loan.id}>{loan.book_title} - {loan.user_name} (Due: {new Date(loan.due_date).toLocaleDateString()})</option>)}
            </Select>
          </FormField>
          <FormField label="Fine Amount (KES)" required>
            <Input 
              name="amount" 
              type="number" 
              step="0.01" 
              value={formData.amount || ''} 
              onChange={handleInputChange} 
              required 
              disabled={!!editingFine}
            />
          </FormField>
          <FormField label="Reason for Fine">
            <Textarea 
              name="reason" 
              value={formData.reason || ''} 
              onChange={handleInputChange} 
              rows={2}
              disabled={!!editingFine}
            />
          </FormField>
          <FormField label="Fine Status" required>
            <Select 
              name="status" 
              value={formData.status} 
              onChange={handleInputChange}
              required
            >
              {Object.values(FineStatus).map(status => <option key={status} value={status}>{status}</option>)}
            </Select>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading.fines}>
            {editingFine ? 'Save Changes' : 'Add Fine'}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};
const FinesPage: React.FC = () => (
  <div className="space-y-3">
    <FinesPageContent />
  </div>
);

export default FinesPage;
