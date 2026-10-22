// ABOUTME: The rubric table block: learning area, strand, level and descriptor for each recorded
// ABOUTME: outcome, with the descriptor column taking the remaining width.

import type { ReactNode } from 'react';
import type { ReportBlockModel } from '@/domain/reports/types';
import { Ltr } from './shared';

export type RubricTableBlockModel = Extract<ReportBlockModel, { kind: 'rubric_table' }>;

export function RubricTableBlock({ block }: { block: RubricTableBlockModel }): ReactNode {
  const { headings, rows } = block.payload;
  return (
    <table className="report-table" data-table="rubric">
      <colgroup>
        <col style={{ width: '22%' }} />
        <col style={{ width: '18%' }} />
        <col style={{ width: '12%' }} />
        <col style={{ width: '48%' }} />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">{headings.area}</th>
          <th scope="col">{headings.strand}</th>
          <th scope="col" className="report-cell--center">
            {headings.level}
          </th>
          <th scope="col">{headings.descriptor}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.area}:${row.strand ?? ''}:${index}`} className="report-row">
            <td>
              <Ltr>{row.area}</Ltr>
            </td>
            <td>{row.strand ?? ''}</td>
            <td className="report-cell--center">{row.level}</td>
            <td className="report-descriptor">{row.descriptor ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
