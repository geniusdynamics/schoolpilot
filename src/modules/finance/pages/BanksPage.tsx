// ABOUTME: Banks tab: the school's bank accounts with their bank details around a cash or bank
// ABOUTME: ledger account, the account each payment channel posts to, and the ledger accounts
// ABOUTME: themselves below them.

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, BanknotesIcon, ExclamationTriangleIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useCan } from '@/data/auth/useCan';
import { asId } from '@/domain/ids';
import {
  accountsWithRole,
  assertBankAccountLedgerAccount,
  assertChannelAccountLedgerAccount,
  bankAccountLedgerCandidates,
  channelAccountLedgerCandidates,
  effectiveChannelAccount,
  type BankAccountRow,
  type LedgerAccountRole,
} from '@/domain/finance/ledger';
import { EXPENSE_CHANNELS } from '@/domain/schema/finance';
import type { RepositoryRow } from '@/data/repository';

import { useCanonicalLedgerAccounts } from '../data/useCanonicalLedgerAccounts';

type AccountRow = RepositoryRow<'ledger_account'>;
type Channel = (typeof EXPENSE_CHANNELS)[number];

const BOOK_ROLES: readonly LedgerAccountRole[] = ['cash', 'bank'];

const ROLE_LABELS: Readonly<Record<LedgerAccountRole, string>> = {
  cash: 'Cash book',
  bank: 'Bank book',
  mobile_money: 'Mobile money clearing',
  card: 'Card clearing',
  in_kind: 'In-kind goods',
};

const CHANNEL_LABELS: Readonly<Record<Channel, string>> = {
  cash: 'Cash',
  bank_deposit: 'Bank deposit',
  mobile_money: 'Mobile money',
  cheque: 'Cheque',
};

interface BankFormData {
  name: string;
  bankName: string;
  accountNumber: string;
  branch: string;
  ledgerAccountId: string;
  isDefault: boolean;
  isActive: boolean;
}

const EMPTY_FORM: BankFormData = {
  name: '',
  bankName: '',
  accountNumber: '',
  branch: '',
  ledgerAccountId: '',
  isDefault: false,
  isActive: true,
};

/** The chart account a bank account or a channel links to, as the screens print it. */
function accountLabel(account: AccountRow | undefined): string {
  return account ? `${account.code} · ${account.name}` : '—';
}

export const BanksPageContent: React.FC = () => {
  const { rows, bankRows, channelRows, institutionId, repository, status, error, mapping, refresh } =
    useCanonicalLedgerAccounts();
  const confirm = useConfirm();
  const toast = useToast();
  const canWrite = useCan('finance.write');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccountRow | null>(null);
  const [form, setForm] = useState<BankFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyChannel, setBusyChannel] = useState<Channel | null>(null);

  const accounts = useMemo(() => accountsWithRole(rows, BOOK_ROLES), [rows]);
  const bankCandidates = useMemo(() => bankAccountLedgerCandidates(rows), [rows]);
  const channelCandidates = useMemo(() => channelAccountLedgerCandidates(rows), [rows]);
  const accountsById = useMemo(
    () => new Map(rows.map((row) => [String(row.id), row])),
    [rows]
  );
  const banks = useMemo(
    () => [...bankRows].sort((left, right) => Number(right.is_default) - Number(left.is_default)),
    [bankRows]
  );

  const openModal = (bank?: BankAccountRow) => {
    setEditing(bank ?? null);
    setForm(
      bank
        ? {
            name: bank.name,
            bankName: bank.bank_name,
            accountNumber: bank.account_number,
            branch: bank.branch ?? '',
            ledgerAccountId: bank.ledger_account_id,
            isDefault: bank.is_default,
            isActive: bank.is_active,
          }
        : { ...EMPTY_FORM, ledgerAccountId: bankCandidates[0]?.id ?? '' }
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const setField = <K extends keyof BankFormData>(key: K, value: BankFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  /** Clears the mark from every other bank account of the school. */
  const clearOtherDefaults = async (keepId: string | null) => {
    for (const row of bankRows) {
      if (!row.is_default || row.id === keepId) continue;
      await repository.update(
        'bank_account',
        row.id,
        { is_default: false },
        { expectedVersion: row.rowVersion }
      );
    }
  };

  const handleSubmit = async () => {
    if (form.name.trim() === '' || form.bankName.trim() === '' || form.accountNumber.trim() === '') {
      toast.showWarning('The account name, the bank and the account number are required.');
      return;
    }
    if (form.ledgerAccountId === '') {
      toast.showWarning('Choose the ledger account this bank account posts to.');
      return;
    }
    if (institutionId === null) return;

    setSaving(true);
    try {
      assertBankAccountLedgerAccount(rows, form.ledgerAccountId, `bank account "${form.name.trim()}"`);
      if (form.isDefault) await clearOtherDefaults(editing?.id ?? null);

      const payload = {
        name: form.name.trim(),
        bank_name: form.bankName.trim(),
        account_number: form.accountNumber.trim(),
        ...(form.branch.trim() === '' ? {} : { branch: form.branch.trim() }),
        ledger_account_id: asId<'ledger_account'>(form.ledgerAccountId),
        is_default: form.isDefault,
        is_active: form.isActive,
      };

      if (editing) {
        await repository.update('bank_account', editing.id, payload, {
          expectedVersion: editing.rowVersion,
        });
      } else {
        await repository.create('bank_account', {
          institution_id: asId<'institution'>(institutionId),
          ...payload,
        });
      }
      refresh();
      closeModal();
      toast.showSuccess(editing ? 'Bank account saved.' : 'Bank account added.');
    } catch (failure) {
      toast.showError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setSaving(false);
    }
  };

  const handleMakeDefault = async (bank: BankAccountRow) => {
    setSaving(true);
    try {
      await clearOtherDefaults(bank.id);
      await repository.update(
        'bank_account',
        bank.id,
        { is_default: true, is_active: true },
        { expectedVersion: bank.rowVersion }
      );
      refresh();
      toast.showSuccess(`${bank.name} is the default bank account.`);
    } catch (failure) {
      toast.showError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (bank: BankAccountRow) => {
    if (bank.is_active) {
      const agreed = await confirm({
        variant: 'danger',
        message: `Deactivate ${bank.name}? New payments will not offer it; past entries keep it.`,
      });
      if (!agreed) return;
    }
    setSaving(true);
    try {
      await repository.update(
        'bank_account',
        bank.id,
        bank.is_active ? { is_active: false, is_default: false } : { is_active: true },
        { expectedVersion: bank.rowVersion }
      );
      refresh();
      toast.showSuccess(bank.is_active ? 'Bank account deactivated.' : 'Bank account activated.');
    } catch (failure) {
      toast.showError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setSaving(false);
    }
  };

  const handleChannelChange = async (channel: Channel, ledgerAccountId: string) => {
    if (institutionId === null) return;
    const existing = channelRows.find((row) => row.channel === channel) ?? null;
    setBusyChannel(channel);
    try {
      if (ledgerAccountId === '') {
        if (existing) {
          await repository.remove('channel_account', existing.id);
          toast.showSuccess(`${CHANNEL_LABELS[channel]} uses the default account again.`);
        }
      } else {
        assertChannelAccountLedgerAccount(rows, ledgerAccountId, channel);
        if (existing) {
          await repository.update(
            'channel_account',
            existing.id,
            { ledger_account_id: asId<'ledger_account'>(ledgerAccountId) },
            { expectedVersion: existing.rowVersion }
          );
        } else {
          await repository.create('channel_account', {
            institution_id: asId<'institution'>(institutionId),
            channel,
            ledger_account_id: asId<'ledger_account'>(ledgerAccountId),
          });
        }
        toast.showSuccess(`${CHANNEL_LABELS[channel]} now posts to ${accountLabel(accountsById.get(ledgerAccountId))}.`);
      }
      refresh();
    } catch (failure) {
      toast.showError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusyChannel(null);
    }
  };

  const bankColumns: DataGridColumn<BankAccountRow>[] = [
    {
      key: 'name',
      header: 'Account',
      sortable: true,
      filterable: true,
      width: 200,
      render: (value) => <span className="font-medium text-surface-foreground">{String(value)}</span>,
    },
    {
      key: 'bank_name',
      header: 'Bank',
      sortable: true,
      filterable: true,
      width: 180,
    },
    {
      key: 'account_number',
      header: 'Account number',
      width: 180,
      render: (value) => <span className="font-mono">{String(value)}</span>,
    },
    {
      key: 'branch',
      header: 'Branch',
      width: 140,
      render: (value) => (value ? String(value) : '—'),
    },
    {
      key: 'ledger_account_id',
      header: 'Ledger account',
      width: 240,
      render: (value) => (
        <span>
          <span className="font-mono">{accountsById.get(String(value))?.code ?? '—'}</span>
          <span className="text-surface-muted-fg">
            {accountsById.get(String(value)) ? ` · ${accountsById.get(String(value))!.name}` : ''}
          </span>
        </span>
      ),
    },
    {
      key: 'is_default',
      header: 'Default',
      sortable: true,
      width: 100,
      render: (value) =>
        value ? (
          <span className="inline-flex rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800">
            Default
          </span>
        ) : (
          <span className="text-sm text-surface-muted-fg">—</span>
        ),
    },
    {
      key: 'is_active',
      header: 'Active',
      sortable: true,
      width: 90,
      render: (value) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 280,
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {canWrite ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openModal(row)}
                leftIcon={<EditIcon className="h-4 w-4" />}
              >
                Edit
              </Button>
              {!row.is_default ? (
                <Button size="sm" variant="ghost" onClick={() => void handleMakeDefault(row)}>
                  Make default
                </Button>
              ) : null}
              <Button
                size="sm"
                variant={row.is_active ? 'danger' : 'ghost'}
                onClick={() => void handleToggleActive(row)}
              >
                {row.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </>
          ) : (
            <span className="text-sm text-surface-muted-fg">Read only</span>
          )}
        </div>
      ),
    },
  ];

  const accountColumns: DataGridColumn<AccountRow>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      filterable: true,
      width: 120,
      sticky: 'left',
      render: (value) => <span className="font-mono font-medium text-surface-foreground">{value}</span>,
    },
    {
      key: 'name',
      header: 'Account Name',
      sortable: true,
      filterable: true,
      width: 280,
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      filterable: true,
      width: 160,
      render: (value) => (
        <span className="text-sm text-surface-muted-fg">
          {value ? ROLE_LABELS[value as LedgerAccountRole] : '—'}
        </span>
      ),
    },
    {
      key: 'is_system',
      header: 'Control',
      sortable: true,
      width: 100,
      render: (value) =>
        value ? (
          <span className="inline-flex rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800">
            System
          </span>
        ) : (
          <span className="text-sm text-surface-muted-fg">—</span>
        ),
    },
    {
      key: 'is_active',
      header: 'Active',
      sortable: true,
      width: 80,
      render: (value) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
  ];

  if (status === 'error') {
    return (
      <Card title="Bank Accounts">
        <div role="alert" className="flex items-start gap-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" />
          <div>
            <p>The bank accounts could not be read.</p>
            <p className="mt-1 text-xs opacity-80">
              {error instanceof Error ? error.message : String(error ?? '')}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card
        title="Bank Accounts"
        info="The banks the school holds. Each one names the ledger account its money lands in; the default is the one the cashier offers first."
        actions={
          canWrite ? (
            <Button onClick={() => openModal()} leftIcon={<PlusIcon className="h-5 w-5" />}>
              Add Bank Account
            </Button>
          ) : undefined
        }
      >
        <DataGrid
          columns={bankColumns}
          data={banks}
          sortable
          filterable
          loading={status === 'loading'}
          emptyState={{
            icon: <BanknotesIcon className="mx-auto h-12 w-12 text-surface-muted-fg" />,
            title: 'No bank accounts yet',
            description: bankCandidates.length
              ? 'Add the school’s bank account and link it to the cash or bank account it posts through.'
              : 'The chart of accounts holds no cash or bank account yet. Add one in Chart of Accounts, then add the bank here.',
            ...(canWrite
              ? {
                  action: (
                    <Button onClick={() => openModal()} leftIcon={<PlusIcon className="h-5 w-5" />}>
                      Add Bank Account
                    </Button>
                  ),
                }
              : {}),
          }}
        />
      </Card>

      <Card
        title="Payment channels"
        info="The ledger account each payment channel posts to. A channel with no nomination uses the chart's cash book, bank book or clearing account."
      >
        {status === 'loading' ? (
          <p role="status" className="text-sm text-surface-muted-fg">
            Reading the channels…
          </p>
        ) : channelCandidates.length === 0 ? (
          <p role="status" className="text-sm text-surface-muted-fg">
            The chart holds no asset account a payment could land in. Add a cash or bank account in
            Chart of Accounts first.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs uppercase text-surface-muted-fg">
                  <th className="px-2 py-2 font-medium">Channel</th>
                  <th className="px-2 py-2 font-medium">Effective account</th>
                  <th className="px-2 py-2 font-medium">Nominate</th>
                </tr>
              </thead>
              <tbody>
                {EXPENSE_CHANNELS.map((channel) => {
                  const nomination = channelRows.find((row) => row.channel === channel) ?? null;
                  const effective = effectiveChannelAccount(mapping, channel);
                  return (
                    <tr key={channel} className="border-b border-surface-border/60">
                      <td className="px-2 py-2 font-medium text-surface-foreground">
                        {CHANNEL_LABELS[channel]}
                      </td>
                      <td className="px-2 py-2">
                        <span className="font-mono">{effective?.code ?? '—'}</span>
                        {effective ? (
                          <span className="text-surface-muted-fg"> · {effective.name}</span>
                        ) : null}
                        <span className="ml-2 text-xs text-surface-muted-fg">
                          {nomination ? '(nominated)' : '(default)'}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {canWrite ? (
                          <Select
                            name={`channel-${channel}`}
                            aria-label={`${CHANNEL_LABELS[channel]} account`}
                            value={nomination?.ledger_account_id ?? ''}
                            disabled={busyChannel === channel}
                            onChange={(event) =>
                              void handleChannelChange(channel, event.target.value)
                            }
                          >
                            <option value="">Use the default ({effective?.code ?? 'none'})</option>
                            {channelCandidates.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.code} · {account.name}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <span className="text-sm text-surface-muted-fg">Read only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Cash and bank ledger accounts"
        info="The accounts of the chart the postings land in. Add or rename one in Chart of Accounts."
      >
        <DataGrid
          columns={accountColumns}
          data={[...accounts]}
          sortable
          filterable
          loading={status === 'loading'}
          emptyState={{
            icon: <BanknotesIcon className="mx-auto h-12 w-12 text-surface-muted-fg" />,
            title: 'No cash or bank accounts found',
            description: 'The chart of accounts holds no account with a cash or bank role.',
          }}
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Bank Account' : 'Add Bank Account'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} loading={saving}>
              {editing ? 'Save Changes' : 'Add Bank Account'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            name="bank-name"
            label="Account name"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            helperText="The school's own label, e.g. Main account"
            required
          />
          <Input
            name="bank"
            label="Bank"
            value={form.bankName}
            onChange={(event) => setField('bankName', event.target.value)}
            required
          />
          <Input
            name="account-number"
            label="Account number"
            value={form.accountNumber}
            onChange={(event) => setField('accountNumber', event.target.value)}
            required
          />
          <Input
            name="branch"
            label="Branch"
            value={form.branch}
            onChange={(event) => setField('branch', event.target.value)}
            helperText="Optional"
          />
          <div className="md:col-span-2">
            <Select
              name="ledger-account"
              label="Ledger account"
              value={form.ledgerAccountId}
              onChange={(event) => setField('ledgerAccountId', event.target.value)}
              disabled={bankCandidates.length === 0}
              required
            >
              <option value="">Choose the account the money lands in</option>
              {bankCandidates.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} · {account.name}
                </option>
              ))}
            </Select>
            {bankCandidates.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700">
                The chart holds no cash or bank account. Add one in Chart of Accounts first.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="bank_is_default"
              name="is_default"
              type="checkbox"
              className="h-4 w-4 rounded border-surface-border text-indigo-600 focus:ring-indigo-500"
              checked={form.isDefault}
              onChange={(event) => setField('isDefault', event.target.checked)}
            />
            <label htmlFor="bank_is_default" className="text-sm text-surface-foreground">
              The default bank account
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="bank_is_active"
              name="is_active"
              type="checkbox"
              className="h-4 w-4 rounded border-surface-border text-indigo-600 focus:ring-indigo-500"
              checked={form.isActive}
              onChange={(event) => setField('isActive', event.target.checked)}
            />
            <label htmlFor="bank_is_active" className="text-sm text-surface-foreground">
              Active
            </label>
          </div>
        </div>
      </DialogForm>
    </div>
  );
};

const BanksPage: React.FC = () => (
  <div className="space-y-3">
    <BanksPageContent />
  </div>
);

export default BanksPage;
