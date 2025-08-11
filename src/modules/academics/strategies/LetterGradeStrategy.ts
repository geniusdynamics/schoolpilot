// src/modules/academics/strategies/LetterGradeStrategy.ts

import { StudentExamResult, GradingScheme, GradingSchemeLevel } from '../data/types';
import { GradingStrategy } from '../services/GradingEngineService';

export class LetterGradeStrategy implements GradingStrategy {
  calculate(result: StudentExamResult, gradingScheme?: GradingScheme): StudentExamResult {
    if (!result.total_marks) {
      return result;
    }

    // Default Kenyan letter grade system if no grading scheme provided
    const defaultLevels: GradingSchemeLevel[] = [
      { id: 1, scheme_id: 0, grade: 'A', min_score: 80, points: 12, comment: 'Excellent' },
      { id: 2, scheme_id: 0, grade: 'A-', min_score: 75, points: 11, comment: 'Very Good' },
      { id: 3, scheme_id: 0, grade: 'B+', min_score: 70, points: 10, comment: 'Good' },
      { id: 4, scheme_id: 0, grade: 'B', min_score: 65, points: 9, comment: 'Good' },
      { id: 5, scheme_id: 0, grade: 'B-', min_score: 60, points: 8, comment: 'Above Average' },
      { id: 6, scheme_id: 0, grade: 'C+', min_score: 55, points: 7, comment: 'Above Average' },
      { id: 7, scheme_id: 0, grade: 'C', min_score: 50, points: 6, comment: 'Average' },
      { id: 8, scheme_id: 0, grade: 'C-', min_score: 45, points: 5, comment: 'Average' },
      { id: 9, scheme_id: 0, grade: 'D+', min_score: 40, points: 4, comment: 'Below Average' },
      { id: 10, scheme_id: 0, grade: 'D', min_score: 35, points: 3, comment: 'Below Average' },
      { id: 11, scheme_id: 0, grade: 'D-', min_score: 30, points: 2, comment: 'Poor' },
      { id: 12, scheme_id: 0, grade: 'E', min_score: 0, points: 1, comment: 'Very Poor' }
    ];

    const levels = gradingScheme?.levels || defaultLevels;
    const score = result.total_marks;

    // Find the appropriate grade level (sorted from highest to lowest)
    const sortedLevels = [...levels].sort((a, b) => b.min_score - a.min_score);
    const level = sortedLevels.find(l => score >= l.min_score);

    if (level) {
      result.mean_grade = level.grade;
    } else {
      result.mean_grade = 'E';
    }

    return result;
  }

  /**
   * Calculate letter grade with plus/minus modifiers
   */
  calculateWithModifiers(score: number): string {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 65) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  }

  /**
   * Get grade points for GPA calculation
   */
  getGradePoints(grade: string): number {
    const gradePoints: { [key: string]: number } = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0, 'E': 0.0
    };
    return gradePoints[grade] || 0.0;
  }

  /**
   * Determine if grade is passing
   */
  isPassing(grade: string): boolean {
    const passingGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];
    return passingGrades.includes(grade);
  }
}

