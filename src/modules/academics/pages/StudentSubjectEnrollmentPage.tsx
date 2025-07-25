import React, { useState, useMemo, useEffect } from 'react';
import { Student, AcademicYear, SchoolPeriod, Class as SchoolClass, ClassStream, StudentStatus } from '@/types';
import { StudentSubjectEnrollment } from '@/core/types';
import { StudentEnrollmentStatus, Subject } from '@/modules/academics/data/types'; // Corrected imports
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input'; 
import { PlusIcon, EditIcon, DeleteIcon, UsersIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type EnrollmentFormData = Omit<Partial<StudentSubjectEnrollment>, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'class_name' | 'stream_name' | 'subject_name' | 'academic_year_name' | 'enrollment_status_display' | 'status'> & {
    status: StudentEnrollmentStatus;
};

const StudentSubjectEnrollmentPage: React.FC = () => {
  const { 
    studentSubjectEnrollments, 
    students,
    classSubjectAllocations,
    academicYears, // Added
    schoolPeriods, // Added
    classes,       // Added
    classStreams,  // Added
    subjects,      // Added
    loading, 
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<StudentSubjectEnrollment | null>(null);
  
  const initialFormData: EnrollmentFormData = { 
    student_id: undefined, 
    class_subject_allocation_id: undefined,
    enrollment_date: new Date().toISOString().split('T')[0],
    status: StudentEnrollmentStatus.ENROLLED,
  };
  const [formData, setFormData] = useState<EnrollmentFormData>(initialFormData);

  // Filters state
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | undefined>();
  const [selectedSchoolPeriodId, setSelectedSchoolPeriodId] = useState<number | undefined>();
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>();
  const [selectedStreamId, setSelectedStreamId] = useState<number | undefined>();

  const [showEnrollmentGrid, setShowEnrollmentGrid] = useState(false);

  // Filtered data for dropdowns
  const filteredSchoolPeriods = useMemo(() => {
    if (!selectedAcademicYearId) return [];
    return (schoolPeriods || []).filter(sp => sp.academic_year_id === selectedAcademicYearId);
  }, [selectedAcademicYearId, schoolPeriods]);

  const filteredClassStreams = useMemo(() => {
    if (!selectedClassId) return [];
    return (classStreams || []).filter(cs => cs.class_id === selectedClassId);
  }, [selectedClassId, classStreams]);

  // Data for the enrollment grid
  const studentsForGrid = useMemo(() => {
    if (!selectedStreamId) return [];
    return (students || []).filter(s => s.current_class_stream_id === selectedStreamId && s.status === StudentStatus.ACTIVE);
  }, [selectedStreamId, students]);

  const subjectsForGrid = useMemo(() => {
    if (!selectedStreamId || !selectedAcademicYearId) return [];
    return (classSubjectAllocations || []).filter(
      csa => csa.class_stream_id === selectedStreamId && csa.academic_year_id === selectedAcademicYearId
    );
  }, [selectedStreamId, selectedAcademicYearId, classSubjectAllocations]);

  const openModal = (enrollment?: StudentSubjectEnrollment) => {
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
      alert(t('validation.studentSubjectAllocationEnrollmentDateAndStatusAreRequired'));
      return;
    }

    const isDuplicate = (studentSubjectEnrollments || []).some(
        enr => enr.id !== editingEnrollment?.id &&
               enr.student_id === formData.student_id &&
               enr.class_subject_allocation_id === formData.class_subject_allocation_id &&
               enr.status === StudentEnrollmentStatus.ENROLLED 
    );

    if (isDuplicate && formData.status === StudentEnrollmentStatus.ENROLLED) {
        alert(t('messages.thisStudentIsAlreadyActivelyEnrolledInThisSubject'));
        return;
    }

    const payload = { 
        student_id: formData.student_id!, 
        class_subject_allocation_id: formData.class_subject_allocation_id!,
        enrollment_date: formData.enrollment_date!,
        status: formData.status!,
    };

    if (editingEnrollment) {
      // TODO: Implement updateStudentSubjectEnrollment when available in context
    } else {
      // TODO: Implement addStudentSubjectEnrollment when available in context
    }
    closeModal();
  };
  
  const handleGridEnrollmentChange = async (studentId: string, csaId: string, isCurrentlyEnrolled: boolean) => {
    if (isCurrentlyEnrolled) { // User wants to unenroll
      const existingEnrollment = (studentSubjectEnrollments || []).find(
        e => e.student_id === studentId && e.class_subject_allocation_id === csaId && e.status === StudentEnrollmentStatus.ENROLLED
      );
      if (existingEnrollment) {
        // Option 1: Update status to Withdrawn
        // await updateStudentSubjectEnrollment({ ...existingEnrollment, status: StudentEnrollmentStatus.WITHDRAWN });
        // Option 2: Delete enrollment record
        if (window.confirm("Are you sure you want to unenroll this student from the subject?")) {
            // TODO: Implement deleteStudentSubjectEnrollment when available in context
        }
      }
    } else { // User wants to enroll
      const payload = {
        student_id: studentId,
        class_subject_allocation_id: csaId,
        enrollment_date: new Date().toISOString().split('T')[0], // Default to today
        status: StudentEnrollmentStatus.ENROLLED,
      };
      // TODO: Implement addStudentSubjectEnrollment when available in context
    }
  };


  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this enrollment record?')) {
      // TODO: Implement deleteStudentSubjectEnrollment when available in context
    }
  };
  
  const columnsForListing: DataGridColumn<StudentSubjectEnrollment>[] = [
    { key: 'id', header: 'ID' },
    { key: 'student_name', header: 'Student' },
    { key: 'class_stream', header: 'Class-Stream', render: (value: any, item: StudentSubjectEnrollment) => `${item.class_name || ''} - ${item.stream_name || ''}`},
    { key: 'subject_name', header: 'Subject' },
    { key: 'academic_year_name', header: 'Academic Year' },
    { key: 'enrollment_date', header: 'Enrollment Date', render: (value: any, item: StudentSubjectEnrollment) => new Date(item.enrollment_date).toLocaleDateString() },
    { key: 'status', header: 'Status', 
      render: (value: any, item: StudentSubjectEnrollment) => (
        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === StudentEnrollmentStatus.ENROLLED ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {item.status}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, item: StudentSubjectEnrollment) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit Status</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const gridColumns = useMemo(() => {
    if (!showEnrollmentGrid) return [];
    const studentCol = { header: 'Student Name', accessor: (item: Student) => `${item.first_name} ${item.last_name}` };
    const subjectCols = (subjectsForGrid || []).map(csa => ({
      header: csa.subject_name || 'Unknown Subject',
      accessor: 'id', // Use student ID to look up enrollment
      render: (student: Student) => {
        const isEnrolled = (studentSubjectEnrollments || []).some(
          e => e.student_id === student.id && e.class_subject_allocation_id === csa.id && e.status === StudentEnrollmentStatus.ENROLLED
        );
        return (
          <input
            type="checkbox"
            className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            checked={isEnrolled}
            onChange={() => handleGridEnrollmentChange(student.id, csa.id, isEnrolled)}
            disabled={loading.studentSubjectEnrollments}
          />
        );
      }
    }));
    return [studentCol, ...subjectCols];
  }, [showEnrollmentGrid, subjectsForGrid, studentsForGrid, studentSubjectEnrollments, loading.studentSubjectEnrollments, handleGridEnrollmentChange]);


  const isLoadingPage = loading.studentSubjectEnrollments || loading.students || loading.classSubjectAllocations || loading.academicYears || loading.schoolPeriods || loading.classes || loading.classStreams;

  if (isLoadingPage && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Student Enrollments...</span>
      </div>
    );
  }
  
  const handleShowGrid = () => {
    if (selectedAcademicYearId && selectedStreamId) {
        setShowEnrollmentGrid(true);
    } else {
        alert(t('validation.pleaseSelectAcademicYearSchoolPeriodClassAndStreamFirst'));
    }
  }


  return (
    <div className="space-y-6">
      <Card title="Student Subject Enrollments" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Single Enrollment
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Enroll students into subjects. Use filters to narrow down student list for grid enrollment, or use "Single Enrollment" for individual management.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 border rounded-md bg-gray-50">
            <Select label="Academic Year" value={selectedAcademicYearId || ''} onChange={e => {setSelectedAcademicYearId(Number(e.target.value) || undefined); setSelectedSchoolPeriodId(undefined); setSelectedClassId(undefined); setSelectedStreamId(undefined); setShowEnrollmentGrid(false);}}>
                <option value="">Select Year</option>
                {(academicYears || []).map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
            </Select>
            <Select label="School Period" value={selectedSchoolPeriodId || ''} onChange={e => {setSelectedSchoolPeriodId(Number(e.target.value) || undefined); setSelectedClassId(undefined); setSelectedStreamId(undefined); setShowEnrollmentGrid(false);}} disabled={!selectedAcademicYearId}>
                <option value="">Select Period</option>
                {filteredSchoolPeriods.map(sp => <option key={sp.id} value={sp.id}>{sp.period_definition_name}</option>)}
            </Select>
            <Select label="Class" value={selectedClassId || ''} onChange={e => {setSelectedClassId(Number(e.target.value) || undefined); setSelectedStreamId(undefined); setShowEnrollmentGrid(false);}} disabled={!selectedSchoolPeriodId}>
                <option value="">Select Class</option>
                {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Stream" value={selectedStreamId || ''} onChange={e => {setSelectedStreamId(Number(e.target.value) || undefined); setShowEnrollmentGrid(false);}} disabled={!selectedClassId}>
                <option value="">Select Stream</option>
                {filteredClassStreams.map(cs => <option key={cs.id} value={cs.id}>{cs.name}</option>)}
            </Select>
        </div>
        <div className="mb-4">
            <Button onClick={handleShowGrid} disabled={!selectedStreamId || !selectedAcademicYearId}>
                Load Enrollment Grid for Selection
            </Button>
        </div>

        {showEnrollmentGrid && studentsForGrid.length > 0 && subjectsForGrid.length > 0 && (
            <Card title={`Enrollment Grid for ${(classStreams || []).find(cs=>cs.id === selectedStreamId)?.name} - ${(academicYears || []).find(ay=>ay.id === selectedAcademicYearId)?.name}`} className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Check to enroll, uncheck to unenroll. Changes are saved immediately.</p>
                <DataGrid columns={gridColumns} data={studentsForGrid} loading={loading.studentSubjectEnrollments} />
            </Card>
        )}
         {showEnrollmentGrid && (studentsForGrid.length === 0 || subjectsForGrid.length === 0) && (
            <p className="text-center text-gray-500 py-4">No students or no subjects allocated to this class stream for the selected academic year.</p>
        )}


        <h3 className="text-lg font-semibold mt-8 mb-2">All Enrollment Records</h3>
        <DataGrid columns={columnsForListing} data={(studentSubjectEnrollments || [])} loading={loading.studentSubjectEnrollments && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingEnrollment ? 'Edit Enrollment Status' : 'Enroll Student in Subject'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.studentSubjectEnrollments}>
              {loading.studentSubjectEnrollments ? <Spinner size="sm"/> : (editingEnrollment ? 'Save Changes' : 'Enroll Student')}
            </Button>
          </>
        }
      >
        <Select 
          name="student_id" 
          label="Student" 
          value={formData.student_id || ''} 
          onChange={handleInputChange}
          required
          disabled={!!editingEnrollment} 
        >
          <option value="">Select Student</option>
          {(students || []).filter(s => s.status === StudentStatus.ACTIVE).map((std: Student) => (
            <option key={std.id} value={std.id}>{std.first_name} {std.last_name} ({std.admission_no}) - {std.current_class_name} {std.current_class_stream_name}</option>
          ))}
        </Select>
        <Select 
          name="class_subject_allocation_id" 
          label="Subject Allocation" 
          value={formData.class_subject_allocation_id || ''} 
          onChange={handleInputChange}
          required
          disabled={!!editingEnrollment || !formData.student_id}
        >
          <option value="">Select Subject (for Student's Class)</option>
          {(classSubjectAllocations || [])
            .filter(alloc => !formData.student_id || alloc.class_stream_id === (students || []).find(s => s.id === formData.student_id)?.current_class_stream_id) // Filter by selected student's class stream
            .map((alloc: any) => (
            <option key={alloc.id} value={alloc.id}>
              {alloc.subject_name} ({alloc.class_stream_name} - {alloc.academic_year_name})
            </option>
          ))}
        </Select>
        <Input 
            name="enrollment_date" 
            label="Enrollment Date" 
            type="date" 
            value={formData.enrollment_date || ''} 
            onChange={handleInputChange} 
            required
            disabled={!!editingEnrollment}
        />
        <Select 
            name="status" 
            label="Enrollment Status" 
            value={formData.status} 
            onChange={handleInputChange}
            required
        >
            {Object.values(StudentEnrollmentStatus).map(status => (
                <option key={status} value={status}>{status}</option>
            ))}
        </Select>
      </Modal>
    </div>
  );
};

export default StudentSubjectEnrollmentPage;
