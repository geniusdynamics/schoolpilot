// src/modules/academics/services/EducationSystemValidationService.ts

import { EducationSystemConfiguration } from '../data/types';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class EducationSystemValidationService {
  static validateConfiguration(config: Partial<EducationSystemConfiguration>): ValidationResult {
    const errors: string[] = [];
    
    // Basic validation
    if (!config.name?.trim()) {
      errors.push('System name is required');
    }
    
    if (!config.country_code?.trim()) {
      errors.push('Country code is required');
    }
    
    // Assessment weight validation
    const continuousWeight = config.continuous_assessment_weight || 0;
    const finalWeight = config.final_exam_weight || 0;
    if (continuousWeight + finalWeight !== 100) {
      errors.push('Assessment weights must total 100%');
    }
    
    // Grade level validation
    if ((config.min_grade_level || 0) >= (config.max_grade_level || 0)) {
      errors.push('Maximum grade level must be greater than minimum grade level');
    }
    
    // Credit hours validation
    if (config.uses_credit_hours) {
      if (!config.min_credits_per_course || !config.min_credits_for_graduation) {
        errors.push('Credit hour system requires minimum credits configuration');
      }
    }
    
    // Competency tracking validation
    if (config.uses_competency_tracking) {
      if (!config.competency_levels || config.competency_levels.length === 0) {
        errors.push('Competency tracking requires competency levels definition');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static async validateUniqueDefault(
    config: EducationSystemConfiguration, 
    existingSystems: EducationSystemConfiguration[]
  ): Promise<ValidationResult> {
    if (config.is_default) {
      const hasOtherDefault = existingSystems.some(
        system => system.id !== config.id && system.is_default
      );
      
      if (hasOtherDefault) {
        return {
          isValid: false,
          errors: ['Only one education system can be set as default. Please unset the current default system first.']
        };
      }
    }
    
    return { isValid: true, errors: [] };
  }
}

