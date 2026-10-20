// ABOUTME: Unit tests for report-card data assembly from existing results, attendance, grading and term records.
// ABOUTME: Covers weighted subject scores, grades, position, attendance in term, next term date and a 40-learner class.

import { describe, it, expect } from 'vitest';
import { assembleReportCards } from '../assembleReportCards';
import { buildClassFixture } from './fixtures';

describe('assembleReportCards', () => {
  it('builds one card per active learner in the stream, ordered by admission number', () => {
    const cards = assembleReportCards(buildClassFixture(3));
    expect(cards.map((c) => c.learner.admissionNo)).toEqual(['ADM001', 'ADM002', 'ADM003']);
  });

  it('shows the school profile, learner, class, class teacher and term', () => {
    const [card] = assembleReportCards(buildClassFixture(2));
    expect(card.school.name).toBe('Greenfields Academy');
    expect(card.school.address).toBe('P.O. Box 1, Nairobi');
    expect(card.school.contact).toBe('0700 000 000 | info@greenfields.ke');
    expect(card.learner).toMatchObject({ id: 'stu-1', name: 'Learner1 Pupil', admissionNo: 'ADM001', className: 'Grade 7 Blue' });
    expect(card.classTeacherName).toBe('Mrs Wanjiru');
    expect(card.term).toEqual({ name: 'Term 1 2026', examName: 'End of Term 1', startDate: '2026-01-05', endDate: '2026-04-03' });
  });

  it('combines weighted paper marks into subject scores with grades and remarks', () => {
    const [card] = assembleReportCards(buildClassFixture(2));
    expect(card.subjects).toEqual([
      { subjectId: 'sub-eng', name: 'English', score: 70, grade: 'B', remark: 'Good' },
      { subjectId: 'sub-mat', name: 'Mathematics', score: 85, grade: 'A', remark: 'Excellent' },
      { subjectId: 'sub-sci', name: 'Science', score: 55, grade: 'C', remark: 'Fair' },
    ]);
    expect(card.total).toBe(210);
    expect(card.average).toBe(70);
    expect(card.meanGrade).toBe('B');
  });

  it('ranks learners in the stream by total when no rank is stored', () => {
    const cards = assembleReportCards(buildClassFixture(3));
    // Learner1 210, Learner2 69 + 84 + 55 = 208, Learner3 68 + 83 + 55 = 206
    expect(cards.map((c) => c.position)).toEqual([1, 2, 3]);
    expect(cards[0].classSize).toBe(3);
  });

  it('prefers the stream rank stored on the result', () => {
    const src = buildClassFixture(2);
    src.results = src.results.map((r, i) => ({ ...r, stream_rank: i === 0 ? 2 : 1 }));
    expect(assembleReportCards(src).map((c) => c.position)).toEqual([2, 1]);
  });

  it('uses the class teacher comment saved on the result, and the head teacher remark given', () => {
    const cards = assembleReportCards({ ...buildClassFixture(2), headTeacherRemark: 'Keep it up.', classTeacherRemark: 'Good term.' });
    expect(cards[0].comments).toEqual({ classTeacher: 'A focused and helpful learner.', headTeacher: 'Keep it up.' });
    expect(cards[1].comments).toEqual({ classTeacher: 'Good term.', headTeacher: 'Keep it up.' });
  });

  it('counts attendance days inside the term only, a day with any session present counting as present', () => {
    const [card] = assembleReportCards(buildClassFixture(2));
    expect(card.attendance).toEqual({ daysOpen: 4, present: 3, absent: 1, late: 1 });
  });

  it('gives the start date of the term that follows as the next term date', () => {
    const [card] = assembleReportCards(buildClassFixture(1));
    expect(card.nextTermDate).toBe('2026-05-04');
    const lastTerm = buildClassFixture(1);
    lastTerm.examSession = { ...lastTerm.examSession!, school_period_id: 'term-3' };
    expect(assembleReportCards(lastTerm)[0].nextTermDate).toBeNull();
    expect(assembleReportCards({ ...lastTerm, nextTermDate: '2027-01-04' })[0].nextTermDate).toBe('2027-01-04');
  });

  it('prints a single learner when a learner is chosen', () => {
    const cards = assembleReportCards({ ...buildClassFixture(5), studentId: 'stu-4' });
    expect(cards).toHaveLength(1);
    expect(cards[0].learner.name).toBe('Learner4 Pupil');
    expect(cards[0].position).toBe(4);
  });

  it('leaves subjects empty for a learner without results, and returns no cards without an exam session', () => {
    const src = buildClassFixture(1);
    src.results = [];
    const [card] = assembleReportCards(src);
    expect(card.subjects).toEqual([]);
    expect(card.total).toBeNull();
    expect(card.position).toBeNull();
    expect(assembleReportCards({ ...buildClassFixture(1), examSession: null })).toEqual([]);
  });

  it('assembles a class of 40 well within the print budget', () => {
    const src = buildClassFixture(40);
    const started = performance.now();
    const cards = assembleReportCards(src);
    const elapsed = performance.now() - started;
    expect(cards).toHaveLength(40);
    expect(cards.every((c) => c.subjects.length === 3)).toBe(true);
    expect(elapsed).toBeLessThan(1000);
  });
});
