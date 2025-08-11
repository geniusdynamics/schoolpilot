// src/modules/academics/data/useEducationSystemData.ts

import { useState, useEffect, useCallback } from 'react';
import { EducationSystemConfiguration } from './types';
import { EDUCATION_SYSTEM_TEMPLATES } from './templates/education-system-templates';

export interface UseEducationSystemData {
  educationSystemConfigurations: EducationSystemConfiguration[];
  loading: boolean;
  error: string | null;
  addEducationSystemConfiguration: (config: Partial<EducationSystemConfiguration>) => Promise<void>;
  updateEducationSystemConfiguration: (config: EducationSystemConfiguration) => Promise<void>;
  deleteEducationSystemConfiguration: (id: string) => Promise<void>;
  getEducationSystemConfiguration: (id: string) => EducationSystemConfiguration | undefined;
}

const STORAGE_KEY = 'education_system_configurations';

export const useEducationSystemData = (): UseEducationSystemData => {
  const [educationSystemConfigurations, setEducationSystemConfigurations] = useState<EducationSystemConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data from localStorage or create default
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setEducationSystemConfigurations(JSON.parse(stored));
        } else {
          // Initialize with some default systems
          const defaultSystems: EducationSystemConfiguration[] = [
            {
              id: 'kenya-cbc-primary',
              name: 'Kenya CBC Primary System',
              country_code: 'KE',
              system_type: 'Primary',
              grading_system_type: 'Competency Based',
              min_grade_level: 1,
              max_grade_level: 6,
              academic_period_type: 'Term',
              periods_per_year: 3,
              uses_competency_tracking: true,
              competency_levels: ['Exceeding Expectations', 'Meeting Expectations', 'Approaching Expectations', 'Below Expectations'],
              assessment_types: ['Formative', 'Summative', 'Competency'],
              continuous_assessment_weight: 60,
              final_exam_weight: 40,
              passing_grade: 50,
              max_grade_value: 100,
              grade_precision: 0,
              uses_credit_hours: false,
              allows_grade_modification: true,
              requires_external_moderation: false,
              supports_remedial_exams: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 'kenya-cbc-secondary',
              name: 'Kenya CBC Secondary System',
              country_code: 'KE',
              system_type: 'Secondary',
              grading_system_type: 'Letter Grades',
              min_grade_level: 7,
              max_grade_level: 12,
              academic_period_type: 'Term',
              periods_per_year: 3,
              uses_competency_tracking: false,
              assessment_types: ['Formative', 'Summative'],
              continuous_assessment_weight: 40,
              final_exam_weight: 60,
              passing_grade: 50,
              max_grade_value: 100,
              grade_precision: 0,
              uses_credit_hours: false,
              allows_grade_modification: true,
              requires_external_moderation: true,
              supports_remedial_exams: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 'kenya-844',
              name: 'Kenya 8-4-4 System',
              country_code: 'KE',
              system_type: 'Secondary',
              grading_system_type: 'Letter Grades',
              min_grade_level: 1,
              max_grade_level: 12,
              academic_period_type: 'Term',
              periods_per_year: 3,
              uses_competency_tracking: false,
              assessment_types: ['Formative', 'Summative'],
              continuous_assessment_weight: 30,
              final_exam_weight: 70,
              passing_grade: 40,
              max_grade_value: 100,
              grade_precision: 0,
              uses_credit_hours: false,
              allows_grade_modification: false,
              requires_external_moderation: true,
              supports_remedial_exams: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
          setEducationSystemConfigurations(defaultSystems);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSystems));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load education system data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const saveToStorage = useCallback((systems: EducationSystemConfiguration[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));
  }, []);

  const addEducationSystemConfiguration = useCallback(async (config: Partial<EducationSystemConfiguration>) => {
    try {
      setError(null);
      const newSystem: EducationSystemConfiguration = {
        id: `edu-system-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...config
      } as EducationSystemConfiguration;

      const updated = [...educationSystemConfigurations, newSystem];
      setEducationSystemConfigurations(updated);
      saveToStorage(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add education system');
    }
  }, [educationSystemConfigurations, saveToStorage]);

  const updateEducationSystemConfiguration = useCallback(async (config: EducationSystemConfiguration) => {
    try {
      setError(null);
      const updated = educationSystemConfigurations.map(system =>
        system.id === config.id
          ? { ...config, updated_at: new Date().toISOString() }
          : system
      );
      setEducationSystemConfigurations(updated);
      saveToStorage(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update education system');
    }
  }, [educationSystemConfigurations, saveToStorage]);

  const deleteEducationSystemConfiguration = useCallback(async (id: string) => {
    try {
      setError(null);
      const updated = educationSystemConfigurations.filter(system => system.id !== id);
      setEducationSystemConfigurations(updated);
      saveToStorage(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete education system');
    }
  }, [educationSystemConfigurations, saveToStorage]);

  const getEducationSystemConfiguration = useCallback((id: string) => {
    return educationSystemConfigurations.find(system => system.id === id);
  }, [educationSystemConfigurations]);

  return {
    educationSystemConfigurations,
    loading,
    error,
    addEducationSystemConfiguration,
    updateEducationSystemConfiguration,
    deleteEducationSystemConfiguration,
    getEducationSystemConfiguration
  };
};