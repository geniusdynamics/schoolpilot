// ABOUTME: Integration test for the first-run setup wizard on the real SQLite-WASM provider (in-memory database):
// ABOUTME: walking every step with Back/Next twice creates exactly one of each record in the defined collections.

import { render, screen, fireEvent, waitFor, cleanup, configure } from '@testing-library/react';

// The wizard's steps write through the real provider and take seconds each; Testing Library's
// 1000 ms default for waitFor is tight enough that a slower CI runner fails a passing assertion.
configure({ asyncUtilTimeout: 20_000 });
// Each case drives the whole wizard through the real provider; the global 20 s budget is not enough
// on a loaded CI runner.
vi.setConfig({ testTimeout: 60_000 });
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SQLiteWASMProvider } from '@/services/database/SQLiteWASMProvider';
import { collectionsDefinition } from '@/services/database/collections';
import { FinancialYearStatus } from '@/core/types';

// The hooks and databaseService are real; only the provider registry is pointed at a fresh in-memory SQLite database.
const real = vi.hoisted(() => ({ provider: null as null | { getCollection: (n: string) => any; getAllCollections: () => Map<string, any> } }));

vi.mock('@/services/database/ProviderSelector', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const manager = {
    getCollection: (name: string) => real.provider?.getCollection(name) ?? null,
    getAllCollections: () => real.provider?.getAllCollections() ?? new Map(),
  };
  return { ...actual, getDatabaseManager: () => manager };
});

// Creating the administrator goes through the auth service (tested on its own); here it writes the real users row.
vi.mock('@/services/auth/authService', () => ({
  MIN_ADMIN_PASSWORD_LENGTH: 10,
  authService: {
    createInitialAdministrator: vi.fn(async (input: { username: string; displayName: string; password: string }) => {
      const users = real.provider!.getCollection('users');
      if ((await users.find({})).length > 0) return { success: false, message: 'An administrator already exists. Sign in instead.' };
      const now = new Date().toISOString();
      await users.insert({
        username: input.username.trim(),
        display_name: input.displayName.trim(),
        email: '',
        role_id: 'super_admin',
        is_active: true,
        hashed_password: 'hash',
        created_at: now,
        updated_at: now,
      });
      return { success: true, message: 'Administrator created.' };
    }),
  },
}));

const toast = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));

// The canonical school is written through the real seed unless a test asks for a failure, so the
// wizard's own behaviour is exercised against the code it actually runs.
const canonical = vi.hoisted(() => ({ fail: false, message: 'the demo school could not be seeded at "structure"' }));
vi.mock('@/components/setup/steps/canonicalSetup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/setup/steps/canonicalSetup')>();
  return {
    ...actual,
    saveCanonicalSchool: async (draft: Parameters<typeof actual.saveCanonicalSchool>[0]) => {
      if (canonical.fail) throw new Error(canonical.message);
      return actual.saveCanonicalSchool(draft);
    },
  };
});

import { SetupWizard, clearWizardDraft } from '@/components/setup/SetupWizard';
import { readSetupCompletedAt } from '@/components/setup/steps/setupStatus';
import SettingsSchoolProfilePage from '@/modules/settings/pages/SettingsSchoolProfilePage';

const COLLECTIONS = [
  'school_details', 'users', 'education_system_configurations', 'academic_year_structures',
  'academic_period_definitions', 'academic_years', 'financial_years', 'school_periods',
  'classes', 'class_streams', 'subjects', 'fee_templates',
];
const TOTAL_STEPS = 7;
let dbSeq = 0;

async function openRealDatabase() {
  vi.stubEnv('VITE_DB_ALLOW_MEMORY', 'true');
  const provider = new SQLiteWASMProvider({ name: `setup-wizard-${++dbSeq}`, version: 1 });
  await provider.initialize();
  for (const name of COLLECTIONS) {
    await provider.createCollection(name, (collectionsDefinition as Record<string, { schema: any }>)[name].schema);
  }
  real.provider = provider;
  return provider;
}

const rows = async (name: string): Promise<any[]> => (await real.provider!.getCollection(name).find({})) ?? [];
const onStep = (n: number) => screen.findByText(`Step ${n} of ${TOTAL_STEPS}`, {}, { timeout: 20_000 });
const click = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Advances from step `n`, then goes Back and Next again twice so step n's writer runs three times. */
async function nextWithBackAndForth(n: number) {
  click(/^Next$/);
  await onStep(n + 1);
  for (let i = 0; i < 2; i++) {
    click(/^Previous$/);
    await onStep(n);
    click(/^Next$/);
    await onStep(n + 1);
  }
}

async function walkWizard(onComplete = vi.fn()) {
  render(<SetupWizard onComplete={onComplete} />);
  await onStep(1);

  fireEvent.change(screen.getByPlaceholderText('e.g. Greenfields Academy'), { target: { value: 'Greenfields Academy' } });
  await nextWithBackAndForth(1);

  fireEvent.click(screen.getAllByRole('radio')[0]); // CBC primary
  await nextWithBackAndForth(2);

  type('Year name', '2027');
  type('Academic year start', '2027-01-04');
  type('Academic year end', '2027-11-26');
  type('Term 1 start', '2027-01-04');
  type('Term 1 end', '2027-04-02');
  type('Term 2 start', '2027-04-26');
  type('Term 2 end', '2027-07-30');
  type('Term 3 start', '2027-08-23');
  type('Term 3 end', '2027-10-29');
  await nextWithBackAndForth(3);

  fireEvent.change(screen.getByPlaceholderText('Class 1'), { target: { value: 'Grade 7' } });
  click(/Add class/);
  fireEvent.change(screen.getByPlaceholderText('Class 2'), { target: { value: 'Grade 8' } });
  const streamInputs = screen.getAllByPlaceholderText(/Streams, comma-separated/);
  fireEvent.change(streamInputs[1], { target: { value: 'Blue' } });
  await nextWithBackAndForth(4);

  await nextWithBackAndForth(5); // subjects: all preset subjects stay ticked
  await nextWithBackAndForth(6); // sample data: the demo rows stay unticked

  type('Administrator username', 'head-admin');
  type('Display name', 'Head Administrator');
  type('Password', 'correct-horse-1');
  type('Confirm password', 'correct-horse-1');
  click(/Finish setup/);
  await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 20_000 });
  return onComplete;
}

describe('SetupWizard on the real provider', () => {
  beforeEach(async () => {
    localStorage.clear();
    clearWizardDraft();
    Object.values(toast).forEach((fn) => fn.mockClear());
    await openRealDatabase();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
  });

  it('Back/Next twice per step creates exactly one year, three terms, the classes, streams, subjects and profile', async () => {
    await walkWizard();
    expect(toast.showError).not.toHaveBeenCalled();

    const school = await rows('school_details');
    expect(school).toHaveLength(1);
    expect(school[0].name).toBe('Greenfields Academy');
    // Completion is recorded in the database, not only in this browser's storage.
    expect(typeof school[0].setup_completed_at).toBe('string');
    expect(Number.isNaN(Date.parse(school[0].setup_completed_at))).toBe(false);
    expect(await readSetupCompletedAt()).toBe(school[0].setup_completed_at);

    expect(await rows('education_system_configurations')).toHaveLength(1);

    const [structure, ...extraStructures] = await rows('academic_year_structures');
    expect(extraStructures).toHaveLength(0);
    const definitions = (await rows('academic_period_definitions')).sort((a, b) => a.sequence_order - b.sequence_order);
    expect(definitions.map((d) => [d.name, d.sequence_order, d.structure_id])).toEqual([
      ['Term 1', 1, structure.id], ['Term 2', 2, structure.id], ['Term 3', 3, structure.id],
    ]);

    const years = await rows('academic_years');
    expect(years).toHaveLength(1);
    expect(years[0]).toMatchObject({ name: '2027', structure_id: structure.id, start_date: '2027-01-04', end_date: '2027-11-26' });

    const financialYears = await rows('financial_years');
    expect(financialYears).toHaveLength(1);
    expect(financialYears[0]).toMatchObject({ name: 'FY 2027', start_date: '2027-01-01', end_date: '2027-12-31', status: FinancialYearStatus.OPEN });

    const terms = (await rows('school_periods')).sort((a, b) => a.start_date.localeCompare(b.start_date));
    expect(terms).toHaveLength(3);
    expect(terms.map((t) => [t.start_date, t.end_date])).toEqual([
      ['2027-01-04', '2027-04-02'], ['2027-04-26', '2027-07-30'], ['2027-08-23', '2027-10-29'],
    ]);
    for (const [i, term] of terms.entries()) {
      expect(term.academic_year_id).toBe(years[0].id);
      expect(term.financial_year_id).toBe(financialYears[0].id);
      expect(term.period_definition_id).toBe(definitions[i].id);
      expect(typeof term.id).toBe('string');
    }
    expect(terms.filter((t) => Boolean(t.is_active))).toHaveLength(1);

    const classes = await rows('classes');
    expect(classes.map((c) => c.name).sort()).toEqual(['Grade 7', 'Grade 8']);
    const streams = await rows('class_streams');
    const classIdByName = Object.fromEntries(classes.map((c) => [c.name, c.id]));
    expect(streams.map((s) => [s.name, s.class_id]).sort()).toEqual([
      ['Blue', classIdByName['Grade 8']],
      ['North', classIdByName['Grade 7']],
      ['South', classIdByName['Grade 7']],
    ]);

    const subjects = await rows('subjects');
    expect(subjects).toHaveLength(9);
    expect(new Set(subjects.map((s) => s.subject_code)).size).toBe(9);

    const users = await rows('users');
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ username: 'head-admin', display_name: 'Head Administrator' });

    // No fee template is created by the wizard and the draft is cleared on completion.
    expect(await rows('fee_templates')).toHaveLength(0);
    expect(localStorage.getItem('schoolpilot_setup_wizard_draft')).toBeNull();
  }, 60000);

  it('updates the stored terms instead of adding new ones when dates change on a second pass', async () => {
    render(<SetupWizard onComplete={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Greenfields Academy'), { target: { value: 'Edit Academy' } });
    click(/^Next$/);
    await onStep(2);
    fireEvent.click(screen.getAllByRole('radio')[0]);
    click(/^Next$/);
    await onStep(3);
    type('Year name', '2027');
    type('Academic year start', '2027-01-04');
    type('Academic year end', '2027-11-26');
    click(/^Next$/);
    await onStep(4);

    click(/^Previous$/);
    await onStep(3);
    type('Year name', '2027/28');
    type('Term 2 end', '2027-07-23');
    click(/^Next$/);
    await onStep(4);

    const years = await rows('academic_years');
    expect(years.map((y) => y.name)).toEqual(['2027/28']);
    const terms = await rows('school_periods');
    expect(terms).toHaveLength(3);
    expect(terms.map((t) => t.end_date)).toContain('2027-07-23');
  }, 30000);

  it('removes a subject the wizard created when it is unticked on a later pass', async () => {
    render(<SetupWizard onComplete={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Greenfields Academy'), { target: { value: 'Subject Academy' } });
    for (let step = 1; step <= 6; step++) {
      if (step === 2) fireEvent.click(screen.getAllByRole('radio')[0]);
      if (step === 3) {
        type('Academic year start', '2027-01-04');
        type('Academic year end', '2027-11-26');
      }
      click(/^Next$/);
      await onStep(step + 1);
    }
    expect(await rows('subjects')).toHaveLength(9);

    click(/^Previous$/);
    await onStep(6);
    click(/^Previous$/);
    await onStep(5);
    fireEvent.click(screen.getByText('Pastoral Programme of Instruction'));
    click(/^Next$/);
    await onStep(6);

    const codes = (await rows('subjects')).map((s) => s.subject_code);
    expect(codes).toHaveLength(8);
    expect(codes).not.toContain('PSC-P');
  }, 30000);

  it('leaves a financial year the school already had unchanged when the year step is passed again', async () => {
    const before = {
      id: 'fy-existing', name: 'FY 2027', start_date: '2026-12-01', end_date: '2027-12-31',
      status: FinancialYearStatus.OPEN, created_at: '2026-11-01T00:00:00.000Z', updated_at: '2026-11-01T00:00:00.000Z',
    };
    await real.provider!.getCollection('financial_years').insert({ ...before });

    render(<SetupWizard onComplete={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Greenfields Academy'), { target: { value: 'Fiscal Academy' } });
    click(/^Next$/);
    await onStep(2);
    fireEvent.click(screen.getAllByRole('radio')[0]);
    click(/^Next$/);
    await onStep(3);
    type('Year name', '2027');
    type('Academic year start', '2027-01-04');
    type('Academic year end', '2027-11-26');
    await nextWithBackAndForth(3);
    expect(toast.showError).not.toHaveBeenCalled();

    const financialYears = await rows('financial_years');
    expect(financialYears).toHaveLength(1);
    expect(financialYears[0]).toMatchObject(before);
    const terms = await rows('school_periods');
    expect(terms).toHaveLength(3);
    expect(terms.every((t) => t.financial_year_id === 'fy-existing')).toBe(true);
  }, 30000);

  it('leaves an education system configuration the school already had unchanged', async () => {
    await walkWizard();
    const [config] = await rows('education_system_configurations');
    await real.provider!.getCollection('education_system_configurations').update(config.id, { description: 'Our own notes' });
    clearWizardDraft();
    cleanup();

    render(<SetupWizard onComplete={() => {}} />);
    await onStep(1);
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Greenfields Academy')).toHaveValue('Greenfields Academy'));
    click(/^Next$/);
    await onStep(2);
    fireEvent.click(screen.getAllByRole('radio')[0]);
    click(/^Next$/);
    await onStep(3);

    const configs = await rows('education_system_configurations');
    expect(configs).toHaveLength(1);
    expect(configs[0].description).toBe('Our own notes');
  }, 60000);

  it('opens the wizard from Settings › School and can cancel it before setup is complete', async () => {
    render(<SettingsSchoolProfilePage />);
    fireEvent.click(await screen.findByRole('button', { name: /^Run setup wizard$/ }));
    await onStep(1);
    click(/^Cancel$/);
    await waitFor(() => expect(screen.queryByText(`Step 1 of ${TOTAL_STEPS}`)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^Run setup wizard$/ })).toBeInTheDocument();
  }, 30000);

  it('re-runs the wizard from Settings › School without duplicating any record', async () => {
    await walkWizard();
    const count = async () => Object.fromEntries(await Promise.all(COLLECTIONS.map(async (name) => [name, (await rows(name)).length])));
    const before = await count();
    const [{ setup_completed_at: firstCompletion }] = await rows('school_details');
    cleanup();

    render(<SettingsSchoolProfilePage />);
    fireEvent.click(await screen.findByRole('button', { name: /^Re-run setup wizard$/ }));
    await onStep(1);
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Greenfields Academy')).toHaveValue('Greenfields Academy'));
    click(/^Next$/);
    await onStep(2);
    fireEvent.click(screen.getAllByRole('radio')[0]);
    await nextWithBackAndForth(2);
    type('Year name', '2027');
    type('Academic year start', '2027-01-04');
    type('Academic year end', '2027-11-26');
    type('Term 1 start', '2027-01-04');
    type('Term 1 end', '2027-04-02');
    type('Term 2 start', '2027-04-26');
    type('Term 2 end', '2027-07-30');
    type('Term 3 start', '2027-08-23');
    type('Term 3 end', '2027-10-29');
    await nextWithBackAndForth(3);
    fireEvent.change(screen.getByPlaceholderText('Class 1'), { target: { value: 'Grade 7' } });
    await nextWithBackAndForth(4);
    await nextWithBackAndForth(5);
    await nextWithBackAndForth(6);
    expect(await screen.findByText(/An administrator account already exists/)).toBeInTheDocument();
    click(/Finish setup/);
    await waitFor(() => expect(screen.queryByText(`Step 6 of ${TOTAL_STEPS}`)).not.toBeInTheDocument(), { timeout: 20_000 });
    expect(toast.showError).not.toHaveBeenCalled();

    expect(await count()).toEqual(before);
    const [school] = await rows('school_details');
    expect(school.setup_completed_at >= firstCompletion).toBe(true);
  }, 90000);

  it('keeps the user on the year step when a term falls outside the academic year', async () => {
    render(<SetupWizard onComplete={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Greenfields Academy'), { target: { value: 'Rules Academy' } });
    click(/^Next$/);
    await onStep(2);
    fireEvent.click(screen.getAllByRole('radio')[0]);
    click(/^Next$/);
    await onStep(3);
    type('Year name', '2027');
    type('Academic year start', '2027-01-04');
    type('Academic year end', '2027-11-26');
    type('Term 3 end', '2027-12-20');
    click(/^Next$/);

    await waitFor(() => expect(toast.showError).toHaveBeenCalledWith(expect.stringMatching(/within academic year 2027/)));
    expect(screen.getByText(`Step 3 of ${TOTAL_STEPS}`)).toBeInTheDocument();
    expect(await rows('school_periods')).toHaveLength(0);
  }, 30000);

  it('rejects a short or mismatched administrator password and never stores it in the draft', async () => {
    render(<SetupWizard onComplete={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Greenfields Academy'), { target: { value: 'Admin Academy' } });
    for (let step = 1; step <= 6; step++) {
      if (step === 2) fireEvent.click(screen.getAllByRole('radio')[0]);
      click(/^Next$/);
      await onStep(step + 1);
    }
    type('Administrator username', 'head-admin');
    type('Display name', 'Head');
    type('Password', 'short');
    type('Confirm password', 'short');
    click(/Finish setup/);
    await waitFor(() => expect(toast.showError).toHaveBeenCalledWith(expect.stringMatching(/at least 10 characters/)));

    type('Password', 'long-enough-pass');
    type('Confirm password', 'different-pass-1');
    click(/Finish setup/);
    await waitFor(() => expect(toast.showError).toHaveBeenCalledWith(expect.stringMatching(/do not match/)));

    expect(await rows('users')).toHaveLength(0);
    expect(localStorage.getItem('schoolpilot_setup_wizard_draft') ?? '').not.toMatch(/long-enough-pass|different-pass-1/);
  }, 30000);

  it('skips administrator creation when an account already exists', async () => {
    const now = new Date().toISOString();
    await real.provider!.getCollection('users').insert({
      id: 'u1', username: 'existing', email: '', role_id: 'super_admin', is_active: true, created_at: now, updated_at: now,
    });
    const onComplete = vi.fn();
    render(<SetupWizard onComplete={onComplete} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Greenfields Academy'), { target: { value: 'Existing Academy' } });
    for (let step = 1; step <= 6; step++) {
      if (step === 2) fireEvent.click(screen.getAllByRole('radio')[0]);
      click(/^Next$/);
      await onStep(step + 1);
    }
    expect(await screen.findByText(/An administrator account already exists/)).toBeInTheDocument();
    click(/Finish setup/);
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(await rows('users')).toHaveLength(1);
  }, 30000);

  it('does not complete setup when the canonical school cannot be written, and completes on a retry', async () => {
    const now = new Date().toISOString();
    await real.provider!.getCollection('users').insert({
      id: 'u-canon', username: 'existing', email: '', role_id: 'super_admin', is_active: true, created_at: now, updated_at: now,
    });
    const onComplete = vi.fn();
    render(<SetupWizard onComplete={onComplete} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Greenfields Academy'), { target: { value: 'Canon Academy' } });
    for (let step = 1; step <= 6; step++) {
      if (step === 2) fireEvent.click(screen.getAllByRole('radio')[0]);
      if (step === 3) {
        type('Academic year start', '2027-01-04');
        type('Academic year end', '2027-11-26');
      }
      click(/^Next$/);
      await onStep(step + 1);
    }

    // The canonical structure is what the migrated pages read; without it the install has no
    // class groups, so setup must not be recorded as complete.
    canonical.fail = true;
    click(/Finish setup/);

    await waitFor(() =>
      expect(toast.showError).toHaveBeenCalledWith(expect.stringMatching(/Setup is not complete/))
    );
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByText(`Step 7 of ${TOTAL_STEPS}`)).toBeInTheDocument();

    const [school] = await rows('school_details');
    expect(school?.setup_completed_at ?? null).toBeNull();
    expect(await readSetupCompletedAt()).toBeNull();
    expect(localStorage.getItem('schoolpilot_setup_wizard_draft')).not.toBeNull();

    // The problem is fixed, and finishing again writes the school and records completion.
    canonical.fail = false;
    click(/Finish setup/);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const [completed] = await rows('school_details');
    expect(typeof completed?.setup_completed_at).toBe('string');
    expect(localStorage.getItem('schoolpilot_setup_wizard_draft')).toBeNull();
  }, 60000);

  it('persists a resumable draft after completing a step', async () => {
    render(<SetupWizard onComplete={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Greenfields Academy'), { target: { value: 'Draft Academy' } });
    click(/^Next$/);
    await onStep(2);

    const draft = JSON.parse(localStorage.getItem('schoolpilot_setup_wizard_draft') || '{}');
    expect(draft.stepIndex).toBe(1);
    expect(draft.school.name).toBe('Draft Academy');
  }, 20000);

  it('blocks advancing without a school name', async () => {
    render(<SetupWizard onComplete={() => {}} />);
    await onStep(1);
    click(/^Next$/);
    await new Promise((r) => setTimeout(r, 200));

    expect(screen.getByText(`Step 1 of ${TOTAL_STEPS}`)).toBeInTheDocument();
    expect(await rows('school_details')).toHaveLength(0);
  }, 20000);
});
