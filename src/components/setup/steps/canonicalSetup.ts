// ABOUTME: Writes the canonical school (institution, calendar, year, terms, levels, class groups and,
// ABOUTME: when asked, the demo rows) from what the setup wizard collected, through the repository.

import { seedCanonicalDemoSchool } from '@/data/demo/seedCanonicalDemo';
import type { DemoSchoolInput, DemoSchoolResult } from '@/domain/demo';

import type { WizardDraft } from './wizardDraft';

/**
 * The canonical school the wizard's answers describe.
 *
 * The wizard's class rows carry the classes of the school and the streams of each; a class with no
 * stream still gets one class group, so the admission page always has somewhere to place a learner.
 */
export function demoSchoolInputFor(draft: WizardDraft): DemoSchoolInput {
  const name = draft.school.name.trim();
  if (!name) throw new Error('Enter the school name before the school structure can be saved.');

  return {
    school: {
      name,
      motto: draft.school.motto,
      address: draft.school.address,
      phone: draft.school.phone,
    },
    year: {
      name: draft.yearName.trim() || draft.yearStart.slice(0, 4),
      startDate: draft.yearStart,
      endDate: draft.yearEnd,
      terms: draft.terms
        .filter((term) => term.start && term.end)
        .map((term) => ({ name: term.name, startDate: term.start, endDate: term.end })),
    },
    classes: draft.classes
      .map((row) => ({
        name: row.name.trim(),
        streams: row.streams
          .split(',')
          .map((stream) => stream.trim())
          .filter(Boolean),
      }))
      .filter((row) => row.name),
    demo: draft.includeDemoData,
  };
}

/**
 * Saves the canonical school the wizard describes.
 *
 * Every step is idempotent, so the wizard can be re-opened and finished again: the school it finds
 * is reused and only what is missing is written. A refusal of the repository surfaces as it is, so
 * the step that called this shows why the school could not be saved.
 */
export async function saveCanonicalSchool(draft: WizardDraft): Promise<DemoSchoolResult> {
  return seedCanonicalDemoSchool(demoSchoolInputFor(draft));
}
