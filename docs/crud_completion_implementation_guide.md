# CRUD Operations Completion Implementation Guide
*Generated: January 3, 2025 - 14:30*

## Overview
This guide provides step-by-step instructions for completing the remaining CRUD operations in SchoolPilot3, based on the analysis of current implementations.

## Priority 1: Finance Module Placeholder Implementations

### 1.1 StudentPaymentsPage Implementation

**Current State**: Placeholder alerts instead of actual CRUD operations

**Files to Modify**:
- `src/contexts/AppDataContext.tsx`
- `src/modules/finance/pages/StudentPaymentsPage.tsx`
- `src/mockData.ts` (if needed)

**Step 1: Add CRUD Operations to AppDataContext**

```typescript
// In AppDataContext.tsx, add to the context interface:
interface AppDataContextType {
  // ... existing properties
  studentPayments: StudentPayment[];
  addStudentPayment: (payment: Omit<StudentPayment, 'id'>) => Promise<void>;
  updateStudentPayment: (payment: StudentPayment) => Promise<void>;
  deleteStudentPayment: (id: string) => Promise<void>;
}

// Add to the provider implementation:
const addStudentPayment = async (paymentData: Omit<StudentPayment, 'id'>) => {
  try {
    setLoading(true);
    const newPayment: StudentPayment = {
      ...paymentData,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setStudentPayments(prev => [...prev, newPayment]);
    // TODO: Replace with actual API call
    // await api.studentPayments.create(newPayment);
  } catch (error) {
    console.error('Error adding student payment:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};

const updateStudentPayment = async (payment: StudentPayment) => {
  try {
    setLoading(true);
    const updatedPayment = {
      ...payment,
      updated_at: new Date().toISOString()
    };
    
    setStudentPayments(prev => 
      prev.map(p => p.id === payment.id ? updatedPayment : p)
    );
    // TODO: Replace with actual API call
    // await api.studentPayments.update(updatedPayment);
  } catch (error) {
    console.error('Error updating student payment:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};

const deleteStudentPayment = async (id: string) => {
  try {
    setLoading(true);
    setStudentPayments(prev => prev.filter(p => p.id !== id));
    // TODO: Replace with actual API call
    // await api.studentPayments.delete(id);
  } catch (error) {
    console.error('Error deleting student payment:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

**Step 2: Update StudentPaymentsPage**

```typescript
// Replace placeholder handleSubmit in StudentPaymentsPage.tsx:
const handleSubmit = async () => {
  // Validation
  if (!formData.student_id || !formData.amount || !formData.payment_date) {
    alert("Please fill in all required fields");
    return;
  }

  if (parseFloat(formData.amount) <= 0) {
    alert("Amount must be greater than 0");
    return;
  }

  try {
    const paymentData = {
      student_id: formData.student_id,
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date,
      payment_method: formData.payment_method,
      reference_number: formData.reference_number,
      notes: formData.notes,
      fee_template_id: formData.fee_template_id
    };

    if (editingPayment) {
      await updateStudentPayment({ ...editingPayment, ...paymentData });
    } else {
      await addStudentPayment(paymentData);
    }

    closeModal();
  } catch (error) {
    alert("Error saving payment. Please try again.");
  }
};

// Replace placeholder handleDelete:
const handleDelete = async (id: string) => {
  if (window.confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
    try {
      await deleteStudentPayment(id);
    } catch (error) {
      alert("Error deleting payment. Please try again.");
    }
  }
};
```

### 1.2 FeeAdjustmentsPage Implementation

**Current State**: Placeholder alerts instead of actual CRUD operations

**Step 1: Add CRUD Operations to AppDataContext**

```typescript
// Add to AppDataContext interface:
feeAdjustments: FeeAdjustment[];
addFeeAdjustment: (adjustment: Omit<FeeAdjustment, 'id'>) => Promise<void>;
updateFeeAdjustment: (adjustment: FeeAdjustment) => Promise<void>;
deleteFeeAdjustment: (id: string) => Promise<void>;

// Implementation similar to student payments pattern
```

**Step 2: Update FeeAdjustmentsPage**

```typescript
// Replace placeholder handleSubmit in FeeAdjustmentsPage.tsx:
const handleSubmit = async () => {
  // Validation
  if (!formData.student_id || !formData.adjustment_amount || !formData.reason) {
    alert("Please fill in all required fields");
    return;
  }

  try {
    const adjustmentData = {
      student_id: formData.student_id,
      adjustment_amount: parseFloat(formData.adjustment_amount),
      adjustment_type: formData.adjustment_type,
      reason: formData.reason,
      applied_date: formData.applied_date || new Date().toISOString().split('T')[0],
      fee_template_id: formData.fee_template_id
    };

    if (editingAdjustment) {
      await updateFeeAdjustment({ ...editingAdjustment, ...adjustmentData });
    } else {
      await addFeeAdjustment(adjustmentData);
    }

    closeModal();
  } catch (error) {
    alert("Error saving fee adjustment. Please try again.");
  }
};
```

## Priority 2: Settings Module Workflow Implementation

### 2.1 SettingsWorkflowsPage Implementation

**Current State**: All workflow CRUD operations are TODO placeholders

**Files to Modify**:
- `src/contexts/AppDataContext.tsx`
- `src/modules/settings/pages/SettingsWorkflowsPage.tsx`
- `src/types/index.ts` (add workflow types if missing)

**Step 1: Define Workflow Types**

```typescript
// In types/index.ts:
export interface Workflow {
  id: string;
  name: string;
  description: string;
  module: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  states: WorkflowState[];
}

export interface WorkflowState {
  id: string;
  workflow_id: string;
  name: string;
  description: string;
  order: number;
  is_initial: boolean;
  is_final: boolean;
  actions: string[];
  created_at: string;
  updated_at: string;
}
```

**Step 2: Add Workflow CRUD to AppDataContext**

```typescript
// Add to context interface:
workflows: Workflow[];
addWorkflow: (workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
updateWorkflow: (workflow: Workflow) => Promise<void>;
deleteWorkflow: (id: string) => Promise<void>;
addWorkflowState: (state: Omit<WorkflowState, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
updateWorkflowState: (state: WorkflowState) => Promise<void>;
deleteWorkflowState: (id: string) => Promise<void>;
```

**Step 3: Update SettingsWorkflowsPage**

```typescript
// Replace TODO implementations:
const handleStateSubmit = async () => {
  if (!stateFormData.name || !stateFormData.workflow_id) {
    alert("Please fill in all required fields");
    return;
  }

  try {
    const stateData = {
      workflow_id: stateFormData.workflow_id,
      name: stateFormData.name,
      description: stateFormData.description,
      order: parseInt(stateFormData.order) || 0,
      is_initial: stateFormData.is_initial,
      is_final: stateFormData.is_final,
      actions: stateFormData.actions || []
    };

    if (editingState) {
      await updateWorkflowState({ ...editingState, ...stateData });
    } else {
      await addWorkflowState(stateData);
    }

    closeStateModal();
  } catch (error) {
    alert("Error saving workflow state. Please try again.");
  }
};

const handleDeleteWorkflow = async (id: string) => {
  if (window.confirm('Are you sure you want to delete this workflow? This will also delete all associated states.')) {
    try {
      await deleteWorkflow(id);
    } catch (error) {
      alert("Error deleting workflow. Please try again.");
    }
  }
};

const handleDeleteState = async (id: string) => {
  if (window.confirm('Are you sure you want to delete this workflow state?')) {
    try {
      await deleteWorkflowState(id);
    } catch (error) {
      alert("Error deleting workflow state. Please try again.");
    }
  }
};
```

## Priority 3: Academics Module Student Enrollment

### 3.1 StudentSubjectEnrollmentPage Implementation

**Current State**: Missing `addStudentSubjectEnrollment` and `deleteStudentSubjectEnrollment` in context

**Step 1: Add to AppDataContext**

```typescript
// Add to context interface:
studentSubjectEnrollments: StudentSubjectEnrollment[];
addStudentSubjectEnrollment: (enrollment: Omit<StudentSubjectEnrollment, 'id'>) => Promise<void>;
deleteStudentSubjectEnrollment: (id: string) => Promise<void>;
updateStudentSubjectEnrollment: (enrollment: StudentSubjectEnrollment) => Promise<void>;
```

**Step 2: Update StudentSubjectEnrollmentPage**

```typescript
// Replace TODO in handleGridEnrollmentChange:
const handleGridEnrollmentChange = async (studentId: string, subjectId: string, isEnrolled: boolean) => {
  try {
    if (isEnrolled) {
      // Add enrollment
      const enrollmentData = {
        student_id: studentId,
        subject_id: subjectId,
        enrollment_date: new Date().toISOString().split('T')[0],
        academic_period_id: currentAcademicPeriod?.id || '',
        status: 'active'
      };
      await addStudentSubjectEnrollment(enrollmentData);
    } else {
      // Find and delete enrollment
      const enrollment = studentSubjectEnrollments.find(
        e => e.student_id === studentId && e.subject_id === subjectId
      );
      if (enrollment) {
        await deleteStudentSubjectEnrollment(enrollment.id);
      }
    }
  } catch (error) {
    alert("Error updating enrollment. Please try again.");
  }
};
```

## Priority 4: Self-Contained Hook Integration

### 4.1 Finance Module Hook Integration

**Files to Review and Potentially Integrate**:
- `useGeneralPaymentData.ts`
- `useFinancialYearData.ts`
- `useFeeTemplateData.ts`
- `useInvoicePaymentApplicationData.ts`
- `useFeeTemplateItemData.ts`

**Decision Matrix**:
1. **Keep Separate**: If the hook provides specialized functionality not needed globally
2. **Integrate**: If the data is used across multiple components and should be in global state

**Integration Pattern**:
```typescript
// For hooks that should be integrated:
// 1. Move CRUD operations to AppDataContext
// 2. Update the hook to use context data
// 3. Register with useDataHookRegistration if needed

// Example for useFeeTemplateData integration:
const useFeeTemplateData = () => {
  const { feeTemplates, addFeeTemplate, updateFeeTemplate, deleteFeeTemplate } = useAppData();
  
  return {
    feeTemplates,
    create: addFeeTemplate,
    update: updateFeeTemplate,
    remove: deleteFeeTemplate
  };
};
```

## Implementation Checklist

### Phase 1: Critical Placeholders
- [ ] StudentPaymentsPage CRUD operations
- [ ] FeeAdjustmentsPage CRUD operations
- [ ] SettingsWorkflowsPage workflow management
- [ ] SettingsWorkflowsPage workflow state management

### Phase 2: Missing Context Operations
- [ ] StudentSubjectEnrollmentPage enrollment operations
- [ ] ApplicationManagement review functionality

### Phase 3: Hook Standardization
- [ ] Review self-contained hooks for integration opportunities
- [ ] Fix hooks using wrong mock data
- [ ] Ensure consistent error handling patterns

### Phase 4: Testing and Validation
- [ ] Test all new CRUD operations
- [ ] Validate form submissions and error handling
- [ ] Ensure proper loading states
- [ ] Test data integrity across operations

## Best Practices for Implementation

1. **Consistent Error Handling**: Use try-catch blocks and user-friendly error messages
2. **Loading States**: Always set loading state during async operations
3. **Validation**: Validate required fields and data types before submission
4. **User Confirmation**: Use confirmation dialogs for destructive operations
5. **Type Safety**: Ensure all operations have proper TypeScript types
6. **Mock Data**: Prepare mock data for testing before API integration
7. **Documentation**: Update this guide as implementations are completed

## Testing Strategy

1. **Unit Tests**: Test individual CRUD functions
2. **Integration Tests**: Test form submissions and data flow
3. **User Acceptance Tests**: Test complete user workflows
4. **Error Scenarios**: Test validation and error handling
5. **Performance Tests**: Ensure operations don't impact app performance

## Migration to Real API

When ready to replace mock implementations with real API calls:

1. Replace mock CRUD operations with actual API calls
2. Update error handling for network errors
3. Add proper loading states for network requests
4. Implement optimistic updates where appropriate
5. Add retry logic for failed requests
6. Update TypeScript types to match API responses

This guide provides a roadmap for completing all remaining CRUD operations in SchoolPilot3. Follow the priority order and checklist to ensure systematic completion of all functionality.