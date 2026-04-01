// ABOUTME: This test file verifies the generic ReportBuilderService data pipeline.
// ABOUTME: It covers filtering, projection, sorting, and pagination for report generation.

import { describe, expect, it } from 'vitest';
import { ReportBuilderService } from '../ReportBuilderService';

const service = new ReportBuilderService();

describe('ReportBuilderService', () => {
  it('filters, projects, sorts, and paginates report rows', async () => {
    const rows = [
      { student: 'Jane', score: 88, stream: 'North', subject: 'Math' },
      { student: 'John', score: 75, stream: 'South', subject: 'Math' },
      { student: 'Amina', score: 92, stream: 'North', subject: 'Science' }
    ];

    const generated = await service.generateReport(
      {
        id: 'report-1',
        name: 'Top North Scores',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        data: rows,
        columns: [
          { key: 'student' },
          { key: 'score' }
        ],
        limit: 1
      },
      [
        { key: 'stream', value: 'North' },
        { key: 'score', target: 'sort', direction: 'desc' }
      ]
    );

    expect(generated).toEqual([
      { student: 'Amina', score: 92 }
    ]);
  });

  it('sorts by a column sourceKey before projection drops the source field', async () => {
    const rows = [
      { student: 'Jane', weighted_total: 72 },
      { student: 'John', weighted_total: 88 }
    ];

    const generated = await service.generateReport(
      {
        id: 'report-3',
        name: 'Weighted Totals',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        data: rows,
        columns: [
          { key: 'studentName', sourceKey: 'student' },
          { key: 'finalScore', sourceKey: 'weighted_total' }
        ]
      },
      [
        { key: 'studentName', target: 'select', values: ['studentName'] },
        { key: 'finalScore', target: 'sort', direction: 'desc' }
      ]
    );

    expect(generated).toEqual([
      { studentName: 'John' },
      { studentName: 'Jane' }
    ]);
  });

  it('supports contains and between filters without throwing on empty datasets', async () => {
    const generated = await service.generateReport(
      {
        id: 'report-2',
        name: 'Science Search',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        data: []
      },
      [
        { key: 'subject', value: 'science', operator: 'contains' },
        { key: 'score', values: [70, 100], operator: 'between' }
      ]
    );

    expect(generated).toEqual([]);
  });
});
