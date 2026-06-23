import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { UserIcon, ArrowPathIcon, CheckIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { initialMockStudentRollNumbers } from '../data/mockData';
import type { StudentRollNumber } from '../data/types';

export const BulkAssignRollNumbersContent: React.FC = () => {
  const { t } = useTranslation('administration');
  const { students, classes, loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentMode, setAssignmentMode] = useState<'auto' | 'manual'>('auto');
  const [startRollNumber, setStartRollNumber] = useState('1');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  // Use centralized mock data (in production, this would come from useAppData)
  const mockStudents: StudentRollNumber[] = useMemo(() => {
    let filtered = initialMockStudentRollNumbers;

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

  const handleSelectStudent = (studentId: string) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === mockStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(mockStudents.map(s => s.id)));
    }
  };

  const openAssignModal = () => {
    if (selectedStudents.size === 0 && !selectedClass) {
      alert('Please select a class or specific students to assign roll numbers.');
      return;
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setAssignmentMode('auto');
    setStartRollNumber('1');
  };

  const handleAssignRollNumbers = () => {
    const studentsToAssign = selectedStudents.size > 0 
      ? Array.from(selectedStudents) 
      : mockStudents.filter(s => s.class_id === selectedClass).map(s => s.id);
    
    console.log('Assigning roll numbers:', {
      mode: assignmentMode,
      startRollNumber,
      studentIds: studentsToAssign
    });
    closeModal();
    setSelectedStudents(new Set());
  };

  const columns: DataGridColumn<StudentRollNumber>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedStudents.size === mockStudents.length && mockStudents.length > 0}
          onChange={handleSelectAll}
          className="w-4 h-4"
        />
      ),
      sortable: false,
      render: (_, record) => (
        <input
          type="checkbox"
          checked={selectedStudents.has(record.id)}
          onChange={() => handleSelectStudent(record.id)}
          className="w-4 h-4"
        />
      )
    },
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
      header: 'Roll Number',
      sortable: true,
      render: (value) => value ? <span className="font-semibold text-green-600">{value}</span> : <span className="text-gray-400">Not assigned</span>
    }
  ];

  const uniqueClasses = useMemo(() => {
    const classIds = [...new Set(mockStudents.map(s => s.class_id))];
    return classIds.map(id => mockStudents.find(s => s.class_id === id)?.class_name || id);
  }, [mockStudents]);

  const totals = useMemo(() => {
    return {
      total: mockStudents.length,
      assigned: mockStudents.filter(s => s.roll_number).length,
      unassigned: mockStudents.filter(s => !s.roll_number).length
    };
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
      <Card 
        title={
          <div className="flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-amber-600" />
            <span>Bulk Assign Roll Numbers</span>
          </div>
        }
        extra={
          <Button onClick={openAssignModal} variant="primary">
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Assign Roll Numbers
          </Button>
        }
      >
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <UserIcon className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">Auto/Manual Roll Number Assignment</h3>
              <p className="text-sm text-amber-700 mt-1">
                Automatically assign sequential roll numbers to students in a class, or manually assign 
                specific roll numbers. Select a class or specific students to begin assignment.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Students</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Assigned</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.assigned}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ArrowPathIcon className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium">Unassigned</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-2">
              {totals.unassigned}
            </p>
          </div>
        </div>

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

      {/* Assign Roll Numbers Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Assign Roll Numbers"
      >
        <FormSection>
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              {selectedStudents.size > 0 
                ? `Assigning roll numbers to ${selectedStudents.size} selected student(s).`
                : `Assigning roll numbers to all students in ${selectedClass || 'selected class'}.`
              }
            </p>
          </div>

          <FormField label="Assignment Mode" required>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="auto"
                  checked={assignmentMode === 'auto'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignmentMode(e.target.value as 'auto' | 'manual')}
                  className="w-4 h-4"
                />
                <span>Auto (Sequential)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="manual"
                  checked={assignmentMode === 'manual'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignmentMode(e.target.value as 'auto' | 'manual')}
                  className="w-4 h-4"
                />
                <span>Manual</span>
              </label>
            </div>
          </FormField>

          {assignmentMode === 'auto' && (
            <FormField label="Start Roll Number" required>
              <input
                type="number"
                value={startRollNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartRollNumber(e.target.value)}
                min="1"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </FormField>
          )}

          {assignmentMode === 'manual' && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                Manual assignment allows you to specify roll numbers for each student individually. 
                This will be implemented in the full version.
              </p>
            </div>
          )}
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleAssignRollNumbers} variant="primary">
            Assign Numbers
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};

const BulkAssignRollNumbersPage: React.FC = () => (
  <div className="space-y-6">
    <BulkAssignRollNumbersContent />
  </div>
);

export default BulkAssignRollNumbersPage;
