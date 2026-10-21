import React, { useState, useMemo } from 'react';
import { useAdministration } from '../hooks/useAdministration';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { UserIcon, PencilIcon, CheckIcon } from '@/components/ui/icons';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';
import type { Student } from '@/core/types';

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

/** Students may carry a roll number assigned through bulk operations. */
type StudentWithRoll = Student & { roll_number?: string | null };

/** Patch accepted by updateStudent — extends the entity with the bulk-managed roll number. */
type StudentPatch = Partial<Student> & { roll_number?: string };

export const BulkStudentUpdateContent: React.FC = () => {
  // GAP(P1-E01): the learner rows are migrated in P1-C03; until then the bulk screen
  // reads and writes the legacy student collection through the module facade.
  const { students, updateStudent } = useAdministration();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [updateField, setUpdateField] = useState('');
  const [updateValue, setUpdateValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Live student records from the database
  const studentRows: StudentRecord[] = useMemo(() => {
    let rows: StudentRecord[] = (students || [])
      .filter(s => !s.deleted_at)
      .map(s => ({
        id: String(s.id),
        student_id: String(s.id),
        student_name: s.display_name || `${s.first_name} ${s.last_name}`.trim(),
        admission_no: s.admission_no,
        class_id: String(s.current_class_stream_id ?? ''),
        class_name: [s.current_class_name, s.current_class_stream_name].filter(Boolean).join(' - '),
        section: s.current_class_stream_name || '',
        roll_number: (s as StudentWithRoll).roll_number || '',
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || ''
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

  const openBulkUpdateModal = () => {
    if (selectedStudents.size === 0) {
      toast.showWarning('Please select at least one student to update.');
      return;
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setUpdateField('');
    setUpdateValue('');
  };

  const toast = useToast();
  // Maps grid fields onto real student entity fields persisted via updateStudent
  const resolveStudentPatch = (field: string, value: string): StudentPatch => {
    switch (field) {
      case 'class_id':
        // Runtime stream ids are post-normalization strings even though the entity types them as number
        return { current_class_stream_id: value as unknown as number };
      case 'section':
        return { current_class_stream_name: value };
      case 'roll_number':
        return { roll_number: value };
      case 'phone':
        return { phone: value };
      case 'email':
        return { email: value };
      case 'address':
        return { address: value };
      default:
        return {};
    }
  };

  const handleBulkUpdate = async () => {
    if (!updateField || !updateValue) {
      toast.showWarning('Please select a field and enter a value.');
      return;
    }
    setIsUpdating(true);
    logger.info('Bulk updating students:', {
      studentIds: Array.from(selectedStudents),
      field: updateField,
      value: updateValue
    });
    try {
      const patch = resolveStudentPatch(updateField, updateValue);
      for (const studentId of selectedStudents) {
        await updateStudent(String(studentId), patch);
      }
      toast.showSuccess(`Updated ${selectedStudents.size} student(s).`);
      closeModal();
      setSelectedStudents(new Set());
    } catch (err) {
      logger.error('Failed to bulk update students:', err);
      toast.showError('Failed to update students.');
    } finally {
      setIsUpdating(false);
    }
  };

  const columns: DataGridColumn<StudentRecord>[] = [
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
    const classNames = [...new Set(studentRows.map(s => s.class_name))];
    return classNames.filter(Boolean);
  }, [studentRows]);

  const updatableFields = [
    { value: 'class_id', label: 'Class' },
    { value: 'section', label: 'Section' },
    { value: 'roll_number', label: 'Roll Number' },
    { value: 'phone', label: 'Phone' },
    { value: 'email', label: 'Email' },
    { value: 'address', label: 'Address' }
  ];

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-primary-600" />
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
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-start gap-3">
            <UserIcon className="w-5 h-5 text-primary-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-primary-800">Multi-Field Batch Update</h3>
              <p className="text-sm text-primary-700 mt-1">
                Select multiple students and update their records in bulk. Choose from fields like class, section,
                roll number, phone, email, or address to update all selected students at once.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="mb-6 bg-surface-card border border-surface-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-surface-muted-fg">
            <CheckIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Selected Students: {selectedStudents.size} / {studentRows.length}</span>
          </div>
        </div>

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
          data={studentRows}
          columns={columns}
          selectable={true}
          onSelectionChange={(selected: StudentRecord[]) =>
            setSelectedStudents(new Set(selected.map(row => row.id)))
          }
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
              className="w-full border border-surface-border rounded-md px-3 py-2"
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
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={() => void handleBulkUpdate()} variant="primary" disabled={isUpdating}>
            {isUpdating ? 'Applying...' : 'Apply Update'}
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
