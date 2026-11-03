// ABOUTME: Finance settings page for financial years: create, edit, close and reopen the canonical
// ABOUTME: financial_year rows. Date ranges may not overlap and exactly one year is current.
// ABOUTME: Closing a year here does not close the ledger's accounting period; that lives in reports.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  ArrowPathIcon,
  EditIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  PlusIcon,
} from '@/components/ui/icons';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import {
  SchemaEntityForm,
  type EntityFormFieldMeta,
} from '@/components/ui/forms';
import {
  createSchemaFor,
  toWritableValues,
  updateSchemaFor,
  type CreateInput,
} from '@/data/repository';
import { asId } from '@/domain/ids';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';

import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { messageOf } from '../data/errors';
import {
  suggestNextFinancialYear,
  useFinancialYearData,
  type FinancialYearRow,
} from '../data/useFinancialYearData';

/** The period-close view of the ledger, where an accounting period is actually closed. */
export const PERIOD_CLOSE_PATH = '/finance/accounting-reports?tab=period-close';

const STATUS_LABEL_KEYS: Readonly<Record<FinancialYearRow['status'], [string, string]>> = {
  planned: ['finance:financialYears.status.planned', 'Planned'],
  current: ['finance:financialYears.status.current', 'Current year'],
  closed: ['finance:financialYears.status.closed', 'Closed'],
};

const STATUS_VARIANTS: Readonly<Record<FinancialYearRow['status'], 'success' | 'secondary' | 'info'>> = {
  planned: 'info',
  current: 'success',
  closed: 'secondary',
};

const FIELDS: readonly EntityFormFieldMeta[] = [
  {
    path: 'name',
    label: 'Name',
    order: 1,
    section: 'Financial year',
    required: true,
    colSpan: 2,
    placeholder: 'FY 2027',
  },
  {
    path: 'start_date',
    label: 'Start date',
    order: 2,
    section: 'Financial year',
    widget: 'date',
    required: true,
  },
  {
    path: 'end_date',
    label: 'End date',
    order: 3,
    section: 'Financial year',
    widget: 'date',
    required: true,
  },
];

export const FinancialYearsContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const toast = useToast();
  const confirm = useConfirm();
  const {
    institutionId,
    financialYears,
    currentFinancialYear,
    loading,
    error,
    refresh,
    create: createYear,
    update: updateYear,
    close: closeYear,
    reopen: reopenYear,
    canClose,
  } = useFinancialYearData();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FinancialYearRow | null>(null);

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const create = async (values: Record<string, unknown>) => {
    const name = String(values.name ?? '');
    try {
      await createYear({
        name,
        start_date: String(values.start_date ?? ''),
        end_date: String(values.end_date ?? ''),
      });
      closeForm();
      toast.showSuccess(t('finance:financialYears.created', '{{name}} created', { name }));
    } catch (failure) {
      throw new Error(messageOf(failure));
    }
  };

  const update = async (values: Record<string, unknown>) => {
    if (!editing) return;
    const name = String(values.name ?? editing.name);
    try {
      await updateYear(String(editing.id), {
        name,
        start_date: String(values.start_date ?? editing.start_date),
        end_date: String(values.end_date ?? editing.end_date),
      });
      closeForm();
      toast.showSuccess(t('finance:financialYears.saved', '{{name}} saved', { name }));
    } catch (failure) {
      throw new Error(messageOf(failure));
    }
  };

  const handleClose = async (year: FinancialYearRow) => {
    const confirmed = await confirm({
      variant: 'warning',
      title: t('finance:financialYears.closeTitle', 'Close financial year'),
      message: t('finance:financialYears.closeMessage', {
        defaultValue:
          'Close {{name}}? Closed years stay available in reports, and the next open year becomes current. The ledger’s accounting period is not closed here.',
        name: year.name,
      }),
      confirmLabel: t('finance:financialYears.close', 'Close'),
    });
    if (!confirmed) return;
    try {
      await closeYear(String(year.id));
      toast.showSuccess(
        t('finance:financialYears.closed', '{{name}} closed', { name: year.name })
      );
    } catch (failure) {
      toast.showError(messageOf(failure));
    }
  };

  const handleReopen = async (year: FinancialYearRow) => {
    try {
      await reopenYear(String(year.id));
      toast.showSuccess(
        t('finance:financialYears.reopened', '{{name}} reopened', { name: year.name })
      );
    } catch (failure) {
      toast.showError(messageOf(failure));
    }
  };

  const columns: DataGridColumn<FinancialYearRow>[] = [
    {
      key: 'name',
      header: t('finance:financialYears.name', 'Name'),
      sortable: true,
      filterable: true,
      render: (_value, item) => (
        <span className="inline-flex items-center gap-2">
          <span>{item.name}</span>
          {currentFinancialYear?.id === item.id && (
            <Badge variant="primary" size="sm">
              {t('finance:financialYears.current', 'Current')}
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: 'start_date',
      header: t('finance:financialYears.startDate', 'Start date'),
      sortable: true,
      render: (_value, item) => formatDate(item.start_date),
    },
    {
      key: 'end_date',
      header: t('finance:financialYears.endDate', 'End date'),
      sortable: true,
      render: (_value, item) => formatDate(item.end_date),
    },
    {
      key: 'status',
      header: t('finance:financialYears.statusHeader', 'Status'),
      sortable: true,
      render: (_value, item) => {
        const [key, fallback] = STATUS_LABEL_KEYS[item.status];
        return (
          <Badge variant={STATUS_VARIANTS[item.status]} size="sm">
            {t(key, fallback)}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: t('common:actions', 'Actions'),
      sortable: false,
      filterable: false,
      sticky: 'right',
      render: (_value, item) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(item)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            {t('common:edit', 'Edit')}
          </Button>
          {item.status === 'closed' ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleReopen(item)}
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            >
              {t('finance:financialYears.reopen', 'Reopen')}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled={!canClose(String(item.id))}
              title={
                canClose(String(item.id))
                  ? undefined
                  : t(
                      'finance:financialYears.lastOpenHint',
                      'Create or reopen another financial year before closing this one.'
                    )
              }
              onClick={() => void handleClose(item)}
              leftIcon={<LockClosedIcon className="w-4 h-4" />}
            >
              {t('finance:financialYears.close', 'Close')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const suggestion = useMemo(() => suggestNextFinancialYear(financialYears), [financialYears]);

  const createInitial = useMemo<Partial<CreateInput<'financial_year'>>>(
    () => ({
      institution_id: institutionId === null ? undefined : asId<'institution'>(institutionId),
      name: suggestion.name,
      start_date: suggestion.start_date,
      end_date: suggestion.end_date,
      status: 'planned',
    }),
    [institutionId, suggestion]
  );

  if (error !== null) {
    return (
      <Card title={t('finance:financialYears.title', 'Financial Years')}>
        <div
          role="alert"
          className="flex items-start gap-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" />
          <div>
            <p>{t('finance:financialYears.loadFailed', 'The financial years could not be read.')}</p>
            <p className="mt-1 text-xs opacity-80">
              {error instanceof Error ? error.message : String(error)}
            </p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={refresh}>
              {t('common:retry', 'Retry')}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {institutionId === null && !loading ? (
        <p
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
        >
          {t(
            'finance:financialYears.noInstitution',
            'The canonical database holds no institution row, so a financial year cannot be saved yet.'
          )}
        </p>
      ) : null}

      <Card
        title={t('finance:financialYears.title', 'Financial Years')}
        info={t(
          'finance:financialYears.description',
          'Financial years group the school’s money. Date ranges may not overlap, and one year is the current year.'
        )}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            disabled={institutionId === null}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            {t('finance:financialYears.add', 'Add Financial Year')}
          </Button>
        }
      >
        <p className="mb-3 text-sm text-surface-muted-fg">
          {t(
            'finance:financialYears.notPeriodClose',
            'Closing a financial year here does not close the ledger’s accounting period. Close accounting periods in'
          )}{' '}
          <Link to={PERIOD_CLOSE_PATH} className="text-primary-600 underline">
            {t('finance:financialYears.periodCloseLink', 'Accounting Reports > Period Close')}
          </Link>
          .
        </p>
        <DataGrid
          columns={columns}
          data={[...financialYears]}
          loading={loading}
          sortable
          filterable
          pagination
          emptyState={{
            title: t('finance:financialYears.emptyTitle', 'No financial years yet'),
            description: t(
              'finance:financialYears.emptyDescription',
              'Add the financial year your terms and fees belong to.'
            ),
          }}
        />
      </Card>

      {(creating || editing) && (
        <Card title={editing ? `Edit ${editing.name}` : 'New financial year'}>
          {editing ? (
            <SchemaEntityForm
              schema={updateSchemaFor('financial_year')}
              fields={FIELDS}
              recordKey={String(editing.id)}
              initialValues={toWritableValues(editing)}
              submitLabel={t('finance:financialYears.save', 'Save financial year')}
              onCancel={closeForm}
              onSubmit={update}
            />
          ) : (
            <SchemaEntityForm
              schema={createSchemaFor('financial_year')}
              fields={FIELDS}
              recordKey="new-financial-year"
              initialValues={createInitial}
              submitLabel={t('finance:financialYears.create', 'Create financial year')}
              onCancel={closeForm}
              onSubmit={create}
            />
          )}
        </Card>
      )}
    </div>
  );
};

const FinancialYearsPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <FinancialYearsContent />
  </CanonicalRepositoryProvider>
);

export default FinancialYearsPage;
