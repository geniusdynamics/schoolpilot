import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { IdentificationIcon, UserIcon, PrinterIcon, DownloadIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { logger } from '@/utils/logging';

/** ID-card view of a live student record. */
interface StudentIDCardRow {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  class_id: string;
  class_name: string;
  section: string;
  roll_number: string;
  photo_url?: string;
  dob: string;
  blood_group: string;
  emergency_contact: string;
  academic_year: string;
}

const StudentIDCardsPage: React.FC = () => {
  const { students, loading } = useAppData();

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentIDCardRow | null>(null);

  // Live student records rendered as ID card rows
  const cardRows: StudentIDCardRow[] = useMemo(() => {
    let rows: StudentIDCardRow[] = (students || [])
      .filter(s => !s.deleted_at)
      .map(s => ({
        id: String(s.id),
        student_id: String(s.id),
        student_name: s.display_name || `${s.first_name} ${s.last_name}`.trim(),
        admission_no: s.admission_no,
        class_id: String(s.current_class_stream_id ?? ''),
        class_name: [s.current_class_name, s.current_class_stream_name].filter(Boolean).join(' - ') || '-',
        section: s.current_class_stream_name || '-',
        roll_number: (s as { roll_number?: string }).roll_number || '-',
        photo_url: s.photo_path || undefined,
        dob: s.date_of_birth || '',
        blood_group: '-',
        emergency_contact: s.primary_guardian?.phone || '-',
        academic_year: '-'
      }));

    if (selectedClass) {
      rows = rows.filter(s => s.class_id === selectedClass);
    }

    if (searchTerm) {
      rows = rows.filter(s =>
        (s.student_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (s.admission_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return rows;
  }, [students, selectedClass, searchTerm]);

  const handlePrintCard = (student: StudentIDCardRow) => {
    setSelectedStudent(student);
    logger.info('Printing ID card for:', student.student_name);
    // In production, this would trigger print dialog for the ID card
  };

  const handleDownloadCard = (student: StudentIDCardRow) => {
    logger.info('Downloading ID card for:', student.student_name);
    // In production, this would download the ID card as PDF/image
  };

  const handlePrintAll = () => {
    logger.info('Printing all ID cards for class:', selectedClass || 'all classes');
    // In production, this would print all filtered ID cards
  };

  const columns: DataGridColumn<StudentIDCardRow>[] = [
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
    const classIds = [...new Set(cardRows.map(s => s.class_id))];
    return classIds.map(id => cardRows.find(s => s.class_id === id)?.class_name || id);
  }, [cardRows]);

  if (loading?.all && cardRows.length === 0) {
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
        <h1 className="text-2xl font-bold text-surface-foreground">Student ID Cards</h1>
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
          <div className="mb-6 p-6 bg-surface-card border border-surface-border rounded-lg">
            <h3 className="text-lg font-semibold text-surface-foreground mb-4">ID Card Preview: {selectedStudent.student_name}</h3>
            <div className="border-2 border-surface-border rounded-lg p-6 max-w-sm mx-auto bg-gradient-to-br from-purple-50 to-primary-50">
              <div className="text-center mb-4">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <UserIcon className="w-12 h-12 text-surface-muted-fg" />
                </div>
                <h4 className="text-xl font-bold text-surface-foreground">{selectedStudent.student_name}</h4>
                <p className="text-sm text-surface-muted-fg">{selectedStudent.admission_no}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-muted-fg">Class:</span>
                  <span className="font-semibold">{selectedStudent.class_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-muted-fg">Section:</span>
                  <span className="font-semibold">{selectedStudent.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-muted-fg">Roll No:</span>
                  <span className="font-semibold">{selectedStudent.roll_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-muted-fg">DOB:</span>
                  <span className="font-semibold">{selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-muted-fg">Blood Group:</span>
                  <span className="font-semibold">{selectedStudent.blood_group}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-muted-fg">Emergency:</span>
                  <span className="font-semibold">{selectedStudent.emergency_contact}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-muted-fg">Academic Year:</span>
                  <span className="font-semibold">{selectedStudent.academic_year}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClass(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Student, admission..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={cardRows}
          columns={columns}
        />
      </Card>
    </div>
  );
};

export default StudentIDCardsPage;
