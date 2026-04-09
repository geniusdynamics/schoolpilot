// ABOUTME: Register finance module services with the service registry

import { serviceRegistry } from '@/core/ServiceRegistry';
import { InvoiceService } from './InvoiceService';

export const registerFinanceServices = () => {
  serviceRegistry.register({
    name: 'InvoiceService',
    moduleId: 'finance',
    factory: () => new InvoiceService(),
    singleton: true
  });
};
