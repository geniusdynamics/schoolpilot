// ABOUTME: The shared rating table of the competency and affective/psychomotor blocks: a named trait,
// ABOUTME: its level as text, and an optional descriptor.

import type { ReactNode } from 'react';
import type { ReportRating } from '@/domain/reports/types';
import { Ltr } from './shared';

/** Ratings never carry meaning by colour: the level is a word or a band code. */
export function RatingTable({ ratings }: { ratings: readonly ReportRating[] }): ReactNode {
  return (
    <table className="report-table" data-table="ratings">
      <colgroup>
        <col style={{ width: '66%' }} />
        <col style={{ width: '34%' }} />
      </colgroup>
      <tbody>
        {ratings.map((rating) => (
          <tr key={rating.name} className="report-row">
            <td>
              <Ltr>{rating.name}</Ltr>
              {rating.descriptor ? <span className="report-descriptor report-descriptor--block">{rating.descriptor}</span> : null}
            </td>
            <td className="report-cell--center">
              <strong>{rating.level}</strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
