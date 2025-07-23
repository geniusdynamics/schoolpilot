import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import { Student, PersonGender, StudentStatus, ParentGuardian, Department, Designation, StudentCategory, Dormitory, ClassStream, Class as SchoolClass, AcademicsExamResultSummaryType as ExamResultSummary } from '../../../types';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Card from '../../../components/ui/Card';
import { PlusIcon, EditIcon, DeleteIcon, UserCircleIcon, UsersIcon, AcademicCapIcon, CogIcon } from '../../../components/ui/icons';
// import { useMockData } from '../../../hooks/useMockData'; // Switch to useAppData
import { useAppData } from '../../../contexts/AppDataContext'; // Import useAppData
import Spinner from '../../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import TabbedForm, { FormTab } from '../../../components/ui/forms/TabbedForm';
import SlideoutForm from '../../../components/ui/forms/SlideoutForm';
import { useFormValidation, validators } from '../../../hooks/useFormValidation';
import { useSlideout } from '../../../hooks/useSlideout';
import { getQuickEditConfig, QuickEditField, QuickEditConfig } from '../config/quickEditConfig';
import QuickEditConfigModal from '../components/QuickEditConfigModal';

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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentStatus | ''>('');
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

  // Form validation configuration
  const validationConfig = {
    admission_no: {
      rules: [validators.required('Admission number is required')],
      required: true,
    },
    first_name: {
      rules: [
        validators.required('First name is required'),
        validators.minLength(2, 'First name must be at least 2 characters'),
      ],
      required: true,
    },
    last_name: {
      rules: [
        validators.required('Last name is required'),
        validators.minLength(2, 'Last name must be at least 2 characters'),
      ],
      required: true,
    },
    gender: {
      rules: [validators.required('Gender is required')],
      required: true,
    },
    status: {
      rules: [validators.required('Status is required')],
      required: true,
    },
    primary_guardian_name: {
      rules: [validators.minLength(2, 'Guardian name must be at least 2 characters')],
    },
    primary_guardian_phone: {
      rules: [validators.pattern(/^[\+]?[0-9\-\s\(\)]+$/, 'Please enter a valid phone number')],
    },
  };

  const {
    formData,
    setFormData,
    getFieldProps,
    validateForm,
    handleSubmit: handleFormSubmit,
    isValid,
    isValidating,
    resetForm,
    validationState,
  } = useFormValidation<StudentFormData>(validationConfig, {
    mode: 'onChange',
    announceErrors: true,
  });

  // Slideout for quick edits
  const slideout = useSlideout<Student>({
    autoSave: false,
    preventCloseOnUnsaved: true,
    onSave: async (data) => {
      if (data) {
        await updateStudent(data);
      }
    },
  });

  // Navigate to add student page
  const handleAddStudent = () => {
    navigate('/administration/students/add');
  };

  const openModal = (student?: Student) => {
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
        primary_guardian_relationship_type: student.primary_guardian?.relationship_type || 'Guardian', // Corrected property
        exam_result_summary_exam_name: student.exam_result_summary?.exam_name || '',
        exam_result_summary_english: String(student.exam_result_summary?.english || ''),
        exam_result_summary_kiswahili: String(student.exam_result_summary?.kiswahili || ''),
        exam_result_summary_mathematics: String(student.exam_result_summary?.mathematics || ''),
        exam_result_summary_science: String(student.exam_result_summary?.science || ''),
        exam_result_summary_ssre: String(student.exam_result_summary?.social_studies_religious_education || ''),
        exam_result_summary_total_marks: String(student.exam_result_summary?.total_marks || ''),
      };
      setFormData(studentFormData);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
    resetForm(initialFormData);
    setActiveTab(0);
  };

  // Handle form field changes with proper type conversion
  const handleFieldChange = (name: string, value: any) => {
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
  };

  const handleSubmit = async () => {
    const isFormValid = await validateForm();
    if (!isFormValid) {
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
      } else {
        // For new student, exam_result_summary and primary_guardian are set directly
        const newStudentPayload = {
          ...studentPayload,
          exam_result_summary: examSummaryPayload,
        }
        await addStudent(newStudentPayload, guardianPayload as any);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving student:', error);
    }
  };
  
  const handleDelete = async (studentId: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      await mockDeleteStudent(studentId);
    }
  };

  // Quick edit functionality
  const handleQuickEdit = (student: Student) => {
    slideout.open(student);
  };

  // Get validation state for tabs
  const getTabValidation = () => {
    const personalValid = validationState.admission_no?.isValid !== false && 
                         validationState.first_name?.isValid !== false && 
                         validationState.last_name?.isValid !== false &&
                         validationState.gender?.isValid !== false &&
                         validationState.status?.isValid !== false;
    
    const guardianValid = validationState.primary_guardian_name?.isValid !== false &&
                         validationState.primary_guardian_phone?.isValid !== false;
    
    return {
      personal: personalValid,
      guardian: guardianValid,
      academic: true, // Academic fields are optional
    };
  };

  // Create form tabs
  const createFormTabs = (): FormTab[] => {
    const tabValidation = getTabValidation();
    
    return [
      {
        id: 'personal',
        label: 'Personal Details',
        icon: <UserCircleIcon className="w-5 h-5" />,
        required: true,
        validation: () => tabValidation.personal,
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                {...getFieldProps('admission_no')}
                label="Admission No." 
                required 
                onChange={(e) => handleFieldChange('admission_no', e.target.value)}
              />
              <Input 
                {...getFieldProps('upi_no')}
                label="UPI No." 
                onChange={(e) => handleFieldChange('upi_no', e.target.value)}
              />
              <Input 
                {...getFieldProps('first_name')}
                label="First Name" 
                required 
                onChange={(e) => handleFieldChange('first_name', e.target.value)}
              />
              <Input 
                {...getFieldProps('middle_name')}
                label="Middle Name" 
                onChange={(e) => handleFieldChange('middle_name', e.target.value)}
              />
              <Input 
                {...getFieldProps('last_name')}
                label="Last Name" 
                required 
                onChange={(e) => handleFieldChange('last_name', e.target.value)}
              />
              <Select 
                {...getFieldProps('gender')}
                label="Gender" 
                required
                onChange={(e) => handleFieldChange('gender', e.target.value)}
              >
                {Object.values(PersonGender).map(gender => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </Select>
              <Input 
                {...getFieldProps('date_of_birth')}
                label="Date of Birth" 
                type="date" 
                onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
              />
              <Input 
                {...getFieldProps('admission_date')}
                label="Admission Date" 
                type="date" 
                onChange={(e) => handleFieldChange('admission_date', e.target.value)}
              />
              <Select 
                {...getFieldProps('status')}
                label="Status" 
                required
                onChange={(e) => handleFieldChange('status', e.target.value)}
              >
                {Object.values(StudentStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
              <Input 
                {...getFieldProps('religion')}
                label="Religion" 
                onChange={(e) => handleFieldChange('religion', e.target.value)}
              />
              <Input 
                {...getFieldProps('county')}
                label="County" 
                onChange={(e) => handleFieldChange('county', e.target.value)}
              />
              <Input 
                {...getFieldProps('primary_school')}
                label="Primary School Attended" 
                onChange={(e) => handleFieldChange('primary_school', e.target.value)}
              />
            </div>
            <Input 
              {...getFieldProps('remarks')}
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
        validation: () => tabValidation.guardian,
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                {...getFieldProps('primary_guardian_name')}
                label="Guardian Full Name" 
                onChange={(e) => handleFieldChange('primary_guardian_name', e.target.value)}
              />
              <Select 
                {...getFieldProps('primary_guardian_relationship_type')}
                label="Relationship Type" 
                onChange={(e) => handleFieldChange('primary_guardian_relationship_type', e.target.value)}
              >
                <option value="">Select Type</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
              </Select>
              <Input 
                {...getFieldProps('primary_guardian_phone')}
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
        validation: () => tabValidation.academic,
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
  };

  const filteredStudents = useMemo(() => {
    return students
      .filter(student =>
        `${student.first_name} ${student.last_name} ${student.admission_no} ${student.primary_guardian?.name || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
      .filter(student =>
        statusFilter ? student.status === statusFilter : true
      );
  }, [students, searchTerm, statusFilter]);

  const columns = [
    { header: 'Adm No', accessor: 'admission_no' as keyof Student },
    { header: 'Name', 
      accessor: ((item: Student) => `${item.first_name} ${item.last_name}`),
      render: (item: Student) => (
        <Link to={`/administration/students/${item.id}`} className="text-indigo-600 hover:text-indigo-800 hover:underline">
          {item.first_name} {item.last_name}
        </Link>
      )
    },
    { header: 'Class', accessor: 'current_class_name' as keyof Student }, // Resolved name
    { header: 'Stream', accessor: 'current_class_stream_name' as keyof Student }, // Resolved name
    { header: 'Gender', accessor: 'gender' as keyof Student },
    { header: 'Status', 
      accessor: 'status' as keyof Student,
      render: (item: Student) => {
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
    { header: 'Guardian', accessor: ((item:Student) => item.primary_guardian?.name || '-')},
    {
      header: 'Actions',
      accessor: 'id' as keyof Student,
      render: (item: Student) => (
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" onClick={() => handleQuickEdit(item)} title="Quick Edit">
            <EditIcon className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>
            Full Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>
            Delete
          </Button>
        </div>
      ),
    },
  ];
  
  // Using a more specific loading state key if available, else fallback to `all` or `students`
  const pageIsLoading = loading.students || loading.all;


  return (
    <div className="space-y-6">
      <Card title="Student Management" actions={
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
          <Button onClick={handleAddStudent} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add Student
          </Button>
        </div>
      }>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            label="Search by Name, Adm No, Guardian"
          />
          <Select
            name="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StudentStatus | '')}
            label="Filter by Status"
          >
            <option value="">All Statuses</option>
            {Object.values(StudentStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
        </div>
        {pageIsLoading && !isModalOpen ? (
          <div className="flex justify-center items-center py-10"> <Spinner/> <span className="ml-2">Loading students...</span></div>
        ) : (
          <Table columns={columns} data={filteredStudents} isLoading={loading.students && isModalOpen} />
        )}
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingStudent ? 'Edit Student' : 'Add New Student'} 
        size="xl"
        className="max-h-[90vh] overflow-hidden"
      >
        <div className="h-full overflow-hidden">
          <TabbedForm
            tabs={createFormTabs()}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            validation={getTabValidation()}
            showProgress={true}
            allowTabSwitching={true}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            loading={loading.students || isValidating}
            submitButtonText={editingStudent ? 'Save Changes' : 'Add Student'}
            cancelButtonText="Cancel"
            size="md"
            variant="default"
          />
        </div>
      </Modal>

      {/* Quick Edit Slideout */}
      <SlideoutForm
        isOpen={slideout.isOpen}
        onClose={slideout.close}
        title="Quick Edit Student"
        width="lg"
        position="right"
        loading={slideout.isLoading}
        onSave={slideout.save}
        onCancel={slideout.close}
        saveLabel="Save Changes"
        cancelLabel="Cancel"
        autoSave={false}
        overlay={true}
        closeOnOverlayClick={true}
        closeOnEscape={true}
        showCloseButton={true}
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl backdrop-blur-sm"
      >
        {slideout.data && (
          <div className="space-y-6">
            {/* Student Info Header */}
            <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {slideout.data.first_name} {slideout.data.last_name}
                  </h3>
                  <p className="text-sm text-slate-300">
                    {slideout.data.admission_no} • {slideout.data.current_class_stream_name || 'No Class Assigned'}
                  </p>
                </div>
              </div>
            </div>

            {/* Configuration Button */}
            <div className="flex justify-between items-center mb-4">
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
                const fieldKey = field.key as keyof Student;
                
                if (field.type === 'select') {
                  let options = field.options || [];
                  let value = '';
                  
                  // Handle special cases for select fields
                  if (field.key === 'current_class_stream_id') {
                    options = (classStreams || []).map(cs => ({ 
                      value: cs.id, 
                      label: `${cs.class_name} - ${cs.name}` 
                    }));
                    value = slideout.data.current_class_stream_id?.toString() || '';
                  } else if (field.key === 'status') {
                    value = slideout.data.status || '';
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
                            slideout.updateData({ 
                              current_class_stream_id: e.target.value ? Number(e.target.value) : undefined 
                            });
                          } else if (field.key === 'status') {
                            slideout.updateData({ status: e.target.value as StudentStatus });
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
                    value = slideout.data.first_name || '';
                    onChange = (val) => slideout.updateData({ first_name: val });
                  } else if (field.key === 'last_name') {
                    value = slideout.data.last_name || '';
                    onChange = (val) => slideout.updateData({ last_name: val });
                  } else if (field.key === 'primary_guardian_name') {
                    value = slideout.data.primary_guardian?.name || '';
                    onChange = (val) => slideout.updateData({ 
                      primary_guardian: { 
                        ...slideout.data.primary_guardian, 
                        name: val 
                      } 
                    });
                  } else if (field.key === 'primary_guardian_phone') {
                    value = slideout.data.primary_guardian?.phone || '';
                    onChange = (val) => slideout.updateData({ 
                      primary_guardian: { 
                        ...slideout.data.primary_guardian, 
                        phone: val 
                      } 
                    });
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
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    </div>
                  );
                }
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-700">
              <Button
                variant="ghost"
                onClick={() => openModal(slideout.data)}
                className="text-slate-300 hover:text-white hover:bg-slate-700/50"
              >
                Full Edit
              </Button>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={slideout.close}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={slideout.save}
                  loading={slideout.isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </SlideoutForm>

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
