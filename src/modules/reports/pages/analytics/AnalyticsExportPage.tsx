// ABOUTME: The analytics export screen: the downloaded file is built from the same computed rows the
// ABOUTME: preview shows, with subject and class filters narrowing the figures they name.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  BookOpenIcon,
  CheckCircleIcon,
  DocumentReportIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '@/components/ui/icons';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Select, { SelectOption } from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import ModuleDashboardShell, { DashboardMetric } from '@/components/ModuleDashboardShell';

import {
  analyticsRowsToCsv,
  buildAnalyticsExportRows,
  type AnalyticsExportDataType,
  type AnalyticsExportRow,
} from '../../data/analyticsExport';
import { AnalyticsEmptyCard, AnalyticsScopeCard } from './AnalyticsScopeCard';
import { useReportAnalyticsScope } from './useReportAnalyticsScope';

type ExportFormat = 'csv' | 'json' | 'pdf';

interface ExportConfig {
  dataType: AnalyticsExportDataType;
  format: ExportFormat;
  subjectId: string;
  classId: string;
  teacherId: string;
}

const DATA_TYPES: readonly { readonly value: AnalyticsExportDataType; readonly label: string }[] = [
  { value: 'teachers', label: 'Teacher performance' },
  { value: 'subjects', label: 'Subject performance' },
  { value: 'classes', label: 'Class performance' },
  { value: 'trends', label: 'Trend analysis' },
];

function download(name: string, mimeType: string, content: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

const AnalyticsExportPage: React.FC = () => {
  const { t } = useTranslation('analytics');
  const { scopeState, analytics, hasYear, loading, error } = useReportAnalyticsScope('optional');

  const [config, setConfig] = useState<ExportConfig>({
    dataType: 'teachers',
    format: 'csv',
    subjectId: '',
    classId: '',
    teacherId: '',
  });
  const [exported, setExported] = useState(false);

  const filters = useMemo(
    () => ({
      subjectId: config.subjectId,
      classId: config.classId,
      teacherId: config.teacherId,
    }),
    [config.classId, config.subjectId, config.teacherId]
  );

  const trendScope = config.dataType === 'trends';
  const activeFilters = useMemo(() => (trendScope ? {} : filters), [trendScope, filters]);

  const previewRows = useMemo(
    () => buildAnalyticsExportRows(analytics, config.dataType, activeFilters),
    [analytics, config.dataType, activeFilters]
  );

  const subjectOptions: SelectOption[] = [
    { value: '', label: 'All subjects' },
    ...analytics.subjectPassRates
      .map((subject) => ({ value: subject.subjectId, label: subject.subjectName }))
      .sort((left, right) => left.label.localeCompare(right.label)),
  ];

  const classOptions: SelectOption[] = [
    { value: '', label: 'All classes' },
    ...analytics.classPerformances
      .map((row) => ({ value: row.classId, label: `${row.className}${row.streamName ? ` · ${row.streamName}` : ''}` }))
      .sort((left, right) => left.label.localeCompare(right.label)),
  ];

  const teacherOptions: SelectOption[] = [
    { value: '', label: 'All teachers' },
    ...analytics.teacherAnalytics
      .map((teacher) => ({ value: teacher.teacherId, label: teacher.teacherName }))
      .sort((left, right) => left.label.localeCompare(right.label)),
  ];

  const metrics: DashboardMetric[] = [
    {
      key: 'teacher-records',
      label: 'Teacher records',
      value: analytics.teacherAnalytics.length,
      icon: <AcademicCapIcon className="h-6 w-6 text-primary-700" />,
    },
    {
      key: 'subject-records',
      label: 'Subject records',
      value: analytics.subjectPassRates.length,
      icon: <BookOpenIcon className="h-6 w-6 text-emerald-700" />,
    },
    {
      key: 'class-records',
      label: 'Class records',
      value: analytics.classPerformances.length,
      icon: <UserGroupIcon className="h-6 w-6 text-violet-700" />,
    },
    {
      key: 'preview-rows',
      label: 'Rows in preview',
      value: previewRows.length,
      description: previewRows.length === 0 ? 'Nothing matches this configuration' : 'Ready to download',
      icon: <CheckCircleIcon className="h-6 w-6 text-teal-700" />,
    },
  ];

  const previewColumns: DataGridColumn<AnalyticsExportRow>[] = useMemo(() => {
    if (previewRows.length === 0) return [];
    return Object.keys(previewRows[0])
      .filter((key) => key !== 'id')
      .map((key) => ({
        key,
        header: key,
        sortable: true,
        align: key.includes('Rate') || key.includes('Score') || key.includes('Value') || key.includes('Change') || key === 'Students' ? ('center' as const) : ('left' as const),
        render: (value: string) => {
          if (value === 'Improving') return <span className="text-emerald-600 font-medium text-sm">{value}</span>;
          if (value === 'Declining') return <span className="text-rose-600 font-medium text-sm">{value}</span>;
          if (value === 'Not recorded' || value === '—') return <span className="text-surface-muted-fg text-sm">{value}</span>;
          return <span className="text-sm text-surface-foreground">{value}</span>;
        },
      }));
  }, [previewRows]);

  const handleExport = () => {
    if (previewRows.length === 0 || config.format === 'pdf') return;
    setExported(false);
    const stamp = new Date().toISOString().slice(0, 10);
    if (config.format === 'csv') {
      download(`analytics-${config.dataType}-${stamp}.csv`, 'text/csv;charset=utf-8', analyticsRowsToCsv(previewRows));
    } else {
      const body = previewRows.map((row) =>
        Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'id'))
      );
      download(`analytics-${config.dataType}-${stamp}.json`, 'application/json', JSON.stringify(body, null, 2));
    }
    setExported(true);
  };

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
      subtitle="Download the analytics above as the rows this page computed. Nothing is exported that the screen cannot show."
      heroIcon={<DocumentReportIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
    >
      <AnalyticsScopeCard scope={scopeState} period="optional" />

      {error !== null && (
        <AnalyticsEmptyCard title="Export" message="The academic record could not be read, so there is nothing to export." />
      )}

      {error === null && !hasYear && (
        <AnalyticsEmptyCard title="Export" message="No academic year is set up, so there is nothing to export." />
      )}

      {error === null && hasYear && (
        <>
          <Card title="Export configuration" className="border-slate-200 bg-surface-card shadow-sm">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-surface-foreground mb-2">{t('export.reportType')}</label>
                  <Select
                    value={config.dataType}
                    onValueChange={(value) =>
                      setConfig((prev) => ({ ...prev, dataType: (Array.isArray(value) ? value[0] : value) as AnalyticsExportDataType }))
                    }
                    options={DATA_TYPES.map((option) => ({ ...option }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-foreground mb-2">{t('export.format')}</label>
                  <div className="flex gap-2">
                    {(['csv', 'json', 'pdf'] as ExportFormat[]).map((format) => (
                      <Button
                        key={format}
                        variant={config.format === format ? 'primary' : 'outline'}
                        onClick={() => setConfig((prev) => ({ ...prev, format }))}
                        disabled={format === 'pdf'}
                        title={format === 'pdf' ? 'PDF export is not available; choose CSV or JSON.' : undefined}
                      >
                        {format.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-surface-muted-fg mt-1">PDF export is not available; CSV and JSON download directly.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-foreground mb-2">Filters</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-surface-muted-fg mb-1">Subject</label>
                    <Select
                      value={config.subjectId}
                      onValueChange={(value) => setConfig((prev) => ({ ...prev, subjectId: String(value) }))}
                      options={subjectOptions}
                      disabled={trendScope || analytics.subjectPassRates.length === 0}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-muted-fg mb-1">Class</label>
                    <Select
                      value={config.classId}
                      onValueChange={(value) => setConfig((prev) => ({ ...prev, classId: String(value) }))}
                      options={classOptions}
                      disabled={trendScope || analytics.classPerformances.length === 0}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-muted-fg mb-1">Teacher</label>
                    <Select
                      value={config.teacherId}
                      onValueChange={(value) => setConfig((prev) => ({ ...prev, teacherId: String(value) }))}
                      options={teacherOptions}
                      disabled={trendScope || analytics.teacherAnalytics.length === 0}
                    />
                  </div>
                </div>
                {trendScope && (
                  <p className="text-xs text-surface-muted-fg mt-2">
                    Trend rows are the whole scope the filter bar selected; subject, class and teacher filters do not narrow a period series.
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card
            title={`Preview: ${DATA_TYPES.find((option) => option.value === config.dataType)?.label ?? ''}`}
            className="border-slate-200 bg-surface-card shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm text-surface-muted-fg">
                Showing {previewRows.length} record{previewRows.length === 1 ? '' : 's'} that will be exported
              </p>
              <span className="text-xs text-surface-muted-fg bg-surface-accent px-2 py-1 rounded">
                Format: {config.format.toUpperCase()}
              </span>
            </div>
            {previewRows.length === 0 ? (
              <div className="flex items-start gap-2 text-sm text-surface-muted-fg">
                <ExclamationTriangleIcon className="h-4 w-4 mt-0.5" />
                <span>No computed row matches this scope and filter combination.</span>
              </div>
            ) : (
              <DataGrid columns={previewColumns} data={previewRows} loading={loading} sortable filterable keyField="id" />
            )}
          </Card>

          <Card className="border-slate-200 bg-surface-card shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-surface-foreground">Ready to export</h3>
                <p className="text-xs text-surface-muted-fg mt-1">
                  {previewRows.length} record{previewRows.length === 1 ? '' : 's'} will download as {config.format.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {exported && (
                  <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                    <CheckCircleIcon className="h-4 w-4" />
                    Download started
                  </span>
                )}
                <Button
                  variant="primary"
                  leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                  onClick={handleExport}
                  disabled={previewRows.length === 0 || config.format === 'pdf'}
                >
                  {t('export.download')}
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Recent exports" className="border-slate-200 bg-surface-card shadow-sm">
            <p className="text-sm text-surface-muted-fg">
              Export history is not recorded. Each download goes straight to your device, so this page has no previous exports to list.
            </p>
          </Card>
        </>
      )}
    </ModuleDashboardShell>
  );
};

export const AnalyticsExportPageContent = AnalyticsExportPage;
export default AnalyticsExportPage;
