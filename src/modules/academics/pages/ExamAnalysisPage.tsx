import React, { useState, useMemo, useCallback } from 'react';
import { ClassStream, Student, AcademicYear, SchoolPeriod } from '@/types';
import { AcademicsExamSessionType as ExamSession, AcademicsStudentExamResultWithDetailsType as StudentExamResultWithDetails, AcademicsSubjectPaperType as SubjectPaper, AcademicsExamPaperSettingType as ExamPaperSetting, AcademicsClassSubjectAllocationType as ClassSubjectAllocation, AcademicsSubjectType as Subject } from '@/types'; 
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { ChartPieIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; 
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

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
  const {
    examSessions,
    classStreams,
    students,
    studentExamResults,
    subjects,
    subjectPapers, // Needed to link subject_paper_id to subject_id
    classSubjectAllocations, // To find subjects for a class stream
    academicYears, // To find academic year for allocations
    schoolPeriods, // To link exam session to academic year
    loading,
  } = useAppData(); // Updated

  const [selectedExamSessionId, setSelectedExamSessionId] = useState<string | undefined>();
  const [selectedClassStreamId, setSelectedClassStreamId] = useState<number | undefined>();
  const [analysisData, setAnalysisData] = useState<SubjectAnalysisData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleLoadAnalysis = useCallback(() => {
    if (!selectedExamSessionId || !selectedClassStreamId) {
      alert("Please select an Exam Session and a Class Stream.");
      return;
    }
    setIsAnalyzing(true);

    const selectedSession = examSessions.find(es => es.id === selectedExamSessionId);
    if (!selectedSession) {
        setIsAnalyzing(false);
        console.warn("Selected exam session not found.");
        setAnalysisData([]);
        return;
    }
    
    const currentSchoolPeriod = schoolPeriods.find(sp => sp.id === selectedSession.school_period_id);
    const currentAcademicYear = academicYears.find(ay => ay.id === currentSchoolPeriod?.academic_year_id);
    if (!currentAcademicYear) {
        setIsAnalyzing(false);
        console.warn("Academic year for the session not found.");
        setAnalysisData([]);
        return;
    }

    const allocatedSubjectsForStream = classSubjectAllocations
      .filter(csa => csa.class_stream_id === selectedClassStreamId && csa.academic_year_id === currentAcademicYear.id)
      .map(csa => subjects.find(s => s.id === csa.subject_id))
      .filter((s): s is Subject => !!s);


    const studentsInStream = students.filter(s => s.current_class_stream_id === selectedClassStreamId);
    const resultsForSessionAndStream = studentExamResults.filter(
      res => res.exam_session_id === selectedExamSessionId && studentsInStream.some(s => s.id === res.student_id)
    );

    const newAnalysisData = allocatedSubjectsForStream.map(subject => {
      let studentsSat = 0;
      let totalScoreForSubject = 0;
      let highestScoreInSubject = 0;
      let lowestScoreInSubject = Infinity; 
      let totalMarksPossibleForSubject = 0;

      const subjectPaperSettings = (selectedSession.paper_settings || []).filter(ps => {
        const paper = subjectPapers.find(sp => sp.id === ps.subject_paper_id);
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
    }).filter(data => data.totalMarksPossible > 0); // Only show subjects that were actually in the exam

    setAnalysisData(newAnalysisData);
    setIsAnalyzing(false);
  }, [selectedExamSessionId, selectedClassStreamId, examSessions, schoolPeriods, academicYears, classSubjectAllocations, subjects, students, studentExamResults, subjectPapers]);

  const analysisTableColumns = [
    { header: 'Subject Name', accessor: 'subjectName' as keyof SubjectAnalysisData },
    { header: 'Students Sat', accessor: 'studentsSat' as keyof SubjectAnalysisData },
    { header: 'Highest Score', accessor: 'highestScore' as keyof SubjectAnalysisData, render: (item:SubjectAnalysisData) => `${item.highestScore.toFixed(1)} / ${item.totalMarksPossible.toFixed(0)}` },
    { header: 'Lowest Score', accessor: 'lowestScore' as keyof SubjectAnalysisData, render: (item:SubjectAnalysisData) => `${item.lowestScore.toFixed(1)} / ${item.totalMarksPossible.toFixed(0)}` },
    { header: 'Average Score', accessor: 'averageScore' as keyof SubjectAnalysisData, render: (item:SubjectAnalysisData) => `${item.averageScore.toFixed(2)} / ${item.totalMarksPossible.toFixed(0)}` },
  ];
  
  const isLoadingPage = loading.examSessions || loading.classStreams || loading.students || loading.studentExamResults || loading.subjects || loading.subjectPapers || loading.classSubjectAllocations || loading.academicYears || loading.schoolPeriods;

  if (isLoadingPage && !isAnalyzing) {
     return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card title="Exam Results Analysis">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-gray-50">
          <Select
            label="Select Exam Session"
            value={selectedExamSessionId || ''}
            onChange={(e) => setSelectedExamSessionId(e.target.value || undefined)}
          >
            <option value="">-- Select Exam Session --</option>
            {examSessions.map(session => (
              <option key={session.id} value={session.id}>{session.name} ({session.school_period_name})</option>
            ))}
          </Select>
          <Select
            label="Select Class Stream"
            value={selectedClassStreamId || ''}
            onChange={(e) => setSelectedClassStreamId(e.target.value ? parseInt(e.target.value) : undefined)}
          >
            <option value="">-- Select Class Stream --</option>
            {classStreams.map(cs => (
              <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.name}</option>
            ))}
          </Select>
          <div className="md:pt-6">
            <Button 
              onClick={handleLoadAnalysis} 
              disabled={!selectedExamSessionId || !selectedClassStreamId || isAnalyzing}
              leftIcon={isAnalyzing ? <Spinner size="sm"/> : <ChartPieIcon className="w-5 h-5"/>}
            >
              {isAnalyzing ? 'Analyzing...' : 'Load Analysis'}
            </Button>
          </div>
        </div>

        {isAnalyzing ? (
          <div className="flex justify-center items-center py-10">
            <Spinner /> <span className="ml-2">Processing exam data...</span>
          </div>
        ) : analysisData.length > 0 ? (
          <Table columns={analysisTableColumns} data={analysisData} />
        ) : (
          <p className="text-center text-gray-500 py-4">
            Select an exam session and class stream, then click "Load Analysis" to view results.
          </p>
        )}
      </Card>
    </div>
  );
};

export default ExamAnalysisPage;
