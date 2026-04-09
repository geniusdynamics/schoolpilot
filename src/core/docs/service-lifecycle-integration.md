# Service Registry Integration with Module Lifecycle

This document describes how to integrate service registration with the module lifecycle system.

## Integration Pattern

### Option 1: Register on Module Enable

```typescript
// modules/finance/index.ts or module registration file
import { moduleRegistry } from '@/core/moduleRegistry';
import { registerFinanceServices } from './services/registerServices';

// Register the finance module with lifecycle hooks
moduleRegistry.register({
  id: 'finance',
  metadata: {
    name: 'Finance Module',
    version: '1.0.0',
    description: 'Financial management module',
    dependencies: []
  },
  hooks: {
    onEnable: async (context) => {
      // Register services when module is enabled
      registerFinanceServices();
      console.log('Finance services registered');
    },
    onDisable: async (context) => {
      // Unregister services when module is disabled
      serviceRegistry.unregisterModule('finance');
      console.log('Finance services unregistered');
    }
  }
});
```

### Option 2: Register on Module Registration

```typescript
// modules/finance/index.ts
import { moduleRegistry } from '@/core/moduleRegistry';
import { registerFinanceServices } from './services/registerServices';

moduleRegistry.register({
  id: 'finance',
  metadata: {
    name: 'Finance Module',
    version: '1.0.0',
    description: 'Financial management module',
    dependencies: []
  },
  hooks: {
    onRegister: async (context) => {
      // Register services when module is registered
      registerFinanceServices();
      console.log('Finance services registered');
    }
  }
});
```

## Cross-Module Service Access

### Using the useService Hook (React Components)

```typescript
// modules/portal/pages/StudentInvoicePage.tsx
import { useService } from '@/hooks/useService';
import type { InvoiceService } from '@/modules/finance/services/InvoiceService';

function StudentInvoicePage({ studentId }: { studentId: string }) {
  const { service: invoiceService, isLoading, error } = useService<InvoiceService>({
    moduleId: 'finance',
    name: 'InvoiceService'
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!invoiceService) return <div>Finance module not available</div>;

  const handleGenerateInvoice = async () => {
    const invoice = await invoiceService.generateInvoice(studentId);
    console.log('Invoice generated:', invoice);
  };

  return (
    <div>
      <button onClick={handleGenerateInvoice}>Generate Invoice</button>
    </div>
  );
}
```

### Using serviceRegistry Directly (Non-React Code)

```typescript
// modules/portal/services/StudentPortalService.ts
import { serviceRegistry } from '@/core/ServiceRegistry';
import type { InvoiceService } from '@/modules/finance/services/InvoiceService';
import type { StudentManagementService } from '@/modules/administration/services/StudentManagementService';

export class StudentPortalService {
  async getStudentWithFinancialInfo(studentId: string) {
    // Get student info from administration module
    const studentService = await serviceRegistry.get<StudentManagementService>(
      'administration',
      'StudentManagementService'
    );
    const student = await studentService.getStudent(studentId);

    // Get invoices from finance module
    const invoiceService = await serviceRegistry.get<InvoiceService>(
      'finance',
      'InvoiceService'
    );
    const invoices = await invoiceService.getStudentInvoices(studentId);

    return {
      student,
      invoices
    };
  }
}
```

## Service Registration Best Practices

1. **Register on Enable**: Register services in the `onEnable` hook to ensure services are only available when the module is active
2. **Unregister on Disable**: Unregister services in the `onDisable` hook to clean up resources
3. **Singleton by Default**: Most services should be singletons to avoid resource waste
4. **Dependency Injection**: Use the `dependencies` field in service registration if services depend on other services
5. **Error Handling**: Wrap service registration in try-catch blocks to handle initialization failures gracefully

## Example: Complete Module Registration with Services

```typescript
// modules/finance/index.ts
import { moduleRegistry } from '@/core/moduleRegistry';
import { registerFinanceServices } from './services/registerServices';

export const financeModule = {
  id: 'finance',
  metadata: {
    name: 'Finance Module',
    version: '1.0.0',
    description: 'Financial management module',
    dependencies: ['administration'] // Depends on administration for student data
  },
  hooks: {
    onEnable: async (context) => {
      try {
        registerFinanceServices();
        console.log('✅ Finance module services registered');
      } catch (error) {
        console.error('❌ Failed to register finance services:', error);
        throw error;
      }
    },
    onDisable: async (context) => {
      try {
        serviceRegistry.unregisterModule('finance');
        console.log('✅ Finance module services unregistered');
      } catch (error) {
        console.error('❌ Failed to unregister finance services:', error);
      }
    }
  }
};

// Auto-register the module
if (typeof window !== 'undefined') {
  moduleRegistry.register(financeModule);
}
```
