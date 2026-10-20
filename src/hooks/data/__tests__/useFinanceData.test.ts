// ABOUTME: Tests for Finance domain data hook - CRUD operations for Chart of Accounts, Banks, Fee Templates, etc.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useFinanceData } from '@/modules/finance/data/useFinanceData';
import { databaseService } from '@/services/database/databaseService';

// Mock the database service.
// `useFinanceData` reads/writes through `useDatabaseCollection`, which resolves the
// database via `databaseService.getDatabase()`, fetches each collection with
// `db.getCollection(name)`, and surfaces the collection's InsertResult/UpdateResult
// (`{ id, doc, ok }`) from insert/update calls — so mocks follow those shapes.
vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(() => 'mock-id-123'),
  },
}));

type MockCollection = {
  find: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

// Every collection useDatabaseCollection mounts for useFinanceData
const COLLECTION_NAMES = [
  'chart_of_accounts',
  'banks',
  'suppliers',
  'fee_templates',
  'fee_template_items',
  'expense_categories',
  'expense_claims',
  'supplier_invoices',
  'customer_invoices',
  'student_opening_balances',
  'fee_adjustments',
  'transport_routes',
  'student_transport_assignments',
  'student_invoices',
  'student_invoice_items',
  'student_payments',
  'invoice_payment_applications',
  'general_payments',
  'general_ledger_entries',
  'financial_years',
] as const;

const mockCollections = {} as Record<(typeof COLLECTION_NAMES)[number], MockCollection>;
for (const name of COLLECTION_NAMES) {
  mockCollections[name] = {
    find: vi.fn(async () => []),
    insert: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

const mockDb = {
  getCollection: vi.fn((name: string) => mockCollections[name as keyof typeof mockCollections] ?? null),
};

describe('useFinanceData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (databaseService.getDatabase as any).mockResolvedValue(mockDb);
  });

  describe('Chart of Accounts CRUD Operations', () => {
    it('should add a chart of account successfully', async () => {
      const mockAccount = { id: 'mock-id-123', name: 'Tuition Fees', account_code: '1001', account_type: 'income' };
      mockCollections.chart_of_accounts.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockAccount, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let addedAccount: any;
      await act(async () => {
        addedAccount = await result.current.addChartOfAccount({
          name: 'Tuition Fees',
          account_code: '1001',
          account_type: 'income',
        } as any);
      });

      expect(mockCollections.chart_of_accounts.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Tuition Fees',
        account_code: '1001',
        account_type: 'income',
        id: 'mock-id-123',
      }));
      expect(addedAccount).toEqual({ id: 'mock-id-123', doc: mockAccount, ok: true });
    });

    it('should update a chart of account successfully', async () => {
      const mockAccount = { id: 'account-1', name: 'Updated Tuition Fees' };
      mockCollections.chart_of_accounts.update.mockResolvedValue({ id: 'account-1', doc: mockAccount, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let updatedAccount: any;
      await act(async () => {
        updatedAccount = await result.current.updateChartOfAccount('account-1', { name: 'Updated Tuition Fees' });
      });

      expect(mockCollections.chart_of_accounts.update).toHaveBeenCalledWith('account-1', { name: 'Updated Tuition Fees' });
      expect(updatedAccount).toEqual({ id: 'account-1', doc: mockAccount, ok: true });
    });

    it('should delete a chart of account successfully', async () => {
      mockCollections.chart_of_accounts.remove.mockResolvedValue({ id: 'account-1', ok: true });

      const { result } = renderHook(() => useFinanceData());

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteChartOfAccount('account-1');
      });

      expect(mockCollections.chart_of_accounts.remove).toHaveBeenCalledWith('account-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Bank CRUD Operations', () => {
    it('should add a bank successfully', async () => {
      const mockBank = { id: 'mock-id-123', name: 'Equity Bank', account_number: '1234567890' };
      mockCollections.banks.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockBank, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let addedBank: any;
      await act(async () => {
        addedBank = await result.current.addBank({ name: 'Equity Bank', account_number: '1234567890' } as any);
      });

      expect(mockCollections.banks.insert).toHaveBeenCalled();
      expect(addedBank).toEqual({ id: 'mock-id-123', doc: mockBank, ok: true });
    });

    it('should update a bank successfully', async () => {
      const mockBank = { id: 'bank-1', name: 'Updated Bank Name' };
      mockCollections.banks.update.mockResolvedValue({ id: 'bank-1', doc: mockBank, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let updatedBank: any;
      await act(async () => {
        updatedBank = await result.current.updateBank('bank-1', { name: 'Updated Bank Name' });
      });

      expect(mockCollections.banks.update).toHaveBeenCalledWith('bank-1', { name: 'Updated Bank Name' });
      expect(updatedBank).toEqual({ id: 'bank-1', doc: mockBank, ok: true });
    });

    it('should delete a bank successfully', async () => {
      mockCollections.banks.remove.mockResolvedValue({ id: 'bank-1', ok: true });

      const { result } = renderHook(() => useFinanceData());

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteBank('bank-1');
      });

      expect(mockCollections.banks.remove).toHaveBeenCalledWith('bank-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Supplier CRUD Operations', () => {
    it('should add a supplier successfully', async () => {
      const mockSupplier = { id: 'mock-id-123', name: 'Stationery Supplier', contact_person: 'John Doe' };
      mockCollections.suppliers.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockSupplier, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let addedSupplier: any;
      await act(async () => {
        addedSupplier = await result.current.addSupplier({
          name: 'Stationery Supplier',
          contact_person: 'John Doe',
        } as any);
      });

      expect(mockCollections.suppliers.insert).toHaveBeenCalled();
      expect(addedSupplier).toEqual({ id: 'mock-id-123', doc: mockSupplier, ok: true });
    });

    it('should update a supplier successfully', async () => {
      const mockSupplier = { id: 'supplier-1', name: 'Updated Supplier' };
      mockCollections.suppliers.update.mockResolvedValue({ id: 'supplier-1', doc: mockSupplier, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let updatedSupplier: any;
      await act(async () => {
        updatedSupplier = await result.current.updateSupplier('supplier-1', { name: 'Updated Supplier' });
      });

      expect(mockCollections.suppliers.update).toHaveBeenCalledWith('supplier-1', { name: 'Updated Supplier' });
      expect(updatedSupplier).toEqual({ id: 'supplier-1', doc: mockSupplier, ok: true });
    });
  });

  describe('Fee Template CRUD Operations', () => {
    it('should add a fee template successfully', async () => {
      const mockTemplate = { id: 'mock-id-123', name: 'Term 1 Fees', amount: 50000 };
      mockCollections.fee_templates.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockTemplate, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let addedTemplate: any;
      await act(async () => {
        addedTemplate = await result.current.addFeeTemplate({ name: 'Term 1 Fees', amount: 50000 } as any);
      });

      expect(mockCollections.fee_templates.insert).toHaveBeenCalled();
      expect(addedTemplate).toEqual({ id: 'mock-id-123', doc: mockTemplate, ok: true });
    });

    it('should update a fee template successfully', async () => {
      const mockTemplate = { id: 'template-1', name: 'Updated Term 1 Fees', amount: 55000 };
      mockCollections.fee_templates.update.mockResolvedValue({ id: 'template-1', doc: mockTemplate, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let updatedTemplate: any;
      await act(async () => {
        updatedTemplate = await result.current.updateFeeTemplate('template-1', { amount: 55000 });
      });

      expect(mockCollections.fee_templates.update).toHaveBeenCalledWith('template-1', { amount: 55000 });
      expect(updatedTemplate).toEqual({ id: 'template-1', doc: mockTemplate, ok: true });
    });

    it('should delete a fee template successfully', async () => {
      mockCollections.fee_templates.remove.mockResolvedValue({ id: 'template-1', ok: true });

      const { result } = renderHook(() => useFinanceData());

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteFeeTemplate('template-1');
      });

      expect(mockCollections.fee_templates.remove).toHaveBeenCalledWith('template-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Expense Claim CRUD Operations', () => {
    it('should add an expense claim successfully', async () => {
      const mockClaim = { id: 'mock-id-123', description: 'Office Supplies', amount: 5000, status: 'pending' };
      mockCollections.expense_claims.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockClaim, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let addedClaim: any;
      await act(async () => {
        addedClaim = await result.current.addExpenseClaim({
          description: 'Office Supplies',
          amount: 5000,
          status: 'pending',
        } as any);
      });

      expect(mockCollections.expense_claims.insert).toHaveBeenCalled();
      expect(addedClaim).toEqual({ id: 'mock-id-123', doc: mockClaim, ok: true });
    });

    it('should update an expense claim successfully', async () => {
      const mockClaim = { id: 'claim-1', status: 'approved' };
      mockCollections.expense_claims.update.mockResolvedValue({ id: 'claim-1', doc: mockClaim, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let updatedClaim: any;
      await act(async () => {
        updatedClaim = await result.current.updateExpenseClaim('claim-1', { status: 'approved' });
      });

      expect(mockCollections.expense_claims.update).toHaveBeenCalledWith('claim-1', { status: 'approved' });
      expect(updatedClaim).toEqual({ id: 'claim-1', doc: mockClaim, ok: true });
    });

    it('should delete an expense claim successfully', async () => {
      mockCollections.expense_claims.remove.mockResolvedValue({ id: 'claim-1', ok: true });

      const { result } = renderHook(() => useFinanceData());

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteExpenseClaim('claim-1');
      });

      expect(mockCollections.expense_claims.remove).toHaveBeenCalledWith('claim-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Expense Category CRUD Operations', () => {
    it('should add an expense category successfully', async () => {
      const mockCategory = { id: 'mock-id-123', name: 'Office Expenses', code: 'OE' };
      mockCollections.expense_categories.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockCategory, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let addedCategory: any;
      await act(async () => {
        addedCategory = await result.current.addExpenseCategory({ name: 'Office Expenses', code: 'OE' } as any);
      });

      expect(mockCollections.expense_categories.insert).toHaveBeenCalled();
      expect(addedCategory).toEqual({ id: 'mock-id-123', doc: mockCategory, ok: true });
    });

    it('should update an expense category successfully', async () => {
      const mockCategory = { id: 'category-1', name: 'Updated Category' };
      mockCollections.expense_categories.update.mockResolvedValue({ id: 'category-1', doc: mockCategory, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let updatedCategory: any;
      await act(async () => {
        updatedCategory = await result.current.updateExpenseCategory('category-1', { name: 'Updated Category' });
      });

      expect(mockCollections.expense_categories.update).toHaveBeenCalledWith('category-1', { name: 'Updated Category' });
      expect(updatedCategory).toEqual({ id: 'category-1', doc: mockCategory, ok: true });
    });
  });

  describe('Customer Invoice CRUD Operations', () => {
    it('should add a customer invoice successfully', async () => {
      const mockInvoice = { id: 'mock-id-123', invoice_number: 'INV001', amount: 10000, status: 'unpaid' };
      mockCollections.customer_invoices.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockInvoice, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let addedInvoice: any;
      await act(async () => {
        addedInvoice = await result.current.addCustomerInvoice({
          invoice_number: 'INV001',
          amount: 10000,
          status: 'unpaid',
        } as any);
      });

      expect(mockCollections.customer_invoices.insert).toHaveBeenCalled();
      expect(addedInvoice).toEqual({ id: 'mock-id-123', doc: mockInvoice, ok: true });
    });

    it('should update a customer invoice successfully', async () => {
      const mockInvoice = { id: 'invoice-1', status: 'paid' };
      mockCollections.customer_invoices.update.mockResolvedValue({ id: 'invoice-1', doc: mockInvoice, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let updatedInvoice: any;
      await act(async () => {
        updatedInvoice = await result.current.updateCustomerInvoice('invoice-1', { status: 'paid' });
      });

      expect(mockCollections.customer_invoices.update).toHaveBeenCalledWith('invoice-1', { status: 'paid' });
      expect(updatedInvoice).toEqual({ id: 'invoice-1', doc: mockInvoice, ok: true });
    });
  });

  describe('Fee Adjustment CRUD Operations', () => {
    it('should add a fee adjustment successfully', async () => {
      const mockAdjustment = { id: 'mock-id-123', student_id: 'student-1', amount: -2000, reason: 'Scholarship' };
      mockCollections.fee_adjustments.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockAdjustment, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let addedAdjustment: any;
      await act(async () => {
        addedAdjustment = await result.current.addFeeAdjustment({
          student_id: 'student-1',
          amount: -2000,
          reason: 'Scholarship',
        } as any);
      });

      expect(mockCollections.fee_adjustments.insert).toHaveBeenCalled();
      expect(addedAdjustment).toEqual({ id: 'mock-id-123', doc: mockAdjustment, ok: true });
    });

    it('should update a fee adjustment successfully', async () => {
      const mockAdjustment = { id: 'adjustment-1', amount: -3000 };
      mockCollections.fee_adjustments.update.mockResolvedValue({ id: 'adjustment-1', doc: mockAdjustment, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let updatedAdjustment: any;
      await act(async () => {
        updatedAdjustment = await result.current.updateFeeAdjustment('adjustment-1', { amount: -3000 });
      });

      expect(mockCollections.fee_adjustments.update).toHaveBeenCalledWith('adjustment-1', { amount: -3000 });
      expect(updatedAdjustment).toEqual({ id: 'adjustment-1', doc: mockAdjustment, ok: true });
    });

    it('should delete a fee adjustment successfully', async () => {
      mockCollections.fee_adjustments.remove.mockResolvedValue({ id: 'adjustment-1', ok: true });

      const { result } = renderHook(() => useFinanceData());

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteFeeAdjustment('adjustment-1');
      });

      expect(mockCollections.fee_adjustments.remove).toHaveBeenCalledWith('adjustment-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Transport Route CRUD Operations', () => {
    it('should add a transport route successfully', async () => {
      const mockRoute = { id: 'mock-id-123', name: 'Route A', pickup_point: 'Main Gate', fee: 5000 };
      mockCollections.transport_routes.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockRoute, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let addedRoute: any;
      await act(async () => {
        addedRoute = await result.current.addTransportRoute({
          name: 'Route A',
          pickup_point: 'Main Gate',
          fee: 5000,
        } as any);
      });

      expect(mockCollections.transport_routes.insert).toHaveBeenCalled();
      expect(addedRoute).toEqual({ id: 'mock-id-123', doc: mockRoute, ok: true });
    });

    it('should update a transport route successfully', async () => {
      const mockRoute = { id: 'route-1', fee: 6000 };
      mockCollections.transport_routes.update.mockResolvedValue({ id: 'route-1', doc: mockRoute, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let updatedRoute: any;
      await act(async () => {
        updatedRoute = await result.current.updateTransportRoute('route-1', { fee: 6000 });
      });

      expect(mockCollections.transport_routes.update).toHaveBeenCalledWith('route-1', { fee: 6000 });
      expect(updatedRoute).toEqual({ id: 'route-1', doc: mockRoute, ok: true });
    });
  });

  describe('Student Payment CRUD Operations', () => {
    it('should add a student payment successfully', async () => {
      const mockPayment = { id: 'mock-id-123', student_id: 'student-1', amount: 25000, payment_method: 'cash' };
      mockCollections.student_payments.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockPayment, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let addedPayment: any;
      await act(async () => {
        addedPayment = await result.current.addStudentPayment({
          student_id: 'student-1',
          amount: 25000,
          payment_method: 'cash',
        } as any);
      });

      expect(mockCollections.student_payments.insert).toHaveBeenCalled();
      expect(addedPayment).toEqual({ id: 'mock-id-123', doc: mockPayment, ok: true });
    });

    it('should update a student payment successfully', async () => {
      const mockPayment = { id: 'payment-1', amount: 30000 };
      mockCollections.student_payments.update.mockResolvedValue({ id: 'payment-1', doc: mockPayment, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let updatedPayment: any;
      await act(async () => {
        updatedPayment = await result.current.updateStudentPayment('payment-1', { amount: 30000 });
      });

      expect(mockCollections.student_payments.update).toHaveBeenCalledWith('payment-1', { amount: 30000 });
      expect(updatedPayment).toEqual({ id: 'payment-1', doc: mockPayment, ok: true });
    });

    it('should delete a student payment successfully', async () => {
      mockCollections.student_payments.remove.mockResolvedValue({ id: 'payment-1', ok: true });

      const { result } = renderHook(() => useFinanceData());

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteStudentPayment('payment-1');
      });

      expect(mockCollections.student_payments.remove).toHaveBeenCalledWith('payment-1');
      expect(deleteResult).toBe(true);
    });

    it('should apply payment to invoices successfully', async () => {
      const mockPayment = { id: 'payment-1', applied_to_invoices: ['inv-1', 'inv-2'] };
      mockCollections.student_payments.update.mockResolvedValue({ id: 'payment-1', doc: mockPayment, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let appliedPayment: any;
      await act(async () => {
        appliedPayment = await result.current.applyPaymentToInvoices('payment-1', ['inv-1', 'inv-2']);
      });

      expect(mockCollections.student_payments.update).toHaveBeenCalledWith('payment-1', { applied_to_invoices: ['inv-1', 'inv-2'] });
      expect(appliedPayment).toEqual({ id: 'payment-1', doc: mockPayment, ok: true });
    });
  });

  describe('Financial Year CRUD Operations', () => {
    it('should add a financial year successfully', async () => {
      const mockYear = { id: 'mock-id-123', name: 'FY 2024', start_date: '2024-01-01', end_date: '2024-12-31' };
      mockCollections.financial_years.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockYear, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let addedYear: any;
      await act(async () => {
        addedYear = await result.current.addFinancialYear({
          name: 'FY 2024',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
        });
      });

      expect(mockCollections.financial_years.insert).toHaveBeenCalled();
      expect(addedYear).toEqual({ id: 'mock-id-123', doc: mockYear, ok: true });
    });

    it('should update a financial year successfully', async () => {
      const mockYear = { id: 'year-1', name: 'Updated FY 2024' };
      mockCollections.financial_years.update.mockResolvedValue({ id: 'year-1', doc: mockYear, ok: true });

      const { result } = renderHook(() => useFinanceData());

      let updatedYear: any;
      await act(async () => {
        updatedYear = await result.current.updateFinancialYear('year-1', { name: 'Updated FY 2024' });
      });

      expect(mockCollections.financial_years.update).toHaveBeenCalledWith('year-1', { name: 'Updated FY 2024' });
      expect(updatedYear).toEqual({ id: 'year-1', doc: mockYear, ok: true });
    });

    it('should delete a financial year successfully', async () => {
      mockCollections.financial_years.remove.mockResolvedValue({ id: 'year-1', ok: true });

      const { result } = renderHook(() => useFinanceData());

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteFinancialYear('year-1');
      });

      expect(mockCollections.financial_years.remove).toHaveBeenCalledWith('year-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Initial Data State', () => {
    it('should return empty arrays for all data properties initially', async () => {
      const { result } = renderHook(() => useFinanceData());

      // Collections load asynchronously from the (mocked) database
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.chartOfAccounts).toEqual([]);
      expect(result.current.banks).toEqual([]);
      expect(result.current.suppliers).toEqual([]);
      expect(result.current.feeTemplates).toEqual([]);
      expect(result.current.feeTemplateItems).toEqual([]);
      expect(result.current.expenseCategories).toEqual([]);
      expect(result.current.expenseClaims).toEqual([]);
      expect(result.current.supplierInvoices).toEqual([]);
      expect(result.current.customerInvoices).toEqual([]);
      expect(result.current.studentOpeningBalances).toEqual([]);
      expect(result.current.feeAdjustments).toEqual([]);
      expect(result.current.transportRoutes).toEqual([]);
      expect(result.current.studentTransportAssignments).toEqual([]);
      expect(result.current.studentInvoices).toEqual([]);
      expect(result.current.studentInvoiceItems).toEqual([]);
      expect(result.current.studentPayments).toEqual([]);
      expect(result.current.invoicePaymentApplications).toEqual([]);
      expect(result.current.generalPayments).toEqual([]);
      expect(result.current.generalLedgerEntries).toEqual([]);
      expect(result.current.financialYears).toEqual([]);
    });
  });
});
