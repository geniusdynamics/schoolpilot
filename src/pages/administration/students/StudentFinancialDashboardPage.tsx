
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
// import { useMockData } from '../../hooks/useMockData'; // Switch
import { useAppData } from '@/contexts/AppDataContext'; // Use
import { StudentDetailProfile, StudentFinancialSummary, StudentInvoiceChargeItem, StudentPaymentLogItem, FinInvoiceStatusEnum } from '../../../types';
import Card from '../../../components/ui/Card';
import Spinner from '../../../components/ui/Spinner';
import Tabs from '../../../components/ui/Tabs';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import { UserCircleIcon, CurrencyDollarIcon, DownloadIcon, PrinterIcon, EyeIcon } from '../../../components/ui/icons';

const StudentFinancialDashboardPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { getStudentFinancialDetailsById, loading } = useAppData(); // Use useAppData
  const [studentData, setStudentData] = useState<StudentDetailProfile | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true); // Renamed for clarity

  useEffect(() => {
    if (studentId) {
      setIsLoadingPage(true);
      getStudentFinancialDetailsById(studentId)
        .then(data => {
          setStudentData(data);
          setIsLoadingPage(false);
        })
        .catch(() => {
          setStudentData(null);
          setIsLoadingPage(false);
        });
    }
  }, [studentId, getStudentFinancialDetailsById]);

  if (isLoadingPage) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /> <span className='ml-2'>Loading financial details...</span></div>;
  }

  if (!studentData) {
    return <Card title="Error"><p>Student financial data not found.</p></Card>;
  }

  const {
    photo_path, first_name, last_name, admission_no, current_class_name, current_class_stream_name,
    financial_summary, invoices_charges, payment_history 
  } = studentData;
  
  const fullName = `${first_name} ${last_name}`;

  const invoiceColumns = [
    { header: 'Invoice ID', accessor: 'invoiceId' as keyof StudentInvoiceChargeItem },
    { header: 'Description', accessor: 'feeTypeDescription' as keyof StudentInvoiceChargeItem },
    { header: 'Due Date', accessor: 'dueDate' as keyof StudentInvoiceChargeItem, render: (item: StudentInvoiceChargeItem) => new Date(item.dueDate).toLocaleDateString() },
    { header: 'Amount (KES)', accessor: 'amount' as keyof StudentInvoiceChargeItem, render: (item: StudentInvoiceChargeItem) => item.amount.toFixed(2) },
    { header: 'Status', accessor: 'status' as keyof StudentInvoiceChargeItem, 
      render: (item: StudentInvoiceChargeItem) => {
        let colorClass = '';
        if (item.status === FinInvoiceStatusEnum.PAID) colorClass = 'bg-green-100 text-green-800';
        else if (item.status === FinInvoiceStatusEnum.DUE) colorClass = 'bg-yellow-100 text-yellow-800';
        else if (item.status === FinInvoiceStatusEnum.OVERDUE) colorClass = 'bg-red-100 text-red-800';
        else if (item.status === FinInvoiceStatusEnum.PARTIALLY_PAID) colorClass = 'bg-blue-100 text-blue-800';
        else if (item.status === FinInvoiceStatusEnum.VOIDED) colorClass = 'bg-gray-100 text-gray-800 line-through';
        else colorClass = 'bg-gray-100 text-gray-800';
        return <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{item.status}</span>;
      }
    },
    { header: 'Action', accessor: 'id' as keyof StudentInvoiceChargeItem, render: (item: StudentInvoiceChargeItem) => <Button size="sm" variant="ghost" leftIcon={<EyeIcon className="w-4 h-4"/>}>View</Button> },
  ];

  const paymentLogColumns = [
    { header: 'Transaction ID', accessor: 'transactionId' as keyof StudentPaymentLogItem },
    { header: 'Payment Date', accessor: 'paymentDate' as keyof StudentPaymentLogItem, render: (item: StudentPaymentLogItem) => new Date(item.paymentDate).toLocaleDateString() },
    { header: 'Amount Paid (KES)', accessor: 'amount' as keyof StudentPaymentLogItem, render: (item: StudentPaymentLogItem) => item.amount.toFixed(2) },
    { header: 'Payment Method', accessor: 'paymentMethod' as keyof StudentPaymentLogItem },
    { header: 'Description/Notes', accessor: 'description' as keyof StudentPaymentLogItem },
    { header: 'Action', accessor: 'id' as keyof StudentPaymentLogItem, render: (item: StudentPaymentLogItem) => <Button size="sm" variant="ghost" leftIcon={<PrinterIcon className="w-4 h-4"/>}>Receipt</Button> },
  ];

  const getBalanceColor = (balance: number = 0) => {
    if (balance > 0) return 'text-red-600'; // Due
    if (balance < 0) return 'text-blue-600'; // Overpaid / Credit
    return 'text-green-600'; // Paid up (zero balance)
  };
  
  const formatCurrency = (amount: number = 0) => `Ksh ${amount.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Student Financial Overview</h1>
            <p className="text-sm text-gray-500">
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
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <Card title="Student Information">
              <div className="text-center">
                {photo_path ? (
                  <img src={photo_path} alt={fullName} className="w-24 h-24 rounded-full mx-auto mb-3 object-cover ring-2 ring-indigo-100" />
                ) : (
                  <UserCircleIcon className="w-24 h-24 text-gray-300 mx-auto mb-3" />
                )}
                <h2 className="text-lg font-semibold">{fullName}</h2>
                <p className="text-xs text-gray-500">ID: {admission_no} | Class: {current_class_name || 'N/A'} - {current_class_stream_name || 'N/A'}</p>
              </div>
            </Card>

            {financial_summary && (
              <Card title="Financial Summary">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600">Current Balance:</span>
                    <span className={`text-xl font-bold ${getBalanceColor(financial_summary.currentBalance)}`}>
                      {formatCurrency(financial_summary.currentBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Fees Billed:</span>
                    <span className="text-gray-700 font-medium">{formatCurrency(financial_summary.totalFees)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Paid:</span>
                    <span className="text-gray-700 font-medium">{formatCurrency(financial_summary.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Discounts:</span>
                    <span className="text-gray-700 font-medium">{formatCurrency(financial_summary.totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Fines:</span>
                    <span className="text-gray-700 font-medium">{formatCurrency(financial_summary.totalFine)}</span>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2">
            <Tabs
              tabs={[
                { label: 'Invoices & Charges', content: (
                  <Card title="All Invoices & Charges">
                    <Table columns={invoiceColumns} data={invoices_charges || []} emptyStateMessage="No invoices or charges found." />
                  </Card>
                )},
                { label: 'Payment History', content: (
                  <Card title="All Received Payments">
                    <Table columns={paymentLogColumns} data={payment_history || []} emptyStateMessage="No payment history found."/>
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

export default StudentFinancialDashboardPage;
