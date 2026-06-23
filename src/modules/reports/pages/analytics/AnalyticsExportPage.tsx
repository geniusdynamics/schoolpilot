import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DocumentReportIcon,
  ArrowDownTrayIcon,
  AcademicCapIcon,
  BookOpenIcon,
  UserGroupIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@/components/ui/icons';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Select, { SelectOption } from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import ModuleDashboardShell, { DashboardMetric } from '@/components/ModuleDashboardShell';
import { useAnalyticsData } from '../../data/useAnalyticsData';

type ExportDataType = 'teachers' | 'subjects' | 'classes' | 'trends';
type ExportFormat = 'csv' | 'json' | 'pdf';

interface ExportConfig {
  dataType: ExportDataType;
  format: ExportFormat;
  dateFrom: string;
  dateTo: string;
  subjectFilter: string;
  classFilter: string;
  teacherFilter: string;
}

interface ExportHistoryEntry {
  id: string;
  type: string;
  format: string;
  date: string;
  status: 'completed' | 'processing' | 'failed';
  size?: string;
}

const AnalyticsExportPage: React.FC = () => {
  const { t } = useTranslation('analytics');
  const {
    teacherAnalytics,
    subjectPassRates,
    classPerformances,
    loading,
    exportReport,
  } = useAnalyticsData();

  const [config, setConfig] = useState<ExportConfig>({
    dataType: 'teachers',
    format: 'csv',
    dateFrom: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    subjectFilter: '',
    classFilter: '',
    teacherFilter: '',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Gather unique values for filters
  const allSubjects = useMemo(() => {
    const subjects = new Set<string>();
    (subjectPassRates || []).forEach((s) => subjects.add(s.subjectName));
    (teacherAnalytics || []).forEach((ta) => {
      if (ta.subjectName) subjects.add(ta.subjectName);
    });
    return Array.from(subjects).sort();
  }, [subjectPassRates, teacherAnalytics]);

  const allClasses = useMemo(() => {
    const classes = new Set<string>();
    (classPerformances || []).forEach((c) => classes.add(c.className));
    return Array.from(classes).sort();
  }, [classPerformances]);

  const allTeachers = useMemo(() => {
    return (teacherAnalytics || []).map((ta) => ta.teacherName).sort();
  }, [teacherAnalytics]);

  // Metrics
  const metrics: DashboardMetric[] = [
    {
      key: 'teacher-records',
      label: 'Teacher Records',
      value: (teacherAnalytics || []).length,
      icon: <AcademicCapIcon className="h-6 w-6 text-blue-700" />,
    },
    {
      key: 'subject-records',
      label: 'Subject Records',
      value: (subjectPassRates || []).length,
      icon: <BookOpenIcon className="h-6 w-6 text-emerald-700" />,
    },
    {
      key: 'class-records',
      label: 'Class Records',
      value: (classPerformances || []).length,
      icon: <UserGroupIcon className="h-6 w-6 text-violet-700" />,
    },
    {
      key: 'export-ready',
      label: 'Export Ready',
      value: 'Yes',
      description: 'All data validated and available',
      icon: <CheckCircleIcon className="h-6 w-6 text-teal-700" />,
    },
  ];

  // Data type options
  const dataTypeOptions: SelectOption[] = [
    { value: 'teachers', label: 'Teacher Performance' },
    { value: 'subjects', label: 'Subject Performance' },
    { value: 'classes', label: 'Class Performance' },
    { value: 'trends', label: 'Trend Analysis' },
  ];

  // Format options
  const formatOptions: SelectOption[] = [
    { value: 'csv', label: 'CSV' },
    { value: 'json', label: 'JSON' },
    { value: 'pdf', label: 'PDF' },
  ];

  // Subject filter options
  const subjectFilterOptions: SelectOption[] = [
    { value: '', label: 'All Subjects' },
    ...allSubjects.map((s) => ({ value: s, label: s })),
  ];

  // Class filter options
  const classFilterOptions: SelectOption[] = [
    { value: '', label: 'All Classes' },
    ...allClasses.map((c) => ({ value: c, label: c })),
  ];

  // Teacher filter options
  const teacherFilterOptions: SelectOption[] = [
    { value: '', label: 'All Teachers' },
    ...allTeachers.map((t2) => ({ value: t2, label: t2 })),
  ];

  // Generate preview data based on selected data type
  const previewData = useMemo(() => {
    switch (config.dataType) {
      case 'teachers':
        return (teacherAnalytics || []).map((ta) => ({
          Teacher: ta.teacherName,
          Subject: ta.subjectName || 'N/A',
          Classes: (ta.classPerformance || []).length,
          Students: (ta.classPerformance || []).reduce((s, c) => s + c.studentCount, 0),
          'Avg Score': `${Math.round((ta.classPerformance || []).reduce((s, c) => s + c.averageScore, 0) / ((ta.classPerformance || []).length || 1))}%`,
          'Pass Rate': `${Math.round((ta.passRates || []).reduce((s, p) => s + p.passRate, 0) / ((ta.passRates || []).length || 1))}%`,
          Attendance: `${Math.round(ta.attendanceRate || 0)}%`,
        }));
      case 'subjects':
        return (subjectPassRates || []).map((sp) => ({
          Subject: sp.subjectName,
          Students: sp.studentCount,
          Exams: sp.examCount,
          'Pass Rate': `${sp.passRate}%`,
          'Avg Score': `${sp.averageScore}%`,
          Highest: sp.highestScore,
          Lowest: sp.lowestScore,
          Trend: sp.trend,
        }));
      case 'classes':
        return (classPerformances || []).map((cp) => ({
          Class: cp.className,
          Stream: cp.streamName || 'N/A',
          Students: cp.studentCount,
          'Avg Score': `${cp.averageScore}%`,
          'Pass Rate': `${cp.passRate}%`,
          Attendance: `${cp.attendanceRate}%`,
          Trend: cp.trend,
        }));
      case 'trends':
        return [
          { Metric: 'Pass Rate', 'Current Value': '72%', 'Previous': '68%', Change: '+4%', Status: 'Improving' },
          { Metric: 'Average Score', 'Current Value': '65%', 'Previous': '67%', Change: '-2%', Status: 'Declining' },
          { Metric: 'Attendance', 'Current Value': '89%', 'Previous': '87%', Change: '+2%', Status: 'Improving' },
        ];
      default:
        return [];
    }
  }, [config.dataType, teacherAnalytics, subjectPassRates, classPerformances]);

  // Preview columns (dynamic based on data type)
  const previewColumns: DataGridColumn<Record<string, string>>[] = useMemo(() => {
    if (previewData.length === 0) return [];
    const keys = Object.keys(previewData[0]);
    return keys.map((key) => ({
      key,
      header: key,
      sortable: true,
      align: key.includes('Rate') || key.includes('Score') || key.includes('Value') || key.includes('Change') ? 'center' as const : 'left' as const,
      render: (value: string) => {
        if (value === 'up' || value === 'Improving') {
          return <span className="text-emerald-600 font-medium text-sm">{value}</span>;
        }
        if (value === 'down' || value === 'Declining') {
          return <span className="text-rose-600 font-medium text-sm">{value}</span>;
        }
        if (value === 'stable' || value === 'Stable') {
          return <span className="text-gray-600 font-medium text-sm">{value}</span>;
        }
        return <span className="text-sm text-gray-900">{value}</span>;
      },
    }));
  }, [previewData]);

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      await exportReport(config.format as any, config.dataType);

      // Simulate export completion
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setExportSuccess(true);

      // Reset success state after 3 seconds
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [config.format, config.dataType, exportReport]);

  // Recent exports history (placeholder)
  const recentExports: ExportHistoryEntry[] = [
    { id: '1', type: 'Teacher Performance', format: 'PDF', date: '2025-03-15', status: 'completed', size: '2.3 MB' },
    { id: '2', type: 'Subject Analytics', format: 'CSV', date: '2025-03-10', status: 'completed', size: '456 KB' },
    { id: '3', type: 'Class Report', format: 'JSON', date: '2025-03-05', status: 'completed', size: '1.1 MB' },
    { id: '4', type: 'Trend Analysis', format: 'PDF', date: '2025-02-28', status: 'failed' },
  ];

  const historyColumns: DataGridColumn<ExportHistoryEntry>[] = [
    {
      key: 'type',
      header: 'Report Type',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <DocumentReportIcon className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-gray-900">{value}</span>
        </div>
      ),
    },
    { key: 'format', header: 'Format', sortable: true, align: 'center' },
    { key: 'date', header: 'Date', sortable: true, align: 'center' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (value: string) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          value === 'completed' ? 'bg-emerald-100 text-emerald-700' :
          value === 'processing' ? 'bg-amber-100 text-amber-700' :
          'bg-rose-100 text-rose-700'
        }`}>
          {value === 'completed' ? <CheckCircleIcon className="h-3 w-3" /> :
           value === 'failed' ? <ExclamationTriangleIcon className="h-3 w-3" /> : null}
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'size',
      header: 'Size',
      sortable: true,
      align: 'center',
      render: (value: string | undefined) => (
        <span className="text-sm text-gray-500">{value || '-'}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <ModuleDashboardShell
      title={t('export.title')}
      subtitle="Configure and export analytics reports in multiple formats. Select data type, date range, and filters to customize your exports."
      heroIcon={<DocumentReportIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
    >
      {/* Export Configuration Form */}
      <Card title="Export Configuration" className="border-slate-200 bg-white shadow-sm">
        <div className="space-y-6">
          {/* Data Type and Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('export.reportType')}
              </label>
              <Select
                value={config.dataType}
                onChange={(val) => setConfig((prev) => ({ ...prev, dataType: val as ExportDataType }))}
                options={dataTypeOptions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('export.format')}
              </label>
              <div className="flex gap-2">
                {formatOptions.map((fmt) => (
                  <Button
                    key={fmt.value}
                    variant={config.format === fmt.value ? 'primary' : 'outline'}
                    onClick={() => setConfig((prev) => ({ ...prev, format: fmt.value as ExportFormat }))}
                  >
                    {fmt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={config.dateFrom}
                  onChange={(e) => setConfig((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={config.dateTo}
                  onChange={(e) => setConfig((prev) => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filters</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Subject</label>
                <Select
                  value={config.subjectFilter}
                  onChange={(val) => setConfig((prev) => ({ ...prev, subjectFilter: val as string }))}
                  options={subjectFilterOptions}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Class</label>
                <Select
                  value={config.classFilter}
                  onChange={(val) => setConfig((prev) => ({ ...prev, classFilter: val as string }))}
                  options={classFilterOptions}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Teacher</label>
                <Select
                  value={config.teacherFilter}
                  onChange={(val) => setConfig((prev) => ({ ...prev, teacherFilter: val as string }))}
                  options={teacherFilterOptions}
                />
              </div>
            </div>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 self-center mr-2">Quick Range:</span>
            {[
              { label: 'Last 7 Days', days: 7 },
              { label: 'Last 30 Days', days: 30 },
              { label: 'Last 3 Months', days: 90 },
              { label: 'Last 6 Months', days: 180 },
              { label: 'This Year', days: 365 },
            ].map((range) => {
              const from = new Date();
              from.setDate(from.getDate() - range.days);
              return (
                <Button
                  key={range.label}
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      dateFrom: from.toISOString().split('T')[0],
                      dateTo: new Date().toISOString().split('T')[0],
                    }))
                  }
                >
                  {range.label}
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Preview Table */}
      <Card
        title={`Preview: ${dataTypeOptions.find((o) => o.value === config.dataType)?.label || ''}`}
        className="border-slate-200 bg-white shadow-sm"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {previewData.length} record{previewData.length !== 1 ? 's' : ''} that will be exported
          </p>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            Format: {config.format.toUpperCase()}
          </span>
        </div>
        <DataGrid
          columns={previewColumns}
          data={previewData}
          loading={loading}
          sortable
          filterable
        />
      </Card>

      {/* Export Action */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Ready to Export</h3>
            <p className="text-xs text-gray-500 mt-1">
              {previewData.length} records will be exported as {config.format.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {exportSuccess && (
              <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                <CheckCircleIcon className="h-4 w-4" />
                Export complete!
              </span>
            )}
            <Button
              variant="primary"
              leftIcon={isExporting ? <Spinner size="sm" /> : <ArrowDownTrayIcon className="h-5 w-5" />}
              onClick={handleExport}
              disabled={isExporting || previewData.length === 0}
            >
              {isExporting ? 'Exporting...' : t('export.download')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Exports History */}
      <Card title="Recent Exports" className="border-slate-200 bg-white shadow-sm">
        <DataGrid
          columns={historyColumns}
          data={recentExports}
          sortable
          filterable={false}
        />
      </Card>
    </ModuleDashboardShell>
  );
};

export const AnalyticsExportPageContent = AnalyticsExportPage;
export default AnalyticsExportPage;
