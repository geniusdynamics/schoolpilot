// ABOUTME: Opening balances page: a brought-forward balance is a posted invoice line of kind
// ABOUTME: opening_balance. Posted documents stay frozen; a credit note is the correction.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { BookOpenIcon, EditIcon, PlusIcon, ReceiptRefundIcon } from '@/components/ui/icons';
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

interface BalanceRow {
  readonly line: FinanceInvoiceLineRow;
  readonly invoice: RepositoryRow<'invoice'> | null;
}

export const StudentOpeningBalancesPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const repository = useFinanceRepository();
  const { showSuccess } = useToast();

  const [draft, setDraft] = useState<{ invoice: RepositoryRow<'invoice'> | null } | null>(null);
  const [description, setDescription] = useState('Opening balance');
  const [formError, setFormError] = useState<string | null>(null);
  const [creditNote, setCreditNote] = useState<BalanceRow | null>(null);

  const invoiceById = useMemo(() => {
    const map = new Map<string, RepositoryRow<'invoice'>>();
    for (const invoice of finance.invoices) map.set(invoice.id, invoice);
    return map;
  }, [finance.invoices]);

  const rows = useMemo<readonly BalanceRow[]>(
    () =>
      finance.invoiceLineRows
        .filter((line) => line.kind === 'opening_balance')
        .map((line) => ({ line, invoice: invoiceById.get(line.invoiceId) ?? null })),
    [finance.invoiceLineRows, invoiceById]
  );

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
        showSuccess('Opening balance updated.');
      } else {
        const learnerId = values.learner_id;
        const total = values.total;
        if (typeof learnerId !== 'string' || !learnerId) {
          throw new Error('Select the learner the balance belongs to.');
        }
        if (
          total === null ||
          typeof total !== 'object' ||
          typeof (total as Money).amount_minor !== 'number'
        ) {
          throw new Error('Enter the opening balance amount.');
        }
        const result = await createChargeInvoice(repository, {
          learnerId,
          description: description.trim() || 'Opening balance',
          amount: total as Money,
          kind: 'opening_balance',
          issueDate: String(values.issue_date ?? new Date().toISOString().slice(0, 10)),
          ...(typeof values.due_date === 'string' && values.due_date
            ? { dueDate: values.due_date }
            : {}),
        });
        showSuccess(`Opening balance posted as invoice ${result.invoice.number}.`);
      }
      setDraft(null);
    } catch (error) {
      setFormError(errorMessage(error));
      throw error;
    }
  };

  const columns: DataGridColumn<BalanceRow>[] = [
    {
      key: 'learnerName',
      header: 'Learner',
      sortable: true,
      filterable: true,
      render: (_value, row) => row.line.learnerName || '-',
    },
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      sortable: true,
      filterable: true,
      render: (_value, row) => <span className="font-mono">{row.line.invoiceNumber}</span>,
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
      header: 'As of',
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFormError(null);
              setDraft({ invoice: row.invoice });
            }}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
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
        title="Opening balances"
        info="A brought-forward balance is posted as an invoice whose single line has kind “opening_balance”. Once posted it is frozen; a credit note corrects it."
        actions={
          <Button
            onClick={() => {
              setFormError(null);
              setDescription('Opening balance');
              setDraft({ invoice: null });
            }}
            leftIcon={<PlusIcon className="w-5 h-5" />}
            disabled={finance.learners.length === 0}
          >
            Add opening balance
          </Button>
        }
      >
        <DataGrid
          columns={columns}
          data={[...rows]}
          sortable
          filterable
          emptyState={{
            icon: <BookOpenIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: 'No opening balances',
            description: 'Post the balance a learner brings into this period.',
          }}
        />
      </Card>

      <Modal
        isOpen={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.invoice ? 'Edit opening balance' : 'New opening balance'}
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
            fields={[
              {
                path: 'learner_id',
                label: 'Learner',
                order: 1,
                widget: 'entity',
                lookupKey: 'learner',
                required: true,
              },
              {
                path: 'total',
                label: 'Amount',
                order: 2,
                widget: 'money',
                required: true,
                currency: CURRENCY,
              },
              {
                path: 'issue_date',
                label: 'As of date',
                order: 3,
                widget: 'date',
                required: true,
              },
              { path: 'due_date', label: 'Due date', order: 4, widget: 'date' },
            ]}
            lookups={{ learner: toFormLookup(finance.lookups.learner) }}
            serverError={formError}
            submitLabel={draft.invoice ? 'Save balance' : 'Post balance'}
            onCancel={() => setDraft(null)}
            onSubmit={save}
          >
            {!draft.invoice ? (
              <div className="mt-4">
                <Input
                  label="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-amber-700">
                This balance is posted. The repository refuses a change to its amount, learner or
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

const StudentOpeningBalancesPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <StudentOpeningBalancesPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default StudentOpeningBalancesPage;
