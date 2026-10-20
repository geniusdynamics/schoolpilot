// ABOUTME: Student directory: lists learners with class, stream and guardian resolved at read time from live collections.
// ABOUTME: Add/Edit modal persists the learner and its primary guardian (guardian + relationship rows) via the guardian service.

import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate

import DataGrid from '@/components/ui/data/DataGrid';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import { PlusIcon, EditIcon, DeleteIcon, UserCircleIcon, UsersIcon, AcademicCapIcon } from '@/components/ui/icons';
// import { useMockData } from '@/hooks/useMockData'; // Switch to useAppData
import { useAppData } from '@/hooks/useAppData'; // Import useAppData
import { useLookups, resolveClassPlacement } from '@/hooks/useLookups';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import {
  saveStudentGuardian,
  resolvePrimaryGuardian,
  type GuardianInput,
  type GuardianRecord,
  type GuardianRelationshipRecord,
} from '@/domain/students/guardianService';

import TabbedForm, { FormTab } from '@/components/ui/forms/TabbedForm';
import { EntityForm, EntityFieldConfig } from '@/components/ui/forms';
// (usePageActions removed — its ActionBar registry is not rendered in the current layout)
import { useToast } from '@/hooks/useToast';
import DialogForm from '@/components/ui/forms/DialogForm';

import { logger } from '@/utils/logging';
import { PersonGender, StudentStatus } from '@/core/types';
import type { ExamResultSummary, Student } from '@/core/types';
import { useConfirm } from '@/components/ui/ConfirmDialog';

/** Foreign keys held as strings: UI-created records use UUIDs, so ids are never coerced to numbers. */
const ID_FIELDS = ['current_class_stream_id', 'student_category_id', 'dormitory_id'] as const;
type IdField = typeof ID_FIELDS[number];

/** Denormalised display copies: never written by this page (names are resolved at read time). */
const DENORMALISED_FIELDS = [
  'current_class_name', 'current_class_stream_name', 'student_category_name', 'dormitory_name', 'primary_guardian',
] as const;

interface StudentFormData extends Omit<Partial<Student>, 'id' | 'created_at' | 'updated_at' | 'primary_guardian' | 'exam_result_summary' | 'status' | 'gender' | 'admission_no' | 'first_name' | 'last_name' | IdField> {
  admission_no: string; // Required
  first_name: string;   // Required
  last_name: string;    // Required
  gender: PersonGender; // Required
  status: StudentStatus;// Required

  // IDs for dropdowns (string ids, '' or undefined when unset)
  current_class_stream_id?: string;
  student_category_id?: string;
  dormitory_id?: string;

  // Primary Guardian Details (for the form)
  primary_guardian_id?: string; // Existing guardian ID
  primary_guardian_name?: string;
  primary_guardian_phone?: string;
  primary_guardian_relationship_type?: string; // e.g., Mother, Father, Guardian

  // Exam Result Summary (simplified for form)
  exam_result_summary_exam_name?: string;
  exam_result_summary_english?: string;
  exam_result_summary_kiswahili?: string;
  exam_result_summary_mathematics?: string;
  exam_result_summary_science?: string;
  exam_result_summary_ssre?: string;
  exam_result_summary_total_marks?: string; // Input as string, convert to number
}

const createInitialFormData = (): StudentFormData => ({
  admission_no: '',
  first_name: '',
  last_name: '',
  gender: PersonGender.MALE,
  status: StudentStatus.ACTIVE,
  primary_guardian_relationship_type: 'Guardian',
});

const idToString = (value: unknown): string => (value == null ? '' : String(value));
const idOrNull = (value: string | undefined): string | null => (value ? value : null);

const StudentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    students, loading, addStudent, updateStudent, deleteStudent: mockDeleteStudent,
    studentCategories,
    dormitories,
  } = useAppData(); // Use useAppData

  // Live id → name maps (class, stream, guardian) so UI-created learners never render blank.
  const lookups = useLookups();
  // Write ports for the guardian service (reads come from `lookups`).
  const guardiansCollection = useDatabaseCollection<GuardianRecord>('parents_guardians', { loadOnMount: false, subscribeToChanges: false });
  const relationshipsCollection = useDatabaseCollection<GuardianRelationshipRecord>('student_guardian_relationships', { loadOnMount: false, subscribeToChanges: false });

  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [quickEditStudent, setQuickEditStudent] = useState<Student | null>(null);

  const [activeTab, setActiveTab] = useState(0);

  const [formData, setFormData] = useState<StudentFormData>(createInitialFormData);

  const openModal = useCallback((student?: Student) => {
    setEditingStudent(student || null);
    setActiveTab(0); // Reset to first tab

    if (student) {
      const guardian = resolvePrimaryGuardian(student, lookups.guardianRelationships, lookups.guardiansById);
      const editableFields: Partial<Student> = { ...student };
      for (const field of [...DENORMALISED_FIELDS, 'id', 'created_at', 'updated_at', 'exam_result_summary'] as const) {
        delete editableFields[field];
      }
      const studentFormData: StudentFormData = {
        ...editableFields, // Spread the remaining editable student properties
        admission_no: student.admission_no,
        first_name: student.first_name,
        last_name: student.last_name,
        gender: student.gender,
        status: student.status,
        current_class_stream_id: idToString(student.current_class_stream_id),
        student_category_id: idToString(student.student_category_id),
        dormitory_id: idToString(student.dormitory_id),
        primary_guardian_id: guardian?.id || undefined,
        primary_guardian_name: guardian?.name || '',
        primary_guardian_phone: guardian?.phone || '',
        primary_guardian_relationship_type: guardian?.relationship_type || 'Guardian',
        exam_result_summary_exam_name: student.exam_result_summary?.exam_name || '',
        exam_result_summary_english: String(student.exam_result_summary?.english || ''),
        exam_result_summary_kiswahili: String(student.exam_result_summary?.kiswahili || ''),
        exam_result_summary_mathematics: String(student.exam_result_summary?.mathematics || ''),
        exam_result_summary_science: String(student.exam_result_summary?.science || ''),
        exam_result_summary_ssre: String(student.exam_result_summary?.social_studies_religious_education || ''),
        exam_result_summary_total_marks: String(student.exam_result_summary?.total_marks || ''),
      };
      setFormData(studentFormData);
    } else {
      setFormData(createInitialFormData());
    }
    setIsModalOpen(true);
  }, [lookups.guardianRelationships, lookups.guardiansById]);

  // Opens the in-page add/edit modal. (The old ActionBar registry this used to
  // register with is not rendered anywhere in the current layout.)
  const handleAddStudent = useCallback(() => {
    openModal();
  }, [openModal]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingStudent(null);
    setFormData(createInitialFormData());
    setActiveTab(0);
  }, []);

  // Handle form field changes. Id fields stay strings (UUIDs must not be parsed as numbers).
  const handleFieldChange = useCallback((name: string, value: any) => {
    let processedValue: any = value;

    if (name === 'gender') {
        processedValue = value as PersonGender;
    } else if (name === 'status') {
        processedValue = value as StudentStatus;
    } else if ((ID_FIELDS as readonly string[]).includes(name)) {
        processedValue = idToString(value);
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
  }, []);

  // Memoized navigation callback to prevent infinite re-renders
  const handleStudentDetailsClick = useCallback((studentId: string) => {
    navigate(`/administration/students/${studentId}`);
  }, [navigate]);

  const toast = useToast();
  const { guardianRelationships: guardianRelationshipsForSave, refresh: refreshLookups } = lookups;
  const handleSubmit = useCallback(async () => {
    // Simple validation
    if (!formData.admission_no || !formData.first_name || !formData.last_name) {
      toast.showWarning('Please fill in all required fields (Admission No, First Name, Last Name)');
      return;
    }

    // Destructure form data
    const {
      primary_guardian_id, primary_guardian_name, primary_guardian_phone, primary_guardian_relationship_type,
      exam_result_summary_exam_name, exam_result_summary_english, exam_result_summary_kiswahili,
      exam_result_summary_mathematics, exam_result_summary_science, exam_result_summary_ssre, exam_result_summary_total_marks,
      ...coreStudentData // this will contain admission_no, first_name etc directly from StudentFormData
    } = formData;

    const studentPayload: Record<string, unknown> = {
      ...coreStudentData, // contains fields like admission_no, upi_no, first_name, etc.
      current_class_stream_id: idOrNull(coreStudentData.current_class_stream_id),
      student_category_id: idOrNull(coreStudentData.student_category_id),
      dormitory_id: idOrNull(coreStudentData.dormitory_id),
    };
    for (const field of DENORMALISED_FIELDS) delete studentPayload[field];

    const guardianInput: GuardianInput | undefined = primary_guardian_name
      ? {
          id: primary_guardian_id || undefined, // Important for updates
          name: primary_guardian_name,
          phone: primary_guardian_phone || '',
          relationship_type: primary_guardian_relationship_type || 'Guardian',
        }
      : undefined;

    let examSummaryPayload: ExamResultSummary | undefined = undefined;
    if (exam_result_summary_exam_name) {
        examSummaryPayload = {
            exam_name: exam_result_summary_exam_name,
            english: exam_result_summary_english,
            kiswahili: exam_result_summary_kiswahili,
            mathematics: exam_result_summary_mathematics,
            science: exam_result_summary_science,
            social_studies_religious_education: exam_result_summary_ssre,
            total_marks: exam_result_summary_total_marks ? parseFloat(exam_result_summary_total_marks) : undefined,
        };
    }

    const guardianStore = {
      guardians: guardiansCollection,
      relationships: relationshipsCollection,
      existingRelationships: guardianRelationshipsForSave,
    };

    try {
      if (editingStudent) {
        const studentId = String(editingStudent.id);
        await updateStudent(studentId, {
          ...studentPayload,
          exam_result_summary: examSummaryPayload || editingStudent.exam_result_summary, // Keep existing if not changed
        });
        await saveStudentGuardian(guardianStore, studentId, guardianInput);
        showToast({
          variant: 'success',
          title: 'Student Updated',
          message: 'Student information has been successfully updated.',
        });
      } else {
        // The id is chosen here so the guardian relationship can reference the new learner.
        const studentId = crypto.randomUUID();
        const newStudent = {
          ...studentPayload,
          id: studentId,
          admission_no: coreStudentData.admission_no,
          first_name: coreStudentData.first_name,
          last_name: coreStudentData.last_name,
          gender: coreStudentData.gender,
          status: coreStudentData.status,
          exam_result_summary: examSummaryPayload,
        };
        await addStudent(newStudent);
        await saveStudentGuardian(guardianStore, studentId, guardianInput);
        showToast({
          variant: 'success',
          title: 'Student Added',
          message: 'New student has been successfully added.',
        });
      }
      await refreshLookups();
      closeModal();
    } catch (error) {
      logger.error('Error saving student:', error);
      showToast({
        variant: 'error',
        title: 'Save Failed',
        message: 'Failed to save student information. Please try again.',
      });
    }
  }, [editingStudent, formData, updateStudent, addStudent, closeModal, showToast, toast, guardiansCollection, relationshipsCollection, guardianRelationshipsForSave, refreshLookups]);

  // Quick edit functionality - memoized to prevent column re-creation
  const handleQuickEdit = useCallback((student: Student) => {
    setQuickEditStudent(student);
  }, []);

  // Quick-edit fields — student-specific (3.2). The former generic config shapes
  // never matched real Student columns; these mirror what the old slideout
  // actually intended to expose.
  const quickEditFields: EntityFieldConfig[] = useMemo(() => [
    { name: 'first_name', label: 'First Name', required: true },
    { name: 'last_name', label: 'Last Name', required: true },
    {
      name: 'current_class_stream_id',
      label: 'Class Stream',
      type: 'select',
      options: lookups.streamOptions.map(o => ({ value: o.value, label: o.label })),
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: Object.values(StudentStatus).map(s => ({ value: s, label: s })),
    },
  ], [lookups.streamOptions]);

  // Quick-edit save — provider contract is (id, partial)
  const handleQuickEditSave = useCallback(async (values: Record<string, any>) => {
    if (!quickEditStudent) return;
    // An emptied stream picker clears the placement; ids stay strings.
    const patch: Record<string, unknown> = { ...values, current_class_stream_id: idOrNull(values.current_class_stream_id) };
    await updateStudent(String(quickEditStudent.id), patch);
  }, [quickEditStudent, updateStudent]);

  // Memoized delete handler to prevent column re-creation
  const confirm = useConfirm();
  const handleDelete = useCallback(async (studentId: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this student?' }))) {
      try {
        await mockDeleteStudent(studentId);
        showToast({
          variant: 'success',
          title: 'Student Deleted',
          message: 'Student has been successfully deleted.',
        });
      } catch (error) {
        logger.error('Error deleting student:', error);
        showToast({
          variant: 'error',
          title: 'Delete Failed',
          message: 'Failed to delete student. Please try again.',
        });
      }
    }
  }, [confirm, mockDeleteStudent, showToast]);

  // Create form tabs
  const createFormTabs = useCallback((): FormTab[] => {
    
    return [
      {
        id: 'personal',
        label: 'Personal Details',
        icon: <UserCircleIcon className="w-5 h-5" />,
        required: true,
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                name="admission_no"
                value={formData.admission_no || ''}
                label="Admission No." 
                required 
                onChange={(e) => handleFieldChange('admission_no', e.target.value)}
              />
              <Input 
                name="upi_no"
                value={formData.upi_no || ''}
                label="UPI No." 
                onChange={(e) => handleFieldChange('upi_no', e.target.value)}
              />
              <Input 
                name="first_name"
                value={formData.first_name || ''}
                label="First Name" 
                required 
                onChange={(e) => handleFieldChange('first_name', e.target.value)}
              />
              <Input 
                name="middle_name"
                value={formData.middle_name || ''}
                label="Middle Name" 
                onChange={(e) => handleFieldChange('middle_name', e.target.value)}
              />
              <Input 
                name="last_name"
                value={formData.last_name || ''}
                label="Last Name" 
                required 
                onChange={(e) => handleFieldChange('last_name', e.target.value)}
              />
              <Select 
                name="gender"
                value={formData.gender || PersonGender.MALE}
                label="Gender" 
                required
                onChange={(e) => handleFieldChange('gender', e.target.value)}
              >
                {Object.values(PersonGender).map(gender => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </Select>
              <Input 
                name="date_of_birth"
                value={formData.date_of_birth || ''}
                label="Date of Birth" 
                type="date" 
                onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
              />
              <Input 
                name="admission_date"
                value={formData.admission_date || ''}
                label="Admission Date" 
                type="date" 
                onChange={(e) => handleFieldChange('admission_date', e.target.value)}
              />
              <Select 
                name="status"
                value={formData.status || StudentStatus.ACTIVE}
                label="Status" 
                required
                onChange={(e) => handleFieldChange('status', e.target.value)}
              >
                {Object.values(StudentStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
              <Input 
                name="religion"
                value={formData.religion || ''}
                label="Religion" 
                onChange={(e) => handleFieldChange('religion', e.target.value)}
              />
              <Input 
                name="county"
                value={formData.county || ''}
                label="County" 
                onChange={(e) => handleFieldChange('county', e.target.value)}
              />
              <Input 
                name="primary_school"
                value={formData.primary_school || ''}
                label="Primary School Attended" 
                onChange={(e) => handleFieldChange('primary_school', e.target.value)}
              />
            </div>
            <Input 
              name="remarks"
              value={formData.remarks || ''}
              label="Remarks" 
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              className="w-full"
            />
          </div>
        ),
      },
      {
        id: 'guardian',
        label: 'Guardian Details',
        icon: <UsersIcon className="w-5 h-5" />,

        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                name="primary_guardian_name"
                value={formData.primary_guardian_name || ''}
                label="Guardian Full Name" 
                onChange={(e) => handleFieldChange('primary_guardian_name', e.target.value)}
              />
              <Select 
                name="primary_guardian_relationship_type"
                value={formData.primary_guardian_relationship_type || 'Guardian'}
                label="Relationship Type" 
                onChange={(e) => handleFieldChange('primary_guardian_relationship_type', e.target.value)}
              >
                <option value="">Select Type</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
              </Select>
              <Input 
                name="primary_guardian_phone"
                value={formData.primary_guardian_phone || ''}
                label="Phone Number" 
                onChange={(e) => handleFieldChange('primary_guardian_phone', e.target.value)}
              />
            </div>
          </div>
        ),
      },
      {
        id: 'academic',
        label: 'Academic Details',
        icon: <AcademicCapIcon className="w-5 h-5" />,

        content: (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-surface-foreground">Current Academic Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select 
                  name="current_class_stream_id" 
                  label="Class Stream" 
                  value={formData.current_class_stream_id ?? ''} 
                  onChange={(e) => handleFieldChange('current_class_stream_id', e.target.value)}
                >
                  <option value="">Select Stream</option>
                  {lookups.streamOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
                <Select 
                  name="student_category_id" 
                  label="Student Category" 
                  value={formData.student_category_id ?? ''} 
                  onChange={(e) => handleFieldChange('student_category_id', e.target.value)}
                >
                  <option value="">Select Category</option>
                  {(studentCategories || []).map(sc => (
                    <option key={sc.id} value={String(sc.id)}>{sc.name}</option>
                  ))}
                </Select>
                <Select 
                  name="dormitory_id" 
                  label="Dormitory" 
                  value={formData.dormitory_id ?? ''} 
                  onChange={(e) => handleFieldChange('dormitory_id', e.target.value)}
                >
                  <option value="">Select Dormitory</option>
                  {(dormitories || []).map(d => (
                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-surface-foreground">Exam Result Summary (e.g., KCPE)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Input 
                  name="exam_result_summary_exam_name" 
                  label="Exam Name" 
                  value={formData.exam_result_summary_exam_name || ''} 
                  onChange={(e) => handleFieldChange('exam_result_summary_exam_name', e.target.value)}
                />
                <Input 
                  name="exam_result_summary_english" 
                  label="English" 
                  value={formData.exam_result_summary_english || ''} 
                  onChange={(e) => handleFieldChange('exam_result_summary_english', e.target.value)}
                />
                <Input 
                  name="exam_result_summary_kiswahili" 
                  label="Kiswahili" 
                  value={formData.exam_result_summary_kiswahili || ''} 
                  onChange={(e) => handleFieldChange('exam_result_summary_kiswahili', e.target.value)}
                />
                <Input 
                  name="exam_result_summary_mathematics" 
                  label="Mathematics" 
                  value={formData.exam_result_summary_mathematics || ''} 
                  onChange={(e) => handleFieldChange('exam_result_summary_mathematics', e.target.value)}
                />
                <Input 
                  name="exam_result_summary_science" 
                  label="Science" 
                  value={formData.exam_result_summary_science || ''} 
                  onChange={(e) => handleFieldChange('exam_result_summary_science', e.target.value)}
                />
                <Input 
                  name="exam_result_summary_ssre" 
                  label="SSRE" 
                  value={formData.exam_result_summary_ssre || ''} 
                  onChange={(e) => handleFieldChange('exam_result_summary_ssre', e.target.value)}
                />
                <Input 
                  name="exam_result_summary_total_marks" 
                  label="Total Marks" 
                  type="number" 
                  value={formData.exam_result_summary_total_marks || ''} 
                  onChange={(e) => handleFieldChange('exam_result_summary_total_marks', e.target.value)}
                />
              </div>
            </div>
          </div>
        ),
      },
    ];
  }, [formData, handleFieldChange, lookups.streamOptions, studentCategories, dormitories]);

  // Use students directly since DataGrid handles filtering.
  // Project each row into a view model that materializes the computed
  // 'name' / 'className' / 'streamName' / 'guardian' fields the columns reference —
  // resolved at read time from live lookups (never from denormalised *_name fields),
  // so DataGrid's sort/filter work and UI-created learners do not render blank.
  const { streamById, guardianRelationships, guardiansById } = lookups;
  const studentsData = useMemo(
    () =>
      (students || []).map(s => {
        const placement = resolveClassPlacement({ streamById }, s.current_class_stream_id);
        const guardian = resolvePrimaryGuardian(s, guardianRelationships, guardiansById);
        return {
          ...s,
          name:
            s.display_name ||
            [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ') ||
            s.admission_no ||
            '—',
          className: placement.className || '—',
          streamName: placement.streamName || '—',
          guardian: guardian?.name || '—',
        };
      }),
    [students, streamById, guardianRelationships, guardiansById]
  );


  const columns = useMemo(() => [
    { 
      key: 'admission_no' as keyof Student, 
      header: 'Adm No',
      sortable: true,
      filterable: true,
      
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filterable: true,

      render: (value: any, item: Student & { name?: string }) => {
        const displayName = item.name || item.admission_no || '—';
        return (
          <Link to={`/administration/students/${item.id}`} className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium truncate block max-w-[160px]" title={displayName}>
            {displayName}
          </Link>
        );
      }
    },
    { 
      key: 'className', 
      header: 'Class',
      sortable: true,
      filterable: true,
      
    },
    { 
      key: 'streamName', 
      header: 'Stream',
      sortable: true,
      filterable: true,
      
    },
    { 
      key: 'gender' as keyof Student, 
      header: 'Gender',
      sortable: true,
      filterable: true,
      
    },
    { 
      key: 'status' as keyof Student,
      header: 'Status',
      sortable: true,
      filterable: true,
      
      render: (value: any, item: Student) => {
        let colorClass = '';
        switch(item.status) {
          case StudentStatus.ACTIVE: colorClass = 'bg-green-100 text-green-800'; break;
          case StudentStatus.SUSPENDED: colorClass = 'bg-yellow-100 text-yellow-800'; break;
          case StudentStatus.ALUMNI: colorClass = 'bg-primary-100 text-primary-800'; break;
          case StudentStatus.TRANSFERRED: colorClass = 'bg-gray-200 text-surface-foreground'; break;
          case StudentStatus.EXPELLED: colorClass = 'bg-red-100 text-red-800'; break;
          default: colorClass = 'bg-surface-accent text-surface-foreground';
        }
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{item.status}</span>
      }
    },
    {
      key: 'guardian',
      header: 'Guardian',
      sortable: true,
      filterable: true,

      render: (value: any, item: Student & { guardian?: string }) => (
        <span className="truncate block max-w-[130px]" title={item.guardian || ''}>{item.guardian || '—'}</span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
            align: 'center' as const,
      sticky: 'right' as const,
      render: (value: any, item: Student) => (
        <div className="flex space-x-1 justify-center">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleQuickEdit(item);
            }} 
            title="Quick Edit"
          >
            <EditIcon className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              openModal(item);
            }} 
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="danger" 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleDelete(item.id);
            }} 
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ], [handleQuickEdit, openModal, handleDelete]);
  
  // Using a more specific loading state key if available, else fallback to `all` or `students`
  const pageIsLoading = loading.students || loading.all;

  return (
    <div className="space-y-6">
      <Card title="Student Management" bodyClassName="p-0" actions={
        <div className="flex space-x-2">
          <Button onClick={handleAddStudent} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add Student
          </Button>
        </div>
      }>
        <div className="border-t border-surface-border">
          <DataGrid
            columns={columns}
            data={studentsData}
            loading={pageIsLoading && !isModalOpen}
            sortable={true}
            filterable={true}
            selectable={true}
            onRowClick={(student) => handleStudentDetailsClick(student.id)}
            onSelectionChange={(selected) => {
              logger.info('Selected students:', selected);
            }}
            emptyState={{
              icon: <UserCircleIcon className="h-12 w-12 text-surface-muted-fg" />,
              title: 'No students found',
              description: 'Get started by adding a new student using the Add Student action above.',
            }}
          />
        </div>
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingStudent ? 'Edit Student' : 'Add New Student'}
        size="xl"
        className="max-h-[90vh] overflow-hidden"
        contentPadding="none"
      >
        <div className="h-full overflow-hidden">
          <TabbedForm
            tabs={createFormTabs()}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showProgress={true}
            allowTabSwitching={true}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            loading={loading.students}
            submitButtonText={editingStudent ? 'Save Changes' : 'Add Student'}
            cancelButtonText="Cancel"
            size="md"
            variant="default"
          />
        </div>
      </DialogForm>

      {/* Quick Edit - EntityForm driven by a student-specific field set (3.2). */}
      {/* The former generic config shapes never matched real Student columns. */}
      {quickEditStudent && (
        <EntityForm
          isOpen
          onClose={() => setQuickEditStudent(null)}
          title={'Quick Edit — ' + (quickEditStudent.display_name || [quickEditStudent.first_name, quickEditStudent.last_name].filter(Boolean).join(' ') || quickEditStudent.admission_no)}
          description={quickEditStudent.admission_no}
          initialData={{
            first_name: quickEditStudent.first_name || '',
            last_name: quickEditStudent.last_name || '',
            current_class_stream_id: quickEditStudent.current_class_stream_id != null ? String(quickEditStudent.current_class_stream_id) : '',
            status: quickEditStudent.status || '',
          }}
          fields={quickEditFields}
          onSubmit={handleQuickEditSave}
        >
          <div className="flex justify-between items-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const studentData = quickEditStudent;
                setQuickEditStudent(null);
                setTimeout(() => openModal(studentData), 200);
              }}
            >
              Full Edit
            </Button>
          </div>
        </EntityForm>
      )}
    </div>
  );
};

export default StudentsListPage;

export const StudentsListContent = StudentsListPage;
