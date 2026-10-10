import React, { useState } from 'react';
import { BookCategory } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '../../../components/ui/forms/DialogForm';
import FormField from '../../../components/ui/forms/FormField';
import FormActions from '../../../components/ui/forms/FormActions';
import FormSection from '../../../components/ui/forms/FormSection';
import Input from '@/components/ui/Input';

import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useTranslation } from 'react-i18next';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';

type BookCategoryFormData = Omit<Partial<BookCategory>, 'id'>;

export const BookCategoriesPageContent: React.FC = () => {
  const { bookCategories, loading, addBookCategory, updateBookCategory, deleteBookCategory } = useAppData(); // Updated
  const { t } = useTranslation('library');
  const confirm = useConfirm();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BookCategory | null>(null);
  const initialFormData: BookCategoryFormData = { name: '' };
  const [formData, setFormData] = useState<BookCategoryFormData>(initialFormData);

  const openModal = (category?: BookCategory) => {
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
      await updateBookCategory({ ...editingCategory, ...payload });
    } else {
      await addBookCategory(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (await confirm({ title: 'Delete book category', message: 'Are you sure you want to delete this book category? This may affect existing books.', variant: 'danger' })) {
      await deleteBookCategory(id);
    }
  };

  const columns = [
    { header: 'ID', key: 'id' as keyof BookCategory },
    { header: 'Category Name', key: 'name' as keyof BookCategory },
    {
      header: 'Actions',
      key: 'actions',
      render: (value: any, item: BookCategory) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if (loading.bookCategories && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Book Categories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('bookCategories.managementTitle')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('bookCategories.addCategory')}
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          {t('bookCategories.defineCategories')}
        </p>
        <DataGrid columns={columns} data={bookCategories} loading={loading.bookCategories && isModalOpen} />
      </Card>

      <DialogForm 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingCategory ? t('bookCategories.editBookCategory') : t('bookCategories.addNewBookCategory')}
      >
        <FormSection columns={1}>
          <FormField label={t('bookCategories.categoryName')} required>
            <Input 
              name="name" 
              value={formData.name || ''} 
              onChange={handleInputChange} 
              required 
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>{t('bookCategories.cancel')}</Button>
          <Button onClick={handleSubmit} loading={loading.bookCategories}>
            {editingCategory ? t('bookCategories.saveChanges') : t('bookCategories.addCategory')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};
const BookCategoriesPage: React.FC = () => (
  <div className="space-y-6">
    <BookCategoriesPageContent />
  </div>
);

export default BookCategoriesPage;
