// ABOUTME: Fee items (vote heads) configuration: lists, creates, edits and deactivates the fee
// ABOUTME: items of an institution through the canonical repository and the fee-item service.

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Checkbox from '@/components/ui/Checkbox';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import DialogForm from '@/components/ui/forms/DialogForm';
import { BanknotesIcon, DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useRBAC } from '@/hooks/useRBAC';
import { useToast } from '@/hooks/useToast';
import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { useEntityQuery } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import {
  CATEGORY_LABELS,
  FEE_ITEM_CATEGORY_VALUES,
  FEE_ITEM_FUNDING_SOURCES,
  FUNDING_SOURCE_LABELS,
  FeeItemService,
  isFeeItemError,
  type FeeItemCategory,
  type FeeItemFundingSource,
  type FeeItemInput,
} from '@/domain/finance/feeItems';

import { useFinanceRepository } from '../../data/canonicalFinance';

/** The permission the finance module needs to change configuration. */
const WRITE_PERMISSION = 'finance.write';

/** One fee item as the grid renders it. */
interface FeeItemRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly categoryLabel: string;
  readonly fundingSourceLabel: string;
  readonly revenueAccountCode: string;
  readonly priority: number;
  readonly active: boolean;
  readonly row: RepositoryRow<'fee_item'>;
}

/** The form's fields, as the dialog holds them. */
interface FeeItemForm {
  code: string;
  name: string;
  category: FeeItemCategory;
  fundingSource: FeeItemFundingSource;
  revenueAccountCode: string;
  priority: string;
  refundable: boolean;
  taxable: boolean;
}

const EMPTY_FORM: FeeItemForm = {
  code: '',
  name: '',
  category: 'tuition',
  fundingSource: 'parent',
  revenueAccountCode: '',
  priority: '',
  refundable: false,
  taxable: false,
};

/** The form field each refusal of the service belongs to. */
const FIELD_ALIASES: Readonly<Record<string, keyof FeeItemForm>> = {
  code: 'code',
  name: 'name',
  category: 'category',
  funding_source: 'fundingSource',
  priority: 'priority',
  revenue_account_code: 'revenueAccountCode',
};

/** The refusal of a failed save, split into a message per field and a general message. */
function describeFailure(error: unknown): {
  readonly fields: Partial<Record<keyof FeeItemForm, string>>;
  readonly message: string;
} {
  if (isFeeItemError(error)) {
    const field = error.field === undefined ? undefined : FIELD_ALIASES[error.field];
    return { fields: field === undefined ? {} : { [field]: error.message }, message: error.message };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { fields: {}, message };
}

export const FeeItemsPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const repository = useFinanceRepository();
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useRBAC();
  const canEdit = hasPermission(WRITE_PERMISSION);

  const [showDeactivated, setShowDeactivated] = useState(false);
  const [editing, setEditing] = useState<RepositoryRow<'fee_item'> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FeeItemForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FeeItemForm, string>>>({});
  const [saving, setSaving] = useState(false);

  const institutions = useEntityQuery(repository, 'institution');
  const items = useEntityQuery(
    repository,
    'fee_item',
    showDeactivated ? { includeDeleted: true } : {},
    { deps: ['fee_item'] }
  );

  const institution = institutions.data?.items[0];
  const institutionId: Id<'institution'> | undefined = institution
    ? asId<'institution'>(institution.id)
    : undefined;

  const service = useMemo(() => new FeeItemService({ repository }), [repository]);

  const rows = useMemo<readonly FeeItemRow[]>(
    () =>
      (items.data?.items ?? [])
        .map((row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          categoryLabel: CATEGORY_LABELS[row.category] ?? row.category,
          fundingSourceLabel: FUNDING_SOURCE_LABELS[row.funding_source] ?? row.funding_source,
          revenueAccountCode: row.revenue_account_code ?? '',
          priority: row.priority,
          active: !row.deleted_at,
          row,
        }))
        .sort((left, right) =>
          left.priority !== right.priority
            ? left.priority - right.priority
            : left.code.localeCompare(right.code)
        ),
    [items.data]
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((row: RepositoryRow<'fee_item'>) => {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      category: row.category,
      fundingSource: row.funding_source,
      revenueAccountCode: row.revenue_account_code ?? '',
      priority: String(row.priority),
      refundable: row.refundable,
      taxable: row.taxable,
    });
    setFieldErrors({});
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
  }, []);

  const setField = useCallback(
    <K extends keyof FeeItemForm>(key: K, value: FeeItemForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
      setFieldErrors((current) => {
        if (current[key] === undefined) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    []
  );

  const handleSubmit = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (institutionId === undefined) {
        toast.showError(t('feeItems.noInstitution', 'No institution is available to add a fee item to.'));
        return;
      }

      const glInput = form.revenueAccountCode.trim();
      // The canonical column is optional but not nullable, so an empty field keeps the stored
      // code; only an item that has none sends nothing at all.
      const revenueAccountCode =
        glInput !== ''
          ? glInput
          : editing !== null && editing.revenue_account_code
            ? null
            : undefined;
      const priority = form.priority.trim() === '' ? undefined : Number(form.priority);

      setSaving(true);
      try {
        if (editing) {
          await service.update(
            asId<'fee_item'>(editing.id),
            {
              code: form.code,
              name: form.name,
              category: form.category,
              fundingSource: form.fundingSource,
              revenueAccountCode,
              priority,
              refundable: form.refundable,
              taxable: form.taxable,
            },
            { expectedVersion: editing.rowVersion }
          );
          toast.showSuccess(t('feeItems.updated', 'The fee item was saved.'));
        } else {
          const input: FeeItemInput = {
            institutionId,
            code: form.code,
            name: form.name,
            category: form.category,
            fundingSource: form.fundingSource,
            ...(revenueAccountCode === null || revenueAccountCode === undefined
              ? {}
              : { revenueAccountCode }),
            ...(priority === undefined ? {} : { priority }),
            refundable: form.refundable,
            taxable: form.taxable,
          };
          await service.create(input);
          toast.showSuccess(t('feeItems.created', 'The fee item was added.'));
        }
        close();
      } catch (error) {
        const failure = describeFailure(error);
        setFieldErrors(failure.fields);
        if (Object.keys(failure.fields).length === 0) toast.showError(failure.message);
      } finally {
        setSaving(false);
      }
    },
    [close, editing, form, institutionId, service, t, toast]
  );

  const handleDeactivate = useCallback(
    async (row: RepositoryRow<'fee_item'>) => {
      const agreed = await confirm({
        variant: 'danger',
        title: t('feeItems.deactivateTitle', 'Deactivate fee item'),
        message: t(
          'feeItems.deactivateMessage',
          'Deactivate {{code}}? It stops being offered for new fee structures and stays on the records that already reference it.',
          { code: row.code }
        ),
      });
      if (!agreed) return;
      try {
        await service.deactivate(asId<'fee_item'>(row.id), { expectedVersion: row.rowVersion });
        toast.showSuccess(t('feeItems.deactivated', 'The fee item was deactivated.'));
      } catch (error) {
        toast.showError(
          error instanceof Error
            ? error.message
            : t('feeItems.deactivateFailed', 'The fee item could not be deactivated.')
        );
      }
    },
    [confirm, service, t, toast]
  );

  const columns: DataGridColumn<FeeItemRow>[] = [
    {
      key: 'code',
      header: t('feeItems.code', 'Code'),
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-mono font-medium">{value}</span>,
    },
    { key: 'name', header: t('feeItems.name', 'Name'), sortable: true, filterable: true },
    { key: 'categoryLabel', header: t('feeItems.category', 'Category'), sortable: true, filterable: true },
    {
      key: 'fundingSourceLabel',
      header: t('feeItems.fundingSource', 'Funding source'),
      sortable: true,
      filterable: true,
    },
    {
      key: 'revenueAccountCode',
      header: t('feeItems.glAccount', 'GL account'),
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-mono">{value || '—'}</span>,
    },
    {
      key: 'priority',
      header: t('feeItems.priority', 'Priority'),
      align: 'right',
      sortable: true,
    },
    {
      key: 'active',
      header: t('feeItems.status', 'Status'),
      sortable: true,
      render: (value) =>
        value ? (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            {t('feeItems.active', 'Active')}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-surface-accent px-2 py-1 text-xs font-medium text-surface-muted-fg">
            {t('feeItems.inactive', 'Deactivated')}
          </span>
        ),
    },
    {
      key: 'actions',
      header: t('feeItems.actions', 'Actions'),
      width: 200,
      render: (_, row) =>
        canEdit && row.active ? (
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openEdit(row.row)}
              leftIcon={<EditIcon className="h-4 w-4" />}
            >
              {t('common.edit', 'Edit')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => void handleDeactivate(row.row)}
              leftIcon={<DeleteIcon className="h-4 w-4" />}
            >
              {t('feeItems.deactivate', 'Deactivate')}
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-3">
      <Card
        title={t('feeItems.title', 'Fee items (vote heads)')}
        info={t(
          'feeItems.subtitle',
          'The vote heads a school bills, each with the account a posting credits, the order allocation follows and who funds it.'
        )}
        actions={
          canEdit ? (
            <div className="flex items-center gap-3">
              <Checkbox
                checked={showDeactivated}
                onChange={setShowDeactivated}
                id="fee-items-show-deactivated"
              >
                {t('feeItems.showDeactivated', 'Show deactivated')}
              </Checkbox>
              <Button onClick={openCreate} leftIcon={<PlusIcon className="h-5 w-5" />}>
                {t('feeItems.add', 'Add fee item')}
              </Button>
            </div>
          ) : (
            <Checkbox
              checked={showDeactivated}
              onChange={setShowDeactivated}
              id="fee-items-show-deactivated"
            >
              {t('feeItems.showDeactivated', 'Show deactivated')}
            </Checkbox>
          )
        }
      >
        <DataGrid
          columns={columns}
          data={[...rows]}
          sortable
          filterable
          loading={items.status === 'loading'}
          emptyState={{
            icon: <BanknotesIcon className="h-12 w-12 text-surface-muted-fg" />,
            title: t('feeItems.emptyTitle', 'No fee items yet'),
            description: t(
              'feeItems.emptyDescription',
              'Add the vote heads this school bills, such as tuition, boarding and activity.'
            ),
            ...(canEdit
              ? {
                  action: (
                    <Button onClick={openCreate} leftIcon={<PlusIcon className="h-5 w-5" />}>
                      {t('feeItems.add', 'Add fee item')}
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
        title={editing ? t('feeItems.editTitle', 'Edit fee item') : t('feeItems.createTitle', 'Add fee item')}
        onSubmit={handleSubmit}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={() => void handleSubmit()} loading={saving}>
              {editing ? t('common.saveChanges', 'Save changes') : t('feeItems.add', 'Add fee item')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            name="code"
            label={t('feeItems.code', 'Code')}
            value={form.code}
            onChange={(event) => setField('code', event.target.value)}
            error={fieldErrors.code}
            required
            helperText={t('feeItems.codeHint', 'Upper case letters, digits and _, e.g. TUITION')}
          />
          <Input
            name="name"
            label={t('feeItems.name', 'Name')}
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            error={fieldErrors.name}
            required
          />
          <Select
            name="category"
            label={t('feeItems.category', 'Category')}
            value={form.category}
            onChange={(event) => setField('category', event.target.value as FeeItemCategory)}
            error={fieldErrors.category}
            required
          >
            {FEE_ITEM_CATEGORY_VALUES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
          <Select
            name="fundingSource"
            label={t('feeItems.fundingSource', 'Funding source')}
            value={form.fundingSource}
            onChange={(event) => setField('fundingSource', event.target.value as FeeItemFundingSource)}
            error={fieldErrors.fundingSource}
            required
          >
            {FEE_ITEM_FUNDING_SOURCES.map((source) => (
              <option key={source} value={source}>
                {FUNDING_SOURCE_LABELS[source]}
              </option>
            ))}
          </Select>
          <Input
            name="revenueAccountCode"
            label={t('feeItems.glAccount', 'GL account')}
            value={form.revenueAccountCode}
            onChange={(event) => setField('revenueAccountCode', event.target.value)}
            error={fieldErrors.revenueAccountCode}
            helperText={t(
              'feeItems.glAccountHint',
              'The revenue account a posting for this item credits. It cannot be cleared once set.'
            )}
          />
          <Input
            name="priority"
            label={t('feeItems.priority', 'Priority')}
            type="number"
            min={0}
            value={form.priority}
            onChange={(event) => setField('priority', event.target.value)}
            error={fieldErrors.priority}
            helperText={t(
              'feeItems.priorityHint',
              'Allocation follows the lowest number first. Unique among active items.'
            )}
          />
          <div className="flex flex-col gap-2 md:col-span-2">
            <Checkbox
              checked={form.refundable}
              onChange={(checked) => setField('refundable', checked)}
              id="fee-item-refundable"
            >
              {t('feeItems.refundable', 'Refundable')}
            </Checkbox>
            <Checkbox
              checked={form.taxable}
              onChange={(checked) => setField('taxable', checked)}
              id="fee-item-taxable"
            >
              {t('feeItems.taxable', 'Taxable')}
            </Checkbox>
          </div>
        </div>
      </DialogForm>
    </div>
  );
};

const FeeItemsPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <FeeItemsPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default FeeItemsPage;
