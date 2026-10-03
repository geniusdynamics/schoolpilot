// ABOUTME: Manages school period records and links them to academic years, period definitions, and financial years.
// ABOUTME: EntityForm-driven create/edit with cross-field date validation (Phase 3.4).

import React, { useMemo, useState } from 'react';
import { SchoolPeriod, AcademicYear, AcademicPeriodDefinition } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { PlusIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';
import { useSchoolPeriodData } from '../data/useSchoolPeriodData';
import { useAcademicYearData } from '../data/useAcademicYearData';
import { useAcademicPeriodDefinitionData } from '../data/useAcademicPeriodDefinitionData';
import { useAppData } from '@/hooks/useAppData';
import { useTranslation } from 'react-i18next';
import { EntityForm, EntityFieldConfig } from '@/components/ui/forms';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { formatDate } from '@/utils/format';

export const SchoolPeriodsContent: React.FC = () => {
  const { t } = useTranslation();
  const { schoolPeriods, addSchoolPeriod, updateSchoolPeriod, deleteSchoolPeriod } = useSchoolPeriodData();
  const { data: academicYears } = useAcademicYearData();
  const { data: academicPeriodDefinitions } = useAcademicPeriodDefinitionData();
  const { financialYears } = useAppData() as any;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<SchoolPeriod | null>(null);

  const academicYearOptions = useMemo(
    () => (academicYears || []).map((academicYear: AcademicYear) => ({
      value: String(academicYear.id),
      label: academicYear.name,
    })),
    [academicYears]
  );

  const periodDefinitionOptions = useMemo(
    () => (academicPeriodDefinitions || []).map((periodDefinition: AcademicPeriodDefinition) => ({
      value: String(periodDefinition.id),
      label: `${periodDefinition.name} (${periodDefinition.structure_name})`,
    })),
    [academicPeriodDefinitions]
  );

  const financialYearOptions = useMemo(
    () => (financialYears || []).map((financialYear: { id: number | string; name: string }) => ({
      value: String(financialYear.id),
      label: financialYear.name,
    })),
    [financialYears]
  );

  const openModal = (period?: SchoolPeriod) => {
    setEditingPeriod(period || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPeriod(null);
  };

  const handleSave = async (values: Record<string, any>) => {
    const payload = {
      academic_year_id: Number(values.academic_year_id),
      period_definition_id: String(values.period_definition_id),
      financial_year_id: Number(values.financial_year_id),
      start_date: values.start_date,
      end_date: values.end_date,
      mid_break_start: values.mid_break_start || undefined,
      mid_break_end: values.mid_break_end || undefined,
      is_active: Boolean(values.is_active),
      // Denormalized display names
      academic_year_name: (academicYears || []).find(ay => String(ay.id) === String(values.academic_year_id))?.name || '',
      period_definition_name: (academicPeriodDefinitions || []).find(pd => String(pd.id) === String(values.period_definition_id))?.name || '',
      financial_year_name: (financialYears || []).find((fy: { id: number | string }) => String(fy.id) === String(values.financial_year_id))?.name || '',
      name: `${(academicPeriodDefinitions || []).find(pd => String(pd.id) === String(values.period_definition_id))?.name || ''} - ${(academicYears || []).find(ay => String(ay.id) === String(values.academic_year_id))?.name || ''}`.trim(),
    };

    if (editingPeriod) {
      await updateSchoolPeriod(editingPeriod.id, payload);
    } else {
      await addSchoolPeriod(payload);
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (id: number | string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this school period?' }))) {
      await deleteSchoolPeriod(id as never);
    }
  };

  const fields: EntityFieldConfig[] = useMemo(() => [
    { name: 'academic_year_id', label: t('schoolPeriods.academicYear', 'Academic Year'), type: 'select', required: true, options: academicYearOptions },
    { name: 'period_definition_id', label: t('schoolPeriods.periodDefinition', 'Period Definition'), type: 'select', required: true, options: periodDefinitionOptions },
    { name: 'financial_year_id', label: t('schoolPeriods.financialYear', 'Financial Year'), type: 'select', required: true, options: financialYearOptions },
    { name: 'start_date', label: t('schoolPeriods.startDate', 'Start Date'), type: 'date', required: true },
    {
      name: 'end_date',
      label: t('schoolPeriods.endDate', 'End Date'),
      type: 'date',
      required: true,
      validate: (value, all) =>
        value && all.start_date && new Date(value) <= new Date(all.start_date)
          ? t('validation.endDateAfterStartDate')
          : null,
    },
    { name: 'mid_break_start', label: t('schoolPeriods.midBreakStart', 'Mid-Break Start (Optional)'), type: 'date' },
    {
      name: 'mid_break_end',
      label: t('schoolPeriods.midBreakEnd', 'Mid-Break End (Optional)'),
      type: 'date',
      validate: (value, all) =>
        value && all.mid_break_start && new Date(value) <= new Date(all.mid_break_start)
          ? t('validation.midbreakEndDateMustBeAfterMidbreakStartDate')
          : null,
    },
    { name: 'is_active', label: t('schoolPeriods.setActive', 'Set as Active School Period'), type: 'checkbox' },
  ], [t, academicYearOptions, periodDefinitionOptions, financialYearOptions]);

  const columns: DataGridColumn<SchoolPeriod>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filterable: true,
      render: (_value, item) => item.name || '—'
    },
    {
      key: 'academic_year_name',
      header: 'Academic Year',
      sortable: true,
      filterable: true,
      render: (_value, item) => item.academic_year_name || '—'
    },
    {
      key: 'period_definition_name',
      header: 'Period Definition',
      sortable: true,
      filterable: true,
      render: (_value, item) => item.period_definition_name || '—'
    },
    {
      key: 'financial_year_name',
      header: 'Financial Year',
      sortable: true,
      filterable: true,
      render: (_value, item) => item.financial_year_name || '—'
    },
    {
      key: 'start_date',
      header: 'Start Date',
      sortable: true,
      render: (_value, item) => formatDate(item.start_date)
    },
    {
      key: 'end_date',
      header: 'End Date',
      sortable: true,
      render: (_value, item) => formatDate(item.end_date)
    },
    {
      key: 'is_active',
      header: 'Active',
      render: (_value, item) => item.is_active ? 'Yes' : 'No'
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
      <Card title="School Periods (Terms/Semesters)" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add School Period
        </Button>
      }>
         <p className="text-sm text-surface-muted-fg mb-4">
          Define specific school terms or semesters within an academic year. Link them to financial years and academic period definitions (e.g., "Term 1").
        </p>
        <DataGrid
          columns={columns}
          data={schoolPeriods || []}
          sortable
          filterable
          pagination
          emptyState={{
            icon: <span className="text-3xl">🗓️</span>,
            title: 'No school periods found',
            description: 'Create your first period to get started.',
          }}
        />
      </Card>

      <EntityForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPeriod ? 'Edit School Period' : 'Add New School Period'}
        initialData={editingPeriod ? {
          academic_year_id: editingPeriod.academic_year_id != null ? String(editingPeriod.academic_year_id) : '',
          period_definition_id: editingPeriod.period_definition_id != null ? String(editingPeriod.period_definition_id) : '',
          financial_year_id: editingPeriod.financial_year_id != null ? String(editingPeriod.financial_year_id) : '',
          start_date: editingPeriod.start_date?.slice(0, 10) ?? '',
          end_date: editingPeriod.end_date?.slice(0, 10) ?? '',
          mid_break_start: editingPeriod.mid_break_start?.slice(0, 10) ?? '',
          mid_break_end: editingPeriod.mid_break_end?.slice(0, 10) ?? '',
          is_active: editingPeriod.is_active ?? false,
        } : undefined}
        fields={fields}
        onSubmit={handleSave}
      />
    </div>
  );
};

const SchoolPeriodsPage: React.FC = () => (
  <div className="space-y-6">
    <SchoolPeriodsContent />
  </div>
);

export default SchoolPeriodsPage;
