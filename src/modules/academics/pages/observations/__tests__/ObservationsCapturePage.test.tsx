// ABOUTME: Page tests for CBC observation capture: the pack's levels, empty versus lowest, evidence,
// ABOUTME: bulk with exceptions and its overwrite policy, the term judgement and the narrow layout.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, options?: Record<string, unknown>) => {
      const text = typeof fallback === 'string' ? fallback : key;
      const values = (typeof fallback === 'object' ? fallback : options) ?? {};
      return text.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(values[name] ?? ''));
    },
  }),
}));

import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';

import { createFakeRepository, type FakeRepository } from '../../__tests__/canonicalRepositoryDouble';
import { draftKeyFor } from '../data/draft';
import ObservationsCapturePage from '../ObservationsCapturePage';
import { IDS, rowsWith, type ObservationSeed } from './fixtures';

function renderPage(observations: readonly ObservationSeed[] = []) {
  const repository = createFakeRepository(rowsWith(observations));
  const view = render(
    <CanonicalRepositoryProvider repository={repository}>
      <ObservationsCapturePage today="2026-10-22" />
    </CanonicalRepositoryProvider>
  );
  return { repository, ...view };
}

async function chooseClassAndArea(readyTestId = 'capture-matrix') {
  await screen.findByRole('option', { name: /Grade 4 · East/ });
  fireEvent.change(screen.getByLabelText('Class'), { target: { value: IDS.classGroup } });
  await screen.findByRole('option', { name: /MAT — Mathematics/ });
  fireEvent.change(screen.getByLabelText('Learning area'), { target: { value: IDS.area } });
  await screen.findByTestId(readyTestId);
}

function levelSelect(learner: string, target: string): HTMLSelectElement {
  return screen.getByLabelText(`Level for ${learner}, ${target}`) as HTMLSelectElement;
}

function observationWrites(repository: FakeRepository) {
  return repository.writes.filter((write) => write.entity === 'competency_observation');
}

describe('ObservationsCapturePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('reads the pack levels and keeps no observation distinct from the lowest level', async () => {
    renderPage([
      {
        id: 'obs-lowest',
        enrolmentId: IDS.enrolmentTwo,
        outcomeId: IDS.outcomeOne,
        level: 'BE',
      },
    ]);
    await chooseClassAndArea();

    const emptyRow = screen.getByTestId(`judgement-${IDS.enrolmentOne}`);
    expect(within(emptyRow).getByText('No judgement yet')).toBeTruthy();
    expect(within(emptyRow).queryByText(/Below Expectations/)).toBeNull();

    const lowestRow = screen.getByTestId(`judgement-${IDS.enrolmentTwo}`);
    expect(within(lowestRow).getByText('BE — Below Expectations')).toBeTruthy();

    const emptyCell = levelSelect('Amani Otieno', 'MAT1');
    expect(emptyCell.value).toBe('');
    expect(within(emptyCell).getByRole('option', { name: 'Not observed' })).toBeTruthy();

    const lowestCell = levelSelect('Baraka Mwangi', 'MAT1');
    expect(lowestCell.value).toBe('BE');
    expect(within(lowestCell).queryByRole('option', { name: 'Not observed' })).toBeNull();

    expect(screen.getByTestId('recorded-cells').textContent).toContain('1 of 9 recorded');
  });

  it('records a level and bounded evidence and carries the evidence into the summary', async () => {
    const { repository } = renderPage();
    await chooseClassAndArea();

    fireEvent.change(levelSelect('Amani Otieno', 'MAT1'), { target: { value: 'ME' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evidence for Amani Otieno, MAT1' }));
    const note = screen.getByLabelText('Evidence note') as HTMLTextAreaElement;
    expect(note.maxLength).toBe(2000);
    fireEvent.change(note, { target: { value: 'Reads a Grade 4 passage with fluency.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save evidence' }));
    expect(screen.queryByTestId('evidence-editor')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save observations' }));
    expect(
      await screen.findByText('Saved 1 observation(s) to the records.')
    ).toBeTruthy();

    const writes = observationWrites(repository);
    expect(writes).toHaveLength(1);
    expect(writes[0].operation).toBe('create');
    expect(writes[0].payload).toMatchObject({
      institution_id: IDS.institution,
      enrolment_id: IDS.enrolmentOne,
      learning_area_id: IDS.area,
      outcome_id: IDS.outcomeOne,
      rubric_level: 'ME',
      observed_on: '2026-10-22',
      evidence: 'Reads a Grade 4 passage with fluency.',
    });

    const row = screen.getByTestId(`judgement-${IDS.enrolmentOne}`);
    expect(within(row).getByText('ME — Meeting Expectations')).toBeTruthy();
    expect(within(row).getByText('Reads a Grade 4 passage with fluency.')).toBeTruthy();
  });

  it('edits the evidence attached to a saved observation and updates the record', async () => {
    const { repository } = renderPage([
      {
        id: 'obs-evidence',
        enrolmentId: IDS.enrolmentOne,
        outcomeId: IDS.outcomeOne,
        level: 'ME',
        evidence: 'First note.',
      },
    ]);
    await chooseClassAndArea();

    fireEvent.click(screen.getByRole('button', { name: 'Evidence for Amani Otieno, MAT1' }));
    const note = screen.getByLabelText('Evidence note') as HTMLTextAreaElement;
    expect(note.value).toBe('First note.');
    fireEvent.change(note, { target: { value: 'Second note, with the correction.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save evidence' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save observations' }));
    await screen.findByText('Saved 1 observation(s) to the records.');

    const writes = observationWrites(repository);
    expect(writes).toHaveLength(1);
    expect(writes[0].operation).toBe('update');
    expect(writes[0].payload).toMatchObject({
      id: 'obs-evidence',
      evidence: 'Second note, with the correction.',
      rubric_level: 'ME',
    });
    const row = screen.getByTestId(`judgement-${IDS.enrolmentOne}`);
    expect(within(row).getByText('Second note, with the correction.')).toBeTruthy();
  });

  it('captures a competency observation against the pack competency and saves it', async () => {
    const { repository } = renderPage();
    await chooseClassAndArea();

    fireEvent.click(screen.getByRole('button', { name: 'Competencies' }));
    expect(
      await screen.findByRole('columnheader', { name: /Communication and Collaboration/ })
    ).toBeTruthy();
    fireEvent.change(levelSelect('Amani Otieno', 'CC'), { target: { value: 'AE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save observations' }));
    await screen.findByText('Saved 1 observation(s) to the records.');

    const writes = observationWrites(repository);
    expect(writes).toHaveLength(1);
    expect(writes[0].payload).toMatchObject({
      enrolment_id: IDS.enrolmentOne,
      learning_area_id: IDS.area,
      competency_id: IDS.competency,
      rubric_level: 'AE',
    });
    expect(writes[0].payload).not.toHaveProperty('outcome_id');
  });

  it('applies a bulk level, skips an existing observation by default and marks overrides as exceptions', async () => {
    const { repository } = renderPage([
      {
        id: 'obs-existing',
        enrolmentId: IDS.enrolmentOne,
        outcomeId: IDS.outcomeOne,
        level: 'ME',
      },
    ]);
    await chooseClassAndArea();

    fireEvent.change(screen.getByLabelText('Outcome'), {
      target: { value: `outcome:${IDS.outcomeOne}` },
    });
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'ME' } });
    expect(screen.getByTestId('bulk-existing').textContent).toContain(
      '1 learner(s) already have an observation'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply to the group' }));

    expect(
      await screen.findByText(
        'Applied ME to 2 learner(s); skipped 1 with an existing observation.'
      )
    ).toBeTruthy();
    expect(screen.getByTestId('exception-total').textContent).toContain('0 exception(s)');
    expect(observationWrites(repository)).toHaveLength(0);

    // The bulk entry stays: one learner is overridden and the exception is visible and counted.
    fireEvent.change(levelSelect('Baraka Mwangi', 'MAT1'), { target: { value: 'AE' } });
    await waitFor(() =>
      expect(screen.getByTestId('bulk-exceptions').textContent).toContain('1 exception(s)')
    );
    expect(screen.getAllByTestId('bulk-exception')).toHaveLength(1);
    expect(levelSelect('Amani Otieno', 'MAT1').value).toBe('ME');
    expect(levelSelect('Baraka Mwangi', 'MAT1').value).toBe('AE');
    expect(levelSelect('Chebet Kiptoo', 'MAT1').value).toBe('ME');

    fireEvent.click(screen.getByRole('button', { name: 'Save observations' }));
    await screen.findByText('Saved 2 observation(s) to the records.');

    const writes = observationWrites(repository);
    expect(writes).toHaveLength(2);
    expect(writes.map((write) => write.payload?.enrolment_id).sort()).toEqual([
      IDS.enrolmentTwo,
      IDS.enrolmentThree,
    ]);
    expect(writes.find((write) => write.payload?.enrolment_id === IDS.enrolmentTwo)?.payload).toMatchObject({
      rubric_level: 'AE',
      outcome_id: IDS.outcomeOne,
    });
  });

  it('asks before replacing an existing observation and replaces only after confirmation', async () => {
    const { repository } = renderPage([
      {
        id: 'obs-existing',
        enrolmentId: IDS.enrolmentOne,
        outcomeId: IDS.outcomeOne,
        level: 'ME',
      },
    ]);
    await chooseClassAndArea();

    fireEvent.change(screen.getByLabelText('Outcome'), {
      target: { value: `outcome:${IDS.outcomeOne}` },
    });
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'ME' } });
    fireEvent.change(screen.getByLabelText('If an observation exists'), {
      target: { value: 'replace' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply to the group' }));

    expect(
      await screen.findByText('Replace 1 existing observation(s) or pending level(s) with this bulk level?')
    ).toBeTruthy();
    expect(observationWrites(repository)).toHaveLength(0);
    expect(levelSelect('Baraka Mwangi', 'MAT1').value).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Replace them' }));
    expect(
      await screen.findByText(/Applied ME to 3 learner\(s\), replacing 1 existing entry\/entries/)
    ).toBeTruthy();
    expect(levelSelect('Baraka Mwangi', 'MAT1').value).toBe('ME');
    expect(screen.getByTestId('bulk-exceptions').textContent).toContain('No exceptions');
  });

  it('derives the term judgement through the pack and changes it when an observation changes', async () => {
    const { repository } = renderPage([
      { id: 'obs-1', enrolmentId: IDS.enrolmentOne, outcomeId: IDS.outcomeOne, level: 'EE' },
      { id: 'obs-2', enrolmentId: IDS.enrolmentOne, outcomeId: IDS.outcomeTwo, level: 'EE' },
      { id: 'obs-3', enrolmentId: IDS.enrolmentOne, outcomeId: IDS.outcomeThree, level: 'ME' },
    ]);
    await chooseClassAndArea();

    let row = screen.getByTestId(`judgement-${IDS.enrolmentOne}`);
    expect(within(row).getByText('EE — Exceeding Expectations')).toBeTruthy();

    fireEvent.change(levelSelect('Amani Otieno', 'MAT1'), { target: { value: 'BE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save observations' }));
    await screen.findByText('Saved 1 observation(s) to the records.');

    await waitFor(() => {
      row = screen.getByTestId(`judgement-${IDS.enrolmentOne}`);
      expect(within(row).getByText('BE — Below Expectations')).toBeTruthy();
    });
    expect(within(row).queryByText('EE — Exceeding Expectations')).toBeNull();
    expect(within(row).getByText('EE 1 · ME 1 · BE 1')).toBeTruthy();
    expect(observationWrites(repository)).toHaveLength(1);
  });

  it('keeps an in-progress observation in the draft across a reload', async () => {
    const first = renderPage();
    await chooseClassAndArea();

    fireEvent.change(levelSelect('Amani Otieno', 'MAT1'), { target: { value: 'ME' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evidence for Amani Otieno, MAT1' }));
    fireEvent.change(screen.getByLabelText('Evidence note'), {
      target: { value: 'Uses counters to regroup.' },
    });
    // Deliberately no "Save evidence": the note in progress must survive the navigation itself.

    const key = draftKeyFor(IDS.institution, IDS.classGroup, IDS.area);
    expect(key).not.toBeNull();
    const stored = JSON.parse(localStorage.getItem(key as string) ?? '{}') as {
      levels?: Record<string, string>;
      evidence?: Record<string, string>;
    };
    const cellKey = `outcome:${IDS.outcomeOne}|${IDS.enrolmentOne}`;
    expect(stored.levels?.[cellKey]).toBe('ME');
    expect(stored.evidence?.[cellKey]).toBe('Uses counters to regroup.');

    first.unmount();

    renderPage();
    await chooseClassAndArea();
    await waitFor(() => expect(levelSelect('Amani Otieno', 'MAT1').value).toBe('ME'));
    fireEvent.click(screen.getByRole('button', { name: 'Evidence for Amani Otieno, MAT1' }));
    expect((screen.getByLabelText('Evidence note') as HTMLTextAreaElement).value).toBe(
      'Uses counters to regroup.'
    );
  });

  it('renders one learner at a time on a narrow screen with 44 px targets and no hover-only action', async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn((query: string) => ({
      matches: query.includes('max-width: 768px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    try {
      renderPage();
      await chooseClassAndArea('narrow-capture');

      expect(screen.getByTestId('narrow-capture')).toBeTruthy();
      expect(screen.queryByTestId('capture-matrix')).toBeNull();
      const cards = screen.getAllByTestId('observation-learner-card');
      expect(cards).toHaveLength(3);

      const group = within(cards[0]).getByRole('group', { name: 'Level for Amani Otieno, MAT1' });
      const levelButtons = within(group).getAllByRole('button');
      expect(levelButtons.length).toBeGreaterThanOrEqual(4);
      for (const button of levelButtons) {
        expect(button.className).toContain('min-h-[44px]');
      }

      const evidence = within(cards[0]).getByRole('button', {
        name: 'Evidence for Amani Otieno, MAT1',
      });
      expect(evidence.className).toContain('min-h-[44px]');

      fireEvent.click(within(group).getByRole('button', { name: /Meeting Expectations/ }));
      expect(within(group).getByRole('button', { name: /Meeting Expectations/ }).getAttribute('aria-pressed')).toBe(
        'true'
      );

      fireEvent.click(screen.getByRole('button', { name: 'Next learner' }));
      expect((screen.getByLabelText('Learner') as HTMLSelectElement).value).toBe(IDS.learnerTwo);
      expect(screen.getByText('2 of 3')).toBeTruthy();
    } finally {
      window.matchMedia = original;
    }
  });
});
