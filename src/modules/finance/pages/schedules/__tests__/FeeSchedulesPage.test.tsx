// ABOUTME: The fee-schedule matrix editor on the canonical repository double: the grid it renders,
// ABOUTME: a draft it re-prices, and the maker-checker approval driven through the real workflow
// ABOUTME: gateway (the repository double gains only the audit surface the engine reads).

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import type { AuditEvent, Repository } from '@/data/repository';
import { FeeScheduleService, createWorkflowApprovalGateway } from '@/domain/finance/schedules';

import {
  createFinanceRepositoryDouble,
  type FinanceRepositoryDouble,
} from '@/modules/finance/data/__tests__/canonicalRepositoryDouble';

import { FeeSchedulesPageContent } from '../FeeSchedulesPage';

const toast = vi.hoisted(() => ({
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast, useToastHelpers: () => toast }));

const rbac = vi.hoisted(() => ({ canWrite: true, canApprove: true }));
vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => ({
    hasPermission: (permission: string) =>
      permission === 'fee_schedule.approve' ? rbac.canApprove : rbac.canWrite,
    userRoles: ['accountant'],
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const INSTITUTION = '00000000-0000-7000-8000-000000000001';
const CAMPUS = '00000000-0000-7000-8000-000000000002';
const STAGE = '00000000-0000-7000-8000-000000000003';
const PROGRAMME = '00000000-0000-7000-8000-000000000004';
const YEAR = '00000000-0000-7000-8000-000000000005';
const PERIOD = '00000000-0000-7000-8000-000000000006';
const CATEGORY = '00000000-0000-7000-8000-000000000007';
const LEVEL = '00000000-0000-7000-8000-000000000008';
const TUITION = '00000000-0000-7000-8000-000000000009';
const SCHEDULE = '00000000-0000-7000-8000-00000000000a';
const SESSION_ACTOR = '00000000-0000-7000-8000-0000000000b1';

function seed(): FinanceRepositoryDouble {
  return createFinanceRepositoryDouble({
    institution: [{ id: INSTITUTION, name: 'Mwangaza', base_currency: 'KES' }],
    campus: [{ id: CAMPUS, institution_id: INSTITUTION, name: 'Main', code: 'MAIN' }],
    stage: [
      {
        id: STAGE,
        institution_id: INSTITUTION,
        programme_id: PROGRAMME,
        name: 'Senior',
        sequence: 1,
        code: 'SEN',
      },
    ],
    programme: [{ id: PROGRAMME, institution_id: INSTITUTION, code: 'CBC', name: 'CBC' }],
    academic_year: [{ id: YEAR, institution_id: INSTITUTION, name: '2027', status: 'current' }],
    academic_period: [
      { id: PERIOD, academic_year_id: YEAR, name: 'Term 1', sequence: 1, status: 'current' },
    ],
    fee_category: [{ id: CATEGORY, institution_id: INSTITUTION, code: 'CITIZEN', name: 'Citizen' }],
    level: [
      {
        id: LEVEL,
        institution_id: INSTITUTION,
        stage_id: STAGE,
        code: 'G10',
        name: 'Grade 10',
        ordinal: 1,
        typical_age: 15,
        is_terminal: false,
      },
    ],
    fee_item: [
      {
        id: TUITION,
        institution_id: INSTITUTION,
        code: 'TUITION',
        name: 'Tuition',
        category: 'tuition',
        refundable: false,
        taxable: false,
        priority: 1,
        funding_source: 'parent',
      },
    ],
    fee_schedule: [
      {
        id: SCHEDULE,
        institution_id: INSTITUTION,
        name: '2027 Term 1',
        academic_year_id: YEAR,
        academic_period_ids: [PERIOD],
        programme_ids: [PROGRAMME],
        level_ids: [LEVEL],
        residence_statuses: ['day', 'boarder'],
        fee_category_ids: [CATEGORY],
        campus_id: CAMPUS,
        new_learners_only: false,
        version: 1,
        status: 'draft',
      },
    ],
    fee_schedule_line: [
      {
        id: '00000000-0000-7000-8000-0000000000c1',
        institution_id: INSTITUTION,
        fee_schedule_id: SCHEDULE,
        fee_item_id: TUITION,
        level_id: LEVEL,
        residence_status: 'day',
        amount: { amount_minor: 600_000, currency: 'KES' },
        mandatory: true,
        frequency: 'per_term',
        proration_rule: 'full',
      },
      {
        id: '00000000-0000-7000-8000-0000000000c2',
        institution_id: INSTITUTION,
        fee_schedule_id: SCHEDULE,
        fee_item_id: TUITION,
        level_id: LEVEL,
        residence_status: 'boarder',
        amount: { amount_minor: 1_850_000, currency: 'KES' },
        mandatory: true,
        frequency: 'per_term',
        proration_rule: 'full',
      },
    ],
  });
}

/** The label of the Grade 10 / day / tuition cell. */
const DAY_CELL = 'Grade 10 day TUITION — Tuition';
/** The label of the Grade 10 / boarder / tuition cell. */
const BOARDER_CELL = 'Grade 10 boarder TUITION — Tuition';

/**
 * The finance double plus the audit surface the workflow engine reads.
 *
 * The engine's store records a transition in the repository's own audit trail; the page's double has
 * no such trail, so this test-local wrapper adds one. Everything else - the guard, the roles and
 * permissions, the maker-checker rule - is the real gateway.
 */
function withAudit(double: FinanceRepositoryDouble): {
  readonly repository: Repository;
  readonly events: AuditEvent[];
} {
  const events: AuditEvent[] = [];
  const record = (event: Omit<AuditEvent, 'id' | 'commitSequence'>) => {
    events.push({ ...event, id: `event-${events.length + 1}`, commitSequence: events.length + 1 });
  };
  const repository = Object.create(double) as Repository;
  repository.create = async (entity, input, options) => {
    const row = await double.create(entity, input, options);
    record({
      entity,
      entityId: String(row.id),
      action: 'create',
      actorId: options?.actor ?? null,
      changedFields: [],
      before: null,
      after: row,
      reason: options?.reason ?? null,
      createdAt: new Date().toISOString(),
    });
    return row;
  };
  repository.update = async (entity, id, patch, options) => {
    const before = await double.get(entity, id);
    const row = await double.update(entity, id, patch, options);
    record({
      entity,
      entityId: String(id),
      action: 'update',
      actorId: options.actor ?? null,
      changedFields: Object.keys(patch as Record<string, unknown>),
      before,
      after: row,
      reason: options.reason ?? null,
      createdAt: new Date().toISOString(),
    });
    return row;
  };
  repository.auditTrail = async (entity, entityId) =>
    events
      .filter((event) => event.entity === entity && event.entityId === entityId)
      .slice()
      .reverse();
  repository.auditLog = async (query = {}) =>
    events
      .filter((event) => (query.entity === undefined ? true : event.entity === query.entity))
      .slice()
      .reverse();
  return { repository, events };
}

let double: FinanceRepositoryDouble;

beforeEach(() => {
  rbac.canWrite = true;
  rbac.canApprove = true;
  toast.showSuccess.mockClear();
  toast.showError.mockClear();
  double = seed();
  window.localStorage.setItem('schoolpilot.actorId', SESSION_ACTOR);
});

const renderPage = (repository: Repository) => {
  const service = new FeeScheduleService({
    store: double,
    approvals: createWorkflowApprovalGateway(repository),
  });
  return render(
    <MemoryRouter>
      <ConfirmProvider>
        <CanonicalRepositoryProvider repository={double}>
          <FeeSchedulesPageContent service={service} />
        </CanonicalRepositoryProvider>
      </ConfirmProvider>
    </MemoryRouter>
  );
};

describe('the fee-schedule matrix editor', () => {
  it('renders a column per level and residence, with the stored amounts', async () => {
    const { repository } = withAudit(double);
    renderPage(repository);

    // A draft shows each cell as an editable amount, seeded from the stored line.
    const day = await screen.findByLabelText(DAY_CELL);
    expect(day).toHaveValue('6000.00');
    expect(screen.getByLabelText(BOARDER_CELL)).toHaveValue('18500.00');
    expect(screen.getAllByText(/Grade 10/).length).toBeGreaterThan(0);
  });

  it('re-prices a draft and writes the cell through the repository', async () => {
    const { repository } = withAudit(double);
    renderPage(repository);
    const cell = await screen.findByLabelText(DAY_CELL);

    fireEvent.change(cell, { target: { value: '6500' } });
    fireEvent.click(screen.getByRole('button', { name: /Save the draft/i }));

    await waitFor(() =>
      expect(double.writes.some((write) => write.entity === 'fee_schedule_line')).toBe(true)
    );
    const lines = (double.rows.fee_schedule_line ?? []) as readonly Record<string, unknown>[];
    const day = lines.find((line) => line.residence_status === 'day' && !line.deleted_at);
    expect((day?.amount as { amount_minor: number }).amount_minor).toBe(650_000);
  });

  it('refuses an approval by the maker who submitted', async () => {
    const { repository } = withAudit(double);
    renderPage(repository);
    await screen.findByLabelText(DAY_CELL);

    fireEvent.click(screen.getByRole('button', { name: /Submit for approval/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Approve$/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /^Approve$/i }));
    expect(
      await screen.findByText(/approved by someone other than the person who submitted it/i)
    ).toBeInTheDocument();

    // The version is still submitted: nothing was written by the refused approval.
    const version = await double.get('fee_schedule', SCHEDULE as never);
    expect(version?.status).toBe('submitted');
  });

  it('offers no write or approval action without the permission', async () => {
    rbac.canWrite = false;
    rbac.canApprove = false;
    const { repository } = withAudit(double);
    renderPage(repository);
    await screen.findByLabelText(DAY_CELL);

    expect(screen.queryByRole('button', { name: /Save the draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Submit for approval/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load the spec/i })).not.toBeInTheDocument();
  });

  it('shows the version history', async () => {
    const { repository } = withAudit(double);
    renderPage(repository);
    expect(await screen.findByText('Version history')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2027 Term 1 v1' })).toBeInTheDocument();
  });
});
