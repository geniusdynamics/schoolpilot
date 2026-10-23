import React, { useState, useMemo } from 'react';
import { useAdministration } from '../hooks/useAdministration';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { UserIcon, ArrowPathIcon, CheckIcon } from '@/components/ui/icons';
import type { StudentRollNumber } from '../data/types';
import type { Student } from '@/core/types';
import { StudentStatus } from '@/core/types';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';

/** Students may carry a roll number assigned through bulk operations. */
type StudentWithRoll = Student & { roll_number?: string | null };

const composeClassName = (student: Student): string => {
  const cls = student.current_class_name || '';
  const stream = student.current_class_stream_name || '';
  if (cls && stream) return `${cls} - ${stream}`;
  return cls || stream;
};

export const BulkAssignRollNumbersContent: React.FC = () => {
  // GAP(P1-E01): the roll number has no canonical learner column, so the bulk screen
  // keeps the legacy student collection through the module facade until P1-C03/P1-E06.
  const { students, updateStudent } = useAdministration();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentMode, setAssignmentMode] = useState<'auto' | 'manual'>('auto');
  const [startRollNumber, setStartRollNumber] = useState('1');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);

  // Live ACTIVE students from the database
  const studentRows: StudentRollNumber[] = useMemo(() => {
    let rows: StudentRollNumber[] = (students || [])
      .filter(s => s.status === StudentStatus.ACTIVE && !s.deleted_at)
      .map(s => ({
        id: String(s.id),
        student_id: String(s.id),
        student_name: s.display_name || `${s.first_name} ${s.last_name}`.trim(),
        admission_no: s.admission_no,
        class_id: String(s.current_class_stream_id ?? ''),
        class_name: composeClassName(s),
        section: s.current_class_stream_name || '',
        roll_number: (s as StudentWithRoll).roll_number || ''
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

  const toast = useToast();
  const openAssignModal = () => {
    if (selectedStudents.size === 0 && !selectedClass) {
      toast.showWarning('Please select a class or specific students to assign roll numbers.');
      return;
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setAssignmentMode('auto');
    setStartRollNumber('1');
  };

  const handleAssignRollNumbers = async () => {
    const studentsToAssign = selectedStudents.size > 0
      ? Array.from(selectedStudents)
      : studentRows.filter(s => s.class_id === selectedClass).map(s => s.id);

    if (assignmentMode !== 'auto') {
      logger.info('Manual roll number assignment requested:', { studentIds: studentsToAssign });
      closeModal();
      setSelectedStudents(new Set());
      return;
    }

    setIsAssigning(true);
    logger.info('Assigning roll numbers:', {
      mode: assignmentMode,
      startRollNumber,
      studentIds: studentsToAssign
    });
    try {
      const start = Math.max(1, parseInt(startRollNumber, 10) || 1);
      // Sequential numbering ordered by student name for deterministic results
      const ordered = [...studentsToAssign].sort((a, b) => {
        const rowA = studentRows.find(s => s.id === a);
        const rowB = studentRows.find(s => s.id === b);
        return (rowA?.student_name ?? '').localeCompare(rowB?.student_name ?? '');
      });
      for (let i = 0; i < ordered.length; i++) {
        const patch: Partial<Student> & { roll_number?: string } = { roll_number: String(start + i) };
        await updateStudent(String(ordered[i]), patch);
      }
      toast.showSuccess(`Assigned roll numbers to ${ordered.length} student(s).`);
      closeModal();
      setSelectedStudents(new Set());
    } catch (err) {
      logger.error('Failed to assign roll numbers:', err);
      toast.showError('Failed to assign roll numbers.');
    } finally {
      setIsAssigning(false);
    }
  };

  const columns: DataGridColumn<StudentRollNumber>[] = [
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
      render: (value) => value ? <span className="font-semibold text-green-600">{value}</span> : <span className="text-surface-muted-fg">Not assigned</span>
    }
  ];

  const uniqueClasses = useMemo(() => {
    const classIds = [...new Set(studentRows.map(s => s.class_id))];
    return classIds.map(id => studentRows.find(s => s.class_id === id)?.class_name || id);
  }, [studentRows]);

  const totals = useMemo(() => {
    return {
      total: studentRows.length,
      assigned: studentRows.filter(s => s.roll_number).length,
      unassigned: studentRows.filter(s => !s.roll_number).length
    };
  }, [studentRows]);

  // The grid owns the empty state; there is no page-level loading screen once the
  // canonical repository is the source of truth.


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
        info="Automatically assign sequential roll numbers to students in a class, or manually assign specific roll numbers. Select a class or specific students to begin assignment."
      >
        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Students</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Assigned</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.assigned}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
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
          onSelectionChange={(selected: StudentRollNumber[]) =>
            setSelectedStudents(new Set(selected.map(row => row.id)))
          }
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
                className="w-full border border-surface-border rounded-md px-3 py-2"
              />
            </FormField>
          )}

          {assignmentMode === 'manual' && (
            <div className="p-3 bg-surface-muted border border-surface-border rounded-lg">
              <p className="text-sm text-surface-muted-fg">
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
          <Button onClick={() => void handleAssignRollNumbers()} variant="primary" disabled={isAssigning}>
            {isAssigning ? 'Assigning...' : 'Assign Numbers'}
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};

const BulkAssignRollNumbersPage: React.FC = () => (
  <div className="space-y-3">
    <BulkAssignRollNumbersContent />
  </div>
);

export default BulkAssignRollNumbersPage;
