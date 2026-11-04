// ABOUTME: The scope every analytics screen shares: the bar's year, class, stream and period feed
// ABOUTME: useAnalyticsData directly, so a selector change recomputes the rows rather than the labels.

import { useAcademicScope, type PeriodMode } from '@/academic-scope';

import { useAnalyticsData } from '../../data/useAnalyticsData';

/** The resolved scope plus the analytics computed for exactly that scope. */
export function useReportAnalyticsScope(period: PeriodMode = 'optional') {
  const scopeState = useAcademicScope({ period });
  const effective = scopeState.scope.effective;

  const analytics = useAnalyticsData({
    academicYearId: effective.yearId || null,
    periodId: effective.periodId || null,
    levelId: effective.levelId || null,
    classGroupId: effective.classGroupId || null,
  });

  return {
    scopeState,
    effective,
    analytics,
    hasYear: effective.yearId !== '',
    loading: scopeState.status === 'loading' || analytics.loading,
    error: scopeState.error ?? analytics.error ?? null,
  };
}
