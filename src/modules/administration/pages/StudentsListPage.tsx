import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate

import DataGrid from '@/components/ui/data/DataGrid';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import { PlusIcon, EditIcon, DeleteIcon, UserCircleIcon, UsersIcon, AcademicCapIcon, CogIcon } from '@/components/ui/icons';
// import { useMockData } from '@/hooks/useMockData'; // Switch to useAppData
import { useAppData } from '@/hooks/useAppData'; // Import useAppData
import Spinner from '@/components/ui/Spinner';

import TabbedForm, { FormTab } from '@/components/ui/forms/TabbedForm';
import { usePageActions } from '@/hooks/usePageActions';
import { useToast } from '@/hooks/useToast';
import DialogForm from '@/components/ui/forms/DialogForm';

import QuickEditConfigModal from '@/components/QuickEditConfigModal';
import { getQuickEditConfig } from '@/config/quickEditConfig';
import { logger } from '@/utils/logging';
import { PersonGender, StudentStatus } from '@/core/types';
import type { ExamResultSummary, Student } from '@/core/types';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface StudentFormData extends Omit<Partial<Student>, 'id' | 'created_at' | 'updated_at' | 'primary_guardian' | 'exam_result_summary' | 'status' | 'gender' | 'admission_no' | 'first_name' | 'last_name'> {
  admission_no: string; // Required
  first_name: string;   // Required
  last_name: string;    // Required
  gender: PersonGender; // Required
  status: StudentStatus;// Required

  // IDs for dropdowns
  current_class_stream_id?: number;
  student_category_id?: number;
  dormitory_id?: number;

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


const StudentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    students, loading, addStudent, updateStudent, deleteStudent: mockDeleteStudent,
    studentCategories,
    dormitories,
    classStreams
  } = useAppData(); // Use useAppData
  
  const { showToast } = useToast();
  
  // Navigate to add student page - moved before usePageActions to fix temporal dead zone
  const handleAddStudent = useCallback(() => {
    navigate('/administration/students/add');
  }, [navigate]);
  
  // Register page actions
  usePageActions([
    {
      id: 'add-student',
      label: 'Add Student',
      icon: PlusIcon,
      onClick: handleAddStudent,
      variant: 'primary'
    }
  ]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [quickEditStudent, setQuickEditStudent] = useState<Student | null>(null);

  const [activeTab, setActiveTab] = useState(0);
  const [showQuickEditConfig, setShowQuickEditConfig] = useState(false);
  const [currentQuickEditConfig, setCurrentQuickEditConfig] = useState(getQuickEditConfig());

  const initialFormData: StudentFormData = {
    admission_no: '',
    first_name: '',
    last_name: '',
    gender: PersonGender.MALE,
    status: StudentStatus.ACTIVE,
    primary_guardian_relationship_type: 'Guardian',
  };

  const [formData, setFormData] = useState<StudentFormData>(initialFormData);

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  // handleAddStudent moved above to fix temporal dead zone error

  const openModal = useCallback((student?: Student) => {
    setEditingStudent(student || null);
    setActiveTab(0); // Reset to first tab
    
    if (student) {
      const studentFormData: StudentFormData = {
        ...student, // Spread all student properties that match StudentFormData
        admission_no: student.admission_no,
        first_name: student.first_name,
        last_name: student.last_name,
        gender: student.gender,
        status: student.status,
        current_class_stream_id: student.current_class_stream_id,
        student_category_id: student.student_category_id,
        dormitory_id: student.dormitory_id,
        primary_guardian_id: student.primary_guardian?.id,
        primary_guardian_name: student.primary_guardian?.name || '',
        primary_guardian_phone: student.primary_guardian?.phone || '',
        primary_guardian_relationship_type: student.primary_guardian?.relationship_type || 'Guardian',
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
      setFormData(initialFormData);
    }
    setIsModalOpen(true);
  }, [initialFormData]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingStudent(null);
    setFormData(initialFormData);
    setActiveTab(0);
  }, [initialFormData]);

  // Handle form field changes with proper type conversion
  const handleFieldChange = useCallback((name: string, value: any) => {
    const safeParseInt = (val: string): number | undefined => {
        const num = parseInt(val, 10);
        return isNaN(num) ? undefined : num;
    };

    let processedValue: any = value;

    if (name === 'gender') {
        processedValue = value as PersonGender;
    } else if (name === 'status') {
        processedValue = value as StudentStatus;
    } else if (['current_class_stream_id', 'student_category_id', 'dormitory_id'].includes(name)) {
        processedValue = safeParseInt(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  }, []);

  // Memoized navigation callback to prevent infinite re-renders
  const handleStudentDetailsClick = useCallback((studentId: string) => {
    navigate(`/administration/students/${studentId}`);
  }, [navigate]);

  const toast = useToast();
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

    const studentPayload: Omit<Student, 'id' | 'created_at' | 'updated_at' | 'primary_guardian' | 'exam_result_summary' | 'deleted_at' | 'current_class_name' | 'current_class_stream_name' | 'student_category_name' | 'dormitory_name' | 'display_name' | 'user_id' | 'email' | 'phone' | 'address' | 'remarks' | 'religion' | 'county' | 'district' | 'student_type' | 'primary_school' | 'marks_attained_primary' | 'class_admitted' | 'stream_admitted'> & { admission_no: string; first_name: string; last_name: string; gender: PersonGender; status: StudentStatus; current_class_stream_id?: number; student_category_id?: number; dormitory_id?: number; } = {
      ...coreStudentData, // contains fields like admission_no, upi_no, first_name, etc.
      // Ensure all required fields are correctly typed
      admission_no: coreStudentData.admission_no!,
      first_name: coreStudentData.first_name!,
      last_name: coreStudentData.last_name!,
      gender: coreStudentData.gender!,
      status: coreStudentData.status!,
      current_class_stream_id: coreStudentData.current_class_stream_id ? Number(coreStudentData.current_class_stream_id) : undefined,
      student_category_id: coreStudentData.student_category_id ? Number(coreStudentData.student_category_id) : undefined,
      dormitory_id: coreStudentData.dormitory_id ? Number(coreStudentData.dormitory_id) : undefined,
    };
    
    let guardianPayload: (Omit<ParentGuardian, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {relationship_type: string, id?: string}) | undefined = undefined;
    if (primary_guardian_name && primary_guardian_relationship_type) {
        guardianPayload = {
            id: primary_guardian_id, // Important for updates
            name: primary_guardian_name,
            phone: primary_guardian_phone || '',
            relationship_type: primary_guardian_relationship_type,
            // email, user_id, etc., would be handled in a more complex setup
        };
    }
    
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

    try {
      if (editingStudent) {
        const studentToUpdate: Student = {
          ...editingStudent, // existing IDs and timestamps
          ...studentPayload, // core form data
          exam_result_summary: examSummaryPayload || editingStudent.exam_result_summary, // Keep existing if not changed
          // primary_guardian will be handled by the mock update function based on guardianPayload
        };
        await updateStudent(studentToUpdate, guardianPayload as any); // Type assertion for mock fn
        showToast({
          variant: 'success',
          title: 'Student Updated',
          message: 'Student information has been successfully updated.',
        });
      } else {
        // For new student, exam_result_summary and primary_guardian are set directly
        const newStudentPayload = {
          ...studentPayload,
          exam_result_summary: examSummaryPayload,
        }
        await addStudent(newStudentPayload, guardianPayload as any);
        showToast({
          variant: 'success',
          title: 'Student Added',
          message: 'New student has been successfully added.',
        });
      }
      closeModal();
    } catch (error) {
      logger.error('Error saving student:', error);
      showToast({
        variant: 'error',
        title: 'Save Failed',
        message: 'Failed to save student information. Please try again.',
      });
    }
  }, [editingStudent, formData, updateStudent, addStudent, closeModal, showToast]);
  
  // Quick edit functionality - memoized to prevent column re-creation
  const handleQuickEdit = useCallback((student: Student) => {
    setQuickEditStudent(student);
  }, []);

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
        showToast({
          variant: 'error',
          title: 'Delete Failed',
          message: 'Failed to delete student. Please try again.',
        });
      }
    }
  }, [mockDeleteStudent, showToast]);

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
              <h4 className="text-md font-semibold text-gray-700">Current Academic Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select 
                  name="current_class_stream_id" 
                  label="Class Stream" 
                  value={formData.current_class_stream_id ?? ''} 
                  onChange={(e) => handleFieldChange('current_class_stream_id', e.target.value)}
                >
                  <option value="">Select Stream</option>
                  {(classStreams || []).map(cs => (
                    <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.name}</option>
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
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
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
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-700">Exam Result Summary (e.g., KCPE)</h4>
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
  }, [formData, handleFieldChange, classStreams, studentCategories, dormitories]);

  // Use students directly since DataGrid handles filtering
  const studentsData = students || [];


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
      
      render: (value: any, item: Student) => {
        const displayName = item.display_name || [item.first_name, item.last_name].filter(Boolean).join(' ') || item.admission_no || '—';
        return (
          <Link to={`/administration/students/${item.id}`} className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium truncate block max-w-[160px]" title={displayName}>
            {displayName}
          </Link>
        );
      }
    },
    { 
      key: 'current_class_name' as keyof Student, 
      header: 'Class',
      sortable: true,
      filterable: true,
      
    },
    { 
      key: 'current_class_stream_name' as keyof Student, 
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
          case StudentStatus.ALUMNI: colorClass = 'bg-blue-100 text-blue-800'; break;
          case StudentStatus.TRANSFERRED: colorClass = 'bg-gray-200 text-gray-800'; break;
          case StudentStatus.EXPELLED: colorClass = 'bg-red-100 text-red-800'; break;
          default: colorClass = 'bg-gray-100 text-gray-800';
        }
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{item.status}</span>
      }
    },
    { 
      key: 'guardian',
      header: 'Guardian',
      sortable: true,
      filterable: true,
      
      render: (value: any, item: Student) => (
        <span className="truncate block max-w-[130px]" title={item.primary_guardian?.name || ''}>{item.primary_guardian?.name || '—'}</span>
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
  ], []);
  
  // Using a more specific loading state key if available, else fallback to `all` or `students`
  const pageIsLoading = loading.students || loading.all;

  return (
    <div className="space-y-6">
      <Card title="Student Management" bodyClassName="p-0" actions={
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowQuickEditConfig(true)} 
            leftIcon={<CogIcon className="w-4 h-4" />}
            title="Configure Quick Edit"
          >
            Quick Edit Settings
          </Button>
        </div>
      }>
        <div className="border-t border-gray-200">
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
              icon: <UserCircleIcon className="h-12 w-12 text-gray-400" />,
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

      {/* Quick Edit Slideout - Simplified approach */}
      {quickEditStudent && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-lg h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl border-l border-slate-700 p-0 relative animate-slide-in flex flex-col">
            {/* Close button */}
            <button 
              onClick={() => setQuickEditStudent(null)} 
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-all z-10" 
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Student Info Header */}
                <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <UserCircleIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {quickEditStudent.display_name || [quickEditStudent.first_name, quickEditStudent.last_name].filter(Boolean).join(' ') || '—'}
                      </h3>
                      <p className="text-sm text-slate-300">
                        {quickEditStudent.admission_no} • {quickEditStudent.current_class_stream_name || 'No Class Assigned'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configuration Button */}
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-slate-300">Quick Edit Fields</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowQuickEditConfig(true)}
                    className="text-slate-400 hover:text-white hover:bg-slate-700/50"
                  >
                    <CogIcon className="w-4 h-4" />
                  </Button>
                </div>

                {/* Quick Edit Fields */}
                <div className="space-y-4">
                  {currentQuickEditConfig.fields.map((field) => {
                    if (field.type === 'select') {
                      let options = field.options || [];
                      let value = '';
                      
                      if (field.key === 'current_class_stream_id') {
                        options = (classStreams || []).map(cs => ({ 
                          value: cs.id, 
                          label: `${cs.class_name} - ${cs.name}` 
                        }));
                        value = quickEditStudent.current_class_stream_id?.toString() || '';
                      } else if (field.key === 'status') {
                        value = quickEditStudent.status || '';
                      }
                      
                      return (
                        <div key={field.key} className="space-y-2">
                          <label className="block text-sm font-medium text-slate-200">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-1">*</span>}
                          </label>
                          <select
                            value={value}
                            onChange={(e) => {
                              if (field.key === 'current_class_stream_id') {
                                setQuickEditStudent(prev => prev ? { 
                                  ...prev, 
                                  current_class_stream_id: e.target.value ? Number(e.target.value) : undefined 
                                } : null);
                              } else if (field.key === 'status') {
                                setQuickEditStudent(prev => prev ? { 
                                  ...prev, 
                                  status: e.target.value as StudentStatus 
                                } : null);
                              }
                            }}
                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select {field.label}</option>
                            {options.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    } else {
                      // Handle text inputs
                      let value = '';
                      let onChange = (val: string) => {};
                      
                      if (field.key === 'first_name') {
                        value = quickEditStudent.first_name || '';
                        onChange = (val) => setQuickEditStudent(prev => prev ? { ...prev, first_name: val } : null);
                      } else if (field.key === 'last_name') {
                        value = quickEditStudent.last_name || '';
                        onChange = (val) => setQuickEditStudent(prev => prev ? { ...prev, last_name: val } : null);
                      } else if (field.key === 'primary_guardian_name') {
                        value = quickEditStudent.primary_guardian?.name || '';
                        onChange = (val) => setQuickEditStudent(prev => prev ? { 
                          ...prev, 
                          primary_guardian: { 
                            ...prev.primary_guardian, 
                            name: val 
                          } 
                        } : null);
                      } else if (field.key === 'primary_guardian_phone') {
                        value = quickEditStudent.primary_guardian?.phone || '';
                        onChange = (val) => setQuickEditStudent(prev => prev ? { 
                          ...prev, 
                          primary_guardian: { 
                            ...prev.primary_guardian, 
                            phone: val 
                          } 
                        } : null);
                      }
                      
                      return (
                        <div key={field.key} className="space-y-2">
                          <label className="block text-sm font-medium text-slate-200">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-1">*</span>}
                          </label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`Enter ${field.label?.toLowerCase() ?? ''}`}
                          />
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            </div>

            {/* Footer with buttons */}
            <div className="border-t border-slate-700 p-6">
              <div className="flex justify-between items-center">
                <Button
                  variant="ghost"
                  onClick={() => {
                    const studentData = quickEditStudent;
                    setQuickEditStudent(null);
                    setTimeout(() => {
                      openModal(studentData);
                    }, 200);
                  }}
                  className="text-slate-300 hover:text-white hover:bg-slate-700/50"
                >
                  Full Edit
                </Button>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setQuickEditStudent(null)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (quickEditStudent) {
                        try {
                          await updateStudent(quickEditStudent);
                          showToast({
                            variant: 'success',
                            title: 'Quick Edit Saved',
                            message: 'Student information has been successfully updated.',
                          });
                          setQuickEditStudent(null);
                        } catch (error) {
                          showToast({
                            variant: 'error',
                            title: 'Quick Edit Failed',
                            message: 'Failed to save changes. Please try again.',
                          });
                        }
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <style>{`
            .animate-slide-in {
              animation: slideInDrawer 0.35s cubic-bezier(0.4,0,0.2,1);
            }
            @keyframes slideInDrawer {
              from { transform: translateX(100%); opacity: 0.7; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Quick Edit Configuration Modal */}
      <QuickEditConfigModal
        isOpen={showQuickEditConfig}
        onClose={() => setShowQuickEditConfig(false)}
        onConfigUpdate={(config) => {
          setCurrentQuickEditConfig(config);
          setShowQuickEditConfig(false);
        }}
      />
    </div>
  );
};

export default StudentsListPage;

export const StudentsListContent = StudentsListPage;
