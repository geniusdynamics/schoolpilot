import React, { useState } from 'react';
import { Department } from '@/types'; // Department is a core type
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import { PlusIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';
import { useDepartmentData } from '../data/useDepartmentData';
import { useTranslation } from 'react-i18next';
import EntityForm from '@/components/ui/forms/EntityForm';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const DepartmentsPage: React.FC = () => {
  const { departments, addDepartment, updateDepartment, deleteDepartment } = useDepartmentData();
  const { t } = useTranslation('administration');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  const openModal = (dept?: Department) => {
    setEditingDepartment(dept || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingDepartment(null);
    setIsModalOpen(false);
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this department?' }))) {
      await deleteDepartment(id);
    }
  };

  const columns: DataGridColumn<Department>[] = [
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
      header: 'Department Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, item) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'is_academic', 
      header: 'Is Academic', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, item) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-surface-accent text-surface-foreground'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      )
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
      <Card title={t('departments.management')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('departments.addDepartment')}
        </Button>
      }>
        <DataGrid 
          columns={columns} 
          data={departments || []} 
          loading={false}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-8">
              <PlusIcon className="w-12 h-12 text-surface-muted-fg mx-auto mb-4" />
              <p className="text-surface-muted-fg">No departments found. Create your first department to get started.</p>
            </div>
          }
        />
      </Card>

      <EntityForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDepartment ? t('departments.editDepartment') : t('departments.addNewDepartment')}
        initialData={editingDepartment ?? undefined}
        fields={[
          { name: 'name', label: t('departments.departmentName'), required: true },
          { name: 'is_academic', label: t('departments.isAcademicDepartment'), type: 'checkbox' },
        ]}
        submitLabel={editingDepartment ? t('departments.saveChanges') : t('departments.addDepartment')}
        cancelLabel={t('departments.cancel')}
        onSubmit={async (values) => {
          const payload = {
            name: String(values.name ?? ''),
            is_academic: Boolean(values.is_academic),
          };
          if (editingDepartment) {
            await updateDepartment({ ...editingDepartment, ...payload });
          } else {
            await addDepartment(payload);
          }
        }}
      />
    </div>
  );
};

export default DepartmentsPage;

export const DepartmentsContent = DepartmentsPage;
