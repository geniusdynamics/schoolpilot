/**
 * Entity Mappings for ERPNext
 * 
 * Maps SchoolPilot entities to ERPNext DocTypes.
 */

export interface EntityMapping {
  localEntity: string;
  backendEntity: string;
  fieldMappings: Record<string, string>;
}

export const entityMappings: Record<string, EntityMapping> = {
  students: {
    localEntity: 'students',
    backendEntity: 'Student',
    fieldMappings: {
      id: 'name',
      firstName: 'first_name',
      middleName: 'middle_name',
      lastName: 'last_name',
      email: 'student_email_id',
      phone: 'student_mobile_number',
      dateOfBirth: 'date_of_birth',
      gender: 'gender',
      bloodGroup: 'blood_group',
      nationality: 'nationality',
      status: 'status',
      photo: 'image',
      address: 'address',
      pincode: 'pincode',
    },
  },
  
  employees: {
    localEntity: 'employees',
    backendEntity: 'Employee',
    fieldMappings: {
      id: 'name',
      firstName: 'first_name',
      middleName: 'middle_name',
      lastName: 'last_name',
      fullName: 'employee_name',
      email: 'company_email',
      personalEmail: 'personal_email',
      phone: 'cell_number',
      emergencyPhone: 'emergency_phone_number',
      dateOfBirth: 'date_of_birth',
      dateOfJoining: 'date_of_joining',
      designation: 'designation',
      department: 'department',
      employmentType: 'employment_type',
      employeeNumber: 'employee_number',
      status: 'status',
      photo: 'image',
      gender: 'gender',
    },
  },
  
  courses: {
    localEntity: 'courses',
    backendEntity: 'Course',
    fieldMappings: {
      id: 'name',
      name: 'course_name',
      code: 'course_code',
      abbreviation: 'course_abbreviation',
      department: 'department',
      description: 'description',
      intro: 'course_intro',
      image: 'course_image',
      gradingScale: 'default_grading_scale',
    },
  },
  
  programs: {
    localEntity: 'programs',
    backendEntity: 'Program',
    fieldMappings: {
      id: 'name',
      name: 'program_name',
      code: 'program_code',
      department: 'department',
      effectiveFrom: 'effective_from',
      effectiveTo: 'effective_to',
    },
  },
  
  fees: {
    localEntity: 'fees',
    backendEntity: 'Fees',
    fieldMappings: {
      id: 'name',
      studentId: 'student',
      studentName: 'student_name',
      program: 'program',
      programEnrollment: 'program_enrollment',
      studentCategory: 'student_category',
      feeStructure: 'fee_structure',
      postingDate: 'posting_date',
      dueDate: 'due_date',
      grandTotal: 'grand_total',
      outstandingAmount: 'outstanding_amount',
      status: 'status',
    },
  },
  
  attendance: {
    localEntity: 'attendance',
    backendEntity: 'Student Attendance',
    fieldMappings: {
      id: 'name',
      studentId: 'student',
      studentName: 'student_name',
      studentGroup: 'student_group',
      date: 'date',
      status: 'status',
      course: 'course',
      courseSchedule: 'course_schedule',
      instructor: 'instructor',
      instructorName: 'instructor_name',
      room: 'room',
    },
  },
  
  assessments: {
    localEntity: 'assessments',
    backendEntity: 'Assessment Result',
    fieldMappings: {
      id: 'name',
      studentId: 'student',
      studentName: 'student_name',
      course: 'course',
      assessmentGroup: 'assessment_group',
      assessmentPlan: 'assessment_plan',
      totalScore: 'total_score',
      maximumScore: 'maximum_score',
      grade: 'grade',
    },
  },
  
  studentGroups: {
    localEntity: 'studentGroups',
    backendEntity: 'Student Group',
    fieldMappings: {
      id: 'name',
      name: 'student_group_name',
      groupBasedOn: 'group_based_on',
      academicYear: 'academic_year',
      academicTerm: 'academic_term',
      program: 'program',
      batch: 'batch',
      course: 'course',
      maxStrength: 'max_strength',
    },
  },
  
  feeStructures: {
    localEntity: 'feeStructures',
    backendEntity: 'Fee Structure',
    fieldMappings: {
      id: 'name',
      program: 'program',
      studentCategory: 'student_category',
      academicYear: 'academic_year',
      totalAmount: 'total_amount',
    },
  },
};
