import React, { useState, useMemo, useCallback } from 'react';
import { 
  AcademicsSubjectType as Subject 
} from '@/types'; 
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
import {
  initialMockExamPerformanceOverTimeData,
  initialMockStreamPerformanceData
} from '../data/mockData';

interface SubjectAnalysisData {
  subjectId: number;
  subjectName: string;
  studentsSat: number;
  highestScore: number;
  lowestScore: number;
  averageScore: number;
  totalMarksPossible: number; 
}

const ExamAnalysisPage: React.FC = () => {
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
    loading,
  } = useAppData();

  const [selectedExamSessionId, setSelectedExamSessionId] = useState<string | undefined>();
  const [selectedClassStreamId, setSelectedClassStreamId] = useState<number | undefined>();
  const [analysisData, setAnalysisData] = useState<SubjectAnalysisData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Tab navigation items
  const tabs = [
    { id: 'my-classes', label: 'My Classes', icon: <HomeIcon className="h-4 w-4" />, to: '/academics/classes' },
    { id: 'manage-exams', label: 'Manage Exams', icon: <BookOpenIcon className="h-4 w-4" />, to: '/academics/exam-sessions' },
    { id: 'create-exam', label: 'Create Exam', icon: <ChartPieIcon className="h-4 w-4" />, to: '/academics/exam-sessions/new' },
    { id: 'grading-systems', label: 'Grading Systems', icon: <ChartBarIcon className="h-4 w-4" />, to: '/academics/grading-schemes' },
  ];

  const handleLoadAnalysis = useCallback(() => {
    if (!selectedExamSessionId || !selectedClassStreamId) {
      alert(t('validation.pleaseSelectAnExamSessionAndAClassStream'));
      return;
    }
    setIsAnalyzing(true);

    const selectedSession = (examSessions || []).find(es => es.id === selectedExamSessionId);
    if (!selectedSession) {
        setIsAnalyzing(false);
        console.warn("Selected exam session not found.");
        setAnalysisData([]);
        return;
    }
    
    const currentSchoolPeriod = (schoolPeriods || []).find(sp => sp.id === selectedSession.school_period_id);
    const currentAcademicYear = (academicYears || []).find(ay => ay.id === currentSchoolPeriod?.academic_year_id);
    if (!currentAcademicYear) {
        setIsAnalyzing(false);
        console.warn("Academic year for the session not found.");
        setAnalysisData([]);
        return;
    }

    const allocatedSubjectsForStream = (classSubjectAllocations || [])
      .filter(csa => csa.class_stream_id === selectedClassStreamId && csa.academic_year_id === currentAcademicYear.id)
      .map(csa => (subjects || []).find(s => s.id === csa.subject_id))
      .filter((s): s is Subject => !!s);

    const studentsInStream = (students || []).filter(s => s.current_class_stream_id === selectedClassStreamId);
    const resultsForSessionAndStream = (studentExamResults || []).filter(
      res => res.exam_session_id === selectedExamSessionId && studentsInStream.some(s => s.id === res.student_id)
    );

    const newAnalysisData = allocatedSubjectsForStream.map(subject => {
      let studentsSat = 0;
      let totalScoreForSubject = 0;
      let highestScoreInSubject = 0;
      let lowestScoreInSubject = Infinity; 
      let totalMarksPossibleForSubject = 0;

      const subjectPaperSettings = (selectedSession.paper_settings || []).filter(ps => {
        const paper = (subjectPapers || []).find(sp => sp.id === ps.subject_paper_id);
        return paper?.subject_id === subject.id;
      });
      
      totalMarksPossibleForSubject = subjectPaperSettings.reduce((sum, ps) => sum + ps.marks_out_of, 0);

      resultsForSessionAndStream.forEach(result => {
        let studentScoreForSubject = 0;
        let studentTookSubjectPapersForThisSubject = false;

        const marksForThisSubject = result.marks?.filter(mark => {
            const paperSetting = subjectPaperSettings.find(ps => ps.id === mark.paper_setting_id);
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
        subjectId: subject.id,
        subjectName: subject.name,
        studentsSat,
        highestScore: studentsSat > 0 ? highestScoreInSubject : 0,
        lowestScore: studentsSat > 0 ? lowestScoreInSubject : 0,
        averageScore: studentsSat > 0 ? totalScoreForSubject / studentsSat : 0,
        totalMarksPossible: totalMarksPossibleForSubject,
      };
    }).filter(data => data.totalMarksPossible > 0);

    setAnalysisData(newAnalysisData);
    setIsAnalyzing(false);
  }, [selectedExamSessionId, selectedClassStreamId, examSessions, schoolPeriods, academicYears, classSubjectAllocations, subjects, students, studentExamResults, subjectPapers, t]);

  // Convert analysis data to subject performance format
  const subjectPerformanceData: SubjectPerformance[] = useMemo(() => {
    return analysisData.map((data, index) => ({
      rank: index + 1,
      name: data.subjectName,
      points: data.averageScore,
      change: Math.random() * 2 - 1, // Mock change data
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
    const session = examSessions?.find(s => s.id === selectedExamSessionId);
    return session?.name || 'Selected Exam';
  }, [examSessions, selectedExamSessionId]);

  const selectedStreamName = useMemo(() => {
    const stream = classStreams?.find(s => s.id === selectedClassStreamId);
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
              value={selectedClassStreamId || ''}
              onChange={(e) => setSelectedClassStreamId(e.target.value ? parseInt(e.target.value) : undefined)}
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
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-gray-500" />
                Performance of Form 1 streams
              </h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={initialMockStreamPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} domain={[3.5, 5]} />
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
              <h3 className="text-base font-semibold text-gray-900">Performance Over Time</h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={initialMockExamPerformanceOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="exam1" name="Exam 1" stroke="#3b82f6" strokeWidth={2} />
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
              { header: 'Highest Score', key: 'highestScore', render: (value: any, item: SubjectAnalysisData) => `${item.highestScore.toFixed(1)} / ${item.totalMarksPossible.toFixed(0)}` },
              { header: 'Lowest Score', key: 'lowestScore', render: (value: any, item: SubjectAnalysisData) => `${item.lowestScore.toFixed(1)} / ${item.totalMarksPossible.toFixed(0)}` },
              { header: 'Average Score', key: 'averageScore', render: (value: any, item: SubjectAnalysisData) => `${item.averageScore.toFixed(2)} / ${item.totalMarksPossible.toFixed(0)}` },
            ]} 
            data={analysisData} 
          />
        </Card>
      ) : (
        <Card>
          <div className="text-center text-gray-500 py-8">
            <ChartPieIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p>Select an exam session and class stream, then click "Load Analysis" to view results.</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ExamAnalysisPage;
