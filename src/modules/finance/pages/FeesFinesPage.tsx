// ABOUTME: Fines page: a fine is a posted one-line charge invoice, never a free-floating adjustment.
// ABOUTME: A posted fine cannot be edited; the page attempts the write so the repository's refusal is
// ABOUTME: visible, and offers a credit note as the correction.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { ExclamationTriangleIcon, PlusIcon, ReceiptRefundIcon } from '@/components/ui/icons';
import { SchemaEntityForm } from '@/components/ui/forms';
import {
  createSchemaFor,
  toWritableValues,
  updateSchemaFor,
  type RepositoryRow,
  type UpdateInput,
} from '@/data/repository';
import { useToast } from '@/hooks/useToast';
import { asId } from '@/domain/ids';
import type { Money } from '@/domain/schema/common';

import {
  formatMoney,
  money,
  toFormLookup,
  useCanonicalFinance,
  useFinanceRepository,
  type FinanceInvoiceLineRow,
} from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { CreditNoteDialog } from '../components/CreditNoteDialog';
import { createChargeInvoice } from '../services/canonicalFinanceService';

const CURRENCY = 'KES';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

interface FineRow {
  readonly line: FinanceInvoiceLineRow;
  readonly invoice: RepositoryRow<'invoice'> | null;
}

interface FineDraft {
  readonly invoice: RepositoryRow<'invoice'> | null;
}

export const FeesFinesPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const repository = useFinanceRepository();
  const { showSuccess } = useToast();

  const [draft, setDraft] = useState<FineDraft | null>(null);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [creditNote, setCreditNote] = useState<FineRow | null>(null);

  const invoiceById = useMemo(() => {
    const map = new Map<string, RepositoryRow<'invoice'>>();
    for (const invoice of finance.invoices) map.set(invoice.id, invoice);
    return map;
  }, [finance.invoices]);

  const fines = useMemo<readonly FineRow[]>(
    () =>
      finance.invoiceLineRows
        .filter((line) => line.kind === 'fine')
        .map((line) => ({ line, invoice: invoiceById.get(line.invoiceId) ?? null })),
    [finance.invoiceLineRows, invoiceById]
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
        path: 'total',
        label: 'Amount',
        order: 2,
        widget: 'money' as const,
        required: true,
        currency: CURRENCY,
      },
      { path: 'issue_date', label: 'Issue date', order: 3, widget: 'date' as const, required: true },
      { path: 'due_date', label: 'Due date', order: 4, widget: 'date' as const },
    ],
    []
  );

  const open = (invoice: RepositoryRow<'invoice'> | null) => {
    setFormError(null);
    setDescription(invoice ? '' : 'Fine');
    setDraft({ invoice });
  };

  const save = async (values: Record<string, unknown>) => {
    if (!draft) return;
    setFormError(null);
    try {
      if (draft.invoice) {
        await repository.update(
          'invoice',
          asId<'invoice'>(draft.invoice.id),
          values as unknown as UpdateInput<'invoice'>,
          { expectedVersion: draft.invoice.rowVersion }
        );
        showSuccess('Fine updated.');
      } else {
        const learnerId = values.learner_id;
        const total = values.total;
        if (typeof learnerId !== 'string' || !learnerId) {
          throw new Error('Select the learner the fine belongs to.');
        }
        if (
          total === null ||
          typeof total !== 'object' ||
          typeof (total as Money).amount_minor !== 'number'
        ) {
          throw new Error('Enter the fine amount.');
        }
        if (!description.trim()) throw new Error('Describe the fine.');
        const result = await createChargeInvoice(repository, {
          learnerId,
          description: description.trim(),
          amount: total as Money,
          kind: 'fine',
          issueDate: String(values.issue_date ?? new Date().toISOString().slice(0, 10)),
          ...(typeof values.due_date === 'string' && values.due_date
            ? { dueDate: values.due_date }
            : {}),
        });
        showSuccess(`Fine posted as invoice ${result.invoice.number}.`);
      }
      setDraft(null);
    } catch (error) {
      setFormError(errorMessage(error));
      throw error;
    }
  };

  const columns: DataGridColumn<FineRow>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      sortable: true,
      filterable: true,
      render: (_value, row) => <span className="font-mono">{row.line.invoiceNumber}</span>,
    },
    {
      key: 'learnerName',
      header: 'Learner',
      sortable: true,
      filterable: true,
      render: (_value, row) => row.line.learnerName || '-',
    },
    {
      key: 'description',
      header: 'Reason',
      filterable: true,
      render: (_value, row) => row.line.description,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (_value, row) => <span className="font-mono">{formatMoney(row.line.amount)}</span>,
    },
    {
      key: 'issueDate',
      header: 'Issued',
      sortable: true,
      render: (_value, row) => row.invoice?.issue_date ?? '-',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (_value, row) => row.invoice?.status ?? '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, row) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="ghost" onClick={() => open(row.invoice)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCreditNote(row)}
            leftIcon={<ReceiptRefundIcon className="w-4 h-4" />}
          >
            Credit note
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card
        title="Fines and penalties"
        actions={
          <Button
            onClick={() => open(null)}
            leftIcon={<PlusIcon className="w-5 h-5" />}
            disabled={finance.learners.length === 0}
          >
            Add fine
          </Button>
        }
      >
        <p className="mb-4 text-sm text-surface-muted-fg">
          A fine is a one-line posted charge against a learner. Once posted it is frozen: the page
          still offers Edit so the repository can refuse the write, and a credit note is the way to
          correct it.
        </p>
        <DataGrid
          columns={columns}
          data={[...fines]}
          sortable
          filterable
          emptyState={{
            icon: <ExclamationTriangleIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: 'No fines recorded',
            description: 'Post a fine against a learner to start.',
          }}
        />
      </Card>

      <Modal
        isOpen={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.invoice ? 'Edit fine' : 'New fine'}
        size="lg"
      >
        {draft ? (
          <SchemaEntityForm
            schema={draft.invoice ? updateSchemaFor('invoice') : createSchemaFor('invoice')}
            recordKey={draft.invoice?.id ?? 'new'}
            initialValues={
              draft.invoice
                ? toWritableValues(draft.invoice)
                : {
                    institution_id: finance.learners[0]?.institution_id ?? '',
                    number: `INV-${Date.now()}`,
                    learner_id: '',
                    issue_date: new Date().toISOString().slice(0, 10),
                    total: money(0, CURRENCY),
                    status: 'posted' as const,
                  }
            }
            fields={fields}
            lookups={{ learner: toFormLookup(finance.lookups.learner) }}
            serverError={formError}
            submitLabel={draft.invoice ? 'Save fine' : 'Post fine'}
            onCancel={() => setDraft(null)}
            onSubmit={save}
          >
            {!draft.invoice ? (
              <div className="mt-4">
                <Input
                  label="Reason"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  required
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-amber-700">
                This fine is posted. The repository refuses a change to its amount, learner or
                dates; raise a credit note to correct it.
              </p>
            )}
          </SchemaEntityForm>
        ) : null}
      </Modal>

      <CreditNoteDialog
        isOpen={creditNote !== null}
        onClose={() => setCreditNote(null)}
        learnerId={creditNote?.line.learnerId ?? undefined}
        invoiceId={creditNote?.line.invoiceId}
        amount={creditNote?.line.amount}
      />
    </div>
  );
};

const FeesFinesPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-6">
      <FeesFinesPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default FeesFinesPage;
