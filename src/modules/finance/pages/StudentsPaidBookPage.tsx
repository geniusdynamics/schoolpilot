import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { BookOpenIcon, CalendarIcon, CurrencyDollarIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { StudentPaymentRecord } from '../data/types';

export const StudentsPaidBookPageContent: React.FC = () => {

  const { studentPaymentRecords, loading } = useAppData() as any;

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const allPaymentRecords: StudentPaymentRecord[] = useMemo(() => {
    return studentPaymentRecords || [];
  }, [studentPaymentRecords]);

  const filteredPaymentRecords: StudentPaymentRecord[] = useMemo(() => {
    let filtered = allPaymentRecords;

    if (searchTerm) {
      filtered = filtered.filter(record =>
        (record.student_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (record.admission_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (record.receipt_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (record.reference_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    if (classFilter) {
      filtered = filtered.filter(record => record.class_name === classFilter);
    }

    return filtered;
  }, [allPaymentRecords, searchTerm, classFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredPaymentRecords.reduce((acc, record) => ({
      total: acc.total + (record.amount_paid ?? 0),
      count: acc.count + 1
    }), { total: 0, count: 0 });
  }, [filteredPaymentRecords]);

  const columns: DataGridColumn<StudentPaymentRecord>[] = [
    {
      key: 'transaction_date',
      header: 'Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'receipt_no',
      header: 'Receipt No',
      sortable: true,
      filterable: true
    },
    {
      key: 'student_name',
      header: 'Student Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'admission_no',
      header: 'Admission No',
      sortable: true,
      filterable: true
    },
    {
      key: 'class_name',
      header: 'Class',
      sortable: true,
      filterable: true
    },
    {
      key: 'fee_type',
      header: 'Fee Type',
      sortable: true,
      filterable: true
    },
    {
      key: 'amount_paid',
      header: 'Amount Paid',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-green-600">KES {value?.toLocaleString?.() ?? '-'}</span>
      )
    },
    {
      key: 'payment_method',
      header: 'Payment Method',
      sortable: true,
      filterable: true
    },
    {
      key: 'reference_no',
      header: 'Reference',
      sortable: true,
      filterable: true
    }
  ];

  const uniqueClasses = useMemo(() => {
    const classes = [...new Set(filteredPaymentRecords.map(r => r.class_name))];
    return classes.sort();
  }, [filteredPaymentRecords]);

  if (loading?.all && filteredPaymentRecords.length === 0 && !studentPaymentRecords) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading student payment records...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <BookOpenIcon className="w-6 h-6 text-blue-600" />
            <span>Students Paid Book</span>
          </div>
        }
      >
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <BookOpenIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Student Payment Ledger</h3>
              <p className="text-sm text-blue-700 mt-1">
                The Students Paid Book provides a comprehensive ledger view of all student payments by date range. 
                Track payment history, analyze payment patterns, and generate payment reports for reconciliation.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Filter</label>
            <Select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              options={[
                { value: '', label: 'All Classes' },
                ...uniqueClasses.map(c => ({ value: c, label: c }))
              ]}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              type="text"
              placeholder="Student name, admission no, receipt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Collected</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              KES {totals.total?.toLocaleString?.() ?? '0'}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Payment Records</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {totals.count}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <BookOpenIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Average Payment</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              KES {totals.count > 0 ? Math.round(totals.total / totals.count)?.toLocaleString?.() ?? '0' : 0}
            </p>
          </div>
        </div>

        <DataGrid
          data={filteredPaymentRecords}
          columns={columns}
          pageSize={50}
          searchable={false}
          exportable={true}
        />
      </Card>
    </div>
  );
};
const StudentsPaidBookPage: React.FC = () => (
  <div className="space-y-6">
    <StudentsPaidBookPageContent />
  </div>
);

export default StudentsPaidBookPage;
