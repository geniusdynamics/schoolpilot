// ABOUTME: Chart of accounts tab: lists, creates and edits the ledger_account rows the posting
// ABOUTME: engine actually reads, and refuses to delete or repurpose a control account.

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { BanknotesIcon, DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import {
  ACCOUNT_KINDS,
  assertLedgerAccountDeleteAllowed,
  assertLedgerAccountUpdateAllowed,
  seedDefaultLedgerAccounts,
  type AccountKind,
  type LedgerAccountRole,
} from '@/domain/finance/ledger';
import { LEDGER_ACCOUNT_ROLES } from '@/domain/schema/finance';
import type { RepositoryRow } from '@/data/repository';

import { useCanonicalLedgerAccounts } from '../data/useCanonicalLedgerAccounts';

type AccountRow = RepositoryRow<'ledger_account'>;

interface AccountFormData {
  code: string;
  name: string;
  kind: AccountKind;
  role: LedgerAccountRole | '';
  is_active: boolean;
}

const EMPTY_FORM: AccountFormData = {
  code: '',
  name: '',
  kind: 'expense',
  role: '',
  is_active: true,
};

const ROLE_LABELS: Readonly<Record<LedgerAccountRole, string>> = {
  cash: 'Cash book',
  bank: 'Bank book',
  mobile_money: 'Mobile money clearing',
  card: 'Card clearing',
  in_kind: 'In-kind goods',
};

export const ChartOfAccountsContent: React.FC = () => {
  const { rows, institutionId, repository, status, refresh } = useCanonicalLedgerAccounts();
  const confirm = useConfirm();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [form, setForm] = useState<AccountFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const accounts = useMemo(
    () => [...rows].sort((left, right) => left.code.localeCompare(right.code)),
    [rows]
  );

  const openModal = (account?: AccountRow) => {
    setEditing(account ?? null);
    setForm(
      account
        ? {
            code: account.code,
            name: account.name,
            kind: account.kind,
            role: account.role ?? '',
            is_active: account.is_active,
          }
        : EMPTY_FORM
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const setField = <K extends keyof AccountFormData>(key: K, value: AccountFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    if (form.code.trim() === '' || form.name.trim() === '') {
      toast.showWarning('Account code and name are required.');
      return;
    }
    if (institutionId === null) return;
    const role = form.role === '' ? null : form.role;

    setSaving(true);
    try {
      if (editing) {
        const patch = {
          code: form.code.trim(),
          name: form.name.trim(),
          kind: form.kind,
          role,
          is_active: form.is_active,
        };
        assertLedgerAccountUpdateAllowed(editing, patch);
        await repository.update('ledger_account', editing.id, patch, {
          expectedVersion: editing.rowVersion,
        });
      } else {
        await repository.create('ledger_account', {
          institution_id: institutionId,
          code: form.code.trim(),
          name: form.name.trim(),
          kind: form.kind,
          role,
          is_system: false,
          is_active: form.is_active,
        });
      }
      refresh();
      closeModal();
      toast.showSuccess(editing ? 'Account saved.' : 'Account added.');
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: AccountRow) => {
    try {
      assertLedgerAccountDeleteAllowed(account);
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : String(error));
      return;
    }
    const agreed = await confirm({
      variant: 'danger',
      message: `Delete account ${account.code} ${account.name}? A posted entry keeps the code it posted to.`,
    });
    if (!agreed) return;
    try {
      await repository.remove('ledger_account', account.id);
      refresh();
      toast.showSuccess('Account deleted.');
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleSeedDefaults = async () => {
    if (institutionId === null) return;
    setSaving(true);
    try {
      await seedDefaultLedgerAccounts(repository, institutionId);
      refresh();
      toast.showSuccess('The default chart of accounts was added.');
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const protectedEditing = editing?.is_system === true;

  const columns: DataGridColumn<AccountRow>[] = [
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
      width: 250,
      render: (value) => <span className="font-medium text-surface-foreground">{value}</span>,
    },
    {
      key: 'kind',
      header: 'Class',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => (
        <span className="inline-flex rounded-full bg-surface-accent px-2 py-1 text-xs font-medium text-surface-foreground">
          {String(value)}
        </span>
      ),
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
    {
      key: 'actions',
      header: 'Actions',
      width: 180,
      render: (_, row) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openModal(row)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => void handleDelete(row)}
            disabled={row.is_system}
            title={row.is_system ? 'A control account the ledger posts against cannot be deleted.' : undefined}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Card
        title="Chart of Accounts"
        info="The accounts the ledger posts against. Control accounts are marked System and cannot be deleted or repurposed."
        actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add Account
          </Button>
        }
      >
        <DataGrid
          columns={columns}
          data={accounts}
          sortable
          filterable
          loading={status === 'loading'}
          emptyState={{
            icon: <BanknotesIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: 'No chart of accounts found',
            description:
              'Load the default chart the ledger posts against, or add the first account the school needs.',
            action: (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  onClick={() => void handleSeedDefaults()}
                  loading={saving}
                  disabled={institutionId === null}
                >
                  Load default chart
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openModal()}
                  leftIcon={<PlusIcon className="w-5 h-5" />}
                >
                  Add Account
                </Button>
              </div>
            ),
          }}
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Account' : 'Add New Account'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} loading={saving}>
              {editing ? 'Save Changes' : 'Add Account'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="code"
            label="Account Code"
            value={form.code}
            onChange={(event) => setField('code', event.target.value)}
            disabled={protectedEditing}
            required
          />
          <Input
            name="name"
            label="Account Name"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            required
          />
          <Select
            name="kind"
            label="Account Class"
            value={form.kind}
            onChange={(event) => setField('kind', event.target.value as AccountKind)}
            disabled={protectedEditing}
            required
          >
            {ACCOUNT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </Select>
          <Select
            name="role"
            label="Cash / bank role"
            value={form.role}
            onChange={(event) => setField('role', event.target.value as LedgerAccountRole | '')}
            disabled={protectedEditing}
          >
            <option value="">No role</option>
            {LEDGER_ACCOUNT_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
          <div className="flex items-center mt-2 md:col-span-2">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 border-surface-border rounded focus:ring-indigo-500"
              checked={form.is_active}
              disabled={protectedEditing}
              onChange={(event) => setField('is_active', event.target.checked)}
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-surface-foreground">
              Is Active Account
            </label>
          </div>
          {protectedEditing ? (
            <p className="md:col-span-2 text-sm text-surface-muted-fg">
              This is a control account the ledger posts against. Its code, class, role and active
              state are fixed; its name may be changed.
            </p>
          ) : null}
        </div>
      </DialogForm>
    </div>
  );
};

const ChartOfAccountsPage: React.FC = () => (
  <div className="space-y-3">
    <ChartOfAccountsContent />
  </div>
);

export default ChartOfAccountsPage;
