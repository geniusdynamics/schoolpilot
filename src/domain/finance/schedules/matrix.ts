// ABOUTME: The fee-schedule matrix: the deterministic cell key, the resolution of a cell from a
// ABOUTME: version's header and lines, and the refusals that stop an ambiguous or missing
// ABOUTME: combination from silently resolving to a value the bursar did not choose.

import { asId } from '@/domain/ids';
import { Money, add, isMoney, zero } from '@/domain/money';
import type { FeeSchedule } from '@/domain/schema';

import { ScheduleError } from './errors';
import type {
  ResolvedCell,
  ResolvedLine,
  ScheduleCellAddress,
  ScheduleStatus,
  ScheduleResidenceStatus,
  StoredScheduleLine,
} from './types';

/** The dimensions of a version: what the header declares the matrix spans. */
export interface MatrixHeader {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly status: ScheduleStatus;
  readonly levelIds: readonly string[];
  readonly residenceStatuses: readonly ScheduleResidenceStatus[];
  readonly feeCategoryIds: readonly string[];
  readonly campusId: string | null;
}

/** A fully addressed cell: every dimension resolved to a concrete value or an explicit null. */
export interface ResolvedAddress {
  readonly levelId: string;
  readonly residence: ScheduleResidenceStatus;
  readonly feeCategoryId: string | null;
  readonly campusId: string | null;
}

const SEPARATOR = '|';
const EMPTY = '';

/** The stable key of a fully resolved cell. Deterministic: the same address always keys the same. */
export function cellKeyOf(address: ResolvedAddress): string {
  return [
    address.levelId,
    address.residence,
    address.feeCategoryId ?? EMPTY,
    address.campusId ?? EMPTY,
  ].join(SEPARATOR);
}

/** Reads a cell key back into its address. */
export function parseCellKey(key: string): ResolvedAddress {
  const [levelId, residence, feeCategoryId, campusId] = key.split(SEPARATOR);
  return {
    levelId,
    residence: residence as ScheduleResidenceStatus,
    feeCategoryId: (feeCategoryId ?? EMPTY) === EMPTY ? null : feeCategoryId,
    campusId: (campusId ?? EMPTY) === EMPTY ? null : campusId,
  };
}

/** Builds a version's header from a canonical `fee_schedule` row. */
export function headerOf(schedule: FeeSchedule): MatrixHeader {
  return {
    id: schedule.id,
    name: schedule.name,
    version: schedule.version,
    status: schedule.status,
    levelIds: schedule.level_ids,
    residenceStatuses: schedule.residence_statuses,
    feeCategoryIds: schedule.fee_category_ids,
    campusId: schedule.campus_id ?? null,
  };
}

/**
 * The address a stored line belongs to.
 *
 * A line written by this module names its level and residence outright. A line that leaves a
 * dimension null belongs to the schedule's only value for it; when the schedule spans more than one
 * value and the line names none, the line is ambiguous and the cell it belongs to is unknowable.
 */
export function effectiveLineAddress(
  header: MatrixHeader,
  line: Pick<StoredScheduleLine, 'level_id' | 'residence_status' | 'fee_category_id'>
): ResolvedAddress | null {
  const levelId = line.level_id ?? single(header.levelIds);
  if (levelId === null) return null;
  const residence = line.residence_status ?? single(header.residenceStatuses);
  if (residence === null) return null;
  const feeCategoryId = line.fee_category_id ?? single(header.feeCategoryIds);
  if (line.fee_category_id === undefined && header.feeCategoryIds.length > 1) return null;
  return { levelId, residence, feeCategoryId, campusId: header.campusId };
}

/** The single value of a dimension, or null when the schedule declares none or more than one. */
function single<T>(values: readonly T[]): T | null {
  return values.length === 1 ? values[0] : null;
}

/**
 * Resolves a caller's (possibly partial) address to a concrete one.
 *
 * A dimension the caller names must be declared by the header. A dimension the caller omits must be
 * one the schedule declares a single value for: that value is the schedule's own, not a default.
 * A dimension the schedule spans with several values, or with none, is refused by name.
 */
export function normalizeAddress(header: MatrixHeader, address: ScheduleCellAddress): ResolvedAddress {
  const levelId = resolveDimension('level', address.levelId, header.levelIds);
  const residence = resolveDimension('residence', address.residence, header.residenceStatuses);
  const feeCategoryId =
    address.feeCategoryId === undefined
      ? requireSingle('fee category', header.feeCategoryIds)
      : requireDeclared('fee category', address.feeCategoryId, header.feeCategoryIds);
  const campusId = header.campusId;
  if (address.campusId !== undefined && address.campusId !== campusId) {
    throw new ScheduleError(
      'cell_dimension_unknown',
      `The campus ${address.campusId} is not the campus ${campusId ?? '(none)'} this schedule prices.`,
      { feeScheduleId: header.id }
    );
  }
  return { levelId, residence, feeCategoryId, campusId };
}

function resolveDimension<T>(name: string, value: T | undefined, declared: readonly T[]): T {
  if (value === undefined) return requireSingle(name, declared);
  return requireDeclared(name, value, declared);
}

function requireSingle<T>(name: string, declared: readonly T[]): T {
  if (declared.length === 1) return declared[0];
  if (declared.length === 0) {
    throw new ScheduleError(
      'cell_dimension_undeclared',
      `The schedule declares no ${name}, so a cell cannot be resolved for it.`
    );
  }
  throw new ScheduleError(
    'cell_ambiguous',
    `The schedule spans ${declared.length} ${name} values, so the ${name} must be named to resolve a cell.`
  );
}

function requireDeclared<T>(name: string, value: T, declared: readonly T[]): T {
  if (declared.includes(value)) return value;
  throw new ScheduleError(
    'cell_dimension_unknown',
    `The ${name} ${String(value)} is not one of the schedule's declared ${name} values.`
  );
}

/** The lines of a version that belong to one resolved cell, in a stable order. */
export function linesForAddress(
  header: MatrixHeader,
  lines: readonly StoredScheduleLine[],
  address: ResolvedAddress
): readonly StoredScheduleLine[] {
  const wanted = cellKeyOf(address);
  return lines
    .filter((line) => {
      const effective = effectiveLineAddress(header, line);
      return effective !== null && cellKeyOf(effective) === wanted;
    })
    .slice()
    .sort((left, right) => String(left.fee_item_id).localeCompare(String(right.fee_item_id)));
}

/**
 * Resolves a cell of a version.
 *
 * The combination must be declared by the header and priced by the version; an ambiguous address, an
 * undeclared dimension or a combination no cell prices is refused by name rather than resolved to a
 * neighbouring cell or a default.
 */
export function resolveCell(
  header: MatrixHeader,
  lines: readonly StoredScheduleLine[],
  address: ScheduleCellAddress
): ResolvedCell {
  const resolved = normalizeAddress(header, address);
  const cellLines = linesForAddress(header, lines, resolved);
  if (cellLines.length === 0) {
    throw new ScheduleError(
      'cell_missing',
      `No cell of ${header.name} v${header.version} prices ${describe(resolved)}.`,
      { feeScheduleId: header.id }
    );
  }
  const resolvedLines = cellLines.map(toResolvedLine);
  return {
    feeScheduleId: asId<'fee_schedule'>(header.id),
    name: header.name,
    version: header.version,
    status: header.status,
    levelId: asId<'level'>(resolved.levelId),
    residence: resolved.residence,
    feeCategoryId: resolved.feeCategoryId === null ? null : asId<'fee_category'>(resolved.feeCategoryId),
    campusId: resolved.campusId === null ? null : asId<'campus'>(resolved.campusId),
    lines: resolvedLines,
    total: sumLines(resolvedLines),
  };
}

/** Reads a stored line into the shape a caller consumes, with its defaults filled. */
export function toResolvedLine(line: StoredScheduleLine): ResolvedLine {
  if (!isMoney(line.amount)) {
    throw new ScheduleError(
      'amount_not_money',
      `The amount of fee schedule line ${line.id} is not a Money value.`
    );
  }
  return {
    feeItemId: asId<'fee_item'>(line.fee_item_id),
    amount: line.amount,
    mandatory: line.mandatory,
    frequency: line.frequency,
    dueDates: line.due_dates ?? [],
    installmentPlanId:
      line.installment_plan_id === undefined ? null : asId<'installment_plan'>(line.installment_plan_id),
    prorationRule: line.proration_rule,
  };
}

/** The exact total of a cell's lines, in the lines' own currency. */
export function sumLines(lines: readonly ResolvedLine[]): Money {
  if (lines.length === 0) {
    throw new ScheduleError('cell_missing', 'a cell with no lines has no total');
  }
  return lines.map((line) => line.amount).reduce(add, zero(lines[0].amount.currency));
}

/** A human description of a resolved address, for a refusal message. */
export function describe(address: ResolvedAddress): string {
  return [
    `level ${address.levelId}`,
    `residence ${address.residence}`,
    `category ${address.feeCategoryId ?? '(none)'}`,
    `campus ${address.campusId ?? '(none)'}`,
  ].join(', ');
}

/** True when two addresses point at the same cell. */
export function sameAddress(left: ResolvedAddress, right: ResolvedAddress): boolean {
  return cellKeyOf(left) === cellKeyOf(right);
}

/** The statuses whose prices are frozen: a version in force, or one a checker already approved. */
export const IMMUTABLE_STATUSES: readonly ScheduleStatus[] = ['approved', 'published', 'archived'];

/** True when a version's prices may still be edited. */
export function isEditable(status: ScheduleStatus): boolean {
  return !IMMUTABLE_STATUSES.includes(status);
}
