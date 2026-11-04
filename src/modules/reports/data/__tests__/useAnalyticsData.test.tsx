// ABOUTME: Integration test for the analytics hook: it reads the canonical repository through the
// ABOUTME: query layer and returns the arithmetic of the seeded marks, not a placeholder.

import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { CanonicalRepositoryProvider } from '@/modules/academics/data/canonicalRepository';
import { createFakeRepository } from '@/modules/academics/pages/__tests__/canonicalRepositoryDouble';
import { IDS, seed } from '@/modules/reports/pages/analytics/analysis/__tests__/cohortFixture';

import { useAnalyticsData } from '../useAnalyticsData';

function hookFor(academicYearId: string) {
  const repository = createFakeRepository(seed());
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <CanonicalRepositoryProvider repository={repository}>{children}</CanonicalRepositoryProvider>
  );
  return renderHook(() => useAnalyticsData({ academicYearId }), { wrapper });
}

describe('useAnalyticsData over the canonical repository', () => {
  it('returns the seeded class, subject and teacher arithmetic', async () => {
    const { result } = hookFor(IDS.year);
    await waitFor(() => expect(result.current.loading).toBe(false));

    const east = result.current.classPerformances.find((row) => row.classId === IDS.east);
    expect(east).toMatchObject({ className: 'Grade 7', streamName: 'East', averageScore: 68.5, marksRecorded: 16, marksExpected: 30 });
    expect(east?.passRate).toBeNull();
    expect(east?.attendanceRate).toBeNull();

    const english = result.current.subjectPassRates.find((row) => row.subjectId === IDS.eng);
    expect(english).toMatchObject({ subjectName: 'English', averageScore: 70.3, marksRecorded: 10 });

    const grace = result.current.teacherAnalytics.find((row) => row.teacherId === IDS.teacher);
    expect(grace).toMatchObject({ teacherName: 'Grace Wekesa', averageScore: 68.5, marksRecorded: 16 });
  });

  it('plots the seeded periods with marks and skips the empty one', async () => {
    const { result } = hookFor(IDS.year);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.trends.performance.points.map((point) => [point.periodName, point.value])).toEqual([
      ['Term 1', 79],
      ['Term 3', 60],
    ]);
    expect(result.current.trends.attendance.points).toEqual([]);
    expect(result.current.trends.passRate.points).toEqual([]);
  });
});
