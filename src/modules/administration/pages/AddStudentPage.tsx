// ABOUTME: Add Student Page with TabbedForm implementation
// ABOUTME: Standalone page for adding new students using the modernized tabbed form interface

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonGender, StudentStatus, Student, ParentsGuardian, ExamResultSummary } from '../../../types';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import { UserCircleIcon, UsersIcon, AcademicCapIcon, ArrowLeftIcon } from '../../../components/ui/icons';
import { useAppData } from '../../../hooks/useAppData';
import TabbedForm, { FormTab } from '../../../components/ui/forms/TabbedForm';
// Removed useFormValidation import to fix infinite loop issue

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

const AddStudentPage: React.FC = () => {
  const navigate = useNavigate();
  const appData = useAppData();
  const {
    studentCategories,
    dormitories,
    classStreams,
    loading
  } = appData;
  
  // Access addStudent from enhanced operations
  const addStudent = (appData as any).addStudent;

  const [activeTab, setActiveTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoize initial form data to prevent recreation on every render
  const initialFormData = useMemo((): StudentFormData => ({
    admission_no: '',
    first_name: '',
    last_name: '',
    gender: PersonGender.MALE,
    status: StudentStatus.ACTIVE,
    primary_guardian_relationship_type: 'Guardian',
  }), []);

  // Simple form state management
  const [formData, setFormData] = useState<StudentFormData>(initialFormData);



  // Initialize form data
  useEffect(() => {
    setFormData(initialFormData);
  }, []);

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
  }, [setFormData]);

  // Simple validation for tabs
  const tabValidation = {
    personal: true, // We'll do simple validation on submit
    guardian: true,
    academic: true,
  };

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      // Simple validation
      if (!formData.admission_no || !formData.first_name || !formData.last_name) {
        alert('Please fill in all required fields (Admission No, First Name, Last Name)');
        setIsSubmitting(false);
        return;
      }

      // Destructure form data
      const {
        primary_guardian_id, primary_guardian_name, primary_guardian_phone, primary_guardian_relationship_type,
        exam_result_summary_exam_name, exam_result_summary_english, exam_result_summary_kiswahili,
        exam_result_summary_mathematics, exam_result_summary_science, exam_result_summary_ssre, exam_result_summary_total_marks,
        ...coreStudentData
      } = formData;

      const studentPayload: Omit<Student, 'id' | 'created_at' | 'updated_at' | 'primary_guardian' | 'exam_result_summary' | 'deleted_at' | 'current_class_name' | 'current_class_stream_name' | 'student_category_name' | 'dormitory_name' | 'display_name' | 'user_id' | 'email' | 'phone' | 'address' | 'remarks' | 'religion' | 'county' | 'district' | 'student_type' | 'primary_school' | 'marks_attained_primary' | 'class_admitted' | 'stream_admitted'> & { admission_no: string; first_name: string; last_name: string; gender: PersonGender; status: StudentStatus; current_class_stream_id?: number; student_category_id?: number; dormitory_id?: number; } = {
        ...coreStudentData,
        admission_no: coreStudentData.admission_no!,
        first_name: coreStudentData.first_name!,
        last_name: coreStudentData.last_name!,
        gender: coreStudentData.gender!,
        status: coreStudentData.status!,
        current_class_stream_id: coreStudentData.current_class_stream_id ? Number(coreStudentData.current_class_stream_id) : undefined,
        student_category_id: coreStudentData.student_category_id ? Number(coreStudentData.student_category_id) : undefined,
        dormitory_id: coreStudentData.dormitory_id ? Number(coreStudentData.dormitory_id) : undefined,
      };

      let guardianPayload: (Omit<ParentsGuardian, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & { relationship_type: string, id?: string }) | undefined = undefined;
      if (primary_guardian_name && primary_guardian_relationship_type) {
        guardianPayload = {
          id: primary_guardian_id,
          name: primary_guardian_name,
          phone: primary_guardian_phone || '',
          relationship_type: primary_guardian_relationship_type,
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

      const newStudentPayload = {
        ...studentPayload,
        exam_result_summary: examSummaryPayload,
      };

      await addStudent(newStudentPayload, guardianPayload as any);

      // Navigate back to students list on success
      navigate('/administration/students');
    } catch (error) {
      console.error('Error adding student:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, addStudent, navigate]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    navigate('/administration/students');
  }, [navigate]);

  // Memoize icons to prevent recreation
  const icons = useMemo(() => ({
    personal: <UserCircleIcon className="w-5 h-5" />,
    guardian: <UsersIcon className="w-5 h-5" />,
    academic: <AcademicCapIcon className="w-5 h-5" />,
  }), []);

  // Create form tabs - memoize with minimal stable dependencies
  const formTabs = useMemo((): FormTab[] => {
    return [
      {
        id: 'personal',
        label: 'Personal Details',
        icon: icons.personal,
        required: true,
        validation: () => tabValidation.personal,
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="admission_no"
                label="Admission No."
                required
                value={formData.admission_no || ''}
                onChange={(e) => handleFieldChange('admission_no', e.target.value)}
              />
              <Input
                name="upi_no"
                label="UPI No."
                value={formData.upi_no || ''}
                onChange={(e) => handleFieldChange('upi_no', e.target.value)}
              />
              <Input
                name="first_name"
                label="First Name"
                required
                value={formData.first_name || ''}

                onChange={(e) => handleFieldChange('first_name', e.target.value)}
              />
              <Input
                name="middle_name"
                label="Middle Name"
                value={formData.middle_name || ''}
                onChange={(e) => handleFieldChange('middle_name', e.target.value)}
              />
              <Input
                name="last_name"
                label="Last Name"
                required
                value={formData.last_name || ''}

                onChange={(e) => handleFieldChange('last_name', e.target.value)}
              />
              <Select
                name="gender"
                label="Gender"
                required
                value={formData.gender || ''}

                onChange={(e) => {
                  const value = typeof e === 'string' ? e : Array.isArray(e) ? e[0] : e.target.value;
                  handleFieldChange('gender', value);
                }}
              >
                {Object.values(PersonGender).map(gender => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </Select>
              <Input
                name="date_of_birth"
                label="Date of Birth"
                type="date"
                value={formData.date_of_birth || ''}
                onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
              />
              <Input
                name="admission_date"
                label="Admission Date"
                type="date"
                value={formData.admission_date || ''}
                onChange={(e) => handleFieldChange('admission_date', e.target.value)}
              />
              <Select
                name="status"
                label="Status"
                required
                value={formData.status || ''}

                onChange={(e) => {
                  const value = typeof e === 'string' ? e : Array.isArray(e) ? e[0] : e.target.value;
                  handleFieldChange('status', value);
                }}
              >
                {Object.values(StudentStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
              <Input
                name="religion"
                label="Religion"
                value={formData.religion || ''}
                onChange={(e) => handleFieldChange('religion', e.target.value)}
              />
              <Input
                name="county"
                label="County"
                value={formData.county || ''}
                onChange={(e) => handleFieldChange('county', e.target.value)}
              />
              <Input
                name="primary_school"
                label="Primary School Attended"
                value={formData.primary_school || ''}
                onChange={(e) => handleFieldChange('primary_school', e.target.value)}
              />
            </div>
            <Input
              name="remarks"
              label="Remarks"
              value={formData.remarks || ''}
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              className="w-full"
            />
          </div>
        ),
      },
      {
        id: 'guardian',
        label: 'Guardian Details',
        icon: icons.guardian,
        validation: () => tabValidation.guardian,
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="primary_guardian_name"
                label="Guardian Full Name"
                value={formData.primary_guardian_name || ''}

                onChange={(e) => handleFieldChange('primary_guardian_name', e.target.value)}
              />
              <Select
                name="primary_guardian_relationship_type"
                label="Relationship Type"
                value={formData.primary_guardian_relationship_type || ''}
                onChange={(e) => {
                  const value = typeof e === 'string' ? e : Array.isArray(e) ? e[0] : e.target.value;
                  handleFieldChange('primary_guardian_relationship_type', value);
                }}
              >
                <option value="">Select Type</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
              </Select>
              <Input
                name="primary_guardian_phone"
                label="Phone Number"
                value={formData.primary_guardian_phone || ''}

                onChange={(e) => handleFieldChange('primary_guardian_phone', e.target.value)}
              />
            </div>
          </div>
        ),
      },
      {
        id: 'academic',
        label: 'Academic Details',
        icon: icons.academic,
        validation: () => tabValidation.academic,
        content: (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-700">Current Academic Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  name="current_class_stream_id"
                  label="Class Stream"
                  value={formData.current_class_stream_id?.toString() ?? ''}
                  onChange={(e) => {
                    const value = typeof e === 'string' ? e : Array.isArray(e) ? e[0] : e.target.value;
                    handleFieldChange('current_class_stream_id', value);
                  }}
                >
                  <option value="">Select Stream</option>
                  {(classStreams || []).map(cs => (
                    <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.name}</option>
                  ))}
                </Select>
                <Select
                  name="student_category_id"
                  label="Student Category"
                  value={formData.student_category_id?.toString() ?? ''}
                  onChange={(e) => {
                    const value = typeof e === 'string' ? e : Array.isArray(e) ? e[0] : e.target.value;
                    handleFieldChange('student_category_id', value);
                  }}
                >
                  <option value="">Select Category</option>
                  {(studentCategories || []).map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </Select>
                <Select
                  name="dormitory_id"
                  label="Dormitory"
                  value={formData.dormitory_id?.toString() ?? ''}
                  onChange={(e) => {
                    const value = typeof e === 'string' ? e : Array.isArray(e) ? e[0] : e.target.value;
                    handleFieldChange('dormitory_id', value);
                  }}
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
  }, [
    // Only include truly stable dependencies
    icons,
    tabValidation,
    handleFieldChange,
    classStreams,
    studentCategories,
    dormitories,
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
          >
            Back to Students
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Student</h1>
            <p className="text-sm text-gray-600">Fill in the student information using the tabbed form below</p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="max-w-6xl mx-auto">
        <TabbedForm
          tabs={formTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          validation={tabValidation}
          showProgress={true}
          allowTabSwitching={true}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={isSubmitting || loading.students}
          submitButtonText="Add Student"
          cancelButtonText="Cancel"
          size="lg"
          variant="default"
        />
      </Card>
    </div>
  );
};

export default AddStudentPage;