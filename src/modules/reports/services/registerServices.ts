// ABOUTME: Register reports module services with the service registry

import { serviceRegistry } from '@/core/ServiceRegistry';
import { ReportBuilderService } from './ReportBuilderService';

export const registerReportsServices = () => {
  serviceRegistry.register({
    name: 'ReportBuilderService',
    moduleId: 'reports',
    factory: () => new ReportBuilderService(),
    singleton: true
  });
};
