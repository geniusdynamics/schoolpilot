// ABOUTME: Student payments page: records a posted payment with its receipt, allocates it to an
// ABOUTME: invoice when one is chosen, and surfaces the repository's refusal when a posted payment
// ABOUTME: is edited or reversed out of its posted states. Amounts stay exact minor units.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { CreditCardIcon, EditIcon, PlusIcon, ReceiptRefundIcon } from '@/components/ui/icons';
import { SchemaEntityForm } from '@/components/ui/forms';
import {
  createSchemaFor,
  toWritableValues,
  updateSchemaFor,
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
  type FinancePaymentRow,
} from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { recordPayment, refusalMessage, reversePayment } from '../services/canonicalFinanceService';
import { useCashierRuntimePort, type CashierPaymentsPort } from './cashier/runtime';
import type { Id } from '@/domain/ids';

const CHANNELS = ['cash', 'bank_deposit', 'cheque', 'mobile_money', 'card', 'in_kind'] as const;
const CURRENCY = 'KES';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

interface PaymentDraft {
  readonly row: RepositoryRow<'payment'> | null;
}

interface StudentPaymentsPageContentProps {
  /** A payments port supplied by a test or a host; the app opens the cashier runtime. */
  readonly paymentsPort?: CashierPaymentsPort | null;
}

export const StudentPaymentsPageContent: React.FC<StudentPaymentsPageContentProps> = ({
  paymentsPort,
}) => {
  const finance = useCanonicalFinance();
  const repository = useFinanceRepository();
  const runtimePort = useCashierRuntimePort();
  const port = paymentsPort !== undefined ? paymentsPort : runtimePort;
  const confirm = useConfirm();
  const { showSuccess, showError } = useToast();

  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<Id<'invoice'> | null>(null);

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
        path: 'amount',
        label: 'Amount',
        order: 2,
        widget: 'money' as const,
        required: true,
        currency: CURRENCY,
      },
      {
        path: 'channel',
        label: 'Channel',
        order: 3,
        widget: 'select' as const,
        options: CHANNELS.map((channel) => ({ value: channel, label: channel })),
        required: true,
      },
      { path: 'reference', label: 'Reference', order: 4 },
    ],
    []
  );

  const invoiceOptions = useMemo(
    () => finance.invoiceRows.filter((invoice) => invoice.status !== 'void'),
    [finance.invoiceRows]
  );

  const openNew = () => {
    setFormError(null);
    setInvoiceId(null);
    setDraft({ row: null });
  };

  const openEdit = (row: RepositoryRow<'payment'>) => {
    setFormError(null);
    setInvoiceId(null);
    setDraft({ row });
  };

  const savePayment = async (values: Record<string, unknown>) => {
    setFormError(null);
    try {
      if (draft?.row) {
        await repository.update(
          'payment',
          asId<'payment'>(draft.row.id),
          values as unknown as UpdateInput<'payment'>,
          { expectedVersion: draft.row.rowVersion }
        );
        showSuccess('Payment updated.');
      } else {
        const learnerId = values.learner_id;
        const amount = values.amount;
        if (typeof learnerId !== 'string' || !learnerId) {
          throw new Error('Select the learner the payment belongs to.');
        }
        if (
          amount === null ||
          typeof amount !== 'object' ||
          typeof (amount as Money).amount_minor !== 'number'
        ) {
          throw new Error('Enter the amount that was paid.');
        }
        if (!port) {
          throw new Error('The payments service is not ready yet.');
        }
        const receivedAt =
          typeof values.received_at === 'string'
            ? values.received_at
            : new Date().toISOString();
        const institutionId =
          finance.learners.find((learner) => learner.id === learnerId)?.institution_id ??
          (await repository.get('learner', asId<'learner'>(learnerId)))?.institution_id;
        if (!institutionId) {
          throw new Error('The selected learner no longer exists.');
        }
        const receiptNumber = await port.nextReceiptNumber({
          institutionId,
          receivedAt,
        });
        const result = await recordPayment(repository, {
          learnerId,
          amount: amount as Money,
          channel: (values.channel as RepositoryRow<'payment'>['channel']) ?? 'cash',
          receivedAt,
          receiptNumber,
          ...(typeof values.reference === 'string' && values.reference
            ? { reference: values.reference }
            : {}),
          ...(invoiceId ? { invoiceId } : {}),
        });
        showSuccess(`Payment recorded. Receipt ${result.receipt.number}.`);
      }
      setDraft(null);
      setInvoiceId(null);
    } catch (error) {
      setFormError(errorMessage(error));
      throw error;
    }
  };

  const reverse = async (row: RepositoryRow<'payment'>) => {
    if (
      !(await confirm({
        variant: 'danger',
        message:
          'Reverse this payment? A posted payment is never deleted; a reversal keeps the money on the books.',
      }))
    ) {
      return;
    }
    try {
      await reversePayment(repository, row);
      showSuccess('Payment reversed.');
    } catch (error) {
      showError(`The payment could not be reversed: ${refusalMessage(error)}`);
    }
  };

  const columns: DataGridColumn<FinancePaymentRow>[] = [
    {
      key: 'receiptNumber',
      header: 'Receipt',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-mono text-sm">{value || '-'}</span>,
    },
    { key: 'learnerName', header: 'Learner', sortable: true, filterable: true },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{formatMoney(value as Money)}</span>,
    },
    { key: 'channel', header: 'Channel', sortable: true, filterable: true },
    {
      key: 'receivedAt',
      header: 'Received',
      sortable: true,
      render: (value) => String(value ?? '').slice(0, 10),
    },
    { key: 'reference', header: 'Reference', filterable: true },
    { key: 'status', header: 'Status', sortable: true, filterable: true },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, row) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openEdit(row.row)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void reverse(row.row)}
            leftIcon={<ReceiptRefundIcon className="w-4 h-4" />}
          >
            Reverse
          </Button>
        </div>
      ),
    },
  ];

  if (finance.status === 'loading' && finance.paymentRows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16" role="status">
        Loading student payments...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        title="Student payments"
        info="A payment is posted when it is recorded, so it can be reversed but never edited or deleted. The receipt number is issued with the payment."
        actions={
          <Button onClick={openNew} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Record payment
          </Button>
        }
      >
        <DataGrid
          columns={columns}
          data={[...finance.paymentRows]}
          sortable
          filterable
          emptyState={{
            icon: <CreditCardIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: 'No payments recorded',
            description: 'Record the first payment to start the collection history.',
          }}
        />
      </Card>

      <Modal
        isOpen={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.row ? 'Edit payment' : 'Record payment'}
        size="lg"
      >
        {draft ? (
          <SchemaEntityForm
            schema={draft.row ? updateSchemaFor('payment') : createSchemaFor('payment')}
            recordKey={draft.row?.id ?? 'new'}
            initialValues={
              draft.row
                ? toWritableValues(draft.row)
                : {
                    institution_id: finance.learners[0]?.institution_id ?? '',
                    learner_id: '',
                    amount: money(0, CURRENCY),
                    channel: 'cash' as const,
                    received_at: new Date().toISOString(),
                    status: 'posted' as const,
                  }
            }
            fields={fields}
            lookups={{ learner: toFormLookup(finance.lookups.learner) }}
            serverError={formError}
            submitLabel={draft.row ? 'Save payment' : 'Record payment'}
            onCancel={() => setDraft(null)}
            onSubmit={savePayment}
          >
            {!draft.row ? (
              <div className="mt-4">
                <span className="mb-1.5 block text-sm font-medium text-surface-foreground">
                  Allocate to invoice (optional)
                </span>
                <EntityPicker
                  value={invoiceId}
                  onChange={setInvoiceId}
                  lookup={finance.lookups.invoice}
                  filter={(row) => invoiceOptions.some((invoice) => invoice.id === row.id)}
                  placeholder="Leave unallocated"
                  aria-label="Invoice to allocate the payment to"
                  data-testid="payment-invoice-picker"
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-surface-muted-fg">
                A posted payment's amount, date, channel and learner are frozen. To correct it,
                reverse the payment and record a new one.
              </p>
            )}
          </SchemaEntityForm>
        ) : null}
      </Modal>
    </div>
  );
};

const StudentPaymentsPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <StudentPaymentsPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default StudentPaymentsPage;
