import React, { useState } from 'react';
import { ItemCategoryInv } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type ItemCategoryFormData = Omit<Partial<ItemCategoryInv>, 'id'>;

const ItemCategoriesPage: React.FC = () => {
  const { itemCategoriesInv, loading, addItemCategoryInv, updateItemCategoryInv, deleteItemCategoryInv } = useAppData(); // Updated
  const { t } = useTranslation();
  
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
      alert("Category name is required.");
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

  const columns = [
    { header: 'ID', accessor: 'id' as keyof ItemCategoryInv },
    { header: 'Category Name', accessor: 'name' as keyof ItemCategoryInv },
    {
      header: 'Actions',
      accessor: 'id' as keyof ItemCategoryInv,
      render: (item: ItemCategoryInv) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
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
        <Table columns={columns} data={itemCategoriesInv} isLoading={loading.itemCategoriesInv && isModalOpen} />
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
