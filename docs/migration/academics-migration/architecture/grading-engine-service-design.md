# GradingEngineService Design with Pluggable Strategy

**Date**: January 26, 2025  
**Phase**: 5 - Architecture Design for Missing Capabilities  
**Dependencies**: Phase 3 mapping results  
**Status**: Design Complete ✅

## 1. Executive Summary

This document defines the architecture for the **GradingEngineService**, enabling flexible and pluggable grading strategies within the EduGen OS. This module will dynamically load grading strategies based on the configured EducationSystem, allowing adaptation to different grading systems and norms.

## 2. Core Architecture

### 2.1 GradingEngineService

```typescript
// src/modules/academics/services/GradingEngineService.ts

import { EducationSystemConfiguration, GradingScheme, GradingSchemeLevel, StudentExamResult } from '../data/types';

interface GradingStrategy {
  calculate(result: StudentExamResult): StudentExamResult;
}

class LetterGradeStrategy implements GradingStrategy {
  calculate(result: StudentExamResult): StudentExamResult {
    // Implement grading logic for letter grades
    return result; // Placeholder
  }
}

class PercentageGradeStrategy implements GradingStrategy {
  calculate(result: StudentExamResult): StudentExamResult {
    // Implement grading logic for percentage
    return result; // Placeholder
  }
}

class CBCGradeStrategy implements GradingStrategy {
  calculate(result: StudentExamResult): StudentExamResult {
    // Implement grading logic for Competency-Based Curriculum
    return result; // Placeholder
  }
}

class GPA_GradeStrategy implements GradingStrategy {
  calculate(result: StudentExamResult): StudentExamResult {
    // Implement grading logic for GPA
    return result; // Placeholder
  }
}

class PassFailGradeStrategy implements GradingStrategy {
  calculate(result: StudentExamResult): StudentExamResult {
    // Implement grading logic for pass/fail
    return result; // Placeholder
  }
}

export class GradingEngineService {
  private strategy: GradingStrategy;

  constructor(educationSystem: EducationSystemConfiguration) {
    switch (educationSystem.grading_system_type) {
      case 'LETTER_GRADES':
        this.strategy = new LetterGradeStrategy();
        break;
      case 'PERCENTAGE':
        this.strategy = new PercentageGradeStrategy();
        break;
      case 'COMPETENCY_BASED':
        this.strategy = new CBCGradeStrategy();
        break;
      case 'POINTS':
        this.strategy = new GPA_GradeStrategy();
        break;
      case 'PASS_FAIL':
        this.strategy = new PassFailGradeStrategy();
        break;
      default:
        throw new Error(`Unsupported grading system: ${educationSystem.grading_system_type}`);
    }
  }

  calculateGrades(result: StudentExamResult): StudentExamResult {
    return this.strategy.calculate(result);
  }
}
```

### 2.2 Dependency Injection

```typescript
// src/modules/academics/data/hooks/useGradingEngine.ts

import { GradingEngineService } from '../services/GradingEngineService';
import { EducationSystemConfiguration, StudentExamResult } from '../data/types';

export function useGradingEngine(educationSystem: EducationSystemConfiguration) {
  const gradingEngine = new GradingEngineService(educationSystem);
  
  function processResults(results: StudentExamResult[]): StudentExamResult[] {
    return results.map(result => gradingEngine.calculateGrades(result));
  }

  return { processResults };
}
```

## 3. Integration with Existing Systems

### 3.1 Data Flow

1. **Exam Sessions** define assessment types and link to **GradingScheme**.
2. **StudentExamResult** entries are processed by **GradingEngineService**.

### 3.2 Modifications to Existing Entities

```typescript
// src/modules/academics/data/schema.ts (updates)

type ExtendedExamSessionType = {
  grading_engine_id: string;
};

export const examSessionSchema = createEntitySchema(
  'exam_session',
  {
    // ... existing fields
    grading_engine_id: { type: ['string', 'null'], ref: 'grading_engines' },
    // ... rest of schema
  }
);

// Extend existing student exam result entries to include grade strategy details
type ExtendedStudentExamResultType = {
  grading_strategy: string;
};

export const studentExamResultSchema = createEntitySchema(
  'student_exam_result', 
  {
    // ... existing fields
    grading_strategy: { type: ['string', 'null'] },
    // ... rest of schema
  }
);
```

## 4. Example Use Cases

### 4.1 Letter Grade Calculation

Configuring `GradingEngineService` with `LETTER_GRADES` strategy will:
1. Interpret scores using the configured `GradingScheme` levels.
2. Assign letter grades based on `min_score` and `max_score` definitions.

### 4.2 Competency-Based Curriculum (CBC)

Using the `CBCGradeStrategy`, the engine will:
1. Map numerical results to `competency_levels` defined in the `EducationSystem`.
2. Use continuous assessment as a core component of grade calculation.

## 5. Strategy Extendability

Enable additional strategies by implementing the `GradingStrategy` interface, allowing the service to be extended with minimal changes to core code.

This design provides a flexible, pluggable grading engine that can adapt to changes in educational grading norms and strategies with ease.

ccitationsc
cdocument_tempeRULEc/dokument_tempe
cdocument_ide8viBk1SCnMHtLO8Bx9ECg1c/dokument_ide
cdokument_tempe

