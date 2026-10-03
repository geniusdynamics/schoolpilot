import React, { useState } from 'react';
import { StudentCategory } from '@/types'; // StudentCategory is a core type
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import { PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import EntityForm from '@/components/ui/forms/EntityForm';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export const StudentCategoriesContent: React.FC = () => {
  const { studentCategories, loading, addStudentCategory, updateStudentCategory, deleteStudentCategory } = useAppData();
  const { t } = useTranslation('administration');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StudentCategory | null>(null);

  const openModal = (category?: StudentCategory) => {
    setEditingCategory(category || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const confirm = useConfirm();
  const handleDelete = async (id: number) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this category?' }))) {
      await deleteStudentCategory(id);
    }
  };

  const columns: DataGridColumn<StudentCategory>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value, item) => <span className="font-mono text-sm">{value}</span>
    },
    { 
      key: 'name', 
      header: 'Category Name', 
      sortable: true, 
      filterable: true, 
      width: 250,
      render: (value, item) => <span className="font-medium">{value}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (value, item) => (
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
      <Card title={t('studentCategories.title')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('studentCategories.addCategory')}
        </Button>
      }>
        <DataGrid 
          columns={columns} 
          data={studentCategories || []} 
          loading={loading.studentCategories}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-8">
              <ListBulletIcon className="w-12 h-12 text-surface-muted-fg mx-auto mb-4" />
              <p className="text-surface-muted-fg">No student categories found. Create your first category to get started.</p>
            </div>
          }
        />
      </Card>

      <EntityForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCategory ? t('studentCategories.editStudentCategory') : t('studentCategories.addNewStudentCategory')}
        initialData={editingCategory ? { name: editingCategory.name } : undefined}
        fields={[
          { name: 'name', label: t('studentCategories.categoryName'), required: true },
        ]}
        submitLabel={editingCategory ? t('studentCategories.saveChanges') : t('studentCategories.addCategory')}
        cancelLabel={t('studentCategories.cancel')}
        onSubmit={async (values) => {
          const payload = { name: String(values.name ?? '') };
          if (editingCategory) {
            await updateStudentCategory({ ...editingCategory, ...payload });
          } else {
            await addStudentCategory(payload);
          }
        }}
      />
    </div>
  );
};

const StudentCategoriesPage: React.FC = () => (
  <div className="space-y-6">
    <StudentCategoriesContent />
  </div>
);

export default StudentCategoriesPage;
