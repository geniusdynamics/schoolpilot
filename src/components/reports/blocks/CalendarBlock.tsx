// ABOUTME: The calendar block: the closing date and the next opening date, each as its own isolated
// ABOUTME: Latin run so the sequence survives an RTL paragraph.

import type { ReactNode } from 'react';
import type { ReportBlockModel, ReportLabels } from '@/domain/reports/types';
import { Stat } from './shared';

export type CalendarBlockModel = Extract<ReportBlockModel, { kind: 'calendar' }>;

export function CalendarBlock({ block, labels }: { block: CalendarBlockModel; labels: ReportLabels }): ReactNode {
  const { calendar } = block.payload;
  const stats: { label: string; value: string }[] = [];
  if (calendar.closing) stats.push({ label: labels.get('calendar.closing'), value: calendar.closing });
  if (calendar.opening) stats.push({ label: labels.get('calendar.opening'), value: calendar.opening });
  return (
    <div className="report-stats report-stats--three">
      {stats.map((stat) => (
        <Stat key={stat.label} label={stat.label} value={stat.value} />
      ))}
    </div>
  );
}
