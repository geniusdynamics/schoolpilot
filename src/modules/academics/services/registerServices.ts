// ABOUTME: Register academics module services with the service registry

import { serviceRegistry } from '@/core/ServiceRegistry';
import { GradingEngineService } from './GradingEngineService';
import { StudentService } from './StudentService';

export const registerAcademicsServices = (educationSystemConfig: any) => {
  serviceRegistry.register({
    name: 'GradingEngineService',
    moduleId: 'academics',
    factory: () => new GradingEngineService(educationSystemConfig),
    singleton: true
  });

  serviceRegistry.register({
    name: 'StudentService',
    moduleId: 'academics',
    factory: () => new StudentService(),
    singleton: true
  });
};
