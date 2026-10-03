import React, { useState } from 'react';
import { Dormitory } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import { PlusIcon, EditIcon, DeleteIcon, BuildingLibraryIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import EntityForm from '@/components/ui/forms/EntityForm';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export const DormitoriesContent: React.FC = () => {
  const { dormitories, staff, loading, addDormitory, updateDormitory, deleteDormitory } = useAppData();
  const { t } = useTranslation('administration');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDormitory, setEditingDormitory] = useState<Dormitory | null>(null);

  const openModal = (dorm?: Dormitory) => {
    setEditingDormitory(dorm || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDormitory(null);
  };

  const confirm = useConfirm();
  const handleDelete = async (id: number) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this dormitory?' }))) {
      await deleteDormitory(id);
    }
  };

  const columns: DataGridColumn<Dormitory>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      filterable: true,
      width: 80,
      render: (value, item) => value
    },
    {
      key: 'name',
      header: 'Dormitory Name',
      sortable: true,
      filterable: true,
      width: 200,
      render: (value, item) => value
    },
    {
      key: 'master_name',
      header: 'Master/Mistress',
      sortable: true,
      filterable: true,
      width: 180,
      render: (value, item) => value || '-'
    },
    {
      key: 'capacity',
      header: 'Capacity',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, item) => value || '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 160,
      sticky: 'right',
      render: (value, item) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if ((loading.dormitories || loading.staff) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Dormitories...</span>
      </div>
    );
  }

  return (
    <>
      <Card title={t('dormitories.management')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('dormitories.addDormitory')}
        </Button>
      }>
        <DataGrid
          columns={columns}
          data={dormitories}
          loading={loading.dormitories && isModalOpen}
          sortable
          filterable
          emptyState={{
            icon: <BuildingLibraryIcon className="h-12 w-12 text-surface-muted-fg" />,
            title: 'No dormitories found',
            description: 'Get started by adding your first dormitory.',
          }}
        />
      </Card>

      <EntityForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDormitory ? t('dormitories.editDormitory') : t('dormitories.addNewDormitory')}
        initialData={editingDormitory
          ? { name: editingDormitory.name, master_id: editingDormitory.master_id, capacity: editingDormitory.capacity }
          : undefined}
        fields={[
          { name: 'name', label: t('dormitories.dormitoryName'), required: true },
          { name: 'capacity', label: t('dormitories.capacity'), type: 'number' },
          {
            name: 'master_id',
            label: t('dormitories.dormitoryMasterMistress'),
            type: 'select',
            placeholder: t('dormitories.selectStaffMember'),
            options: staff
              .filter((s: any) => s.is_active)
              .map((staffMember: any) => ({
                value: staffMember.id,
                label: `${staffMember.first_name} ${staffMember.last_name} (${staffMember.designation_title || 'N/A'})`,
              })),
          },
        ]}
        submitLabel={editingDormitory ? t('dormitories.saveChanges') : t('dormitories.addDormitory')}
        cancelLabel={t('dormitories.cancel')}
        onSubmit={async (values) => {
          const payload = {
            name: String(values.name ?? ''),
            master_id: values.master_id ? Number(values.master_id) : undefined,
            capacity: values.capacity ? parseInt(String(values.capacity)) : undefined,
          };
          if (editingDormitory) {
            await updateDormitory({ ...editingDormitory, ...payload });
          } else {
            await addDormitory(payload);
          }
        }}
      />
    </>
  );
};

const DormitoriesPage: React.FC = () => (
  <div className="space-y-6">
    <DormitoriesContent />
  </div>
);

export default DormitoriesPage;
