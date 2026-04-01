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

const buildDefaultSystems = (): EducationSystemConfiguration[] =>
  Object.entries(EDUCATION_SYSTEM_TEMPLATES).map(([templateId, template]) => ({
    id: templateId.toLowerCase().replace(/_/g, '-'),
    name: template.name || templateId,
    country_code: template.country_code || '',
    system_type: template.system_type!,
    grading_system_type: template.grading_system_type!,
    min_grade_level: template.min_grade_level ?? 1,
    max_grade_level: template.max_grade_level ?? 12,
    academic_period_type: template.academic_period_type!,
    periods_per_year: template.periods_per_year ?? 3,
    uses_competency_tracking: template.uses_competency_tracking ?? false,
    competency_levels: template.competency_levels || [],
    assessment_types: template.assessment_types || [],
    continuous_assessment_weight: template.continuous_assessment_weight ?? 40,
    final_exam_weight: template.final_exam_weight ?? 60,
    passing_grade: template.passing_grade ?? 50,
    max_grade_value: template.max_grade_value ?? 100,
    grade_precision: template.grade_precision ?? 0,
    uses_credit_hours: template.uses_credit_hours ?? false,
    allows_grade_modification: true,
    requires_external_moderation: false,
    supports_remedial_exams: true,
    is_active: true,
    is_default: templateId === 'KENYA_CBC_SECONDARY',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...template
  } as EducationSystemConfiguration));

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
          const defaultSystems: EducationSystemConfiguration[] = buildDefaultSystems();
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
    data: educationSystemConfigurations,
    loading,
    error,
    addEducationSystemConfiguration,
    create: addEducationSystemConfiguration,
    updateEducationSystemConfiguration,
    update: updateEducationSystemConfiguration,
    deleteEducationSystemConfiguration,
    remove: deleteEducationSystemConfiguration,
    getEducationSystemConfiguration
  };
};
