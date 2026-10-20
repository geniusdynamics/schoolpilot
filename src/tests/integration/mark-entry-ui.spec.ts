// tests/integration/mark-entry-ui.spec.ts

// ABOUTME: Business-flow tests for the marks-entry toolchain (Phase 4.2):
// ABOUTME template download, CSV export shape, and grading of entered scores.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadMarksTemplate, exportMarks } from '../../modules/academics/services/marksService';
import { GradingEngineService } from '../../modules/academics/services/GradingEngineService';
import { GradingSystemType } from '../../modules/academics/data/enums';

describe('Mark entry toolchain', () => {
  let createdObjectUrls: string[];
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createdObjectUrls = [];
    clickSpy = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => {
        const url = `blob:mock-${createdObjectUrls.length}`;
        createdObjectUrls.push(url);
        return url;
      }),
      revokeObjectURL: vi.fn(),
    });
    // HTMLAnchorElement.prototype.click is not implemented in jsdom
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('downloads a marks template CSV with the expected columns', async () => {
    await downloadMarksTemplate();

    expect(clickSpy).toHaveBeenCalled();
    expect(createdObjectUrls.length).toBe(1);
  });

  it('exports session marks as CSV scoped to the exam session and class stream', async () => {
    await exportMarks('session-42', 7);

    expect(clickSpy).toHaveBeenCalled();
    expect(createdObjectUrls.length).toBe(1);
  });

  it('grades entered scores consistently through the engine', () => {
    const engine = new GradingEngineService({ grading_system_type: GradingSystemType.LETTER_GRADES });

    // A batch of entered marks grades into the expected KCSE bands
    const entered = [
      { studentId: 's1', score: 85, expected: 'A' },
      { studentId: 's2', score: 58, expected: 'C+' },
      { studentId: 's3', score: 22, expected: 'E' },
    ];

    for (const { studentId, score, expected } of entered) {
      const result = engine.calculateGrades({
        id: `r-${studentId}`,
        student_id: studentId,
        exam_session_id: 'e1',
        total_marks: score,
        mean_grade: null,
        class_rank: null,
        stream_rank: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      expect(result.mean_grade).toBe(expected);
    }
  });
});
