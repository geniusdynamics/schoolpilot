import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { DocumentTextIcon, CalendarIcon, UserIcon, ChartBarIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { initialMockAttendanceReports } from '../data/mockData';
import type { AttendanceReport } from '../data/types';

export const AttendanceReportsContent: React.FC = () => {
  const { t } = useTranslation('administration');
  const { students, classes, loading } = useAppData();

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Use centralized mock data (in production, this would come from useAppData)
  const mockReports: AttendanceReport[] = useMemo(() => {
    let filtered = initialMockAttendanceReports;

    if (selectedClass) {
      filtered = filtered.filter(r => r.class_id === selectedClass);
    }

    if (searchTerm) {
      filtered = filtered.filter(r => 
        (r.student_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (r.admission_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [selectedClass, searchTerm]);

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const columns: DataGridColumn<AttendanceReport>[] = [
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
      key: 'month',
      header: 'Month',
      sortable: true,
      render: (value) => {
        const date = new Date(value + '-01');
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
    },
    {
      key: 'total_days',
      header: 'Total Days',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'present_days',
      header: 'Present',
      sortable: true,
      render: (value) => <span className="text-green-600 font-semibold">{value}</span>
    },
    {
      key: 'absent_days',
      header: 'Absent',
      sortable: true,
      render: (value) => <span className="text-red-600 font-semibold">{value}</span>
    },
    {
      key: 'late_days',
      header: 'Late',
      sortable: true,
      render: (value) => <span className="text-yellow-600 font-semibold">{value}</span>
    },
    {
      key: 'percentage',
      header: 'Attendance %',
      sortable: true,
      render: (value) => (
        <span className={`font-semibold ${getPercentageColor(value)}`}>
          {value.toFixed(1)}%
        </span>
      )
    }
  ];

  const uniqueClasses = useMemo(() => {
    const classIds = [...new Set(mockReports.map(r => r.class_id))];
    return classIds.map(id => mockReports.find(r => r.class_id === id)?.class_name || id);
  }, [mockReports]);

  const totals = useMemo(() => {
    return {
      total_students: mockReports.length,
      avg_percentage: mockReports.reduce((sum, r) => sum + r.percentage, 0) / mockReports.length,
      total_present: mockReports.reduce((sum, r) => sum + r.present_days, 0),
      total_absent: mockReports.reduce((sum, r) => sum + r.absent_days, 0)
    };
  }, [mockReports]);

  if (loading?.all && mockReports.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading attendance reports...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6 text-violet-600" />
            <span>Attendance Reports</span>
          </div>
        }
      >
        <div className="mb-6 p-4 bg-violet-50 border border-violet-200 rounded-lg">
          <div className="flex items-start gap-3">
            <DocumentTextIcon className="w-5 h-5 text-violet-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-violet-800">Monthly/Class-wise/Individual Attendance Summaries</h3>
              <p className="text-sm text-violet-700 mt-1">
                View comprehensive attendance reports including monthly summaries, class-wise attendance, 
                and individual student attendance records with detailed statistics.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Students</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {totals.total_students}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ChartBarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Avg Attendance</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.avg_percentage.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Total Present</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.total_present}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Total Absent</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {totals.total_absent}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedMonth(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClass(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Student, admission..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockReports}
          columns={columns}
        />
      </Card>
    </div>
  );
};

const AttendanceReportsPage: React.FC = () => (
  <div className="space-y-6">
    <AttendanceReportsContent />
  </div>
);

export default AttendanceReportsPage;
