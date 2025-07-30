import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, ClassStream } from '@/types';
import { StudentExamResultWithDetails, StudentPaperMarkWithDetails, ExamSession, ExamPaperSetting, SubjectPaper, StudentPaperMark } from '@/modules/academics/data/types'; // Corrected imports
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { getStudentsForExamEntry } from '@/api/students';

interface MarkInput {
  [studentId: string]: {
    [paperSettingId: string]: string | number; // Store as string for input, convert to number on save
  };
}

const StudentExamResultsEntryPage: React.FC = () => {
  const {
    studentExamResults,
    students,
    examSessions,
    classStreams,
    loading,
  } = useAppData(); // Updated

  const [selectedExamSessionId, setSelectedExamSessionId] = useState<string | undefined>(undefined);
  const [selectedClassStreamId, setSelectedClassStreamId] = useState<number | undefined>(undefined);
  
  const [studentsForEntry, setStudentsForEntry] = useState<Student[]>([]);
  const [paperSettingsForSession, setPaperSettingsForSession] = useState<ExamPaperSetting[]>([]);
  const [marks, setMarks] = useState<MarkInput>({});
  
  const [pageLoading, setPageLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedExamSessionId && selectedClassStreamId) {
      setPageLoading(true);
      
      try {
        // Get students for the selected class stream using AppDataContext
        const studs = getStudentsForExamEntry(students || [], selectedClassStreamId);
        setStudentsForEntry(studs || []);
        
        // Mock paper settings - in real implementation, this would come from API
        const mockPapers: ExamPaperSetting[] = [
          {
            id: '1',
            exam_session_id: selectedExamSessionId,
            subject_paper_id: 1,
            subject_name: 'Mathematics',
            subject_paper_name: 'Paper 1',
            marks_out_of: 100,
            weight_percentage: 50,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: '2',
            exam_session_id: selectedExamSessionId,
            subject_paper_id: 2,
            subject_name: 'English',
            subject_paper_name: 'Paper 1',
            marks_out_of: 100,
            weight_percentage: 50,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ];
        setPaperSettingsForSession(mockPapers);

        // Pre-fill marks
        const initialMarks: MarkInput = {};
        (studs || []).forEach((student: Student) => {
          initialMarks[student.id] = {};
          const existingResult = (studentExamResults || []).find(
            res => res.student_id === student.id && res.exam_session_id === selectedExamSessionId
          );
          mockPapers.forEach(paperSetting => {
            const existingMark = existingResult?.marks?.find(m => m.paper_setting_id === paperSetting.id);
            initialMarks[student.id][paperSetting.id] = existingMark?.score?.toString() || '';
          });
        });
        setMarks(initialMarks);
        setPageLoading(false);
      } catch (error: any) {
        console.error('Error loading students:', error);
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
  }, [selectedExamSessionId, selectedClassStreamId, studentExamResults, students]);

  const handleMarkChange = (studentId: string, paperSettingId: string, value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [paperSettingId]: value,
      }
    }));
  };

  const handleSaveAllMarks = async () => {
    if (!selectedExamSessionId || !selectedClassStreamId || studentsForEntry.length === 0) {
      alert('Please select an exam session, class stream and ensure students are loaded.');
      return;
    }
    setSaving(true);

    for (const student of studentsForEntry) {
      const studentMarksForPapers: Array<Omit<StudentPaperMark, 'id' | 'student_exam_result_id'>> = [];
      let studentTotalMarks = 0;
      let hasMarks = false;

      paperSettingsForSession.forEach(paperSetting => {
        const scoreStr = marks[student.id]?.[paperSetting.id];
        if (scoreStr !== undefined && scoreStr !== '') {
          const score = parseFloat(String(scoreStr));
          if (!isNaN(score)) {
            studentMarksForPapers.push({
              paper_setting_id: paperSetting.id,
              score: score,
            });
            studentTotalMarks += score; // Simple sum, actual total might involve weighting
            hasMarks = true;
          }
        }
      });
      
      if (hasMarks) { // Only save if there's at least one mark for the student
        const resultPayload = {
          student_id: student.id,
          exam_session_id: selectedExamSessionId,
          total_marks: studentTotalMarks, // This would be more complex with weighting and grading schemes
          // mean_grade, class_rank, stream_rank would be calculated later in an "Analyze Results" step
        };
        // TODO: Implement saveStudentExamResult API call
        console.log('Would save result:', resultPayload, studentMarksForPapers);
      }
    }
    setSaving(false);
    alert("Marks saved successfully! (Note: Totals and ranks require further processing via 'Exam Analysis')");
    // Optionally, refetch results to show any calculated totals if saveStudentExamResult updates them
  };


  const tableColumns: DataGridColumn<Student>[] = useMemo(() => {
    const staticColumns: DataGridColumn<Student>[] = [
      { key: 'admission_no', header: 'Adm No' },
      { key: 'first_name', header: 'Student Name', render: (value: any, item: Student) => `${item.first_name} ${item.last_name}` },
    ];
    const dynamicPaperColumns: DataGridColumn<Student>[] = (paperSettingsForSession || []).map(paperSetting => ({
      key: `paper_${paperSetting.id}`,
      header: `${paperSetting.subject_name || 'Subject'} - ${paperSetting.subject_paper_name || 'Paper'} (/${paperSetting.marks_out_of})`,
      render: (value: any, student: Student) => (
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
            value={selectedClassStreamId || ''}
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

export default StudentExamResultsEntryPage;
