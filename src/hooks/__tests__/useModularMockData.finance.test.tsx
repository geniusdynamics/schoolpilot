// ABOUTME: Regression tests for the modular mock provider finance collections and CRUD adapters.
// ABOUTME: Verifies page-facing finance operations stay populated and shaped for fee, payment, balance, and invoice screens.

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useModularMockData } from '../useModularMockData';

describe('useModularMockData finance adapters', () => {
  it('exposes finance collections with page-facing loading flags', async () => {
    const { result } = renderHook(() => useModularMockData());

    expect(result.current.loading.feeTemplates).toBe(true);

    await waitFor(() => expect(result.current.loading.feeTemplates).toBe(false));

    expect(result.current.feeTemplates.length).toBeGreaterThan(0);
    expect(result.current.studentPayments.length).toBeGreaterThan(0);
    expect(result.current.studentOpeningBalances.length).toBeGreaterThan(0);
    expect(result.current.customerInvoices.length).toBeGreaterThan(0);
  });

  it('enriches finance display fields and supports page-style CRUD signatures', async () => {
    const { result } = renderHook(() => useModularMockData());

    await waitFor(() => expect(result.current.loading.studentPayments).toBe(false));

    await act(async () => {
      await result.current.addStudentPayment({
        student_id: 'S001',
        receipt_no: 'RCPT/2026/900',
        total_amount_paid: 3500,
        payment_method: 'Cash',
        transaction_date: '2026-03-31'
      });
    });

    expect(result.current.studentPayments.at(-1)).toMatchObject({
      student_id: 'S001',
      student_name: 'Jim Halpert',
      receipt_no: 'RCPT/2026/900'
    });

    await act(async () => {
      await result.current.addStudentOpeningBalance({
        student_id: 'S001',
        balance_type: 'Debit',
        amount: 2200,
        as_of_date: '2026-03-31'
      });
    });

    expect(result.current.studentOpeningBalances.at(-1)).toMatchObject({
      student_id: 'S001',
      student_name: 'Jim Halpert'
    });

    await act(async () => {
      await result.current.addFeeTemplate({
        name: 'Transport Template',
        school_period_id: 1,
        student_category_id: 1,
        items: []
      });
    });

    const createdTemplate = result.current.feeTemplates.at(-1);

    expect(createdTemplate).toMatchObject({
      name: 'Transport Template',
      school_period_name: 'Term 1 - AY 2022/2023',
      student_category_name: 'Boarder'
    });

    await act(async () => {
      await result.current.updateFeeTemplate({
        ...createdTemplate!,
        name: 'Transport Template Updated'
      });
    });

    expect(result.current.feeTemplates.at(-1)?.name).toBe('Transport Template Updated');

    await act(async () => {
      await result.current.addCustomerInvoice({
        customer_id: 1,
        invoice_number: 'CI/2026/101',
        issue_date: '2026-03-31',
        items: []
      });
    });

    const createdCustomerInvoice = result.current.customerInvoices.at(-1);

    expect(createdCustomerInvoice).toMatchObject({
      invoice_number: 'CI/2026/101',
      customer_name: 'Uniforms Direct Ltd'
    });

    await act(async () => {
      await result.current.updateCustomerInvoice({
        ...createdCustomerInvoice!,
        total_amount: 4800
      });
    });

    expect(result.current.customerInvoices.at(-1)?.total_amount).toBe(4800);
  });
});
