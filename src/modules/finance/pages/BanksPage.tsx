// ABOUTME: Banks tab: lists and edits the ledger accounts that play the cash-book or bank-book
// ABOUTME: role, through the same ledger_account rows the posting engine reads.

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, BanknotesIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import {
  accountsWithRole,
  assertLedgerAccountDeleteAllowed,
  assertLedgerAccountUpdateAllowed,
  type LedgerAccountRole,
} from '@/domain/finance/ledger';
import type { RepositoryRow } from '@/data/repository';

import { useCanonicalLedgerAccounts } from '../data/useCanonicalLedgerAccounts';

type AccountRow = RepositoryRow<'ledger_account'>;
type BookRole = Extract<LedgerAccountRole, 'cash' | 'bank'>;

const BOOK_ROLES: readonly BookRole[] = ['cash', 'bank'];

const ROLE_LABELS: Readonly<Record<BookRole, string>> = {
  cash: 'Cash book',
  bank: 'Bank book',
};

interface BankFormData {
  code: string;
  name: string;
  role: BookRole;
  is_active: boolean;
}

const EMPTY_FORM: BankFormData = {
  code: '',
  name: '',
  role: 'bank',
  is_active: true,
};

export const BanksPageContent: React.FC = () => {
  const { rows, institutionId, repository, status, refresh } = useCanonicalLedgerAccounts();
  const confirm = useConfirm();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [form, setForm] = useState<BankFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const accounts = useMemo(() => accountsWithRole(rows, BOOK_ROLES), [rows]);

  const openModal = (account?: AccountRow) => {
    setEditing(account ?? null);
    setForm(
      account
        ? {
            code: account.code,
            name: account.name,
            role: account.role === 'cash' ? 'cash' : 'bank',
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

  const setField = <K extends keyof BankFormData>(key: K, value: BankFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    if (form.code.trim() === '' || form.name.trim() === '') {
      toast.showWarning('Account code and name are required.');
      return;
    }
    if (institutionId === null) return;

    setSaving(true);
    try {
      if (editing) {
        const patch = {
          code: form.code.trim(),
          name: form.name.trim(),
          role: form.role,
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
          kind: 'asset',
          role: form.role,
          is_system: false,
          is_active: form.is_active,
        });
      }
      refresh();
      closeModal();
      toast.showSuccess(editing ? 'Cash/bank account saved.' : 'Cash/bank account added.');
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
      message: `Delete account ${account.code} ${account.name}?`,
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
      width: 280,
      render: (value) => <span className="font-medium text-surface-foreground">{value}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      filterable: true,
      width: 160,
      render: (value) => (
        <span className="text-sm text-surface-muted-fg">
          {value === 'cash' ? 'Cash book' : 'Bank book'}
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
        title="Bank Accounts"
        info="The cash book, bank book and other cash/bank accounts of the ledger. Control accounts are marked System."
        actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add Bank Account
          </Button>
        }
      >
        <DataGrid
          columns={columns}
          data={[...accounts]}
          sortable
          filterable
          loading={status === 'loading'}
          emptyState={{
            icon: <BanknotesIcon className="mx-auto h-12 w-12 text-surface-muted-fg" />,
            title: 'No cash or bank accounts found',
            description: 'Load the default chart from the Chart of Accounts tab, or add one here.',
            action: (
              <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
                Add Bank Account
              </Button>
            ),
          }}
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Cash/Bank Account' : 'Add New Cash/Bank Account'}
        size="lg"
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
        <div className="grid grid-cols-1 gap-4">
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
            name="role"
            label="Role"
            value={form.role}
            onChange={(event) => setField('role', event.target.value as BookRole)}
            disabled={protectedEditing}
            required
          >
            {BOOK_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
          <div className="flex items-center mt-2">
            <input
              id="bank_is_active"
              name="is_active"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 border-surface-border rounded focus:ring-indigo-500"
              checked={form.is_active}
              disabled={protectedEditing}
              onChange={(event) => setField('is_active', event.target.checked)}
            />
            <label htmlFor="bank_is_active" className="ml-2 block text-sm text-surface-foreground">
              Is Active Account
            </label>
          </div>
          {protectedEditing ? (
            <p className="text-sm text-surface-muted-fg">
              This is a control account the ledger posts against. Its code, role and active state
              are fixed; its name may be changed.
            </p>
          ) : null}
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
