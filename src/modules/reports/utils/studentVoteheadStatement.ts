// ABOUTME: Builds student votehead statement rows from invoices, payments, and opening balances.
// ABOUTME: Keeps statement math pure so payment allocation and opening-balance rules are testable.

import {
  FinOpeningBalanceTypeEnum,
  InvoicePaymentApplication,
  InvoiceStatus,
  StudentInvoice,
  StudentInvoiceItem,
  StudentPayment,
  StudentOpeningBalance as FinStudentOpeningBalanceType,
} from '@/modules/finance/data/types';
import type { SchoolPeriod } from '@/core/types';

export interface StatementRow {
  date: string;
  description: string;
  invoiceNo?: string;
  paymentRef?: string;
  debit: number;
  credit: number;
  balance: number;
}

interface StatementEntry extends Omit<StatementRow, 'balance'> {
  sortPriority: number;
}

interface BuildStudentVoteheadStatementOptions {
  selectedStudentId: string;
  selectedSchoolPeriodId: number;
  schoolPeriods: SchoolPeriod[];
  studentInvoices: StudentInvoice[];
  studentInvoiceItems: StudentInvoiceItem[];
  studentPayments: StudentPayment[];
  invoicePaymentApplications: InvoicePaymentApplication[];
  studentOpeningBalances: FinStudentOpeningBalanceType[];
}

interface StudentVoteheadStatementResult {
  openingBalance: number;
  rows: StatementRow[];
}

const getPeriodStartDate = (schoolPeriods: SchoolPeriod[], schoolPeriodId: number) => {
  return schoolPeriods.find((period) => period.id === schoolPeriodId)?.start_date;
};

const getSignedOpeningBalance = (openingBalance?: FinStudentOpeningBalanceType) => {
  if (!openingBalance || openingBalance.is_billed) {
    return 0;
  }

  return openingBalance.balance_type === FinOpeningBalanceTypeEnum.CREDIT
    ? -Math.abs(openingBalance.amount)
    : Math.abs(openingBalance.amount);
};

const getLatestOpeningBalance = (
  studentOpeningBalances: FinStudentOpeningBalanceType[],
  studentId: string,
  periodStartDate?: string
) => {
  const studentBalances = studentOpeningBalances.filter((balance) => balance.student_id === studentId);
  const scopedBalances = periodStartDate
    ? studentBalances.filter((balance) => new Date(balance.as_of_date) <= new Date(periodStartDate))
    : studentBalances;
  const balancesToSort = scopedBalances.length > 0 ? scopedBalances : studentBalances;

  return [...balancesToSort].sort(
    (left, right) => new Date(right.as_of_date).getTime() - new Date(left.as_of_date).getTime()
  )[0];
};

const buildInvoiceItemMap = (studentInvoices: StudentInvoice[], studentInvoiceItems: StudentInvoiceItem[]) => {
  const invoiceItemMap = new Map<string, { invoiceId: string }>();

  studentInvoices.forEach((invoice) => {
    (invoice.items || []).forEach((item) => invoiceItemMap.set(item.id, { invoiceId: invoice.id }));
  });

  studentInvoiceItems.forEach((item) => {
    invoiceItemMap.set(item.id, { invoiceId: item.invoice_id });
  });

  return invoiceItemMap;
};

const getAllocatedPaymentForPeriod = (
  paymentId: string,
  schoolPeriodId: number,
  invoicePaymentApplications: InvoicePaymentApplication[],
  invoiceItemMap: Map<string, { invoiceId: string }>,
  invoicePeriodMap: Map<string, number>
) => {
  return invoicePaymentApplications
    .filter((application) => application.payment_id === paymentId)
    .reduce((total, application) => {
      const invoiceItem = invoiceItemMap.get(application.invoice_item_id);
      const invoicePeriodId = invoiceItem ? invoicePeriodMap.get(invoiceItem.invoiceId) : undefined;

      return invoicePeriodId === schoolPeriodId ? total + application.amount_applied : total;
    }, 0);
};

const toStatementRows = (entries: StatementEntry[]) => {
  let runningBalance = 0;

  return [...entries]
    .sort((left, right) => {
      const dateDifference = new Date(left.date).getTime() - new Date(right.date).getTime();
      return dateDifference !== 0 ? dateDifference : left.sortPriority - right.sortPriority;
    })
    .map(({ sortPriority: _sortPriority, ...entry }) => {
      runningBalance += entry.debit - entry.credit;
      return { ...entry, balance: runningBalance };
    });
};

export const buildStudentVoteheadStatement = ({
  selectedStudentId,
  selectedSchoolPeriodId,
  schoolPeriods,
  studentInvoices,
  studentInvoiceItems,
  studentPayments,
  invoicePaymentApplications,
  studentOpeningBalances
}: BuildStudentVoteheadStatementOptions): StudentVoteheadStatementResult => {
  const periodStartDate = getPeriodStartDate(schoolPeriods, selectedSchoolPeriodId) || new Date().toISOString();
  const openingBalanceRecord = getLatestOpeningBalance(
    studentOpeningBalances,
    selectedStudentId,
    periodStartDate
  );
  const openingBalance = getSignedOpeningBalance(openingBalanceRecord);
  const entries: StatementEntry[] = [];
  const invoiceItemMap = buildInvoiceItemMap(studentInvoices, studentInvoiceItems);
  const invoicePeriodMap = new Map(studentInvoices.map((invoice) => [invoice.id, invoice.school_period_id]));

  if (openingBalance !== 0) {
    entries.push({
      date: periodStartDate,
      description: 'Opening Balance',
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      sortPriority: 0
    });
  }

  studentInvoices
    .filter((invoice) =>
      invoice.student_id === selectedStudentId &&
      invoice.school_period_id === selectedSchoolPeriodId &&
      invoice.status !== InvoiceStatus.VOIDED
    )
    .forEach((invoice) => {
      (invoice.items || []).forEach((item) => {
        entries.push({
          date: invoice.issue_date,
          description: item.description,
          invoiceNo: invoice.invoice_number,
          debit: item.amount,
          credit: 0,
          sortPriority: 1
        });
      });
    });

  studentPayments
    .filter((payment) => payment.student_id === selectedStudentId)
    .forEach((payment) => {
      const allocatedAmount = getAllocatedPaymentForPeriod(
        payment.id,
        selectedSchoolPeriodId,
        invoicePaymentApplications,
        invoiceItemMap,
        invoicePeriodMap
      );

      if (allocatedAmount <= 0) {
        return;
      }

      entries.push({
        date: payment.transaction_date,
        description: `Payment Received (${payment.payment_method || 'N/A'})`,
        paymentRef: payment.receipt_no,
        debit: 0,
        credit: allocatedAmount,
        sortPriority: 2
      });
    });

  return {
    openingBalance,
    rows: toStatementRows(entries)
  };
};
