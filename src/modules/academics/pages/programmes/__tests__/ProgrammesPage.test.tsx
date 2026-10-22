// ABOUTME: The programme management page, on a real database: it lists each programme with the pack it
// ABOUTME: runs on and that pack's verification, previews an upgrade and refuses an unsafe one with its
// ABOUTME: reason, applies a safe upgrade, and records an override with its actor and instant.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { closeTestContext, createTestContext, type TestContext } from '@/data/__tests__/harness';
import { loadPack } from '@/domain/curriculum/registry';
import { asId } from '@/domain/ids';

import { availablePackOf, listAvailablePacks, type AvailablePack } from '@/components/setup/packs/packLibrary';
import { installPackProgramme } from '@/components/setup/steps/programmeInstall';

import { ProgrammesPageContent } from '../ProgrammesPage';

const AT = '2026-10-22T10:00:00.000Z';
const PACKS = listAvailablePacks();
const KE_844 = PACKS.find((pack) => pack.code === 'ke-844')!;

/** A candidate pack: the shipped ke-844 document at another version, optionally edited. */
function candidate(version: string, edit?: (document: Record<string, unknown>) => void): AvailablePack {
  const document = structuredClone(KE_844.document) as Record<string, unknown>;
  const manifest = document.pack as Record<string, unknown>;
  manifest.version = version;
  edit?.(document);
  const loaded = loadPack(document);
  if (!loaded.ok) throw new Error(`the test candidate does not load: ${JSON.stringify(loaded.issues)}`);
  return availablePackOf(loaded.pack, document);
}

/** The next minor version: one band label fixed, nothing structural. */
const SAFE = candidate('1.1.0', (document) => {
  const assessment = document.assessment as { grading_scales: Array<{ bands: Array<{ label: string }> }> };
  assessment.grading_scales[0].bands[0].label = 'A (revised)';
});

/** The next major version, minus the English learning area an installed programme has a row for. */
const UNSAFE = candidate('2.0.0', (document) => {
  const areas = document.learning_areas as {
    learning_areas: Array<{ code: string }>;
    combination_rules: Array<{ of?: string[] }>;
  };
  areas.learning_areas = areas.learning_areas.filter((area) => area.code !== 'ENG');
  for (const rule of areas.combination_rules) {
    if (Array.isArray(rule.of)) rule.of = rule.of.filter((entry) => !entry.split('|').includes('ENG'));
  }
  // Every reference to the removed area has to go too, or the candidate is not a valid pack at all.
  const assessment = document.assessment as {
    aggregations: Array<{
      over?: string[];
      groups?: Array<{ require_all?: string[] }>;
      fail_if?: { in?: string[] };
    }>;
  };
  for (const aggregation of assessment.aggregations) {
    if (Array.isArray(aggregation.over)) aggregation.over = aggregation.over.filter((code) => code !== 'ENG');
    if (Array.isArray(aggregation.fail_if?.in)) {
      aggregation.fail_if.in = aggregation.fail_if.in.filter((code) => code !== 'ENG');
    }
    for (const group of aggregation.groups ?? []) {
      if (Array.isArray(group.require_all)) {
        group.require_all = group.require_all.filter((entry) => !entry.split('|').includes('ENG'));
      }
    }
  }
});

describe('the programme management page', () => {
  let context: TestContext;
  let ke844ProgrammeId: string;

  const repositoryPacks = [...PACKS, SAFE, UNSAFE];

  beforeEach(async () => {
    context = await createTestContext();
    const installed = await installPackProgramme({
      repository: context.repository,
      actor: context.seed.idOf('user'),
      pack: KE_844,
      institutionId: context.seed.idOf('institution'),
    });
    ke844ProgrammeId = installed.programmeId;
  });

  afterEach(async () => {
    await closeTestContext(context);
  });

  const renderPage = () =>
    render(
      <ProgrammesPageContent
        repository={context.repository}
        packs={repositoryPacks}
        actor={context.seed.idOf('user')}
        now={() => new Date(AT)}
      />
    );

  it('lists every programme with its pack and verification status', async () => {
    renderPage();

    const secondary = await screen.findByTestId(`programme-row-${ke844ProgrammeId}`);
    expect(within(secondary).getByTestId(`programme-pack-${ke844ProgrammeId}`).textContent).toContain('ke-844@1.0.0');
    expect(within(secondary).getByTestId(`programme-verification-${ke844ProgrammeId}`).textContent).toContain('draft');
    expect(within(secondary).getByTestId(`programme-verification-${ke844ProgrammeId}`).textContent).toContain(
      'Not reviewed by a curriculum officer'
    );
    expect(secondary.textContent).toContain('4 levels');
    expect(secondary.textContent).toContain('13 learning areas');
    expect(secondary.textContent).toContain('2 report templates');

    // The seeded CBE programme is listed too, and its version is not in the installed library.
    const cbe = await screen.findByText('CBE Junior School');
    const cbeRow = cbe.closest('[data-testid^="programme-row-"]') as HTMLElement;
    expect(cbeRow.textContent).toContain('not in the installed library');
  });

  it('previews a safe upgrade, then applies it and moves the pin', async () => {
    renderPage();
    const row = await screen.findByTestId(`programme-row-${ke844ProgrammeId}`);

    fireEvent.change(within(row).getByTestId(`upgrade-candidate-${ke844ProgrammeId}`), {
      target: { value: SAFE.ref },
    });
    fireEvent.click(within(row).getByTestId(`preview-upgrade-${ke844ProgrammeId}`));

    const preview = await screen.findByTestId('upgrade-preview');
    expect(within(preview).getByTestId('upgrade-safety').textContent).toContain('Safe to apply');

    fireEvent.click(within(row).getByTestId(`apply-upgrade-${ke844ProgrammeId}`));
    await screen.findByTestId('programmes-notice');

    const programme = await context.repository.get('programme', asId<'programme'>(ke844ProgrammeId));
    expect(programme?.pack_version).toBe('1.1.0');
  });

  it('refuses an unsafe upgrade and says why, without applying it', async () => {
    renderPage();
    const row = await screen.findByTestId(`programme-row-${ke844ProgrammeId}`);

    fireEvent.change(within(row).getByTestId(`upgrade-candidate-${ke844ProgrammeId}`), {
      target: { value: UNSAFE.ref },
    });
    fireEvent.click(within(row).getByTestId(`preview-upgrade-${ke844ProgrammeId}`));

    const preview = await screen.findByTestId('upgrade-preview');
    expect(within(preview).getByTestId('upgrade-safety').textContent).toContain('Refused');
    expect(within(preview).getByTestId('upgrade-breaks').textContent).toContain('ENG');
    expect(within(row).getByTestId(`apply-upgrade-${ke844ProgrammeId}`)).toBeDisabled();

    const programme = await context.repository.get('programme', asId<'programme'>(ke844ProgrammeId));
    expect(programme?.pack_version).toBe('1.0.0');
  });

  it('records an override with its actor and instant, and reverts it', async () => {
    renderPage();
    const row = await screen.findByTestId(`programme-row-${ke844ProgrammeId}`);

    fireEvent.click(within(row).getByTestId(`add-override-${ke844ProgrammeId}`));
    const form = await within(row).findByTestId(`override-form-${ke844ProgrammeId}`);
    fireEvent.change(within(form).getByLabelText('Override path'), {
      target: { value: 'reports.term-f1-f3.page' },
    });
    fireEvent.change(within(form).getByLabelText('Override value (JSON)'), {
      target: { value: JSON.stringify({ size: 'A5', orientation: 'landscape' }) },
    });
    fireEvent.change(within(form).getByLabelText('Override reason'), {
      target: { value: 'The school prints its term report on A5 landscape.' },
    });
    fireEvent.click(within(form).getByTestId(`save-override-${ke844ProgrammeId}`));

    const list = await screen.findByTestId(`overrides-${ke844ProgrammeId}`);
    const entry = within(list).getByTestId('override-reports.term-f1-f3.page');
    expect(entry.textContent).toContain(context.seed.idOf('user'));
    expect(entry.textContent).toContain(AT);

    fireEvent.click(within(entry).getByTestId('revert-override-reports.term-f1-f3.page'));
    await screen.findByTestId('programmes-notice');
    expect(await context.repository.get('programme', asId<'programme'>(ke844ProgrammeId))).toBeTruthy();
  });
});
