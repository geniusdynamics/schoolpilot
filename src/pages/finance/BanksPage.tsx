
import React, { useState } from 'react';
import { FinBankType as Bank, FinChartOfAccountType as ChartOfAccount, FinAccountTypeEnum } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, BanknotesIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';

type BankFormData = Omit<Partial<Bank>, 'id' | 'created_at' | 'updated_at' | 'gl_account_name'>;

const BanksPage: React.FC = () => {
  const { 
    banks, 
    chartOfAccounts,
    loading, 
    addBank, 
    updateBank, 
    deleteBank 
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const initialFormData: BankFormData = { name: '', account_no: '', gl_account_id: undefined };
  const [formData, setFormData] = useState<BankFormData>(initialFormData);

  const assetAccounts = chartOfAccounts.filter(coa => coa.type === FinAccountTypeEnum.ASSET && coa.is_active);

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

  const columns = [
    { header: 'ID', accessor: 'id' as keyof Bank },
    { header: 'Bank Name', accessor: 'name' as keyof Bank },
    { header: 'Account No.', accessor: 'account_no' as keyof Bank },
    { header: 'GL Account', accessor: 'gl_account_name' as keyof Bank }, // Resolved name
    {
      header: 'Actions',
      accessor: 'id' as keyof Bank,
      render: (item: Bank) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
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
        <Table columns={columns} data={banks} isLoading={loading.banks && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingBank ? 'Edit Bank Account' : 'Add New Bank Account'} size="lg"
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
          {assetAccounts.map((coa: ChartOfAccount) => (
            <option key={coa.id} value={coa.id}>
              {coa.account_code} - {coa.name}
            </option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default BanksPage;
