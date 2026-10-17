// ABOUTME: Designations page — grid plus add/edit/delete dialog backed by the 'designations' collection.
// ABOUTME: Designations saved here feed the staff form; edits use updateDesignation(id, patch).

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import { PlusIcon, EditIcon, DeleteIcon, IdentificationIcon } from '@/components/ui/icons';
import { useDesignationData, type DesignationRecord } from '@/modules/administration/data/useDesignationData';
import { useTranslation } from 'react-i18next';
import EntityForm from '@/components/ui/forms/EntityForm';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export const DesignationsContent: React.FC = () => {
  const { designations, loading, addDesignation, updateDesignation, deleteDesignation } = useDesignationData();
  const { t } = useTranslation('administration');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<DesignationRecord | null>(null);

  const openModal = (desig?: DesignationRecord) => {
    setEditingDesignation(desig || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDesignation(null);
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this designation?' }))) {
      await deleteDesignation(id);
    }
  };

  const columns: DataGridColumn<DesignationRecord>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      filterable: true,
      width: 80,
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    {
      key: 'title',
      header: 'Designation Title',
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
    <>
      <Card title={t('designations.management')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('designations.addDesignation')}
        </Button>
      }>
        <DataGrid
          columns={columns}
          data={designations}
          loading={loading.designations && designations.length === 0}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-8">
              <IdentificationIcon className="w-12 h-12 text-surface-muted-fg mx-auto mb-4" />
              <p className="text-surface-muted-fg">No designations found. Create your first designation to get started.</p>
            </div>
          }
        />
      </Card>

      <EntityForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDesignation ? t('designations.editDesignation') : t('designations.addNewDesignation')}
        initialData={editingDesignation ? { title: editingDesignation.title } : undefined}
        fields={[
          { name: 'title', label: t('designations.designationTitle'), required: true },
        ]}
        submitLabel={editingDesignation ? t('designations.saveChanges') : t('designations.addDesignation')}
        cancelLabel={t('designations.cancel')}
        onSubmit={async (values) => {
          const payload = { title: String(values.title ?? '') };
          if (editingDesignation) {
            await updateDesignation(String(editingDesignation.id), payload);
          } else {
            await addDesignation(payload);
          }
        }}
      />
    </>
  );
};

const DesignationsPage: React.FC = () => (
  <div className="space-y-6">
    <DesignationsContent />
  </div>
);

export default DesignationsPage;
