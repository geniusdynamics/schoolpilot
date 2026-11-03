// ABOUTME: Student transport assignments: learners are assigned to a canonical route for an
// ABOUTME: academic period, and the route's charge is the one the Routes tab bills for the term.

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert } from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { SchemaEntityForm } from '@/components/ui/forms';
import { DeleteIcon, PlusIcon, TruckIcon } from '@/components/ui/icons';
import { useCan } from '@/data/auth/useCan';
import { useEntityQuery, useLookup } from '@/data/query';
import { createSchemaFor, type RepositoryRow } from '@/data/repository';
import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { asId } from '@/domain/ids';
import { useToast } from '@/hooks/useToast';

import { toFormLookup, useFinanceRepository } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { messageOf } from '../data/errors';

const WRITE_PERMISSION = 'finance.write';

export interface StudentTransportAssignmentsPageContentProps {
  /** Reserved for a host that opens its own database; the page itself only reads the repository. */
  readonly adapter?: SqliteAdapter | null;
}

interface AssignmentRow {
  readonly id: string;
  readonly learnerName: string;
  readonly routeName: string;
  readonly periodName: string;
  readonly status: string;
  readonly row: RepositoryRow<'transport_assignment'>;
}

export const StudentTransportAssignmentsPageContent: React.FC<
  StudentTransportAssignmentsPageContentProps
> = () => {
  const { t } = useTranslation('finance');
  const repository = useFinanceRepository();
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan(WRITE_PERMISSION);

  const institutions = useEntityQuery(repository, 'institution');
  const routes = useEntityQuery(repository, 'transport_route', {}, {
    allPages: true,
    deps: ['transport_route'],
  });
  const periods = useEntityQuery(repository, 'academic_period', {}, {
    allPages: true,
    deps: ['academic_period'],
  });
  const assignments = useEntityQuery(repository, 'transport_assignment', {}, {
    allPages: true,
    deps: ['transport_assignment'],
  });
  const learnerLookup = useLookup(repository, 'learner', {});
  const periodLookup = useLookup(repository, 'academic_period', {});

  const institution = institutions.data?.items[0];
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
  const activeRoutes = useMemo(
    () => routeRows.filter((route) => route.active),
    [routeRows]
  );
  const openPeriods = useMemo(
    () => periodRows.filter((period) => period.status !== 'closed'),
    [periodRows]
  );
  const routeById = useMemo(() => {
    const map = new Map<string, RepositoryRow<'transport_route'>>();
    for (const route of routeRows) map.set(route.id, route);
    return map;
  }, [routeRows]);

  const rows = useMemo<readonly AssignmentRow[]>(
    () =>
      [...(assignments.data?.items ?? [])]
        .map((assignment) => ({
          id: assignment.id,
          learnerName: learnerLookup.label(
            asId<'learner'>(assignment.learner_id),
            assignment.learner_id
          ),
          routeName: routeById.get(assignment.route_id)?.name ?? assignment.route_id,
          periodName: periodLookup.label(
            asId<'academic_period'>(assignment.academic_period_id),
            assignment.academic_period_id
          ),
          status: assignment.status,
          row: assignment,
        }))
        .sort((left, right) =>
          `${left.periodName}:${left.routeName}:${left.learnerName}`.localeCompare(
            `${right.periodName}:${right.routeName}:${right.learnerName}`
          )
        ),
    [assignments.data, learnerLookup, periodLookup, routeById]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const defaultPeriod =
    openPeriods.find((period) => period.status === 'current') ?? openPeriods[0] ?? null;

  const openAssign = useCallback(() => {
    if (!institution) {
      toast.showError(
        t(
          'transportAssignments.noInstitution',
          'The school has no institution record to assign a learner in.'
        )
      );
      return;
    }
    setIsOpen(true);
  }, [institution, t, toast]);

  const save = useCallback(
    async (values: Record<string, unknown>) => {
      if (!institution) throw new Error('The school has no institution record.');
      const learnerId = String(values.learner_id ?? '');
      const routeId = String(values.route_id ?? '');
      const academicPeriodId = String(values.academic_period_id ?? '');
      if (!learnerId || !routeId || !academicPeriodId) {
        throw new Error(
          t(
            'transportAssignments.validation',
            'Choose the learner, the route and the term for the assignment.'
          )
        );
      }
      setSaving(true);
      try {
        await repository.create('transport_assignment', {
          institution_id: institution.id,
          learner_id: learnerId,
          route_id: routeId,
          academic_period_id: academicPeriodId,
          status: 'active',
        });
        toast.showSuccess(t('transportAssignments.saved', 'The learner was assigned to the route.'));
        setIsOpen(false);
      } finally {
        setSaving(false);
      }
    },
    [institution, repository, t, toast]
  );

  const remove = useCallback(
    async (row: AssignmentRow) => {
      const agreed = await confirm({
        variant: 'danger',
        title: t('transportAssignments.removeTitle', 'Remove transport assignment'),
        message: t(
          'transportAssignments.removeMessage',
          'Remove {{learner}} from {{route}} for {{period}}? The charge the school already raised for that term is not changed.',
          {
            learner: row.learnerName,
            route: row.routeName,
            period: row.periodName,
          }
        ),
        confirmLabel: t('transportAssignments.remove', 'Remove'),
      });
      if (!agreed) return;
      try {
        await repository.remove('transport_assignment', asId<'transport_assignment'>(row.id), {
          reason: 'removed on the transport assignments screen',
        });
        toast.showSuccess(
          t('transportAssignments.removed', 'The learner was removed from the route.')
        );
      } catch (error) {
        toast.showError(messageOf(error));
      }
    },
    [confirm, repository, t, toast]
  );

  const columns: DataGridColumn<AssignmentRow>[] = [
    {
      key: 'learnerName',
      header: t('transportAssignments.learner', 'Learner'),
      sortable: true,
      filterable: true,
      width: 220,
      render: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: 'routeName',
      header: t('transportAssignments.route', 'Route'),
      sortable: true,
      filterable: true,
      render: (value) => <span className="text-primary-600">{String(value)}</span>,
    },
    {
      key: 'periodName',
      header: t('transportAssignments.period', 'Term'),
      sortable: true,
      filterable: true,
      render: (value) => <span className="text-purple-600">{String(value)}</span>,
    },
    {
      key: 'status',
      header: t('transportAssignments.status', 'Status'),
      sortable: true,
      render: (value) => (
        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium capitalize text-green-800">
          {String(value)}
        </span>
      ),
    },
    ...(canWrite
      ? [
          {
            key: 'actions',
            header: t('transportAssignments.actions', 'Actions'),
            width: 140,
            render: (_value: unknown, row: AssignmentRow) => (
              <Button
                size="sm"
                variant="danger"
                onClick={() => void remove(row)}
                leftIcon={<DeleteIcon className="h-4 w-4" />}
              >
                {t('transportAssignments.remove', 'Remove')}
              </Button>
            ),
          } satisfies DataGridColumn<AssignmentRow>,
        ]
      : []),
  ];

  const noRoutes = routeRows.length === 0;
  const noPeriods = openPeriods.length === 0;
  const noLearners = learnerLookup.options.length === 0;
  const assignmentEmptyState = noRoutes
    ? {
        icon: <TruckIcon className="h-12 w-12 text-surface-muted-fg" />,
        title: t('transportAssignments.noRoutesTitle', 'No transport routes yet'),
        description: t(
          'transportAssignments.noRoutesDescription',
          'Add a route on the Routes tab before assigning a learner to it.'
        ),
      }
    : noPeriods
      ? {
          icon: <TruckIcon className="h-12 w-12 text-surface-muted-fg" />,
          title: t('transportAssignments.noPeriodsTitle', 'No term to assign'),
          description: t(
            'transportAssignments.noPeriodsDescription',
            'The calendar has no open academic period, so there is no term an assignment can belong to.'
          ),
        }
      : noLearners
        ? {
            icon: <TruckIcon className="h-12 w-12 text-surface-muted-fg" />,
            title: t('transportAssignments.noLearnersTitle', 'No learners yet'),
            description: t(
              'transportAssignments.noLearnersDescription',
              'Admit a learner before assigning them to a transport route.'
            ),
          }
        : {
            icon: <TruckIcon className="h-12 w-12 text-surface-muted-fg" />,
            title: t('transportAssignments.emptyTitle', 'No learners assigned'),
            description: t(
              'transportAssignments.emptyDescription',
              'Assign a learner to a route and the Routes tab can bill that route for the term.'
            ),
            ...(canWrite && institution
              ? {
                  action: (
                    <Button onClick={openAssign} leftIcon={<PlusIcon className="h-5 w-5" />}>
                      {t('transportAssignments.assign', 'Assign learner')}
                    </Button>
                  ),
                }
              : {}),
          };

  const loading =
    routes.status === 'loading' ||
    periods.status === 'loading' ||
    assignments.status === 'loading' ||
    learnerLookup.status === 'loading';

  const formValues = {
    institution_id: institution?.id ?? '',
    learner_id: '',
    route_id: activeRoutes[0]?.id ?? '',
    academic_period_id: defaultPeriod?.id ?? '',
    status: 'active',
  };

  const periodFormLookup = {
    ...toFormLookup(periodLookup),
    options: openPeriods,
  };

  return (
    <div className="space-y-3">
      {institutions.status === 'error' || assignments.status === 'error' ? (
        <Alert variant="destructive">
          {messageOf(institutions.error ?? assignments.error)}
        </Alert>
      ) : null}

      <Card
        title={t('transportAssignments.title', 'Student transport assignments')}
        info={t(
          'transportAssignments.subtitle',
          'Who rides which route this term. The Routes tab bills a route for every learner assigned to it.'
        )}
        actions={
          canWrite ? (
            <Button
              onClick={openAssign}
              leftIcon={<PlusIcon className="h-5 w-5" />}
              disabled={noRoutes || noPeriods || noLearners}
            >
              {t('transportAssignments.assign', 'Assign learner')}
            </Button>
          ) : null
        }
      >
        <DataGrid
          columns={columns}
          data={[...rows]}
          sortable
          filterable
          loading={loading}
          emptyState={assignmentEmptyState}
        />
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('transportAssignments.assignTitle', 'Assign a learner to a route')}
        size="lg"
      >
        {isOpen ? (
          <SchemaEntityForm
            schema={createSchemaFor('transport_assignment')}
            recordKey="new"
            initialValues={formValues}
            fields={[
              {
                path: 'learner_id',
                label: t('transportAssignments.learner', 'Learner'),
                order: 1,
                widget: 'entity',
                lookupKey: 'learner',
                required: true,
              },
              {
                path: 'route_id',
                label: t('transportAssignments.route', 'Route'),
                order: 2,
                widget: 'select',
                required: true,
                options: activeRoutes.map((route) => ({
                  value: route.id,
                  label: `${route.name} — ${route.revenue_account_code}`,
                })),
              },
              {
                path: 'academic_period_id',
                label: t('transportAssignments.period', 'Term'),
                order: 3,
                widget: 'entity',
                lookupKey: 'academic_period',
                required: true,
              },
            ]}
            lookups={{
              learner: toFormLookup(learnerLookup),
              academic_period: periodFormLookup,
            }}
            submitting={saving}
            submitLabel={t('transportAssignments.assign', 'Assign learner')}
            cancelLabel={t('common.cancel', 'Cancel')}
            onCancel={() => setIsOpen(false)}
            onSubmit={(values) => save(values as Record<string, unknown>)}
          />
        ) : null}
      </Modal>
    </div>
  );
};

const StudentTransportAssignmentsPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <StudentTransportAssignmentsPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default StudentTransportAssignmentsPage;
