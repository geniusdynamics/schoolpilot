// ABOUTME: Payment Allocation Page - UI for applying payments to invoices
// ABOUTME: Uses usePaymentAllocation hook to allocate payments to outstanding invoices

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { CreditCardIcon, ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon, BanknotesIcon } from '@/components/ui/icons';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';

import { useAppData } from '@/hooks/useAppData';
import { usePaymentAllocation } from '../hooks/useFinanceServices';
import type { StudentPayment } from '../data/types';
import type { PaymentAllocationResult } from '../services/PaymentAllocationService';

// Currency formatter for KES
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES' }).format(value);

interface OutstandingInvoiceItem {
  invoiceItemId: string;
  invoiceId: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  amountPaid: number;
  balance: number;
}

interface StudentWithPayments {
  student: {
    id: string;
    admission_no: string;
    first_name: string;
    last_name: string;
  };
  payments: StudentPayment[];
}

export const PaymentAllocationPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { applyPriority, applyWeighted, isAllocating, error: serviceError } = usePaymentAllocation();
  const { students, studentInvoices, studentPayments, invoicePaymentApplications, studentInvoiceItems, loading: appLoading } = useAppData();

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [allocationStrategy, setAllocationStrategy] = useState<'priority' | 'weighted'>('priority');
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // Results state
  const [result, setResult] = useState<PaymentAllocationResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const allocationSucceeded = result !== null && result.errors.length === 0;

  // Get students with payments
  const studentsWithPayments = useMemo((): StudentWithPayments[] => {
    const studentMap = new Map<string, StudentWithPayments>();

    (studentPayments || []).forEach((payment) => {
      const studentId = payment.student_id;
      if (!studentMap.has(studentId)) {
        const student = (students || []).find((s) => s.id === studentId);
        if (student) {
          studentMap.set(studentId, {
            student: {
              id: student.id,
              admission_no: student.admission_no || '',
              first_name: student.first_name || '',
              last_name: student.last_name || '',
            },
            payments: [],
          });
        }
      }
      if (studentMap.has(studentId)) {
        studentMap.get(studentId)!.payments.push(payment);
      }
    });

    return Array.from(studentMap.values()).sort((a, b) =>
      ([a.student.first_name, a.student.last_name].filter(Boolean).join(' ')).localeCompare(
        [b.student.first_name, b.student.last_name].filter(Boolean).join(' ')
      )
    );
  }, [students, studentPayments]);

  // Get outstanding invoices for selected student
  const outstandingItems = useMemo((): OutstandingInvoiceItem[] => {
    if (!selectedStudentId) return [];

    const studentInvoicesFiltered = (studentInvoices || []).filter(
      (inv) => inv.student_id === selectedStudentId && inv.status !== 'Paid' && !inv.deleted_at
    );

    const items: OutstandingInvoiceItem[] = [];

    studentInvoicesFiltered.forEach((invoice) => {
      const invoiceItems = (studentInvoiceItems || []).filter(
        (item) => item.invoice_id === invoice.id
      );

      invoiceItems.forEach((item) => {
        const applications = (invoicePaymentApplications || []).filter(
          (app) => app.invoice_item_id === item.id
        );
        const amountPaid = applications.reduce((sum, app) => sum + (app.amount_applied || 0), 0);
        const balance = (item.amount || 0) - amountPaid;

        if (balance > 0) {
          items.push({
            invoiceItemId: item.id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number || '',
            description: item.description || '',
            amount: item.amount || 0,
            amountPaid,
            balance,
          });
        }
      });
    });

    // Sort by invoice number then item
    return items.sort((a, b) => {
      const invCompare = a.invoiceNumber.localeCompare(b.invoiceNumber);
      if (invCompare !== 0) return invCompare;
      return a.invoiceItemId.localeCompare(b.invoiceItemId);
    });
  }, [selectedStudentId, studentInvoices, studentInvoiceItems, invoicePaymentApplications]);

  // Calculate total outstanding
  const totalOutstanding = useMemo(() => {
    return outstandingItems.reduce((sum, item) => sum + item.balance, 0);
  }, [outstandingItems]);

  // Calculate payment allocation preview
  const allocationPreview = useMemo(() => {
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0 || outstandingItems.length === 0) return [];

    const preview: { item: OutstandingInvoiceItem; allocated: number }[] = [];
    let remaining = amount;

    for (const item of outstandingItems) {
      const allocated = Math.min(remaining, item.balance);
      preview.push({ item, allocated });
      remaining -= allocated;
      if (remaining <= 0) break;
    }

    return preview;
  }, [paymentAmount, outstandingItems]);

  // Handle allocation
  const handleAllocate = useCallback(async () => {
    if (!selectedStudentId || !paymentAmount) {
      setLocalError(t('paymentAllocation.fillAllFields') || 'Please fill all required fields');
      return;
    }

    setLocalError(null);
    setResult(null);

    // Find a payment for this student to allocate
    const studentPaymentsData = (studentPayments || []).filter(
      (p) => p.student_id === selectedStudentId
    );

    if (studentPaymentsData.length === 0) {
      setLocalError(t('paymentAllocation.noPayments') || 'No payments found for this student');
      return;
    }

    // Use the most recent unallocated payment
    const payment = studentPaymentsData[0];

    try {
      let allocationResult: PaymentAllocationResult | null;

      if (allocationStrategy === 'priority') {
        allocationResult = await applyPriority(payment.id);
      } else {
        allocationResult = await applyWeighted(payment.id);
      }

      if (allocationResult) {
        setResult(allocationResult);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  }, [selectedStudentId, paymentAmount, allocationStrategy, studentPayments, applyPriority, applyWeighted, t]);

  // Reset form
  const handleReset = useCallback(() => {
    setResult(null);
    setLocalError(null);
    setSelectedStudentId('');
    setPaymentAmount('');
  }, []);

  // DataGrid columns for preview
  const previewColumns: DataGridColumn<OutstandingInvoiceItem>[] = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        header: t('tableHeaders.invoiceNo') || 'Invoice No',
        width: 120,
        sortable: true,
      },
      {
        key: 'description',
        header: t('tableHeaders.votehead') || 'Votehead',
        width: 180,
        sortable: true,
        render: (value) => <span className="font-medium">{value}</span>,
      },
      {
        key: 'amount',
        header: t('tableHeaders.amount') || 'Amount',
        width: 120,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-primary-600">{formatCurrency(value as number)}</span>
        ),
      },
      {
        key: 'amountPaid',
        header: t('tableHeaders.amountPaid') || 'Paid',
        width: 120,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-green-600">{formatCurrency(value as number)}</span>
        ),
      },
      {
        key: 'balance',
        header: t('tableHeaders.balance') || 'Balance',
        width: 120,
        sortable: true,
        render: (value) => (
          <span className={`font-mono ${(value as number) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(value as number)}
          </span>
        ),
      },
    ],
    [t]
  );

  const isLoading = appLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
        <span className="ml-2">{t('common.loading') || 'Loading...'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('paymentAllocation.title') || 'Payment Allocation'}>
        {/* Configuration */}
        <div className="p-4 border-b mb-4 bg-surface-muted rounded-md">
          <p className="text-sm text-surface-muted-fg mb-4">
            {t('paymentAllocation.description') || 
              'Allocate payments to outstanding invoices for a student. Select a student and payment amount to see how it will be distributed.'}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label={t('paymentAllocation.student') || 'Student'}
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setResult(null);
              }}
              required
            >
              <option value="">{t('paymentAllocation.selectStudent') || 'Select Student'}</option>
              {studentsWithPayments.map((swp) => (
                <option key={swp.student.id} value={swp.student.id}>
                  {swp.student.admission_no} - {swp.student.first_name} {swp.student.last_name}
                </option>
              ))}
            </Select>

            <Input
              label={t('paymentAllocation.paymentAmount') || 'Payment Amount'}
              type="number"
              value={paymentAmount}
              onChange={(e) => {
                setPaymentAmount(e.target.value);
                setResult(null);
              }}
              placeholder="0.00"
              min="0"
              step="0.01"
            />

            <Select
              label={t('paymentAllocation.strategy') || 'Allocation Strategy'}
              value={allocationStrategy}
              onChange={(e) => {
                setAllocationStrategy(e.target.value as 'priority' | 'weighted');
                setResult(null);
              }}
            >
              <option value="priority">
                {t('paymentAllocation.priority') || 'Priority (FIFO)'}
              </option>
              <option value="weighted">
                {t('paymentAllocation.weighted') || 'Weighted'}
              </option>
            </Select>
          </div>

          {/* Student Summary */}
          {selectedStudentId && outstandingItems.length > 0 && (
            <div className="mt-4 p-3 bg-primary-50 rounded-md">
              <div className="text-sm font-medium text-primary-800">
                {t('paymentAllocation.outstandingSummary') || 'Outstanding Summary'}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="text-surface-muted-fg">{t('paymentAllocation.invoices') || 'Invoices'}: </span>
                  <span className="font-medium">{new Set(outstandingItems.map(i => i.invoiceId)).size}</span>
                </div>
                <div>
                  <span className="text-surface-muted-fg">{t('paymentAllocation.items') || 'Items'}: </span>
                  <span className="font-medium">{outstandingItems.length}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-surface-muted-fg">{t('paymentAllocation.totalOutstanding') || 'Total Outstanding'}: </span>
                  <span className="font-medium text-red-600">{formatCurrency(totalOutstanding)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {(localError || serviceError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-800">
              <ExclamationCircleIcon className="w-5 h-5" />
              <span>{localError || serviceError?.message}</span>
            </div>
          </div>
        )}

        {/* Allocation Preview */}
        {selectedStudentId && paymentAmount && parseFloat(paymentAmount) > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-surface-foreground mb-2">
              {t('paymentAllocation.preview') || 'Allocation Preview'}
            </h3>
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-surface-muted">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-surface-muted-fg uppercase">
                      Invoice
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-surface-muted-fg uppercase">
                      Votehead
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-surface-muted-fg uppercase">
                      Balance
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-surface-muted-fg uppercase">
                      Allocated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface-card divide-y divide-surface-border">
                  {allocationPreview.map((preview, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm">{preview.item.invoiceNumber}</td>
                      <td className="px-4 py-2 text-sm">{preview.item.description}</td>
                      <td className="px-4 py-2 text-sm text-right font-mono">
                        {formatCurrency(preview.item.balance)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-green-600">
                        {formatCurrency(preview.allocated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {allocationPreview.length > 0 && (
                  <tfoot className="bg-surface-muted">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-sm font-medium text-right">
                        Remaining:
                      </td>
                      <td className="px-4 py-2 text-sm font-mono text-red-600 text-right">
                        {formatCurrency(
                          parseFloat(paymentAmount) - allocationPreview.reduce((sum, p) => sum + p.allocated, 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Outstanding Invoices Table */}
        {selectedStudentId && outstandingItems.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-surface-foreground mb-2">
              {t('paymentAllocation.outstandingInvoices') || 'Outstanding Invoices'}
            </h3>
            <DataGrid
              columns={previewColumns}
              data={outstandingItems}
              keyField="invoiceItemId"
              sortable
              filterable
              pagination
              emptyState={{
                icon: <CreditCardIcon className="w-12 h-12 text-surface-muted-fg" />,
                title: t('paymentAllocation.noOutstanding') || 'No Outstanding Invoices',
                description: 'All invoices are paid for this student.',
              }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleAllocate}
            disabled={isAllocating || !selectedStudentId || !paymentAmount || parseFloat(paymentAmount) <= 0}
            leftIcon={isAllocating ? <Spinner size="sm" /> : <BanknotesIcon className="w-5 h-5" />}
          >
            {isAllocating
              ? t('paymentAllocation.allocating') || 'Allocating...'
              : t('paymentAllocation.apply') || 'Apply Payment'}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className={`mt-4 p-4 rounded-md ${
            allocationSucceeded ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {allocationSucceeded ? (
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              ) : (
                <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
              )}
              <span className={`text-lg font-medium ${
                allocationSucceeded ? 'text-green-800' : 'text-red-800'
              }`}>
                {allocationSucceeded
                  ? t('paymentAllocation.success') || 'Payment Allocated Successfully'
                  : t('paymentAllocation.partialSuccess') || 'Partial Allocation'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <div className="text-sm text-surface-muted-fg">
                  {t('paymentAllocation.invoicesPaid') || 'Invoices Paid'}
                </div>
                <div className="text-xl font-bold text-green-600">{result.updatedInvoiceIds.length}</div>
              </div>
              <div>
                <div className="text-sm text-surface-muted-fg">
                  {t('paymentAllocation.amountApplied') || 'Amount Applied'}
                </div>
                <div className="text-xl font-bold text-primary-600">{formatCurrency(result.totalAllocated)}</div>
              </div>
              <div>
                <div className="text-sm text-surface-muted-fg">
                  {t('paymentAllocation.remainingBalance') || 'Remaining Balance'}
                </div>
                <div className="text-xl font-bold text-red-600">{formatCurrency(result.remainingAmount)}</div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReset}
                leftIcon={<ArrowPathIcon className="w-4 h-4" />}
              >
                {t('paymentAllocation.allocateMore') || 'Allocate More'}
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !isAllocating && !selectedStudentId && (
          <div className="text-center py-12 text-surface-muted-fg">
            <CreditCardIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p>{t('paymentAllocation.selectStudentMessage') || 'Select a student to view and allocate payments to their outstanding invoices'}</p>
          </div>
        )}
      </Card>
    </div>
  );
};

const PaymentAllocationPage: React.FC = () => (
  <div className="space-y-6">
    <PaymentAllocationPageContent />
  </div>
);

export default PaymentAllocationPage;
