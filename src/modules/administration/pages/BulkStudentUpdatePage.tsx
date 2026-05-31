import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { UserIcon, PencilIcon, CheckIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

interface StudentRecord {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  class_id: string;
  class_name: string;
  section: string;
  roll_number: string;
  phone: string;
  email: string;
  address: string;
}

export const BulkStudentUpdateContent: React.FC = () => {
  const { t } = useTranslation('administration');
  const { students, classes, loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [updateField, setUpdateField] = useState('');
  const [updateValue, setUpdateValue] = useState('');

  // Mock data for student records (in production, this would come from useAppData)
  const mockStudents: StudentRecord[] = useMemo(() => {
    const students: StudentRecord[] = [
      {
        id: 's-1',
        student_id: '1',
        student_name: 'John Doe',
        admission_no: 'ADM-001',
        class_id: '1',
        class_name: 'Grade 10 - A',
        section: 'A',
        roll_number: '1',
        phone: '+1234567890',
        email: 'john.doe@example.com',
        address: '123 Main St'
      },
      {
        id: 's-2',
        student_id: '2',
        student_name: 'Jane Smith',
        admission_no: 'ADM-002',
        class_id: '1',
        class_name: 'Grade 10 - A',
        section: 'A',
        roll_number: '2',
        phone: '+1234567891',
        email: 'jane.smith@example.com',
        address: '456 Oak Ave'
      },
      {
        id: 's-3',
        student_id: '3',
        student_name: 'Michael Johnson',
        admission_no: 'ADM-003',
        class_id: '2',
        class_name: 'Grade 10 - B',
        section: 'B',
        roll_number: '1',
        phone: '+1234567892',
        email: 'michael.j@example.com',
        address: '789 Pine Rd'
      },
      {
        id: 's-4',
        student_id: '4',
        student_name: 'Emily Davis',
        admission_no: 'ADM-004',
        class_id: '2',
        class_name: 'Grade 10 - B',
        section: 'B',
        roll_number: '2',
        phone: '+1234567893',
        email: 'emily.davis@example.com',
        address: '321 Elm St'
      },
      {
        id: 's-5',
        student_id: '5',
        student_name: 'Robert Wilson',
        admission_no: 'ADM-005',
        class_id: '3',
        class_name: 'Grade 11 - A',
        section: 'A',
        roll_number: '1',
        phone: '+1234567894',
        email: 'robert.wilson@example.com',
        address: '654 Maple Dr'
      }
    ];

    let filtered = students;

    if (selectedClass) {
      filtered = filtered.filter(s => s.class_id === selectedClass);
    }

    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
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

  const openBulkUpdateModal = () => {
    if (selectedStudents.size === 0) {
      alert('Please select at least one student to update.');
      return;
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setUpdateField('');
    setUpdateValue('');
  };

  const handleBulkUpdate = () => {
    if (!updateField || !updateValue) {
      alert('Please select a field and enter a value.');
      return;
    }
    console.log('Bulk updating students:', {
      studentIds: Array.from(selectedStudents),
      field: updateField,
      value: updateValue
    });
    closeModal();
    setSelectedStudents(new Set());
  };

  const columns: DataGridColumn<StudentRecord>[] = [
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
      header: 'Roll No',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (value) => value
    }
  ];

  const uniqueClasses = useMemo(() => {
    const classIds = [...new Set(mockStudents.map(s => s.class_id))];
    return classIds.map(id => mockStudents.find(s => s.class_id === id)?.class_name || id);
  }, [mockStudents]);

  const updatableFields = [
    { value: 'class_id', label: 'Class' },
    { value: 'section', label: 'Section' },
    { value: 'roll_number', label: 'Roll Number' },
    { value: 'phone', label: 'Phone' },
    { value: 'email', label: 'Email' },
    { value: 'address', label: 'Address' }
  ];

  if (loading && mockStudents.length === 0) {
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
            <UserIcon className="w-6 h-6 text-blue-600" />
            <span>Bulk Student Update</span>
          </div>
        }
        extra={
          <Button onClick={openBulkUpdateModal} variant="primary" disabled={selectedStudents.size === 0}>
            <PencilIcon className="w-4 h-4 mr-2" />
            Update Selected ({selectedStudents.size})
          </Button>
        }
      >
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <UserIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Multi-Field Batch Update</h3>
              <p className="text-sm text-blue-700 mt-1">
                Select multiple students and update their records in bulk. Choose from fields like class, section, 
                roll number, phone, email, or address to update all selected students at once.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600">
            <CheckIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Selected Students: {selectedStudents.size} / {mockStudents.length}</span>
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

      {/* Bulk Update Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`Bulk Update ${selectedStudents.size} Students`}
      >
        <FormSection>
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You are about to update {selectedStudents.size} student(s). This action cannot be undone.
            </p>
          </div>

          <FormField label="Field to Update" required>
            <select
              value={updateField}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUpdateField(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select field</option>
              {updatableFields.map(field => (
                <option key={field.value} value={field.value}>{field.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="New Value" required>
            <input
              type="text"
              value={updateValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUpdateValue(e.target.value)}
              placeholder="Enter new value"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleBulkUpdate} variant="primary">
            Apply Update
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};

const BulkStudentUpdatePage: React.FC = () => (
  <div className="space-y-6">
    <BulkStudentUpdateContent />
  </div>
);

export default BulkStudentUpdatePage;
