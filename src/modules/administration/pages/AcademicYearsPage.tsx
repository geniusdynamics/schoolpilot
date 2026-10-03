import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AcademicYear } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { PlusIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; // Updated

import { EntityForm, EntityFieldConfig } from '@/components/ui/forms';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { formatDate } from '@/utils/format';

/**
 * Runtime academic-year row. Collection ids are strings post-normalization;
 * the `number` typing on the legacy AcademicYear interface predates it.
 */
type AcademicYearRow = Omit<AcademicYear, 'id' | 'structure_id'> & {
  id: string;
  structure_id: string | number | null;
};

export const AcademicYearsContent: React.FC = () => {
  const { t } = useTranslation();
  const appData = useAppData() as any;
  const academicYears = (appData.academicYears || []) as AcademicYearRow[];
  const academicYearStructures = appData.academicYearStructures || [];
  const loading = appData.loading || {};
  const addAcademicYear = appData.addAcademicYear;
  const updateAcademicYear = appData.updateAcademicYear;
  const deleteAcademicYear = appData.deleteAcademicYear;

  const [editingYear, setEditingYear] = useState<AcademicYearRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (year?: AcademicYearRow) => {
    setEditingYear(year || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingYear(null);
  };

  const handleSave = async (values: Record<string, any>) => {
    const payload = {
      name: values.name,
      structure_id: Number(values.structure_id),
      start_date: values.start_date,
      end_date: values.end_date,
    };
    if (editingYear) {
      await updateAcademicYear({ ...editingYear, ...payload });
    } else {
      await addAcademicYear(payload);
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this academic year? This might affect related school periods and other academic data.' }))) {
      await deleteAcademicYear(id);
    }
  };

  const fields: EntityFieldConfig[] = useMemo(() => [
    { name: 'name', label: t('academicYears.yearName', 'Year Name'), required: true },
    {
      name: 'structure_id',
      label: t('academicYears.structure', 'Structure'),
      type: 'select',
      required: true,
      options: academicYearStructures.map((s: { id: number | string; name: string }) => ({ value: s.id, label: s.name })),
    },
    { name: 'start_date', label: t('academicYears.startDate', 'Start Date'), type: 'date', required: true },
    {
      name: 'end_date',
      label: t('academicYears.endDate', 'End Date'),
      type: 'date',
      required: true,
      validate: (value, allValues) =>
        value && allValues.start_date && new Date(value) <= new Date(allValues.start_date)
          ? 'End date must be after the start date.'
          : null,
    },
  ], [t, academicYearStructures]);

  const columns: DataGridColumn<AcademicYearRow>[] = [
    {
      key: 'name',
      header: 'Year Name',
      sortable: true,
      filterable: true,
      render: (_value, item) => <span className="font-medium">{item.name}</span>
    },
    {
      key: 'structure_name',
      header: 'Structure',
      sortable: true,
      filterable: true,
      render: (_value, item) => <span className="text-primary-600">{item.structure_name || '—'}</span>
    },
    {
      key: 'start_date',
      header: 'Start Date',
      sortable: true,
      render: (_value, item) => (
        <span className="text-green-600 font-medium">{formatDate(item.start_date)}</span>
      )
    },
    {
      key: 'end_date',
      header: 'End Date',
      sortable: true,
      render: (_value, item) => (
        <span className="text-red-600 font-medium">{formatDate(item.end_date)}</span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      sticky: 'right',
      render: (_value, item) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="Academic Years Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Academic Year
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          Define academic years (e.g., "AY 2023/2024"), link them to an Academic Year Structure, and set their start and end dates.
        </p>
        <DataGrid
          columns={columns}
          data={academicYears}
          loading={Boolean(loading.academicYears)}
          sortable
          filterable
          pagination
          emptyState={{
            icon: <span className="text-3xl">📅</span>,
            title: 'No academic years found',
            description: 'Create your first academic year to get started.',
          }}
        />
      </Card>

      <EntityForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingYear ? String(t('academicYears.editYear', 'Edit Academic Year')) : String(t('academicYears.addNewYear', 'Add New Academic Year'))}
        initialData={editingYear ? {
          name: editingYear.name,
          structure_id: editingYear.structure_id != null ? String(editingYear.structure_id) : '',
          start_date: editingYear.start_date?.slice(0, 10) ?? '',
          end_date: editingYear.end_date?.slice(0, 10) ?? '',
        } : undefined}
        fields={fields}
        onSubmit={handleSave}
      />
    </div>
  );
};

const AcademicYearsPage: React.FC = () => (
  <div className="space-y-6">
    <AcademicYearsContent />
  </div>
);

export default AcademicYearsPage;
