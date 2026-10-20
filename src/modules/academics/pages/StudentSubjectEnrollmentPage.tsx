// ABOUTME: Student subject enrolment page — year/period/class/stream pickers drive a grid of enrolment checkboxes.
// ABOUTME: CRUD goes through the academics module context; ids stay strings and labels are resolved at read time.

import React, { useState, useMemo, useCallback } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input'; 

import { logger } from '@/utils/logging';
import { StudentEnrollmentStatus, StudentStatus } from '@/core/types';
import { useAcademicDataContext } from '../data/AcademicDataContext';
import { useAdministrationDataContext } from '@/modules/administration/data/AdministrationDataContext';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type Id = string | number;

interface EnrollmentFormData {
  student_id?: string;
  class_subject_allocation_id?: string;
  enrollment_date?: string;
  status: StudentEnrollmentStatus;
}

interface Named { id: Id; name?: string | null }
interface StreamRecord extends Named { class_id?: Id | null }
interface PeriodRecord extends Named {
  academic_year_id?: Id | null;
  period_definition_id?: Id | null;
  period_definition_name?: string | null;
  start_date?: string | null;
}
interface StudentRecord {
  id: Id;
  first_name?: string;
  last_name?: string;
  admission_no?: string;
  status?: string;
  current_class_stream_id?: Id | null;
}
interface StoredAllocation {
  id: Id;
  class_stream_id?: Id | null;
  subject_id?: Id | null;
  academic_year_id?: Id | null;
  subject_name?: string | null;
}
interface StoredEnrollment {
  id: Id;
  student_id?: Id | null;
  class_subject_allocation_id?: Id | null;
  enrollment_date: string;
  status: string;
}

/** An enrolment row as listed, with names resolved from the referenced records. */
interface EnrollmentRow {
  id: string;
  student_id: string;
  class_subject_allocation_id: string;
  enrollment_date: string;
  status: string;
  student_name: string;
  class_name: string;
  stream_name: string;
  subject_name: string;
  academic_year_name: string;
}

/** A stream's allocation as offered in the grid, with its subject name resolved. */
interface AllocationOption {
  id: string;
  class_stream_id: string;
  academic_year_id: string;
  subject_name: string;
  label: string;
}

const idOf = (value: Id | null | undefined): string => (value == null ? '' : String(value));
const fullName = (person?: { first_name?: string; last_name?: string }) =>
  person ? [person.first_name, person.last_name].filter(Boolean).join(' ') : '';

export const StudentSubjectEnrollmentPageContent: React.FC = () => {
  const confirm = useConfirm();
  const toast = useToast();
  const academic = useAcademicDataContext();
  const admin = useAdministrationDataContext();
  const { addStudentSubjectEnrollment, updateStudentSubjectEnrollment, deleteStudentSubjectEnrollment } = academic;
  const [isSaving, setIsSaving] = useState(false);

  const students = admin.students as unknown as StudentRecord[];
  const classes = admin.classes as unknown as Named[];
  const classStreams = admin.classStreams as unknown as StreamRecord[];
  const academicYears = academic.academicYears as unknown as Named[];
  const schoolPeriods = academic.schoolPeriods as unknown as PeriodRecord[];
  const periodDefinitions = academic.academicPeriodDefinitions as unknown as Named[];
  const subjects = academic.subjects as Named[];

  const nameIn = useCallback((list: Named[], id: Id | null | undefined) =>
    list.find(item => idOf(item.id) === idOf(id))?.name ?? '', []);

  const periodLabel = (period: PeriodRecord) =>
    period.name || period.period_definition_name || nameIn(periodDefinitions, period.period_definition_id) || period.start_date || idOf(period.id);

  const storedAllocations = academic.classSubjectAllocations as unknown as StoredAllocation[];
  const classSubjectAllocations = useMemo<AllocationOption[]>(() =>
    storedAllocations.map(alloc => {
      const stream = classStreams.find(cs => idOf(cs.id) === idOf(alloc.class_stream_id));
      const subjectName = nameIn(subjects, alloc.subject_id) || alloc.subject_name || '';
      const streamName = stream ? `${nameIn(classes, stream.class_id)} ${stream.name ?? ''}`.trim() : '';
      return {
        id: idOf(alloc.id),
        class_stream_id: idOf(alloc.class_stream_id),
        academic_year_id: idOf(alloc.academic_year_id),
        subject_name: subjectName,
        label: `${subjectName} (${streamName} - ${nameIn(academicYears, alloc.academic_year_id)})`,
      };
    }), [storedAllocations, classStreams, classes, subjects, academicYears, nameIn]);

  const studentSubjectEnrollments = useMemo<EnrollmentRow[]>(() =>
    (academic.studentSubjectEnrollments as StoredEnrollment[]).map(enr => {
      const student = students.find(s => idOf(s.id) === idOf(enr.student_id));
      const alloc = storedAllocations.find(a => idOf(a.id) === idOf(enr.class_subject_allocation_id));
      const stream = classStreams.find(cs => idOf(cs.id) === idOf(alloc?.class_stream_id));
      return {
        id: idOf(enr.id),
        student_id: idOf(enr.student_id),
        class_subject_allocation_id: idOf(enr.class_subject_allocation_id),
        enrollment_date: enr.enrollment_date,
        status: enr.status,
        student_name: fullName(student),
        class_name: nameIn(classes, stream?.class_id),
        stream_name: stream?.name ?? '',
        subject_name: nameIn(subjects, alloc?.subject_id) || alloc?.subject_name || '',
        academic_year_name: nameIn(academicYears, alloc?.academic_year_id),
      };
    }), [academic.studentSubjectEnrollments, storedAllocations, students, classStreams, classes, subjects, academicYears, nameIn]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentRow | null>(null);

  const initialFormData: EnrollmentFormData = { 
    student_id: undefined, 
    class_subject_allocation_id: undefined,
    enrollment_date: new Date().toISOString().split('T')[0],
    status: StudentEnrollmentStatus.ENROLLED,
  };
  const [formData, setFormData] = useState<EnrollmentFormData>(initialFormData);

  // Filters state
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | undefined>();
  const [selectedSchoolPeriodId, setSelectedSchoolPeriodId] = useState<string | undefined>();
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [selectedStreamId, setSelectedStreamId] = useState<string | undefined>();

  const [showEnrollmentGrid, setShowEnrollmentGrid] = useState(false);

  // Filtered data for dropdowns
  const filteredSchoolPeriods = useMemo(() => {
    if (!selectedAcademicYearId) return [];
    return schoolPeriods.filter(sp => idOf(sp.academic_year_id) === selectedAcademicYearId);
  }, [selectedAcademicYearId, schoolPeriods]);

  const filteredClassStreams = useMemo(() => {
    if (!selectedClassId) return [];
    return classStreams.filter(cs => idOf(cs.class_id) === selectedClassId);
  }, [selectedClassId, classStreams]);

  // Data for the enrollment grid
  const studentsForGrid = useMemo(() => {
    if (!selectedStreamId) return [];
    return students.filter(s => idOf(s.current_class_stream_id) === selectedStreamId && s.status === StudentStatus.ACTIVE);
  }, [selectedStreamId, students]);

  const subjectsForGrid = useMemo(() => {
    if (!selectedStreamId || !selectedAcademicYearId) return [];
    return classSubjectAllocations.filter(
      csa => csa.class_stream_id === selectedStreamId && csa.academic_year_id === selectedAcademicYearId
    );
  }, [selectedStreamId, selectedAcademicYearId, classSubjectAllocations]);

  const openModal = (enrollment?: EnrollmentRow) => {
    setEditingEnrollment(enrollment || null);
    setFormData(enrollment ? {
      student_id: enrollment.student_id,
      class_subject_allocation_id: enrollment.class_subject_allocation_id,
      enrollment_date: enrollment.enrollment_date,
      status: enrollment.status as StudentEnrollmentStatus,
    } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEnrollment(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value || undefined }));
  };

  const handleSubmit = async () => {
    if (!formData.student_id || !formData.class_subject_allocation_id || !formData.enrollment_date || !formData.status) {
      toast.showWarning('Student, subject allocation, enrollment date, and status are required.');
      return;
    }

    const isDuplicate = studentSubjectEnrollments.some(
        enr => enr.id !== editingEnrollment?.id &&
               enr.student_id === formData.student_id &&
               enr.class_subject_allocation_id === formData.class_subject_allocation_id &&
               enr.status === StudentEnrollmentStatus.ENROLLED 
    );

    if (isDuplicate && formData.status === StudentEnrollmentStatus.ENROLLED) {
        toast.showError('This student is already actively enrolled in this subject.');
        return;
    }

    const payload = {
      student_id: formData.student_id,
      class_subject_allocation_id: formData.class_subject_allocation_id,
      enrollment_date: formData.enrollment_date,
      status: formData.status,
    };
    setIsSaving(true);
    try {
      if (editingEnrollment) {
        await updateStudentSubjectEnrollment(editingEnrollment.id, payload);
        toast.showSuccess('Enrollment updated successfully.');
      } else {
        await addStudentSubjectEnrollment(payload);
        toast.showSuccess('Student enrolled successfully.');
      }
      closeModal();
    } catch (error) {
      logger.error('Failed to save enrollment:', error);
      toast.showError('Failed to save enrollment.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleGridEnrollmentChange = useCallback(async (studentId: string, csaId: string, isCurrentlyEnrolled: boolean) => {
    if (isCurrentlyEnrolled) { // User wants to unenroll
      const existingEnrollment = studentSubjectEnrollments.find(
        e => e.student_id === studentId && e.class_subject_allocation_id === csaId && e.status === StudentEnrollmentStatus.ENROLLED
      );
      if (existingEnrollment) {
        // Withdraw (keep the record for history) rather than hard-delete
        if ((await confirm({ variant: 'danger', message: "Are you sure you want to unenroll this student from the subject?" }))) {
          try {
            await updateStudentSubjectEnrollment(existingEnrollment.id, { status: StudentEnrollmentStatus.WITHDRAWN });
            toast.showSuccess('Student unenrolled.');
          } catch (error) {
            logger.error('Failed to unenroll student:', error);
            toast.showError('Failed to unenroll student.');
          }
        }
      }
    } else { // User wants to enroll
      try {
        await addStudentSubjectEnrollment({
          student_id: studentId,
          class_subject_allocation_id: csaId,
          enrollment_date: new Date().toISOString().slice(0, 10),
          status: StudentEnrollmentStatus.ENROLLED,
        });
        toast.showSuccess('Student enrolled.');
      } catch (error) {
        logger.error('Failed to enroll student:', error);
        toast.showError('Failed to enroll student.');
      }
    }
  }, [studentSubjectEnrollments, confirm, updateStudentSubjectEnrollment, addStudentSubjectEnrollment, toast]);

  const handleDelete = async (_id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this enrollment record?' }))) {
      try {
        await deleteStudentSubjectEnrollment(_id);
        toast.showSuccess('Enrollment record deleted.');
      } catch (error) {
        logger.error('Failed to delete enrollment record:', error);
        toast.showError('Failed to delete enrollment record.');
      }
    }
  };
  
  const columnsForListing: DataGridColumn<EnrollmentRow>[] = [
    { key: 'id', header: 'ID' },
    { key: 'student_name', header: 'Student' },
    { key: 'class_name', header: 'Class-Stream', render: (_value: any, item: EnrollmentRow) => `${item.class_name || ''} - ${item.stream_name || ''}`},
    { key: 'subject_name', header: 'Subject' },
    { key: 'academic_year_name', header: 'Academic Year' },
    { key: 'enrollment_date', header: 'Enrollment Date', render: (_value: any, item: EnrollmentRow) => new Date(item.enrollment_date).toLocaleDateString() },
    { key: 'status', header: 'Status', 
      render: (_value: any, item: EnrollmentRow) => (
        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === StudentEnrollmentStatus.ENROLLED ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {item.status}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: any, item: EnrollmentRow) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit Status</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const gridColumns = useMemo(() => {
    if (!showEnrollmentGrid) return [];
    const studentCol = { header: 'Student Name', key: 'student_name', render: (_value: unknown, item: StudentRecord) => fullName(item) || '—' };
    const subjectCols = subjectsForGrid.map(csa => ({
      header: csa.subject_name || 'Unknown Subject',
      // Unique key per allocation — reusing 'id' for every column breaks React keys and filters
      key: `allocation_${csa.id}`,
      render: (_value: unknown, student: StudentRecord) => {
        const isEnrolled = studentSubjectEnrollments.some(
          e => e.student_id === idOf(student.id) && e.class_subject_allocation_id === csa.id && e.status === StudentEnrollmentStatus.ENROLLED
        );
        return (
          <input
            type="checkbox"
            className="h-5 w-5 text-indigo-600 border-surface-border rounded focus:ring-indigo-500"
            checked={isEnrolled}
            onChange={() => handleGridEnrollmentChange(idOf(student.id), csa.id, isEnrolled)}
          />
        );
      }
    }));
    return [studentCol, ...subjectCols];
  }, [showEnrollmentGrid, subjectsForGrid, studentSubjectEnrollments, handleGridEnrollmentChange]);

  const handleShowGrid= () => {
    if (selectedAcademicYearId && selectedStreamId) {
        setShowEnrollmentGrid(true);
    } else {
        toast.showWarning('Please select academic year, school period, class, and stream first.');
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Student Subject Enrollments" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Single Enrollment
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          Enroll students into subjects. Use filters to narrow down student list for grid enrollment, or use "Single Enrollment" for individual management.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 border rounded-md bg-surface-muted">
            <Select label="Academic Year" value={selectedAcademicYearId ? String(selectedAcademicYearId) : ''} onChange={e => {setSelectedAcademicYearId(e.target.value || undefined);setSelectedSchoolPeriodId(undefined); setSelectedClassId(undefined); setSelectedStreamId(undefined); setShowEnrollmentGrid(false);}}>
                <option value="">Select Year</option>
                {academicYears.map(ay => <option key={ay.id} value={idOf(ay.id)}>{ay.name}</option>)}
            </Select>
            <Select label="School Period" value={selectedSchoolPeriodId ? String(selectedSchoolPeriodId) : ''} onChange={e => {setSelectedSchoolPeriodId(e.target.value || undefined);setSelectedClassId(undefined); setSelectedStreamId(undefined); setShowEnrollmentGrid(false);}} disabled={!selectedAcademicYearId}>
                <option value="">Select Period</option>
                {filteredSchoolPeriods.map(sp => <option key={sp.id} value={idOf(sp.id)}>{periodLabel(sp)}</option>)}
            </Select>
            <Select label="Class" value={selectedClassId ? String(selectedClassId) : ''} onChange={e => {setSelectedClassId(e.target.value || undefined);setSelectedStreamId(undefined); setShowEnrollmentGrid(false);}} disabled={!selectedSchoolPeriodId}>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={idOf(c.id)}>{c.name}</option>)}
            </Select>
            <Select label="Stream" value={selectedStreamId ? String(selectedStreamId) : ''} onChange={e => {setSelectedStreamId(e.target.value || undefined);setShowEnrollmentGrid(false);}} disabled={!selectedClassId}>
                <option value="">Select Stream</option>
                {filteredClassStreams.map(cs => <option key={cs.id} value={idOf(cs.id)}>{cs.name}</option>)}
            </Select>
        </div>
        <div className="mb-4">
            <Button onClick={handleShowGrid} disabled={!selectedStreamId || !selectedAcademicYearId}>
                Load Enrollment Grid for Selection
            </Button>
        </div>

        {showEnrollmentGrid && studentsForGrid.length > 0 && subjectsForGrid.length > 0 && (
            <Card title={`Enrollment Grid for ${nameIn(classStreams, selectedStreamId)} - ${nameIn(academicYears, selectedAcademicYearId)}`} className="mt-4">
                <p className="text-xs text-surface-muted-fg mb-2">Check to enroll, uncheck to unenroll. Changes are saved immediately.</p>
                <DataGrid columns={gridColumns} data={studentsForGrid} />
            </Card>
        )}
         {showEnrollmentGrid && (studentsForGrid.length === 0 || subjectsForGrid.length === 0) && (
            <p className="text-center text-surface-muted-fg py-4">No students or no subjects allocated to this class stream for the selected academic year.</p>
        )}

        <h3 className="text-lg font-semibold mt-8 mb-2">All Enrollment Records</h3>
        <DataGrid columns={columnsForListing} data={studentSubjectEnrollments} />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingEnrollment ? 'Edit Enrollment Status' : 'Enroll Student in Subject'} size="lg">
        <FormSection title="Student Information">
          <FormField label="Student" required>
            <Select 
              name="student_id" 
              value={formData.student_id || ''} 
              onChange={handleInputChange}
              required
              disabled={!!editingEnrollment} 
            >
              <option value="">Select Student</option>
              {students.filter(s => s.status === StudentStatus.ACTIVE).map(std => (
                <option key={std.id} value={idOf(std.id)}>{fullName(std)} ({std.admission_no})</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Subject Allocation" required>
            <Select 
              name="class_subject_allocation_id" 
              value={formData.class_subject_allocation_id || ''} 
              onChange={handleInputChange}
              required
              disabled={!!editingEnrollment || !formData.student_id}
            >
              <option value="">Select Subject (for Student's Class)</option>
              {classSubjectAllocations
                .filter(alloc => !formData.student_id || alloc.class_stream_id === idOf(students.find(s => idOf(s.id) === formData.student_id)?.current_class_stream_id)) // Filter by selected student's class stream
                .map(alloc => (
                <option key={alloc.id} value={alloc.id}>{alloc.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Enrollment Date" required>
            <Input 
                name="enrollment_date" 
                type="date" 
                value={formData.enrollment_date || ''} 
                onChange={handleInputChange} 
                required
                disabled={!!editingEnrollment}
            />
          </FormField>
          <FormField label="Enrollment Status" required>
            <Select 
                name="status" 
                value={formData.status} 
                onChange={handleInputChange}
                required
            >
                {Object.values(StudentEnrollmentStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </Select>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSubmit} loading={isSaving}>
            {editingEnrollment ? 'Save Changes' : 'Enroll Student'}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const StudentSubjectEnrollmentPage: React.FC = () => (
  <div className="space-y-6">
    <StudentSubjectEnrollmentPageContent />
  </div>
);

export default StudentSubjectEnrollmentPage;
