import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import Spinner from '@/components/ui/Spinner';
import { initialMockExamGazettes } from '../data/mockData';
import type { ExamGazette } from '../data/types';
import { logger } from '@/utils/logging';
import { DocumentTextIcon, DownloadIcon, PrinterIcon } from '@/components/ui/icons';

export const ExamGazettePageContent: React.FC = () => {
  const { loading } = useAppData();

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Use centralized mock data (in production, this would come from useAppData)
  const mockGazettes: ExamGazette[] = useMemo(() => {
    let filtered = initialMockExamGazettes;

    if (selectedSession) {
      filtered = filtered.filter(g => g.exam_session_id === selectedSession);
    }

    if (selectedClass) {
      filtered = filtered.filter(g => g.class_id === selectedClass);
    }

    return filtered;
  }, [selectedSession, selectedClass]);

  const handlePrint = (gazette: ExamGazette) => {
    logger.info('Printing gazette:', gazette.id);
    // In production, this would trigger print dialog
  };

  const handleDownload = (gazette: ExamGazette) => {
    logger.info('Downloading gazette:', gazette.id);
    // In production, this would download PDF
  };

  const columns: DataGridColumn<ExamGazette>[] = [
    {
      key: 'exam_session_name',
      header: 'Exam Session',
      sortable: true,
      filterable: true
    },
    {
      key: 'class_name',
      header: 'Class',
      sortable: true,
      filterable: true
    },
    {
      key: 'total_students',
      header: 'Total Students',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'generated_at',
      header: 'Generated',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_, gazette) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => handlePrint(gazette)}>
            <PrinterIcon className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleDownload(gazette)}>
            <DownloadIcon className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const uniqueSessions = useMemo(() => {
    const sessions = [...new Set(mockGazettes.map(g => g.exam_session_id))];
    return sessions.map(id => mockGazettes.find(g => g.exam_session_id === id)?.exam_session_name || id);
  }, [mockGazettes]);

  const uniqueClasses = useMemo(() => {
    const classes = [...new Set(mockGazettes.map(g => g.class_id))];
    return classes.map(id => mockGazettes.find(g => g.class_id === id)?.class_name || id);
  }, [mockGazettes]);

  if (loading?.all && mockGazettes.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading exam gazettes...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6 text-amber-600" />
            <span>Exam Gazette</span>
          </div>
        }
      >
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <DocumentTextIcon className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">Class-wise Gazette Report</h3>
              <p className="text-sm text-amber-700 mt-1">
                The Exam Gazette provides a comprehensive class-wise report showing all students, their marks across all subjects, 
                overall performance, and class rankings. This is the official examination results publication.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Session</label>
            <select
              value={selectedSession}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSession(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Sessions</option>
              {uniqueSessions.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClass(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        <DataGrid
          data={mockGazettes}
          columns={columns}
        />

        {/* Detailed Gazette View */}
        {mockGazettes.length === 1 && (
          <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {mockGazettes[0].exam_session_name} - {mockGazettes[0].class_name}
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => handlePrint(mockGazettes[0])}>
                  <PrinterIcon className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleDownload(mockGazettes[0])}>
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left text-sm font-semibold border">Rank</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold border">Admission No</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold border">Student Name</th>
                  {mockGazettes[0].subjects.map(subject => (
                    <th key={subject.id} className="px-4 py-2 text-center text-sm font-semibold border">
                      {subject.subject_name}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-center text-sm font-semibold border">Total</th>
                  <th className="px-4 py-2 text-center text-sm font-semibold border">Average</th>
                  <th className="px-4 py-2 text-center text-sm font-semibold border">Grade</th>
                </tr>
              </thead>
              <tbody>
                {mockGazettes[0].students.map(student => (
                  <tr key={student.id} className="border-b">
                    <td className="px-4 py-2 font-semibold">{student.rank}</td>
                    <td className="px-4 py-2">{student.admission_no}</td>
                    <td className="px-4 py-2">{student.student_name}</td>
                    {mockGazettes[0].subjects.map(subject => (
                      <td key={subject.id} className="px-4 py-2 text-center">
                        {subject.marks_obtained}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center font-semibold">{student.total_marks}</td>
                    <td className="px-4 py-2 text-center">{student.average}%</td>
                    <td className="px-4 py-2 text-center font-semibold">{student.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
const ExamGazettePage: React.FC = () => (
  <div className="space-y-6">
    <ExamGazettePageContent />
  </div>
);

export default ExamGazettePage;
