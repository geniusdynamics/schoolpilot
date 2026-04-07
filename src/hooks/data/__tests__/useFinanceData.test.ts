// ABOUTME: Tests for Finance domain data hook - CRUD operations for Chart of Accounts, Banks, Fee Templates, etc.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFinanceData } from '../useFinanceData';
import { databaseService } from '../../../services/database/databaseService';

// Mock the database service
vi.mock('../../../services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(() => 'mock-id-123'),
  },
}));

describe('useFinanceData', () => {
  const mockDb = {
    chart_of_accounts: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    banks: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    suppliers: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    fee_templates: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    expense_claims: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    expense_categories: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    customer_invoices: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    supplier_invoices: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    student_opening_balances: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    fee_adjustments: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    transport_routes: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    student_transport_assignments: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    student_payments: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    general_payments: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    financial_years: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (databaseService.getDatabase as any).mockResolvedValue(mockDb);
  });

  describe('Chart of Accounts CRUD Operations', () => {
    it('should add a chart of account successfully', async () => {
      const mockAccount = { id: 'mock-id-123', name: 'Tuition Fees', account_code: '1001', account_type: 'income' };
      mockDb.chart_of_accounts.insert.mockResolvedValue({ doc: mockAccount });

      const { result } = renderHook(() => useFinanceData({}));

      let addedAccount: any;
      await act(async () => {
        addedAccount = await result.current.addChartOfAccount({
          name: 'Tuition Fees',
          account_code: '1001',
          account_type: 'income',
        } as any);
      });

      expect(mockDb.chart_of_accounts.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Tuition Fees',
        account_code: '1001',
        account_type: 'income',
        id: 'mock-id-123',
      }));
      expect(addedAccount).toEqual(mockAccount);
    });

    it('should update a chart of account successfully', async () => {
      const mockAccount = { id: 'account-1', name: 'Updated Tuition Fees' };
      mockDb.chart_of_accounts.update.mockResolvedValue({ doc: mockAccount });

      const { result } = renderHook(() => useFinanceData({}));

      let updatedAccount: any;
      await act(async () => {
        updatedAccount = await result.current.updateChartOfAccount('account-1', { name: 'Updated Tuition Fees' });
      });

      expect(mockDb.chart_of_accounts.update).toHaveBeenCalledWith('account-1', { name: 'Updated Tuition Fees' });
      expect(updatedAccount).toEqual(mockAccount);
    });

    it('should delete a chart of account successfully', async () => {
      mockDb.chart_of_accounts.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFinanceData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteChartOfAccount('account-1');
      });

      expect(mockDb.chart_of_accounts.remove).toHaveBeenCalledWith('account-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Bank CRUD Operations', () => {
    it('should add a bank successfully', async () => {
      const mockBank = { id: 'mock-id-123', name: 'Equity Bank', account_number: '1234567890' };
      mockDb.banks.insert.mockResolvedValue({ doc: mockBank });

      const { result } = renderHook(() => useFinanceData({}));

      let addedBank: any;
      await act(async () => {
        addedBank = await result.current.addBank({ name: 'Equity Bank', account_number: '1234567890' } as any);
      });

      expect(mockDb.banks.insert).toHaveBeenCalled();
      expect(addedBank).toEqual(mockBank);
    });

    it('should update a bank successfully', async () => {
      const mockBank = { id: 'bank-1', name: 'Updated Bank Name' };
      mockDb.banks.update.mockResolvedValue({ doc: mockBank });

      const { result } = renderHook(() => useFinanceData({}));

      let updatedBank: any;
      await act(async () => {
        updatedBank = await result.current.updateBank('bank-1', { name: 'Updated Bank Name' });
      });

      expect(mockDb.banks.update).toHaveBeenCalledWith('bank-1', { name: 'Updated Bank Name' });
      expect(updatedBank).toEqual(mockBank);
    });

    it('should delete a bank successfully', async () => {
      mockDb.banks.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFinanceData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteBank('bank-1');
      });

      expect(mockDb.banks.remove).toHaveBeenCalledWith('bank-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Supplier CRUD Operations', () => {
    it('should add a supplier successfully', async () => {
      const mockSupplier = { id: 'mock-id-123', name: 'Stationery Supplier', contact_person: 'John Doe' };
      mockDb.suppliers.insert.mockResolvedValue({ doc: mockSupplier });

      const { result } = renderHook(() => useFinanceData({}));

      let addedSupplier: any;
      await act(async () => {
        addedSupplier = await result.current.addSupplier({
          name: 'Stationery Supplier',
          contact_person: 'John Doe',
        } as any);
      });

      expect(mockDb.suppliers.insert).toHaveBeenCalled();
      expect(addedSupplier).toEqual(mockSupplier);
    });

    it('should update a supplier successfully', async () => {
      const mockSupplier = { id: 'supplier-1', name: 'Updated Supplier' };
      mockDb.suppliers.update.mockResolvedValue({ doc: mockSupplier });

      const { result } = renderHook(() => useFinanceData({}));

      let updatedSupplier: any;
      await act(async () => {
        updatedSupplier = await result.current.updateSupplier('supplier-1', { name: 'Updated Supplier' });
      });

      expect(mockDb.suppliers.update).toHaveBeenCalledWith('supplier-1', { name: 'Updated Supplier' });
      expect(updatedSupplier).toEqual(mockSupplier);
    });
  });

  describe('Fee Template CRUD Operations', () => {
    it('should add a fee template successfully', async () => {
      const mockTemplate = { id: 'mock-id-123', name: 'Term 1 Fees', amount: 50000 };
      mockDb.fee_templates.insert.mockResolvedValue({ doc: mockTemplate });

      const { result } = renderHook(() => useFinanceData({}));

      let addedTemplate: any;
      await act(async () => {
        addedTemplate = await result.current.addFeeTemplate({ name: 'Term 1 Fees', amount: 50000 } as any);
      });

      expect(mockDb.fee_templates.insert).toHaveBeenCalled();
      expect(addedTemplate).toEqual(mockTemplate);
    });

    it('should update a fee template successfully', async () => {
      const mockTemplate = { id: 'template-1', name: 'Updated Term 1 Fees', amount: 55000 };
      mockDb.fee_templates.update.mockResolvedValue({ doc: mockTemplate });

      const { result } = renderHook(() => useFinanceData({}));

      let updatedTemplate: any;
      await act(async () => {
        updatedTemplate = await result.current.updateFeeTemplate('template-1', { amount: 55000 });
      });

      expect(mockDb.fee_templates.update).toHaveBeenCalledWith('template-1', { amount: 55000 });
      expect(updatedTemplate).toEqual(mockTemplate);
    });

    it('should delete a fee template successfully', async () => {
      mockDb.fee_templates.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFinanceData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteFeeTemplate('template-1');
      });

      expect(mockDb.fee_templates.remove).toHaveBeenCalledWith('template-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Expense Claim CRUD Operations', () => {
    it('should add an expense claim successfully', async () => {
      const mockClaim = { id: 'mock-id-123', description: 'Office Supplies', amount: 5000, status: 'pending' };
      mockDb.expense_claims.insert.mockResolvedValue({ doc: mockClaim });

      const { result } = renderHook(() => useFinanceData({}));

      let addedClaim: any;
      await act(async () => {
        addedClaim = await result.current.addExpenseClaim({
          description: 'Office Supplies',
          amount: 5000,
          status: 'pending',
        } as any);
      });

      expect(mockDb.expense_claims.insert).toHaveBeenCalled();
      expect(addedClaim).toEqual(mockClaim);
    });

    it('should update an expense claim successfully', async () => {
      const mockClaim = { id: 'claim-1', status: 'approved' };
      mockDb.expense_claims.update.mockResolvedValue({ doc: mockClaim });

      const { result } = renderHook(() => useFinanceData({}));

      let updatedClaim: any;
      await act(async () => {
        updatedClaim = await result.current.updateExpenseClaim('claim-1', { status: 'approved' });
      });

      expect(mockDb.expense_claims.update).toHaveBeenCalledWith('claim-1', { status: 'approved' });
      expect(updatedClaim).toEqual(mockClaim);
    });

    it('should delete an expense claim successfully', async () => {
      mockDb.expense_claims.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFinanceData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteExpenseClaim('claim-1');
      });

      expect(mockDb.expense_claims.remove).toHaveBeenCalledWith('claim-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Expense Category CRUD Operations', () => {
    it('should add an expense category successfully', async () => {
      const mockCategory = { id: 'mock-id-123', name: 'Office Expenses', code: 'OE' };
      mockDb.expense_categories.insert.mockResolvedValue({ doc: mockCategory });

      const { result } = renderHook(() => useFinanceData({}));

      let addedCategory: any;
      await act(async () => {
        addedCategory = await result.current.addExpenseCategory({ name: 'Office Expenses', code: 'OE' } as any);
      });

      expect(mockDb.expense_categories.insert).toHaveBeenCalled();
      expect(addedCategory).toEqual(mockCategory);
    });

    it('should update an expense category successfully', async () => {
      const mockCategory = { id: 'category-1', name: 'Updated Category' };
      mockDb.expense_categories.update.mockResolvedValue({ doc: mockCategory });

      const { result } = renderHook(() => useFinanceData({}));

      let updatedCategory: any;
      await act(async () => {
        updatedCategory = await result.current.updateExpenseCategory('category-1', { name: 'Updated Category' });
      });

      expect(mockDb.expense_categories.update).toHaveBeenCalledWith('category-1', { name: 'Updated Category' });
      expect(updatedCategory).toEqual(mockCategory);
    });
  });

  describe('Customer Invoice CRUD Operations', () => {
    it('should add a customer invoice successfully', async () => {
      const mockInvoice = { id: 'mock-id-123', invoice_number: 'INV001', amount: 10000, status: 'unpaid' };
      mockDb.customer_invoices.insert.mockResolvedValue({ doc: mockInvoice });

      const { result } = renderHook(() => useFinanceData({}));

      let addedInvoice: any;
      await act(async () => {
        addedInvoice = await result.current.addCustomerInvoice({
          invoice_number: 'INV001',
          amount: 10000,
          status: 'unpaid',
        } as any);
      });

      expect(mockDb.customer_invoices.insert).toHaveBeenCalled();
      expect(addedInvoice).toEqual(mockInvoice);
    });

    it('should update a customer invoice successfully', async () => {
      const mockInvoice = { id: 'invoice-1', status: 'paid' };
      mockDb.customer_invoices.update.mockResolvedValue({ doc: mockInvoice });

      const { result } = renderHook(() => useFinanceData({}));

      let updatedInvoice: any;
      await act(async () => {
        updatedInvoice = await result.current.updateCustomerInvoice('invoice-1', { status: 'paid' });
      });

      expect(mockDb.customer_invoices.update).toHaveBeenCalledWith('invoice-1', { status: 'paid' });
      expect(updatedInvoice).toEqual(mockInvoice);
    });
  });

  describe('Fee Adjustment CRUD Operations', () => {
    it('should add a fee adjustment successfully', async () => {
      const mockAdjustment = { id: 'mock-id-123', student_id: 'student-1', amount: -2000, reason: 'Scholarship' };
      mockDb.fee_adjustments.insert.mockResolvedValue({ doc: mockAdjustment });

      const { result } = renderHook(() => useFinanceData({}));

      let addedAdjustment: any;
      await act(async () => {
        addedAdjustment = await result.current.addFeeAdjustment({
          student_id: 'student-1',
          amount: -2000,
          reason: 'Scholarship',
        } as any);
      });

      expect(mockDb.fee_adjustments.insert).toHaveBeenCalled();
      expect(addedAdjustment).toEqual(mockAdjustment);
    });

    it('should update a fee adjustment successfully', async () => {
      const mockAdjustment = { id: 'adjustment-1', amount: -3000 };
      mockDb.fee_adjustments.update.mockResolvedValue({ doc: mockAdjustment });

      const { result } = renderHook(() => useFinanceData({}));

      let updatedAdjustment: any;
      await act(async () => {
        updatedAdjustment = await result.current.updateFeeAdjustment('adjustment-1', { amount: -3000 });
      });

      expect(mockDb.fee_adjustments.update).toHaveBeenCalledWith('adjustment-1', { amount: -3000 });
      expect(updatedAdjustment).toEqual(mockAdjustment);
    });

    it('should delete a fee adjustment successfully', async () => {
      mockDb.fee_adjustments.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFinanceData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteFeeAdjustment('adjustment-1');
      });

      expect(mockDb.fee_adjustments.remove).toHaveBeenCalledWith('adjustment-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Transport Route CRUD Operations', () => {
    it('should add a transport route successfully', async () => {
      const mockRoute = { id: 'mock-id-123', name: 'Route A', pickup_point: 'Main Gate', fee: 5000 };
      mockDb.transport_routes.insert.mockResolvedValue({ doc: mockRoute });

      const { result } = renderHook(() => useFinanceData({}));

      let addedRoute: any;
      await act(async () => {
        addedRoute = await result.current.addTransportRoute({
          name: 'Route A',
          pickup_point: 'Main Gate',
          fee: 5000,
        } as any);
      });

      expect(mockDb.transport_routes.insert).toHaveBeenCalled();
      expect(addedRoute).toEqual(mockRoute);
    });

    it('should update a transport route successfully', async () => {
      const mockRoute = { id: 'route-1', fee: 6000 };
      mockDb.transport_routes.update.mockResolvedValue({ doc: mockRoute });

      const { result } = renderHook(() => useFinanceData({}));

      let updatedRoute: any;
      await act(async () => {
        updatedRoute = await result.current.updateTransportRoute('route-1', { fee: 6000 });
      });

      expect(mockDb.transport_routes.update).toHaveBeenCalledWith('route-1', { fee: 6000 });
      expect(updatedRoute).toEqual(mockRoute);
    });
  });

  describe('Student Payment CRUD Operations', () => {
    it('should add a student payment successfully', async () => {
      const mockPayment = { id: 'mock-id-123', student_id: 'student-1', amount: 25000, payment_method: 'cash' };
      mockDb.student_payments.insert.mockResolvedValue({ doc: mockPayment });

      const { result } = renderHook(() => useFinanceData({}));

      let addedPayment: any;
      await act(async () => {
        addedPayment = await result.current.addStudentPayment({
          student_id: 'student-1',
          amount: 25000,
          payment_method: 'cash',
        } as any);
      });

      expect(mockDb.student_payments.insert).toHaveBeenCalled();
      expect(addedPayment).toEqual(mockPayment);
    });

    it('should update a student payment successfully', async () => {
      const mockPayment = { id: 'payment-1', amount: 30000 };
      mockDb.student_payments.update.mockResolvedValue({ doc: mockPayment });

      const { result } = renderHook(() => useFinanceData({}));

      let updatedPayment: any;
      await act(async () => {
        updatedPayment = await result.current.updateStudentPayment('payment-1', { amount: 30000 });
      });

      expect(mockDb.student_payments.update).toHaveBeenCalledWith('payment-1', { amount: 30000 });
      expect(updatedPayment).toEqual(mockPayment);
    });

    it('should delete a student payment successfully', async () => {
      mockDb.student_payments.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFinanceData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteStudentPayment('payment-1');
      });

      expect(mockDb.student_payments.remove).toHaveBeenCalledWith('payment-1');
      expect(deleteResult).toBe(true);
    });

    it('should apply payment to invoices successfully', async () => {
      const mockPayment = { id: 'payment-1', applied_to_invoices: ['inv-1', 'inv-2'] };
      mockDb.student_payments.update.mockResolvedValue({ doc: mockPayment });

      const { result } = renderHook(() => useFinanceData({}));

      let appliedPayment: any;
      await act(async () => {
        appliedPayment = await result.current.applyPaymentToInvoices('payment-1', ['inv-1', 'inv-2']);
      });

      expect(mockDb.student_payments.update).toHaveBeenCalledWith('payment-1', { applied_to_invoices: ['inv-1', 'inv-2'] });
      expect(appliedPayment).toEqual(mockPayment);
    });
  });

  describe('Financial Year CRUD Operations', () => {
    it('should add a financial year successfully', async () => {
      const mockYear = { id: 'mock-id-123', name: 'FY 2024', start_date: '2024-01-01', end_date: '2024-12-31' };
      mockDb.financial_years.insert.mockResolvedValue({ doc: mockYear });

      const { result } = renderHook(() => useFinanceData({}));

      let addedYear: any;
      await act(async () => {
        addedYear = await result.current.addFinancialYear({
          name: 'FY 2024',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
        });
      });

      expect(mockDb.financial_years.insert).toHaveBeenCalled();
      expect(addedYear).toEqual(mockYear);
    });

    it('should update a financial year successfully', async () => {
      const mockYear = { id: 'year-1', name: 'Updated FY 2024' };
      mockDb.financial_years.update.mockResolvedValue({ doc: mockYear });

      const { result } = renderHook(() => useFinanceData({}));

      let updatedYear: any;
      await act(async () => {
        updatedYear = await result.current.updateFinancialYear('year-1', { name: 'Updated FY 2024' });
      });

      expect(mockDb.financial_years.update).toHaveBeenCalledWith('year-1', { name: 'Updated FY 2024' });
      expect(updatedYear).toEqual(mockYear);
    });

    it('should delete a financial year successfully', async () => {
      mockDb.financial_years.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFinanceData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteFinancialYear('year-1');
      });

      expect(mockDb.financial_years.remove).toHaveBeenCalledWith('year-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Initial Data State', () => {
    it('should return empty arrays for all data properties initially', () => {
      const { result } = renderHook(() => useFinanceData({}));

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
