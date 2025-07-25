import React, { useState } from 'react';
import { ItemCategoryInv } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type ItemCategoryFormData = Omit<Partial<ItemCategoryInv>, 'id'>;

const ItemCategoriesPage: React.FC = () => {
  const { itemCategoriesInv, loading, addItemCategoryInv, updateItemCategoryInv, deleteItemCategoryInv } = useAppData(); // Updated
  const { t } = useTranslation('inventory');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ItemCategoryInv | null>(null);
  const initialFormData: ItemCategoryFormData = { name: '' };
  const [formData, setFormData] = useState<ItemCategoryFormData>(initialFormData);

  const openModal = (category?: ItemCategoryInv) => {
    setEditingCategory(category || null);
    setFormData(category ? { name: category.name } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert(t('validation.categoryNameRequired'));
      return;
    }
    const payload = { name: formData.name! };

    if (editingCategory) {
      await updateItemCategoryInv({ ...editingCategory, ...payload });
    } else {
      await addItemCategoryInv(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item category? This may affect existing items.')) {
      await deleteItemCategoryInv(id);
    }
  };

  const columns: DataGridColumn<ItemCategoryInv>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      width: 80,
      sticky: 'left'
    },
    {
      key: 'name',
      header: 'Category Name',
      sortable: true,
      filterable: true,
      width: 300,
      render: (value) => (
        <span className="font-medium text-gray-900">
          {value}
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

  if (loading.itemCategoriesInv && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Item Categories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('inventory.itemCategoriesPage.title')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('inventory.itemCategoriesPage.addCategory')}
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          {t('inventory.itemCategoriesPage.description')}
        </p>
        <DataGrid 
          columns={columns} 
          data={itemCategoriesInv} 
          sortable 
          filterable 
          emptyState={
            <div className="text-center py-12">
              <ListBulletIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No item categories found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first item category.</p>
              <div className="mt-6">
                <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
                  {t('inventory.itemCategoriesPage.addCategory')}
                </Button>
              </div>
            </div>
          }
        />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={t('inventory.itemCategoriesPage.editItemCategoryTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('inventory.itemCategoriesPage.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading.itemCategoriesInv}>
              {loading.itemCategoriesInv ? <Spinner size="sm"/> : (editingCategory ? t('inventory.itemCategoriesPage.saveChanges') : t('inventory.itemCategoriesPage.addCategory'))}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label={t('inventory.itemCategoriesPage.categoryName')} 
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
      </Modal>
    </div>
  );
};

export default ItemCategoriesPage;
