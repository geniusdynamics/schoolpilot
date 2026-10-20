import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';

import Spinner from '@/components/ui/Spinner';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import type { BoardExamResult } from '../data/types';
import { logger } from '@/utils/logging';
import { DocumentTextIcon, PlusIcon } from '@/components/ui/icons';
import { useToast } from '@/hooks/useToast';

import { formatDate } from '@/utils/format';
export const BoardExamResultsPageContent: React.FC = () => {
  const { students, loading } = useAppData();

  const resultsCollection = useDatabaseCollection<BoardExamResult>('board_exam_results');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<BoardExamResult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('');

  const initialFormData: Partial<BoardExamResult> = {
    student_id: '',
    board_exam_type: 'IGCSE',
    subject_name: '',
    paper_code: '',
    grade: '',
    marks_obtained: 0,
    max_marks: 100,
    exam_date: new Date().toISOString().split('T')[0],
    center_number: '',
    candidate_number: ''
  };
  const [formData, setFormData] = useState<Partial<BoardExamResult>>(initialFormData);

  // Live collection data from board_exam_results
  const mockBoardResults: BoardExamResult[] = useMemo(() => {
    let filtered = resultsCollection.data;

    if (searchTerm) {
      filtered = filtered.filter(result => 
        (result.student_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (result.admission_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (result.subject_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    if (examTypeFilter) {
      filtered = filtered.filter(result => result.board_exam_type === examTypeFilter);
    }

    return filtered;
  }, [resultsCollection.data, searchTerm, examTypeFilter]);

  const openModal = (result?: BoardExamResult) => {
    setEditingResult(result || null);
    setFormData(result ? {
      student_id: result.student_id,
      board_exam_type: result.board_exam_type,
      subject_name: result.subject_name,
      paper_code: result.paper_code,
      grade: result.grade,
      marks_obtained: result.marks_obtained,
      max_marks: result.max_marks,
      exam_date: result.exam_date,
      center_number: result.center_number,
      candidate_number: result.candidate_number
    } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingResult(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'marks_obtained' || name === 'max_marks' ? Number(value) : value 
    }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.student_id || !formData.subject_name) {
      toast.showWarning('Student and subject are required.');
      return;
    }

    const student = students?.find(s => String(s.id) === String(formData.student_id));
    const studentName = student ? `${student.first_name} ${student.last_name}`.trim() : '';
    const marksObtained = Number(formData.marks_obtained ?? 0);
    const maxMarks = Number(formData.max_marks ?? 100);
    const percentage = maxMarks > 0 ? Math.round((marksObtained / maxMarks) * 10000) / 100 : 0;

    try {
      if (editingResult) {
        await resultsCollection.update(editingResult.id, {
          student_id: formData.student_id,
          student_name: studentName || editingResult.student_name,
          admission_no: student?.admission_no ?? editingResult.admission_no,
          board_exam_type: formData.board_exam_type,
          subject_name: formData.subject_name,
          paper_code: formData.paper_code,
          grade: formData.grade,
          marks_obtained: marksObtained,
          max_marks: maxMarks,
          percentage,
          exam_date: formData.exam_date,
          center_number: formData.center_number,
          candidate_number: formData.candidate_number
        });
        toast.showSuccess('Board exam result updated.');
      } else {
        await resultsCollection.insert({
          student_id: formData.student_id!,
          student_name: studentName,
          admission_no: student?.admission_no ?? '',
          board_exam_type: formData.board_exam_type ?? 'Other',
          subject_name: formData.subject_name!,
          paper_code: formData.paper_code ?? '',
          grade: formData.grade ?? '',
          marks_obtained: marksObtained,
          max_marks: maxMarks,
          percentage,
          exam_date: formData.exam_date ?? new Date().toISOString().split('T')[0],
          center_number: formData.center_number ?? '',
          candidate_number: formData.candidate_number ?? '',
          entered_at: new Date().toISOString()
        });
        toast.showSuccess('Board exam result added.');
      }
      logger.info('Saved board exam result:', formData);
    } catch (err) {
      logger.error('Failed to save board exam result:', err);
      toast.showError('Failed to save board exam result.');
    }
    closeModal();
  };

  const getExamTypeBadge = (type: string) => {
    const styles = {
      'IGCSE': 'bg-primary-100 text-primary-800',
      'A-Level': 'bg-purple-100 text-purple-800',
      'IB': 'bg-green-100 text-green-800',
      'SAT': 'bg-orange-100 text-orange-800',
      'Other': 'bg-surface-accent text-surface-foreground'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type as keyof typeof styles]}`}>
        {type}
      </span>
    );
  };

  const columns: DataGridColumn<BoardExamResult>[] = [
    {
      key: 'student_name',
      header: 'Student Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'admission_no',
      header: 'Admission No',
      sortable: true,
      filterable: true
    },
    {
      key: 'board_exam_type',
      header: 'Exam Type',
      sortable: true,
      filterable: true,
      render: (value) => getExamTypeBadge(value)
    },
    {
      key: 'subject_name',
      header: 'Subject',
      sortable: true,
      filterable: true
    },
    {
      key: 'paper_code',
      header: 'Paper Code',
      sortable: true,
      filterable: true
    },
    {
      key: 'grade',
      header: 'Grade',
      sortable: true,
      render: (value) => <span className="font-semibold">{value}</span>
    },
    {
      key: 'marks_obtained',
      header: 'Marks',
      sortable: true,
      render: (value, result) => `${value}/${result.max_marks}`
    },
    {
      key: 'percentage',
      header: 'Percentage',
      sortable: true,
      render: (value) => `${value.toFixed(1)}%`
    },
    {
      key: 'exam_date',
      header: 'Exam Date',
      sortable: true,
      render: (value) => value ? formatDate(value) : '-'
    }
  ];

  const examTypes = ['IGCSE', 'A-Level', 'IB', 'SAT', 'Other'];

  const totals = useMemo(() => {
    return {
      total: mockBoardResults.length,
      igcse: mockBoardResults.filter(r => r.board_exam_type === 'IGCSE').length,
      aLevel: mockBoardResults.filter(r => r.board_exam_type === 'A-Level').length,
      ib: mockBoardResults.filter(r => r.board_exam_type === 'IB').length,
      sat: mockBoardResults.filter(r => r.board_exam_type === 'SAT').length
    };
  }, [mockBoardResults]);

  if ((loading?.all || resultsCollection.loading) && mockBoardResults.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading board exam results...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-surface-foreground">Board Exam Results</h1>
        <Button onClick={() => openModal()} variant="primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Result
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start gap-3">
            <DocumentTextIcon className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-indigo-800">External Board Exam Result Entry</h3>
              <p className="text-sm text-indigo-700 mt-1">
                Enter and manage external board exam results (IGCSE, A-Level, IB, SAT, etc.) for students. 
                This tracks performance in external examinations separate from internal school assessments.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <DocumentTextIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Results</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <span className="text-sm font-medium">IGCSE</span>
            </div>
            <p className="text-2xl font-bold text-primary-600 mt-2">
              {totals.igcse}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <span className="text-sm font-medium">A-Level</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              {totals.aLevel}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <span className="text-sm font-medium">IB</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.ib}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <span className="text-sm font-medium">SAT</span>
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-2">
              {totals.sat}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Exam Type</label>
            <select
              value={examTypeFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExamTypeFilter(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            >
              <option value="">All Types</option>
              {examTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Student, admission, subject..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockBoardResults}
          columns={columns}
        />
      </Card>

      {/* Add/Edit Result Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingResult ? 'Edit Board Exam Result' : 'Add Board Exam Result'}
      >
        <FormSection>
          <FormField label="Student" required>
            <select
              name="student_id"
              value={formData.student_id}
              onChange={handleInputChange}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            >
              <option value="">Select student</option>
              {students?.map(student => (
                <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Board Exam Type" required>
            <select
              name="board_exam_type"
              value={formData.board_exam_type}
              onChange={handleInputChange}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            >
              {examTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Subject" required>
            <input
              type="text"
              name="subject_name"
              value={formData.subject_name}
              onChange={handleInputChange}
              placeholder="e.g., Mathematics"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Paper Code">
            <input
              type="text"
              name="paper_code"
              value={formData.paper_code}
              onChange={handleInputChange}
              placeholder="e.g., 0580/42"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Grade">
            <input
              type="text"
              name="grade"
              value={formData.grade}
              onChange={handleInputChange}
              placeholder="e.g., A*, A, B, 6, 750"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Marks Obtained">
            <input
              type="number"
              name="marks_obtained"
              value={formData.marks_obtained}
              onChange={handleInputChange}
              min="0"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Max Marks">
            <input
              type="number"
              name="max_marks"
              value={formData.max_marks}
              onChange={handleInputChange}
              min="0"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Exam Date">
            <input
              type="date"
              name="exam_date"
              value={formData.exam_date}
              onChange={handleInputChange}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Center Number">
            <input
              type="text"
              name="center_number"
              value={formData.center_number}
              onChange={handleInputChange}
              placeholder="e.g., KE001"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Candidate Number">
            <input
              type="text"
              name="candidate_number"
              value={formData.candidate_number}
              onChange={handleInputChange}
              placeholder="e.g., 12345"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="primary">
            {editingResult ? 'Update' : 'Add'}
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};
const BoardExamResultsPage: React.FC = () => (
  <div className="space-y-6">
    <BoardExamResultsPageContent />
  </div>
);

export default BoardExamResultsPage;
