import { logger } from '@/utils/logging';

// ABOUTME: Example component demonstrating cross-module service access
// This component uses the InvoiceService from the finance module without importing it directly

import { useService } from '@/hooks/useService';
import type { InvoiceService } from '@/modules/finance/services/InvoiceService';

interface StudentInvoiceComponentProps {
  studentId: string;
}

export function StudentInvoiceComponent({ studentId }: StudentInvoiceComponentProps) {
  const { service: invoiceService, isLoading, error, isReady } = useService<InvoiceService>({
    moduleId: 'finance',
    name: 'InvoiceService'
  });

  const handleGenerateInvoice = async () => {
    if (!invoiceService) return;

    try {
      const invoice = await invoiceService.generateInvoice(studentId);
      logger.info('Invoice generated:', invoice);
      alert(`Invoice ${invoice.id} generated for ${invoice.amount}`);
    } catch (err) {
      logger.error('Failed to generate invoice:', err);
      alert('Failed to generate invoice');
    }
  };

  const handleProcessPayment = async () => {
    if (!invoiceService) return;

    try {
      await invoiceService.processPayment('INV-123', 1000);
      alert('Payment processed successfully');
    } catch (err) {
      logger.error('Failed to process payment:', err);
      alert('Failed to process payment');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="mt-2 text-surface-muted-fg">Loading finance services...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">Error loading finance services: {error.message}</p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-600">Finance module is not available. Please enable it to use invoice features.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-surface-card border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Student Invoice Management</h2>
      <div className="space-y-3">
        <button
          onClick={handleGenerateInvoice}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Generate Invoice
        </button>
        <button
          onClick={handleProcessPayment}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Process Payment
        </button>
      </div>
      <p className="mt-4 text-sm text-surface-muted-fg">
        Using InvoiceService from finance module via service registry
      </p>
    </div>
  );
}
