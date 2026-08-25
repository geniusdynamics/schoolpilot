import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { SelectOption } from '@/components/ui/Select';
import { DataGrid, DataGridColumn } from '@/components/ui/data';

import { logger } from '@/utils/logging';

interface PreNAMark {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  examId: string;
  examName: string;
  marks: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  remarks: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
}

interface EntryMarksManagementProps {
  onSave: (marks: Partial<PreNAMark>) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const EntryMarksManagement: React.FC<EntryMarksManagementProps> = ({
  onSave,
  onDelete,
  onCancel,
  loading = false,
}) => {
  const [marks, setMarks] = useState<PreNAMark[]>([
    {
      id: '1',
      studentId: 'student-001',
      studentName: 'John Doe',
      classId: 'class-1',
      className: 'Grade 10A',
      subjectId: 'math-101',
      subjectName: 'Mathematics',
      examId: 'exam-001',
      examName: 'Pre-NA Exam 2024',
      marks: 75,
      maxMarks: 100,
      percentage: 75,
      grade: 'C',
      remarks: 'Good performance',
      status: 'pending',
    },
    {
      id: '2',
      studentId: 'student-002',
      studentName: 'Jane Smith',
      classId: 'class-1',
      className: 'Grade 10A',
      subjectId: 'math-101',
      subjectName: 'Mathematics',
      examId: 'exam-001',
      examName: 'Pre-NA Exam 2024',
      marks: 82,
      maxMarks: 100,
      percentage: 82,
      grade: 'B',
      remarks: 'Excellent performance',
      status: 'submitted',
    },
  ]);

  const handleSubmit = (id: string) => {
    const mark = marks.find(m => m.id === id);
    if (mark) {
      onSave(mark);
    }
  };

  const handleDelete = (id: string) => {
    onDelete(id);
  };

  const handleCancel = () => {
    onCancel();
  };

  const statusOptions: SelectOption[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  const columns: DataGridColumn<PreNAMark>[] = [
    {
      key: 'studentName',
      header: 'Student Name',
      sortable: true,
      render: (value, item) => (
        <div>
          <span className="font-medium text-gray-900">{value}</span>
          <p className="text-xs text-gray-500">{item.className}</p>
        </div>
      ),
    },
    {
      key: 'subjectName',
      header: 'Subject',
      sortable: true,
    },
    {
      key: 'examName',
      header: 'Exam',
      sortable: true,
    },
    {
      key: 'marks',
      header: 'Marks',
      sortable: true,
      render: (value, item) => `${value}/${item.maxMarks}`,
    },
    {
      key: 'percentage',
      header: 'Percentage',
      sortable: true,
      render: (value) => `${value}%`,
    },
    {
      key: 'grade',
      header: 'Grade',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === 'approved' ? 'bg-green-100 text-green-800' :
          value === 'submitted' ? 'bg-blue-100 text-blue-800' :
          value === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {value}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pre-NA Marks Management</h2>
        <p className="text-sm text-gray-500 mt-1">Manage Pre-NA exam marks</p>
      </div>

      <Card>
        <DataGrid
          columns={columns}
          data={marks}
          sortable
          filterable
          loading={loading}
          actions={[
            {
              label: 'Save',
              onClick: (item) => handleSubmit(item.id),
              variant: 'primary' as const,
            },
            {
              label: 'Delete',
              onClick: (item) => handleDelete(item.id),
              variant: 'danger' as const,
            },
          ]}
          onEdit={(item) => {
            // Implement edit functionality
            logger.info('Edit:', item);
          }}
        />
      </Card>

      <div className="flex justify-end space-x-3">
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default EntryMarksManagement;