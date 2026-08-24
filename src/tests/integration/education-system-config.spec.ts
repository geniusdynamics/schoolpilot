// tests/integration/education-system-config.spec.ts

// ABOUTME: Business-flow tests for education system configuration — template
// ABOUTME integrity, validation rules, and default-uniqueness (Phase 4.2).

import { describe, it, expect } from 'vitest';
import { EducationSystemValidationService } from '../../modules/academics/services/EducationSystemValidationService';
import {
  EDUCATION_SYSTEM_TEMPLATES,
} from '../../modules/academics/data/templates/education-system-templates';
import {
  KENYAN_CURRICULUM_PRESETS,
  KENYA_CBC_PRIMARY_SUBJECTS,
  KENYA_KCSE_SECONDARY_SUBJECTS,
} from '../../modules/academics/data/templates/kenyan-subject-sets';

describe('EducationSystem Configuration', () => {
  it('should accept a valid configuration built from a Kenyan template', () => {
    const config = EDUCATION_SYSTEM_TEMPLATES.KENYA_CBC_PRIMARY;
    const result = EducationSystemValidationService.validateConfiguration(config);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should validate every shipped template without errors', () => {
    for (const [key, template] of Object.entries(EDUCATION_SYSTEM_TEMPLATES)) {
      const result = EducationSystemValidationService.validateConfiguration(template);
      if (!result.isValid) {
        throw new Error(`Template ${key} failed validation: ${result.errors.join('; ')}`);
      }
      expect(result.isValid).toBe(true);
    }
  });

  it('should reject a configuration with mismatched assessment weights', () => {
    const result = EducationSystemValidationService.validateConfiguration({
      name: 'Broken',
      country_code: 'KE',
      continuous_assessment_weight: 70,
      final_exam_weight: 40, // totals 110
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('100%'))).toBe(true);
  });

  it('should require name and country code', () => {
    const result = EducationSystemValidationService.validateConfiguration({
      continuous_assessment_weight: 50,
      final_exam_weight: 50,
      min_grade_level: 1,
      max_grade_level: 6,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('System name is required');
    expect(result.errors).toContain('Country code is required');
  });

  it('should enforce min < max grade levels', () => {
    const result = EducationSystemValidationService.validateConfiguration({
      name: 'Inverted',
      country_code: 'KE',
      continuous_assessment_weight: 60,
      final_exam_weight: 40,
      min_grade_level: 8,
      max_grade_level: 4,
    });
    expect(result.errors.some(e => e.includes('grade level'))).toBe(true);
  });

  it('should allow only one default education system', async () => {
    const existing = [
      { id: 'a', is_default: true } as any,
    ];
    const result = await EducationSystemValidationService.validateUniqueDefault(
      { id: 'b', is_default: true } as any,
      existing
    );
    expect(result.isValid).toBe(false);

    const ok = await EducationSystemValidationService.validateUniqueDefault(
      { id: 'b', is_default: false } as any,
      existing
    );
    expect(ok.isValid).toBe(true);
  });

  it('ships subject sets that match the wizard presets', () => {
    expect(KENYA_CBC_PRIMARY_SUBJECTS.length).toBeGreaterThanOrEqual(8);
    // KCSE groupings: compulsory core present
    const kcseCompulsory = KENYA_KCSE_SECONDARY_SUBJECTS.filter(s => s.is_compulsory);
    expect(kcseCompulsory.map(s => s.name)).toEqual(
      expect.arrayContaining(['English', 'Kiswahili', 'Mathematics', 'Chemistry'])
    );
    // Every preset references a real template key
    for (const preset of Object.values(KENYAN_CURRICULUM_PRESETS)) {
      expect(EDUCATION_SYSTEM_TEMPLATES[preset.templateKey]).toBeDefined();
    }
  });
});
