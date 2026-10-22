// ABOUTME: Shared pieces of the report blocks: the heading, the empty state, RTL-safe text, the stat
// ABOUTME: box, and the table primitives every table block uses.

import type { ReactNode } from 'react';
import { isLtrRun, isolateRuns } from '@/domain/reports/bidi';
import type { ReportColumnSpec } from '@/domain/reports/types';
import { reportCellClass } from './tableClasses';

export function BlockHeading({ label }: { label: string }): ReactNode {
  return <h3 className="report-block__title">{label}</h3>;
}

/** What a block renders when it has no data: a sentence, never a blank hole. */
export function EmptyState({ text }: { text: string }): ReactNode {
  return (
    <p className="report-empty" data-empty="true">
      {text}
    </p>
  );
}

/**
 * Renders text so an RTL paragraph cannot reorder a Latin/digit run. A pure run becomes a `<bdi
 * dir="ltr">`; mixed text gets every Latin run isolated with U+2066…U+2069.
 */
export function Ltr({ children }: { children: string }): ReactNode {
  if (isLtrRun(children)) return <bdi dir="ltr">{children}</bdi>;
  return <>{isolateRuns(children)}</>;
}

export function Stat({ label, value, numeric = true }: { label: string; value: string; numeric?: boolean }): ReactNode {
  return (
    <div className="report-stat">
      <span className="report-stat__key">{label}</span>
      {numeric ? (
        <span className="report-stat__value">
          <Ltr>{value}</Ltr>
        </span>
      ) : (
        <span className="report-stat__value">{value}</span>
      )}
    </div>
  );
}

export function Field({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="report-field">
      <span className="report-field__key">{label}</span>
      <span className="report-field__value">
        <Ltr>{value}</Ltr>
      </span>
    </div>
  );
}

/** A `dt`/`dd` pair list for the small detail blocks (fees, progression). */
export function DetailList({ rows }: { rows: readonly { label: string; value: string }[] }): ReactNode {
  return (
    <dl className="report-detail">
      {rows.map((row) => (
        <div key={row.label} className="report-detail__row">
          <dt>{row.label}</dt>
          <dd>
            <Ltr>{row.value}</Ltr>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ReportColgroup({ columns }: { columns: readonly ReportColumnSpec[] }): ReactNode {
  return (
    <colgroup>
      {columns.map((column) => (
        <col key={column.kind} style={{ width: `${column.width}%` }} />
      ))}
    </colgroup>
  );
}

export function ReportHeadRow({ columns }: { columns: readonly ReportColumnSpec[] }): ReactNode {
  return (
    <thead>
      <tr>
        {columns.map((column) => (
          <th key={column.kind} scope="col" className={reportCellClass(column.align)}>
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}
