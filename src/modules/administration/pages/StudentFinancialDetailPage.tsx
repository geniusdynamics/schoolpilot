// ABOUTME: Student financial overview — loads one learner's invoices, payments and balance by route id.
// ABOUTME: Reads through useFinance() and resolves class/stream names from useAdministration() lookups.

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFinance } from '@/modules/finance/hooks';
import { useAdministration } from '../hooks/useAdministration';
import type { StudentDetailProfile } from '@/core/types';

import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Tabs from '@/components/ui/Tabs';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { UserCircleIcon, CurrencyDollarIcon, DownloadIcon, PrinterIcon, EyeIcon } from '@/components/ui/icons';
import { InvoiceStatus } from '@/core/types';

type StudentInvoiceChargeItem = StudentDetailProfile['invoices_charges'][number];
type StudentPaymentLogItem = StudentDetailProfile['payment_history'][number];

const StudentFinancialDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { getStudentFinancialDetailsById } = useFinance();
  const { classes, classStreams } = useAdministration();
  const [studentData, setStudentData] = useState<StudentDetailProfile | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!studentId) {
      setStudentData(null);
      setIsLoadingPage(false);
      return undefined;
    }
    setIsLoadingPage(true);
    getStudentFinancialDetailsById(studentId)
      .then((data) => { if (isMounted) setStudentData(data); })
      .catch(() => { if (isMounted) setStudentData(null); })
      .finally(() => { if (isMounted) setIsLoadingPage(false); });
    return () => { isMounted = false; };
  }, [studentId, getStudentFinancialDetailsById]);

  // Display names come from live collections; denormalised names are a fallback only.
  const classLabel = useMemo(() => {
    if (!studentData) return { className: null, streamName: null };
    const stream = (classStreams || []).find((s) => String(s.id) === String(studentData.current_class_stream_id));
    const klass = stream ? (classes || []).find((c) => String(c.id) === String(stream.class_id)) : undefined;
    return {
      className: klass?.name ?? stream?.class_name ?? studentData.current_class_name ?? null,
      streamName: stream?.name ?? studentData.current_class_stream_name ?? null,
    };
  }, [studentData, classes, classStreams]);

  if (isLoadingPage) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /> <span className="ml-2">Loading financial details...</span></div>;
  }

  if (!studentData) {
    return <Card title="Error"><p>Student financial data not found.</p></Card>;
  }

  const {
    photo_path, first_name, last_name, admission_no,
    financial_summary, invoices_charges, payment_history
  } = studentData;
  const { className: current_class_name, streamName: current_class_stream_name } = classLabel;

  const fullName = [first_name, last_name].filter(Boolean).join(' ');

  const invoiceColumns: DataGridColumn<StudentInvoiceChargeItem>[] = [
    { 
      key: 'invoiceId',
      header: 'Invoice ID', 
      sortable: true,
      filterable: true,
      width: 120,
      render: (_value, item) => item.invoiceId
    },
    { 
      key: 'feeTypeDescription',
      header: 'Description', 
      sortable: true,
      filterable: true,
      width: 200,
      render: (_value, item) => item.feeTypeDescription
    },
    { 
      key: 'dueDate',
      header: 'Due Date', 
      sortable: true,
      filterable: true,
      width: 120,
      render: (_value, item) => new Date(item.dueDate).toLocaleDateString()
    },
    { 
      key: 'amount',
      header: 'Amount (KES)', 
      sortable: true,
      filterable: true,
      width: 120,
      render: (_value, item) => item.amount.toFixed(2)
    },
    { 
      key: 'status',
      header: 'Status', 
      sortable: true,
      filterable: true,
      width: 120,
      render: (_value, item) => {
        let colorClass = '';
        if (item.status === InvoiceStatus.PAID) colorClass = 'bg-green-100 text-green-800';
        else if (item.status === InvoiceStatus.DUE) colorClass = 'bg-yellow-100 text-yellow-800';
        else if (item.status === InvoiceStatus.OVERDUE) colorClass = 'bg-red-100 text-red-800';
        else if (item.status === InvoiceStatus.PARTIALLY_PAID) colorClass = 'bg-primary-100 text-primary-800';
        else if (item.status === InvoiceStatus.VOIDED) colorClass = 'bg-surface-accent text-surface-foreground line-through';
        else colorClass = 'bg-surface-accent text-surface-foreground';
        return <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{item.status}</span>;
      }
    },
    { 
      key: 'actions',
      header: 'Action', 
      sortable: false,
      filterable: false,
      width: 100,
      sticky: 'right',
      render: () => <Button size="sm" variant="ghost" leftIcon={<EyeIcon className="w-4 h-4"/>}>View</Button>
    },
  ];

  const paymentLogColumns: DataGridColumn<StudentPaymentLogItem>[] = [
    { 
      key: 'transactionId',
      header: 'Transaction ID', 
      sortable: true,
      filterable: true,
      width: 150,
      render: (_value, item) => item.transactionId
    },
    { 
      key: 'paymentDate',
      header: 'Payment Date', 
      sortable: true,
      filterable: true,
      width: 120,
      render: (_value, item) => new Date(item.paymentDate).toLocaleDateString()
    },
    { 
      key: 'amount',
      header: 'Amount Paid (KES)', 
      sortable: true,
      filterable: true,
      width: 140,
      render: (_value, item) => item.amount.toFixed(2)
    },
    { 
      key: 'paymentMethod',
      header: 'Payment Method', 
      sortable: true,
      filterable: true,
      width: 120,
      render: (_value, item) => item.paymentMethod
    },
    { 
      key: 'description',
      header: 'Description/Notes', 
      sortable: true,
      filterable: true,
      width: 200,
      render: (_value, item) => item.description
    },
    { 
      key: 'actions',
      header: 'Action', 
      sortable: false,
      filterable: false,
      width: 100,
      sticky: 'right',
      render: () => <Button size="sm" variant="ghost" leftIcon={<PrinterIcon className="w-4 h-4"/>}>Receipt</Button>
    },
  ];

  const getBalanceColor = (balance: number = 0) => {
    if (balance > 0) return 'text-red-600'; // Due
    if (balance < 0) return 'text-primary-600'; // Overpaid / Credit
    return 'text-green-600'; // Paid up (zero balance)
  };

  const formatCurrency = (amount: number = 0) => `Ksh ${amount.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold text-surface-foreground">Student Financial Overview</h1>
            <p className="text-sm text-surface-muted-fg">
              <Link to="/dashboard" className="hover:underline">Dashboard</Link> &gt;
              <Link to="/administration/students" className="hover:underline"> Students</Link> &gt;
              <Link to={`/administration/students/${studentId}`} className="hover:underline"> {fullName}</Link> &gt; Financials
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="primary" leftIcon={<CurrencyDollarIcon className="w-5 h-5" />}>Collect Fee</Button>
            <Button variant="secondary" leftIcon={<DownloadIcon className="w-5 h-5" />}>Export Summary</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card title="Student Information">
              <div className="text-center">
                {photo_path ? (
                  <img src={photo_path} alt={fullName} className="w-24 h-24 rounded-full mx-auto mb-3 object-cover ring-2 ring-indigo-100" />
                ) : (
                  <UserCircleIcon className="w-24 h-24 text-gray-300 mx-auto mb-3" />
                )}
                <h2 className="text-lg font-semibold">{fullName}</h2>
                <p className="text-xs text-surface-muted-fg">ID: {admission_no} | Class: {current_class_name || 'N/A'} - {current_class_stream_name || 'N/A'}</p>
              </div>
            </Card>

            {financial_summary && (
              <Card title="Financial Summary">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-surface-muted-fg">Current Balance:</span>
                    <span className={`text-xl font-bold ${getBalanceColor(financial_summary.currentBalance)}`}>
                      {formatCurrency(financial_summary.currentBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-muted-fg">Total Fees Billed:</span>
                    <span className="text-surface-foreground font-medium">{formatCurrency(financial_summary.totalFees)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-muted-fg">Total Paid:</span>
                    <span className="text-surface-foreground font-medium">{formatCurrency(financial_summary.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-muted-fg">Total Discounts:</span>
                    <span className="text-surface-foreground font-medium">{formatCurrency(financial_summary.totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-muted-fg">Total Fines:</span>
                    <span className="text-surface-foreground font-medium">{formatCurrency(financial_summary.totalFine)}</span>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <Tabs
              tabs={[
                { label: 'Invoices & Charges', content: (
                  <Card title="All Invoices & Charges">
                    <DataGrid 
                      columns={invoiceColumns} 
                      data={invoices_charges || []} 
                      loading={false}
                      sortable={true}
                      filterable={true}
                      emptyState={
                        <div className="text-center py-8">
                          <CurrencyDollarIcon className="w-12 h-12 text-surface-muted-fg mx-auto mb-4" />
                          <p className="text-surface-muted-fg">No invoices or charges found.</p>
                        </div>
                      }
                    />
                  </Card>
                )},
                { label: 'Payment History', content: (
                  <Card title="All Received Payments">
                    <DataGrid 
                      columns={paymentLogColumns} 
                      data={payment_history || []} 
                      loading={false}
                      sortable={true}
                      filterable={true}
                      emptyState={
                        <div className="text-center py-8">
                          <CurrencyDollarIcon className="w-12 h-12 text-surface-muted-fg mx-auto mb-4" />
                          <p className="text-surface-muted-fg">No payment history found.</p>
                        </div>
                      }
                    />
                  </Card>
                )},
              ]}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentFinancialDetailPage;