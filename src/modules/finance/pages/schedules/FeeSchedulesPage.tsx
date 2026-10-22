// ABOUTME: The fee-schedule matrix editor: a bursar's grid over the canonical fee_schedule and
// ABOUTME: fee_schedule_line entities, with the dimensions selectable, the spec §2.2 example loadable,
// ABOUTME: per-cell validation, the maker-checker approval actions and the version history.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon } from '@/components/ui/icons';
import { PERMISSIONS, type Permission, type Role } from '@/data/auth';
import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { useEntityQuery } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import {
  FeeScheduleService,
  SPEC_EXAMPLE_ITEMS,
  SPEC_EXAMPLE_LEVELS,
  buildSpecExampleVersion,
  cellKeyOf,
  createWorkflowApprovalGateway,
  effectiveLineAddress,
  headerOf,
  isScheduleError,
  type MatrixHeader,
  type ResolvedAddress,
  type ScheduleApprovalGateway,
  type ScheduleCellInput,
  type ScheduleLineInput,
  type ScheduleResidenceStatus,
  type ScheduleStore,
  type SpecExampleIds,
  type SpecItemCode,
  type SpecLevel,
} from '@/domain/finance/schedules';
import { asId, generateUuidv7, type Id } from '@/domain/ids';
import { fromMajor, isCurrencyCode, toDecimalString, type Money } from '@/domain/money';
import type { WorkflowActor } from '@/domain/workflows';
import { useRBAC } from '@/hooks/useRBAC';
import { useToast } from '@/hooks/useToast';

import { formatMoneyMinor, useFinanceRepository } from '../../data/canonicalFinance';

/** The permission that changes a schedule; the one that approves it is the workflow's own. */
const WRITE_PERMISSION = 'finance.write';
const APPROVE_PERMISSION = 'fee_schedule.approve';

/** The role names of the app's RBAC that answer to the canonical role of the workflow engine. */
const ROLE_ALIASES: Readonly<Record<string, Role>> = {
  super_admin: 'administrator',
  administrator: 'administrator',
  head_teacher: 'head_teacher',
  accountant: 'accountant',
  finance_officer: 'accountant',
  teacher: 'teacher',
  registrar: 'registrar',
};

/** The key a browser's actor id is kept under, standing in for a session provider. */
const ACTOR_KEY = 'schoolpilot.actorId';

/**
 * The id this browser acts as.
 *
 * A session provider has not landed, so the editor keeps one id per browser: two browsers are two
 * makers, which is what lets maker-checker be exercised before a login exists.
 */
function browserActorId(): string {
  try {
    const stored = window.localStorage.getItem(ACTOR_KEY);
    if (stored) return stored;
    const created = generateUuidv7();
    window.localStorage.setItem(ACTOR_KEY, created);
    return created;
  } catch {
    return 'ui-session';
  }
}

/** The workflow actor of the current session, read from the app's RBAC. */
function useScheduleActor(): WorkflowActor {
  const { userRoles, hasPermission } = useRBAC();
  return useMemo(() => {
    const roles = [...new Set(userRoles.map((role) => ROLE_ALIASES[role]).filter(Boolean))] as Role[];
    const permissions = PERMISSIONS.filter((permission: Permission) => hasPermission(permission));
    return { id: browserActorId(), roles, permissions };
  }, [userRoles, hasPermission]);
}

/** A cell of the grid: its address and the amount of every fee item it prices. */
interface GridCell {
  readonly key: string;
  readonly address: ResolvedAddress;
  readonly levelId: string;
  readonly residence: ScheduleResidenceStatus;
  readonly amounts: Readonly<Record<string, Money>>;
}

/** The grid of one version: its cells and the fee items it prices. */
interface ScheduleGrid {
  readonly header: MatrixHeader;
  readonly cells: readonly GridCell[];
  readonly itemIds: readonly string[];
  /** Lines that name no level or residence a multi-value schedule can place. */
  readonly unplaced: number;
}

/** Groups a version's lines into the cells of the matrix. */
function gridOf(schedule: RepositoryRow<'fee_schedule'>, lines: readonly RepositoryRow<'fee_schedule_line'>[]): ScheduleGrid {
  const header = headerOf(schedule);
  const byCell = new Map<string, { address: ResolvedAddress; amounts: Record<string, Money> }>();
  const items = new Set<string>();
  let unplaced = 0;
  for (const line of lines) {
    const address = effectiveLineAddress(header, line);
    if (address === null) {
      unplaced += 1;
      continue;
    }
    const key = cellKeyOf(address);
    const cell = byCell.get(key) ?? { address, amounts: {} };
    cell.amounts[line.fee_item_id] = line.amount as Money;
    byCell.set(key, cell);
    items.add(line.fee_item_id);
  }
  const cells = [...byCell.entries()]
    .map(([key, cell]) => ({
      key,
      address: cell.address,
      levelId: cell.address.levelId,
      residence: cell.address.residence,
      amounts: cell.amounts,
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
  return { header, cells, itemIds: [...items].sort(), unplaced };
}

/** The cell dimensions a version spans, as the grid renders its columns. */
function columnsOf(
  schedule: RepositoryRow<'fee_schedule'>
): readonly { readonly levelId: string; readonly residence: ScheduleResidenceStatus }[] {
  const columns: { levelId: string; residence: ScheduleResidenceStatus }[] = [];
  for (const levelId of schedule.level_ids) {
    for (const residence of schedule.residence_statuses) {
      columns.push({ levelId, residence });
    }
  }
  return columns;
}

export interface FeeSchedulesPageContentProps {
  /** The service, overridden by a test; production builds it over the repository and the engine. */
  readonly service?: FeeScheduleService;
}

export const FeeSchedulesPageContent: React.FC<FeeSchedulesPageContentProps> = ({ service }) => {
  const { t } = useTranslation('finance');
  const repository = useFinanceRepository();
  const toast = useToast();
  const { hasPermission } = useRBAC();
  const actor = useScheduleActor();
  const canWrite = hasPermission(WRITE_PERMISSION);
  const canApprove = hasPermission(APPROVE_PERMISSION);

  const built = useMemo(() => {
    const store = repository as unknown as ScheduleStore;
    const approvals: ScheduleApprovalGateway = createWorkflowApprovalGateway(
      repository as unknown as Parameters<typeof createWorkflowApprovalGateway>[0]
    );
    return new FeeScheduleService({ store, approvals });
  }, [repository]);
  const active = service ?? built;

  const schedulesQuery = useEntityQuery(repository, 'fee_schedule');
  const linesQuery = useEntityQuery(repository, 'fee_schedule_line');
  const itemsQuery = useEntityQuery(repository, 'fee_item');
  const levelsQuery = useEntityQuery(repository, 'level');
  const categoriesQuery = useEntityQuery(repository, 'fee_category');
  const campusesQuery = useEntityQuery(repository, 'campus');
  const institutionsQuery = useEntityQuery(repository, 'institution');

  const schedules = useMemo(
    () =>
      [...(schedulesQuery.data?.items ?? [])].sort(
        (left, right) => right.name.localeCompare(left.name) || right.version - left.version
      ),
    [schedulesQuery.data]
  );
  const lines = useMemo(() => linesQuery.data?.items ?? [], [linesQuery.data]);
  const items = useMemo(() => itemsQuery.data?.items ?? [], [itemsQuery.data]);
  const levels = useMemo(() => levelsQuery.data?.items ?? [], [levelsQuery.data]);
  const categories = useMemo(() => categoriesQuery.data?.items ?? [], [categoriesQuery.data]);
  const campuses = useMemo(() => campusesQuery.data?.items ?? [], [campusesQuery.data]);
  const institution = institutionsQuery.data?.items[0] ?? null;
  const currency = institution?.base_currency ?? 'KES';

  const [selectedId, setSelectedId] = useState<string>('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [upliftPercent, setUpliftPercent] = useState('10');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (selectedId === '' && schedules.length > 0) setSelectedId(schedules[0].id);
  }, [schedules, selectedId]);

  const selected = schedules.find((schedule) => schedule.id === selectedId) ?? null;
  const selectedLines = useMemo(
    () => lines.filter((line) => line.fee_schedule_id === selectedId),
    [lines, selectedId]
  );
  const grid = useMemo(
    () => (selected ? gridOf(selected, selectedLines) : null),
    [selected, selectedLines]
  );
  const columns = useMemo(() => (selected ? columnsOf(selected) : []), [selected]);

  // The editable amounts of a draft, seeded from the stored version whenever the selection moves.
  useEffect(() => {
    if (!selected || !grid) {
      setAmounts({});
      return;
    }
    const next: Record<string, string> = {};
    for (const cell of grid.cells) {
      for (const [feeItemId, amount] of Object.entries(cell.amounts)) {
        next[`${cell.key}|${feeItemId}`] = toDecimalString(amount);
      }
    }
    setAmounts(next);
    setCellErrors({});
  }, [selected, grid]);

  const levelName = useCallback(
    (id: string) => levels.find((level) => level.id === id)?.name ?? id,
    [levels]
  );
  const itemLabel = useCallback(
    (id: string) => {
      const item = items.find((row) => row.id === id);
      return item ? `${item.code} — ${item.name}` : id;
    },
    [items]
  );

  const run = useCallback(
    async (work: () => Promise<void>, success: string) => {
      setBusy(true);
      setMessage(null);
      try {
        await work();
        toast.showSuccess(success);
        await Promise.all([schedulesQuery.refetch(), linesQuery.refetch()]);
      } catch (error) {
        const text = isScheduleError(error) || error instanceof Error ? error.message : String(error);
        setMessage(text);
        toast.showError(text);
      } finally {
        setBusy(false);
      }
    },
    [toast, schedulesQuery, linesQuery]
  );

  /** Reads the grid back into the cells the service writes. */
  const cellsFromGrid = useCallback(():
    | { readonly ok: true; readonly cells: readonly ScheduleCellInput[] }
    | { readonly ok: false; readonly error: string } => {
    if (!selected || !grid) return { ok: false, error: 'No version is selected.' };
    const amountCurrency = isCurrencyCode(currency) ? currency : 'KES';
    const errors: Record<string, string> = {};
    const byCell = new Map<string, ScheduleCellInput>();
    for (const cell of grid.cells) {
      const cellLines: ScheduleLineInput[] = [];
      for (const feeItemId of grid.itemIds) {
        const raw = amounts[`${cell.key}|${feeItemId}`];
        if (raw === undefined || raw.trim() === '') continue;
        try {
          const amount = fromMajor(raw.trim(), amountCurrency);
          cellLines.push({
            feeItemId: asId<'fee_item'>(feeItemId),
            amount,
            mandatory: true,
            frequency: 'per_term',
            prorationRule: 'full',
          });
        } catch (error) {
          errors[`${cell.key}|${feeItemId}`] =
            error instanceof Error ? error.message : String(error);
        }
      }
      if (cellLines.length === 0) continue;
      byCell.set(cell.key, {
        levelId: asId<'level'>(cell.levelId),
        residence: cell.residence,
        ...(cell.address.feeCategoryId === null
          ? {}
          : { feeCategoryId: asId<'fee_category'>(cell.address.feeCategoryId) }),
        ...(cell.address.campusId === null ? {} : { campusId: asId<'campus'>(cell.address.campusId) }),
        lines: cellLines,
      });
    }
    setCellErrors(errors);
    if (Object.keys(errors).length > 0) return { ok: false, error: 'Some amounts are not valid money.' };
    if (byCell.size === 0) return { ok: false, error: 'A version needs at least one priced cell.' };
    return { ok: true, cells: [...byCell.values()] };
  }, [selected, grid, amounts, currency]);

  const save = useCallback(() => {
    if (!selected) return;
    const result = cellsFromGrid();
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    void run(
      () => active.setCells(asId<'fee_schedule'>(selected.id), result.cells, actor),
      'The draft version was saved.'
    );
  }, [selected, cellsFromGrid, run, active, actor]);

  const loadSpecExample = useCallback(() => {
    void run(async () => {
      const institution = await repository.list('institution', { limit: 1 });
      const institutionId = institution.items[0]?.id;
      if (!institutionId) throw new Error('No institution is configured.');
      const year = await repository.list('academic_year', { limit: 1 });
      const period = await repository.list('academic_period', { limit: 1 });
      const programme = await repository.list('programme', { limit: 1 });
      const category = categories[0];
      const campus = campuses[0];
      if (!year.items[0] || !period.items[0] || !programme.items[0] || !category || !campus) {
        throw new Error('The institution needs a year, a period, a programme, a fee category and a campus.');
      }

      const stage = await repository.list('stage', { limit: 1 });
      const stageId = levels[0]?.stage_id ?? stage.items[0]?.id;
      if (!stageId) throw new Error('The institution has no stage to hang the levels on.');

      const levelIds = new Map<SpecLevel, Id<'level'>>();
      for (const level of SPEC_EXAMPLE_LEVELS) {
        const existing = levels.find((row) => row.name === level);
        if (existing) {
          levelIds.set(level, asId<'level'>(existing.id));
          continue;
        }
        const created = await repository.create('level', {
          institution_id: institutionId,
          stage_id: stageId,
          code: level.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
          name: level,
          ordinal: levels.length + levelIds.size + 1,
          typical_age: 16,
          is_terminal: false,
        });
        levelIds.set(level, created.id);
      }

      const itemIds = new Map<SpecItemCode, Id<'fee_item'>>();
      for (const [index, item] of SPEC_EXAMPLE_ITEMS.entries()) {
        const existing = items.find((row) => row.code === item.code);
        if (existing) {
          itemIds.set(item.code, asId<'fee_item'>(existing.id));
          continue;
        }
        const created = await repository.create('fee_item', {
          institution_id: institutionId,
          code: item.code,
          name: item.name,
          category: item.category,
          refundable: false,
          taxable: false,
          priority: items.length + index + 1,
          funding_source: 'parent',
        });
        itemIds.set(item.code, created.id);
      }

      const specIds: SpecExampleIds = {
        institutionId,
        academicYearId: year.items[0].id,
        academicPeriodId: period.items[0].id,
        programmeId: programme.items[0].id,
        feeCategoryId: category.id,
        campusId: campus.id,
        levelId: (level) => levelIds.get(level) as Id<'level'>,
        feeItemId: (code) => itemIds.get(code) as Id<'fee_item'>,
      };
      const version = Math.max(0, ...schedules.map((row) => row.version)) + 1;
      const created = await active.createVersion(buildSpecExampleVersion(specIds, { version }), actor);
      setSelectedId(created.id);
    }, 'The spec §2.2 example was loaded as a new draft.');
  }, [run, repository, categories, campuses, levels, items, schedules, active, actor]);

  const copyWithUplift = useCallback(() => {
    if (!selected) return;
    const percent = Number(upliftPercent);
    void run(async () => {
      const version = Math.max(0, ...schedules.map((row) => row.version)) + 1;
      const derived = await active.copyWithUplift(asId<'fee_schedule'>(selected.id), {
        version,
        uplift: Number.isFinite(percent) ? { percent } : {},
        actor,
      });
      setSelectedId(derived.schedule.id);
    }, 'A new version was derived with the uplift.');
  }, [selected, upliftPercent, schedules, active, actor, run]);

  const status = selected?.status ?? '';
  const editable = status === 'draft';
  const cellByKey = useMemo(() => {
    const map = new Map<string, GridCell>();
    for (const cell of grid?.cells ?? []) map.set(cell.key, cell);
    return map;
  }, [grid]);

  return (
    <div className="space-y-4">
      <Card title={t('feeSchedules.title', 'Fee schedules (the matrix)')}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('feeSchedules.version', 'Version')}</span>
            <Select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              aria-label={t('feeSchedules.version', 'Version')}
            >
              <option value="">{t('feeSchedules.none', 'No version')}</option>
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.name} v{schedule.version} · {schedule.status}
                </option>
              ))}
            </Select>
          </label>
          {selected ? (
            <Badge variant={status === 'published' ? 'success' : status === 'draft' ? 'secondary' : 'info'}>
              {status}
            </Badge>
          ) : null}
          <div className="flex-1" />
          {canWrite ? (
            <Button variant="secondary" onClick={loadSpecExample} disabled={busy}>
              <PlusIcon className="w-4 h-4" /> {t('feeSchedules.loadExample', 'Load the spec §2.2 example')}
            </Button>
          ) : null}
          {canWrite && selected ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span>{t('feeSchedules.uplift', 'Uplift %')}</span>
                <Input
                  value={upliftPercent}
                  onChange={(event) => setUpliftPercent(event.target.value)}
                  aria-label={t('feeSchedules.uplift', 'Uplift %')}
                />
              </label>
              <Button variant="secondary" onClick={copyWithUplift} disabled={busy}>
                {t('feeSchedules.copy', 'Copy with uplift')}
              </Button>
            </>
          ) : null}
        </div>

        {message ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {message}
          </p>
        ) : null}

        {selected && grid ? (
          <div className="mt-4 overflow-x-auto">
            {grid.unplaced > 0 ? (
              <p className="mb-2 text-sm text-amber-700">
                {grid.unplaced} line(s) name no level or residence this version spans, so they are not on the grid.
              </p>
            ) : null}
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">{t('feeSchedules.feeItem', 'Fee item')}</th>
                  {columns.map((column) => {
                    const key = cellKeyOf({
                      levelId: column.levelId,
                      residence: column.residence,
                      feeCategoryId: selected.fee_category_ids[0] ?? null,
                      campusId: selected.campus_id ?? null,
                    });
                    const cell = cellByKey.get(key);
                    return (
                      <th key={key} className="p-2 text-left">
                        {levelName(column.levelId)} · {column.residence}
                        {cell ? null : <span className="ml-1 text-xs text-slate-500">(not priced)</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(grid.itemIds.length > 0 ? grid.itemIds : items.map((item) => item.id)).map((feeItemId) => (
                  <tr key={feeItemId} className="border-t">
                    <th className="p-2 text-left font-normal">{itemLabel(feeItemId)}</th>
                    {columns.map((column) => {
                      const key = cellKeyOf({
                        levelId: column.levelId,
                        residence: column.residence,
                        feeCategoryId: selected.fee_category_ids[0] ?? null,
                        campusId: selected.campus_id ?? null,
                      });
                      const cellKey = `${key}|${feeItemId}`;
                      const stored = cellByKey.get(key)?.amounts[feeItemId];
                      if (!editable) {
                        return (
                          <td key={key} className="p-2">
                            {stored ? formatMoneyMinor(stored.amount_minor, stored.currency) : '—'}
                          </td>
                        );
                      }
                      return (
                        <td key={key} className="p-2">
                          <Input
                            value={amounts[cellKey] ?? ''}
                            error={cellErrors[cellKey]}
                            onChange={(event) =>
                              setAmounts((current) => ({ ...current, [cellKey]: event.target.value }))
                            }
                            aria-label={`${levelName(column.levelId)} ${column.residence} ${itemLabel(feeItemId)}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            {t('feeSchedules.empty', 'No fee schedule yet. Load the spec §2.2 example to start one.')}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {canWrite && editable ? (
            <Button onClick={save} disabled={busy}>
              {t('feeSchedules.save', 'Save the draft')}
            </Button>
          ) : null}
          {canWrite && editable ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                selected && void run(() => active.submit(asId<'fee_schedule'>(selected.id), actor), 'Submitted for approval.')
              }
            >
              {t('feeSchedules.submit', 'Submit for approval')}
            </Button>
          ) : null}
          {canApprove && status === 'submitted' ? (
            <Button
              disabled={busy}
              onClick={() =>
                selected && void run(() => active.approve(asId<'fee_schedule'>(selected.id), actor), 'Approved.')
              }
            >
              {t('feeSchedules.approve', 'Approve')}
            </Button>
          ) : null}
          {canApprove && status === 'submitted' ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span>{t('feeSchedules.reason', 'Reason')}</span>
                <Input
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  aria-label={t('feeSchedules.reason', 'Reason')}
                />
              </label>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  selected &&
                  void run(
                    () => active.reject(asId<'fee_schedule'>(selected.id), actor, rejectReason),
                    'Sent back to draft.'
                  )
                }
              >
                {t('feeSchedules.reject', 'Send back')}
              </Button>
            </>
          ) : null}
          {canWrite && status === 'approved' ? (
            <Button
              disabled={busy}
              onClick={() =>
                selected && void run(() => active.publish(asId<'fee_schedule'>(selected.id), actor), 'Published.')
              }
            >
              {t('feeSchedules.publish', 'Publish')}
            </Button>
          ) : null}
        </div>
      </Card>

      <Card title={t('feeSchedules.history', 'Version history')}>
        <ul className="space-y-1 text-sm">
          {schedules.map((schedule) => (
            <li key={schedule.id} className="flex items-center gap-2">
              <button
                type="button"
                className="underline"
                onClick={() => setSelectedId(schedule.id)}
              >
                {schedule.name} v{schedule.version}
              </button>
              <Badge variant={schedule.status === 'published' ? 'success' : 'secondary'}>
                {schedule.status}
              </Badge>
            </li>
          ))}
          {schedules.length === 0 ? <li className="text-slate-500">{t('feeSchedules.noHistory', 'No versions yet.')}</li> : null}
        </ul>
      </Card>
    </div>
  );
};

const FeeSchedulesPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <FeeSchedulesPageContent />
  </CanonicalRepositoryProvider>
);

export default FeeSchedulesPage;
