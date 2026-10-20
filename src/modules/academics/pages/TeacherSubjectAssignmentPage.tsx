// ABOUTME: Teacher subject assignments page — assigns teachers to class-subject allocations.
// ABOUTME: CRUD goes through the academics module context with string ids; labels are resolved at read time.

import { logger } from '@/utils/logging';

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Select from '@/components/ui/Select';
import { PlusIcon, DeleteIcon } from '@/components/ui/icons';
import { useAcademicDataContext } from '../data/AcademicDataContext';
import { useAdministrationDataContext } from '@/modules/administration/data/AdministrationDataContext';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type Id = string | number;

interface AssignmentFormData {
  allocation_id?: string;
  teacher_id?: string;
}

/** An assignment row as shown in the grid, with names resolved from the referenced records. */
interface AssignmentRow {
  id: string;
  allocation_id: string;
  teacher_id: string;
  teacher_name: string;
  class_stream_name: string;
  subject_name: string;
  academic_year_name: string;
}

interface Named { id: Id; name?: string | null; title?: string | null }
interface StreamRecord extends Named { class_id?: Id | null; class_name?: string | null }
interface StaffRecord {
  id: Id;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  designation_id?: Id | null;
  designation_title?: string | null;
  department_id?: Id | null;
  department_name?: string | null;
}
interface StoredAllocation {
  id: Id;
  class_stream_id?: Id | null;
  subject_id?: Id | null;
  academic_year_id?: Id | null;
  class_stream_name?: string | null;
  subject_name?: string | null;
  academic_year_name?: string | null;
}
interface StoredAssignment {
  id: Id;
  allocation_id?: Id | null;
  teacher_id?: Id | null;
  teacher_name?: string | null;
}

const idOf = (value: Id | null | undefined): string => (value == null ? '' : String(value));
const fullName = (person?: { first_name?: string; last_name?: string }) =>
  person ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() : '';

export const TeacherSubjectAssignmentPageContent: React.FC = () => {
  const { t } = useTranslation();
  const academic = useAcademicDataContext();
  const admin = useAdministrationDataContext();
  const { addTeacherSubjectAssignment, deleteTeacherSubjectAssignment } = academic;
  const [isSaving, setIsSaving] = useState(false);

  const staff = admin.staff as StaffRecord[];
  const classStreams = admin.classStreams as unknown as StreamRecord[];
  const classes = admin.classes as unknown as Named[];
  const designations = admin.designations as unknown as Named[];
  const departments = admin.departments as unknown as Named[];
  const subjects = academic.subjects as Named[];
  const academicYears = academic.academicYears as unknown as Named[];

  const describeAllocation = useCallback((alloc?: StoredAllocation) => {
    if (!alloc) return { stream: '', subject: '', year: '' };
    const stream = classStreams.find(cs => idOf(cs.id) === idOf(alloc.class_stream_id));
    const className = stream ? (classes.find(c => idOf(c.id) === idOf(stream.class_id))?.name ?? stream.class_name) : null;
    return {
      stream: stream ? (className ? `${className} - ${stream.name ?? ''}` : (stream.name ?? '')) : (alloc.class_stream_name ?? ''),
      subject: subjects.find(s => idOf(s.id) === idOf(alloc.subject_id))?.name ?? alloc.subject_name ?? '',
      year: academicYears.find(ay => idOf(ay.id) === idOf(alloc.academic_year_id))?.name ?? alloc.academic_year_name ?? '',
    };
  }, [classStreams, classes, subjects, academicYears]);

  const classSubjectAllocations = academic.classSubjectAllocations as unknown as StoredAllocation[];
  const allocationOptions = useMemo(() => classSubjectAllocations.map(alloc => {
    const { stream, subject, year } = describeAllocation(alloc);
    return { id: idOf(alloc.id), label: `${stream} - ${subject} (${year})` };
  }), [classSubjectAllocations, describeAllocation]);

  const teacherSubjectAssignments = useMemo<AssignmentRow[]>(() =>
    (academic.teacherSubjectAssignments as StoredAssignment[]).map(assign => {
      const alloc = classSubjectAllocations.find(a => idOf(a.id) === idOf(assign.allocation_id));
      const { stream, subject, year } = describeAllocation(alloc);
      return {
        id: idOf(assign.id),
        allocation_id: idOf(assign.allocation_id),
        teacher_id: idOf(assign.teacher_id),
        teacher_name: fullName(staff.find(s => idOf(s.id) === idOf(assign.teacher_id))) || assign.teacher_name || '',
        class_stream_name: stream,
        subject_name: subject,
        academic_year_name: year,
      };
    }), [academic.teacherSubjectAssignments, classSubjectAllocations, describeAllocation, staff]);

  // Teaching staff by designation/department; when none are tagged that way, offer every active member.
  const teachers = useMemo(() => {
    const active = staff.filter(s => s.is_active !== false);
    const looksLikeTeacher = (s: StaffRecord) => {
      const designation = designations.find(d => idOf(d.id) === idOf(s.designation_id))?.title ?? s.designation_title ?? '';
      const department = departments.find(d => idOf(d.id) === idOf(s.department_id))?.name ?? s.department_name ?? '';
      return department === 'Academics' || /teacher|principal/i.test(designation);
    };
    const tagged = active.filter(looksLikeTeacher);
    return tagged.length > 0 ? tagged : active;
  }, [staff, designations, departments]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentRow | null>(null);
  
  const initialFormData: AssignmentFormData = { 
    allocation_id: undefined, 
    teacher_id: undefined,
  };
  const [formData, setFormData] = useState<AssignmentFormData>(initialFormData);

  const openModal = (assignment?: AssignmentRow) => {
    setEditingAssignment(assignment || null); // Editing is not fully supported, mostly for add/delete
    setFormData(assignment ? 
      { 
        allocation_id: assignment.allocation_id, 
        teacher_id: assignment.teacher_id,
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAssignment(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value || undefined }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.allocation_id || !formData.teacher_id) {
      toast.showWarning(t('validation.classsubjectAllocationAndTeacherAreRequired'));
      return;
    }

    const isDuplicate = teacherSubjectAssignments.some(
        assign => assign.id !== editingAssignment?.id &&
                 assign.allocation_id === formData.allocation_id &&
                 assign.teacher_id === formData.teacher_id
    );

    if (isDuplicate) {
        toast.showError(t('messages.thisTeacherIsAlreadyAssignedToThisClasssubjectAllocation'));
        return;
    }

    const payload = {
        allocation_id: formData.allocation_id,
        teacher_id: formData.teacher_id,
    };

    // Note: Update functionality for assignments is typically delete and re-add if changing core FKs.
    // Here, we only implement add.
    if (!editingAssignment) {
      setIsSaving(true);
      try {
        await addTeacherSubjectAssignment(payload);
      } catch (error) {
        logger.error('Failed to assign teacher:', error);
        toast.showError('Failed to assign teacher.');
        return;
      } finally {
        setIsSaving(false);
      }
    } else {
        // For simplicity, we'll treat edit as re-add if different, or no-op if same.
        // A real update might involve deleting old and adding new if allocation_id or teacher_id changes.
        // For now, if it's an edit, we just log and close, or re-add if significantly different.
        logger.info("Editing existing assignment - for demo, this doesn't update existing. Delete and re-add for changes.");
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this teacher assignment?' }))) {
      await deleteTeacherSubjectAssignment(id);
    }
  };

  const columns: DataGridColumn<AssignmentRow>[] = [
    { header: 'ID', key: 'id' },
    { header: 'Teacher', key: 'teacher_name' },
    { header: 'Class Stream', key: 'class_stream_name' },
    { header: 'Subject', key: 'subject_name' },
    { header: 'Academic Year', key: 'academic_year_name' },
    {
      header: 'Actions',
      key: 'actions',
      render: (_value: unknown, item: AssignmentRow) => (
        <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="Teacher Subject Assignments" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Assign Teacher
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          Assign teachers to the subjects that have been allocated to class streams for specific academic years.
        </p>
        <DataGrid columns={columns} data={teacherSubjectAssignments} />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingAssignment ? 'Edit Teacher Assignment' : 'Assign Teacher to Subject'} size="lg">
        <FormSection title="Assignment Details">
          <FormField label="Class-Subject Allocation" required>
            <Select 
              name="allocation_id" 
              value={formData.allocation_id || ''} 
              onChange={handleInputChange}
              required
            >
              <option value="">Select Class-Subject</option>
              {allocationOptions.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Teacher" required>
            <Select 
              name="teacher_id" 
              value={formData.teacher_id || ''} 
              onChange={handleInputChange}
              required
            >
              <option value="">Select Teacher</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={idOf(teacher.id)}>{fullName(teacher)}</option>
              ))}
            </Select>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSubmit} loading={isSaving}>
            {'Assign Teacher'}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const TeacherSubjectAssignmentPage: React.FC = () => (
  <div className="space-y-6">
    <TeacherSubjectAssignmentPageContent />
  </div>
);

export default TeacherSubjectAssignmentPage;
