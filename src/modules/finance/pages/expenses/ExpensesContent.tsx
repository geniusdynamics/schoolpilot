// ABOUTME: The Expenses screen: the recorded expenses, their filters and total, a dialog that
// ABOUTME: records one through the ledger, and the reversal of a posted expense. Nothing here is a
// ABOUTME: legacy collection row: the document is canonical and the money moves in the journal.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { canonicalAdapter } from '@/data/canonicalRepository';
import type { RepositoryRow } from '@/data/repository';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import DialogForm from '@/components/ui/forms/DialogForm';
import { MoneyField } from '@/components/ui/forms/MoneyField';
import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { generateUuidv7 } from '@/domain/ids';
import { ExpenseService, isExpenseError } from '@/domain/finance/expenses';
import {
  LedgerService,
  createSqliteLedgerStore,
  ensureLedgerSchema,
  type LedgerAccount,
  type LedgerAccountMapping,
} from '@/domain/finance/ledger';
import type { Money } from '@/domain/schema/common';

import { formatMoney, money } from '../../data/canonicalFinance';
import { useCanonicalExpenses } from '../../data/useCanonicalExpenses';

type ExpenseChannel = RepositoryRow<'expense'>['channel'];

const CHANNEL_LABELS: Readonly<Record<ExpenseChannel, string>> = {
  cash: 'Cash',
  bank_deposit: 'Bank',
  mobile_money: 'Mobile money',
  cheque: 'Cheque',
};

const NOT_CONNECTED_REASON =
  'Recording an expense posts it to the ledger, and the ledger is not open. The app opens the ' +
  'canonical database and its ledger at start-up; a caller outside that path hands this page the ' +
  'ledger (or the SQLite adapter it is built over) as a prop.';

interface ExpenseForm {
  expenseDate: string;
  payee: string;
  category: string;
  description: string;
  reference: string;
  channel: ExpenseChannel;
  expenseAccountCode: string;
  amount: Money | undefined;
}

const EMPTY_FORM: ExpenseForm = {
  expenseDate: '',
  payee: '',
  category: '',
  description: '',
  reference: '',
  channel: 'cash',
  expenseAccountCode: '',
  amount: undefined,
};

type FormField = keyof ExpenseForm;

/** The field of the form a refusal belongs to, when it names one. */
const FIELD_ALIASES: Readonly<Record<string, FormField>> = {
  expenseDate: 'expenseDate',
  date: 'expenseDate',
  payee: 'payee',
  amount: 'amount',
  expenseAccountCode: 'expenseAccountCode',
  reference: 'reference',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Opens a ledger over an already-open adapter, applying its DDL once. */
async function openLedgerOver(
  adapter: SqliteAdapter,
  mapping: LedgerAccountMapping | null
): Promise<LedgerService> {
  await ensureLedgerSchema(adapter);
  return new LedgerService({
    store: createSqliteLedgerStore(adapter),
    ...(mapping === null ? {} : { mapping }),
  });
}

/**
 * Resolves the ledger the page posts through: the one it was handed, or one built over the
 * caller's adapter, or the canonical connection the app opened.
 */
function useExpenseLedger(
  ledger: LedgerService | null | undefined,
  adapter: SqliteAdapter | null | undefined,
  mapping: LedgerAccountMapping | null
): {
  readonly ledger: LedgerService | null;
  readonly status: 'unavailable' | 'loading' | 'ready' | 'error';
  readonly error: unknown;
} {
  const [opened, setOpened] = useState<LedgerService | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const [storage, setStorage] = useState<SqliteAdapter | null | undefined>(
    () => adapter ?? canonicalAdapter()
  );

  useEffect(() => {
    setStorage(adapter ?? canonicalAdapter());
  }, [adapter]);

  useEffect(() => {
    if (ledger || !storage) {
      setOpened(null);
      return;
    }
    let cancelled = false;
    void openLedgerOver(storage, mapping)
      .then((service) => {
        if (!cancelled) setOpened(service);
      })
      .catch((error: unknown) => {
        if (!cancelled) setFailure(error);
      });
    return () => {
      cancelled = true;
    };
  }, [ledger, storage, mapping]);

  if (ledger) return { ledger, status: 'ready', error: null };
  if (failure) return { ledger: null, status: 'error', error: failure };
  if (!storage) return { ledger: null, status: 'unavailable', error: null };
  return { ledger: opened, status: opened ? 'ready' : 'loading', error: null };
}

export interface ExpensesContentProps {
  /** A ledger the caller already holds. Takes precedence over `adapter`. */
  readonly ledger?: LedgerService | null;
  /** The storage the ledger is built over when no service is supplied. */
  readonly adapter?: SqliteAdapter | null;
}

export const ExpensesContent: React.FC<ExpensesContentProps> = ({ ledger: givenLedger, adapter }) => {
  const { t } = useTranslation('finance');
  const toast = useToast();
  const confirm = useConfirm();
  const data = useCanonicalExpenses();
  const { ledger, status: ledgerStatus, error: ledgerError } = useExpenseLedger(
    givenLedger,
    adapter,
    data.mapping
  );

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [lastRecorded, setLastRecorded] = useState<RepositoryRow<'expense'> | null>(null);
  const [reversingId, setReversingId] = useState<string | null>(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [payeeFilter, setPayeeFilter] = useState('');

  const accounts = useMemo<readonly LedgerAccount[]>(() => {
    if (!ledger) return [];
    return new ExpenseService({
      repository: data.repository,
      ledger,
    }).expenseAccounts();
  }, [ledger, data.repository]);

  const service = useMemo<ExpenseService | null>(() => {
    if (!ledger) return null;
    return new ExpenseService({ repository: data.repository, ledger });
  }, [ledger, data.repository]);

  const setField = useCallback(<K extends FormField>(key: K, value: ExpenseForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (current[key] === undefined) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const openCreate = useCallback(() => {
    setForm({ ...EMPTY_FORM, expenseDate: today(), expenseAccountCode: accounts[0]?.code ?? '' });
    setFieldErrors({});
    setIdempotencyKey(generateUuidv7());
    setIsOpen(true);
  }, [accounts]);

  const close = useCallback(() => {
    setIsOpen(false);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setIdempotencyKey('');
  }, []);

  const handleSubmit = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!service || data.institutionId === null) return;

      const errors: Partial<Record<FormField, string>> = {};
      if (form.expenseDate.trim() === '') errors.expenseDate = 'Choose the expense date.';
      if (form.payee.trim() === '') errors.payee = 'Enter who was paid.';
      if (!form.amount || form.amount.amount_minor <= 0) {
        errors.amount = 'Enter an amount greater than zero.';
      }
      if (form.expenseAccountCode.trim() === '') {
        errors.expenseAccountCode = 'Choose the expense account to debit.';
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      if (!form.amount) return;

      setSaving(true);
      try {
        const recorded = await service.record({
          institutionId: data.institutionId,
          expenseDate: form.expenseDate,
          payee: form.payee,
          ...(form.category.trim() === '' ? {} : { category: form.category }),
          ...(form.description.trim() === '' ? {} : { description: form.description }),
          amount: form.amount,
          channel: form.channel,
          expenseAccountCode: form.expenseAccountCode,
          ...(form.reference.trim() === '' ? {} : { reference: form.reference }),
          ...(idempotencyKey === '' ? {} : { idempotencyKey }),
        });
        setLastRecorded(recorded);
        close();
        data.refresh();
        toast.showSuccess(
          t('expenses.recorded', 'Expense recorded. Voucher {{reference}}.', {
            reference: recorded.reference,
          })
        );
      } catch (error) {
        if (isExpenseError(error)) {
          const field = error.field === undefined ? undefined : FIELD_ALIASES[error.field];
          if (field !== undefined) {
            setFieldErrors({ [field]: error.message });
          } else {
            toast.showError(error.message);
          }
        } else {
          toast.showError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        setSaving(false);
      }
    },
    [close, data, form, idempotencyKey, service, t, toast]
  );

  const handleReverse = useCallback(
    async (row: RepositoryRow<'expense'>) => {
      if (!service) return;
      const agreed = await confirm({
        variant: 'danger',
        title: t('expenses.reverseTitle', 'Reverse expense'),
        message: t(
          'expenses.reverseMessage',
          'Reverse {{amount}} paid to {{payee}}? The ledger receives a counter-entry; the expense itself is never edited or deleted.',
          { amount: formatMoney(row.amount), payee: row.payee }
        ),
      });
      if (!agreed) return;
      setReversingId(row.id);
      try {
        await service.reverse(row.id, {
          reason: `Reversed from the Expenses page (voucher ${row.reference})`,
        });
        data.refresh();
        toast.showSuccess(t('expenses.reversed', 'The expense was reversed.'));
      } catch (error) {
        toast.showError(error instanceof Error ? error.message : String(error));
      } finally {
        setReversingId(null);
      }
    },
    [confirm, data, service, t, toast]
  );

  const rows = useMemo(() => {
    const fromDay = from.trim();
    const toDay = to.trim();
    const payee = payeeFilter.trim().toLowerCase();
    return data.expenses
      .filter((row) => {
        if (fromDay !== '' && row.expense_date < fromDay) return false;
        if (toDay !== '' && row.expense_date > toDay) return false;
        if (accountFilter !== '' && row.expense_account_code !== accountFilter) return false;
        if (payee !== '' && !row.payee.toLowerCase().includes(payee)) return false;
        return true;
      })
      .sort((left, right) => right.expense_date.localeCompare(left.expense_date));
  }, [accountFilter, data.expenses, from, payeeFilter, to]);

  const total = useMemo(
    () =>
      money(
        rows
          .filter((row) => row.status === 'posted')
          .reduce((sum, row) => sum + row.amount.amount_minor, 0),
        data.institution?.base_currency ?? 'KES'
      ),
    [data.institution, rows]
  );

  const columns: DataGridColumn<RepositoryRow<'expense'>>[] = [
    {
      key: 'expense_date',
      header: t('expenses.date', 'Date'),
      sortable: true,
      render: (value) => <span className="font-mono">{String(value)}</span>,
    },
    { key: 'payee', header: t('expenses.payee', 'Payee'), sortable: true, filterable: true },
    {
      key: 'category',
      header: t('expenses.category', 'Category'),
      render: (value) => (value ? String(value) : '—'),
    },
    {
      key: 'expense_account_code',
      header: t('expenses.account', 'Expense account'),
      render: (value) => {
        const account = accounts.find((candidate) => candidate.code === String(value));
        return (
          <span>
            <span className="font-mono">{String(value)}</span>
            {account ? <span className="text-surface-muted-fg"> · {account.name}</span> : null}
          </span>
        );
      },
    },
    {
      key: 'channel',
      header: t('expenses.channel', 'Paid by'),
      render: (value) => CHANNEL_LABELS[value as ExpenseChannel] ?? String(value),
    },
    {
      key: 'amount',
      header: t('expenses.amount', 'Amount'),
      align: 'right',
      sortable: true,
      render: (_, row) => <span className="font-mono">{formatMoney(row.amount)}</span>,
    },
    {
      key: 'reference',
      header: t('expenses.reference', 'Voucher'),
      render: (value) => <span className="font-mono">{String(value)}</span>,
    },
    {
      key: 'status',
      header: t('expenses.status', 'Status'),
      render: (value) =>
        value === 'reversed' ? (
          <span className="inline-flex rounded-full bg-surface-accent px-2 py-1 text-xs font-medium text-surface-muted-fg">
            {t('expenses.reversedStatus', 'Reversed')}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            {t('expenses.postedStatus', 'Posted')}
          </span>
        ),
    },
    {
      key: 'actions',
      header: t('expenses.actions', 'Actions'),
      width: 150,
      render: (_, row) =>
        row.status === 'posted' ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleReverse(row)}
            loading={reversingId === row.id}
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
          >
            {t('expenses.reverse', 'Reverse')}
          </Button>
        ) : null,
    },
  ];

  if (data.status === 'error') {
    return (
      <Card title={t('expenses.title', 'Expenses')}>
        <div role="alert" className="flex items-start gap-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" />
          <div>
            <p>{t('expenses.loadFailed', 'The expenses could not be read.')}</p>
            <p className="mt-1 text-xs opacity-80">
              {data.error instanceof Error ? data.error.message : String(data.error ?? '')}
            </p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={data.refresh}>
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const noAccounts = ledgerStatus === 'ready' && accounts.length === 0;
  const canRecord = service !== null && data.institutionId !== null && !noAccounts;

  return (
    <div className="space-y-3">
      {ledgerStatus === 'loading' ? (
        <div className="flex items-center gap-2 text-sm text-surface-muted-fg" role="status">
          <Spinner /> {t('expenses.openingLedger', 'Opening the ledger…')}
        </div>
      ) : null}

      {ledgerStatus === 'unavailable' || ledgerStatus === 'error' ? (
        <div role="alert" className="flex items-start gap-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" />
          <div>
            <p>{t('expenses.ledgerUnavailable', 'The ledger is not open, so expenses cannot be posted.')}</p>
            <p className="mt-1 text-xs opacity-80">
              {ledgerError instanceof Error ? ledgerError.message : NOT_CONNECTED_REASON}
            </p>
          </div>
        </div>
      ) : null}

      {noAccounts ? (
        <div role="status" className="flex items-start gap-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" />
          <p>
            {t(
              'expenses.noAccounts',
              'The ledger’s chart of accounts holds no expense account, so an expense cannot be recorded. Add an expense account in Finance → Accounting Configuration → Chart of Accounts, then return to this page.'
            )}
          </p>
        </div>
      ) : null}

      {lastRecorded ? (
        <div role="status" className="flex items-start gap-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <CheckCircleIcon className="mt-0.5 h-5 w-5" />
          <p>
            {t('expenses.savedWithVoucher', 'Expense recorded. Voucher {{reference}}.', {
              reference: lastRecorded.reference,
            })}
          </p>
        </div>
      ) : null}

      <Card
        title={t('expenses.title', 'Expenses')}
        info={t(
          'expenses.subtitle',
          'Money the school spent, posted to the ledger: each expense debits an expense account and credits the cash or bank account it was paid from.'
        )}
        actions={
          <Button
            onClick={openCreate}
            disabled={!canRecord}
            leftIcon={<PlusIcon className="h-5 w-5" />}
          >
            {t('expenses.record', 'Record expense')}
          </Button>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            name="expense-from"
            type="date"
            label={t('expenses.from', 'From')}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Input
            name="expense-to"
            type="date"
            label={t('expenses.to', 'To')}
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <Select
            name="expense-account-filter"
            label={t('expenses.accountFilter', 'Expense account')}
            value={accountFilter}
            onChange={(event) => setAccountFilter(event.target.value)}
          >
            <option value="">{t('expenses.allAccounts', 'All accounts')}</option>
            {accounts.map((account) => (
              <option key={account.code} value={account.code}>
                {account.code} · {account.name}
              </option>
            ))}
          </Select>
          <Input
            name="expense-payee-filter"
            label={t('expenses.payeeFilter', 'Payee')}
            value={payeeFilter}
            onChange={(event) => setPayeeFilter(event.target.value)}
            placeholder={t('expenses.payeeFilterPlaceholder', 'Search the payee')}
          />
        </div>

        <p className="mb-3 text-sm text-surface-muted-fg">
          {t('expenses.total', 'Total of the posted expenses shown')}:{' '}
          <span className="font-mono font-medium text-surface-fg">{formatMoney(total)}</span>
        </p>

        <DataGrid
          columns={columns}
          data={[...rows]}
          sortable
          loading={data.status === 'loading'}
          emptyState={{
            icon: <BanknotesIcon className="h-12 w-12 text-surface-muted-fg" />,
            title: t('expenses.emptyTitle', 'No expenses recorded yet'),
            description: t(
              'expenses.emptyDescription',
              'Record what the school spent, with the voucher number the payee gave, and the ledger posts it.'
            ),
            ...(canRecord
              ? {
                  action: (
                    <Button onClick={openCreate} leftIcon={<PlusIcon className="h-5 w-5" />}>
                      {t('expenses.record', 'Record expense')}
                    </Button>
                  ),
                }
              : {}),
          }}
        />
      </Card>

      <DialogForm
        isOpen={isOpen}
        onClose={close}
        title={t('expenses.recordTitle', 'Record expense')}
        onSubmit={handleSubmit}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={() => void handleSubmit()} loading={saving} disabled={!canRecord}>
              {t('expenses.save', 'Record expense')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            name="expense-date"
            type="date"
            label={t('expenses.date', 'Date')}
            value={form.expenseDate}
            onChange={(event) => setField('expenseDate', event.target.value)}
            error={fieldErrors.expenseDate}
            required
          />
          <Input
            name="expense-payee"
            label={t('expenses.payee', 'Payee')}
            value={form.payee}
            onChange={(event) => setField('payee', event.target.value)}
            error={fieldErrors.payee}
            required
          />
          <MoneyField
            name="expense-amount"
            label={t('expenses.amount', 'Amount')}
            currency={data.institution?.base_currency ?? 'KES'}
            value={form.amount}
            onChange={(value) => setField('amount', value)}
            error={fieldErrors.amount}
            allowNegative={false}
            required
          />
          <Select
            name="expense-account"
            label={t('expenses.account', 'Expense account')}
            value={form.expenseAccountCode}
            onChange={(event) => setField('expenseAccountCode', event.target.value)}
            error={fieldErrors.expenseAccountCode}
            required
          >
            <option value="">{t('expenses.chooseAccount', 'Choose an account')}</option>
            {accounts.map((account) => (
              <option key={account.code} value={account.code}>
                {account.code} · {account.name}
              </option>
            ))}
          </Select>
          <Select
            name="expense-channel"
            label={t('expenses.channel', 'Paid by')}
            value={form.channel}
            onChange={(event) => setField('channel', event.target.value as ExpenseChannel)}
            required
          >
            {(Object.keys(CHANNEL_LABELS) as ExpenseChannel[]).map((channel) => (
              <option key={channel} value={channel}>
                {CHANNEL_LABELS[channel]}
              </option>
            ))}
          </Select>
          <Input
            name="expense-category"
            label={t('expenses.category', 'Category')}
            value={form.category}
            onChange={(event) => setField('category', event.target.value)}
            helperText={t('expenses.categoryHint', 'Optional: utilities, supplies, repairs…')}
          />
          <Input
            name="expense-reference"
            label={t('expenses.reference', 'Voucher / receipt number')}
            value={form.reference}
            onChange={(event) => setField('reference', event.target.value)}
            error={fieldErrors.reference}
            helperText={t(
              'expenses.referenceHint',
              'Leave it blank to receive a voucher number when the expense is saved.'
            )}
          />
          <Input
            name="expense-description"
            label={t('expenses.description', 'Description')}
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
          />
        </div>
      </DialogForm>
    </div>
  );
};

export default ExpensesContent;
