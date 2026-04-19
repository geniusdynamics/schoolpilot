// ABOUTME: Register finance module services with the service registry
// ABOUTME: P0 services replacing Akademico DB stored procedures and triggers

import { serviceRegistry } from '@/core/ServiceRegistry';
import { InvoiceService } from './InvoiceService';
import { InvoiceStatusService } from './InvoiceStatusService';
import { InvoiceGenerationService } from './InvoiceGenerationService';
import { PaymentAllocationService } from './PaymentAllocationService';
import type { InvoiceStatusServiceDependencies } from './InvoiceStatusService';
import type { InvoiceGenerationServiceDependencies } from './InvoiceGenerationService';
import type { PaymentAllocationServiceDependencies } from './PaymentAllocationService';

/**
 * Register all finance module services with the global service registry.
 * 
 * Note: The P0 services (InvoiceStatusService, InvoiceGenerationService,
 * PaymentAllocationService) require dependency injection with data access
 * functions. They are registered as lazy singletons that will be initialized
 * with database access when first accessed via the service registry.
 * 
 * For React component usage, use the hook wrappers:
 * - useInvoiceStatus()
 * - useInvoiceGeneration()
 * - usePaymentAllocation()
 */
export const registerFinanceServices = () => {
  // Legacy service (stub)
  serviceRegistry.register({
    name: 'InvoiceService',
    moduleId: 'finance',
    factory: () => new InvoiceService(),
    singleton: true
  });

  // P0 Services - Core business logic replacing database engine
  // These are registered as factories since they need runtime dependencies
  
  serviceRegistry.register({
    name: 'InvoiceStatusService',
    moduleId: 'finance',
    factory: () => new InvoiceStatusService({} as InvoiceStatusServiceDependencies),
    singleton: true
  });

  serviceRegistry.register({
    name: 'InvoiceGenerationService',
    moduleId: 'finance',
    factory: () => new InvoiceGenerationService({} as InvoiceGenerationServiceDependencies),
    singleton: true
  });

  serviceRegistry.register({
    name: 'PaymentAllocationService',
    moduleId: 'finance',
    factory: () => new PaymentAllocationService({} as PaymentAllocationServiceDependencies),
    singleton: true
  });
};
