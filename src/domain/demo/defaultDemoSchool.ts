// ABOUTME: The demo school the onboarding's demo pathway installs: a whole school, its first year
// ABOUTME: and three classes, laid out so the app has something real to show on first run.

import type { DemoSchoolInput, DemoSchoolTerm } from './demoSchool';

/** The name the demo pathway gives the school it installs. */
export const DEFAULT_DEMO_SCHOOL_NAME = 'Greenfields Academy';

/** The three terms of a Kenyan school year, as the setup wizard lays them out. */
function termsFor(year: number): DemoSchoolTerm[] {
  return [
    { name: 'Term 1', startDate: `${year}-01-06`, endDate: `${year}-04-04` },
    { name: 'Term 2', startDate: `${year}-04-28`, endDate: `${year}-08-01` },
    { name: 'Term 3', startDate: `${year}-08-25`, endDate: `${year}-10-31` },
  ];
}

/**
 * The demo school of a fresh installation.
 *
 * The year is the calendar year of `today`, so the demo always has a running school year; every
 * other value is fixed, so two installations of the same day hold the same school.
 */
export function defaultDemoSchool(today: Date = new Date()): DemoSchoolInput {
  const year = today.getFullYear();
  return {
    school: {
      name: DEFAULT_DEMO_SCHOOL_NAME,
      motto: 'Knowledge and service',
      address: 'P.O. Box 1234, Nairobi',
      phone: '+254700000000',
    },
    year: {
      name: `${year}`,
      startDate: `${year}-01-06`,
      endDate: `${year}-11-30`,
      terms: termsFor(year),
    },
    // Junior School of the Kenyan CBE pack, under the pack's own level codes, so its rules apply.
    classes: [
      { name: 'Grade 7', code: 'G7', streams: ['East', 'West'] },
      { name: 'Grade 8', code: 'G8', streams: ['East', 'West'] },
      { name: 'Grade 9', code: 'G9', streams: ['East', 'West'] },
    ],
    curriculumPack: 'ke-cbe',
    demo: true,
    today: today.toISOString().slice(0, 10),
  };
}
