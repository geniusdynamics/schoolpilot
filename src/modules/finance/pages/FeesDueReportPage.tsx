import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { ExclamationTriangleIcon, CalendarIcon, UserGroupIcon, CurrencyDollarIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { initialMockFeeDueRecords } from '../data/mockData';
import type { FeeDueRecord } from '../data/types';

const FeesDueReportPage: React.FC = () => {
  const { t } = useTranslation('finance');
  const { students, schoolPeriods, loading } = useAppData();

  const [classFilter, setClassFilter] = useState('');
  const [agingFilter, setAgingFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolPeriodFilter, setSchoolPeriodFilter] = useState('');

  // Use centralized mock data (in production, this would come from useAppData)
  const mockDueRecords: FeeDueRecord[] = useMemo(() => {
    let filtered = initialMockFeeDueRecords;

    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.admission_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.guardian_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (classFilter) {
      filtered = filtered.filter(record => record.class_name === classFilter);
    }

    if (agingFilter) {
      filtered = filtered.filter(record => record.aging_category === agingFilter);
    }

    return filtered;
  }, [searchTerm, classFilter, agingFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return mockDueRecords.reduce((acc, record) => ({
      totalDue: acc.totalDue + record.total_amount_due,
      totalPaid: acc.totalPaid + record.amount_paid,
      totalBalance: acc.totalBalance + record.balance_due,
      overdueCount: acc.overdueCount + (record.days_overdue > 0 ? 1 : 0)
    }), { totalDue: 0, totalPaid: 0, totalBalance: 0, overdueCount: 0 });
  }, [mockDueRecords]);

  const getAgingBadge = (category: string) => {
    const styles = {
      'Current': 'bg-green-100 text-green-800',
      '1-30 Days': 'bg-yellow-100 text-yellow-800',
      '31-60 Days': 'bg-orange-100 text-orange-800',
      '61-90 Days': 'bg-red-100 text-red-800',
      '90+ Days': 'bg-red-200 text-red-900'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[category as keyof typeof styles]}`}>
        {category}
      </span>
    );
  };

  const columns: DataGridColumn<FeeDueRecord>[] = [
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
      key: 'guardian_name',
      header: 'Guardian',
      sortable: true,
      filterable: true
    },
    {
      key: 'guardian_phone',
      header: 'Phone',
      sortable: false,
      filterable: true
    },
    {
      key: 'total_amount_due',
      header: 'Total Due',
      sortable: true,
      render: (value) => `KES ${value.toLocaleString()}`
    },
    {
      key: 'amount_paid',
      header: 'Paid',
      sortable: true,
      render: (value) => value > 0 ? `KES ${value.toLocaleString()}` : '-'
    },
    {
      key: 'balance_due',
      header: 'Balance',
      sortable: true,
      render: (value) => (
        <span className={`font-semibold ${value > 0 ? 'text-red-600' : 'text-green-600'}`}>
          KES {value.toLocaleString()}
        </span>
      )
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'days_overdue',
      header: 'Days Overdue',
      sortable: true,
      render: (value) => (
        <span className={value > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
          {value > 0 ? `${value} days` : 'Current'}
        </span>
      )
    },
    {
      key: 'aging_category',
      header: 'Aging',
      sortable: true,
      filterable: true,
      render: (value) => getAgingBadge(value)
    }
  ];

  const uniqueClasses = useMemo(() => {
    const classes = [...new Set(mockDueRecords.map(r => r.class_name))];
    return classes.sort();
  }, [mockDueRecords]);

  const agingCategories = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'];

  if (loading && mockDueRecords.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading fees due report...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            <span>Fees Due Report</span>
          </div>
        }
      >
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Outstanding Fees with Aging</h3>
              <p className="text-sm text-red-700 mt-1">
                This report shows all outstanding fees by class and student with aging analysis. 
                Track overdue payments, follow up with guardians, and manage fee collection effectively.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Aging Filter</label>
            <Select
              value={agingFilter}
              onChange={(e) => setAgingFilter(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...agingCategories.map(c => ({ value: c, label: c }))
              ]}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              type="text"
              placeholder="Student, admission no, guardian..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Due</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              KES {totals.totalDue.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              KES {totals.totalPaid.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Outstanding Balance</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              KES {totals.totalBalance.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <UserGroupIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Overdue Accounts</span>
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-2">
              {totals.overdueCount}
            </p>
          </div>
        </div>

        <DataGrid
          data={mockDueRecords}
          columns={columns}
          pageSize={50}
          searchable={false}
          exportable={true}
        />
      </Card>
    </div>
  );
};

export default FeesDueReportPage;
