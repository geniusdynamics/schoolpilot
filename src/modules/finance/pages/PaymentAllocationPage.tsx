// ABOUTME: Payment allocation page: applies a posted payment to a posted invoice as a canonical
// ABOUTME: payment_allocation. The allocation and the invoice's new status are written together.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { BanknotesIcon } from '@/components/ui/icons';
import { SchemaEntityForm } from '@/components/ui/forms';
import {
  createSchemaFor,
} from '@/data/repository';
import { useToast } from '@/hooks/useToast';
import type { Money } from '@/domain/schema/common';

import {
  formatMoney,
  money,
  toFormLookup,
  useCanonicalFinance,
  useFinanceRepository,
  type FinanceAllocationRow,
  type FinanceInvoiceRow,
} from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { allocatePayment } from '../services/canonicalFinanceService';
import type { Id } from '@/domain/ids';

const CURRENCY = 'KES';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const PaymentAllocationPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const repository = useFinanceRepository();
  const { showSuccess } = useToast();

  const [paymentId, setPaymentId] = useState<Id<'payment'> | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const payment = useMemo(
    () => finance.payments.find((row) => row.id === paymentId) ?? null,
    [finance.payments, paymentId]
  );

  const outstanding = useMemo<readonly FinanceInvoiceRow[]>(() => {
    if (!payment?.learner_id) return [];
    return finance.invoiceRows.filter(
      (invoice) =>
        invoice.learnerId === payment.learner_id &&
        invoice.status !== 'void' &&
        invoice.status !== 'draft' &&
        invoice.balance.amount_minor > 0
    );
  }, [finance.invoiceRows, payment]);

  const remaining = useMemo(() => {
    if (!payment) return money(0, CURRENCY);
    const allocated = finance.allocations
      .filter((row) => row.payment_id === payment.id)
      .reduce((total, row) => total + row.amount.amount_minor, 0);
    return money(payment.amount.amount_minor - allocated, payment.amount.currency);
  }, [finance.allocations, payment]);

  const openAllocation = () => {
    setFormError(null);
    setDraftOpen(true);
  };

  const saveAllocation = async (values: Record<string, unknown>) => {
    setFormError(null);
    try {
      if (!paymentId) throw new Error('Select the payment to allocate.');
      const invoiceId = values.invoice_id;
      const amount = values.amount;
      if (typeof invoiceId !== 'string' || !invoiceId) {
        throw new Error('Select the invoice this payment pays.');
      }
      if (
        amount === null ||
        typeof amount !== 'object' ||
        typeof (amount as Money).amount_minor !== 'number'
      ) {
        throw new Error('Enter the amount to allocate.');
      }
      await allocatePayment(repository, {
        paymentId,
        invoiceId,
        amount: amount as Money,
      });
      showSuccess('Payment allocated.');
      setDraftOpen(false);
    } catch (error) {
      setFormError(errorMessage(error));
      throw error;
    }
  };

  const columns: DataGridColumn<FinanceAllocationRow>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-mono">{value}</span>,
    },
    { key: 'learnerName', header: 'Learner', sortable: true, filterable: true },
    {
      key: 'amount',
      header: 'Allocated',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{formatMoney(value as Money)}</span>,
    },
    {
      key: 'allocatedAt',
      header: 'Allocated at',
      sortable: true,
      render: (value) => String(value ?? '').slice(0, 10),
    },
  ];

  const outstandingColumns: DataGridColumn<FinanceInvoiceRow>[] = [
    {
      key: 'number',
      header: 'Invoice',
      sortable: true,
      render: (value) => <span className="font-mono">{value}</span>,
    },
    { key: 'issueDate', header: 'Issued', sortable: true },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (value) => formatMoney(value as Money),
    },
    {
      key: 'paid',
      header: 'Paid',
      align: 'right',
      render: (value) => formatMoney(value as Money),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (value) => formatMoney(value as Money),
    },
    { key: 'status', header: 'Status', sortable: true, filterable: true },
  ];

  const paymentChoices = finance.payments.filter(
    (row) => row.status === 'posted' || row.status === 'cleared'
  );

  if (finance.status === 'loading' && finance.paymentRows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16" role="status">
        Loading payments...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        title="Payment allocation"
        info="A posted payment can be applied to any posted invoice of the same learner. The payment's allocations may never exceed the amount that was paid; the repository refuses the write when they would."
      >

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Payment</span>
            <EntityPicker
              value={paymentId}
              onChange={(id) => {
                setPaymentId(id);
                setDraftOpen(false);
              }}
              lookup={finance.lookups.payment}
              filter={(row) => paymentChoices.some((choice) => choice.id === row.id)}
              placeholder="Select a posted payment"
              aria-label="Payment"
              data-testid="allocation-payment-picker"
            />
          </div>
          {payment ? (
            <>
              <div className="rounded-lg bg-surface-muted p-3">
                <div className="text-xs text-surface-muted-fg">Paid</div>
                <div className="font-mono text-lg">{formatMoney(payment.amount)}</div>
              </div>
              <div className="rounded-lg bg-surface-muted p-3">
                <div className="text-xs text-surface-muted-fg">Unallocated</div>
                <div className="font-mono text-lg">{formatMoney(remaining)}</div>
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={openAllocation}
            disabled={!payment || remaining.amount_minor <= 0}
            leftIcon={<BanknotesIcon className="w-5 h-5" />}
          >
            Allocate payment
          </Button>
          {payment && outstanding.length === 0 ? (
            <span className="self-center text-sm text-surface-muted-fg">
              This learner has no outstanding invoice.
            </span>
          ) : null}
        </div>
      </Card>

      {payment ? (
        <Card title="Outstanding invoices">
          <DataGrid
            columns={outstandingColumns}
            data={[...outstanding]}
            sortable
            filterable
            emptyState={{
              icon: <BanknotesIcon className="w-8 h-8 text-surface-muted-fg" />,
              title: 'Nothing outstanding',
              description: 'Every invoice of this learner is settled.',
            }}
          />
        </Card>
      ) : null}

      <Card title="Allocations">
        <DataGrid
          columns={columns}
          data={[...finance.allocationRows]}
          sortable
          filterable
          emptyState={{
            icon: <BanknotesIcon className="w-8 h-8 text-surface-muted-fg" />,
            title: 'No allocations yet',
            description: 'Allocate a payment to an invoice to start.',
          }}
        />
      </Card>

      <Modal isOpen={draftOpen} onClose={() => setDraftOpen(false)} title="Allocate payment" size="md">
        {payment ? (
          <SchemaEntityForm
            schema={createSchemaFor('payment_allocation')}
            recordKey={`${payment.id}-${remaining.amount_minor}`}
            initialValues={{
              institution_id: payment.institution_id,
              payment_id: payment.id,
              invoice_id: outstanding[0]?.id ?? '',
              amount: remaining,
              allocated_at: new Date().toISOString(),
            }}
            fields={[
              {
                path: 'invoice_id',
                label: 'Invoice',
                order: 1,
                widget: 'entity',
                lookupKey: 'invoice',
                required: true,
              },
              {
                path: 'amount',
                label: 'Amount',
                order: 2,
                widget: 'money',
                required: true,
                currency: CURRENCY,
              },
            ]}
            lookups={{ invoice: toFormLookup(finance.lookups.invoice) }}
            serverError={formError}
            submitLabel="Allocate"
            onCancel={() => setDraftOpen(false)}
            onSubmit={saveAllocation}
          />
        ) : null}
      </Modal>
    </div>
  );
};

const PaymentAllocationPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <PaymentAllocationPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default PaymentAllocationPage;
