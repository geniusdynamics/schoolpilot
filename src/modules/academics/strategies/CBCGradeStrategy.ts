// src/modules/academics/strategies/CBCGradeStrategy.ts

import { StudentExamResult, GradingScheme, GradingSchemeLevel } from '../data/types';
import { GradingStrategy } from '@/services/GradingEngineService';

export class CBCGradeStrategy implements GradingStrategy {
  calculate(result: StudentExamResult, gradingScheme?: GradingScheme): StudentExamResult {
    if (!result.total_marks) {
      return result;
    }

    // Default CBC competency levels if no grading scheme provided
    const defaultLevels: GradingSchemeLevel[] = [
      { id: 1, scheme_id: 0, grade: 'Exceeding Expectations', min_score: 80, comment: 'Exceeding Expectations - Outstanding performance' },
      { id: 2, scheme_id: 0, grade: 'Meeting Expectations', min_score: 60, comment: 'Meeting Expectations - Satisfactory performance' },
      { id: 3, scheme_id: 0, grade: 'Approaching Expectations', min_score: 40, comment: 'Approaching Expectations - Fair performance' },
      { id: 4, scheme_id: 0, grade: 'Below Expectations', min_score: 0, comment: 'Below Expectations - Needs improvement' }
    ];

    const levels = gradingScheme?.levels || defaultLevels;
    const score = result.total_marks;

    // Find the appropriate competency level (sorted from highest to lowest)
    const sortedLevels = [...levels].sort((a, b) => b.min_score - a.min_score);
    const level = sortedLevels.find(l => score >= l.min_score);

    if (level) {
      result.mean_grade = level.comment || level.grade;
    } else {
      result.mean_grade = 'Below Expectations';
    }

    return result;
  }

  /**
   * Calculate weighted competency assessment
   * In CBC, continuous assessment typically weighs more than final exams
   */
  calculateWeighted(
    continuousMarks: number,
    finalMarks: number,
    continuousWeight: number = 60,
    finalWeight: number = 40
  ): number {
    const continuousScore = (continuousMarks * continuousWeight) / 100;
    const finalScore = (finalMarks * finalWeight) / 100;
    return continuousScore + finalScore;
  }

  /**
   * Get competency description based on performance
   */
  getCompetencyDescription(score: number): string {
    if (score >= 80) {
      return 'The learner demonstrates exceptional understanding and can apply knowledge in complex situations.';
    } else if (score >= 60) {
      return 'The learner demonstrates adequate understanding and can apply knowledge in familiar situations.';
    } else if (score >= 40) {
      return 'The learner demonstrates basic understanding but needs support in applying knowledge.';
    } else {
      return 'The learner demonstrates minimal understanding and requires significant support.';
    }
  }
}

