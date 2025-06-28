

import React, { useState } from 'react';
import { StudentCategory } from '../../types'; // StudentCategory is a core type
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext'; 
import Spinner from '../../components/ui/Spinner';

type StudentCategoryFormData = Omit<Partial<StudentCategory>, 'id'>;

const StudentCategoriesPage: React.FC = () => {
  const { studentCategories, loading, addStudentCategory, updateStudentCategory, deleteStudentCategory } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StudentCategory | null>(null);
  const initialFormData: StudentCategoryFormData = { name: '' };
  const [formData, setFormData] = useState<StudentCategoryFormData>(initialFormData);

  const openModal = (category?: StudentCategory) => {
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
    const payload = {
      name: formData.name!,
    };

    if (editingCategory) {
      await updateStudentCategory({ ...editingCategory, ...payload });
    } else {
      await addStudentCategory(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      await deleteStudentCategory(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof StudentCategory },
    { header: 'Category Name', accessor: 'name' as keyof StudentCategory },
    {
      header: 'Actions',
      accessor: 'id' as keyof StudentCategory,
      render: (item: StudentCategory) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if (loading.studentCategories && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Student Categories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Student Categories Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Category
        </Button>
      }>
        <Table columns={columns} data={studentCategories} isLoading={loading.studentCategories && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCategory ? 'Edit Student Category' : 'Add New Student Category'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.studentCategories}>
              {loading.studentCategories ? <Spinner size="sm"/> : (editingCategory ? 'Save Changes' : 'Add Category')}
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

export default StudentCategoriesPage;
