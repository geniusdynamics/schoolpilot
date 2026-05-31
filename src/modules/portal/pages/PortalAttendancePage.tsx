// ABOUTME: Portal attendance page showing attendance summary and records
// ABOUTME: Displays attendance statistics, color-coded status badges, and filterable attendance records

import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { usePortalData } from '../data/usePortalData';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@/components/ui/icons';

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

const statusBadgeClass: Record<AttendanceStatus, string> = {
  Present: 'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700',
  Absent: 'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-700',
  Late: 'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700',
  Excused: 'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700',
};

const statusIconMap: Record<AttendanceStatus, React.ReactNode> = {
  Present: <CheckCircleIcon className="w-3.5 h-3.5" />,
  Absent: <XCircleIcon className="w-3.5 h-3.5" />,
  Late: <ExclamationTriangleIcon className="w-3.5 h-3.5" />,
  Excused: <CheckCircleIcon className="w-3.5 h-3.5" />,
};

interface AttendanceRow {
  id: string;
  date: string;
  periodName: string;
  status: AttendanceStatus;
  remarks: string;
  recordedByName: string;
}

export const PortalAttendanceContent: React.FC = () => {
  const { t } = useTranslation('portal');
  const {
    attendanceRecords,
    loading,
    loadAttendanceRecords,
    getAttendanceSummary,
  } = usePortalData();

  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadAttendanceRecords('STU001');
  }, [loadAttendanceRecords]);

  const attendanceSummary = getAttendanceSummary();

  const filteredRecords = useMemo(() => {
    let records = [...attendanceRecords];

    if (dateFrom) {
      records = records.filter(r => r.date >= dateFrom);
    }
    if (dateTo) {
      records = records.filter(r => r.date <= dateTo);
    }
    if (statusFilter) {
      records = records.filter(r => r.status === statusFilter);
    }

    return records.sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords, dateFrom, dateTo, statusFilter]);

  const gridData: AttendanceRow[] = filteredRecords.map(r => ({
    id: r.id,
    date: r.date,
    periodName: r.periodName || '-',
    status: r.status as AttendanceStatus,
    remarks: r.remarks || '-',
    recordedByName: r.recordedByName,
  }));

  const columns: DataGridColumn<AttendanceRow>[] = [
    {
      key: 'date',
      header: t('attendance.date'),
      sortable: true,
      filterable: true,
      width: 130,
      render: (value) => (
        <span className="font-medium text-gray-900">
          {new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'periodName',
      header: t('attendance.period'),
      sortable: true,
      filterable: true,
      width: 120,
    },
    {
      key: 'status',
      header: t('attendance.status'),
      sortable: true,
      filterable: true,
      width: 130,
      render: (value: AttendanceStatus) => (
        <span className={statusBadgeClass[value]}>
          {statusIconMap[value]}
          {value}
        </span>
      ),
    },
    {
      key: 'remarks',
      header: t('attendance.remarks'),
      sortable: false,
      filterable: true,
      render: (value: string) => (
        <span className="text-gray-600">{value}</span>
      ),
    },
    {
      key: 'recordedByName',
      header: t('attendance.recordedBy'),
      sortable: true,
      filterable: true,
      width: 150,
    },
  ];

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setStatusFilter('');
  };

  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Attendance Summary Cards */}
      {attendanceSummary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-slate-200 bg-white shadow-sm">
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">{attendanceSummary.totalDays}</p>
              <p className="text-xs text-gray-500 mt-1">{t('attendance.totalDays')}</p>
            </div>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
            <div className="text-center">
              <p className="text-2xl font-semibold text-emerald-700">{attendanceSummary.presentDays}</p>
              <p className="text-xs text-emerald-600 mt-1">{t('attendance.present')}</p>
            </div>
          </Card>
          <Card className="border-rose-200 bg-rose-50 shadow-sm">
            <div className="text-center">
              <p className="text-2xl font-semibold text-rose-700">{attendanceSummary.absentDays}</p>
              <p className="text-xs text-rose-600 mt-1">{t('attendance.absent')}</p>
            </div>
          </Card>
          <Card className="border-amber-200 bg-amber-50 shadow-sm">
            <div className="text-center">
              <p className="text-2xl font-semibold text-amber-700">{attendanceSummary.lateDays}</p>
              <p className="text-xs text-amber-600 mt-1">{t('attendance.late')}</p>
            </div>
          </Card>
          <Card className="border-blue-200 bg-blue-50 shadow-sm">
            <div className="text-center">
              <p className="text-2xl font-semibold text-blue-700">{attendanceSummary.excusedDays}</p>
              <p className="text-xs text-blue-600 mt-1">{t('attendance.excused')}</p>
            </div>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm">
            <div className="text-center">
              <p className={`text-2xl font-semibold ${
                attendanceSummary.attendancePercentage >= 80 ? 'text-emerald-600' :
                attendanceSummary.attendancePercentage >= 60 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {attendanceSummary.attendancePercentage}%
              </p>
              <p className="text-xs text-gray-500 mt-1">{t('attendance.percentage')}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Progress Bar */}
      {attendanceSummary && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('attendance.percentage')}</span>
                <span className="font-medium text-gray-900">{attendanceSummary.attendancePercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    attendanceSummary.attendancePercentage >= 80 ? 'bg-emerald-500' :
                    attendanceSummary.attendancePercentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${attendanceSummary.attendancePercentage}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card title={t('attendance.records')} className="border-slate-200 bg-white shadow-sm">
        <div className="p-4 border-b mb-4 bg-gray-50 rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Input
              label={t('common.filter') + ' - ' + t('attendance.date') + ' (From)'}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label={t('common.filter') + ' - ' + t('attendance.date') + ' (To)'}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('attendance.status')}
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Present">{t('attendance.present')}</option>
                <option value="Absent">{t('attendance.absent')}</option>
                <option value="Late">{t('attendance.late')}</option>
                <option value="Excused">{t('attendance.excused')}</option>
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>

        <DataGrid
          columns={columns}
          data={gridData}
          loading={loading}
          sortable
          filterable
          emptyState={{
            icon: <CalendarDaysIcon className="w-12 h-12 text-gray-300" />,
            title: t('common.noData'),
            description: 'No attendance records found. Try adjusting your filters.',
          }}
        />
      </Card>
    </div>
  );
};

const PortalAttendancePage: React.FC = () => {
  return <PortalAttendanceContent />;
};

export default PortalAttendancePage;
