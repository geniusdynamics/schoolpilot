// ABOUTME: Fee adjustments page: a scholarship, discount or exemption is a canonical credit note.
// ABOUTME: A draft note can be edited and posted; from posting on the repository freezes it, and the
// ABOUTME: page shows that refusal instead of pretending the edit succeeded.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { CheckCircleIcon, DeleteIcon, EditIcon, PlusIcon, ReceiptRefundIcon } from '@/components/ui/icons';
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
} from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { nextDocumentNumber, postCreditNote } from '../services/canonicalFinanceService';

const CURRENCY = 'KES';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

interface NoteDraft {
  readonly row: RepositoryRow<'credit_note'> | null;
}

export const FeeAdjustmentsPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const repository = useFinanceRepository();
  const confirm = useConfirm();
  const { showSuccess, showError } = useToast();

  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const previewNumber = useMemo(
    () => nextDocumentNumber('CNT', finance.creditNotes.map((note) => note.number)),
    [finance.creditNotes]
  );

  const fields = useMemo(
    () => [
      {
        path: 'learner_id',
        label: 'Learner',
        order: 1,
        widget: 'entity' as const,
        lookupKey: 'learner',
        required: true,
      },
      {
        path: 'invoice_id',
        label: 'Invoice (optional)',
        order: 2,
        widget: 'entity' as const,
        lookupKey: 'invoice',
      },
      {
        path: 'amount',
        label: 'Amount',
        order: 3,
        widget: 'money' as const,
        required: true,
        currency: CURRENCY,
      },
      { path: 'reason', label: 'Reason', order: 4, widget: 'textarea' as const, required: true },
      { path: 'issue_date', label: 'Issue date', order: 5, widget: 'date' as const, required: true },
      {
        path: 'status',
        label: 'Status',
        order: 6,
        widget: 'select' as const,
        options: ['draft', 'posted', 'void'].map((status) => ({ value: status, label: status })),
        required: true,
      },
    ],
    []
  );

  const open = (row: RepositoryRow<'credit_note'> | null) => {
    setFormError(null);
    setDraft({ row });
  };

  const save = async (values: Record<string, unknown>) => {
    if (!draft) return;
    setFormError(null);
    try {
      if (draft.row) {
        await repository.update(
          'credit_note',
          asId<'credit_note'>(draft.row.id),
          values as unknown as UpdateInput<'credit_note'>,
          { expectedVersion: draft.row.rowVersion }
        );
        showSuccess('Credit note updated.');
      } else {
        const learnerId = values.learner_id;
        const learner = finance.learners.find((row) => row.id === learnerId);
        if (!learner) throw new Error('Select the learner the credit note belongs to.');
        const input: CreateInput<'credit_note'> = {
          ...(values as unknown as CreateInput<'credit_note'>),
          institution_id: learner.institution_id,
          number: previewNumber,
          learner_id: learner.id,
        };
        await repository.create('credit_note', input);
        showSuccess(`Credit note ${previewNumber} created.`);
      }
      setDraft(null);
    } catch (error) {
      setFormError(errorMessage(error));
      throw error;
    }
  };

  const post = async (row: RepositoryRow<'credit_note'>) => {
    try {
      await postCreditNote(repository, row);
      showSuccess('Credit note posted.');
    } catch (error) {
      showError(`The credit note could not be posted: ${errorMessage(error)}`);
    }
  };

  const voidNote = async (row: RepositoryRow<'credit_note'>) => {
    if (!(await confirm({ variant: 'danger', message: 'Void this credit note?' }))) return;
    try {
      await repository.update(
        'credit_note',
        asId<'credit_note'>(row.id),
        { status: 'void' },
        { expectedVersion: row.rowVersion }
      );
      showSuccess('Credit note voided.');
    } catch (error) {
      showError(`The credit note could not be voided: ${errorMessage(error)}`);
    }
  };

  const remove = async (row: RepositoryRow<'credit_note'>) => {
    if (!(await confirm({ variant: 'danger', message: 'Delete this draft credit note?' }))) return;
    try {
      await repository.remove('credit_note', asId<'credit_note'>(row.id));
      showSuccess('Credit note deleted.');
    } catch (error) {
      showError(`The credit note could not be deleted: ${errorMessage(error)}`);
    }
  };

  const columns: DataGridColumn<RepositoryRow<'credit_note'>>[] = [
    {
      key: 'number',
      header: 'Number',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'learner_id',
      header: 'Learner',
      sortable: true,
      filterable: true,
      render: (value) => finance.learnerName(String(value ?? '')) || '-',
    },
    {
      key: 'invoice_id',
      header: 'Invoice',
      render: (value) => finance.invoiceNumber(String(value ?? '')) || '-',
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{formatMoney(value as Money)}</span>,
    },
    { key: 'reason', header: 'Reason', filterable: true },
    { key: 'issue_date', header: 'Issued', sortable: true },
    { key: 'status', header: 'Status', sortable: true, filterable: true },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, row) => (
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => open(row)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          {row.status === 'draft' ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void post(row)}
                leftIcon={<CheckCircleIcon className="w-4 h-4" />}
              >
                Post
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => void remove(row)}
                leftIcon={<DeleteIcon className="w-4 h-4" />}
              >
                Delete
              </Button>
            </>
          ) : null}
          {row.status === 'posted' ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => void voidNote(row)}
              leftIcon={<ReceiptRefundIcon className="w-4 h-4" />}
            >
              Void
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  if (finance.status === 'loading' && finance.creditNotes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16" role="status">
        Loading fee adjustments...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        title="Fee adjustments"
        actions={
          <Button
            onClick={() => open(null)}
            leftIcon={<PlusIcon className="w-5 h-5" />}
            disabled={finance.learners.length === 0}
          >
            Add adjustment
          </Button>
        }
      >
        <p className="mb-4 text-sm text-surface-muted-fg">
          A scholarship, discount or exemption is a credit note against the learner's fees. Meeting
          a posted invoice with a correction is this note, never an edit: the repository freezes a
          posted note and a posted invoice alike.
        </p>
        <DataGrid
          columns={columns}
          data={[...finance.creditNotes]}
          sortable
          filterable
          emptyState={{
            icon: <ReceiptRefundIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: 'No fee adjustments',
            description: 'Raise a credit note for a scholarship, discount or exemption.',
          }}
        />
      </Card>

      <Modal
        isOpen={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.row ? 'Edit credit note' : 'New credit note'}
        size="lg"
      >
        {draft ? (
          <SchemaEntityForm
            schema={draft.row ? updateSchemaFor('credit_note') : createSchemaFor('credit_note')}
            recordKey={draft.row?.id ?? 'new'}
            initialValues={
              draft.row
                ? toWritableValues(draft.row)
                : {
                    institution_id: finance.learners[0]?.institution_id ?? '',
                    number: previewNumber,
                    learner_id: '',
                    amount: money(0, CURRENCY),
                    reason: '',
                    issue_date: new Date().toISOString().slice(0, 10),
                    status: 'draft' as const,
                  }
            }
            fields={fields}
            lookups={{
              learner: toFormLookup(finance.lookups.learner),
              invoice: toFormLookup(finance.lookups.invoice),
            }}
            serverError={formError}
            submitLabel={draft.row ? 'Save credit note' : 'Create credit note'}
            onCancel={() => setDraft(null)}
            onSubmit={save}
          >
            {draft.row?.status !== undefined && draft.row.status !== 'draft' ? (
              <p className="mt-4 text-sm text-amber-700">
                This note is {draft.row.status}. The repository refuses any change to its number,
                date, amount, learner, invoice or reason; only a move to another posted state is
                possible.
              </p>
            ) : null}
          </SchemaEntityForm>
        ) : null}
      </Modal>
    </div>
  );
};

const FeeAdjustmentsPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-6">
      <FeeAdjustmentsPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default FeeAdjustmentsPage;
