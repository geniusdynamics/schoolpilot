import React, { useState, useMemo } from 'react';
import { Merchant, ChartOfAccount, AccountType } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, BuildingStorefrontIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type MerchantFormData = Omit<Partial<Merchant>, 'id' | 'created_at' | 'updated_at' | 'gl_account_name'>;

export const MerchantsPageContent: React.FC = () => {
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

  const columns: DataGridColumn<Merchant>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80
    },
    { 
      key: 'name', 
      header: 'Merchant Name', 
      sortable: true, 
      filterable: true, 
      width: 200
    },
    { 
      key: 'gl_account_name', 
      header: 'Sales GL Account', 
      sortable: true, 
      filterable: true, 
      width: 250,
      render: (value, row) => row.gl_account_name || 'N/A'
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
        <DataGrid 
          columns={columns} 
          data={merchants || []} 
          isLoading={loading.merchants && isModalOpen}
          sortable
          filterable
          emptyState={{
            icon: <BuildingStorefrontIcon className="w-12 h-12 text-gray-400" />,
            title: "No merchants found",
            description: "Add merchants where students can make purchases using their wallets.",
            action: {
              label: "Add Merchant",
              onClick: () => openModal()
            }
          }}
        />
      </Card>

      <DialogForm 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingMerchant ? 'Edit Merchant' : 'Add New Merchant'} 
        size="lg"
        onSubmit={handleSubmit}
      >
        <FormSection>
          <FormField>
            <Input 
              name="name" 
              label="Merchant Name" 
              value={formData.name || ''} 
              onChange={handleInputChange} 
              required 
            />
          </FormField>
          <FormField>
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
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading.merchants}>
            {loading.merchants ? <Spinner size="sm"/> : (editingMerchant ? 'Save Changes' : 'Add Merchant')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};
const MerchantsPage: React.FC = () => (
  <div className="space-y-6">
    <MerchantsPageContent />
  </div>
);

export default MerchantsPage;
