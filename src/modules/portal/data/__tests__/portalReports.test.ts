// ABOUTME: The term reports the portal shows: published cards only, the learner's own final results,
// ABOUTME: and an explicit not-published state for a term with no published card.

import { describe, expect, it } from 'vitest';

import { PortalAccessError, resolvePortalIdentity } from '../portalAccess';
import { readTermReports } from '../portalReports';

import {
  DRAFT_RESULT,
  ENROLMENT_A,
  ENROLMENT_B,
  GUARDIAN,
  IDS,
  LEARNER_A,
  LEARNER_B,
  LEARNING_AREA,
  LINK_A,
  LINK_B,
  OTHER_REPORT_CARD,
  REPORT_CARD,
  RESULT,
  TERM_ONE,
  TERM_TWO,
} from './fixtures';

const identityFor = (type: 'learner' | 'guardian', id: string) =>
  resolvePortalIdentity({
    status: 'ready',
    loginUserId: IDS.login,
    canonicalUser: { id: IDS.canonicalUser, username: 'viewer', person_ref: { type, id } },
    learners: [LEARNER_A, LEARNER_B],
    enrolments: [ENROLMENT_A, ENROLMENT_B],
    classGroups: [],
    guardians: [GUARDIAN],
    learnerGuardians: [LINK_A, LINK_B],
  });

const sources = {
  periods: [TERM_TWO, TERM_ONE],
  enrolments: [ENROLMENT_A, ENROLMENT_B],
  reportCards: [REPORT_CARD, OTHER_REPORT_CARD],
  results: [RESULT, DRAFT_RESULT],
  learningAreas: [LEARNING_AREA],
};

describe('the portal term reports', () => {
  it('shows a published term with the learner’s final results', () => {
    const reports = readTermReports(identityFor('learner', IDS.learnerA), IDS.learnerA, sources);

    expect(reports.map((report) => report.periodId)).toEqual([IDS.termTwo, IDS.termOne]);
    const published = reports.find((report) => report.periodId === IDS.termOne);
    expect(published?.state).toBe('published');
    expect(published?.publishedAt).toBe(REPORT_CARD.published_at);
    expect(published?.templateCode).toBe('termly');
    expect(published?.results).toEqual([
      { areaName: 'Mathematics', score: 82, grade: 'A-', points: 11 },
    ]);
  });

  it('says a term is not published yet instead of showing a draft', () => {
    const reports = readTermReports(identityFor('learner', IDS.learnerA), IDS.learnerA, sources);

    const termTwo = reports.find((report) => report.periodId === IDS.termTwo);
    expect(termTwo?.state).toBe('not-published');
    expect(termTwo?.reportCardId).toBeNull();
    expect(termTwo?.publishedAt).toBeNull();
    expect(termTwo?.results).toEqual([]);
  });

  it('never shows an unpublished card', () => {
    const reports = readTermReports(identityFor('learner', IDS.learnerA), IDS.learnerA, {
      ...sources,
      reportCards: [{ ...REPORT_CARD, published_at: undefined }],
    });

    expect(reports.find((report) => report.periodId === IDS.termOne)?.state).toBe('not-published');
  });

  it('shows a guardian only the child it asked about', () => {
    const reports = readTermReports(identityFor('guardian', IDS.guardian), IDS.learnerA, sources);

    const published = reports.find((report) => report.periodId === IDS.termOne);
    expect(published?.reportCardId).toBe(IDS.reportCard);
    expect(published?.results.map((row) => row.areaName)).toEqual(['Mathematics']);
  });

  it('refuses a report for a learner the account may not read', () => {
    expect(() =>
      readTermReports(identityFor('learner', IDS.learnerA), IDS.learnerB, sources)
    ).toThrow(PortalAccessError);
    expect(() =>
      readTermReports(identityFor('guardian', IDS.guardian), IDS.learnerOther, sources)
    ).toThrow(PortalAccessError);
  });

  it('ignores a result that is not final', () => {
    const reports = readTermReports(identityFor('learner', IDS.learnerA), IDS.learnerA, {
      ...sources,
      results: [DRAFT_RESULT],
    });

    expect(reports.find((report) => report.periodId === IDS.termOne)?.results).toEqual([]);
  });
});
