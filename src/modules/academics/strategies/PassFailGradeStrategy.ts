// src/modules/academics/strategies/PassFailGradeStrategy.ts

import { StudentExamResult, GradingScheme } from '../data/types';
import { GradingStrategy } from '@/services/GradingEngineService';

export class PassFailGradeStrategy implements GradingStrategy {
  calculate(result: StudentExamResult, gradingScheme: GradingScheme): StudentExamResult {
    if (!result.total_marks || !gradingScheme || !gradingScheme.levels) {
      return result;
    }

    const score = (result.total_marks / 100) * 100;
    const level = gradingScheme.levels.find(l => score >= l.min_score);

    if (level) {
      result.mean_grade = level.grade;
    }

    return result;
  }
}

