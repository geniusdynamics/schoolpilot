import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TabNavigation, FilterBar } from '@/components/ui';
import { GradeBreakdownTable } from '../components';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  ListBulletIcon, 
  ChartBarIcon,
  DocumentTextIcon,
  TrophyIcon,
  PrinterIcon
} from '@/components/ui/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useAppData } from '@/hooks/useAppData';
import type { GradeBreakdown, ClassChartData } from '../data/types';
import { logger } from '@/utils/logging';

// Same grade columns the GradeBreakdownTable renders.
const GRADE_KEYS = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E', 'X', 'Y'] as const;

const meanOf = (values: number[]): number =>
  values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

const round1 = (value: number): number => Math.round(value * 10) / 10;

interface StreamAggregate {
  key: string;
  className: string;
  streamName: string;
  percents: number[];
}

export const ClassListsPageContent: React.FC = () => {
  useTranslation('reports');
  const [activeTab, setActiveTab] = useState('class-lists');

  // Filter states
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const {
    students = [],
    classStreams = [],
    studentExamResults = [],
    examPaperSettings = [],
    examSessions = [],
    gradingSchemes = [],
  } = useAppData();

  const tabs = [
    { 
      id: 'class-lists', 
      label: 'Class Lists', 
      icon: <ListBulletIcon className="h-4 w-4" />,
      onClick: () => setActiveTab('class-lists')
    },
    { 
      id: 'analysis-report', 
      label: 'Analysis Report', 
      icon: <ChartBarIcon className="h-4 w-4" />,
      onClick: () => setActiveTab('analysis-report')
    },
    { 
      id: 'report-forms', 
      label: 'Report Forms', 
      icon: <DocumentTextIcon className="h-4 w-4" />,
      onClick: () => setActiveTab('report-forms')
    },
    { 
      id: 'merit-lists', 
      label: 'Merit Lists', 
      icon: <TrophyIcon className="h-4 w-4" />,
      onClick: () => setActiveTab('merit-lists')
    },
  ];

  // Filter options
  const formOptions = [
    { value: '', label: 'Select Form' },
    { value: 'form-1', label: 'Form 1' },
    { value: 'form-2', label: 'Form 2' },
    { value: 'form-3', label: 'Form 3' },
    { value: 'form-4', label: 'Form 4' },
  ];

  const streamOptions = [
    { value: '', label: 'Select Stream (Optional)' },
    { value: 'alpha', label: 'Alpha' },
    { value: 'moxie', label: 'Moxie' },
    { value: 'north', label: 'North' },
  ];

  const subjectOptions = [
    { value: '', label: 'Select Subject (Optional)' },
    { value: 'kiswahili', label: 'Kiswahili' },
    { value: 'english', label: 'English' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'biology', label: 'Biology' },
  ];

  // Grading scheme lookup — prefer the default scheme, fall back to the first available.
  const gradeLevels = useMemo(() => {
    const scheme = gradingSchemes.find(s => s.is_default) ?? gradingSchemes[0];
    return [...(scheme?.levels ?? [])].sort((a, b) => b.min_score - a.min_score);
  }, [gradingSchemes]);

  const gradeForScore = useCallback(
    (score: number): string | null => gradeLevels.find(l => score >= l.min_score)?.grade ?? null,
    [gradeLevels]
  );

  const pointsForScore = useCallback(
    (score: number): number | null => {
      const points = gradeLevels.find(l => score >= l.min_score)?.points;
      return typeof points === 'number' ? points : null;
    },
    [gradeLevels]
  );

  // Paper settings by id — flat collection merged with settings embedded on sessions.
  const paperSettingsById = useMemo(() => {
    const map = new Map<string, (typeof examPaperSettings)[number]>();
    examPaperSettings.forEach(ps => map.set(String(ps.id), ps));
    examSessions.forEach(es => (es.paper_settings ?? []).forEach(ps => {
      if (!map.has(String(ps.id))) map.set(String(ps.id), ps);
    }));
    return map;
  }, [examPaperSettings, examSessions]);

  // Percentage score per result (0–100), mirroring how saveStudentExamResult weights papers.
  const computeResultPercent = useCallback(
    (marks: { paper_setting_id: string; score?: number | null }[] | undefined): number | null => {
      if (!marks || marks.length === 0) return null;
      let weightedSum = 0;
      let totalWeight = 0;
      for (const mark of marks) {
        if (mark.score == null) continue;
        const setting = paperSettingsById.get(String(mark.paper_setting_id));
        const marksOutOf = setting?.marks_out_of ?? 0;
        if (marksOutOf <= 0) {
          weightedSum += Number(mark.score);
          totalWeight += 1;
          continue;
        }
        const normalized = (Number(mark.score) / marksOutOf) * 100;
        const weight = setting?.weight_percentage;
        if (weight != null && weight > 0) {
          weightedSum += normalized * (weight / 100);
          totalWeight += weight / 100;
        } else {
          weightedSum += normalized;
          totalWeight += 1;
        }
      }
      return totalWeight > 0 ? weightedSum / totalWeight : null;
    },
    [paperSettingsById]
  );

  // Results with a usable percentage; total_marks is already a weighted 0–100 score when present.
  const scoredResults = useMemo(() => {
    return studentExamResults.flatMap(result => {
      const total = result.total_marks;
      const percent =
        typeof total === 'number' && Number.isFinite(total) && total > 0
          ? total
          : computeResultPercent(result.marks);
      return percent == null ? [] : [{ result, percent }];
    });
  }, [studentExamResults, computeResultPercent]);

  const studentById = useMemo(() => new Map(students.map(s => [String(s.id), s])), [students]);
  const streamById = useMemo(() => new Map(classStreams.map(cs => [String(cs.id), cs])), [classStreams]);

  // Group scored results by class stream via each student's current_class_stream_id.
  const aggregates = useMemo(() => {
    const byKey = new Map<string, StreamAggregate>();
    for (const { result, percent } of scoredResults) {
      const student = studentById.get(String(result.student_id));
      const streamId = student?.current_class_stream_id;
      const stream = streamId != null ? streamById.get(String(streamId)) : undefined;
      const className = stream?.class_name || student?.current_class_name || 'Unassigned';
      const streamName = stream?.name || student?.current_class_stream_name || '';
      const key = stream ? String(stream.id) : `${className}|${streamName}`;
      let agg = byKey.get(key);
      if (!agg) {
        agg = { key, className, streamName, percents: [] };
        byKey.set(key, agg);
      }
      agg.percents.push(percent);
    }
    return Array.from(byKey.values());
  }, [scoredResults, studentById, streamById]);

  // School-wide baselines used for the deviation columns.
  const overallMeans = useMemo(() => {
    const allPercents = scoredResults.map(e => e.percent);
    const allPoints = allPercents
      .map(p => pointsForScore(p))
      .filter((p): p is number => p != null);
    return {
      meanMarks: meanOf(allPercents),
      meanPoints: meanOf(allPoints),
    };
  }, [scoredResults, pointsForScore]);

  const buildBreakdownRow = useCallback(
    (percents: number[], base: { form: string; stream?: string; isSummary?: boolean }): GradeBreakdown => {
      const grades: Record<string, number> = {};
      for (const key of GRADE_KEYS) grades[key] = 0;
      for (const p of percents) {
        const grade = gradeForScore(p);
        if (!grade) continue;
        grades[grade] = (grades[grade] ?? 0) + 1;
      }
      const points = percents
        .map(p => pointsForScore(p))
        .filter((p): p is number => p != null);
      const meanMarks = meanOf(percents);
      const meanPoints = meanOf(points);
      return {
        ...base,
        grades,
        entries: percents.length,
        meanMarks,
        meanMarksDeviation: meanMarks - overallMeans.meanMarks,
        meanPoints,
        meanPointsDeviation: meanPoints - overallMeans.meanPoints,
        grade: gradeForScore(meanMarks) ?? '—',
        subjectTeacher: '',
        tscNo: '',
      };
    },
    [gradeForScore, pointsForScore, overallMeans]
  );

  // Grade breakdown rows: one per stream plus an aggregated summary row per class/form.
  const gradeBreakdownRows: GradeBreakdown[] = useMemo(() => {
    const byClass = new Map<string, StreamAggregate[]>();
    for (const agg of aggregates) {
      const list = byClass.get(agg.className) ?? [];
      list.push(agg);
      byClass.set(agg.className, list);
    }

    const rows: GradeBreakdown[] = [];
    const sortedClasses = Array.from(byClass.keys()).sort((a, b) => a.localeCompare(b));
    for (const className of sortedClasses) {
      const streamAggs = (byClass.get(className) ?? [])
        .slice()
        .sort((a, b) => a.streamName.localeCompare(b.streamName));

      for (const agg of streamAggs) {
        rows.push(buildBreakdownRow(agg.percents, {
          form: className,
          stream: agg.streamName || undefined,
        }));
      }

      if (streamAggs.length > 1) {
        rows.push(buildBreakdownRow(streamAggs.flatMap(a => a.percents), {
          form: className,
          isSummary: true,
        }));
      }
    }
    return rows;
  }, [aggregates, buildBreakdownRow]);

  // Mean marks per class stream for the bar chart.
  const classChartData: ClassChartData[] = useMemo(() => {
    return aggregates
      .map(agg => ({
        name: [agg.className, agg.streamName].filter(Boolean).join(' '),
        mean: round1(meanOf(agg.percents)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [aggregates]);

  const handleClearFilters = () => {
    setSelectedForm('');
    setSelectedStream('');
    setSelectedSubject('');
  };

  const handleSearch = () => {
    logger.info('Searching with filters:', { selectedForm, selectedStream, selectedSubject });
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Tab Navigation */}
      <TabNavigation 
        tabs={tabs} 
        variant="sidebar"
        activeTabId={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Filters */}
      <FilterBar
        filters={[
          {
            id: 'form',
            label: 'Form',
            placeholder: 'Select Form',
            options: formOptions,
            value: selectedForm,
            onChange: setSelectedForm,
          },
          {
            id: 'stream',
            label: 'Stream',
            placeholder: 'Select Stream (Optional)',
            options: streamOptions,
            value: selectedStream,
            onChange: setSelectedStream,
            optional: true,
          },
          {
            id: 'subject',
            label: 'Subject',
            placeholder: 'Select Subject (Optional)',
            options: subjectOptions,
            value: selectedSubject,
            onChange: setSelectedSubject,
            optional: true,
          },
        ]}
        onClear={handleClearFilters}
        onSearch={handleSearch}
        searchLabel="Generate Report"
      />

      {/* Content based on active tab */}
      {activeTab === 'class-lists' && (
        <div className="space-y-3">
          {/* Grade Breakdown Section */}
          <Card>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-surface-muted-fg" />
                <h2 className="text-lg font-semibold text-surface-foreground">Grade Breakdown</h2>
              </div>
              <select className="px-3 py-2 border border-surface-border rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50 text-emerald-700">
                <option>Kiswahili</option>
                <option>English</option>
                <option>Mathematics</option>
              </select>
            </div>
            <div className="p-4">
              <GradeBreakdownTable 
                rows={gradeBreakdownRows}
                showTeacher={true}
              />
            </div>
          </Card>

          {/* Performance Chart */}
          <Card>
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-surface-foreground">Mean Marks by Stream</h2>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={classChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="mean" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Print Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              leftIcon={<PrinterIcon className="h-4 w-4" />}
              onClick={() => window.print()}
            >
              View Print Format
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'analysis-report' && (
        <Card>
          <div className="p-8 text-center">
            <ChartBarIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-surface-foreground mb-2">Analysis Report</h3>
            <p className="text-surface-muted-fg max-w-md mx-auto">
              Select filters above and click "Generate Report" to view detailed analysis.
            </p>
          </div>
        </Card>
      )}

      {activeTab === 'report-forms' && (
        <Card>
          <div className="p-8 text-center">
            <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-surface-foreground mb-2">Report Forms</h3>
            <p className="text-surface-muted-fg max-w-md mx-auto">
              Generate and download student report forms for the selected class and exam.
            </p>
          </div>
        </Card>
      )}

      {activeTab === 'merit-lists' && (
        <Card>
          <div className="p-8 text-center">
            <TrophyIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-surface-foreground mb-2">Merit Lists</h3>
            <p className="text-surface-muted-fg max-w-md mx-auto">
              View and print merit lists for top performing students.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
const ClassListsPage: React.FC = () => (
  <div className="space-y-3">
    <ClassListsPageContent />
  </div>
);

export default ClassListsPage;
