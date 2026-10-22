// ABOUTME: The positions table. It renders nothing at all unless the pack's ranking policy enables
// ABOUTME: ranking, and then only the positions the aggregation engine awarded: a learner whose
// ABOUTME: result is incomplete is listed with a reason and no place.

import React from 'react';

import { displayNumber } from '@/modules/academics/pages/results';

import type { RankingView } from '../analysis';

const TIE_LABELS: Record<RankingView['ties'], string> = {
  competition_1224: 'competition (1-2-2-4)',
  dense_1223: 'dense (1-2-2-3)',
  shared_average: 'shared average (1-2.5-2.5-4)',
};

const REASON_LABELS: Record<string, string> = {
  incomplete: 'Result incomplete',
  no_value: 'No value for this metric',
};

export interface RankingTableProps {
  readonly view: RankingView;
}

/**
 * The positions panel.
 *
 * The whole panel is absent when the policy is disabled: there is no header, no column and no
 * tooltip that could carry a position. When it is enabled the engine's own entries decide who is
 * ranked, so an incomplete learner is listed with a reason and never takes a place.
 */
const RankingTable: React.FC<RankingTableProps> = ({ view }) => {
  if (!view.enabled) return null;

  return (
    <section className="space-y-2" data-testid="ranking-panel" aria-label="Positions">
      <p className="text-xs text-surface-muted-fg">
        Positions follow the pack's ranking policy: {TIE_LABELS[view.ties]} within {view.scope ?? 'class group'}
        {view.by === null ? '' : `, ranked on ${view.by}`}
        {view.only_complete ? ', with incomplete results listed but unranked' : ''}.
      </p>
      {view.rows.length === 0 ? (
        <p className="text-sm text-surface-muted-fg" data-testid="ranking-empty">
          No learner has a value this policy can rank.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Learner positions under the ranking policy</caption>
            <thead>
              <tr className="text-xs text-surface-muted-fg">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Learner
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Scope
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-medium">
                  Value
                </th>
                <th scope="col" className="py-1 text-right font-medium">
                  Position
                </th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <tr key={row.enrolmentId} className="border-t border-surface-border">
                  <th scope="row" className="py-1 pr-3 font-normal text-surface-foreground">
                    {row.learnerName}
                  </th>
                  <td className="py-1 pr-3 text-surface-muted-fg">{row.scopeLabel}</td>
                  <td className="py-1 pr-3 text-right tabular-nums text-surface-foreground">
                    {row.value === null ? '—' : displayNumber(row.value)}
                  </td>
                  <td
                    className="py-1 text-right tabular-nums text-surface-foreground"
                    data-testid={`position-${row.enrolmentId}`}
                  >
                    {row.ranked && row.position !== null ? (
                      <>
                        {displayNumber(row.position)}
                        {view.show_out_of ? (
                          <span className="text-surface-muted-fg"> / {row.out_of}</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-xs text-surface-muted-fg">
                        {REASON_LABELS[row.reason] ?? 'Not ranked'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default RankingTable;
