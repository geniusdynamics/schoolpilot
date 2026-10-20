// ABOUTME: Subjects management page — CRUD-pattern pilot (docs/contributing/crud.md).
// ABOUTME: List page = Card + DataGrid + EntityForm dialog + ConfirmDialog delete,
// ABOUTME: data via useEntityCrud (optimistic updates, toasts, rollback).

import React, { useMemo, useState } from 'react';
import { Subject } from '../data/types';
import { SubjectGrouping } from '../data/enums';
import { useTranslation } from 'react-i18next';
import { useAppData } from '@/hooks/useAppData';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { PlusIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';
import { EntityForm, EntityFieldConfig } from '@/components/ui/forms';
import { useEntityCrud } from '@/hooks/useEntityCrud';

/**
 * Runtime subject row. Collection ids are strings (PouchDB-backed); the
 * `number` typing on the legacy Subject interface predates id normalization.
 */
type SubjectRow = Omit<Subject, 'id'> & { id: string };

export const SubjectsContent: React.FC = () => {
  const { rawInitialData } = useAppData();
  // Departments feed the form's select options only — subjects data lives in useEntityCrud.
  const departments = rawInitialData?.departments || [];
  const { t } = useTranslation('academics');

  const [editingSubject, setEditingSubject] = useState<SubjectRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const subjects = useEntityCrud<SubjectRow>({
    collectionName: 'subjects',
    entityName: 'Subject',
  });

  const openModal = (subject?: SubjectRow) => {
    setEditingSubject(subject || null);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  const handleSave = async (values: Record<string, any>) => {
    if (editingSubject) {
      await subjects.update(editingSubject.id, values);
    } else {
      await subjects.create(values as Omit<SubjectRow, 'id' | 'created_at' | 'updated_at'>);
    }
  };

  const handleDelete = async (id: string) => {
    await subjects.confirmRemove(id);
  };

  const fields: EntityFieldConfig[] = useMemo(() => [
    { name: 'subject_code', label: t('subjects.code'), required: true },
    { name: 'abbreviation', label: t('subjects.abbreviation'), required: true },
    { name: 'name', label: t('subjects.name'), required: true, colSpan: 2 },
    {
      name: 'department_id',
      label: t('subjects.department'),
      type: 'select',
      options: departments
        .filter((d: { is_academic: boolean }) => d.is_academic)
        .map((dep: { id: string | number; name: string }) => ({ value: dep.id, label: dep.name })),
    },
    {
      name: 'grouping',
      label: t('subjects.grouping'),
      type: 'select',
      required: true,
      options: Object.values(SubjectGrouping).map(group => ({ value: group, label: group })),
    },
    { name: 'is_compulsory', label: t('subjects.isCompulsory'), type: 'checkbox' },
  ], [t, departments]);

  const columns: DataGridColumn<SubjectRow>[] = [
    { key: 'subject_code', header: t('subjects.code'), sortable: true, filterable: true },
    { key: 'abbreviation', header: t('subjects.abbreviation'), sortable: true },
    { key: 'name', header: t('subjects.name'), sortable: true, filterable: true, render: (_v: any, item: SubjectRow) => <span className="truncate block max-w-[240px]" title={item.name}>{item.name}</span> },
    { key: 'department_name', header: t('subjects.department'), sortable: true, filterable: true, render: (_v: any, item: SubjectRow) => <span className="truncate block max-w-[160px]" title={item.department_name || ''}>{item.department_name || '—'}</span> },
    { key: 'grouping', header: t('subjects.grouping'), sortable: true },
    { key: 'is_compulsory', header: t('subjects.isCompulsory'), align: 'center', render: (_value: any, item: SubjectRow) => item.is_compulsory ? t('common:yes') : t('common:no') },
    {
      key: 'actions',
      header: t('common:actions'),
      sticky: 'right',
      sortable: false,
      filterable: false,
      render: (_value: any, item: SubjectRow) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>{t('common:edit')}</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>{t('common:delete')}</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title={t('subjects.management')} bodyClassName="p-0" actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>Add Subject</Button>
      }>
        <div className="border-t border-surface-border">
          <DataGrid columns={columns} data={subjects.items} loading={subjects.loading} sortable filterable pagination />
        </div>
      </Card>

      <EntityForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSubject ? String(t('subjects.edit')) : String(t('subjects.addNew'))}
        initialData={editingSubject ?? undefined}
        fields={fields}
        onSubmit={handleSave}
      />
    </div>
  );
};

const SubjectsPage: React.FC = () => (
  <div className="space-y-6">
    <SubjectsContent />
  </div>
);

export default SubjectsPage;
