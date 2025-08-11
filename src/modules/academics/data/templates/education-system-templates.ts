// src/modules/academics/data/templates/education-system-templates.ts

import { EducationSystemConfiguration, EducationSystemType, GradingSystemType, AcademicPeriodType, AssessmentType } from '../types';

export const EDUCATION_SYSTEM_TEMPLATES: Record<string, Partial<EducationSystemConfiguration>> = {
  'KENYA_CBC_PRIMARY': {
    name: 'Kenya CBC Primary System',
    country_code: 'KE',
    system_type: EducationSystemType.PRIMARY,
    grading_system_type: GradingSystemType.COMPETENCY_BASED,
    min_grade_level: 1,
    max_grade_level: 6,
    academic_period_type: AcademicPeriodType.TERM,
    periods_per_year: 3,
    uses_competency_tracking: true,
    competency_levels: ['Exceeding Expectations', 'Meeting Expectations', 'Approaching Expectations', 'Below Expectations'],
    assessment_types: [AssessmentType.FORMATIVE, AssessmentType.SUMMATIVE, AssessmentType.COMPETENCY],
    continuous_assessment_weight: 60,
    final_exam_weight: 40
  },
  
  'KENYA_CBC_SECONDARY': {
    name: 'Kenya CBC Secondary System',
    country_code: 'KE',
    system_type: EducationSystemType.SECONDARY,
    grading_system_type: GradingSystemType.LETTER_GRADES,
    min_grade_level: 7,
    max_grade_level: 12,
    academic_period_type: AcademicPeriodType.TERM,
    periods_per_year: 3,
    passing_grade: 50,
    max_grade_value: 100,
    assessment_types: [AssessmentType.FORMATIVE, AssessmentType.SUMMATIVE],
    continuous_assessment_weight: 40,
    final_exam_weight: 60
  },
  
  'US_UNIVERSITY_SEMESTER': {
    name: 'US University Semester System',
    country_code: 'US',
    system_type: EducationSystemType.UNIVERSITY,
    grading_system_type: GradingSystemType.POINTS,
    academic_period_type: AcademicPeriodType.SEMESTER,
    periods_per_year: 2,
    max_grade_value: 4.0,
    grade_precision: 2,
    uses_credit_hours: true,
    min_credits_per_course: 1,
    max_credits_per_course: 6,
    min_credits_for_graduation: 120,
    assessment_types: [AssessmentType.FORMATIVE, AssessmentType.SUMMATIVE, AssessmentType.PROJECT_BASED],
    continuous_assessment_weight: 30,
    final_exam_weight: 70
  }
};

