// ABOUTME: Fee schedules page: the canonical billing structure of an academic year, its fee lines
// ABOUTME: and the fee items those lines charge. Amounts are exact minor units and every write goes
// ABOUTME: through the canonical repository; the lines a posted invoice carries are never edited here.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DeleteIcon, EditIcon, ListBulletIcon, PlusIcon, TicketIcon } from '@/components/ui/icons';
import { SchemaEntityForm } from '@/components/ui/forms';
import {
  createSchemaFor,
  toWritableValues,
  updateSchemaFor,
  type CreateInput,
  type RepositoryRow,
  type UpdateInput,
} from '@/data/repository';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { asId } from '@/domain/ids';
import type { Money } from '@/domain/schema/common';

import {
  formatMoney,
  money,
  toFormLookup,
  useCanonicalFinance,
  useFinanceRepository,
  type FinanceScheduleRow,
} from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import type { Id } from '@/domain/ids';

const SCHEDULE_STATUSES = ['draft', 'submitted', 'approved', 'published', 'archived'] as const;
const FREQUENCIES = ['per_term', 'per_year', 'monthly', 'one_off_at_admission'] as const;
const PRORATION_RULES = ['full', 'none', 'pro_rata_weeks', 'pro_rata_days', 'from_half_term'] as const;
const CURRENCY = 'KES';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

interface ScheduleDraft {
  readonly id: string | null;
  readonly row: RepositoryRow<'fee_schedule'> | null;
}

interface LineDraft {
  readonly id: string | null;
  readonly row: RepositoryRow<'fee_schedule_line'> | null;
}

export const FeeTemplatesContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const repository = useFinanceRepository();
  const confirm = useConfirm();
  const { showSuccess, showError } = useToast();

  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [periodIds, setPeriodIds] = useState<string[]>([]);
  const [periodDraft, setPeriodDraft] = useState<Id<'academic_period'> | null>(null);
  const [levelIds, setLevelIds] = useState<string[]>([]);
  const [levelDraft, setLevelDraft] = useState<Id<'level'> | null>(null);

  const [lineScheduleId, setLineScheduleId] = useState<string | null>(null);
  const [lineDraft, setLineDraft] = useState<LineDraft | null>(null);
  const [lineError, setLineError] = useState<string | null>(null);

  // The open lines dialog follows the repository: a line added, edited or removed shows in it
  // straight away instead of waiting for the dialog to be re-opened.
  const lineSchedule = useMemo(
    () => finance.scheduleRows.find((row) => row.id === lineScheduleId) ?? null,
    [finance.scheduleRows, lineScheduleId]
  );

  const defaultInstitutionId = finance.years[0]?.institution_id ?? '';

  const scheduleFields = useMemo(
    () => [
      { path: 'name', label: 'Schedule name', order: 1, required: true },
      {
        path: 'academic_year_id',
        label: 'Academic year',
        order: 2,
        widget: 'entity' as const,
        lookupKey: 'year',
        required: true,
      },
      { path: 'version', label: 'Version', order: 3, widget: 'number' as const, required: true },
      {
        path: 'status',
        label: 'Status',
        order: 4,
        widget: 'select' as const,
        options: SCHEDULE_STATUSES.map((status) => ({ value: status, label: status })),
        required: true,
      },
      {
        path: 'new_learners_only',
        label: 'New learners only',
        order: 5,
        widget: 'checkbox' as const,
      },
    ],
    []
  );

  const lineFields = useMemo(
    () => [
      {
        path: 'fee_item_id',
        label: 'Fee item',
        order: 1,
        widget: 'entity' as const,
        lookupKey: 'feeItem',
        required: true,
      },
      { path: 'amount', label: 'Amount', order: 2, widget: 'money' as const, required: true },
      { path: 'mandatory', label: 'Mandatory', order: 3, widget: 'checkbox' as const },
      {
        path: 'frequency',
        label: 'Frequency',
        order: 4,
        widget: 'select' as const,
        options: FREQUENCIES.map((value) => ({ value, label: value })),
        required: true,
      },
      {
        path: 'proration_rule',
        label: 'Proration',
        order: 5,
        widget: 'select' as const,
        options: PRORATION_RULES.map((value) => ({ value, label: value })),
        required: true,
      },
    ],
    []
  );

  const openSchedule = (row: FinanceScheduleRow | null) => {
    setScheduleError(null);
    setScheduleDraft({ id: row?.id ?? null, row: row?.row ?? null });
    setPeriodIds(row ? [...row.periodIds] : []);
    setLevelIds(row ? [...row.levelIds] : []);
    setPeriodDraft(null);
    setLevelDraft(null);
  };

  const saveSchedule = async (values: Record<string, unknown>) => {
    if (!scheduleDraft) return;
    setScheduleError(null);
    const base = values as unknown as UpdateInput<'fee_schedule'>;
    const payload: UpdateInput<'fee_schedule'> = {
      ...base,
      academic_period_ids: periodIds,
      level_ids: levelIds,
      programme_ids: scheduleDraft.row?.programme_ids ?? [],
      residence_statuses: scheduleDraft.row?.residence_statuses ?? [],
      fee_category_ids: scheduleDraft.row?.fee_category_ids ?? [],
    };
    try {
      if (scheduleDraft.id && scheduleDraft.row) {
        await repository.update('fee_schedule', asId<'fee_schedule'>(scheduleDraft.id), payload, {
          expectedVersion: scheduleDraft.row.rowVersion,
        });
        showSuccess('Fee schedule updated.');
      } else {
        const input: CreateInput<'fee_schedule'> = {
          ...(base as CreateInput<'fee_schedule'>),
          institution_id: defaultInstitutionId,
          academic_period_ids: periodIds,
          level_ids: levelIds,
          programme_ids: scheduleDraft.row?.programme_ids ?? [],
          residence_statuses: scheduleDraft.row?.residence_statuses ?? [],
          fee_category_ids: scheduleDraft.row?.fee_category_ids ?? [],
        };
        await repository.create('fee_schedule', input);
        showSuccess('Fee schedule created.');
      }
      setScheduleDraft(null);
    } catch (error) {
      setScheduleError(errorMessage(error));
      throw error;
    }
  };

  const deleteSchedule = async (row: FinanceScheduleRow) => {
    if (
      !(await confirm({
        variant: 'danger',
        message: 'Delete this fee schedule and its fee lines? Posted invoices keep their own lines.',
      }))
    ) {
      return;
    }
    try {
      await repository.remove('fee_schedule', asId<'fee_schedule'>(row.id));
      showSuccess('Fee schedule deleted.');
    } catch (error) {
      showError(`Failed to delete the fee schedule: ${errorMessage(error)}`);
    }
  };

  const saveLine = async (values: Record<string, unknown>) => {
    if (!lineSchedule) return;
    setLineError(null);
    try {
      if (lineDraft?.id && lineDraft.row) {
        await repository.update(
          'fee_schedule_line',
          asId<'fee_schedule_line'>(lineDraft.id),
          values as unknown as UpdateInput<'fee_schedule_line'>,
          { expectedVersion: lineDraft.row.rowVersion }
        );
        showSuccess('Fee line updated.');
      } else {
        const input: CreateInput<'fee_schedule_line'> = {
          ...(values as unknown as CreateInput<'fee_schedule_line'>),
          institution_id: lineSchedule.row.institution_id,
          fee_schedule_id: lineSchedule.id,
        };
        await repository.create('fee_schedule_line', input);
        showSuccess('Fee line added.');
      }
      setLineDraft(null);
    } catch (error) {
      setLineError(errorMessage(error));
      throw error;
    }
  };

  const deleteLine = async (row: RepositoryRow<'fee_schedule_line'>) => {
    if (!(await confirm({ variant: 'danger', message: 'Delete this fee line?' }))) return;
    try {
      await repository.remove('fee_schedule_line', row.id);
      showSuccess('Fee line deleted.');
    } catch (error) {
      showError(`Failed to delete the fee line: ${errorMessage(error)}`);
    }
  };

  const scheduleColumns: DataGridColumn<FinanceScheduleRow>[] = [
    {
      key: 'name',
      header: 'Schedule',
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <span className="font-medium">
          {value} <span className="text-surface-muted-fg">v{row.version}</span>
        </span>
      ),
    },
    {
      key: 'academicYearName',
      header: 'Academic year',
      sortable: true,
      filterable: true,
    },
    {
      key: 'periodNames',
      header: 'Periods',
      render: (value) =>
        Array.isArray(value) && value.length > 0 ? value.join(', ') : 'Whole year',
    },
    {
      key: 'levelNames',
      header: 'Levels',
      render: (value) =>
        Array.isArray(value) && value.length > 0 ? value.join(', ') : 'Every level',
    },
    {
      key: 'lines',
      header: 'Lines',
      render: (value) => (Array.isArray(value) ? value.length : 0),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (value) => <span className="font-mono">{formatMoney(value as Money)}</span>,
    },
    { key: 'status', header: 'Status', sortable: true, filterable: true },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, row) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openSchedule(row)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setLineError(null);
              setLineDraft(null);
              setLineScheduleId(row.id);
            }}
            leftIcon={<ListBulletIcon className="w-4 h-4" />}
          >
            Lines
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => void deleteSchedule(row)}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const lineColumns: DataGridColumn<RepositoryRow<'fee_schedule_line'>>[] = [
    {
      key: 'fee_item_id',
      header: 'Fee item',
      sortable: true,
      filterable: true,
      render: (value) => finance.feeItemName(String(value ?? '')),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (value) => <span className="font-mono">{formatMoney(value as Money)}</span>,
    },
    { key: 'mandatory', header: 'Mandatory', render: (value) => (value ? 'Yes' : 'No') },
    { key: 'frequency', header: 'Frequency', sortable: true, filterable: true },
    { key: 'proration_rule', header: 'Proration', sortable: true, filterable: true },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, row) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setLineError(null);
              setLineDraft({ id: row.id, row });
            }}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => void deleteLine(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (finance.status === 'loading' && finance.feeSchedules.length === 0) {
    return (
      <div className="flex items-center justify-center py-16" role="status">
        Loading fee schedules...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        title="Fee Schedules"
        info="A fee schedule fixes the fee items and exact amounts an academic year bills. An invoice copies the schedule's lines when the billing run posts it; editing a schedule later never changes an invoice that is already posted."
        actions={
          <Button
            onClick={() => openSchedule(null)}
            leftIcon={<PlusIcon className="w-5 h-5" />}
            disabled={!defaultInstitutionId}
          >
            Add Fee Schedule
          </Button>
        }
      >
        <DataGrid
          columns={scheduleColumns}
          data={[...finance.scheduleRows]}
          sortable
          filterable
          emptyState={{
            icon: <TicketIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: 'No fee schedules yet',
            description: 'Create a fee schedule to define what a term bills.',
          }}
        />
      </Card>

      <Modal
        isOpen={scheduleDraft !== null}
        onClose={() => setScheduleDraft(null)}
        title={scheduleDraft?.id ? 'Edit fee schedule' : 'New fee schedule'}
        size="lg"
      >
        {scheduleDraft ? (
          <SchemaEntityForm
            schema={
              scheduleDraft.id ? updateSchemaFor('fee_schedule') : createSchemaFor('fee_schedule')
            }
            recordKey={scheduleDraft.id ?? 'new'}
            initialValues={
              scheduleDraft.row
                ? toWritableValues(scheduleDraft.row)
                : {
                    institution_id: defaultInstitutionId,
                    name: '',
                    academic_year_id: '',
                    academic_period_ids: [],
                    programme_ids: [],
                    level_ids: [],
                    residence_statuses: [],
                    fee_category_ids: [],
                    new_learners_only: false,
                    version: 1,
                    status: 'draft' as const,
                  }
            }
            fields={scheduleFields}
            lookups={{ year: toFormLookup(finance.lookups.year) }}
            serverError={scheduleError}
            submitLabel={scheduleDraft.id ? 'Save schedule' : 'Create schedule'}
            onCancel={() => setScheduleDraft(null)}
            onSubmit={saveSchedule}
          >
            <fieldset className="mt-4 space-y-2">
              <legend className="text-sm font-medium text-surface-foreground">
                Billing periods
              </legend>
              <p className="text-xs text-surface-muted-fg">
                Leave empty to bill the whole academic year.
              </p>
              <div className="flex items-end gap-2">
                <EntityPicker
                  value={periodDraft}
                  onChange={setPeriodDraft}
                  lookup={finance.lookups.period}
                  aria-label="Add billing period"
                  placeholder="Select a period"
                  data-testid="schedule-period-picker"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (periodDraft && !periodIds.includes(periodDraft)) {
                      setPeriodIds([...periodIds, periodDraft]);
                    }
                    setPeriodDraft(null);
                  }}
                  disabled={!periodDraft}
                >
                  Add
                </Button>
              </div>
              <ul className="flex flex-wrap gap-2">
                {periodIds.map((id) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-full bg-surface-accent px-3 py-1 text-sm"
                  >
                    {finance.periodName(id) || id}
                    <button
                      type="button"
                      aria-label={`Remove ${finance.periodName(id) || id}`}
                      onClick={() => setPeriodIds(periodIds.filter((entry) => entry !== id))}
                    >
                      x
                    </button>
                  </li>
                ))}
              </ul>
            </fieldset>

            <fieldset className="mt-4 space-y-2">
              <legend className="text-sm font-medium text-surface-foreground">Levels</legend>
              <p className="text-xs text-surface-muted-fg">
                Leave empty to bill every level.
              </p>
              <div className="flex items-end gap-2">
                <EntityPicker
                  value={levelDraft}
                  onChange={setLevelDraft}
                  lookup={finance.lookups.level}
                  aria-label="Add level"
                  placeholder="Select a level"
                  data-testid="schedule-level-picker"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (levelDraft && !levelIds.includes(levelDraft)) {
                      setLevelIds([...levelIds, levelDraft]);
                    }
                    setLevelDraft(null);
                  }}
                  disabled={!levelDraft}
                >
                  Add
                </Button>
              </div>
              <ul className="flex flex-wrap gap-2">
                {levelIds.map((id) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-full bg-surface-accent px-3 py-1 text-sm"
                  >
                    {finance.levelName(id) || id}
                    <button
                      type="button"
                      aria-label={`Remove ${finance.levelName(id) || id}`}
                      onClick={() => setLevelIds(levelIds.filter((entry) => entry !== id))}
                    >
                      x
                    </button>
                  </li>
                ))}
              </ul>
            </fieldset>
          </SchemaEntityForm>
        ) : null}
      </Modal>

      <Modal
        isOpen={lineSchedule !== null}
        onClose={() => {
          setLineScheduleId(null);
          setLineDraft(null);
        }}
        title={`Fee lines${lineSchedule ? ` · ${lineSchedule.name}` : ''}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setLineError(null);
                setLineDraft({ id: null, row: null });
              }}
              leftIcon={<PlusIcon className="w-4 h-4" />}
            >
              Add fee line
            </Button>
          </div>
          <DataGrid
            columns={lineColumns}
            data={[...(lineSchedule?.lines ?? [])]}
            sortable
            filterable
            emptyState={{
              icon: <ListBulletIcon className="w-8 h-8 text-surface-muted-fg" />,
              title: 'No fee lines',
              description: 'A schedule with no lines bills nothing.',
            }}
          />
        </div>
      </Modal>

      <Modal
        isOpen={lineDraft !== null}
        onClose={() => setLineDraft(null)}
        title={lineDraft?.id ? 'Edit fee line' : 'New fee line'}
        size="lg"
      >
        {lineSchedule && lineDraft ? (
          <SchemaEntityForm
            schema={
              lineDraft.id ? updateSchemaFor('fee_schedule_line') : createSchemaFor('fee_schedule_line')
            }
            recordKey={lineDraft.id ?? `new-${lineSchedule.id}`}
            initialValues={
              lineDraft.row
                ? toWritableValues(lineDraft.row)
                : {
                    institution_id: lineSchedule.row.institution_id,
                    fee_schedule_id: lineSchedule.id,
                    fee_item_id: '',
                    amount: money(0, CURRENCY),
                    mandatory: true,
                    frequency: 'per_term' as const,
                    proration_rule: 'full' as const,
                  }
            }
            fields={lineFields}
            lookups={{ feeItem: toFormLookup(finance.lookups.feeItem) }}
            serverError={lineError}
            submitLabel={lineDraft.id ? 'Save line' : 'Add line'}
            onCancel={() => setLineDraft(null)}
            onSubmit={saveLine}
          />
        ) : null}
      </Modal>
    </div>
  );
};

const FeeTemplatesPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <FeeTemplatesContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default FeeTemplatesPage;
