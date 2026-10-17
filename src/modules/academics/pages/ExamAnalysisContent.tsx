// ABOUTME: Class-level exam analysis content (subject/stream performance, merit list)
// ABOUTME: Exports ExamAnalysisContent, rendered as a tab by ExamAnalysisPage hub

import React, { useState, useMemo, useCallback } from 'react';
import type { ExamPaperSetting, Subject } from '../data/types';
import Card from '@/components/ui/Card';
import { DataGrid } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { TabNavigation } from '@/components/ui';
import {
  ExamPerformanceHeader,
  SubjectPerformanceTable,
  MeritListActions,
  SubjectPerformance
} from '../components';
import { ChartPieIcon, HomeIcon, BookOpenIcon, ChartBarIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
import { useToast } from '@/hooks/useToast';

interface SubjectAnalysisData {
  id: string;
  subjectId: string | number;
  subjectName: string;
  studentsSat: number;
  highestScore: number;
  lowestScore: number;
  averageScore: number;
  totalMarksPossible: number;
  // Average for the same subject/stream in the preceding session (drives the change column)
  previousAverage?: number;
}

interface StreamPerformancePoint {
  name: string;
  points: number;
}

interface ExamPerformanceOverTimePoint {
  name: string;
  exam1?: number;
  exam2?: number;
  exam3?: number;
}

const meanOf = (values: number[]): number =>
  values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Ids may be numeric seed values or UUID strings; compare them as strings, never coerce to numbers. */
const sameId = (a: unknown, b: unknown): boolean => a != null && b != null && String(a) === String(b);

const createdAtTime = (iso: string): number => {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const ExamAnalysisContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const {
    examSessions,
    classStreams,
    students,
    studentExamResults,
    subjects,
    subjectPapers,
    classSubjectAllocations,
    academicYears,
    schoolPeriods,
    examPaperSettings = [],
    gradingSchemes = [],
    loading,
  } = useAppData();

  const [selectedExamSessionId, setSelectedExamSessionId] = useState<string | undefined>();
  const [selectedClassStreamId, setSelectedClassStreamId] = useState<string | undefined>();
  const [analysisData, setAnalysisData] = useState<SubjectAnalysisData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ===== Live chart derivations (client-side aggregation over loaded context arrays) =====

  // Grading scheme levels — prefer the default scheme, fall back to the first available.
  const gradeLevels = useMemo(() => {
    const scheme = gradingSchemes.find(s => s.is_default) ?? gradingSchemes[0];
    return [...(scheme?.levels ?? [])].sort((a, b) => b.min_score - a.min_score);
  }, [gradingSchemes]);

  const pointsForPercent = useCallback(
    (percent: number): number | null => {
      const points = gradeLevels.find(l => percent >= l.min_score)?.points;
      return typeof points === 'number' ? points : null;
    },
    [gradeLevels]
  );

  // Paper settings by id — flat collection merged with settings embedded on sessions.
  const paperSettingsById = useMemo(() => {
    const map = new Map<string, ExamPaperSetting>();
    examPaperSettings.forEach(ps => map.set(String(ps.id), ps));
    examSessions.forEach(es => (es.paper_settings ?? []).forEach(ps => {
      if (!map.has(String(ps.id))) map.set(String(ps.id), ps);
    }));
    return map;
  }, [examPaperSettings, examSessions]);

  const studentById = useMemo(
    () => new Map((students || []).map(s => [String(s.id), s])),
    [students]
  );
  const streamById = useMemo(
    () => new Map((classStreams || []).map(cs => [String(cs.id), cs])),
    [classStreams]
  );

  // Percentage score per result (0–100); total_marks is already a weighted 0–100 score when present.
  const scoredResults = useMemo(() => {
    return (studentExamResults || []).flatMap(result => {
      const total = result.total_marks;
      let percent: number | null =
        typeof total === 'number' && Number.isFinite(total) && total > 0 ? total : null;
      if (percent == null) {
        const marks = result.marks ?? [];
        if (marks.length > 0) {
          let weightedSum = 0;
          let totalWeight = 0;
          marks.forEach(mark => {
            if (mark.score == null) return;
            const setting = paperSettingsById.get(String(mark.paper_setting_id));
            const marksOutOf = setting?.marks_out_of ?? 0;
            if (marksOutOf <= 0) {
              weightedSum += Number(mark.score);
              totalWeight += 1;
              return;
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
          });
          percent = totalWeight > 0 ? weightedSum / totalWeight : null;
        }
      }
      return percent == null ? [] : [{ result, percent }];
    });
  }, [studentExamResults, paperSettingsById]);

  interface StreamBucket {
    label: string;
    percents: number[];
  }

  const groupScoredByStream = useCallback(
    (entries: { result: (typeof studentExamResults)[number]; percent: number }[]): StreamBucket[] => {
      const byKey = new Map<string, StreamBucket>();
      entries.forEach(({ result, percent }) => {
        const student = studentById.get(String(result.student_id));
        const streamId = student?.current_class_stream_id;
        const stream = streamId != null ? streamById.get(String(streamId)) : undefined;
        const label = stream
          ? `${stream.class_name ?? ''} ${stream.name}`.trim()
          : student?.current_class_stream_name?.trim() || 'Unassigned';
        const key = stream ? String(stream.id) : label;
        const bucket = byKey.get(key);
        if (bucket) bucket.percents.push(percent);
        else byKey.set(key, { label, percents: [percent] });
      });
      return Array.from(byKey.values());
    },
    [studentById, streamById]
  );

  // Mean points per stream for the selected session (all sessions when none selected).
  const streamPerformanceData: StreamPerformancePoint[] = useMemo(() => {
    const relevant = selectedExamSessionId
      ? scoredResults.filter(e => String(e.result.exam_session_id) === String(selectedExamSessionId))
      : scoredResults;
    return groupScoredByStream(relevant)
      .map(bucket => ({
        name: bucket.label,
        points: round1(meanOf(
          bucket.percents
            .map(pointsForPercent)
            .filter((p): p is number => p != null)
        )),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scoredResults, selectedExamSessionId, groupScoredByStream, pointsForPercent]);

  // Mean points per stream across the three most recent sessions (exam1/exam2/exam3 columns).
  const examPerformanceOverTimeData: ExamPerformanceOverTimePoint[] = useMemo(() => {
    const sessionsAsc = [...(examSessions || [])].sort(
      (a, b) => createdAtTime(a.created_at) - createdAtTime(b.created_at)
    );
    const focusSessions = sessionsAsc.slice(-3);
    if (focusSessions.length === 0) return [];

    const rowsByKey = new Map<string, { name: string; values: (number | undefined)[] }>();
    focusSessions.forEach((session, sessionIndex) => {
      const relevant = scoredResults.filter(
        e => String(e.result.exam_session_id) === String(session.id)
      );
      groupScoredByStream(relevant).forEach(bucket => {
        // Bucket labels are stable across sessions only when streams resolve to ids,
        // so key on the resolved id captured in the label when possible.
        const row = rowsByKey.get(bucket.label) ?? { name: bucket.label, values: [] };
        row.values[sessionIndex] = round1(meanOf(
          bucket.percents
            .map(pointsForPercent)
            .filter((p): p is number => p != null)
        ));
        rowsByKey.set(bucket.label, row);
      });
    });

    return Array.from(rowsByKey.values()).map(row => ({
      name: row.name,
      exam1: row.values[0],
      exam2: row.values[1],
      exam3: row.values[2],
    }));
  }, [examSessions, scoredResults, groupScoredByStream, pointsForPercent]);

  // Tab navigation items
  const tabs = [
    { id: 'my-classes', label: 'My Classes', icon: <HomeIcon className="h-4 w-4" />, to: '/administration/classes' },
    { id: 'manage-exams', label: 'Manage Exams', icon: <BookOpenIcon className="h-4 w-4" />, to: '/academics/exam-setup?tab=exam-sessions' },
    { id: 'create-exam', label: 'Create Exam', icon: <ChartPieIcon className="h-4 w-4" />, to: '/academics/exam-setup?tab=exam-sessions' },
    { id: 'grading-systems', label: 'Grading Systems', icon: <ChartBarIcon className="h-4 w-4" />, to: '/academics/grading-systems?tab=grading-schemes' },
  ];

  const toast = useToast();
  const handleLoadAnalysis = useCallback(() => {
    if (!selectedExamSessionId || !selectedClassStreamId) {
      toast.showError(t('validation.pleaseSelectAnExamSessionAndAClassStream'));
      return;
    }
    setIsAnalyzing(true);

    const selectedSession = (examSessions || []).find(es => sameId(es.id, selectedExamSessionId));
    if (!selectedSession) {
        setIsAnalyzing(false);
        console.warn("Selected exam session not found.");
        setAnalysisData([]);
        return;
    }
    
    const currentSchoolPeriod = (schoolPeriods || []).find(sp => sameId(sp.id, selectedSession.school_period_id));
    const currentAcademicYear = (academicYears || []).find(ay => sameId(ay.id, currentSchoolPeriod?.academic_year_id));
    if (!currentAcademicYear) {
        setIsAnalyzing(false);
        console.warn("Academic year for the session not found.");
        setAnalysisData([]);
        return;
    }

    const allocatedSubjectsForStream = (classSubjectAllocations || [])
      .filter(csa => sameId(csa.class_stream_id, selectedClassStreamId) && sameId(csa.academic_year_id, currentAcademicYear.id))
      .map(csa => (subjects || []).find(s => sameId(s.id, csa.subject_id)))
      .filter((s): s is Subject => !!s);

    const studentsInStream = (students || []).filter(s => sameId(s.current_class_stream_id, selectedClassStreamId));
    const resultsForSessionAndStream = (studentExamResults || []).filter(
      res => sameId(res.exam_session_id, selectedExamSessionId) && studentsInStream.some(s => sameId(s.id, res.student_id))
    );

    // Previous session for the same stream — used for per-subject change values.
    const sessionsAsc = [...(examSessions || [])].sort(
      (a, b) => createdAtTime(a.created_at) - createdAtTime(b.created_at)
    );
    const sessionIndex = sessionsAsc.findIndex(es => sameId(es.id, selectedExamSessionId));
    const prevSessionId = sessionIndex > 0 ? sessionsAsc[sessionIndex - 1].id : null;

    // Mean percentage for one subject in one session, for this stream.
    const computeSubjectAverageForSession = (sessionId: string, subjectId: string | number): number | null => {
      const session = (examSessions || []).find(es => sameId(es.id, sessionId));
      if (!session) return null;
      const paperSettingsForSubject = (session.paper_settings || []).filter(ps => {
        const paper = (subjectPapers || []).find(sp => sameId(sp.id, ps.subject_paper_id));
        return sameId(paper?.subject_id, subjectId);
      });
      if (paperSettingsForSubject.length === 0) return null;

      const settingIds = new Set(paperSettingsForSubject.map(ps => String(ps.id)));
      let averageSum = 0;
      let studentsCounted = 0;
      (studentExamResults || []).forEach(result => {
        if (!sameId(result.exam_session_id, sessionId)) return;
        if (!studentsInStream.some(s => sameId(s.id, result.student_id))) return;
        const marks = (result.marks || []).filter(m => settingIds.has(String(m.paper_setting_id)));
        if (marks.length === 0) return;
        let weightedSum = 0;
        let totalWeight = 0;
        marks.forEach(mark => {
          if (mark.score == null) return;
          const setting = paperSettingsForSubject.find(x => String(x.id) === String(mark.paper_setting_id));
          const marksOutOf = setting?.marks_out_of ?? 0;
          if (marksOutOf <= 0) {
            weightedSum += Number(mark.score);
            totalWeight += 1;
            return;
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
        });
        if (totalWeight > 0) {
          averageSum += weightedSum / totalWeight;
          studentsCounted += 1;
        }
      });
      return studentsCounted > 0 ? averageSum / studentsCounted : null;
    };

    const newAnalysisData = allocatedSubjectsForStream.map(subject => {
      let studentsSat = 0;
      let totalScoreForSubject = 0;
      let highestScoreInSubject = 0;
      let lowestScoreInSubject = Infinity; 
      let totalMarksPossibleForSubject = 0;

      const subjectPaperSettings = (selectedSession.paper_settings || []).filter(ps => {
        const paper = (subjectPapers || []).find(sp => sameId(sp.id, ps.subject_paper_id));
        return sameId(paper?.subject_id, subject.id);
      });
      
      totalMarksPossibleForSubject = subjectPaperSettings.reduce((sum, ps) => sum + ps.marks_out_of, 0);

      resultsForSessionAndStream.forEach(result => {
        let studentScoreForSubject = 0;
        let studentTookSubjectPapersForThisSubject = false;

        const marksForThisSubject = result.marks?.filter(mark => {
            const paperSetting = subjectPaperSettings.find(ps => sameId(ps.id, mark.paper_setting_id));
            return !!paperSetting;
        }) || [];

        if (marksForThisSubject.length > 0) {
             studentTookSubjectPapersForThisSubject = true;
             studentScoreForSubject = marksForThisSubject.reduce((sum, mark) => sum + (mark.score || 0), 0);
        }
        
        if (studentTookSubjectPapersForThisSubject) {
          studentsSat++;
          totalScoreForSubject += studentScoreForSubject;
          if (studentScoreForSubject > highestScoreInSubject) highestScoreInSubject = studentScoreForSubject;
          if (studentScoreForSubject < lowestScoreInSubject) lowestScoreInSubject = studentScoreForSubject;
        }
      });
      
      if (lowestScoreInSubject === Infinity) lowestScoreInSubject = 0;

      return {
        id: subject.name,
        subjectId: subject.id,
        subjectName: subject.name,
        studentsSat,
        highestScore: studentsSat > 0 ? highestScoreInSubject : 0,
        lowestScore: studentsSat > 0 ? lowestScoreInSubject : 0,
        averageScore: studentsSat > 0 ? totalScoreForSubject / studentsSat : 0,
        totalMarksPossible: totalMarksPossibleForSubject,
        previousAverage:
          prevSessionId != null
            ? computeSubjectAverageForSession(prevSessionId, subject.id) ?? undefined
            : undefined,
      };
    }).filter(data => data.totalMarksPossible > 0);

    setAnalysisData(newAnalysisData);
    setIsAnalyzing(false);
  }, [selectedExamSessionId, selectedClassStreamId, examSessions, schoolPeriods, academicYears, classSubjectAllocations, subjects, students, studentExamResults, subjectPapers, t, toast]);

  // Convert analysis data to subject performance format
  const subjectPerformanceData: SubjectPerformance[] = useMemo(() => {
    return analysisData.map((data, index) => ({
      rank: index + 1,
      name: data.subjectName,
      points: data.averageScore,
      // Change vs the same subject/stream in the previous session (0 when no baseline exists)
      change: data.previousAverage != null ? round1(data.averageScore - data.previousAverage) : 0,
      grade: data.averageScore >= 70 ? 'A' : 
             data.averageScore >= 60 ? 'B' : 
             data.averageScore >= 50 ? 'C' : 
             data.averageScore >= 40 ? 'D' : 'E',
    }));
  }, [analysisData]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (analysisData.length === 0) return null;
    
    const totalStudents = Math.max(...analysisData.map(d => d.studentsSat));
    const averageScore = analysisData.reduce((sum, d) => sum + d.averageScore, 0) / analysisData.length;
    const totalPossible = analysisData.reduce((sum, d) => sum + d.totalMarksPossible, 0) / analysisData.length;
    const meanMarks = (averageScore / totalPossible) * 100;
    
    return {
      meanPoints: averageScore / 20, // Assuming max 100 points = 12 grade points
      meanMarks,
      meanGrade: meanMarks >= 70 ? 'A' : 
                 meanMarks >= 60 ? 'B' : 
                 meanMarks >= 50 ? 'C' : 
                 meanMarks >= 40 ? 'D' : 'E',
      studentCount: totalStudents,
    };
  }, [analysisData]);

  const selectedSessionName = useMemo(() => {
    const session = examSessions?.find(s => sameId(s.id, selectedExamSessionId));
    return session?.name || 'Selected Exam';
  }, [examSessions, selectedExamSessionId]);

  const selectedStreamName = useMemo(() => {
    const stream = classStreams?.find(s => sameId(s.id, selectedClassStreamId));
    return stream ? `${stream.class_name} ${stream.name}` : 'Selected Stream';
  }, [classStreams, selectedClassStreamId]);

  const isLoadingPage = loading.examSessions || loading.classStreams || loading.students || loading.studentExamResults || loading.subjects || loading.subjectPapers || loading.classSubjectAllocations || loading.academicYears || loading.schoolPeriods;

  if (isLoadingPage && !isAnalyzing) {
     return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Tab Navigation */}
      <TabNavigation tabs={tabs} variant="sidebar" />

      {/* Filter Section */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Select Exam Session"
              value={selectedExamSessionId || ''}
              onChange={(e) => setSelectedExamSessionId(e.target.value || undefined)}
            >
              <option value="">-- Select Exam Session --</option>
              {(examSessions || []).map(session => (
                <option key={session.id} value={session.id}>{session.name} ({session.school_period_name})</option>
              ))}
            </Select>
            <Select
              label="Select Class Stream"
              value={selectedClassStreamId ?? ''}
              onChange={(e) => setSelectedClassStreamId(e.target.value || undefined)}
            >
              <option value="">-- Select Class Stream --</option>
              {(classStreams || []).map(cs => (
                <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.name}</option>
              ))}
            </Select>
            <div className="flex items-end">
              <Button 
                onClick={handleLoadAnalysis} 
                disabled={!selectedExamSessionId || !selectedClassStreamId || isAnalyzing}
                leftIcon={isAnalyzing ? <Spinner size="sm"/> : <ChartPieIcon className="w-5 h-5"/>}
                className="w-full md:w-auto"
              >
                {isAnalyzing ? 'Analyzing...' : 'Load Analysis'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Header - Only show when data is loaded */}
      {summaryMetrics && !isAnalyzing && (
        <ExamPerformanceHeader
          formName={selectedStreamName}
          examName={selectedSessionName}
          termName="2024 Term 1"
          meanPoints={summaryMetrics.meanPoints}
          meanMarks={summaryMetrics.meanMarks}
          meanGrade={summaryMetrics.meanGrade}
          pointsTrend={{ direction: 'down', value: '0.8917' }}
          marksTrend={{ direction: 'down', value: '4.6' }}
          studentCount={summaryMetrics.studentCount}
        />
      )}

      {/* Charts and Tables Grid */}
      {analysisData.length > 0 && !isAnalyzing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stream Performance Chart */}
          <Card className="lg:col-span-2">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-surface-foreground flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-surface-muted-fg" />
                Performance of Form 1 streams
              </h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={streamPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="points" 
                    stroke="#10b981" 
                    fill="#86efac" 
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Merit List Actions */}
          <MeritListActions
            actions={[
              { id: 'merit-list', label: 'Merit List', onClick: () => navigate('/reports/merit-list') },
              { id: 'most-improved', label: 'Most Improved List', onClick: () => navigate('/reports/improved-list') },
            ]}
            dropdownActions={[
              { id: 'report-forms', label: 'Report Forms', onClick: () => navigate('/reports/forms') },
              { id: 'transcripts', label: 'Transcripts', onClick: () => navigate('/reports/transcripts') },
            ]}
          />
        </div>
      )}

      {/* Subject Performance Table */}
      {subjectPerformanceData.length > 0 && !isAnalyzing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SubjectPerformanceTable subjects={subjectPerformanceData} />
          
          {/* Performance Over Time Chart */}
          <Card>
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-surface-foreground">Performance Over Time</h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={examPerformanceOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="exam1" name="Exam 1" stroke="#6366f1" strokeWidth={2} />
                  <Line type="monotone" dataKey="exam2" name="Exam 2" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="exam3" name="Exam 3" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Analysis Data Table */}
      {isAnalyzing ? (
        <Card>
          <div className="flex justify-center items-center py-10">
            <Spinner /> <span className="ml-2">Processing exam data...</span>
          </div>
        </Card>
      ) : analysisData.length > 0 ? (
        <Card title="Detailed Subject Analysis">
          <DataGrid 
            columns={[
              { header: 'Subject Name', key: 'subjectName' },
              { header: 'Students Sat', key: 'studentsSat' },
              { header: 'Highest Score', key: 'highestScore', render: (_value: any, item: SubjectAnalysisData) => `${item.highestScore.toFixed(1)} / ${item.totalMarksPossible.toFixed(0)}` },
              { header: 'Lowest Score', key: 'lowestScore', render: (_value: any, item: SubjectAnalysisData) => `${item.lowestScore.toFixed(1)} / ${item.totalMarksPossible.toFixed(0)}` },
              { header: 'Average Score', key: 'averageScore', render: (_value: any, item: SubjectAnalysisData) => `${item.averageScore.toFixed(2)} / ${item.totalMarksPossible.toFixed(0)}` },
            ]} 
            data={analysisData} 
          />
        </Card>
      ) : (
        <Card>
          <div className="text-center text-surface-muted-fg py-8">
            <ChartPieIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p>Select an exam session and class stream, then click "Load Analysis" to view results.</p>
          </div>
        </Card>
      )}
    </div>
  );
};



