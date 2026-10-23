import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import { TabNavigation } from '@/components/ui';
import { StudentExamProfile } from '../components';
import { 
  ChartBarIcon
} from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,

} from 'recharts';

interface SubjectPerformancePoint {
  subject: string;
  student: number | null;
  class: number | null;
}

interface PerformanceOverTimePoint {
  exam: string;
  student: number | null;
  class: number | null;
}

interface SubjectBreakdownPoint {
  name: string;
  marks: number;
  change: number;
  grade: string;
  rank: number;
  classSize: number;
}

type PaperMark = { paper_setting_id: string; score?: number | null };

const meanOf = (values: number[]): number =>
  values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

const round1 = (value: number): number => Math.round(value * 10) / 10;

const createdAtTime = (iso: string): number => {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const StudentExamAnalysisPageContent: React.FC = () => {
  useTranslation('academics');
  const navigate = useNavigate();
  const { studentId } = useParams<{ studentId: string }>();
  const {
    students = [],
    studentExamResults = [],
    examSessions = [],
    examPaperSettings = [],
    gradingSchemes = [],
    loading,
  } = useAppData();

  const [activeTab, setActiveTab] = useState('student-analysis');
  const [selectedExam, setSelectedExam] = useState('');

  // Tab navigation
  const tabs = [
    { id: 'student-analysis', label: 'Student Analysis', icon: <ChartBarIcon className="h-4 w-4" /> },
  ];

  // Exam picker options — newest first.
  const examOptions = useMemo(() => {
    return [...examSessions]
      .sort((a, b) => createdAtTime(b.created_at) - createdAtTime(a.created_at))
      .map(session => ({
        value: session.id,
        label: session.school_period_name ? `${session.name} (${session.school_period_name})` : session.name,
      }));
  }, [examSessions]);

  // Sessions oldest → newest for trend charts.
  const sortedSessions = useMemo(
    () => [...examSessions].sort((a, b) => createdAtTime(a.created_at) - createdAtTime(b.created_at)),
    [examSessions]
  );

  // Explicitly selected session, falling back to the most recent one.
  const selectedSession = useMemo(() => {
    if (selectedExam) return examSessions.find(es => es.id === selectedExam) ?? null;
    return sortedSessions.length > 0 ? sortedSessions[sortedSessions.length - 1] : null;
  }, [examSessions, selectedExam, sortedSessions]);

  // Grading scheme lookup — prefer the default scheme, fall back to the first available.
  const gradeLevels = useMemo(() => {
    const scheme = gradingSchemes.find(s => s.is_default) ?? gradingSchemes[0];
    return [...(scheme?.levels ?? [])].sort((a, b) => b.min_score - a.min_score);
  }, [gradingSchemes]);

  const gradeForScore = useCallback(
    (score: number): string | null => gradeLevels.find(l => score >= l.min_score)?.grade ?? null,
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

  // Weighted percentage (0–100) across the paper marks that belong to `settingIds`.
  const scoreForSettings = useCallback(
    (marks: PaperMark[] | undefined, settingIds: Set<string>): number | null => {
      if (!marks || marks.length === 0) return null;
      let weightedSum = 0;
      let totalWeight = 0;
      let tookAny = false;
      for (const mark of marks) {
        if (!settingIds.has(String(mark.paper_setting_id))) continue;
        tookAny = true;
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
      if (!tookAny || totalWeight <= 0) return null;
      return weightedSum / totalWeight;
    },
    [paperSettingsById]
  );

  // Overall percentage for a result; total_marks is already a weighted 0–100 score when present.
  const overallPercent = useCallback(
    (result: { total_marks?: number | null; marks?: PaperMark[] }): number | null => {
      const total = result.total_marks;
      if (typeof total === 'number' && Number.isFinite(total) && total > 0) return total;
      const allSettingIds = new Set(paperSettingsById.keys());
      return scoreForSettings(result.marks, allSettingIds);
    },
    [paperSettingsById, scoreForSettings]
  );

  const foundStudent = useMemo(
    () => students.find(s => String(s.id) === String(studentId)) ?? null,
    [students, studentId]
  );

  const studentName = foundStudent
    ? [foundStudent.first_name, foundStudent.last_name].filter(Boolean).join(' ').trim() || 'Unknown Student'
    : 'Unknown Student';
  const studentFirstName = foundStudent?.first_name || 'Student';
  const admissionNumber = foundStudent?.admission_no || '—';
  const streamLabel = foundStudent?.current_class_stream_name || '—';
  const kcpeScore = foundStudent?.marks_attained_primary
    ? Number(foundStudent.marks_attained_primary) || undefined
    : undefined;

  // Classmates share the student's current class stream.
  const classmateIds = useMemo(() => {
    if (!foundStudent?.current_class_stream_id) return new Set<string>();
    return new Set(
      students
        .filter(s => String(s.current_class_stream_id) === String(foundStudent.current_class_stream_id))
        .map(s => String(s.id))
    );
  }, [students, foundStudent]);

  const sessionResults = useMemo(() => {
    if (!selectedSession) return [];
    return studentExamResults.filter(r => r.exam_session_id === selectedSession.id);
  }, [selectedSession, studentExamResults]);

  const studentResult = useMemo(() => {
    if (!studentId) return null;
    return sessionResults.find(r => String(r.student_id) === String(studentId)) ?? null;
  }, [sessionResults, studentId]);

  // Paper settings of the selected session grouped into subjects.
  interface SubjectGroup {
    subject: string;
    settingIds: Set<string>;
  }
  const subjectGroups = useMemo<SubjectGroup[]>(() => {
    if (!selectedSession) return [];
    const groups = new Map<string, SubjectGroup>();
    (selectedSession.paper_settings ?? []).forEach(ps => {
      const name = ps.subject_name || 'Other';
      let group = groups.get(name);
      if (!group) {
        group = { subject: name, settingIds: new Set() };
        groups.set(name, group);
      }
      group.settingIds.add(String(ps.id));
    });
    return Array.from(groups.values());
  }, [selectedSession]);

  // Student vs class average per subject.
  const subjectPerformanceData: SubjectPerformancePoint[] = useMemo(() => {
    if (!selectedSession) return [];
    const classResults = sessionResults.filter(r => classmateIds.has(String(r.student_id)));
    return subjectGroups.map(group => {
      const studentScore = studentResult ? scoreForSettings(studentResult.marks, group.settingIds) : null;
      const classScores = classResults
        .map(r => scoreForSettings(r.marks, group.settingIds))
        .filter((v): v is number => v != null);
      return {
        subject: group.subject,
        student: studentScore != null ? round1(studentScore) : null,
        class: classScores.length > 0 ? round1(meanOf(classScores)) : null,
      };
    });
  }, [selectedSession, sessionResults, classmateIds, subjectGroups, studentResult, scoreForSettings]);

  // Student vs class average per exam session over time.
  const performanceOverTimeData: PerformanceOverTimePoint[] = useMemo(() => {
    return sortedSessions.map(session => {
      const results = studentExamResults.filter(r => r.exam_session_id === session.id);
      const mine = studentId ? results.find(r => String(r.student_id) === String(studentId)) : undefined;
      const minePct = mine ? overallPercent(mine) : null;
      const classPcts = results
        .filter(r => classmateIds.has(String(r.student_id)))
        .map(r => overallPercent(r))
        .filter((v): v is number => v != null);
      return {
        exam: session.name,
        student: minePct != null ? round1(minePct) : null,
        class: classPcts.length > 0 ? round1(meanOf(classPcts)) : null,
      };
    });
  }, [sortedSessions, studentExamResults, studentId, classmateIds, overallPercent]);

  // Per-subject table rows with change vs previous session and rank within the stream.
  const subjectBreakdownData: SubjectBreakdownPoint[] = useMemo(() => {
    if (!selectedSession || !studentResult || !foundStudent) return [];

    const selectedIndex = sortedSessions.findIndex(s => s.id === selectedSession.id);
    const prevSession = selectedIndex > 0 ? sortedSessions[selectedIndex - 1] : null;
    const prevResult = prevSession
      ? studentExamResults.find(
          r => r.exam_session_id === prevSession.id && String(r.student_id) === String(foundStudent.id)
        ) ?? null
      : null;

    const classResults = sessionResults.filter(r => classmateIds.has(String(r.student_id)));

    return subjectGroups.flatMap(group => {
      const pct = scoreForSettings(studentResult.marks, group.settingIds);
      if (pct == null) return [];
      const prevPct = prevResult ? scoreForSettings(prevResult.marks, group.settingIds) : null;

      const ranked = classResults
        .map(r => ({ id: String(r.student_id), pct: scoreForSettings(r.marks, group.settingIds) }))
        .filter((entry): entry is { id: string; pct: number } => entry.pct != null)
        .sort((a, b) => b.pct - a.pct);
      const rank = ranked.findIndex(entry => entry.id === String(foundStudent.id)) + 1;

      return [{
        name: group.subject,
        marks: Math.round(pct),
        change: prevPct != null ? round1(pct - prevPct) : 0,
        grade: gradeForScore(pct) ?? '—',
        rank: Math.max(rank, 0),
        classSize: ranked.length,
      }];
    });
  }, [
    selectedSession,
    studentResult,
    foundStudent,
    sortedSessions,
    studentExamResults,
    sessionResults,
    classmateIds,
    subjectGroups,
    scoreForSettings,
    gradeForScore,
  ]);

  // Headline metrics for the profile card.
  const profileMetrics = useMemo(() => {
    if (!studentResult || !foundStudent) return null;

    const meanMarks = overallPercent(studentResult) ?? 0;

    let totalPoints = 0;
    subjectGroups.forEach(group => {
      const pct = scoreForSettings(studentResult.marks, group.settingIds);
      if (pct == null) return;
      const points = gradeLevels.find(l => pct >= l.min_score)?.points;
      if (typeof points === 'number') totalPoints += points;
    });
    const maxLevelPoints = gradeLevels.reduce(
      (max, l) => (typeof l.points === 'number' && l.points > max ? l.points : max),
      0
    );
    const maxPoints = maxLevelPoints * subjectGroups.length;

    const rankedAll = sessionResults
      .map(r => ({ id: String(r.student_id), pct: overallPercent(r) }))
      .filter((entry): entry is { id: string; pct: number } => entry.pct != null)
      .sort((a, b) => b.pct - a.pct);
    const rankedStream = rankedAll.filter(entry => classmateIds.has(entry.id));
    const overallPosition = rankedAll.findIndex(entry => entry.id === String(foundStudent.id)) + 1;
    const streamPosition = rankedStream.findIndex(entry => entry.id === String(foundStudent.id)) + 1;

    return {
      meanMarks: round1(meanMarks),
      totalPoints,
      maxPoints,
      overallPosition: Math.max(overallPosition, 0),
      totalStudents: rankedAll.length,
      streamPosition: Math.max(streamPosition, 0),
      streamTotal: rankedStream.length,
      meanGrade: gradeForScore(meanMarks) ?? '—',
    };
  }, [
    studentResult,
    foundStudent,
    overallPercent,
    subjectGroups,
    scoreForSettings,
    gradeLevels,
    sessionResults,
    classmateIds,
    gradeForScore,
  ]);

  const pageTitle = useMemo(() => {
    const parts = [
      streamLabel !== '—' ? streamLabel : '',
      selectedSession?.name ?? '',
      selectedSession?.school_period_name ? `(${selectedSession.school_period_name})` : '',
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : 'Student Exam Analysis';
  }, [streamLabel, selectedSession]);

  const isLoading = Boolean(loading?.all || loading?.students);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      {/* Tab Navigation */}
      <TabNavigation 
        tabs={tabs} 
        variant="sidebar"
        activeTabId={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Page Title */}
      <PageHeaderWithTabs
        title={pageTitle}
        action={
          <div className="flex items-center gap-2">
            <span className="text-sm text-surface-muted-fg">Change Exam:</span>
            <select
              value={selectedSession?.id ?? ''}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="px-3 py-2 border border-surface-border rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
            >
              {examOptions.length === 0 && <option value="">No exams available</option>}
              {examOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Student Profile & Performance */}
      <StudentExamProfile
        studentName={studentName}
        admissionNumber={admissionNumber}
        stream={streamLabel}
        examName={selectedSession?.name || '—'}
        meanMarks={profileMetrics?.meanMarks ?? 0}
        totalPoints={profileMetrics?.totalPoints ?? 0}
        maxPoints={profileMetrics?.maxPoints ?? 0}
        overallPosition={profileMetrics?.overallPosition ?? 0}
        totalStudents={profileMetrics?.totalStudents ?? 0}
        streamPosition={profileMetrics?.streamPosition ?? 0}
        streamTotal={profileMetrics?.streamTotal ?? 0}
        meanGrade={profileMetrics?.meanGrade ?? '—'}
        kcpeScore={kcpeScore}
        onProfileClick={() => navigate(`/administration/students/${studentId}`)}
        onMessageClick={() => navigate(`/administration/message-campaigns?student=${studentId}`)}
        onNotesClick={() => navigate(`/administration/students/${studentId}/notes`)}
      />

      {/* Subject Performance Chart */}
      <Card>
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-surface-foreground flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-surface-muted-fg" />
            Exam Performance Comparison
          </h3>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={subjectPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="subject" 
                tick={{ fill: '#6b7280', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="student" 
                name={studentFirstName}
                stroke="#10b981" 
                fill="#86efac" 
                fillOpacity={0.6}
                strokeWidth={2}
                connectNulls
              />
              <Area 
                type="monotone" 
                dataKey="class" 
                name={streamLabel !== '—' ? streamLabel : 'Class'}
                stroke="#6b7280" 
                fill="#d1d5db" 
                fillOpacity={0.4}
                strokeWidth={2}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance Table */}
        <Card>
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-surface-foreground">Subject Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-muted-fg uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-muted-fg uppercase">Marks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-muted-fg uppercase">Change</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-muted-fg uppercase">Gr.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-muted-fg uppercase">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjectBreakdownData.map((subject) => (
                  <tr key={subject.name} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-sm text-surface-foreground">{subject.name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-surface-foreground">{subject.marks}%</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1 ${subject.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {subject.change >= 0 ? '↗' : '↘'}
                        {Math.abs(subject.change)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        subject.grade.startsWith('A') ? 'bg-emerald-100 text-emerald-700' :
                        subject.grade.startsWith('B') ? 'bg-primary-100 text-primary-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {subject.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-muted-fg">{subject.rank} / {subject.classSize}</td>
                  </tr>
                ))}
                {subjectBreakdownData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-surface-muted-fg">
                      No exam results recorded for this student in the selected exam.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Performance Over Time */}
        <Card>
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-surface-foreground">Performance Over Time</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="exam" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="student" 
                  name={studentFirstName}
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="class" 
                  name="Class Average"
                  stroke="#6b7280" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#6b7280', r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
const StudentExamAnalysisPage: React.FC = () => (
  <div className="space-y-3">
    <StudentExamAnalysisPageContent />
  </div>
);

export default StudentExamAnalysisPage;
