// src/modules/academics/services/GradingEngineService.ts

import { EducationSystemConfiguration, GradingScheme, StudentExamResult, GradingSystemType } from '../data/types';
import { LetterGradeStrategy } from '../strategies/LetterGradeStrategy';
import { PercentageGradeStrategy } from '../strategies/PercentageGradeStrategy';
import { CBCGradeStrategy } from '../strategies/CBCGradeStrategy';
import { GPA_GradeStrategy } from '../strategies/GPA_GradeStrategy';
import { PassFailGradeStrategy } from '../strategies/PassFailGradeStrategy';

export interface GradingStrategy {
  calculate(result: StudentExamResult, gradingScheme?: GradingScheme): StudentExamResult;
}

export class GradingEngineService {
  private strategy: GradingStrategy;

  constructor(educationSystem: EducationSystemConfiguration) {
    switch (educationSystem.grading_system_type) {
      case GradingSystemType.LETTER_GRADES:
        this.strategy = new LetterGradeStrategy();
        break;
      case GradingSystemType.PERCENTAGE:
        this.strategy = new PercentageGradeStrategy();
        break;
      case GradingSystemType.COMPETENCY_BASED:
        this.strategy = new CBCGradeStrategy();
        break;
      case GradingSystemType.POINTS:
        this.strategy = new GPA_GradeStrategy();
        break;
      case GradingSystemType.PASS_FAIL:
        this.strategy = new PassFailGradeStrategy();
        break;
      default:
        throw new Error(`Unsupported grading system: ${educationSystem.grading_system_type}`);
    }
  }

  calculateGrades(result: StudentExamResult, gradingScheme?: GradingScheme): StudentExamResult {
    return this.strategy.calculate(result, gradingScheme);
  }
}

