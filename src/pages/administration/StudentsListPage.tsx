import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { Student, PersonGender, StudentStatus, ParentGuardian, Department, Designation, StudentCategory, Dormitory, ClassStream, Class as SchoolClass, AcademicsExamResultSummaryType as ExamResultSummary } from '../../types';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/ui/icons';
// import { useMockData } from '../hooks/useMockData'; // Switch to useAppData
import { useAppData } from '@/contexts/AppDataContext'; // Import useAppData
import Spinner from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';

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

  const initialFormData: StudentFormData = {
    admission_no: '',
    first_name: '',
    last_name: '',
    gender: PersonGender.MALE,
    status: StudentStatus.ACTIVE,
    primary_guardian_relationship_type: 'Guardian',
  };
  const [formData, setFormData] = useState<StudentFormData>(initialFormData);

  const openModal = (student?: Student) => {
    setEditingStudent(student || null);
    if (student) {
      setFormData({
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
      });
    } else {
       // Generate next admission number for new student
      const existingAdmNos = (students || []).map(s => parseInt(s.admission_no.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
      const nextAdmNoSuffix = existingAdmNos.length > 0 ? Math.max(...existingAdmNos) + 1 : 1;
      const nextAdmNo = `ADM${String(nextAdmNoSuffix).padStart(3, '0')}`;
      setFormData({...initialFormData, admission_no: nextAdmNo });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    const safeParseInt = (val: string): number | undefined => {
        const num = parseInt(val, 10);
        return isNaN(num) ? undefined : num;
    };

    setFormData(prev => {
        let processedValue: any = value;

        if (name === 'gender') {
            processedValue = value as PersonGender;
        } else if (name === 'status') {
            processedValue = value as StudentStatus;
        } else if (['current_class_stream_id', 'student_category_id', 'dormitory_id'].includes(name)) {
            processedValue = safeParseInt(value);
        } else if (type === 'checkbox' && 'checked' in e.target) {
            processedValue = (e.target as HTMLInputElement).checked;
        }
        
        return { ...prev, [name]: processedValue };
    });
  };


  const handleSubmit = async () => {
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
  };
  
  const handleDelete = async (studentId: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      await mockDeleteStudent(studentId);
    }
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
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];
  
  // Using a more specific loading state key if available, else fallback to `all` or `students`
  const pageIsLoading = loading.students || loading.all;


  return (
    <div className="space-y-6">
      <Card title="Student Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Student
        </Button>
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

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStudent ? 'Edit Student' : 'Add New Student'} size="xl"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={loading.students}>
              {loading.students ? <Spinner size="sm"/> : (editingStudent ? 'Save Changes' : 'Add Student')}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <fieldset className="border p-4 rounded-md">
            <legend className="text-md font-semibold px-2 text-gray-700">Student Details</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input name="admission_no" label="Admission No." value={formData.admission_no || ''} onChange={handleInputChange} required />
              <Input name="upi_no" label="UPI No." value={formData.upi_no || ''} onChange={handleInputChange} />
              <Input name="first_name" label="First Name" value={formData.first_name || ''} onChange={handleInputChange} required />
              <Input name="middle_name" label="Middle Name" value={formData.middle_name || ''} onChange={handleInputChange} />
              <Input name="last_name" label="Last Name" value={formData.last_name || ''} onChange={handleInputChange} required />
              <Select name="gender" label="Gender" value={formData.gender} onChange={handleInputChange} required>
                {Object.values(PersonGender).map(gender => ( <option key={gender} value={gender}>{gender}</option>))}
              </Select>
              <Input name="date_of_birth" label="Date of Birth" type="date" value={formData.date_of_birth || ''} onChange={handleInputChange} />
              <Input name="admission_date" label="Admission Date" type="date" value={formData.admission_date || ''} onChange={handleInputChange} />
               <Select name="status" label="Status" value={formData.status} onChange={handleInputChange} required>
                {Object.values(StudentStatus).map(status => ( <option key={status} value={status}>{status}</option>))}
              </Select>
              <Select name="current_class_stream_id" label="Class Stream" value={formData.current_class_stream_id ?? ''} onChange={handleInputChange}>
                <option value="">Select Stream</option>
                {(classStreams || []).map(cs => <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.name}</option>)}
              </Select>
              <Select name="student_category_id" label="Student Category" value={formData.student_category_id ?? ''} onChange={handleInputChange}>
                <option value="">Select Category</option>
                {(studentCategories || []).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </Select>
              <Select name="dormitory_id" label="Dormitory" value={formData.dormitory_id ?? ''} onChange={handleInputChange}>
                <option value="">Select Dormitory</option>
                {(dormitories || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              <Input name="religion" label="Religion" value={formData.religion || ''} onChange={handleInputChange} />
              <Input name="county" label="County" value={formData.county || ''} onChange={handleInputChange} />
              <Input name="primary_school" label="Primary School Attended" value={formData.primary_school || ''} onChange={handleInputChange} />
              <Input name="remarks" label="Remarks" value={formData.remarks || ''} onChange={handleInputChange} className="md:col-span-3" />
            </div>
          </fieldset>

          <fieldset className="border p-4 rounded-md">
            <legend className="text-md font-semibold px-2 text-gray-700">Primary Parent/Guardian</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input name="primary_guardian_name" label="Full Name" value={formData.primary_guardian_name || ''} onChange={handleInputChange} />
              <Select name="primary_guardian_relationship_type" label="Relationship Type" value={formData.primary_guardian_relationship_type || ''} onChange={handleInputChange}>
                <option value="">Select Type</option>
                <option value="Father">Father</option> <option value="Mother">Mother</option> <option value="Guardian">Guardian</option>
              </Select>
              <Input name="primary_guardian_phone" label="Phone" value={formData.primary_guardian_phone || ''} onChange={handleInputChange} />
            </div>
          </fieldset>

          <fieldset className="border p-4 rounded-md">
            <legend className="text-md font-semibold px-2 text-gray-700">Exam Result Summary (e.g., KCPE)</legend>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input name="exam_result_summary_exam_name" label="Exam Name" value={formData.exam_result_summary_exam_name || ''} onChange={handleInputChange} />
              <Input name="exam_result_summary_english" label="English" value={formData.exam_result_summary_english || ''} onChange={handleInputChange} />
              <Input name="exam_result_summary_kiswahili" label="Kiswahili" value={formData.exam_result_summary_kiswahili || ''} onChange={handleInputChange} />
              <Input name="exam_result_summary_mathematics" label="Mathematics" value={formData.exam_result_summary_mathematics || ''} onChange={handleInputChange} />
              <Input name="exam_result_summary_science" label="Science" value={formData.exam_result_summary_science || ''} onChange={handleInputChange} />
              <Input name="exam_result_summary_ssre" label="SSRE" value={formData.exam_result_summary_ssre || ''} onChange={handleInputChange} />
              <Input name="exam_result_summary_total_marks" label="Total Marks" type="number" value={formData.exam_result_summary_total_marks || ''} onChange={handleInputChange} />
            </div>
          </fieldset>
        </div>
      </Modal>
    </div>
  );
};

export default StudentsListPage;
