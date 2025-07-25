// ABOUTME: This page component displays exam results in a horizontal (marksheet) format.
// ABOUTME: It allows filtering by exam session and class stream to generate the report.

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { ChartPieIcon, PrinterIcon, DownloadIcon as ExportIcon } from '@/components/ui/icons'; 
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '@/components/ui/Spinner';
import Table from '@/components/ui/Table';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { Student, Class as SchoolClass, ClassStream } from '@/types'; 
import { AcademicsExamSessionType as ExamSession, AcademicsStudentExamResultWithDetailsType as StudentExamResultWithDetails, AcademicsExamPaperSettingType as ExamPaperSetting } from '@/types'; 


interface ReportRow {
  studentId: string;
  studentName: string;
  admissionNo: string;
  [subjectPaperKey: string]: string | number | undefined; 
  totalMarks?: number;
  meanGrade?: string; 
  rank?: number; 
}

const ExamResultsHorizontalPage: React.FC = () => {
  const { t } = useTranslation(['reports', 'common']); 
  const { students, examSessions, classes, classStreams, studentExamResults, loading } = useAppData();

  const [selectedExamSessionId, setSelectedExamSessionId] = useState<string | undefined>();
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>();
  const [selectedStreamId, setSelectedStreamId] = useState<number | undefined>();
  
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [dynamicColumns, setDynamicColumns] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableStreams = useMemo(() => {
    if (!selectedClassId) return (classStreams || []);
    return (classStreams || []).filter(cs => cs.class_id === selectedClassId);
  }, [selectedClassId, classStreams]);

  const handleGenerateReport = useCallback(() => {
    if (!selectedExamSessionId || !selectedStreamId) {
      alert(t('examResultsHorizontal.alertSelectSessionStream', { ns: 'reports' }));
      setReportData([]);
      setDynamicColumns([]);
      return;
    }
    setIsGenerating(true);

    try {
      const currentSession = (examSessions || []).find(es => es.id === selectedExamSessionId);
      if (!currentSession || !currentSession.paper_settings) {
          console.warn("Selected exam session not found or has no paper settings.");
          setReportData([]);
          setDynamicColumns([]);
          setIsGenerating(false); 
          return;
      }
      
      const paperSettings = (currentSession?.paper_settings || []); 

      const newDynamicColumns = [
          { header: t('tableHeaders.admNo'), key: 'admissionNo' as keyof ReportRow },
          { header: t('tableHeaders.studentName'), key: 'studentName' as keyof ReportRow },
          ...(paperSettings || []).map(ps => ({
              header: `${(ps.subject_name || 'N/A').substring(0,5)} - ${(ps.subject_paper_name || 'N/A').substring(0,7)} (${ps.marks_out_of || 'N/A'})`, 
              key: `paper_${ps.id}` as keyof ReportRow, 
              id: `paper_${ps.id}`, 
          })),
          { header: t('tableHeaders.totalMarks'), key: 'totalMarks' as keyof ReportRow },
          { header: t('tableHeaders.meanGrade'), key: 'meanGrade' as keyof ReportRow },
          { header: t('tableHeaders.rank'), key: 'rank' as keyof ReportRow }, 
      ];
      setDynamicColumns(newDynamicColumns);

      const studentsInStream = (students || []).filter(s => s.current_class_stream_id === selectedStreamId);
      const resultsForSessionAndStream = (studentExamResults || []).filter(
        res => res.exam_session_id === selectedExamSessionId && (studentsInStream || []).some(s => s.id === res.student_id)
      );
      
      const newReportData: ReportRow[] = (studentsInStream || []).map(student => {
        const result = (resultsForSessionAndStream || []).find(res => res.student_id === student.id);
        const row: ReportRow = {
          studentId: student.id,
          studentName: `${student.first_name} ${student.last_name}`,
          admissionNo: student.admission_no,
          totalMarks: result?.total_marks || 0,
          meanGrade: result?.mean_grade || '-',
          rank: result?.stream_rank || 0, 
        };
        (paperSettings || []).forEach(ps => {
          const mark = result?.marks?.find(m => m.paper_setting_id === ps.id);
          row[`paper_${ps.id}`] = mark?.score !== undefined ? mark.score : '-';
        });
        return row;
      });

      (newReportData || []).sort((a, b) => (b.totalMarks || 0) - (a.totalMarks || 0));
      (newReportData || []).forEach((row, index) => {
        row.rank = index + 1; 
      });

      setReportData(newReportData);
    } catch (error) {
        console.error("Error generating report:", error);
        setReportData([]);
        setDynamicColumns([]);
    } finally {
        setIsGenerating(false);
    }
  }, [selectedExamSessionId, selectedStreamId, examSessions, students, studentExamResults, t]);
  

  const isLoadingPage = loading.students || loading.examSessions || loading.classes || loading.classStreams || loading.studentExamResults;

  return (
    <div className="space-y-6">
      <Card title={t('examResultsHorizontal.title')}>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 border rounded-md bg-gray-50 filter-section">
            <Select
                label={t('examResultsHorizontal.examSession')}
                value={selectedExamSessionId || ''}
                onChange={e => setSelectedExamSessionId(e.target.value || undefined)}
            >
                <option value="">{t('examResultsHorizontal.optionSelectExamSession')}</option>
                {(examSessions || []).map(session => (
                <option key={session.id} value={session.id}>{session.name} ({session.school_period_name})</option>
                ))}
            </Select>
            <Select
                label={t('examResultsHorizontal.class')}
                value={selectedClassId || ''}
                onChange={e => {setSelectedClassId(Number(e.target.value) || undefined); setSelectedStreamId(undefined);}}
            >
                <option value="">{t('examResultsHorizontal.optionAllClasses')}</option>
                {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select
                label={t('examResultsHorizontal.stream')}
                value={selectedStreamId || ''}
                onChange={e => setSelectedStreamId(Number(e.target.value) || undefined)}
                disabled={!selectedClassId}
            >
                <option value="">{t('examResultsHorizontal.optionAllStreams')}</option>
                {(availableStreams || []).map(cs => <option key={cs.id} value={cs.id}>{cs.name}</option>)}
            </Select>
            <Button 
                onClick={handleGenerateReport} 
                disabled={!selectedExamSessionId || !selectedStreamId || isGenerating || isLoadingPage} 
                className="self-end h-10"
                leftIcon={isGenerating ? <Spinner size="sm"/> : <ChartPieIcon className="w-5 h-5"/>}
            >
              {isGenerating ? t('examResultsHorizontal.generatingReport') : t('examResultsHorizontal.generateReport')}
            </Button>
        </div>

        {isLoadingPage && !isGenerating ? (
            <div className="flex justify-center items-center py-10"><Spinner size="lg" /><span className="ml-2">{t('examResultsHorizontal.loadingData')}</span></div>
        ) : isGenerating ? (
            <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">{t('examResultsHorizontal.generatingReport')}</span></div>
        ) : reportData.length > 0 && dynamicColumns.length > 0 ? (
            <>
                 <div className="flex justify-end space-x-2 mb-4 print-hide">
                    <Button variant="secondary" size="sm" onClick={() => window.print()} leftIcon={<PrinterIcon className="w-4 h-4"/>}>{t('examResultsHorizontal.print')}</Button>
                    <Button variant="secondary" size="sm" onClick={() => alert(t('messages.csvExportToBeDeveloped'))} leftIcon={<ExportIcon className="w-4 h-4"/>}>{t('examResultsHorizontal.exportCSV')}</Button>
                </div>
                <Table columns={dynamicColumns} data={(reportData || [])} isLoading={isGenerating} />
            </>
        ) : (
            <p className="text-center text-gray-500 py-4">
                {t('examResultsHorizontal.selectFiltersMessage')}
            </p>
        )}
      </Card>
    </div>
  );
};
export default ExamResultsHorizontalPage;
