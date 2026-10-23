// ABOUTME: Rule 5a on the academics hub tabs: the tab body renders the card header, not a second
// ABOUTME: page heading. Covers the Board Exam Results tab (Results Distribution hub), which heads
// ABOUTME: its content with a card, and the Approval tab (Lesson plans hub), which has no single
// ABOUTME: head card and carries its sentence on whichever list card is shown.

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '@/tests/setup';

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({ students: [], loading: {} }),
}));

vi.mock('@/hooks/useDatabaseCollection', () => ({
  useDatabaseCollection: () => ({
    data: [],
    loading: false,
    error: null,
    refresh: async () => {},
    insert: async () => null,
    update: async () => null,
    remove: async () => true,
    collection: null,
  }),
}));

// Stable identities: the page memoises on these, and a fresh function per render would churn.
const lessonPlans = vi.hoisted(() => ({
  getPlansByStatus: () => [] as unknown[],
  reviewPlan: async () => {},
}));

vi.mock('../../data/lessonplans/useLessonPlansData', () => ({
  PlanStatus: { DRAFT: 'Draft', SUBMITTED: 'Submitted', APPROVED: 'Approved', REJECTED: 'Rejected' },
  useLessonPlansData: () => ({
    weeklyPlans: [],
    loading: false,
    reviewPlan: lessonPlans.reviewPlan,
    getPlansByStatus: lessonPlans.getPlansByStatus,
  }),
}));

import { BoardExamResultsPageContent } from '../BoardExamResultsPage';
import ApprovalPage from '../lessonplans/ApprovalPage';

function renderTabBody(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders>
        <MemoryRouter>{children}</MemoryRouter>
      </TestProviders>
    ),
  });
}

describe('a hub tab body does not repeat a page heading', () => {
  it('heads the Board Exam Results tab with the card: title, sentence and button on one row', () => {
    renderTabBody(<BoardExamResultsPageContent />);

    // The hub above already renders the title and the tab strip, so the body adds no page heading.
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();

    // The card header carries what the removed page header carried.
    expect(screen.getByRole('heading', { level: 3, name: 'Board Exam Results' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About this section' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add Result/ })).toBeTruthy();

    // The sentence is behind the hint, not on a permanent row.
    expect(screen.queryByText(/Enter and manage external board exam results/, { selector: 'p' })).toBeNull();
  });

  it('drops the duplicated heading on the Approval tab and keeps the sentence on the list card', () => {
    renderTabBody(<ApprovalPage />);

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    // "Approval Queue" repeated the hub's own tab label; the per-state card title stays.
    expect(screen.queryByText('Approval Queue')).toBeNull();
    expect(screen.getByRole('heading', { level: 3, name: 'Pending Review' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About this section' })).toBeTruthy();
    expect(screen.queryByText(/Review and approve weekly lesson plans/, { selector: 'p' })).toBeNull();
  });
});
