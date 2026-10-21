// ABOUTME: Fee installments page: the canonical installment plans a fee schedule may reference.
// ABOUTME: A plan is its name, its academic period and the dated percentage installments it defines.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { CalendarIcon, DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { DateField, SchemaEntityForm } from '@/components/ui/forms';
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

import { useCanonicalFinance, useFinanceRepository, toFormLookup } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

interface InstallmentDraftRow {
  readonly sequence: number;
  readonly due_date: string;
  readonly percent: number;
}

interface PlanDraft {
  readonly row: RepositoryRow<'installment_plan'> | null;
}

export const FeesInstallmentsPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const repository = useFinanceRepository();
  const confirm = useConfirm();
  const { showSuccess, showError } = useToast();

  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [installments, setInstallments] = useState<InstallmentDraftRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const defaultInstitutionId = finance.periods[0]?.institution_id ?? '';

  const fields = useMemo(
    () => [
      { path: 'name', label: 'Plan name', order: 1, required: true },
      {
        path: 'academic_period_id',
        label: 'Academic period',
        order: 2,
        widget: 'entity' as const,
        lookupKey: 'period',
      },
    ],
    []
  );

  const open = (row: RepositoryRow<'installment_plan'> | null) => {
    setFormError(null);
    setDraft({ row });
    setInstallments(
      row
        ? [...row.installments].sort((left, right) => left.sequence - right.sequence)
        : [{ sequence: 1, due_date: '', percent: 100 }]
    );
  };

  const addInstallment = () => {
    setInstallments((current) => [
      ...current,
      { sequence: current.length + 1, due_date: '', percent: 0 },
    ]);
  };

  const updateInstallment = (index: number, patch: Partial<InstallmentDraftRow>) => {
    setInstallments((current) =>
      current.map((row, position) => (position === index ? { ...row, ...patch } : row))
    );
  };

  const removeInstallment = (index: number) => {
    setInstallments((current) =>
      current
        .filter((_row, position) => position !== index)
        .map((row, position) => ({ ...row, sequence: position + 1 }))
    );
  };

  const save = async (values: Record<string, unknown>) => {
    if (!draft) return;
    setFormError(null);
    const rows = installments
      .filter((row) => row.due_date !== '')
      .map((row, position) => ({ ...row, sequence: position + 1 }));
    if (rows.length === 0) {
      const message = 'Add at least one installment with a due date.';
      setFormError(message);
      throw new Error(message);
    }
    try {
      if (draft.row) {
        await repository.update(
          'installment_plan',
          asId<'installment_plan'>(draft.row.id),
          {
            ...(values as unknown as UpdateInput<'installment_plan'>),
            installments: rows,
          },
          { expectedVersion: draft.row.rowVersion }
        );
        showSuccess('Installment plan updated.');
      } else {
        const input: CreateInput<'installment_plan'> = {
          ...(values as unknown as CreateInput<'installment_plan'>),
          institution_id: defaultInstitutionId,
          installments: rows,
        };
        await repository.create('installment_plan', input);
        showSuccess('Installment plan created.');
      }
      setDraft(null);
    } catch (error) {
      setFormError(errorMessage(error));
      throw error;
    }
  };

  const remove = async (row: RepositoryRow<'installment_plan'>) => {
    if (!(await confirm({ variant: 'danger', message: 'Delete this installment plan?' }))) return;
    try {
      await repository.remove('installment_plan', asId<'installment_plan'>(row.id));
      showSuccess('Installment plan deleted.');
    } catch (error) {
      showError(`Failed to delete the plan: ${errorMessage(error)}`);
    }
  };

  const columns: DataGridColumn<RepositoryRow<'installment_plan'>>[] = [
    {
      key: 'name',
      header: 'Plan',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'academic_period_id',
      header: 'Period',
      sortable: true,
      filterable: true,
      render: (value) => finance.periodName(String(value ?? '')) || '-',
    },
    {
      key: 'installmentCount',
      header: 'Installments',
      render: (value) => (Array.isArray(value) ? value.length : 0),
    },
    {
      key: 'firstDue',
      header: 'First due',
      render: (_value, row) => {
        const first = [...row.installments].sort((left, right) => left.sequence - right.sequence)[0];
        return first ? first.due_date : '-';
      },
    },
    {
      key: 'percentTotal',
      header: 'Percent',
      align: 'right',
      render: (_value, row) =>
        row.installments.reduce((total, installment) => total + installment.percent, 0),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, row) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => open(row)} leftIcon={<EditIcon className="w-4 h-4" />}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => void remove(row)}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (finance.status === 'loading' && finance.installmentPlans.length === 0) {
    return (
      <div className="flex items-center justify-center py-16" role="status">
        Loading installment plans...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        title="Fee installments"
        actions={
          <Button
            onClick={() => open(null)}
            leftIcon={<PlusIcon className="w-5 h-5" />}
            disabled={!defaultInstitutionId}
          >
            Add installment plan
          </Button>
        }
      >
        <p className="mb-4 text-sm text-surface-muted-fg">
          An installment plan splits a fee into dated percentages. A fee schedule line can name a
          plan; the plan itself carries no money, so it never drifts from the amount billed.
        </p>
        <DataGrid
          columns={columns}
          data={[...finance.installmentPlans]}
          sortable
          filterable
          emptyState={{
            icon: <CalendarIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: 'No installment plans',
            description: 'Create a plan to split a fee into dated installments.',
          }}
        />
      </Card>

      <Modal
        isOpen={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.row ? 'Edit installment plan' : 'New installment plan'}
        size="lg"
      >
        {draft ? (
          <SchemaEntityForm
            schema={draft.row ? updateSchemaFor('installment_plan') : createSchemaFor('installment_plan')}
            recordKey={draft.row?.id ?? 'new'}
            initialValues={
              draft.row
                ? toWritableValues(draft.row)
                : {
                    institution_id: defaultInstitutionId,
                    name: '',
                    installments: [],
                  }
            }
            fields={fields}
            lookups={{ period: toFormLookup(finance.lookups.period) }}
            serverError={formError}
            submitLabel={draft.row ? 'Save plan' : 'Create plan'}
            onCancel={() => setDraft(null)}
            onSubmit={save}
          >
            <fieldset className="mt-4 space-y-2">
              <legend className="text-sm font-medium text-surface-foreground">Installments</legend>
              {installments.map((row, index) => (
                <div key={row.sequence} className="flex items-end gap-2">
                  <span className="w-6 pb-2 text-sm text-surface-muted-fg">{index + 1}</span>
                  <DateField
                    label="Due date"
                    value={row.due_date}
                    onChange={(next) => updateInstallment(index, { due_date: next })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    aria-label={`Percent for installment ${index + 1}`}
                    className="h-10 w-24 rounded-lg border border-surface-input bg-surface-card px-3 text-sm"
                    value={row.percent}
                    min={0}
                    max={100}
                    onChange={(event) =>
                      updateInstallment(index, { percent: Number(event.target.value) })
                    }
                  />
                  <Button size="sm" variant="secondary" onClick={() => removeInstallment(index)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={addInstallment} leftIcon={<PlusIcon className="w-4 h-4" />}>
                Add installment
              </Button>
            </fieldset>
          </SchemaEntityForm>
        ) : null}
      </Modal>
    </div>
  );
};

const FeesInstallmentsPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-6">
      <FeesInstallmentsPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default FeesInstallmentsPage;
