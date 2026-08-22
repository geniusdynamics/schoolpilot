import React, { useState, useMemo } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, CubeIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';

import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import { DepreciationMethod, ItemTypeInv } from '@/core/types';
import type { FixedAsset } from '@/core/types';

type FixedAssetFormData = Omit<Partial<FixedAsset>, 'id' | 'created_at' | 'updated_at' | 'item_name' | 'assigned_to_staff_name' | 'depreciation_method'> & {
    depreciation_method?: DepreciationMethod;
};

export const FixedAssetsPageContent: React.FC = () => {
  const { 
    fixedAssets, 
    itemsInv,
    staff,
    loading, 
    addFixedAsset, 
    updateFixedAsset, 
    deleteFixedAsset 
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  
  const initialFormData: FixedAssetFormData = { 
    item_id: undefined, 
    asset_tag: '', 
    serial_number: '', 
    purchase_date: new Date().toISOString().split('T')[0], 
    purchase_cost: 0, 
    current_value: 0, 
    depreciation_method: undefined, 
    depreciation_rate_pa: 0, 
    assigned_to_staff_id: undefined 
  };
  const [formData, setFormData] = useState<FixedAssetFormData>(initialFormData);

  const fixedAssetItems = useMemo(() => itemsInv.filter(item => item.item_type === ItemTypeInv.FIXED_ASSET), [itemsInv]);
  const activeStaff = useMemo(() => staff.filter(s => s.is_active), [staff]);

  const openModal = (asset?: FixedAsset) => {
    setEditingAsset(asset || null);
    setFormData(asset ? 
      { 
        item_id: asset.item_id, 
        asset_tag: asset.asset_tag, 
        serial_number: asset.serial_number, 
        purchase_date: asset.purchase_date ? new Date(asset.purchase_date).toISOString().split('T')[0] : '', 
        purchase_cost: asset.purchase_cost, 
        current_value: asset.current_value, 
        depreciation_method: asset.depreciation_method, 
        depreciation_rate_pa: asset.depreciation_rate_pa, 
        assigned_to_staff_id: asset.assigned_to_staff_id 
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | undefined = value;
    if (name === 'item_id' || name === 'assigned_to_staff_id') {
        processedValue = value || undefined; // Allow clearing select
    } else if (['purchase_cost', 'current_value', 'depreciation_rate_pa'].includes(name)) {
        processedValue = parseFloat(value) || 0;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async () => {
    if (!formData.item_id || !formData.asset_tag) {
      alert(t('validation.itemAssetTagRequired'));
      return;
    }
    const payload: Omit<FixedAsset, 'id' | 'created_at' | 'updated_at' | 'item_name' | 'assigned_to_staff_name'> = {
      item_id: formData.item_id!,
      asset_tag: formData.asset_tag!,
      serial_number: formData.serial_number || undefined,
      purchase_date: formData.purchase_date || undefined,
      purchase_cost: formData.purchase_cost ? Number(formData.purchase_cost) : undefined,
      current_value: formData.current_value ? Number(formData.current_value) : undefined,
      depreciation_method: formData.depreciation_method || undefined,
      depreciation_rate_pa: formData.depreciation_rate_pa ? Number(formData.depreciation_rate_pa) : undefined,
      assigned_to_staff_id: formData.assigned_to_staff_id || undefined,
    };

    if (editingAsset) {
      await updateFixedAsset({ ...editingAsset, ...payload });
    } else {
      await addFixedAsset(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this fixed asset record?')) {
      await deleteFixedAsset(id);
    }
  };

  const columns: DataGridColumn<FixedAsset>[] = [
    { 
      key: 'asset_tag', 
      header: 'Asset Tag', 
      sortable: true,
      filterable: true,
      width: '120px'
    },
    { 
      key: 'item_name', 
      header: 'Item Name', 
      sortable: true,
      filterable: true,
      width: '200px'
    },
    { 
      key: 'serial_number', 
      header: 'Serial No.', 
      sortable: true,
      filterable: true,
      width: '140px'
    },
    { 
      key: 'purchase_date', 
      header: 'Purchase Date', 
      render: (value: any, item: FixedAsset) => item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A',
      sortable: true,
      filterable: true,
      width: '130px'
    },
    { 
      key: 'purchase_cost', 
      header: 'Purchase Cost', 
      render: (value: any, item: FixedAsset) => item.purchase_cost ? `Ksh ${item.purchase_cost.toFixed(2)}` : 'N/A',
      sortable: true,
      width: '130px'
    },
    { 
      key: 'current_value', 
      header: 'Current Value', 
      render: (value: any, item: FixedAsset) => item.current_value ? `Ksh ${item.current_value.toFixed(2)}` : 'N/A',
      sortable: true,
      width: '130px'
    },
    { 
      key: 'assigned_to_staff_name', 
      header: 'Assigned To', 
      sortable: true,
      filterable: true,
      width: '150px'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, item: FixedAsset) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
      sticky: 'right',
      width: '160px'
    },
  ];

  if ((loading.fixedAssets || loading.itemsInv || loading.staff) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Fixed Assets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Fixed Assets Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Fixed Asset
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Track fixed assets, including asset tags, purchase details, depreciation, and assignment to staff.
        </p>
        <DataGrid 
          columns={columns} 
          data={fixedAssets} 
          sortable
          filterable
          emptyState={{
            icon: <CubeIcon className="w-8 h-8 text-gray-400" />,
            title: "No fixed assets found",
            description: "Start by adding your first fixed asset."
          }}
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingAsset ? 'Edit Fixed Asset' : 'Add New Fixed Asset'}
        size="xl"
        onSubmit={handleSubmit}
      >
        <FormSection columns={3}>
          <FormField label="Inventory Item (Fixed Asset Type)" required>
            <Select name="item_id" value={formData.item_id || ''} onChange={handleInputChange}>
              <option value="">Select Item</option>
              {fixedAssetItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Asset Tag" required>
            <Input name="asset_tag" value={formData.asset_tag || ''} onChange={handleInputChange} />
          </FormField>
          <FormField label="Serial Number">
            <Input name="serial_number" value={formData.serial_number || ''} onChange={handleInputChange} />
          </FormField>
          <FormField label="Purchase Date">
            <Input name="purchase_date" type="date" value={formData.purchase_date || ''} onChange={handleInputChange} />
          </FormField>
          <FormField label="Purchase Cost (KES)">
            <Input name="purchase_cost" type="number" step="0.01" value={formData.purchase_cost ?? ''} onChange={handleInputChange} />
          </FormField>
          <FormField label="Current Value (KES)">
            <Input name="current_value" type="number" step="0.01" value={formData.current_value ?? ''} onChange={handleInputChange} />
          </FormField>
          <FormField label="Depreciation Method">
            <Select name="depreciation_method" value={formData.depreciation_method || ''} onChange={handleInputChange}>
              <option value="">Select Method</option>
              {Object.values(DepreciationMethod).map(method => <option key={method} value={method}>{method}</option>)}
            </Select>
          </FormField>
          <FormField label="Depreciation Rate (% p.a.)">
            <Input name="depreciation_rate_pa" type="number" step="0.01" min="0" max="100" value={formData.depreciation_rate_pa ?? ''} onChange={handleInputChange} />
          </FormField>
          <FormField label="Assigned To Staff (Optional)">
            <Select name="assigned_to_staff_id" value={formData.assigned_to_staff_id || ''} onChange={handleInputChange}>
              <option value="">None</option>
              {activeStaff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </Select>
          </FormField>
        </FormSection>

        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={loading.fixedAssets}>
            {loading.fixedAssets ? <Spinner size="sm"/> : (editingAsset ? 'Save Changes' : 'Add Asset')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};
const FixedAssetsPage: React.FC = () => (
  <div className="space-y-6">
    <FixedAssetsPageContent />
  </div>
);

export default FixedAssetsPage;
