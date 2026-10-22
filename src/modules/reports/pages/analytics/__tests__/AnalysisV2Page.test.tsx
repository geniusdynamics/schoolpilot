// ABOUTME: Analysis v2 page tests: the rendered analysis comes from the engine's results, an
// ABOUTME: incomplete cohort and a missing period stay visible, the heat-map shows the pack's own
// ABOUTME: levels, scope is enforced, and no place is rendered when the ranking policy is disabled.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { RankingPolicy } from '@/domain/assessment/aggregation';
import { asId } from '@/domain/ids';

import { CanonicalRepositoryProvider } from '@/modules/academics/data/canonicalRepository';
import { createFakeRepository, type FakeRepository } from '@/modules/academics/pages/__tests__/canonicalRepositoryDouble';

import { AnalysisV2PageContent, type AnalysisTab } from '../AnalysisV2Page';
import { AGGREGATION, DEFAULT_SCORES, IDS, seed, type ScoreTable } from '../analysis/__tests__/cohortFixture';

const ENABLED: RankingPolicy = {
  enabled: true,
  scope: 'class_group',
  by: 'cbe_mean_percent',
  ties: 'competition_1224',
  only_complete: true,
  show_out_of: true,
};

let repository: FakeRepository;

beforeEach(() => {
  repository = createFakeRepository(seed());
});

interface RenderOptions {
  readonly role?: string | null;
  readonly actorId?: string;
  readonly classGroupId?: string | null;
  readonly ranking?: RankingPolicy;
  readonly scores?: ScoreTable;
}

async function renderPage(options: RenderOptions = {}) {
  if (options.scores !== undefined) repository = createFakeRepository(seed(options.scores));
  const view = render(
    <CanonicalRepositoryProvider repository={repository}>
      <AnalysisV2PageContent
        actorId={options.actorId ?? IDS.teacherUser}
        role={options.role === undefined ? 'teacher' : options.role}
        periodId={asId<'academic_period'>(IDS.periods.t1)}
        classGroupId={options.classGroupId === undefined ? asId<'class_group'>(IDS.east) : options.classGroupId === null ? null : asId<'class_group'>(options.classGroupId)}
        aggregation={AGGREGATION}
        {...(options.ranking === undefined ? {} : { ranking: options.ranking })}
      />
    </CanonicalRepositoryProvider>
  );
  await screen.findByTestId('analysis-page');
  return view;
}

async function openTab(name: AnalysisTab | string) {
  fireEvent.click(await screen.findByRole('tab', { name }));
}

/** The position text anywhere on the page: a place, an ordinal, a rank or a denominator. */
function positionText(): string {
  return document.body.textContent ?? '';
}

describe('the rendered analysis', () => {
  it('shows each learning area’s mean and band distribution from the engine', async () => {
    await renderPage();

    const english = await screen.findByTestId('subject-ENG');
    expect(within(english).getByTestId('subject-summary-ENG-mean').textContent).toBe('77%');
    expect(within(english).getByTestId('subject-summary-ENG-completeness').textContent).toContain(
      '4 of 5 learner(s) have a result'
    );
    // The bands are the scale's own, with the count each one holds.
    expect(within(english).getByText('A')).toBeTruthy();
    expect(within(english).getByText('C')).toBeTruthy();

    const mathematics = screen.getByTestId('subject-MAT');
    expect(within(mathematics).getByTestId('subject-summary-MAT-mean').textContent).toBe('77%');
  });

  it('changes when an input changes, because the numbers are the engine’s', async () => {
    const raised: ScoreTable = {
      ...DEFAULT_SCORES,
      [IDS.periods.t1]: {
        ...DEFAULT_SCORES[IDS.periods.t1],
        dada: { ENG: '95', MAT: '65' },
      },
    };
    await renderPage({ scores: raised });
    const english = await screen.findByTestId('subject-ENG');
    expect(within(english).getByTestId('subject-summary-ENG-mean').textContent).toBe('84.5%');
  });

  it('shows an incomplete cohort and names the learners who have no result', async () => {
    await renderPage();
    await openTab('Class analysis');

    const east = await screen.findByTestId('group-class-east');
    expect(within(east).getByTestId('group-summary-class-east-completeness').textContent).toContain(
      '4 of 5 learner(s) have a result; 1 have none'
    );
    const missing = within(east).getByTestId('group-missing-class-east');
    expect(missing.textContent).toContain('Fanuel Kiptoo');
    expect(missing.textContent).toContain('no complete result');
  });

  it('shows a missing period as a gap in the trend, never as zero', async () => {
    await renderPage();
    await openTab('Trends');

    const gap = await screen.findByTestId(`trend-gap-${AGGREGATION.code}-${IDS.periods.t2}`);
    expect(gap.textContent).toContain('No result');
    expect(gap.textContent).not.toContain('0%');
    expect(screen.getByTestId(`trend-row-${AGGREGATION.code}-${IDS.periods.t1}`).textContent).toContain('77');
    expect(screen.getByTestId(`trend-row-${AGGREGATION.code}-${IDS.periods.t3}`).textContent).toContain('60');

    // The gap breaks the line: Term 1 and Term 3 are two separate runs, never one line drawn
    // across a period that has no result.
    const segments = document.querySelectorAll(`[data-testid^="trend-segment-${AGGREGATION.code}-"]`);
    expect(segments.length).toBe(2);
    expect(segments[0]?.getAttribute('points')?.split(' ').length).toBe(1);
    expect(segments[1]?.getAttribute('points')?.split(' ').length).toBe(1);
  });

  it('renders the pack’s own rubric levels in the heat-map, with the label beside the colour', async () => {
    await renderPage();
    await openTab('Competency heat-map');

    const heatmap = await screen.findByTestId('heatmap');
    expect(within(heatmap).getByTestId('heatmap-completeness').textContent).toContain('3 of 10 cell(s) observed');

    const amaniOnCommunication = within(heatmap).getByTestId('heatmap-cell-enrol-1-comp-1');
    expect(amaniOnCommunication.getAttribute('data-level')).toBe('EE');
    expect(amaniOnCommunication.textContent).toBe('EE');
    expect(amaniOnCommunication.getAttribute('title')).toContain('Exceeding Expectations');

    expect(within(heatmap).getByText('Exceeding Expectations')).toBeTruthy();
    expect(within(heatmap).getByText('Meeting Expectations')).toBeTruthy();

    // A learner nobody observed has no level, not a default one.
    expect(within(heatmap).getByTestId('heatmap-cell-enrol-3-comp-1').textContent).toBe('—');
  });

  it('summarises the teachers who teach the groups in scope', async () => {
    await renderPage({ role: 'head_teacher', classGroupId: null });
    await openTab('Teacher analysis');

    const grace = await screen.findByTestId(`teacher-${IDS.teacher}`);
    expect(grace.textContent).toContain('Grace Wekesa');
    expect(grace.textContent).toContain('East');
    expect(grace.textContent).toContain('4 of 5');
    expect(screen.getByTestId(`teacher-${IDS.other}`).textContent).toContain('Peter Otieno');
  });
});

describe('scope', () => {
  it('shows a teacher only the class groups their own groups reach', async () => {
    await renderPage({ role: 'teacher', classGroupId: null });
    await openTab('Class analysis');

    expect(await screen.findByTestId('group-class-east')).toBeTruthy();
    expect(screen.queryByTestId('group-class-west')).toBeNull();

    await openTab('Teacher analysis');
    expect(screen.getByTestId(`teacher-${IDS.teacher}`)).toBeTruthy();
    expect(screen.queryByTestId(`teacher-${IDS.other}`)).toBeNull();
  });

  it('shows a head teacher every class group', async () => {
    await renderPage({ role: 'head_teacher', classGroupId: null });
    await openTab('Class analysis');

    expect(await screen.findByTestId('group-class-east')).toBeTruthy();
    expect(screen.getByTestId('group-class-west')).toBeTruthy();
  });

  it('says so when the login reaches no group at all', async () => {
    await renderPage({ role: 'teacher', actorId: 'user-nobody', classGroupId: null });
    expect(await screen.findByText(/No staff record is linked to this login/)).toBeTruthy();
  });
});

describe('the ranking policy governs every place on the page', () => {
  it('renders no position, rank, place or ordinal anywhere when ranking is disabled', async () => {
    // No `ranking` prop: the bundled ke-cbe pack declares ranking off, the CBE default.
    await renderPage();

    const tabs = ['Subject analysis', 'Class analysis', 'Teacher analysis', 'Trends', 'Competency heat-map'];
    for (const tab of tabs) {
      await openTab(tab);
      // The panel is rendered before this assertion, so the scan covers real content.
      await waitFor(() => expect(screen.getByRole('tabpanel')).toBeTruthy());

      expect(document.querySelector('[data-testid="ranking-panel"]')).toBeNull();
      expect(document.querySelectorAll('[data-testid^="position-"]').length).toBe(0);

      const text = positionText();
      expect(text, `${tab} shows an ordinal`).not.toMatch(/\b(?:1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\b/);
      expect(text, `${tab} says "position"`).not.toMatch(/\bposition\b/i);
      expect(text, `${tab} says "rank"`).not.toMatch(/\brank(?:ed|ing|s)?\b/i);
      expect(text, `${tab} says "place"`).not.toMatch(/\bplace\b/i);
    }
  });

  it('shows the engine’s positions when the policy enables ranking', async () => {
    await renderPage({ ranking: ENABLED });
    await openTab('Class analysis');

    const panel = await screen.findByTestId('ranking-panel');
    expect(within(panel).getByTestId('position-enrol-1').textContent).toContain('1');
    expect(within(panel).getByTestId('position-enrol-1').textContent).toContain('/ 4');
    expect(within(panel).getByTestId('position-enrol-4').textContent).toContain('4');
    // Fanuel has no aggregate value, so he is listed with a reason and no place.
    expect(within(panel).getByTestId('position-enrol-5').textContent).toContain('No value for this metric');
  });

  it('honours the tie method the policy names', async () => {
    await renderPage({ ranking: { ...ENABLED, ties: 'shared_average' } });
    await openTab('Class analysis');
    // The values are 90, 81, 72, 65: no ties, so every method agrees. The panel states which one
    // the pack asked for, which is what a reader needs to interpret the places.
    const panel = await screen.findByTestId('ranking-panel');
    expect(panel.textContent).toContain('shared average');
  });

  it('hides the denominator when show_out_of is false', async () => {
    await renderPage({ ranking: { ...ENABLED, show_out_of: false } });
    await openTab('Class analysis');

    const panel = await screen.findByTestId('ranking-panel');
    expect(within(panel).getByTestId('position-enrol-1').textContent?.trim()).toBe('1');
  });

  it('lists an incomplete learner unranked and keeps them out of the denominator', async () => {
    await renderPage({
      ranking: ENABLED,
      scores: {
        'period-t1': {
          amani: { ENG: '90', MAT: '90' },
          bello: { ENG: '81', MAT: '81' },
          ciku: { ENG: '72', MAT: '72' },
          dada: { ENG: '65', MAT: '65' },
          fanuel: { ENG: '55', MAT: null },
          eve: { ENG: '95', MAT: '95' },
        },
      },
    });
    await openTab('Class analysis');

    const panel = await screen.findByTestId('ranking-panel');
    expect(within(panel).getByTestId('position-enrol-5').textContent).toContain('No value for this metric');
    // Four learners were ranked; the incomplete one took no place from them and is not in the
    // denominator, because the engine never counts an unranked learner as a place.
    expect(within(panel).getByTestId('position-enrol-4').textContent).toContain('/ 4');
  });
});
