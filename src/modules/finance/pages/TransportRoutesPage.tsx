// ABOUTME: Transport routes: the canonical route list with its cost and revenue account, the form
// ABOUTME: that creates and edits one, and the action that bills its assigned learners for a term.

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert } from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { SchemaEntityForm } from '@/components/ui/forms';
import { BanknotesIcon, EditIcon, PlusIcon, TruckIcon } from '@/components/ui/icons';
import { useCan } from '@/data/auth/useCan';
import { useEntityQuery } from '@/data/query';
import {
  createSchemaFor,
  toWritableValues,
  updateSchemaFor,
  type RepositoryRow,
  type WriteOptions,
} from '@/data/repository';
import { useCanonicalSessionActor } from '@/data/useCanonicalSessionActor';
import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { asId } from '@/domain/ids';
import {
  TransportBillingService,
  type TransportBillingResult,
} from '@/domain/finance/transport';
import type { Money } from '@/domain/schema/common';
import { useToast } from '@/hooks/useToast';

import {
  FINANCE_CURRENCY,
  formatMoney,
  money,
  useFinanceRepository,
} from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { messageOf } from '../data/errors';
import { useTransportBillingRuntime } from '../data/useTransportBillingRuntime';

const WRITE_PERMISSION = 'finance.write';

export interface TransportRoutesPageContentProps {
  /** The storage the billing run numbers and posts over; tests hand the adapter they opened. */
  readonly adapter?: SqliteAdapter | null;
}

const BillingResultPanel: React.FC<{ readonly result: TransportBillingResult }> = ({ result }) => (
  <div role="status" aria-live="polite" className="mt-4 space-y-3 text-sm">
    <p className="font-medium text-surface-foreground">
      {result.chargedCount} charged, {result.skippedCount} skipped
      {result.chargedCount > 0 ? ` — ${formatMoney(result.totalCharged)} billed` : ''}.
    </p>
    {result.charged.length > 0 ? (
      <ul className="space-y-1 text-surface-muted-fg">
        {result.charged.map((charge) => (
          <li key={charge.learnerId}>
            {charge.learnerName} — invoice {charge.invoiceNumber} · {formatMoney(charge.amount)}
          </li>
        ))}
      </ul>
    ) : null}
    {result.skipped.length > 0 ? (
      <ul className="space-y-1 text-amber-700 dark:text-amber-400">
        {result.skipped.map((skip) => (
          <li key={`${skip.learnerId}:${skip.reason}`}>{skip.message}</li>
        ))}
      </ul>
    ) : null}
  </div>
);

export const TransportRoutesPageContent: React.FC<TransportRoutesPageContentProps> = ({
  adapter,
}) => {
  const { t } = useTranslation('finance');
  const repository = useFinanceRepository();
  const toast = useToast();
  const canWrite = useCan(WRITE_PERMISSION);
  const actor = useCanonicalSessionActor();
  const runtime = useTransportBillingRuntime(adapter);

  const institutions = useEntityQuery(repository, 'institution');
  const routes = useEntityQuery(repository, 'transport_route', {}, {
    allPages: true,
    deps: ['transport_route'],
  });
  const periods = useEntityQuery(repository, 'academic_period', {}, {
    allPages: true,
    deps: ['academic_period'],
  });

  const institution = institutions.data?.items[0];
  const currency = institution?.base_currency ?? FINANCE_CURRENCY;
  const routeRows = useMemo(
    () =>
      [...(routes.data?.items ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    [routes.data]
  );
  const periodRows = useMemo(
    () =>
      [...(periods.data?.items ?? [])].sort((left, right) =>
        left.start_date.localeCompare(right.start_date)
      ),
    [periods.data]
  );

  const [editing, setEditing] = useState<RepositoryRow<'transport_route'> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [billingRoute, setBillingRoute] = useState<RepositoryRow<'transport_route'> | null>(null);
  const [billingPeriodId, setBillingPeriodId] = useState('');
  const [billingResult, setBillingResult] = useState<TransportBillingResult | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billing, setBilling] = useState(false);

  const openCreate = useCallback(() => {
    if (!institution) {
      toast.showError(
        t('transportRoutes.noInstitution', 'The school has no institution record to add a route to.')
      );
      return;
    }
    setEditing(null);
    setIsFormOpen(true);
  }, [institution, t, toast]);

  const openEdit = useCallback((row: RepositoryRow<'transport_route'>) => {
    setEditing(row);
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditing(null);
  }, []);

  const save = useCallback(
    async (values: Record<string, unknown>) => {
      const cost = values.cost as Money | undefined;
      if (!cost || typeof cost.amount_minor !== 'number') {
        throw new Error(t('transportRoutes.costRequired', 'Enter the route cost for the term.'));
      }
      const payload = {
        name: String(values.name ?? '').trim(),
        cost,
        revenue_account_code: String(values.revenue_account_code ?? '').trim(),
        active: Boolean(values.active),
      };
      const options: WriteOptions =
        actor.actorId === '' ? {} : { actor: actor.actorId, reason: 'transport route form' };

      setSaving(true);
      try {
        if (editing) {
          await repository.update('transport_route', asId<'transport_route'>(editing.id), payload, {
            expectedVersion: editing.rowVersion,
            ...options,
          });
          toast.showSuccess(t('transportRoutes.updated', 'The transport route was saved.'));
        } else {
          if (!institution) throw new Error('The school has no institution record.');
          await repository.create(
            'transport_route',
            {
              institution_id: institution.id,
              ...payload,
            },
            options
          );
          toast.showSuccess(t('transportRoutes.created', 'The transport route was added.'));
        }
        closeForm();
      } finally {
        setSaving(false);
      }
    },
    [actor.actorId, closeForm, editing, institution, repository, t, toast]
  );

  const openBilling = useCallback(
    (row: RepositoryRow<'transport_route'>) => {
      setBillingRoute(row);
      setBillingResult(null);
      setBillingError(null);
      const preferred =
        periodRows.find((period) => period.status === 'current') ?? periodRows[0] ?? null;
      setBillingPeriodId(preferred?.id ?? '');
    },
    [periodRows]
  );

  const runBilling = useCallback(async () => {
    if (!billingRoute) return;
    if (!billingPeriodId) {
      setBillingError(t('transportRoutes.choosePeriod', 'Choose the term to bill.'));
      return;
    }
    if (runtime.status !== 'ready' || !runtime.numbers) {
      setBillingError(
        t(
          'transportRoutes.billingUnavailable',
          'Billing needs the school ledger and the document-number ledger; they are not open yet.'
        )
      );
      return;
    }

    setBilling(true);
    setBillingResult(null);
    setBillingError(null);
    try {
      const service = new TransportBillingService({
        repository,
        numbers: runtime.numbers,
        ...(actor.actorId === '' ? {} : { actor: actor.actorId }),
      });
      const result = await service.billRoute({
        institutionId: billingRoute.institution_id,
        routeId: billingRoute.id,
        academicPeriodId: billingPeriodId,
        ...(actor.actorId === '' ? {} : { actor: actor.actorId }),
      });
      setBillingResult(result);
      toast.showSuccess(
        `${result.chargedCount} transport charge${result.chargedCount === 1 ? '' : 's'} posted for ${result.periodName}.`
      );
    } catch (error) {
      setBillingError(messageOf(error));
    } finally {
      setBilling(false);
    }
  }, [actor.actorId, billingPeriodId, billingRoute, repository, runtime, t, toast]);

  const columns: DataGridColumn<RepositoryRow<'transport_route'>>[] = [
    {
      key: 'name',
      header: t('transportRoutes.name', 'Route'),
      sortable: true,
      filterable: true,
      width: 240,
      render: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: 'cost',
      header: t('transportRoutes.cost', 'Cost per term'),
      sortable: true,
      render: (_value, row) => (
        <span className="font-mono text-green-600">{formatMoney(row.cost)}</span>
      ),
    },
    {
      key: 'revenue_account_code',
      header: t('transportRoutes.revenueAccount', 'Revenue account'),
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-mono text-primary-600">{String(value)}</span>,
    },
    {
      key: 'active',
      header: t('transportRoutes.status', 'Status'),
      sortable: true,
      render: (_value, row) =>
        row.active ? (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            {t('transportRoutes.active', 'Active')}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-surface-accent px-2 py-1 text-xs font-medium text-surface-muted-fg">
            {t('transportRoutes.inactive', 'Inactive')}
          </span>
        ),
    },
    ...(canWrite
      ? [
          {
            key: 'actions',
            header: t('transportRoutes.actions', 'Actions'),
            width: 260,
            render: (_value: unknown, row: RepositoryRow<'transport_route'>) => (
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEdit(row)}
                  leftIcon={<EditIcon className="h-4 w-4" />}
                >
                  {t('common.edit', 'Edit')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!row.active}
                  onClick={() => openBilling(row)}
                  leftIcon={<BanknotesIcon className="h-4 w-4" />}
                >
                  {t('transportRoutes.bill', 'Bill this term')}
                </Button>
              </div>
            ),
          } satisfies DataGridColumn<RepositoryRow<'transport_route'>>,
        ]
      : []),
  ];

  const formValues = editing
    ? toWritableValues(editing)
    : {
        institution_id: institution?.id ?? '',
        name: '',
        cost: money(0, currency),
        revenue_account_code: '',
        active: true,
      };

  return (
    <div className="space-y-3">
      {institutions.status === 'success' && !institution ? (
        <Alert variant="warning">
          {t(
            'transportRoutes.noInstitution',
            'The school has no institution record to add a route to.'
          )}
        </Alert>
      ) : null}
      {institutions.status === 'error' || routes.status === 'error' ? (
        <Alert variant="destructive">
          {messageOf(institutions.error ?? routes.error)}
        </Alert>
      ) : null}

      <Card
        title={t('transportRoutes.title', 'Transport routes')}
        info={t(
          'transportRoutes.subtitle',
          'Each route carries the cost one learner is charged for a term and the revenue account that charge credits.'
        )}
        actions={
          canWrite ? (
            <Button onClick={openCreate} leftIcon={<PlusIcon className="h-5 w-5" />}>
              {t('transportRoutes.add', 'Add transport route')}
            </Button>
          ) : null
        }
      >
        <DataGrid
          columns={columns}
          data={routeRows}
          sortable
          filterable
          loading={routes.status === 'loading'}
          emptyState={{
            icon: <TruckIcon className="h-12 w-12 text-surface-muted-fg" />,
            title: t('transportRoutes.emptyTitle', 'No transport routes yet'),
            description: t(
              'transportRoutes.emptyDescription',
              'Add the routes the school runs; a learner assigned to one is charged its cost for the term.'
            ),
            ...(canWrite && institution
              ? {
                  action: (
                    <Button onClick={openCreate} leftIcon={<PlusIcon className="h-5 w-5" />}>
                      {t('transportRoutes.add', 'Add transport route')}
                    </Button>
                  ),
                }
              : {}),
          }}
        />
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={
          editing
            ? t('transportRoutes.editTitle', 'Edit transport route')
            : t('transportRoutes.createTitle', 'Add transport route')
        }
        size="lg"
      >
        {isFormOpen ? (
          <SchemaEntityForm
            schema={
              editing ? updateSchemaFor('transport_route') : createSchemaFor('transport_route')
            }
            recordKey={editing?.id ?? 'new'}
            initialValues={formValues}
            fields={[
              {
                path: 'name',
                label: t('transportRoutes.name', 'Route'),
                order: 1,
                required: true,
              },
              {
                path: 'cost',
                label: t('transportRoutes.costLabel', 'Cost per term ({{currency}})', {
                  currency,
                }),
                order: 2,
                widget: 'money',
                currency,
                required: true,
              },
              {
                path: 'revenue_account_code',
                label: t('transportRoutes.revenueAccount', 'Revenue account'),
                order: 3,
                required: true,
                help: t(
                  'transportRoutes.revenueAccountHelp',
                  'The GL revenue account the charge credits, e.g. 4100.'
                ),
              },
              {
                path: 'active',
                label: t('transportRoutes.active', 'Active'),
                order: 4,
                widget: 'checkbox',
              },
            ]}
            submitting={saving}
            submitLabel={
              editing
                ? t('common.saveChanges', 'Save changes')
                : t('transportRoutes.add', 'Add transport route')
            }
            cancelLabel={t('common.cancel', 'Cancel')}
            onCancel={closeForm}
            onSubmit={(values) => save(values as Record<string, unknown>)}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={billingRoute !== null}
        onClose={() => setBillingRoute(null)}
        title={t('transportRoutes.billTitle', 'Bill this term')}
        subtitle={billingRoute?.name}
        size="md"
      >
        {billingRoute ? (
          <div className="space-y-4">
            <p className="text-sm text-surface-muted-fg">
              {t(
                'transportRoutes.billExplanation',
                'One charge is raised for every learner assigned to this route who is enrolled in the term and has not already been charged for it.'
              )}
            </p>
            {periodRows.length === 0 ? (
              <Alert variant="warning">
                {t(
                  'transportRoutes.noPeriods',
                  'No academic period is set up yet, so there is no term to bill.'
                )}
              </Alert>
            ) : (
              <Select
                name="billing_period"
                label={t('transportRoutes.period', 'Term')}
                value={billingPeriodId}
                onChange={(event) => setBillingPeriodId(event.target.value)}
                disabled={billing}
              >
                {periodRows.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                    {period.status === 'closed' ? ' (closed)' : ''}
                  </option>
                ))}
              </Select>
            )}
            {runtime.status === 'loading' ? (
              <p className="text-sm text-surface-muted-fg">
                {t('transportRoutes.preparingLedger', 'Preparing the ledger…')}
              </p>
            ) : null}
            {runtime.status === 'unavailable' ? (
              <Alert variant="warning">
                {t(
                  'transportRoutes.ledgerUnavailable',
                  'Billing needs the school database and its ledger; they are not open in this view.'
                )}
              </Alert>
            ) : null}
            {runtime.status === 'error' ? (
              <Alert variant="destructive">{messageOf(runtime.error)}</Alert>
            ) : null}
            {billingError ? <Alert variant="destructive">{billingError}</Alert> : null}
            {billingResult ? <BillingResultPanel result={billingResult} /> : null}

            <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
              <Button variant="secondary" onClick={() => setBillingRoute(null)}>
                {t('common.close', 'Close')}
              </Button>
              {canWrite ? (
                <Button
                  onClick={() => void runBilling()}
                  loading={billing}
                  disabled={periodRows.length === 0 || runtime.status !== 'ready'}
                >
                  {t('transportRoutes.billSubmit', 'Bill this term')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

const TransportRoutesPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <TransportRoutesPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default TransportRoutesPage;
