// src/modules/academics/strategies/PercentageGradeStrategy.ts

import { StudentExamResult } from '../data/types';
import { GradingStrategy } from '@/services/GradingEngineService';

export class PercentageGradeStrategy implements GradingStrategy {
  calculate(result: StudentExamResult): StudentExamResult {
    if (result.total_marks) {
      result.mean_grade = `${((result.total_marks / 100) * 100).toFixed(2)}%`;
    }
    return result;
  }
}

