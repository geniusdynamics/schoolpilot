// ABOUTME: Regression tests for finance data hooks serving fee, payment, balance, and invoice records.
// ABOUTME: Verifies the hooks return finance-shaped collections and preserve page-facing ID semantics.

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCustomerInvoiceData } from '../useCustomerInvoiceData';
import { useFeeTemplateItemData } from '../useFeeTemplateItemData';
import { useStudentInvoiceData } from '../useStudentInvoiceData';
import { useStudentOpeningBalanceData } from '../useStudentOpeningBalanceData';
import { useStudentPaymentData } from '../useStudentPaymentData';
import {
  FinCustomerInvoiceStatusEnum,
  FinInvoiceStatusEnum,
  FinOpeningBalanceTypeEnum
} from '../types';

describe('finance data hook integrity', () => {
  it('loads student opening balances from finance mock data', async () => {
    const { result } = renderHook(() => useStudentOpeningBalanceData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data[0]).toMatchObject({
      student_id: 'S001',
      balance_type: FinOpeningBalanceTypeEnum.DEBIT,
      student_name: 'Jim Halpert'
    });
  });

  it('loads student invoices from finance mock data', async () => {
    const { result } = renderHook(() => useStudentInvoiceData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data[0]).toMatchObject({
      id: 'SINV001',
      invoice_number: 'INV/2023/001',
      status: FinInvoiceStatusEnum.PAID,
      student_name: 'Jim Halpert'
    });
  });

  it('supports string-based customer invoice updates and deletes', async () => {
    const { result } = renderHook(() => useCustomerInvoiceData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const existingInvoice = result.current.data[0];

    await act(async () => {
      await result.current.update(existingInvoice.id, {
        status: FinCustomerInvoiceStatusEnum.OVERDUE
      });
    });

    expect(result.current.data.find((invoice) => invoice.id === existingInvoice.id)?.status).toBe(
      FinCustomerInvoiceStatusEnum.OVERDUE
    );

    await act(async () => {
      await result.current.remove(existingInvoice.id);
    });

    expect(result.current.data.some((invoice) => invoice.id === existingInvoice.id)).toBe(false);
  });

  it('creates string identifiers for page-facing payment and fee item rows', async () => {
    const { result: paymentResult } = renderHook(() => useStudentPaymentData());
    const { result: feeItemResult } = renderHook(() => useFeeTemplateItemData());

    await waitFor(() => expect(paymentResult.current.isLoading).toBe(false));
    await waitFor(() => expect(feeItemResult.current.isLoading).toBe(false));

    let createdPaymentId = '';
    let createdFeeItemId = '';

    await act(async () => {
      const createdPayment = await paymentResult.current.create({
        student_id: 'S001',
        receipt_no: 'RCPT/TST/001',
        total_amount_paid: 1250,
        transaction_date: '2026-03-31'
      });

      const createdFeeItem = await feeItemResult.current.create({
        fee_template_id: 1,
        description: 'Activity Fee',
        amount: 450,
        revenue_account_id: 201
      });

      createdPaymentId = createdPayment.id;
      createdFeeItemId = createdFeeItem.id;
    });

    expect(createdPaymentId).toMatch(/^SPAY\d+$/);
    expect(createdFeeItemId).toMatch(/^FTI_\d+$/);
  });
});
