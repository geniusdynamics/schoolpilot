// ABOUTME: Admissions Module Collection Configuration
import type { ModuleCollectionsConfig } from '@/core/types/moduleCollections';

export const admissionsModuleCollections: ModuleCollectionsConfig = {
  moduleName: 'admissions',
  aliases: {
    admission_applications: 'admissionApplications',
    admission_interviews: 'admissionInterviews',
    education_system_configurations: 'educationSystemConfigurations',
  },
};

export default admissionsModuleCollections;
