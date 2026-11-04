// ABOUTME: Renders the class and trend analytics screens against the canonical fixture, proving the
// ABOUTME: scope bar and the computed rows mount together and the missing metrics read as not recorded.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CanonicalRepositoryProvider } from '@/modules/academics/data/canonicalRepository';
import { createFakeRepository } from '@/modules/academics/pages/__tests__/canonicalRepositoryDouble';
import { seed } from '@/modules/reports/pages/analytics/analysis/__tests__/cohortFixture';

import AnalyticsClassPage from '../AnalyticsClassPage';
import AnalyticsTrendsPage from '../AnalyticsTrendsPage';

describe('the analytics screens over canonical records', () => {
  it('renders the seeded class groups and marks, with pass rate and attendance not recorded', async () => {
    const repository = createFakeRepository(seed());
    render(
      <CanonicalRepositoryProvider repository={repository}>
        <AnalyticsClassPage />
      </CanonicalRepositoryProvider>
    );

    expect(await screen.findByText(/Grade 7 · East/)).toBeTruthy();
    expect(screen.getByText('Marks recorded')).toBeTruthy();
    expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0);
    expect(document.body.textContent).toContain('68.5%');
  });

  it('plots the periods that have marks and leaves the gap out of the trend', async () => {
    const repository = createFakeRepository(seed());
    render(
      <CanonicalRepositoryProvider repository={repository}>
        <AnalyticsTrendsPage />
      </CanonicalRepositoryProvider>
    );

    expect((await screen.findAllByText('Performance trend')).length).toBeGreaterThan(0);
    expect(document.body.textContent).toContain('79%');
    expect(document.body.textContent).toContain('60%');
    expect(document.body.textContent).not.toContain('80.6%');
  });
});
