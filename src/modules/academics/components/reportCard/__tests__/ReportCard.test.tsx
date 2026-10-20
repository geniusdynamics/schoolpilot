// ABOUTME: Render snapshot of one printable report card, plus checks that every required block is on the page.
// ABOUTME: Also renders a full class of 40 cards to keep printing well inside the 30 second budget.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ReportCard from '../ReportCard';
import { assembleReportCards } from '../assembleReportCards';
import { buildClassFixture } from './fixtures';
import { formatDate } from '@/utils/format';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string | Record<string, unknown>, opts?: Record<string, unknown>) => {
      const text = typeof fallback === 'string' ? fallback : _key;
      const vars = (typeof fallback === 'object' ? fallback : opts) ?? {};
      return text.replace(/\{\{(\w+)\}\}/g, (_m, k) => String(vars[k] ?? ''));
    },
  }),
}));

describe('ReportCard', () => {
  const cards = assembleReportCards({ ...buildClassFixture(2), headTeacherRemark: 'Keep it up.' });

  it('matches the printable layout snapshot', () => {
    const { container } = render(<ReportCard card={cards[0]} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows school profile, learner, subjects, grades, comments, attendance and next term date', () => {
    render(<ReportCard card={cards[0]} />);
    const card = screen.getByTestId('report-card');
    const q = within(card);
    expect(q.getByText('Greenfields Academy')).toBeTruthy();
    expect(q.getByText('P.O. Box 1, Nairobi')).toBeTruthy();
    expect(q.getByText('Learner1 Pupil')).toBeTruthy();
    expect(q.getByText('ADM001')).toBeTruthy();
    expect(q.getByText('Grade 7 Blue')).toBeTruthy();
    const rows = within(q.getByRole('table')).getAllByRole('row');
    expect(rows.map((r) => r.textContent)).toEqual([
      'SubjectScoreGradeRemark',
      'English70BGood',
      'Mathematics85AExcellent',
      'Science55CFair',
    ]);
    expect(q.getByText('A focused and helpful learner.')).toBeTruthy();
    expect(q.getByText('Keep it up.')).toBeTruthy();
    expect(q.getByTestId('report-attendance').textContent).toContain('3 of 4 days');
    expect(q.getByTestId('report-next-term').textContent).toContain(formatDate('2026-05-04'));
  });

  it('renders a class of 40 report cards quickly', () => {
    const started = performance.now();
    const classCards = assembleReportCards(buildClassFixture(40));
    render(<>{classCards.map((c) => <ReportCard key={c.learner.id} card={c} />)}</>);
    expect(screen.getAllByTestId('report-card')).toHaveLength(40);
    expect(performance.now() - started).toBeLessThan(10000);
  });
});
