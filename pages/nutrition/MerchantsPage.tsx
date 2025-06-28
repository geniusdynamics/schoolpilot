
import React, { useState, useMemo } from 'react';
import { Merchant, ChartOfAccount, AccountType } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, BuildingStorefrontIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';

type MerchantFormData = Omit<Partial<Merchant>, 'id' | 'created_at' | 'updated_at' | 'gl_account_name'>;

const MerchantsPage: React.FC = () => {
  const { 
    merchants, 
    chartOfAccounts,
    loading, 
    addMerchant, 
    updateMerchant, 
    deleteMerchant 
  } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const initialFormData: MerchantFormData = { name: '', gl_account_id: undefined };
  const [formData, setFormData] = useState<MerchantFormData>(initialFormData);

  const revenueAccounts = useMemo(() => 
    chartOfAccounts.filter(coa => coa.type === AccountType.REVENUE && coa.is_active), 
  [chartOfAccounts]);

  const openModal = (merchant?: Merchant) => {
    setEditingMerchant(merchant || null);
    setFormData(merchant ? 
      { name: merchant.name, gl_account_id: merchant.gl_account_id } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMerchant(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'gl_account_id' ? (value ? parseInt(value) : undefined) : value }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert("Merchant name is required.");
      return;
    }
    const payload: Omit<Merchant, 'id' | 'created_at' | 'updated_at' | 'gl_account_name'> = {
      name: formData.name!,
      gl_account_id: formData.gl_account_id ? Number(formData.gl_account_id) : undefined,
    };

    if (editingMerchant) {
      await updateMerchant({ ...editingMerchant, ...payload });
    } else {
      await addMerchant(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this merchant?')) {
      await deleteMerchant(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof Merchant },
    { header: 'Merchant Name', accessor: 'name' as keyof Merchant },
    { header: 'Sales GL Account', accessor: 'gl_account_name' as keyof Merchant, render: (item: Merchant) => item.gl_account_name || 'N/A' },
    {
      header: 'Actions',
      accessor: 'id' as keyof Merchant,
      render: (item: Merchant) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if ((loading.merchants || loading.chartOfAccounts) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Merchants...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Merchants Management (e.g., Canteen)" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Merchant
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Define merchants where students can make purchases using their wallets. Link to a revenue GL account.
        </p>
        <Table columns={columns} data={merchants} isLoading={loading.merchants && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingMerchant ? 'Edit Merchant' : 'Add New Merchant'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.merchants}>
              {loading.merchants ? <Spinner size="sm"/> : (editingMerchant ? 'Save Changes' : 'Add Merchant')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Merchant Name" 
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Select 
          name="gl_account_id" 
          label="GL Account for Sales (Revenue Account)" 
          value={formData.gl_account_id || ''} 
          onChange={handleInputChange}
        >
          <option value="">Select GL Revenue Account</option>
          {revenueAccounts.map((coa: ChartOfAccount) => (
            <option key={coa.id} value={coa.id}>
              {coa.account_code} - {coa.name}
            </option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default MerchantsPage;
