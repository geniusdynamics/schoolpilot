// ABOUTME: Integration test for the Applications hub: a crashing tab stays contained in its tab panel.
// ABOUTME: Guards SO-27: the tab bar survives a tab crash and switching tabs renders the new tab.

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ApplicationsPage from '../ApplicationsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('../ApplicationsListPage', () => ({
  ApplicationsListPageContent: () => {
    throw new Error('applications list exploded');
  },
}));

vi.mock('../ApplicationReviewPage', () => ({
  ApplicationReviewPageContent: () => <div>Review queue content</div>,
}));

vi.mock('../FormBuilderPage', () => ({
  FormBuilderPageContent: () => <div>Form builder content</div>,
}));

vi.mock('../ApplicationTrackingPage', () => ({
  ApplicationTrackingPageContent: () => <div>Tracking content</div>,
}));

describe('ApplicationsPage hub', () => {
  beforeEach(() => {
    // React logs caught render errors to console.error; keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('contains a crashing tab in its panel and recovers when another tab is selected', () => {
    render(
      <MemoryRouter initialEntries={['/admissions/applications-hub']}>
        <ApplicationsPage />
      </MemoryRouter>
    );

    // The hub header and tab bar survive the crash.
    expect(screen.getByText('Application Management')).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();

    // The error is rendered inside the tab panel, not in place of the hub.
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('id', 'tabpanel-applications');
    expect(panel).toHaveTextContent('Page Error');
    expect(panel).toHaveTextContent('applications list exploded');

    fireEvent.click(screen.getByRole('tab', { name: 'Review Queue' }));

    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-review-queue');
    expect(screen.getByText('Review queue content')).toBeInTheDocument();
    expect(screen.queryByText('Page Error')).not.toBeInTheDocument();
  });
});
