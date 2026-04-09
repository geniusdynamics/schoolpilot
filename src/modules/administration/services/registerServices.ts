// ABOUTME: Register administration module services with the service registry

import { serviceRegistry } from '@/core/ServiceRegistry';
import { StudentManagementService } from './StudentManagementService';

export const registerAdministrationServices = () => {
  serviceRegistry.register({
    name: 'StudentManagementService',
    moduleId: 'administration',
    factory: () => new StudentManagementService(),
    singleton: true
  });
};
