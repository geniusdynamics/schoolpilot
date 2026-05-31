
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Staff } from '@/types';
import { TeacherSubjectAssignment, ClassSubjectAllocation } from '@/modules/academics/data/types'; // Corrected imports
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, UserGroupIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';

type AssignmentFormData = Omit<Partial<TeacherSubjectAssignment>, 'id' | 'class_stream_name' | 'subject_name' | 'academic_year_name' | 'teacher_name'>;

export const TeacherSubjectAssignmentPageContent: React.FC = () => {
  const { t } = useTranslation();
  const { 
    teacherSubjectAssignments, 
    classSubjectAllocations,
    staff,
    loading, 
    addTeacherSubjectAssignment, 
    deleteTeacherSubjectAssignment 
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TeacherSubjectAssignment | null>(null);
  
  const initialFormData: AssignmentFormData = { 
    allocation_id: undefined, 
    teacher_id: undefined,
  };
  const [formData, setFormData] = useState<AssignmentFormData>(initialFormData);

  const openModal = (assignment?: TeacherSubjectAssignment) => {
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

  const handleSubmit = async () => {
    if (!formData.allocation_id || !formData.teacher_id) {
      alert(t('validation.classsubjectAllocationAndTeacherAreRequired'));
      return;
    }

    const isDuplicate = teacherSubjectAssignments.some(
        assign => assign.id !== editingAssignment?.id &&
                 assign.allocation_id === formData.allocation_id &&
                 assign.teacher_id === formData.teacher_id
    );

    if (isDuplicate) {
        alert(t('messages.thisTeacherIsAlreadyAssignedToThisClasssubjectAllocation'));
        return;
    }

    const payload: Omit<TeacherSubjectAssignment, 'id' | 'class_stream_name' | 'subject_name' | 'academic_year_name' | 'teacher_name'> = { 
        allocation_id: formData.allocation_id!, 
        teacher_id: formData.teacher_id!,
    };

    // Note: Update functionality for assignments is typically delete and re-add if changing core FKs.
    // Here, we only implement add.
    if (!editingAssignment) { 
      await addTeacherSubjectAssignment(payload);
    } else {
        // For simplicity, we'll treat edit as re-add if different, or no-op if same.
        // A real update might involve deleting old and adding new if allocation_id or teacher_id changes.
        // For now, if it's an edit, we just log and close, or re-add if significantly different.
        console.log("Editing existing assignment - for demo, this doesn't update existing. Delete and re-add for changes.");
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this teacher assignment?')) {
      await deleteTeacherSubjectAssignment(id);
    }
  };

  const columns: DataGridColumn<TeacherSubjectAssignment>[] = [
    { header: 'ID', key: 'id' },
    { header: 'Teacher', key: 'teacher_name' },
    { header: 'Class Stream', key: 'class_stream_name' },
    { header: 'Subject', key: 'subject_name' },
    { header: 'Academic Year', key: 'academic_year_name' },
    {
      header: 'Actions',
      key: 'id',
      render: (value: any, item: TeacherSubjectAssignment) => (
        <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
      ),
    },
  ];

  const isLoadingPage = loading.teacherSubjectAssignments || loading.classSubjectAllocations || loading.staff;

  if (isLoadingPage && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Teacher Assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Teacher Subject Assignments" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Assign Teacher
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Assign teachers to the subjects that have been allocated to class streams for specific academic years.
        </p>
        <DataGrid columns={columns} data={teacherSubjectAssignments} loading={loading.teacherSubjectAssignments && isModalOpen} />
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
              {classSubjectAllocations.map((alloc: ClassSubjectAllocation) => (
                <option key={alloc.id} value={alloc.id}>
                  {alloc.class_stream_name} - {alloc.subject_name} ({alloc.academic_year_name})
                </option>
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
              {staff.filter(s => s.is_active && s.department_name === 'Academics' || s.designation_title?.includes('Teacher') || s.designation_title?.includes('Principal')).map((teacher: Staff) => ( // Simple filter for teachers
                <option key={teacher.id} value={teacher.id}>{teacher.first_name} {teacher.last_name}</option>
              ))}
            </Select>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading.teacherSubjectAssignments}>
            {loading.teacherSubjectAssignments ? <Spinner size="sm"/> : 'Assign Teacher'}
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
