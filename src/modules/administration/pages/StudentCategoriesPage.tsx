// ABOUTME: Student categories page — grid plus add/edit/delete dialog backed by 'student_categories'.
// ABOUTME: CRUD goes through useAdministration() with update(id, patch) and string ids.

import React, { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import { PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '@/components/ui/icons';
import { useAdministration } from '../hooks/useAdministration';
import { useTranslation } from 'react-i18next';
import EntityForm from '@/components/ui/forms/EntityForm';
import { useConfirm } from '@/components/ui/ConfirmDialog';

/** A student category as shown in the grid; ids are strings at runtime. */
interface StudentCategoryRow {
  id: string;
  name: string;
}

export const StudentCategoriesContent: React.FC = () => {
  const { studentCategories, addStudentCategory, updateStudentCategory, deleteStudentCategory } = useAdministration();
  const { t } = useTranslation('administration');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StudentCategoryRow | null>(null);

  const rows = useMemo<StudentCategoryRow[]>(
    () => studentCategories.map(category => ({ ...category, id: String(category.id) })),
    [studentCategories]
  );

  const openModal = (category?: StudentCategoryRow) => {
    setEditingCategory(category || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this category?' }))) {
      await deleteStudentCategory(id);
    }
  };

  const columns: DataGridColumn<StudentCategoryRow>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    { 
      key: 'name', 
      header: 'Category Name', 
      sortable: true, 
      filterable: true, 
      width: 250,
      render: (value) => <span className="font-medium">{value}</span>
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

  return (
    <div className="space-y-6">
      <Card title={t('studentCategories.title')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('studentCategories.addCategory')}
        </Button>
      }>
        <DataGrid 
          columns={columns} 
          data={rows}
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
            await updateStudentCategory(editingCategory.id, payload);
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
