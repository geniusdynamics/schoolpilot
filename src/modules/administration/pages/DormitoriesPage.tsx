// ABOUTME: Dormitories page — grid plus add/edit/delete dialog backed by the 'dormitories' collection.
// ABOUTME: CRUD goes through useAdministration() with update(id, patch); the master's name is resolved from staff.

import React, { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import { PlusIcon, EditIcon, DeleteIcon, BuildingLibraryIcon } from '@/components/ui/icons';
import { useAdministration } from '../hooks/useAdministration';
import { useTranslation } from 'react-i18next';
import EntityForm from '@/components/ui/forms/EntityForm';
import { useConfirm } from '@/components/ui/ConfirmDialog';

/** A dormitory row as shown in the grid; ids are strings and the master's name is resolved at read time. */
interface DormitoryRow {
  id: string;
  name: string;
  capacity?: number | null;
  master_id?: string | null;
  master_name?: string | null;
}

interface StaffOption {
  id: string | number;
  first_name?: string;
  last_name?: string;
  designation_title?: string | null;
  is_active?: boolean;
}

export const DormitoriesContent: React.FC = () => {
  const { dormitories, staff, addDormitory, updateDormitory, deleteDormitory } = useAdministration();
  const { t } = useTranslation('administration');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDormitory, setEditingDormitory] = useState<DormitoryRow | null>(null);

  const staffMembers = staff as StaffOption[];
  const rows = useMemo<DormitoryRow[]>(() => {
    const staffName = (id: unknown) => {
      const member = staffMembers.find(s => String(s.id) === String(id));
      return member ? `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() : null;
    };
    return (dormitories as unknown as DormitoryRow[]).map(dorm => ({
      ...dorm,
      id: String(dorm.id),
      master_id: dorm.master_id == null ? dorm.master_id : String(dorm.master_id),
      master_name: (dorm.master_id != null ? staffName(dorm.master_id) : null) ?? dorm.master_name ?? null,
    }));
  }, [dormitories, staffMembers]);

  const openModal = (dorm?: DormitoryRow) => {
    setEditingDormitory(dorm || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDormitory(null);
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this dormitory?' }))) {
      await deleteDormitory(id);
    }
  };

  const columns: DataGridColumn<DormitoryRow>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      filterable: true,
      width: 80,
      render: (value) => value
    },
    {
      key: 'name',
      header: 'Dormitory Name',
      sortable: true,
      filterable: true,
      width: 200,
      render: (value) => value
    },
    {
      key: 'master_name',
      header: 'Master/Mistress',
      sortable: true,
      filterable: true,
      width: 180,
      render: (value) => value || '-'
    },
    {
      key: 'capacity',
      header: 'Capacity',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => value || '-'
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

  return (
    <>
      <Card title={t('dormitories.management')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('dormitories.addDormitory')}
        </Button>
      }>
        <DataGrid
          columns={columns}
          data={rows}
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
            options: staffMembers
              .filter(s => s.is_active)
              .map(staffMember => ({
                value: String(staffMember.id),
                label: `${staffMember.first_name} ${staffMember.last_name} (${staffMember.designation_title || 'N/A'})`,
              })),
          },
        ]}
        submitLabel={editingDormitory ? t('dormitories.saveChanges') : t('dormitories.addDormitory')}
        cancelLabel={t('dormitories.cancel')}
        onSubmit={async (values) => {
          const payload = {
            name: String(values.name ?? ''),
            master_id: values.master_id ? String(values.master_id) : null,
            capacity: values.capacity !== undefined && values.capacity !== '' ? Number(values.capacity) : null,
          };
          if (editingDormitory) {
            await updateDormitory(editingDormitory.id, payload);
          } else {
            const now = new Date().toISOString();
            await addDormitory({ ...payload, created_at: now, updated_at: now });
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
