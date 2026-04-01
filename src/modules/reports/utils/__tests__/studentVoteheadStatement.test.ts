// ABOUTME: Regression tests for student votehead statement allocation and opening-balance rules.
// ABOUTME: Verifies billed balances are excluded and only period allocations reduce the statement balance.

import { describe, expect, it } from 'vitest';
import {
  FinOpeningBalanceTypeEnum,
  InvoiceStatus,
  SchoolPeriod,
  StudentInvoice,
  StudentPayment
} from '@/types';
import { buildStudentVoteheadStatement } from '../studentVoteheadStatement';

const schoolPeriods: SchoolPeriod[] = [
  {
    id: 1,
    academic_year_id: 1,
    period_definition_id: 'TERM1',
    financial_year_id: 1,
    start_date: '2024-01-10',
    end_date: '2024-04-10',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    name: 'Term 1'
  }
];

const studentInvoices: StudentInvoice[] = [
  {
    id: 'INV-TERM1',
    student_id: 'S001',
    invoice_number: 'INV/001',
    school_period_id: 1,
    issue_date: '2024-01-15',
    due_date: '2024-01-30',
    total_amount_billed: 600,
    amount_paid: 0,
    status: InvoiceStatus.DUE,
    created_at: '2024-01-15',
    updated_at: '2024-01-15',
    items: [
      { id: 'ITEM-TUITION', invoice_id: 'INV-TERM1', description: 'Tuition', amount: 400 },
      { id: 'ITEM-MEALS', invoice_id: 'INV-TERM1', description: 'Meals', amount: 200 }
    ]
  },
  {
    id: 'INV-TERM2',
    student_id: 'S001',
    invoice_number: 'INV/002',
    school_period_id: 2,
    issue_date: '2024-05-01',
    due_date: '2024-05-15',
    total_amount_billed: 300,
    amount_paid: 0,
    status: InvoiceStatus.DUE,
    created_at: '2024-05-01',
    updated_at: '2024-05-01',
    items: [
      { id: 'ITEM-OTHER-PERIOD', invoice_id: 'INV-TERM2', description: 'Transport', amount: 300 }
    ]
  }
];

const studentPayments: StudentPayment[] = [
  {
    id: 'PAY-001',
    student_id: 'S001',
    receipt_no: 'RCPT-001',
    total_amount_paid: 500,
    payment_method: 'Cash',
    transaction_date: '2024-01-20',
    created_at: '2024-01-20',
    updated_at: '2024-01-20'
  }
];

describe('buildStudentVoteheadStatement', () => {
  it('uses only the amount applied to the selected period when crediting a payment row', () => {
    const statement = buildStudentVoteheadStatement({
      selectedStudentId: 'S001',
      selectedSchoolPeriodId: 1,
      schoolPeriods,
      studentInvoices,
      studentInvoiceItems: [],
      studentPayments,
      invoicePaymentApplications: [
        { id: 'APP-001', payment_id: 'PAY-001', invoice_item_id: 'ITEM-TUITION', amount_applied: 150 },
        { id: 'APP-002', payment_id: 'PAY-001', invoice_item_id: 'ITEM-MEALS', amount_applied: 50 },
        { id: 'APP-003', payment_id: 'PAY-001', invoice_item_id: 'ITEM-OTHER-PERIOD', amount_applied: 300 }
      ],
      studentOpeningBalances: [
        {
          id: 'OB-001',
          student_id: 'S001',
          balance_type: FinOpeningBalanceTypeEnum.DEBIT,
          amount: 100,
          as_of_date: '2024-01-01',
          is_billed: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]
    });

    const paymentRow = statement.rows.find((row) => row.paymentRef === 'RCPT-001');

    expect(statement.openingBalance).toBe(100);
    expect(paymentRow?.credit).toBe(200);
    expect(statement.rows.at(-1)?.balance).toBe(500);
  });

  it('excludes billed opening balances from the statement totals', () => {
    const statement = buildStudentVoteheadStatement({
      selectedStudentId: 'S001',
      selectedSchoolPeriodId: 1,
      schoolPeriods,
      studentInvoices,
      studentInvoiceItems: [],
      studentPayments: [],
      invoicePaymentApplications: [],
      studentOpeningBalances: [
        {
          id: 'OB-002',
          student_id: 'S001',
          balance_type: FinOpeningBalanceTypeEnum.DEBIT,
          amount: 250,
          as_of_date: '2024-01-01',
          is_billed: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]
    });

    expect(statement.openingBalance).toBe(0);
    expect(statement.rows.some((row) => row.description === 'Opening Balance')).toBe(false);
    expect(statement.rows.at(-1)?.balance).toBe(600);
  });

  it('treats credit opening balances as statement credits', () => {
    const statement = buildStudentVoteheadStatement({
      selectedStudentId: 'S001',
      selectedSchoolPeriodId: 1,
      schoolPeriods,
      studentInvoices: [],
      studentInvoiceItems: [],
      studentPayments: [],
      invoicePaymentApplications: [],
      studentOpeningBalances: [
        {
          id: 'OB-003',
          student_id: 'S001',
          balance_type: FinOpeningBalanceTypeEnum.CREDIT,
          amount: 75,
          as_of_date: '2024-01-01',
          is_billed: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]
    });

    expect(statement.openingBalance).toBe(-75);
    expect(statement.rows[0]).toMatchObject({
      description: 'Opening Balance',
      debit: 0,
      credit: 75,
      balance: -75
    });
  });
});
