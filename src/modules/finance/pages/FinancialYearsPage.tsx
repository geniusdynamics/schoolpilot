// ABOUTME: Finance settings page for financial years: create, edit, close and reopen years stored in the database.
// ABOUTME: Shows the single current year; rules (no overlap, one open year kept current) live in useFinancialYearData.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { EntityForm, EntityFieldConfig } from '@/components/ui/forms';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ArrowPathIcon, EditIcon, LockClosedIcon, PlusIcon } from '@/components/ui/icons';
import { useToast } from '@/hooks/useToast';
import { FinancialYearStatus } from '@/core/types';
import { formatDate } from '@/utils/format';
import {
  suggestNextFinancialYear,
  useFinancialYearData,
  type FinancialYearInput,
  type FinancialYearRecord,
} from '../data/useFinancialYearData';

const statusVariant: Record<string, 'success' | 'secondary' | 'warning'> = {
  [FinancialYearStatus.OPEN]: 'success',
  [FinancialYearStatus.CLOSED]: 'secondary',
  [FinancialYearStatus.ARCHIVED]: 'warning',
};

const FinancialYearsPage: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const { financialYears, currentFinancialYear, loading, create, update, close, reopen, canClose } = useFinancialYearData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialYearRecord | null>(null);
  const [formDefaults, setFormDefaults] = useState<FinancialYearInput | null>(null);

  const statusLabel = (status: string) => {
    if (status === FinancialYearStatus.OPEN) return t('finance:financialYears.status.open', 'Open');
    if (status === FinancialYearStatus.CLOSED) return t('finance:financialYears.status.closed', 'Closed');
    return t('finance:financialYears.status.archived', 'Archived');
  };

  const openCreate = () => {
    setEditing(null);
    setFormDefaults(suggestNextFinancialYear(financialYears));
    setIsFormOpen(true);
  };

  const openEdit = (year: FinancialYearRecord) => {
    setEditing(year);
    setFormDefaults({ name: year.name, start_date: year.start_date?.slice(0, 10) ?? '', end_date: year.end_date?.slice(0, 10) ?? '' });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setFormDefaults(null);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    const input: FinancialYearInput = {
      name: String(values.name ?? ''),
      start_date: String(values.start_date ?? ''),
      end_date: String(values.end_date ?? ''),
    };
    if (editing) {
      await update(editing.id, input);
    } else {
      await create(input);
    }
  };

  const handleClose = async (year: FinancialYearRecord) => {
    const confirmed = await confirm({
      variant: 'warning',
      title: t('finance:financialYears.closeTitle', 'Close financial year'),
      message: t('finance:financialYears.closeMessage', {
        defaultValue: 'Close {{name}}? Closed years stay available in reports but are no longer current.',
        name: year.name,
      }),
      confirmLabel: t('finance:financialYears.close', 'Close'),
    });
    if (!confirmed) return;
    try {
      await close(year.id);
      toast.showSuccess(t('finance:financialYears.closed', { defaultValue: '{{name}} closed', name: year.name }));
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : t('common:saveError', 'Failed to save. Please try again.'));
    }
  };

  const handleReopen = async (year: FinancialYearRecord) => {
    try {
      await reopen(year.id);
      toast.showSuccess(t('finance:financialYears.reopened', { defaultValue: '{{name}} reopened', name: year.name }));
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : t('common:saveError', 'Failed to save. Please try again.'));
    }
  };

  const fields: EntityFieldConfig[] = useMemo(() => [
    { name: 'name', label: t('finance:financialYears.name', 'Name'), required: true, colSpan: 2, placeholder: 'FY 2027' },
    { name: 'start_date', label: t('finance:financialYears.startDate', 'Start Date'), type: 'date', required: true },
    {
      name: 'end_date',
      label: t('finance:financialYears.endDate', 'End Date'),
      type: 'date',
      required: true,
      validate: (value, all) =>
        value && all.start_date && String(value) <= String(all.start_date)
          ? t('validation.endDateAfterStartDate', 'End date must be after the start date.')
          : null,
    },
  ], [t]);

  const columns: DataGridColumn<FinancialYearRecord>[] = [
    {
      key: 'name',
      header: t('finance:financialYears.name', 'Name'),
      sortable: true,
      filterable: true,
      render: (_value, item) => (
        <span className="inline-flex items-center gap-2">
          <span>{item.name}</span>
          {currentFinancialYear?.id === item.id && (
            <Badge variant="primary" size="sm">{t('finance:financialYears.current', 'Current')}</Badge>
          )}
        </span>
      ),
    },
    {
      key: 'start_date',
      header: t('finance:financialYears.startDate', 'Start Date'),
      sortable: true,
      render: (_value, item) => formatDate(item.start_date),
    },
    {
      key: 'end_date',
      header: t('finance:financialYears.endDate', 'End Date'),
      sortable: true,
      render: (_value, item) => formatDate(item.end_date),
    },
    {
      key: 'status',
      header: t('finance:financialYears.statusHeader', 'Status'),
      sortable: true,
      render: (_value, item) => (
        <Badge variant={statusVariant[item.status] ?? 'secondary'} size="sm">{statusLabel(item.status)}</Badge>
      ),
    },
    {
      key: 'actions',
      header: t('common:actions', 'Actions'),
      sortable: false,
      filterable: false,
      sticky: 'right',
      render: (_value, item) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => openEdit(item)} leftIcon={<EditIcon className="w-4 h-4" />}>
            {t('common:edit', 'Edit')}
          </Button>
          {item.status === FinancialYearStatus.OPEN ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={!canClose(item.id)}
              title={canClose(item.id) ? undefined : t('finance:financialYears.lastOpenHint', 'Create or reopen another financial year before closing this one.')}
              onClick={() => handleClose(item)}
              leftIcon={<LockClosedIcon className="w-4 h-4" />}
            >
              {t('finance:financialYears.close', 'Close')}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => handleReopen(item)} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
              {t('finance:financialYears.reopen', 'Reopen')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card
        title={t('finance:financialYears.title', 'Financial Years')}
        actions={
          <Button onClick={openCreate} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('finance:financialYears.add', 'Add Financial Year')}
          </Button>
        }
      >
        <p className="text-sm text-surface-muted-fg mb-4">
          {t(
            'finance:financialYears.description',
            'Financial years group terms, fees and accounts. Date ranges may not overlap, and one open year is always the current year.'
          )}
        </p>
        <DataGrid
          columns={columns}
          data={financialYears}
          loading={loading}
          sortable
          filterable
          pagination
          emptyState={{
            title: t('finance:financialYears.emptyTitle', 'No financial years yet'),
            description: t('finance:financialYears.emptyDescription', 'Add the financial year your terms and fees belong to.'),
          }}
        />
      </Card>

      <EntityForm
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editing ? t('finance:financialYears.edit', 'Edit Financial Year') : t('finance:financialYears.add', 'Add Financial Year')}
        initialData={formDefaults ?? undefined}
        fields={fields}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default FinancialYearsPage;
