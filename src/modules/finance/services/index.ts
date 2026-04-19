// ABOUTME: Barrel exports for finance services
// ABOUTME: Business logic services for finance module - replaces Akademico stored procedures and triggers

// Legacy service (stub - to be refactored)
export { InvoiceService } from './InvoiceService';

// P0 Services - Core business logic replacing database engine
export { InvoiceStatusService } from './InvoiceStatusService';
export type {
  InvoiceStatusUpdateResult,
  InvoiceFinancialSummary,
  InvoiceStatusServiceDependencies,
  StudentInvoiceRecord,
  StudentInvoiceItemRecord,
  InvoicePaymentApplicationRecord,
} from './InvoiceStatusService';

export { InvoiceGenerationService } from './InvoiceGenerationService';
export type {
  InvoiceGenerationResult,
  InvoiceGenerationError,
  InvoiceGenerationServiceDependencies,
  ActiveStudentRecord,
} from './InvoiceGenerationService';

export { PaymentAllocationService, PaymentAllocationType } from './PaymentAllocationService';
export type {
  PaymentAllocationResult,
  PaymentAllocationError,
  OutstandingInvoiceItem,
  PaymentAllocationServiceDependencies,
} from './PaymentAllocationService';
