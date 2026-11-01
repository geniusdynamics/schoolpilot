// ABOUTME: Dynamic student report builder: choose fields and class/stream filters, preview the grid, print it or export CSV.
// ABOUTME: This replaces the empty report-builder stub with the field-selection workflow the old Akademico report screen used.

import React, { useEffect, useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DownloadIcon, PrinterIcon } from '@/components/ui/icons';
import type { RepositoryRow } from '@/data/repository';
import { listAll } from '@/data/listAll';
import { CanonicalRepositoryProvider, useCanonicalRepository } from '@/data/canonicalRepository';

interface StudentReportRow {
  id: string;
  admission_number: string;
  name: string;
  gender: string;
  date_of_birth: string;
  status: string;
  class_name: string;
  stream_name: string;
  guardian_name: string;
  guardian_phone: string;
  phone: string;
  email: string;
  admission_date: string;
  previous_school: string;
  upi: string;
  county: string;
  religion: string;
}

interface FieldDefinition {
  readonly key: keyof StudentReportRow;
  readonly label: string;
}

const FIELDS: readonly FieldDefinition[] = [
  { key: 'admission_number', label: 'ADM NO' },
  { key: 'name', label: 'Student Name' },
  { key: 'gender', label: 'Gender' },
  { key: 'date_of_birth', label: 'D.O.B' },
  { key: 'status', label: 'Status' },
  { key: 'class_name', label: 'Current Class' },
  { key: 'stream_name', label: 'Current Stream' },
  { key: 'guardian_name', label: 'Parent / Guardian' },
  { key: 'guardian_phone', label: 'Guardian Phone' },
  { key: 'phone', label: 'Student Phone' },
  { key: 'email', label: 'Email' },
  { key: 'admission_date', label: 'Admission Date' },
  { key: 'previous_school', label: 'Previous School' },
  { key: 'upi', label: 'UPI' },
  { key: 'county', label: 'County' },
  { key: 'religion', label: 'Religion' },
];

const ALL_KEYS = FIELDS.map((field) => field.key);

const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

function displayDate(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

function csvValue(value: unknown): string {
  const raw = String(value ?? '');
  return /[",\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

const DynamicReportBuilderInner: React.FC = () => {
  const repository = useCanonicalRepository();
  const [learners, setLearners] = useState<RepositoryRow<'learner'>[]>([]);
  const [classesByLearner, setClassesByLearner] = useState<Map<string, { className: string; streamName: string }>>(
    new Map()
  );
  const [guardiansByLearner, setGuardiansByLearner] = useState<Map<string, { name: string; phone: string }>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<readonly string[]>(ALL_KEYS);
  const [filterClass, setFilterClass] = useState('');
  const [filterStream, setFilterStream] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [learnerRows, enrolments, classGroups, levels, links, guardians] = await Promise.all([
          listAll(repository, 'learner'),
          listAll(repository, 'enrolment'),
          listAll(repository, 'class_group'),
          listAll(repository, 'level'),
          listAll(repository, 'learner_guardian'),
          listAll(repository, 'guardian'),
        ]);
        if (cancelled) return;
        const levelName = new Map<string, string>(
          levels.map((level) => [String(level.id), level.name] as const)
        );
        const groupById = new Map(
          classGroups.map((group) => [String(group.id), group] as const)
        );
        const activePlacement = new Map(
          enrolments
            .filter((row) => row.status === 'active' || row.status === 'repeating')
            .map((row) => [row.learner_id, row] as const)
        );
        const classes = new Map<string, { className: string; streamName: string }>();
        for (const [learnerId, enrolment] of activePlacement) {
          const group = enrolment.class_group_id ? groupById.get(enrolment.class_group_id) : undefined;
          classes.set(learnerId, {
            className: group ? (levelName.get(group.level_id) ?? '') : '',
            streamName: group?.name ?? '',
          });
        }
        const guardianById = new Map(
          guardians.map((guardian) => [String(guardian.id), guardian] as const)
        );
        const primaryGuardian = new Map<string, { name: string; phone: string }>();
        for (const link of links) {
          if (!link.is_primary) continue;
          const guardian = guardianById.get(link.guardian_id);
          if (!guardian) continue;
          primaryGuardian.set(link.learner_id, {
            name: `${guardian.preferred_name ?? guardian.given_name} ${guardian.family_name}`.trim(),
            phone: guardian.phones?.[0]?.number ?? '',
          });
        }
        setLearners(learnerRows);
        setClassesByLearner(classes);
        setGuardiansByLearner(primaryGuardian);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const allRows = useMemo<StudentReportRow[]>(
    () =>
      learners.map((learner) => {
        const placement = classesByLearner.get(learner.id);
        const guardian = guardiansByLearner.get(learner.id);
        return {
          id: learner.id,
          admission_number: learner.admission_number,
          name: `${learner.preferred_name ?? learner.given_name} ${learner.family_name}`.trim(),
          gender: learner.gender,
          date_of_birth: displayDate(learner.date_of_birth),
          status: learner.status.replace(/_/g, ' '),
          class_name: placement?.className ?? '',
          stream_name: placement?.streamName ?? '',
          guardian_name: guardian?.name ?? '',
          guardian_phone: guardian?.phone ?? '',
          phone: learner.phones?.[0]?.number ?? '',
          email: learner.emails?.[0]?.address ?? '',
          admission_date: displayDate(learner.admission_date),
          previous_school: learner.previous_school ?? '',
          upi: text(learner.attributes?.['ke.kemis_upi']),
          county: learner.address?.region ?? '',
          religion: text(learner.attributes?.religion),
        };
      }),
    [learners, classesByLearner, guardiansByLearner]
  );

  const classOptions = useMemo(
    () => [...new Set(allRows.map((row) => row.class_name).filter(Boolean))].sort(),
    [allRows]
  );
  const streamOptions = useMemo(() => {
    const scoped = filterClass ? allRows.filter((row) => row.class_name === filterClass) : allRows;
    return [...new Set(scoped.map((row) => row.stream_name).filter(Boolean))].sort();
  }, [allRows, filterClass]);

  const rows = useMemo(
    () =>
      allRows.filter(
        (row) =>
          (!filterClass || row.class_name === filterClass) &&
          (!filterStream || row.stream_name === filterStream)
      ),
    [allRows, filterClass, filterStream]
  );

  const columns = useMemo<DataGridColumn<StudentReportRow>[]>(
    () =>
      FIELDS.filter((field) => selectedFields.includes(field.key)).map((field) => ({
        key: field.key,
        header: field.label,
        sortable: true,
        filterable: false,
      })),
    [selectedFields]
  );

  const toggleField = (key: string) => {
    setSelectedFields((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const exportCsv = () => {
    const visible = FIELDS.filter((field) => selectedFields.includes(field.key));
    const lines = [
      visible.map((field) => csvValue(field.label)).join(','),
      ...rows.map((row) => visible.map((field) => csvValue(row[field.key])).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `student-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <Spinner />
        <span className="ml-2">Loading learners and placements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <style>{`
        @media print {
          body.report-printing *:not(#student-report-print):not(#student-report-print *) { visibility: hidden; }
          #student-report-print { display: block !important; position: absolute; inset: 0; background: white; }
          #student-report-print table { width: 100%; border-collapse: collapse; font-size: 10px; }
          #student-report-print th, #student-report-print td { border: 1px solid #999; padding: 4px; text-align: left; }
        }
      `}</style>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card
        title="Student Report Builder"
        info="Choose the columns and the class or stream, then preview, print or export the same grid. This is the old Akademico field-selection report rebuilt on the canonical learner directory."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={exportCsv}
              disabled={rows.length === 0 || selectedFields.length === 0}
              leftIcon={<DownloadIcon className="h-4 w-4" />}
            >
              Export CSV
            </Button>
            <Button
              onClick={() => {
                document.body.classList.add('report-printing');
                window.print();
                window.setTimeout(() => document.body.classList.remove('report-printing'), 0);
              }}
              disabled={rows.length === 0}
              leftIcon={<PrinterIcon className="h-4 w-4" />}
            >
              Print
            </Button>
          </div>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Class</span>
            <select
              value={filterClass}
              onChange={(event) => {
                setFilterClass(event.target.value);
                setFilterStream('');
              }}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All classes</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Stream</span>
            <select
              value={filterStream}
              onChange={(event) => setFilterStream(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All streams</option>
              {streamOptions.map((stream) => (
                <option key={stream} value={stream}>{stream}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="mb-4 rounded-lg border border-surface-border p-3">
          <legend className="px-1 text-sm font-medium text-surface-foreground">Columns</legend>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {FIELDS.map((field) => (
              <label key={field.key} className="flex items-center gap-2 text-sm text-surface-foreground">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field.key)}
                  onChange={() => toggleField(field.key)}
                  className="h-4 w-4 rounded border-surface-border text-primary-600 focus:ring-primary-500"
                />
                {field.label}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="mb-2 text-xs text-surface-muted-fg">
          {rows.length} learner{rows.length === 1 ? '' : 's'} · {columns.length} column
          {columns.length === 1 ? '' : 's'} selected
        </p>

        <DataGrid
          data={rows}
          columns={columns}
          pagination={{ pageSize: 25 }}
          sortable
          filterable={false}
          emptyState={{
            title: rows.length === 0 ? 'No learners match the filters' : 'No columns selected',
            description:
              rows.length === 0
                ? 'Change the class or stream, or add learners to the directory.'
                : 'Tick at least one column to show the report.',
          }}
        />
      </Card>

      <div id="student-report-print" className="hidden">
        <h1 style={{ fontSize: '18px', marginBottom: '8px' }}>Student Report</h1>
        <table>
          <thead>
            <tr>
              {FIELDS.filter((field) => selectedFields.includes(field.key)).map((field) => (
                <th key={field.key}>{field.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {FIELDS.filter((field) => selectedFields.includes(field.key)).map((field) => (
                  <td key={field.key}>{String(row[field.key] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DynamicReportBuilder: React.FC = () => (
  <CanonicalRepositoryProvider>
    <DynamicReportBuilderInner />
  </CanonicalRepositoryProvider>
);

export default DynamicReportBuilder;
