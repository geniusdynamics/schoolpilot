import React, { useState } from 'react';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { DataGrid, DataGridColumn } from '@/components/ui/data';

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
  const [marks] = useState<PreNAMark[]>([
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

  const columns: DataGridColumn<PreNAMark>[] = [
    {
      key: 'studentName',
      header: 'Student Name',
      sortable: true,
      render: (value, item) => (
        <div>
          <span className="font-medium text-surface-foreground">{value}</span>
          <p className="text-xs text-surface-muted-fg">{item.className}</p>
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
          value === 'submitted' ? 'bg-primary-100 text-primary-800' :
          value === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      sortable: false,
      filterable: false,
      render: (_value, item) => (
        <div className="flex space-x-2 justify-center">
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleSubmit(item.id)}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(item.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeaderWithTabs
        title="Pre-NA Marks Management"
        info="Manage Pre-NA exam marks"
      />

      <Card>
        <DataGrid
          columns={columns}
          data={marks}
          keyField="id"
          sortable
          filterable
          pagination={marks.length > 10}
          loading={loading}
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