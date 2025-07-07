import React, { useState } from 'react';
import { ItemInv, ItemCategoryInv, ItemTypeInv } from '@/types';
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

  const columns = [
    { header: 'ID', accessor: 'id' as keyof ItemInv },
    { header: 'Item Name', accessor: 'name' as keyof ItemInv },
    { header: 'Category', accessor: 'category_name' as keyof ItemInv },
    { header: 'Unit', accessor: 'unit_of_measure' as keyof ItemInv },
    { header: 'Type', accessor: 'item_type' as keyof ItemInv },
    { header: 'Price', accessor: 'current_price' as keyof ItemInv, render: (item: ItemInv) => item.current_price?.toFixed(2) || 'N/A' },
    {
      header: 'Actions',
      accessor: 'id' as keyof ItemInv,
      render: (item: ItemInv) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
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
        <Table columns={columns} data={(itemsInv || [])} isLoading={loading.itemsInv && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? t('inventory.items.editItem') : t('inventory.items.addNewItem')} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('inventory.items.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading.itemsInv}>
              {loading.itemsInv ? <Spinner size="sm"/> : (editingItem ? t('inventory.items.saveChanges') : t('inventory.items.addItem'))}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="name" label={t('inventory.items.name')} value={formData.name || ''} onChange={handleInputChange} required containerClassName="md:col-span-2"/>
            <Select name="category_id" label={t('inventory.items.category')} value={formData.category_id || ''} onChange={handleInputChange}>
                <option value="">{t('inventory.items.selectCategory')}</option>
                {(itemCategoriesInv || []).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </Select>
            <Input name="unit_of_measure" label={t('inventory.items.unitOfMeasure')} value={formData.unit_of_measure || ''} onChange={handleInputChange} required placeholder={t('inventory.items.e.g.,Piece,Kg,Litre,Box')} />
            <Select name="item_type" label={t('inventory.items.itemType')} value={formData.item_type} onChange={handleInputChange} required>
                {Object.values(ItemTypeInv).map(type => <option key={type} value={type}>{type}</option>)}
            </Select>
            <Input name="current_price" label={t('inventory.items.currentPriceKES')} type="number" step="0.01" value={formData.current_price ?? ''} onChange={handleInputChange} />
            <Textarea name="description" label={t('inventory.items.description')} value={formData.description || ''} onChange={handleInputChange} rows={3} containerClassName="md:col-span-2" />
        </div>
      </Modal>
    </div>
  );
};

export default ItemsPage;
