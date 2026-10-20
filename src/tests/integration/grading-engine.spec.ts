// tests/integration/grading-engine.spec.ts

// ABOUTME: Business-flow tests for GradingEngineService strategy selection and
// ABOUTME KCSE (letter/points) plus CBC competency grading (Phase 4.2).

import { describe, it, expect } from 'vitest';
import { GradingEngineService } from '../../modules/academics/services/GradingEngineService';
import { GradingSystemType } from '../../modules/academics/data/enums';
import { StudentExamResult, GradingScheme } from '../../modules/academics/data/types';

function makeResult(totalMarks: number | null): StudentExamResult {
  return {
    id: 'r1',
    student_id: 's1',
    exam_session_id: 'e1',
    total_marks: totalMarks,
    mean_grade: null,
    class_rank: null,
    stream_rank: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function systemWith(type: GradingSystemType) {
  return { name: 'test-system', grading_system_type: type };
}

describe('GradingEngineService', () => {
  it('should correctly apply the letter grade strategy', () => {
    const engine = new GradingEngineService(systemWith(GradingSystemType.LETTER_GRADES));

    // Default Kenyan bands: A>=80, B+>=70, C>=50, E<30
    expect(engine.calculateGrades(makeResult(85)).mean_grade).toBe('A');
    expect(engine.calculateGrades(makeResult(80)).mean_grade).toBe('A');
    expect(engine.calculateGrades(makeResult(72)).mean_grade).toBe('B+');
    expect(engine.calculateGrades(makeResult(52)).mean_grade).toBe('C');
    expect(engine.calculateGrades(makeResult(31)).mean_grade).toBe('D-');
    expect(engine.calculateGrades(makeResult(5)).mean_grade).toBe('E');

    // Boundary: exactly at a band's min_score picks that band
    expect(engine.calculateGrades(makeResult(70)).mean_grade).toBe('B+');
  });

  it('should correctly apply the percentage grade strategy', () => {
    const engine = new GradingEngineService(systemWith(GradingSystemType.PERCENTAGE));
    const result = engine.calculateGrades(makeResult(73));
    // Percentage strategy renders the score with a percent suffix
    expect(result.mean_grade).toBe('73.00%');
  });

  it('should correctly apply the CBC grade strategy', () => {
    const engine = new GradingEngineService(systemWith(GradingSystemType.COMPETENCY_BASED));

    expect(engine.calculateGrades(makeResult(85)).mean_grade).toContain('Exceeding Expectations');
    expect(engine.calculateGrades(makeResult(65)).mean_grade).toContain('Meeting Expectations');
    expect(engine.calculateGrades(makeResult(45)).mean_grade).toContain('Approaching Expectations');
    expect(engine.calculateGrades(makeResult(20)).mean_grade).toContain('Below Expectations');
  });

  it('should honour a custom grading scheme over the default bands', () => {
    const engine = new GradingEngineService(systemWith(GradingSystemType.LETTER_GRADES));
    const scheme: GradingScheme = {
      id: 1,
      name: 'School scheme',
      education_system_id: 0,
      levels: [
        { id: 1, scheme_id: 1, grade: 'Distinction', min_score: 75, comment: '' },
        { id: 2, scheme_id: 1, grade: 'Merit', min_score: 50, comment: '' },
        { id: 3, scheme_id: 1, grade: 'Pass', min_score: 0, comment: '' },
      ],
    } as unknown as GradingScheme;

    expect(engine.calculateGrades(makeResult(80), scheme).mean_grade).toBe('Distinction');
    expect(engine.calculateGrades(makeResult(60), scheme).mean_grade).toBe('Merit');
    expect(engine.calculateGrades(makeResult(10), scheme).mean_grade).toBe('Pass');
  });

  it('should leave results without marks untouched', () => {
    const engine = new GradingEngineService(systemWith(GradingSystemType.LETTER_GRADES));
    const result = engine.calculateGrades(makeResult(null));
    expect(result.mean_grade).toBeNull();
  });

  it('should select the points strategy for KCSE-style point systems', () => {
    const engine = new GradingEngineService(systemWith(GradingSystemType.POINTS));
    const scheme = {
      levels: [
        { id: 1, scheme_id: 1, grade: 'A', min_score: 80, max_score: 100, points: 12 },
        { id: 2, scheme_id: 1, grade: 'B', min_score: 60, max_score: 79, points: 9 },
      ],
    } as unknown as GradingScheme;

    const result = engine.calculateGrades(makeResult(85), scheme);
    expect(result.mean_grade).toBe((12).toFixed(2));
  });

  it('should reject unsupported grading systems at construction time', () => {
    expect(() => new GradingEngineService(systemWith('unknown' as GradingSystemType))).toThrow(
      /Unsupported grading system/
    );
  });
});
