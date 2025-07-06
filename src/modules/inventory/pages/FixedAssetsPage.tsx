import React, { useState, useMemo } from 'react';
import { FixedAsset, ItemInv, Staff, ItemTypeInv, DepreciationMethod } from '@/types';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, CubeIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type FixedAssetFormData = Omit<Partial<FixedAsset>, 'id' | 'created_at' | 'updated_at' | 'item_name' | 'assigned_to_staff_name' | 'depreciation_method'> & {
    depreciation_method?: DepreciationMethod;
};

const FixedAssetsPage: React.FC = () => {
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
      alert("Item and Asset Tag are required.");
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

  const columns = [
    { header: 'Asset Tag', accessor: 'asset_tag' as keyof FixedAsset },
    { header: 'Item Name', accessor: 'item_name' as keyof FixedAsset },
    { header: 'Serial No.', accessor: 'serial_number' as keyof FixedAsset },
    { header: 'Purchase Date', accessor: 'purchase_date' as keyof FixedAsset, render: (item: FixedAsset) => item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A' },
    { header: 'Purchase Cost', accessor: 'purchase_cost' as keyof FixedAsset, render: (item: FixedAsset) => item.purchase_cost?.toFixed(2) || 'N/A' },
    { header: 'Current Value', accessor: 'current_value' as keyof FixedAsset, render: (item: FixedAsset) => item.current_value?.toFixed(2) || 'N/A' },
    { header: 'Assigned To', accessor: 'assigned_to_staff_name' as keyof FixedAsset },
    {
      header: 'Actions',
      accessor: 'id' as keyof FixedAsset,
      render: (item: FixedAsset) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
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
        <Table columns={columns} data={fixedAssets} isLoading={loading.fixedAssets && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAsset ? 'Edit Fixed Asset' : 'Add New Fixed Asset'} size="2xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.fixedAssets}>
              {loading.fixedAssets ? <Spinner size="sm"/> : (editingAsset ? 'Save Changes' : 'Add Asset')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select name="item_id" label="Inventory Item (Fixed Asset Type)" value={formData.item_id || ''} onChange={handleInputChange} required>
                <option value="">Select Item</option>
                {fixedAssetItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <Input name="asset_tag" label="Asset Tag" value={formData.asset_tag || ''} onChange={handleInputChange} required />
            <Input name="serial_number" label="Serial Number" value={formData.serial_number || ''} onChange={handleInputChange} />
            <Input name="purchase_date" label="Purchase Date" type="date" value={formData.purchase_date || ''} onChange={handleInputChange} />
            <Input name="purchase_cost" label="Purchase Cost (KES)" type="number" step="0.01" value={formData.purchase_cost ?? ''} onChange={handleInputChange} />
            <Input name="current_value" label="Current Value (KES)" type="number" step="0.01" value={formData.current_value ?? ''} onChange={handleInputChange} />
            <Select name="depreciation_method" label="Depreciation Method" value={formData.depreciation_method || ''} onChange={handleInputChange}>
                <option value="">Select Method</option>
                {Object.values(DepreciationMethod).map(method => <option key={method} value={method}>{method}</option>)}
            </Select>
            <Input name="depreciation_rate_pa" label="Depreciation Rate (% p.a.)" type="number" step="0.01" min="0" max="100" value={formData.depreciation_rate_pa ?? ''} onChange={handleInputChange} />
            <Select name="assigned_to_staff_id" label="Assigned To Staff (Optional)" value={formData.assigned_to_staff_id || ''} onChange={handleInputChange}>
                <option value="">None</option>
                {activeStaff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </Select>
        </div>
      </Modal>
    </div>
  );
};

export default FixedAssetsPage;
