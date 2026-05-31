import React, { useState } from 'react';
import { Bank, ChartOfAccount, AccountType } from '@/modules/finance';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import FormSection from "@/components/ui/forms/FormSection";
import FormField from "@/components/ui/forms/FormField";
import FormActions from "@/components/ui/forms/FormActions";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, BanknotesIcon } from '@/components/ui/icons';
import { useFinance } from '@/modules/finance/hooks/useFinance';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type BankFormData = Omit<Partial<Bank>, 'id' | 'created_at' | 'updated_at' | 'gl_account_name'>;

export const BanksPageContent: React.FC = () => {
  const { 
    banks, 
    chartOfAccounts,
    loading, 
    addBank, 
    updateBank, 
    deleteBank 
  } = useFinance();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const initialFormData: BankFormData = { name: '', account_no: '', gl_account_id: undefined };
  const [formData, setFormData] = useState<BankFormData>(initialFormData);

  const assetAccounts = (chartOfAccounts || []).filter(coa => coa.type === AccountType.ASSET && coa.is_active);

  const openModal = (bank?: Bank) => {
    setEditingBank(bank || null);
    setFormData(bank ? 
      { name: bank.name, account_no: bank.account_no, gl_account_id: bank.gl_account_id } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBank(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'gl_account_id' ? (value ? parseInt(value) : undefined) : value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.gl_account_id) {
      alert("Bank name and GL Account are required.");
      return;
    }
    const payload = { 
        name: formData.name!, 
        account_no: formData.account_no || undefined,
        gl_account_id: Number(formData.gl_account_id!)
    };

    if (editingBank) {
      await updateBank({ ...editingBank, ...payload });
    } else {
      await addBank(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this bank account?')) {
      await deleteBank(id);
    }
  };

  const columns: DataGridColumn<Bank>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      width: 80,
      sticky: 'left'
    },
    {
      key: 'name',
      header: 'Bank Name',
      sortable: true,
      filterable: true,
      width: 200,
      render: (value) => (
        <span className="font-medium text-gray-900">
          {value}
        </span>
      )
    },
    {
      key: 'account_no',
      header: 'Account No.',
      sortable: true,
      filterable: true,
      width: 150,
      render: (value) => (
        <span className="font-mono text-sm">
          {value || 'N/A'}
        </span>
      )
    },
    {
      key: 'gl_account_name',
      header: 'GL Account',
      sortable: true,
      filterable: true,
      width: 250,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value || 'Not linked'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 180,
      render: (_, row) => (
        <div className="flex space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => openModal(row)} 
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="danger" 
            onClick={() => handleDelete(row.id)} 
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  if ((loading.banks || loading.chartOfAccounts) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Bank Accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Bank Accounts Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Bank Account
        </Button>
      }>
         <p className="text-sm text-gray-600 mb-4">
          Manage the school's bank accounts. Each bank account must be linked to an Asset account in the Chart of Accounts.
        </p>
        <DataGrid 
          columns={columns} 
          data={(banks || [])} 
          sortable 
          filterable 
          emptyState={
            <div className="text-center py-12">
              <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bank accounts found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first bank account.</p>
              <div className="mt-6">
                <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
                  Add Bank Account
                </Button>
              </div>
            </div>
          }
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingBank ? 'Edit Bank Account' : 'Add New Bank Account'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.banks}>
              {loading.banks ? <Spinner size="sm"/> : (editingBank ? 'Save Changes' : 'Add Bank')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Bank Name" 
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Input 
          name="account_no" 
          label="Account Number" 
          value={formData.account_no || ''} 
          onChange={handleInputChange} 
        />
        <Select 
          name="gl_account_id" 
          label="Link to GL Asset Account" 
          value={formData.gl_account_id || ''} 
          onChange={handleInputChange}
          required
        >
          <option value="">Select GL Asset Account</option>
          {(assetAccounts || []).map((coa: ChartOfAccount) => (
            <option key={coa.id} value={coa.id}>
              {coa.account_code} - {coa.name}
            </option>
          ))}
        </Select>
      </DialogForm>
    </div>
  );
};
const BanksPage: React.FC = () => (
  <div className="space-y-6">
    <BanksPageContent />
  </div>
);

export default BanksPage;
