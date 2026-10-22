// ABOUTME: The attendance block: days open, present, absent and late as a row of stat boxes.

import type { ReactNode } from 'react';
import type { ReportBlockModel, ReportLabels } from '@/domain/reports/types';
import { Stat } from './shared';

export type AttendanceBlockModel = Extract<ReportBlockModel, { kind: 'attendance' }>;

export function AttendanceBlock({ block, labels }: { block: AttendanceBlockModel; labels: ReportLabels }): ReactNode {
  const { daysOpen, present, absent, late } = block.payload.attendance;
  const stats = [
    { label: labels.get('attendance.days_open'), value: String(daysOpen) },
    { label: labels.get('attendance.present'), value: String(present) },
    { label: labels.get('attendance.absent'), value: String(absent) },
  ];
  if (typeof late === 'number') stats.push({ label: labels.get('attendance.late'), value: String(late) });
  return (
    <div className={stats.length === 3 ? 'report-stats report-stats--three' : 'report-stats'}>
      {stats.map((stat) => (
        <Stat key={stat.label} label={stat.label} value={stat.value} />
      ))}
    </div>
  );
}
