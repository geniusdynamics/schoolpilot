// tests/integration/setup-wizard.spec.tsx

// ABOUTME: Automated smoke test for the first-run setup wizard (Phase 4.6):
// ABOUTME walks every step and asserts each step's database writes land in the
// ABOUTME right collections, plus localStorage draft resumability.
//
// NOTE on mechanics: each Next-click is followed by a short settle sleep
// instead of findBy*/waitFor polling Ã¢â‚¬â€ the wizard's async validate+persist
// chain proved flaky under RTL's retry loop in this environment, while a
// fixed settle window is deterministic here.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetupWizard, clearWizardDraft } from '@/components/setup/SetupWizard';

// Captured writes per collection name
const store: Record<string, { inserted: any[] }> = {};

vi.mock('@/hooks/useDatabaseCollection', () => ({
  useDatabaseCollection: vi.fn((name: string) => {
    store[name] ??= { inserted: [] as any[] };
    return {
      data: [], loading: false, error: null, refresh: vi.fn(), collection: null,
      insert: vi.fn(async (doc: any) => b_inserted_push(name, doc)),
      update: vi.fn(async (id: string, patch: any) => ({ id, ...patch })),
      remove: vi.fn(async () => true),
    };
  }),
}));

function b_inserted_push(name: string, doc: any) {
  store[name] ??= { inserted: [] as any[] };
  const it = { id: `${name}-id-${store[name].inserted.length + 1}`, ...doc };
  store[name].inserted.push(it);
  return it;
}

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
  }),
}));

const SETTLE = 500;

/** Click Next and settle. */
function next() {
  const btn = screen.getByRole('button', { name: /^next$/i }) as HTMLButtonElement;
  fireEvent.click(btn);
}

describe('SetupWizard (first-run smoke)', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    localStorage.clear();
    clearWizardDraft();
  });

  it('walks all steps and persists every stepÃ¢â‚¬â„¢s writes', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<SetupWizard onComplete={onDone} />);

    // Step 1 Ã¢â‚¬â€ School profile
    await user.type(screen.getByPlaceholderText(/Greenfields Academy/i), 'Greenfields Academy');
    next();
    await new Promise(r => setTimeout(r, SETTLE));

    // Step 2 Ã¢â‚¬â€ Education system (pick CBC primary: first radio)
    await user.click(screen.getAllByRole('radio')[0]);
    next();
    await new Promise(r => setTimeout(r, SETTLE));

    // Step 3 Ã¢â‚¬â€ Academic year (defaults prefilled)
    next();
    await new Promise(r => setTimeout(r, SETTLE));

    // Step 4 Ã¢â‚¬â€ Classes & streams
    await user.type(screen.getByPlaceholderText(/Class 1/i), 'Form 1');
    next();
    await new Promise(r => setTimeout(r, SETTLE));

    // Step 5 Ã¢â‚¬â€ Subjects preselected Ã¢â€ â€™ advance
    next();
    await new Promise(r => setTimeout(r, SETTLE));

    // Step 6 Ã¢â‚¬â€ Fees left empty Ã¢â€ â€™ skip persistence
    next();
    await new Promise(r => setTimeout(r, SETTLE));

    // Step 7 Ã¢â‚¬â€ Finish
    await user.click(screen.getByRole('button', { name: /finish setup/i }));
    await new Promise(r => setTimeout(r, SETTLE));
    await waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 4000 });

    // School profile landed in settings
    expect(store['settings'].inserted).toHaveLength(1);
    expect(JSON.parse(store['settings'].inserted[0].value).name).toBe('Greenfields Academy');

    // Education system configuration created from the CBC preset
    expect(store['education_system_configurations'].inserted).toHaveLength(1);
    expect(store['education_system_configurations'].inserted[0].grading_system_type).toBe('Competency Based');

    // Academic year + three term definitions + three periods
    expect(store['academic_years'].inserted).toHaveLength(1);
    expect(store['period_definitions'].inserted.map((d: any) => d.name)).toEqual(['Term 1', 'Term 2', 'Term 3']);
    expect(store['school_periods'].inserted).toHaveLength(3);

    // One class with two streams
    expect(store['classes'].inserted.map((c: any) => c.name)).toEqual(['Form 1']);
    expect(store['class_streams'].inserted.map((s: any) => s.name)).toEqual(['North', 'South']);

    // All nine CBC primary subjects seeded
    expect(store['subjects'].inserted).toHaveLength(9);
    expect(store['subjects'].inserted[0]).toMatchObject({ subject_code: 'ENG-P', name: 'English Language Activities' });

    // Fee structure skipped (empty template name)
    expect(store['fee_templates'].inserted).toHaveLength(0);

    // Draft cleaned up on completion
    expect(localStorage.getItem('schoolpilot_setup_wizard_draft')).toBeNull();
  }, 30000);

  it('persists a resumable draft after completing a step', async () => {
    const user = userEvent.setup();
    render(<SetupWizard onComplete={() => {}} />);

    await user.type(screen.getByPlaceholderText(/Greenfields Academy/i), 'Draft Academy');
    next();
    await new Promise(r => setTimeout(r, SETTLE));

    const draft = JSON.parse(localStorage.getItem('schoolpilot_setup_wizard_draft') || '{}');
    expect(draft.stepIndex).toBe(1);
    expect(draft.school.name).toBe('Draft Academy');
  }, 20000);

  it('blocks advancing without a school name', async () => {
    render(<SetupWizard onComplete={() => {}} />);

    next();
    await new Promise(r => setTimeout(r, SETTLE));

    // Validation failed Ã¢â€ â€™ still on step 0; only the initial draft persisted
    expect(screen.getByPlaceholderText(/Greenfields Academy/i)).toBeInTheDocument();
    const draft = JSON.parse(localStorage.getItem('schoolpilot_setup_wizard_draft') || '{}');
    expect(draft.stepIndex ?? 0).toBe(0);
    expect(draft.school?.name ?? '').toBe('');
  }, 20000);
});
