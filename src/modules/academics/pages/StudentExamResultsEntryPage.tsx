import { logger } from '@/utils/logging';

// ABOUTME: This page component captures per-student marks for a selected exam session and class stream.
// ABOUTME: It reads configured session papers from AppDataContext and persists nested student result records.
import React, { useState, useEffect, useMemo } from 'react';
import { Student } from '@/types';
import { ExamPaperSetting, StudentPaperMark } from '@/modules/academics/data/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { getStudentsForExamEntry } from '@/utils/api';
import { useToast } from '@/hooks/useToast';

interface MarkInput {
  [studentId: string]: {
    [paperSettingId: string]: string | number; // Store as string for input, convert to number on save
  };
}

export const StudentExamResultsEntryPageContent: React.FC = () => {
  const {
    studentExamResults,
    students,
    examSessions,
    classStreams,
    loading,
    saveStudentExamResult,
  } = useAppData(); // Updated

  const [selectedExamSessionId, setSelectedExamSessionId] = useState<string | undefined>(undefined);
  const [selectedClassStreamId, setSelectedClassStreamId] = useState<number | undefined>(undefined);
  
  const [studentsForEntry, setStudentsForEntry] = useState<Student[]>([]);
  const [paperSettingsForSession, setPaperSettingsForSession] = useState<ExamPaperSetting[]>([]);
  const [marks, setMarks] = useState<MarkInput>({});
  
  const [pageLoading, setPageLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedExamSession = useMemo(
    () => (examSessions || []).find((session) => session.id === selectedExamSessionId),
    [examSessions, selectedExamSessionId]
  );

  useEffect(() => {
    if (selectedExamSessionId && selectedClassStreamId) {
      setPageLoading(true);
      
      try {
        // Get students for the selected class stream using AppDataContext
        const studs = getStudentsForExamEntry(students || [], selectedClassStreamId);
        setStudentsForEntry(studs || []);

        const sessionPapers = selectedExamSession?.paper_settings || [];
        setPaperSettingsForSession(sessionPapers);

        // Pre-fill marks
        const initialMarks: MarkInput = {};
        (studs || []).forEach((student: Student) => {
          initialMarks[student.id] = {};
          const existingResult = (studentExamResults || []).find(
            res => res.student_id === student.id && res.exam_session_id === selectedExamSessionId
          );
          sessionPapers.forEach(paperSetting => {
            const existingMark = existingResult?.marks?.find(m => m.paper_setting_id === paperSetting.id);
            initialMarks[student.id][paperSetting.id] = existingMark?.score?.toString() || '';
          });
        });
        setMarks(initialMarks);
        setPageLoading(false);
      } catch (error: any) {
        logger.error('Error loading students:', error);
        setStudentsForEntry([]);
        setPaperSettingsForSession([]);
        setMarks({});
        setPageLoading(false);
      }
    } else {
      setStudentsForEntry([]);
      setPaperSettingsForSession([]);
      setMarks({});
    }
  }, [selectedExamSession, selectedExamSessionId, selectedClassStreamId, studentExamResults, students]);

  const handleMarkChange = (studentId: string, paperSettingId: string, value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [paperSettingId]: value,
      }
    }));
  };

  const toast = useToast();
  const handleSaveAllMarks = async () => {
    if (!selectedExamSessionId || !selectedClassStreamId || studentsForEntry.length === 0) {
      toast.showWarning('Please select an exam session, class stream and ensure students are loaded.');
      return;
    }
    setSaving(true);

    try {
      for (const student of studentsForEntry) {
        const studentMarksForPapers: Array<Omit<StudentPaperMark, 'id' | 'student_exam_result_id'>> = [];
        let hasMarks = false;
        let totalMarks = 0;

        for (const paperSetting of paperSettingsForSession) {
          const scoreStr = marks[student.id]?.[paperSetting.id];
          if (scoreStr === undefined || scoreStr === '') {
            continue;
          }

          const score = parseFloat(String(scoreStr));
          if (Number.isNaN(score)) {
            continue;
          }

          if (score < 0 || score > paperSetting.marks_out_of) {
            toast.showWarning(`Score for ${student.first_name} ${student.last_name} in ${paperSetting.subject_paper_name || 'paper'} must be between 0 and ${paperSetting.marks_out_of}.`);
            return;
          }

          studentMarksForPapers.push({
            paper_setting_id: paperSetting.id,
            score,
          });
          totalMarks += score;
          hasMarks = true;
        }

        if (!hasMarks) {
          continue;
        }

        await saveStudentExamResult({
          student_id: student.id,
          exam_session_id: selectedExamSessionId,
          total_marks: totalMarks,
          marks: studentMarksForPapers,
        });
      }
      toast.showSuccess("Marks saved successfully! Weighted totals and grades are saved, and ranks still require further processing via 'Exam Analysis'.");
    } catch (error) {
      logger.error('Failed to save student exam results:', error);
      toast.showError('Unable to save the marks. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const tableColumns: DataGridColumn<Student>[] = useMemo(() => {
    const staticColumns: DataGridColumn<Student>[] = [
      { key: 'admission_no', header: 'Adm No' },
      { key: 'first_name', header: 'Student Name', render: (_value: any, item: Student) => [item.first_name, item.last_name].filter(Boolean).join(' ') || '—' },
    ];
    const dynamicPaperColumns: DataGridColumn<Student>[] = (paperSettingsForSession || []).map(paperSetting => ({
      key: `paper_${paperSetting.id}`,
      header: `${paperSetting.subject_name || 'Subject'} - ${paperSetting.subject_paper_name || 'Paper'} (/${paperSetting.marks_out_of})`,
      render: (_value: any, student: Student) => (
        <Input
          type="number"
          className="w-20 text-sm p-1"
          value={marks[student.id]?.[paperSetting.id] || ''}
          onChange={(e) => handleMarkChange(student.id, paperSetting.id, e.target.value)}
          max={paperSetting.marks_out_of}
          min={0}
        />
      ),
    }));
    return [...staticColumns, ...dynamicPaperColumns];
  }, [paperSettingsForSession, marks]);

  if (loading.students || loading.examSessions || loading.classStreams) {
      return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card title="Student Exam Results Entry" icon={<ListBulletIcon className="w-6 h-6 text-blue-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border rounded-md bg-gray-50">
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
            value={selectedClassStreamId != null ? String(selectedClassStreamId) : ''}
            onChange={(e) => setSelectedClassStreamId(e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={!selectedExamSessionId}
          >
            <option value="">-- Select Class Stream --</option>
            {(classStreams || []).map(cs => (
              <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.name}</option>
            ))}
          </Select>
        </div>

        {pageLoading ? (
          <div className="flex justify-center items-center py-10">
            <Spinner /> <span className="ml-2">Loading marks entry form...</span>
          </div>
        ) : selectedExamSessionId && selectedClassStreamId ? (
          studentsForEntry.length > 0 && paperSettingsForSession.length > 0 ? (
            <>
              <DataGrid columns={tableColumns} data={studentsForEntry} />
              <div className="mt-6 text-right">
                <Button onClick={handleSaveAllMarks} disabled={saving} leftIcon={saving ? <Spinner size="sm"/> : undefined}>
                  {saving ? 'Saving Marks...' : 'Save All Marks'}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-4">
              {studentsForEntry.length === 0 ? "No students in selected class stream." : ""}
              {paperSettingsForSession.length === 0 ? " No papers configured for this exam session." : ""}
            </p>
          )
        ) : (
          <p className="text-center text-gray-500 py-4">Please select an exam session and class stream to enter marks.</p>
        )}
      </Card>
    </div>
  );
};

const StudentExamResultsEntryPage: React.FC = () => (
  <div className="space-y-6">
    <StudentExamResultsEntryPageContent />
  </div>
);

export default StudentExamResultsEntryPage;
