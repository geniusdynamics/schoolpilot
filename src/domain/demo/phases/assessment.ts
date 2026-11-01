// ABOUTME: The exams of the demo school in every state the notes ask for: past terms published with
// ABOUTME: every mark in, this term's mid-term closed, and its end-of-term exam still being entered.

import { asId } from '@/domain/ids';

import { LEARNING_AREAS } from '../cast';
import type { DemoContext } from './context';
import { addDays, createRandom, earlierOf, laterOf } from './helpers';
import type { DemoRoster, RosterLearner } from './people';
import type { DemoTeaching } from './teaching';

/** The core areas whose marks for the exam in progress are all in, those still waiting, and the partial one. */
const ENTERED_IN_FULL = ['ENG', 'MAT', 'SCI', 'SST', 'CRE', 'PTS'] as const;
const PARTLY_ENTERED = 'AGR';

/** How able a learner is, 55 to 85, so a learner's marks cluster the way a real class's do. */
function abilityOf(key: string): number {
  let hash = 7;
  for (const letter of key) hash = (Math.imul(hash, 31) + letter.charCodeAt(0)) >>> 0;
  return 55 + (hash % 31);
}

interface Exam {
  readonly kind: 'mid_term' | 'end_term';
  readonly slot: 'MT' | 'ET';
  readonly label: string;
  readonly status: 'open' | 'closed' | 'moderated' | 'published';
  /** True for the exam whose marks are still being entered. */
  readonly inProgress: boolean;
}

/**
 * Writes one exam per core learning area for every term up to the one the demo is set in.
 *
 * A term before the current one has its end-of-term exam published with every mark in. The current
 * term has a mid-term exam that is closed, and an end-of-term exam that is still open: six areas are
 * entered in full, one only for the first stream, and two not at all, so the marks-entry progress
 * pages have something to show and the results page has some learners incomplete.
 */
export async function seedAssessment(
  ctx: DemoContext,
  roster: DemoRoster,
  teaching: DemoTeaching
): Promise<void> {
  const { repository, institutionId, options } = ctx;
  ctx.at('assessment');

  const coreAreas = LEARNING_AREAS.filter((area) => area.kind === 'core');
  const levelIds = ctx.levels.map((level) => asId<'level'>(level.id));
  const classGroupIds = ctx.current.classGroups.map((group) => asId<'class_group'>(group.id));
  const firstStream = new Set(
    ctx.current.classGroups
      .filter((group) => group.name === ctx.current.classGroups[0]?.name)
      .map((group) => group.id)
  );
  const random = createRandom(20261020);

  for (const [termIndex, term] of ctx.current.terms.entries()) {
    if (termIndex > ctx.currentTermIndex) break;
    const isCurrent = termIndex === ctx.currentTermIndex;
    const exams: Exam[] = isCurrent
      ? [
          { kind: 'mid_term', slot: 'MT', label: 'Mid-term', status: 'closed', inProgress: false },
          { kind: 'end_term', slot: 'ET', label: 'End of term', status: 'open', inProgress: true },
        ]
      : [{ kind: 'end_term', slot: 'ET', label: 'End of term', status: 'published', inProgress: false }];

    for (const exam of exams) {
      const sat =
        exam.kind === 'mid_term'
          ? laterOf(term.start_date, addDays(term.start_date, 40))
          : earlierOf(term.end_date, addDays(term.end_date, -7));
      const date = earlierOf(sat, term.end_date);
      // Who sat: everyone enrolled that day, which leaves out a learner who had already gone.
      const sitting = roster.learners.filter(
        (entry: RosterLearner) =>
          entry.currentEnrolmentId !== null && (entry.leftOn === null || entry.leftOn >= date)
      );

      for (const area of coreAreas) {
        const areaRow = teaching.areas.get(area.code);
        if (!areaRow) continue;
        const assessment = await repository.create(
          'assessment',
          {
            institution_id: institutionId,
            academic_period_id: asId<'academic_period'>(term.id),
            kind: exam.kind,
            name: `${term.name} ${exam.label} ${area.name}`,
            scheme_slot: exam.slot,
            level_ids: levelIds,
            class_group_ids: classGroupIds,
            learning_area_ids: [asId<'learning_area'>(areaRow.id)],
            component_ids: [],
            max_score: 100,
            date_window: { start_date: date, end_date: date },
            status: exam.status,
            grading_scale_id: asId<'grading_scale'>(teaching.numericScale.id),
          },
          options
        );
        ctx.count('assessment');

        for (const entry of sitting) {
          if (exam.inProgress && !isEntered(area.code, entry, firstStream)) continue;
          const enrolmentId = entry.currentEnrolmentId;
          if (!enrolmentId) continue;
          // A few learners miss the exam; their mark is recorded as absent, with no score.
          const chance = random();
          const absent = chance < 0.02;
          const score = Math.max(
            18,
            Math.min(98, abilityOf(entry.cast.key) + termIndex * 2 + Math.round((random() - 0.5) * 24))
          );
          await repository.create(
            'mark',
            {
              institution_id: institutionId,
              assessment_id: asId<'assessment'>(assessment.id),
              enrolment_id: enrolmentId,
              learning_area_id: asId<'learning_area'>(areaRow.id),
              ...(absent ? {} : { score: `${score}.0` }),
              status_code: absent ? 'absent' : 'present',
              version: 1,
              entered_at: `${date}T15:00:00.000Z`,
            },
            options
          );
          ctx.count('mark');
        }
      }
    }
  }
}

/** Whether a learner's mark for an area is in, while the end-of-term exam is still being entered. */
function isEntered(areaCode: string, entry: RosterLearner, firstStream: ReadonlySet<string>): boolean {
  if ((ENTERED_IN_FULL as readonly string[]).includes(areaCode)) return true;
  if (areaCode === PARTLY_ENTERED) return entry.currentClassGroupId !== null && firstStream.has(entry.currentClassGroupId);
  return false;
}
