// ABOUTME: Register administration module services with the service registry
// ABOUTME: Both StudentManagementService and StudentPromotionService are registered here

import { serviceRegistry } from '@/core/ServiceRegistry';
import { StudentManagementService } from './StudentManagementService';
import { StudentPromotionService } from './StudentPromotionService';
import { AuditLoggerService } from './AuditLoggerService';

export const registerAdministrationServices = () => {
  serviceRegistry.register({
    name: 'StudentManagementService',
    moduleId: 'administration',
    factory: () => new StudentManagementService(),
    singleton: true
  });

  // StudentPromotionService requires collections at runtime,
  // so we register a factory that creates a new instance.
  // Collections are injected via setCollection() or constructor argument.
  serviceRegistry.register({
    name: 'StudentPromotionService',
    moduleId: 'administration',
    factory: () => new StudentPromotionService(null, null, null),
    singleton: true
  });

  // AuditLoggerService is a singleton that gets its collection via setCollection()
  serviceRegistry.register({
    name: 'AuditLoggerService',
    moduleId: 'administration',
    factory: () => AuditLoggerService.getInstance(),
    singleton: true
  });
};