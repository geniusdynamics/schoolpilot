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
import { useNutrition } from '../hooks/useNutrition';
import { useConfirm } from '@/components/ui/ConfirmDialog';

// GL account ids are opaque strings (UUIDs); never coerce them to numbers (SO-22).
type MerchantFormData = { name?: string; gl_account_id?: string };

export const MerchantsPageContent: React.FC = () => {
  // Chart of accounts is cross-domain read data; merchant CRUD lives on the nutrition module hook.
  const { chartOfAccounts } = useAppData();
  const { merchants, addMerchant, updateMerchant, deleteMerchant } = useNutrition();
  const confirm = useConfirm();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const initialFormData: MerchantFormData = { name: '', gl_account_id: undefined };
  const [formData, setFormData] = useState<MerchantFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const revenueAccounts = useMemo(() => 
    (chartOfAccounts || []).filter(coa => coa.type === AccountType.REVENUE && coa.is_active), 
  [chartOfAccounts]);

  // Resolve the GL account name at read time so renamed accounts show their current name.
  const glAccountName = (merchant: Merchant): string | null | undefined => {
    if (merchant.gl_account_id == null) return merchant.gl_account_name;
    const account = (chartOfAccounts || []).find(coa => String(coa.id) === String(merchant.gl_account_id));
    return account ? `${account.account_code} - ${account.name}` : merchant.gl_account_name;
  };

  const openModal = (merchant?: Merchant) => {
    setEditingMerchant(merchant || null);
    setFormData(merchant ? 
      { name: merchant.name, gl_account_id: merchant.gl_account_id != null ? String(merchant.gl_account_id) : undefined } : 
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
    setFormData(prev => ({ ...prev, [name]: name === 'gl_account_id' ? (value || undefined) : value }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert("Merchant name is required.");
      return;
    }
    const payload = {
      name: formData.name,
      gl_account_id: formData.gl_account_id || null,
    };

    setSaving(true);
    try {
      if (editingMerchant) {
        await updateMerchant(String(editingMerchant.id), payload);
      } else {
        await addMerchant(payload);
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ title: 'Delete merchant', message: 'Are you sure you want to delete this merchant?', variant: 'danger' })) {
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
      render: (value, row) => glAccountName(row) || 'N/A'
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(String(row.id))} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="Merchants Management (e.g., Canteen)" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Merchant
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          Define merchants where students can make purchases using their wallets. Link to a revenue GL account.
        </p>
        <DataGrid 
          columns={columns} 
          data={merchants || []} 
          sortable
          filterable
          emptyState={{
            icon: <BuildingStorefrontIcon className="w-12 h-12 text-surface-muted-fg" />,
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
          <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit" loading={saving}>
            {editingMerchant ? 'Save Changes' : 'Add Merchant'}
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
