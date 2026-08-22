import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { IdentificationIcon, UserIcon, PrinterIcon, DownloadIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { StudentIDCard } from '../data/types';

import { logger } from '@/utils/logging';

const StudentIDCardsPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const { studentIDCards, students, classes, loading } = useAppData();

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentIDCard | null>(null);

  const mockStudents: StudentIDCard[] = useMemo(() => {
    let filtered = studentIDCards || [];

    if (selectedClass) {
      filtered = filtered.filter(s => s.class_id === selectedClass);
    }

    if (searchTerm) {
      filtered = filtered.filter(s =>
        (s.student_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (s.admission_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [selectedClass, searchTerm]);

  const handlePrintCard = (student: StudentIDCard) => {
    setSelectedStudent(student);
    logger.info('Printing ID card for:', student.student_name);
    // In production, this would trigger print dialog for the ID card
  };

  const handleDownloadCard = (student: StudentIDCard) => {
    logger.info('Downloading ID card for:', student.student_name);
    // In production, this would download the ID card as PDF/image
  };

  const handlePrintAll = () => {
    logger.info('Printing all ID cards for class:', selectedClass || 'all classes');
    // In production, this would print all filtered ID cards
  };

  const columns: DataGridColumn<StudentIDCard>[] = [
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
      key: 'class_name',
      header: 'Class',
      sortable: true,
      filterable: true
    },
    {
      key: 'section',
      header: 'Section',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'roll_number',
      header: 'Roll No',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'dob',
      header: 'Date of Birth',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'blood_group',
      header: 'Blood Group',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => handlePrintCard(record)}>
            <PrinterIcon className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleDownloadCard(record)}>
            <DownloadIcon className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const uniqueClasses = useMemo(() => {
    const classIds = [...new Set(mockStudents.map(s => s.class_id))];
    return classIds.map(id => mockStudents.find(s => s.class_id === id)?.class_name || id);
  }, [mockStudents]);

  if (loading?.all && mockStudents.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading student records...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Student ID Cards</h1>
        <Button onClick={handlePrintAll} variant="primary">
          <PrinterIcon className="w-4 h-4 mr-2" />
          Print All
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-3">
            <IdentificationIcon className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-800">Generate Printable ID Cards</h3>
              <p className="text-sm text-purple-700 mt-1">
                Generate and print student ID cards with photos, class information, and emergency contacts. 
                Print individual cards or bulk print for entire classes.
              </p>
            </div>
          </div>
        </div>

        {/* ID Card Preview */}
        {selectedStudent && (
          <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">ID Card Preview: {selectedStudent.student_name}</h3>
            <div className="border-2 border-gray-300 rounded-lg p-6 max-w-sm mx-auto bg-gradient-to-br from-purple-50 to-blue-50">
              <div className="text-center mb-4">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <UserIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h4 className="text-xl font-bold text-gray-800">{selectedStudent.student_name}</h4>
                <p className="text-sm text-gray-600">{selectedStudent.admission_no}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Class:</span>
                  <span className="font-semibold">{selectedStudent.class_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Section:</span>
                  <span className="font-semibold">{selectedStudent.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Roll No:</span>
                  <span className="font-semibold">{selectedStudent.roll_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">DOB:</span>
                  <span className="font-semibold">{new Date(selectedStudent.dob).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Blood Group:</span>
                  <span className="font-semibold">{selectedStudent.blood_group}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Emergency:</span>
                  <span className="font-semibold">{selectedStudent.emergency_contact}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Academic Year:</span>
                  <span className="font-semibold">{selectedStudent.academic_year}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
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
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Student, admission..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockStudents}
          columns={columns}
        />
      </Card>
    </div>
  );
};

export default StudentIDCardsPage;
