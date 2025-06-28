
import React, { useState } from 'react';
import { BookCategory } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';

type BookCategoryFormData = Omit<Partial<BookCategory>, 'id'>;

const BookCategoriesPage: React.FC = () => {
  const { bookCategories, loading, addBookCategory, updateBookCategory, deleteBookCategory } = useAppData(); // Updated
  
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
    if (window.confirm('Are you sure you want to delete this book category? This may affect existing books.')) {
      await deleteBookCategory(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof BookCategory },
    { header: 'Category Name', accessor: 'name' as keyof BookCategory },
    {
      header: 'Actions',
      accessor: 'id' as keyof BookCategory,
      render: (item: BookCategory) => (
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
      <Card title="Book Categories Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Category
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Define categories for library books (e.g., Fiction, Science, History, Reference).
        </p>
        <Table columns={columns} data={bookCategories} isLoading={loading.bookCategories && isModalOpen} />
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingCategory ? 'Edit Book Category' : 'Add New Book Category'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.bookCategories}>
              {loading.bookCategories ? <Spinner size="sm"/> : (editingCategory ? 'Save Changes' : 'Add Category')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Category Name" 
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
      </Modal>
    </div>
  );
};

export default BookCategoriesPage;
