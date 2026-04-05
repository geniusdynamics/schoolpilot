import React, { useState } from 'react';
import { ItemInv, ItemCategoryInv, ItemTypeInv } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, CubeIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type ItemFormData = Omit<Partial<ItemInv>, 'id' | 'created_at' | 'updated_at' | 'category_name' | 'item_type'> & {
    item_type: ItemTypeInv; // Ensure item_type is required in the form
};

const ItemsPage: React.FC = () => {
  const { itemsInv, itemCategoriesInv, loading, addItemInv, updateItemInv, deleteItemInv } = useAppData(); // Updated
  const { t } = useTranslation('inventory');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemInv | null>(null);
  const initialFormData: ItemFormData = { 
    name: '', 
    description: '', 
    category_id: undefined, 
    unit_of_measure: '', 
    item_type: ItemTypeInv.CONSUMABLE, 
    current_price: 0 
  };
  const [formData, setFormData] = useState<ItemFormData>(initialFormData);

  const openModal = (item?: ItemInv) => {
    setEditingItem(item || null);
    setFormData(item ? 
      { 
        name: item.name, 
        description: item.description, 
        category_id: item.category_id, 
        unit_of_measure: item.unit_of_measure, 
        item_type: item.item_type, 
        current_price: item.current_price 
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | undefined = value;
    if (name === 'category_id') {
        processedValue = value ? parseInt(value) : undefined;
    } else if (name === 'current_price') {
        processedValue = parseFloat(value) || 0;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.unit_of_measure || !formData.item_type) {
      alert(t('validation.itemNameUnitTypeRequired'));
      return;
    }
    const payload: Omit<ItemInv, 'id' | 'created_at' | 'updated_at' | 'category_name'> = {
      name: formData.name!,
      description: formData.description || undefined,
      category_id: formData.category_id ? Number(formData.category_id) : undefined,
      unit_of_measure: formData.unit_of_measure!,
      item_type: formData.item_type,
      current_price: formData.current_price ? Number(formData.current_price) : undefined,
    };

    if (editingItem) {
      await updateItemInv({ ...editingItem, ...payload });
    } else {
      await addItemInv(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item? This may affect fixed assets, stock levels, and transactions.')) {
      await deleteItemInv(id);
    }
  };

  const columns: DataGridColumn<ItemInv>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      width: 80,
      sticky: 'left'
    },
    {
      key: 'name',
      header: 'Item Name',
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
      key: 'category_name',
      header: 'Category',
      sortable: true,
      filterable: true,
      width: 150,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value || 'Uncategorized'}
        </span>
      )
    },
    {
      key: 'unit_of_measure',
      header: 'Unit',
      sortable: true,
      width: 100,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value}
        </span>
      )
    },
    {
      key: 'item_type',
      header: 'Type',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value === ItemTypeInv.CONSUMABLE ? 'bg-orange-100 text-orange-800' :
          value === ItemTypeInv.NON_CONSUMABLE ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'current_price',
      header: 'Price',
      sortable: true,
      width: 120,
      render: (value) => (
        <span className="font-mono">
          KES {value?.toFixed(2) || 'N/A'}
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

  if ((loading.itemsInv || loading.itemCategoriesInv) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Inventory Items...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('inventory.items.management.title')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('inventory.items.addItem')}
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          {t('inventory.items.maintain.list')}
        </p>
        <DataGrid 
          columns={columns} 
          data={(itemsInv || [])} 
          sortable 
          filterable 
          emptyState={
            <div className="text-center py-12">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory items found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first inventory item.</p>
              <div className="mt-6">
                <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
                  {t('inventory.items.addItem')}
                </Button>
              </div>
            </div>
          }
        />
      </Card>

      <DialogForm open={isModalOpen} onClose={closeModal} title={editingItem ? t('inventory.items.editItem') : t('inventory.items.addNewItem')} size="xl"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={closeModal}>{t('inventory.items.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading.itemsInv}>
              {loading.itemsInv ? <Spinner size="sm"/> : (editingItem ? t('inventory.items.saveChanges') : t('inventory.items.addItem'))}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          <FormField label={t('inventory.items.name')}>
            <Input name="name" value={formData.name || ''} onChange={handleInputChange} required />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t('inventory.items.category')}>
              <Select name="category_id" value={formData.category_id || ''} onChange={handleInputChange}>
                <option value="">{t('inventory.items.selectCategory')}</option>
                {(itemCategoriesInv || []).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </Select>
            </FormField>
            <FormField label={t('inventory.items.unitOfMeasure')}>
              <Input name="unit_of_measure" value={formData.unit_of_measure || ''} onChange={handleInputChange} required placeholder={t('inventory.items.e.g.,Piece,Kg,Litre,Box')} />
            </FormField>
            <FormField label={t('inventory.items.itemType')}>
              <Select name="item_type" value={formData.item_type} onChange={handleInputChange} required>
                {Object.values(ItemTypeInv).map(type => <option key={type} value={type}>{type}</option>)}
              </Select>
            </FormField>
            <FormField label={t('inventory.items.currentPriceKES')}>
              <Input name="current_price" type="number" step="0.01" value={formData.current_price ?? ''} onChange={handleInputChange} />
            </FormField>
          </div>
          <FormField label={t('inventory.items.description')}>
            <Textarea name="description" value={formData.description || ''} onChange={handleInputChange} rows={3} />
          </FormField>
        </FormSection>
      </DialogForm>
    </div>
  );
};

export default ItemsPage;
