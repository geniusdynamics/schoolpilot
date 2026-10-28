// ABOUTME: The portal pages' states: loading, not linked, error, empty and not-published, and the
// ABOUTME: fees page's pay action against a configured provider and against none.

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaymentProvider } from '@/domain/finance/payments/providers/types';
import type { PortalSession } from '../../data/usePortalSession';
import { PortalPaymentsProvider } from '../../data/portalPayments';
import type { PortalBalance } from '../../data/portalBalances';
import type { PortalTermReport } from '../../data/portalReports';
import type { PortalAttendanceRecord, PortalAttendanceSummary } from '../../data/portalAttendance';
import type { PortalNotice } from '../../data/portalNotices';

const hooks = vi.hoisted(() => ({
  session: {} as Record<string, unknown>,
  balance: {} as Record<string, unknown>,
  attendance: {} as Record<string, unknown>,
  reports: {} as Record<string, unknown>,
  notices: {} as Record<string, unknown>,
  consent: {} as Record<string, unknown>,
}));

vi.mock('../../data/usePortalSession', () => ({
  usePortalSession: () => hooks.session,
  usePortalBalance: () => hooks.balance,
  usePortalAttendance: () => hooks.attendance,
  usePortalReports: () => hooks.reports,
  usePortalNotices: () => hooks.notices,
  usePortalConsent: () => hooks.consent,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

import { PortalFeesContent } from '../PortalFeesPage';
import { PortalReportsContent } from '../PortalReportsPage';
import { PortalAttendanceContent } from '../PortalAttendancePage';
import { PortalAnnouncementsContent } from '../PortalAnnouncementsPage';

const LEARNER = {
  id: '00000000-0000-7000-8000-0000000000a1',
  name: 'Amina Wanjiku',
  admissionNumber: 'ADM/2026/001',
  className: 'Form 1 North',
};

const linkedSession = (overrides: Partial<PortalSession> = {}): PortalSession => ({
  identity: {
    status: 'linked',
    role: 'guardian',
    learners: [LEARNER],
    guardianName: 'Grace Mwangi',
  },
  status: 'linked',
  role: 'guardian',
  learners: [LEARNER],
  selectedLearner: LEARNER,
  selectLearner: vi.fn(),
  displayName: 'Grace Mwangi',
  readerId: 'user-1',
  loading: false,
  error: null,
  ...overrides,
});

const balance = (overrides: Partial<PortalBalance> = {}): PortalBalance => ({
  learner: LEARNER,
  summary: null,
  feeAmount: 650_000,
  amountPaid: 525_000,
  feeExemption: 0,
  feePenalty: 0,
  balance: 125_000,
  overpay: 0,
  earliestDueDate: '2026-03-01',
  ...overrides,
});

const provider = (message = 'Enter your PIN'): PaymentProvider => ({
  describe: () => ({
    id: 'mpesa',
    name: 'M-Pesa',
    capabilities: { collection: true, notification: true, refund: false, query: true, statement: false },
  }),
  signature: () => ({ scheme: 'none', headerNames: [], description: '' }),
  idempotency: () => ({ retries: false, keyFields: [], description: '' }),
  idempotencyKey: () => 'mpesa:1',
  verifyWebhook: () => ({ valid: true, reason: 'none' }),
  parseNotification: () => null,
  initiateCharge: async () => ({ transactionId: 'ws_CO_1', status: 'pending', message, raw: {} }),
  refund: async () => {
    throw new Error('not used');
  },
  queryTransaction: async () => {
    throw new Error('not used');
  },
  statementDialect: () => ({ supported: false, format: null, columns: [], headerSignature: null, notes: null }),
});

const renderPage = (page: React.ReactElement) =>
  render(<MemoryRouter>{page}</MemoryRouter>);

/** The pages read the session from their own data hook, so a state change is applied to all of them. */
const useSession = (next: PortalSession) => {
  hooks.session = next;
  for (const key of ['balance', 'attendance', 'reports', 'notices', 'consent'] as const) {
    const hook = hooks[key] as { session?: PortalSession };
    if (hook.session) hook.session = next;
  }
};

beforeEach(() => {
  hooks.session = linkedSession();
  hooks.balance = { session: linkedSession(), balance: balance(), loading: false, error: null };
  hooks.attendance = {
    session: linkedSession(),
    summary: null,
    records: [],
    loading: false,
    error: null,
  };
  hooks.reports = { session: linkedSession(), reports: [], loading: false, error: null };
  hooks.notices = {
    session: linkedSession(),
    notices: [],
    loading: false,
    error: null,
    markRead: vi.fn(),
  };
  hooks.consent = {
    session: linkedSession(),
    consents: [],
    loading: false,
    error: null,
    save: vi.fn(),
  };
});

describe('the portal pages’ states', () => {
  it('shows a spinner while the session resolves', () => {
    useSession(linkedSession({ loading: true, status: 'loading', selectedLearner: null }));
    renderPage(<PortalFeesContent />);

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shows the access notice for an account with no linked learner', () => {
    useSession(
      linkedSession({
        status: 'unlinked',
        role: null,
        learners: [],
        selectedLearner: null,
        identity: { status: 'unlinked', role: null, learners: [], guardianName: null },
      })
    );
    renderPage(<PortalFeesContent />);

    expect(screen.getByText('No student linked to this account')).toBeTruthy();
  });

  it('shows the error the session reported instead of an empty page', () => {
    useSession(linkedSession({ error: 'The learner record could not be read.' }));
    renderPage(<PortalFeesContent />);

    expect(screen.getByRole('alert').textContent).toContain(
      'The learner record could not be read.'
    );
  });

  it('says no pay-link provider is configured rather than offering a dead button', () => {
    renderPage(<PortalFeesContent />);

    expect(screen.getByRole('status').textContent).toMatch(/No payment provider is configured/);
    expect(screen.queryByRole('button', { name: /Request payment/ })).toBeNull();
  });

  it('requests a payment for the outstanding balance when a provider is configured', async () => {
    render(
      <MemoryRouter>
        <PortalPaymentsProvider
          payments={{ provider: provider(), callbackUrl: 'https://school.test/webhooks/mpesa' }}
        >
          <PortalFeesContent />
        </PortalPaymentsProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+254712345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Request payment/ }));

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('Enter your PIN');
    });
  });

  it('says the learner has not been billed yet instead of showing a zero balance', () => {
    hooks.balance = {
      session: linkedSession(),
      balance: balance({ summary: null, balance: 0, feeAmount: 0, amountPaid: 0 }),
      loading: false,
      error: null,
    };
    renderPage(<PortalFeesContent />);

    expect(screen.getByText(/has not billed this learner yet/)).toBeTruthy();
  });

  it('says a term is not published yet when no card is published', () => {
    const report: PortalTermReport = {
      periodId: 'term-2',
      periodName: 'Term 2 2026',
      state: 'not-published',
      reportCardId: null,
      templateCode: null,
      templateVersion: null,
      publishedAt: null,
      hasPdf: false,
      results: [],
    };
    hooks.reports = { session: linkedSession(), reports: [report], loading: false, error: null };
    renderPage(<PortalReportsContent />);

    expect(screen.getByText('Not published yet')).toBeTruthy();
    expect(screen.getByText(/no published report yet/)).toBeTruthy();
  });

  it('shows a published term with its final results', () => {
    const report: PortalTermReport = {
      periodId: 'term-1',
      periodName: 'Term 1 2026',
      state: 'published',
      reportCardId: 'card-1',
      templateCode: 'termly',
      templateVersion: '1',
      publishedAt: '2026-04-10T09:00:00.000Z',
      hasPdf: true,
      results: [{ areaName: 'Mathematics', score: 82, grade: 'A-', points: 11 }],
    };
    hooks.reports = { session: linkedSession(), reports: [report], loading: false, error: null };
    renderPage(<PortalReportsContent />);

    expect(screen.getByText('Published')).toBeTruthy();
    expect(screen.getByText('Mathematics')).toBeTruthy();
    expect(screen.getByText('A-')).toBeTruthy();
    expect(screen.getByText(/PDF copy/)).toBeTruthy();
  });

  it('says no reporting term has been opened when there is nothing to show', () => {
    renderPage(<PortalReportsContent />);

    expect(screen.getByText(/not opened a reporting term yet/)).toBeTruthy();
  });

  it('shows an empty term rather than a percentage of nothing', () => {
    const summary: PortalAttendanceSummary = {
      periodId: 'term-1',
      periodName: 'Term 1 2026',
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      other: 0,
      percentage: null,
    };
    hooks.attendance = {
      session: linkedSession(),
      summary,
      records: [],
      loading: false,
      error: null,
    };
    renderPage(<PortalAttendanceContent />);

    expect(screen.getByText(/No attendance recorded yet this term/)).toBeTruthy();
  });

  it('shows the term summary and the register marks behind it', () => {
    const summary: PortalAttendanceSummary = {
      periodId: 'term-1',
      periodName: 'Term 1 2026',
      total: 3,
      present: 2,
      absent: 1,
      late: 0,
      excused: 0,
      other: 0,
      percentage: 67,
    };
    const records: PortalAttendanceRecord[] = [
      {
        id: 'mark-1',
        learnerId: LEARNER.id,
        date: '2026-02-03',
        session: 'am',
        status: 'absent',
        minutesLate: null,
        reason: 'illness',
      },
    ];
    hooks.attendance = { session: linkedSession(), summary, records, loading: false, error: null };
    renderPage(<PortalAttendanceContent />);

    expect(screen.getByText('67%')).toBeTruthy();
    expect(screen.getByText('2026-02-03')).toBeTruthy();
    expect(screen.getByText('absent')).toBeTruthy();
  });

  it('marks an unread notice and leaves a read one alone', () => {
    const markRead = vi.fn(async () => undefined);
    const notices: PortalNotice[] = [
      {
        id: 'notice-2',
        title: 'Fee reminder',
        content: 'Term fees are due.',
        priority: 'urgent',
        audience: 'all',
        authorName: 'The Bursar',
        publishedAt: '2026-02-02T08:00:00.000Z',
        expiresAt: null,
        read: false,
      },
      {
        id: 'notice-1',
        title: 'Half-term break',
        content: 'School closes on Friday.',
        priority: 'high',
        audience: 'parents',
        authorName: 'The Head',
        publishedAt: '2026-02-01T08:00:00.000Z',
        expiresAt: null,
        read: true,
      },
    ];
    hooks.notices = { session: linkedSession(), notices, loading: false, error: null, markRead };
    renderPage(<PortalAnnouncementsContent />);

    expect(screen.getAllByRole('button', { name: /Mark as read/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Mark as read/ }));
    expect(markRead).toHaveBeenCalledWith('notice-2');
  });

  it('says there are no notices at this time', () => {
    renderPage(<PortalAnnouncementsContent />);

    expect(screen.getByText('No notices at this time')).toBeTruthy();
  });
});
