// ABOUTME: Reads the pack's ranking policy (spec 03 section 6.1) from the bundled ke-cbe assessment
// ABOUTME: document. A field the pack does not declare, or declares in a shape the engine does not
// ABOUTME: know, is dropped rather than guessed at, and an absent policy is ranking off.

import {
  RANKING_SCOPES,
  TIE_METHODS,
  type RankingPolicy,
  type RankingScope,
  type TieMethod,
} from '@/domain/assessment/aggregation';

const assessmentModules = import.meta.glob('../../../../../../packs/ke-cbe/assessment.json', {
  eager: true,
  import: 'default',
});

function firstDocument(modules: Record<string, unknown>): unknown {
  const values = Object.values(modules);
  return values.length === 1 ? values[0] : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

const isScope = (value: unknown): value is RankingScope =>
  RANKING_SCOPES.some((scope) => scope === value);

const isTieMethod = (value: unknown): value is TieMethod =>
  TIE_METHODS.some((method) => method === value);

/**
 * The ranking policy a pack's assessment document declares.
 *
 * Ranking is off unless the policy says otherwise: a missing document, a missing policy or a
 * malformed `enabled` all mean no position is computed. Every other field is carried only when it
 * names something the ranking engine accepts.
 */
export function loadRankingPolicy(assessment: unknown): RankingPolicy {
  const document = asRecord(assessment);
  const raw = document === null ? null : asRecord(document.ranking);
  if (raw === null) return { enabled: false };

  const enabled = asBoolean(raw.enabled) ?? false;
  const scope = isScope(raw.scope) ? raw.scope : undefined;
  const ties = isTieMethod(raw.ties) ? raw.ties : undefined;
  const by = typeof raw.by === 'string' && raw.by.trim().length > 0 ? raw.by : undefined;
  const onlyComplete = asBoolean(raw.only_complete);
  const showOnReport = asBoolean(raw.show_on_report);
  const showOutOf = asBoolean(raw.show_out_of);

  return {
    enabled,
    ...(scope === undefined ? {} : { scope }),
    ...(by === undefined ? {} : { by }),
    ...(ties === undefined ? {} : { ties }),
    ...(onlyComplete === undefined ? {} : { only_complete: onlyComplete }),
    ...(showOnReport === undefined ? {} : { show_on_report: showOnReport }),
    ...(showOutOf === undefined ? {} : { show_out_of: showOutOf }),
  };
}

/** The policy the bundled pack declares. ke-cbe ships ranking disabled, the CBE default. */
export const bundledRankingPolicy: RankingPolicy = loadRankingPolicy(firstDocument(assessmentModules));
