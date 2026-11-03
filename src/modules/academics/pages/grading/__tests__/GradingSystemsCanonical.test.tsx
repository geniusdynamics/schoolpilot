// ABOUTME: Page tests for the canonical grading screens: scales and schemes are read from the
// ABOUTME: repository, a pack-installed row is marked and locked, and a school row can be created.

import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { TestProviders } from '@/tests/setup';

import { CanonicalRepositoryProvider } from '@/modules/academics/data/canonicalRepository';
import { GradingScalesTab } from '../GradingScalesTab';
import { AssessmentSchemesTab } from '../AssessmentSchemesTab';
import { SystemConfigTab } from '../SystemConfigTab';
import type { PackGradingDeclaration } from '../provenance';
import {
  createFakeRepository,
  type FakeRepository,
  type FakeRepositoryRows,
} from '../../__tests__/canonicalRepositoryDouble';

const INSTITUTION = '0192a1b2-0000-7000-8000-000000000001';
const PROGRAMME = '0192a1b2-0000-7000-8000-000000000002';
const LEVEL_SEVEN = '0192a1b2-0000-7000-8000-000000000003';
const LEVEL_EIGHT = '0192a1b2-0000-7000-8000-000000000004';
const PACK_SCALE = '0192a1b2-0000-7000-8000-000000000005';
const SCHOOL_SCALE = '0192a1b2-0000-7000-8000-000000000006';
const SCHEME = '0192a1b2-0000-7000-8000-000000000007';

const DECLARATION: PackGradingDeclaration = {
  code: 'ke-cbe',
  version: '1.0.0',
  ref: 'ke-cbe@1.0.0',
  gradingScaleCodes: ['cbe_8_level'],
  schemeCodes: ['ke-cbe-terminal'],
};

function rows(): FakeRepositoryRows {
  return {
    institution: [{ id: INSTITUTION, name: 'Greenfields Academy' }],
    programme: [
      {
        id: PROGRAMME,
        name: 'CBC',
        curriculum_pack_code: 'ke-cbe',
        pack_version: '1.0.0',
        status: 'active',
        institution_id: INSTITUTION,
      },
    ],
    curriculum_pack: [{ id: 'pack-source', code: 'ke-cbe', version: '1.0.0', institution_id: INSTITUTION }],
    level: [
      { id: LEVEL_SEVEN, name: 'Grade 7', ordinal: 7, institution_id: INSTITUTION },
      { id: LEVEL_EIGHT, name: 'Grade 8', ordinal: 8, institution_id: INSTITUTION },
    ],
    grading_scale: [
      {
        id: PACK_SCALE,
        institution_id: INSTITUTION,
        programme_id: PROGRAMME,
        code: 'cbe_8_level',
        kind: 'numeric_bands',
        version: '1.0.0',
        bands: [
          { code: 'EE1', label: 'Exceeding Expectations 1', min: 90, max: 100, points: 8 },
          { code: 'BE2', label: 'Below Expectations 2', min: 0, max: 10, points: 1 },
        ],
      },
      {
        id: SCHOOL_SCALE,
        institution_id: INSTITUTION,
        programme_id: PROGRAMME,
        code: 'school_letter',
        kind: 'letter',
        version: '1',
        bands: [{ code: 'A', label: 'A', min: 70, max: 100 }],
      },
    ],
    assessment_scheme: [
      {
        id: SCHEME,
        institution_id: INSTITUTION,
        programme_id: PROGRAMME,
        level_ids: [LEVEL_SEVEN, LEVEL_EIGHT],
        version: '1.0.0+ke-cbe-terminal',
        definition: {
          code: 'ke-cbe-terminal',
          slots: [
            { code: 'SBA', label: 'School-based assessment', kind: 'portfolio', scale_to: 60 },
            { code: 'ET', label: 'End-of-term assessment', kind: 'end_term', scale_to: 40 },
          ],
          learning_area_score: { op: 'sum', of: ['SBA', 'ET'], out_of: 100 },
          grading_scale: 'cbe_8_level',
        },
      },
    ],
  };
}

let repository: FakeRepository;

function renderTab(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders>
        <MemoryRouter>
          <CanonicalRepositoryProvider repository={repository}>{children}</CanonicalRepositoryProvider>
        </MemoryRouter>
      </TestProviders>
    ),
  });
}

function rowOf(text: string): HTMLElement {
  const cell = screen.getByText(text);
  const row = cell.closest('tr');
  if (!row) throw new Error(`no table row holds ${text}`);
  return row;
}

beforeEach(() => {
  repository = createFakeRepository(rows());
});

describe('grading scales tab', () => {
  it('lists canonical scales with the programme, kind, version and bands', async () => {
    renderTab(<GradingScalesTab packs={[DECLARATION]} />);

    expect(await screen.findByText('cbe_8_level')).toBeTruthy();
    expect(screen.getByText('school_letter')).toBeTruthy();
    expect(screen.getAllByText('CBC').length).toBeGreaterThan(0);
    expect(screen.getByText(/EE1 90–100/)).toBeTruthy();
    expect(screen.getByText(/BE2 0–10/)).toBeTruthy();
  });

  it('marks a pack scale, locks it, and refuses to offer an edit', async () => {
    renderTab(<GradingScalesTab packs={[DECLARATION]} />);
    expect(await screen.findByText('cbe_8_level')).toBeTruthy();

    const packRow = rowOf('cbe_8_level');
    expect(within(packRow).getByText('Pack: ke-cbe@1.0.0')).toBeTruthy();
    expect(within(packRow).getByText(/The pack installs this scale/)).toBeTruthy();
    expect(within(packRow).queryByRole('button', { name: 'Edit' })).toBeNull();

    const schoolRow = rowOf('school_letter');
    expect(within(schoolRow).getByText('School-created')).toBeTruthy();
    expect(within(schoolRow).getByRole('button', { name: 'Edit' })).toBeTruthy();
  });

  it('creates a school scale through the repository', async () => {
    renderTab(<GradingScalesTab packs={[DECLARATION]} />);
    expect(await screen.findByText('cbe_8_level')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Add grading scale' }));
    fireEvent.change(screen.getByLabelText('Programme'), { target: { value: PROGRAMME } });
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'my_scale' } });
    fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'numeric_bands' } });
    fireEvent.change(screen.getByLabelText('Version'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Band 1 code'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Band 1 label'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Band 1 minimum'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText('Band 1 maximum'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create grading scale' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'create',
          entity: 'grading_scale',
          payload: expect.objectContaining({
            institution_id: INSTITUTION,
            programme_id: PROGRAMME,
            code: 'my_scale',
            kind: 'numeric_bands',
            version: '1',
            bands: [{ code: 'A', label: 'A', min: 70, max: 100 }],
          }),
        }),
      ])
    );
    expect(await screen.findByText('my_scale')).toBeTruthy();
  });

  it('refuses a band whose minimum is above its maximum before writing', async () => {
    renderTab(<GradingScalesTab packs={[DECLARATION]} />);
    expect(await screen.findByText('cbe_8_level')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Add grading scale' }));
    fireEvent.change(screen.getByLabelText('Programme'), { target: { value: PROGRAMME } });
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'broken' } });
    fireEvent.change(screen.getByLabelText('Version'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Band 1 code'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Band 1 label'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Band 1 minimum'), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText('Band 1 maximum'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create grading scale' }));

    expect(await screen.findByText('Band 1 has a minimum above its maximum.')).toBeTruthy();
    expect(repository.writes).toEqual([]);
  });

  it('refuses a duplicate scale code for the same programme and version', async () => {
    renderTab(<GradingScalesTab packs={[DECLARATION]} />);
    expect(await screen.findByText('cbe_8_level')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Add grading scale' }));
    fireEvent.change(screen.getByLabelText('Programme'), { target: { value: PROGRAMME } });
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'cbe_8_level' } });
    fireEvent.change(screen.getByLabelText('Version'), { target: { value: '1.0.0' } });
    fireEvent.change(screen.getByLabelText('Band 1 code'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Band 1 label'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Band 1 minimum'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Band 1 maximum'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create grading scale' }));

    expect(
      await screen.findByText('A grading scale with this code already exists for this programme and version.')
    ).toBeTruthy();
    expect(repository.writes).toEqual([]);
  });

  it('edits a school scale and leaves the pack scale alone', async () => {
    renderTab(<GradingScalesTab packs={[DECLARATION]} />);
    expect(await screen.findByText('school_letter')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Version'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save grading scale' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'update',
          entity: 'grading_scale',
          id: SCHOOL_SCALE,
          payload: expect.objectContaining({ version: '2' }),
        }),
      ])
    );
  });
});

describe('education systems tab', () => {
  it('shows the schemes with their levels and a readable definition, read-only', async () => {
    renderTab(<AssessmentSchemesTab packs={[DECLARATION]} />);

    expect(await screen.findByText('ke-cbe-terminal')).toBeTruthy();
    expect(screen.getByText('1.0.0')).toBeTruthy();
    expect(screen.getByText('Grade 7, Grade 8')).toBeTruthy();
    expect(screen.getByText(/School-based assessment/)).toBeTruthy();
    expect(screen.getByText(/End-of-term assessment/)).toBeTruthy();
    expect(screen.getByText(/Grading scale: cbe_8_level/)).toBeTruthy();
    expect(screen.getByText('Pack: ke-cbe@1.0.0')).toBeTruthy();
    expect(
      screen.getByText('Assessment schemes are owned by the curriculum pack and are read-only here.')
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('system configuration tab', () => {
  it('says a programme runs on an installed pack and resolves its scales and schemes', async () => {
    renderTab(<SystemConfigTab packs={[DECLARATION]} />);

    expect(await screen.findByText('CBC')).toBeTruthy();
    expect(screen.getByText('Pack installed')).toBeTruthy();
    expect(screen.getAllByText(/cbe_8_level/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ke-cbe-terminal/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Grade 7/).length).toBeGreaterThan(0);
  });

  it('says plainly when no pack is installed and offers only the setup link', async () => {
    repository.publish('curriculum_pack', []);
    repository.publish('grading_scale', []);
    repository.publish('assessment_scheme', []);

    renderTab(<SystemConfigTab packs={[DECLARATION]} />);

    expect(
      await screen.findByText('No curriculum pack is installed for any programme.')
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Install a curriculum pack' })).toHaveAttribute(
      'href',
      '/setup'
    );
  });

  it('shows an honest empty state on each tab when the school has no pack', async () => {
    repository.publish('programme', []);
    repository.publish('curriculum_pack', []);
    repository.publish('grading_scale', []);
    repository.publish('assessment_scheme', []);

    renderTab(<GradingScalesTab packs={[]} />);
    expect(await screen.findByText('No grading scales yet.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Install a curriculum pack' })).toBeTruthy();
    cleanup();

    renderTab(<AssessmentSchemesTab packs={[]} />);
    expect(await screen.findByText('No assessment schemes yet.')).toBeTruthy();
    cleanup();

    renderTab(<SystemConfigTab packs={[]} />);
    expect(await screen.findByText('This school has no programme yet.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Install a curriculum pack' })).toBeTruthy();
  });
});
