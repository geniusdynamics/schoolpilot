// ABOUTME: Manages school periods (terms) stored in the database and links them to academic years, period definitions, and financial years.
// ABOUTME: EntityForm-driven create/edit; term rules (inside the year, no overlap, one current term) are enforced by useSchoolPeriodData.

import React, { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { PlusIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';
import { useSchoolPeriodData, type SchoolPeriodRecord } from '../data/useSchoolPeriodData';
import { useAcademicYearData } from '../data/useAcademicYearData';
import { useAcademicPeriodDefinitionData } from '../data/useAcademicPeriodDefinitionData';
import { useFinancialYearData } from '@/modules/finance/data/useFinancialYearData';
import { useTranslation } from 'react-i18next';
import { EntityForm, EntityFieldConfig } from '@/components/ui/forms';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { formatDate } from '@/utils/format';

const asText = (value: unknown): string => (value === undefined || value === null ? '' : String(value));

export const SchoolPeriodsContent: React.FC = () => {
  const { t } = useTranslation();
  const { schoolPeriods, addSchoolPeriod, updateSchoolPeriod, deleteSchoolPeriod } = useSchoolPeriodData();
  const { data: academicYears } = useAcademicYearData();
  const { data: academicPeriodDefinitions } = useAcademicPeriodDefinitionData();
  const { financialYears, currentFinancialYear } = useFinancialYearData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<SchoolPeriodRecord | null>(null);

  const academicYearOptions = useMemo(
    () => academicYears.map((academicYear) => ({
      value: academicYear.id,
      label: academicYear.name,
    })),
    [academicYears]
  );

  const periodDefinitionOptions = useMemo(
    () => academicPeriodDefinitions.map((periodDefinition) => ({
      value: periodDefinition.id,
      label: periodDefinition.structure_name ? `${periodDefinition.name} (${periodDefinition.structure_name})` : periodDefinition.name,
    })),
    [academicPeriodDefinitions]
  );

  const financialYearOptions = useMemo(
    () => financialYears.map((financialYear) => ({
      value: financialYear.id,
      label: financialYear.name,
    })),
    [financialYears]
  );

  const openModal = (period?: SchoolPeriodRecord) => {
    setEditingPeriod(period || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPeriod(null);
  };

  const handleSave = async (values: Record<string, unknown>) => {
    const academicYearId = asText(values.academic_year_id);
    const periodDefinitionId = asText(values.period_definition_id);
    const financialYearId = asText(values.financial_year_id);
    const academicYearName = academicYears.find((year) => year.id === academicYearId)?.name ?? '';
    const periodDefinitionName = academicPeriodDefinitions.find((definition) => definition.id === periodDefinitionId)?.name ?? '';
    const financialYearName = financialYears.find((year) => year.id === financialYearId)?.name ?? '';

    const input = {
      academic_year_id: academicYearId,
      period_definition_id: periodDefinitionId,
      financial_year_id: financialYearId,
      start_date: asText(values.start_date),
      end_date: asText(values.end_date),
      mid_break_start: asText(values.mid_break_start) || null,
      mid_break_end: asText(values.mid_break_end) || null,
      is_active: Boolean(values.is_active),
      academic_year_name: academicYearName,
      period_definition_name: periodDefinitionName,
      financial_year_name: financialYearName,
      name: [periodDefinitionName, academicYearName].filter(Boolean).join(' - '),
    };

    if (editingPeriod) {
      await updateSchoolPeriod(editingPeriod.id, input);
    } else {
      await addSchoolPeriod(input);
    }
  };

  // Stable per open/edit target: EntityForm resets its values whenever initialData changes identity.
  const currentFinancialYearId = currentFinancialYear?.id ?? '';
  const formInitialData = useMemo(() => (editingPeriod ? {
    academic_year_id: asText(editingPeriod.academic_year_id),
    period_definition_id: asText(editingPeriod.period_definition_id),
    financial_year_id: asText(editingPeriod.financial_year_id),
    start_date: editingPeriod.start_date?.slice(0, 10) ?? '',
    end_date: editingPeriod.end_date?.slice(0, 10) ?? '',
    mid_break_start: editingPeriod.mid_break_start?.slice(0, 10) ?? '',
    mid_break_end: editingPeriod.mid_break_end?.slice(0, 10) ?? '',
    is_active: editingPeriod.is_active ?? false,
  } : { financial_year_id: currentFinancialYearId, is_active: false }), [editingPeriod, currentFinancialYearId]);

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this school period?' }))) {
      await deleteSchoolPeriod(id);
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

  const columns: DataGridColumn<SchoolPeriodRecord>[] = [
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
        initialData={formInitialData}
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
