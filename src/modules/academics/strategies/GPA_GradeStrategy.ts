// src/modules/academics/strategies/GPA_GradeStrategy.ts

import { StudentExamResult, GradingScheme } from '../data/types';
import { GradingStrategy } from '@/services/GradingEngineService';

export class GPA_GradeStrategy implements GradingStrategy {
  calculate(result: StudentExamResult, gradingScheme: GradingScheme): StudentExamResult {
    if (!result.total_marks || !gradingScheme || !gradingScheme.levels) {
      return result;
    }

    const score = (result.total_marks / 100) * 100;
    const level = gradingScheme.levels.find(l => score >= l.min_score && score <= (l.max_score || 100));

    if (level && level.points) {
      result.mean_grade = level.points.toFixed(2);
    }

    return result;
  }
}

