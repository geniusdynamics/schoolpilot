// ABOUTME: Generates comprehensive administration data including students, staff, partners, and communication templates
// ABOUTME: Creates realistic profiles with relationships and dependencies for school management

import { BaseGenerator } from './BaseGenerator';
import { DataGenerationConfig } from '../types';

export class AdministrationGenerator extends BaseGenerator {
  private academicYears: any[] = [];
  private dormitories: any[] = [];
  private transportRoutes: any[] = [];
  private departments: any[] = [];
  private designations: any[] = [];
  private subjects: any[] = [];

  constructor(config: DataGenerationConfig) {
    super(config);
  }

  async generateData(count: number): Promise<any[]> {
    await this.initialize();
    await this.generateSupportingData();
    
    const results: any[] = [];
    
    // Generate comprehensive student data (minimum 500 students)
    const studentData = await this.generateStudents(Math.max(500, Math.floor(count * 0.8)));
    results.push(...studentData);
    
    // Generate comprehensive staff data (minimum 100 staff)
    const staffData = await this.generateStaff(Math.max(100, count - Math.max(500, Math.floor(count * 0.8))));
    results.push(...staffData);
    
    // Generate parents data
    const parentsData = await this.generateParents(Math.max(300, Math.floor(count * 0.6)));
    results.push(...parentsData);
    
    // Generate classes data
    const classesData = await this.generateClasses();
    results.push(...classesData);
    
    // Generate departments data
    const departmentsData = await this.generateDepartmentsData();
    results.push(...departmentsData);
    
    // Generate roles data
    const rolesData = await this.generateRoles();
    results.push(...rolesData);
    
    return results;
  }

  private async generateParents(count: number): Promise<any[]> {
    const results: any[] = [];
    console.log(`Generating ${count} parents...`);
    
    const occupations = [
      'Teacher', 'Doctor', 'Engineer', 'Lawyer', 'Accountant', 'Nurse', 'Farmer',
      'Business Owner', 'Civil Servant', 'Police Officer', 'Driver', 'Mechanic',
      'Tailor', 'Chef', 'Carpenter', 'Electrician', 'Plumber', 'Shop Keeper'
    ];
    
    for (let i = 0; i < count; i++) {
      const name = this.generateName();
      const parent = {
        id: this.generateId('parent', i),
        first_name: name.first,
        last_name: name.last,
        phone_number: this.generatePhoneNumber(),
        email: this.generateEmail(name.first, name.last),
        id_number: this.randomInt(10000000, 99999999).toString(),
        occupation: this.randomChoice(occupations),
        employer: this.generateCompanyName(),
        work_phone: this.generatePhoneNumber(),
        address: this.generateAddress(),
        relationship_to_student: this.randomChoice(['Father', 'Mother', 'Guardian']),
        is_primary_contact: this.randomBoolean(0.7),
        emergency_contact: this.randomBoolean(0.9),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'parents',
        data: parent
      });
    }
    
    return results;
  }

  private async generateClasses(): Promise<any[]> {
    const results: any[] = [];
    console.log('Generating classes...');
    
    const forms = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
    const streams = ['A', 'B', 'C', 'D'];
    
    let classId = 0;
    for (const form of forms) {
      for (const stream of streams) {
        const classData = {
          id: this.generateId('class', classId++),
          name: `${form}${stream}`,
          form: form,
          stream: stream,
          capacity: this.randomInt(35, 45),
          current_enrollment: this.randomInt(25, 40),
          class_teacher_id: this.generateId('staff', this.randomInt(0, 99)),
          room_number: `R${this.randomInt(100, 299)}`,
          academic_year: new Date().getFullYear(),
          is_active: true,
          created_at: this.generateTimestamp(365),
          updated_at: this.generateTimestamp(30)
        };
        
        results.push({
          table: 'classes',
          data: classData
        });
      }
    }
    
    return results;
  }

  private async generateDepartmentsData(): Promise<any[]> {
    const results: any[] = [];
    console.log('Generating departments data...');
    
    for (let i = 0; i < this.departments.length; i++) {
      const dept = this.departments[i];
      const departmentData = {
        id: this.generateId('department', i),
        name: dept.name,
        code: dept.code,
        description: dept.description,
        head_of_department_id: this.generateId('staff', this.randomInt(0, 99)),
        budget_allocation: this.randomInt(50000, 500000),
        staff_count: this.randomInt(5, 20),
        is_active: true,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'departments',
        data: departmentData
      });
    }
    
    return results;
  }

  private async generateRoles(): Promise<any[]> {
    const results: any[] = [];
    console.log('Generating roles...');
    
    const roles = [
      { name: 'Principal', description: 'School Principal', level: 1 },
      { name: 'Deputy Principal', description: 'Deputy Principal', level: 2 },
      { name: 'Head of Department', description: 'Department Head', level: 3 },
      { name: 'Senior Teacher', description: 'Senior Teaching Staff', level: 4 },
      { name: 'Teacher', description: 'Teaching Staff', level: 5 },
      { name: 'Librarian', description: 'Library Staff', level: 6 },
      { name: 'Accountant', description: 'Finance Staff', level: 6 },
      { name: 'Secretary', description: 'Administrative Staff', level: 7 },
      { name: 'Security Guard', description: 'Security Staff', level: 8 },
      { name: 'Cleaner', description: 'Cleaning Staff', level: 9 }
    ];
    
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const roleData = {
        id: this.generateId('role', i),
        name: role.name,
        description: role.description,
        level: role.level,
        permissions: this.generateRolePermissions(role.name),
        salary_range_min: this.generateSalaryRange(role.level).min,
        salary_range_max: this.generateSalaryRange(role.level).max,
        is_active: true,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'roles',
        data: roleData
      });
    }
    
    return results;
  }

  private generateRolePermissions(roleName: string): string[] {
    const basePermissions = ['view_dashboard', 'view_profile'];
    
    switch (roleName) {
      case 'Principal':
        return [...basePermissions, 'manage_all', 'view_reports', 'manage_staff', 'manage_students', 'manage_finance'];
      case 'Deputy Principal':
        return [...basePermissions, 'manage_staff', 'manage_students', 'view_reports'];
      case 'Head of Department':
        return [...basePermissions, 'manage_department', 'view_department_reports'];
      case 'Teacher':
        return [...basePermissions, 'manage_classes', 'view_students', 'enter_grades'];
      case 'Librarian':
        return [...basePermissions, 'manage_library', 'manage_books'];
      case 'Accountant':
        return [...basePermissions, 'manage_finance', 'view_financial_reports'];
      default:
        return basePermissions;
    }
  }

  private generateSalaryRange(level: number): { min: number; max: number } {
    const ranges = {
      1: { min: 80000, max: 120000 }, // Principal
      2: { min: 60000, max: 90000 },  // Deputy Principal
      3: { min: 45000, max: 70000 },  // Head of Department
      4: { min: 35000, max: 55000 },  // Senior Teacher
      5: { min: 25000, max: 45000 },  // Teacher
      6: { min: 20000, max: 35000 },  // Librarian/Accountant
      7: { min: 15000, max: 25000 },  // Secretary
      8: { min: 12000, max: 20000 },  // Security
      9: { min: 10000, max: 15000 }   // Cleaner
    };
    
    return ranges[level] || { min: 10000, max: 20000 };
  }

  private async generateSupportingData(): Promise<void> {
    // Generate academic years
    this.academicYears = [
      { id: 'ay_2023', name: '2023', start_date: '2023-01-01', end_date: '2023-12-31', is_current: false },
      { id: 'ay_2024', name: '2024', start_date: '2024-01-01', end_date: '2024-12-31', is_current: true },
      { id: 'ay_2025', name: '2025', start_date: '2025-01-01', end_date: '2025-12-31', is_current: false }
    ];

    // Generate dormitories
    const dormitoryNames = ['Sunrise House', 'Sunset House', 'Eagle House', 'Lion House', 'Tiger House', 'Leopard House'];
    this.dormitories = dormitoryNames.map((name, index) => ({
      id: this.generateId('dorm', index),
      name,
      capacity: this.randomInt(50, 120),
      gender: this.randomChoice(['male', 'female', 'mixed']),
      matron_id: null, // Will be assigned after staff generation
      description: `${name} dormitory for students`,
      created_at: this.generateTimestamp(365),
      updated_at: this.generateTimestamp(30)
    }));

    // Generate transport routes
    const routeNames = ['City Center Route', 'Westlands Route', 'Eastlands Route', 'Karen Route', 'Kileleshwa Route'];
    this.transportRoutes = routeNames.map((name, index) => ({
      id: this.generateId('route', index),
      name,
      description: `Transport route covering ${name.split(' ')[0]} area`,
      fare: this.randomFloat(500, 2000),
      distance_km: this.randomFloat(5, 25),
      estimated_time_minutes: this.randomInt(20, 60),
      is_active: this.randomBoolean(0.9),
      created_at: this.generateTimestamp(365),
      updated_at: this.generateTimestamp(30)
    }));

    // Generate departments
    const departmentNames = [
      'Administration', 'Academic Affairs', 'Finance', 'Human Resources', 'ICT',
      'Library', 'Sports', 'Guidance & Counseling', 'Health Services', 'Security',
      'Maintenance', 'Catering', 'Transport', 'Procurement'
    ];
    this.departments = departmentNames.map((name, index) => ({
      id: this.generateId('dept', index),
      name,
      description: `${name} department`,
      head_id: null, // Will be assigned after staff generation
      budget_allocation: this.randomFloat(100000, 1000000),
      is_active: true,
      created_at: this.generateTimestamp(365),
      updated_at: this.generateTimestamp(30)
    }));

    // Generate designations
    const designationNames = [
      'Principal', 'Deputy Principal', 'Head of Department', 'Senior Teacher', 'Teacher',
      'Laboratory Technician', 'Librarian', 'Accountant', 'Secretary', 'Clerk',
      'Security Guard', 'Cleaner', 'Cook', 'Driver', 'Groundsman'
    ];
    this.designations = designationNames.map((name, index) => ({
      id: this.generateId('desig', index),
      title: name,
      description: `${name} position`,
      grade: this.randomChoice(['A', 'B', 'C', 'D', 'E']),
      basic_salary: this.randomFloat(25000, 150000),
      allowances: this.randomFloat(5000, 30000),
      is_teaching: name.includes('Teacher') || name === 'Principal' || name === 'Deputy Principal',
      created_at: this.generateTimestamp(365),
      updated_at: this.generateTimestamp(30)
    }));

    // Generate subjects
    const subjectNames = [
      'Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics',
      'History', 'Geography', 'CRE', 'IRE', 'Computer Studies', 'Business Studies',
      'Agriculture', 'Home Science', 'Art & Design', 'Music', 'French', 'German'
    ];
    this.subjects = subjectNames.map((name, index) => ({
      id: this.generateId('subj', index),
      name,
      code: name.substring(0, 3).toUpperCase() + (index + 1).toString().padStart(3, '0'),
      description: `${name} subject`,
      category: this.randomChoice(['Core', 'Optional', 'Technical']),
      is_active: true,
      created_at: this.generateTimestamp(365),
      updated_at: this.generateTimestamp(30)
    }));
  }

  private async generateAcademicYears(count: number): Promise<any[]> {
    const results: any[] = [];
    
    for (const academicYear of this.academicYears) {
      results.push({
        table: 'academic_year_structures',
        data: academicYear
      });
    }
    
    return results;
  }

  private async generateStudents(count: number): Promise<any[]> {
    const results: any[] = [];
    const currentYear = new Date().getFullYear();
    const classes = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
    const streams = ['A', 'B', 'C', 'D'];
    
    console.log(`Generating ${count} comprehensive student records...`);
    
    // Enhanced data arrays for comprehensive profiles
    const parentOccupations = [
      'Teacher', 'Doctor', 'Engineer', 'Lawyer', 'Accountant', 'Business Owner',
      'Farmer', 'Nurse', 'Police Officer', 'Civil Servant', 'Mechanic', 'Driver'
    ];
    
    const medicalConditions = ['Asthma', 'Diabetes Type 1', 'Epilepsy', 'Heart Condition'];
    const allergies = ['Peanuts', 'Shellfish', 'Dairy', 'Eggs', 'Soy', 'Wheat'];
    const medications = ['Inhaler', 'Insulin', 'Anticonvulsants', 'Pain Relievers'];
    const previousSchools = ['St. Mary Primary', 'Sunshine Primary', 'Green Valley Primary'];
    const achievements = ['Best Student Mathematics', 'Science Fair Winner', 'Debate Champion'];
    const specialNeeds = ['Learning Disability', 'Visual Impairment', 'Hearing Impairment'];
    
    for (let i = 0; i < count; i++) {
      const gender = this.randomChoice(['male', 'female'] as const);
      const name = this.generateName(gender);
      const admissionYear = this.randomInt(currentYear - 4, currentYear);
      const currentClass = this.randomChoice(classes);
      const stream = this.randomChoice(streams);
      
      // Generate admission number
      const admissionNumber = `${admissionYear}/${(i + 1).toString().padStart(4, '0')}`;
      
      // Generate birth date (14-18 years old)
      const birthYear = currentYear - this.randomInt(14, 18);
      const birthDate = this.randomDate(
        new Date(birthYear, 0, 1),
        new Date(birthYear, 11, 31)
      );
      
      // Generate comprehensive parent information
      const parentName = this.generateName();
      const emergencyName = this.generateName();
      
      const student = {
        id: this.generateId('student', i),
        admission_number: admissionNumber,
        first_name: name.first,
        middle_name: name.middle || '',
        last_name: name.last,
        gender,
        date_of_birth: this.formatDate(birthDate),
        current_class: currentClass,
        stream,
        admission_date: `${admissionYear}-01-15`,
        academic_year_id: this.randomChoice(this.academicYears).id,
        dormitory_id: this.randomBoolean(0.7) ? this.randomChoice(this.dormitories).id : null,
        transport_route_id: this.randomBoolean(0.4) ? this.randomChoice(this.transportRoutes).id : null,
        
        // Enhanced Parent/Guardian Information
        parent_guardian_name: `${parentName.first} ${parentName.last}`,
        parent_guardian_phone: this.generatePhoneNumber(),
        parent_guardian_email: this.generateEmail(parentName.first, parentName.last),
        parent_guardian_address: this.generateAddress(),
        parent_guardian_occupation: this.randomChoice(parentOccupations),
        parent_guardian_employer: this.generateCompanyName(),
        parent_guardian_work_phone: this.generatePhoneNumber(),
        parent_guardian_id_number: this.randomInt(10000000, 99999999).toString(),
        parent_guardian_relationship: this.randomChoice(['Father', 'Mother', 'Guardian']),
        
        // Secondary Guardian
        secondary_guardian_name: this.randomBoolean(0.8) ? `${this.generateName().first} ${this.generateName().last}` : '',
        secondary_guardian_phone: this.randomBoolean(0.8) ? this.generatePhoneNumber() : '',
        secondary_guardian_occupation: this.randomBoolean(0.8) ? this.randomChoice(parentOccupations) : '',
        
        // Emergency Contact
        emergency_contact_name: `${emergencyName.first} ${emergencyName.last}`,
        emergency_contact_phone: this.generatePhoneNumber(),
        emergency_contact_relationship: this.randomChoice(['Uncle', 'Aunt', 'Grandparent', 'Family Friend']),
        emergency_contact_address: this.generateAddress(),
        
        // Enhanced Medical Information
        medical_conditions: this.randomBoolean(0.15) ? this.randomChoice(medicalConditions) : '',
        allergies: this.randomBoolean(0.12) ? this.randomChoice(allergies) : '',
        current_medications: this.randomBoolean(0.1) ? this.randomChoice(medications) : '',
        blood_group: this.randomChoice(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
        doctor_name: `Dr. ${this.generateName().first} ${this.generateName().last}`,
        doctor_phone: this.generatePhoneNumber(),
        medical_insurance: this.randomBoolean(0.6) ? this.randomChoice(['NHIF', 'AAR', 'Jubilee']) : '',
        insurance_number: this.randomBoolean(0.6) ? this.randomInt(100000000, 999999999).toString() : '',
        
        // Academic History
        previous_school: this.randomChoice(previousSchools),
        previous_school_address: this.generateAddress(),
        kcpe_marks: this.randomInt(250, 500),
        kcpe_year: admissionYear - 1,
        previous_achievements: this.randomBoolean(0.4) ? this.randomChoice(achievements) : '',
        
        // Special Needs
        special_needs: this.randomBoolean(0.08) ? this.randomChoice(specialNeeds) : '',
        accommodations_required: this.randomBoolean(0.08) ? 'Extra Time for Exams' : '',
        
        // Additional Information
        nationality: this.randomChoice(['Kenyan', 'Ugandan', 'Tanzanian', 'Rwandan']),
        religion: this.randomChoice(['Christian', 'Muslim', 'Hindu', 'Other']),
        languages_spoken: 'English, Kiswahili',
        hobbies_interests: this.randomChoice(['Reading', 'Sports', 'Music', 'Art']),
        career_aspirations: this.randomChoice(['Doctor', 'Engineer', 'Teacher', 'Lawyer']),
        
        is_active: this.randomBoolean(0.95),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'students',
        data: student
      });
      
      this.logProgress(i + 1, count, 'student');
    }
    
    return results;
  }

  private async generateStaff(count: number): Promise<any[]> {
    const results: any[] = [];
    
    // Enhanced data arrays for comprehensive staff profiles
    const certifications = [
      'Certificate in Computer Applications',
      'First Aid Certification',
      'Fire Safety Training',
      'Child Protection Training',
      'Leadership Development Certificate',
      'Project Management Certificate',
      'Digital Literacy Certificate',
      'Counseling Certificate',
      'Special Needs Education Certificate',
      'Educational Technology Certificate'
    ];
    
    const performanceRatings = ['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Needs Improvement'];
    const contractTypes = ['Permanent', 'Contract', 'Part-time', 'Temporary', 'Probation'];
    const workStatuses = ['Active', 'On Leave', 'Suspended', 'Transferred'];
    
    const professionalBodies = [
      'Teachers Service Commission (TSC)',
      'Kenya Institute of Management (KIM)',
      'Institute of Certified Public Accountants (ICPAK)',
      'Computer Society of Kenya (CSK)',
      'Kenya Association of Educational Administrators (KAEA)'
    ];
    
    console.log(`Generating ${count} staff records...`);
    
    for (let i = 0; i < count; i++) {
      const gender = this.randomChoice(['male', 'female'] as const);
      const name = this.generateName(gender);
      const designation = this.randomChoice(this.designations);
      const department = this.randomChoice(this.departments);
      
      // Generate employee number
      const employeeNumber = `EMP${(i + 1).toString().padStart(4, '0')}`;
      
      // Generate hire date (1-15 years ago for more variety)
      const hireDate = this.randomDate(
        new Date(Date.now() - 15 * 365 * 24 * 60 * 60 * 1000),
        new Date()
      );
      
      // Calculate years of service
      const yearsOfService = Math.floor((Date.now() - hireDate.getTime()) / (365 * 24 * 60 * 60 * 1000));
      
      // Generate birth date (25-65 years old)
      const birthDate = this.randomDate(
        new Date(1959, 0, 1),
        new Date(1999, 11, 31)
      );
      
      // Calculate age
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365 * 24 * 60 * 60 * 1000));
      
      // Generate salary based on designation and experience
      const baseSalary = designation.basic_salary || 50000;
      const experienceBonus = yearsOfService * 2000;
      const finalSalary = baseSalary + experienceBonus + this.randomFloat(-5000, 15000);
      
      const staff = {
        id: this.generateId('staff', i),
        employee_number: employeeNumber,
        first_name: name.first,
        middle_name: name.middle || '',
        last_name: name.last,
        gender,
        date_of_birth: this.formatDate(birthDate),
        age,
        national_id: this.randomInt(10000000, 99999999).toString(),
        phone_number: this.generatePhoneNumber(),
        alternative_phone: this.randomBoolean(0.6) ? this.generatePhoneNumber() : '',
        email: this.generateEmail(name.first, name.last, 'school.edu'),
        personal_email: this.generateEmail(name.first, name.last),
        address: this.generateAddress(),
        next_of_kin_name: `${this.generateName().first} ${this.generateName().last}`,
        next_of_kin_phone: this.generatePhoneNumber(),
        next_of_kin_relationship: this.randomChoice(['Spouse', 'Parent', 'Sibling', 'Child']),
        
        // Employment Details
        designation_id: designation.id,
        department_id: department.id,
        hire_date: this.formatDate(hireDate),
        years_of_service: yearsOfService,
        employment_type: this.randomChoice(contractTypes),
        work_status: this.randomChoice(workStatuses),
        probation_end_date: this.randomBoolean(0.1) ? this.formatDate(this.randomDate(hireDate, new Date())) : null,
        contract_end_date: this.randomBoolean(0.3) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000))) : null,
        
        // Salary and Benefits
        salary_scale: designation.grade || 'G12',
        basic_salary: Math.round(finalSalary),
        house_allowance: Math.round(finalSalary * 0.15),
        transport_allowance: Math.round(finalSalary * 0.1),
        medical_allowance: Math.round(finalSalary * 0.05),
        total_salary: Math.round(finalSalary * 1.3),
        
        // Banking Details
        bank_name: this.randomChoice(['KCB', 'Equity', 'Cooperative', 'NCBA', 'Absa', 'Standard Chartered', 'DTB']),
        bank_account: this.randomInt(1000000000, 9999999999).toString(),
        bank_branch: this.randomChoice(['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret']),
        
        // Government Numbers
        kra_pin: `A${this.randomInt(100000000, 999999999)}Z`,
        nhif_number: this.randomInt(10000000, 99999999).toString(),
        nssf_number: this.randomInt(10000000, 99999999).toString(),
        tsc_number: designation.is_teaching ? `TSC${this.randomInt(100000, 999999)}` : null,
        
        // Professional Information
        qualifications: this.generateEnhancedQualifications(),
        certifications: this.randomBoolean(0.7) ? this.randomChoices(certifications, this.randomInt(1, 3)).join(', ') : '',
        professional_membership: this.randomBoolean(0.5) ? this.randomChoice(professionalBodies) : '',
        subjects_taught: designation.is_teaching ? this.generateSubjectsTaught() : null,
        teaching_load: designation.is_teaching ? this.randomInt(15, 30) : 0,
        
        // Performance and Development
        last_performance_rating: this.randomChoice(performanceRatings),
        performance_score: this.randomInt(60, 100),
        training_hours_completed: this.randomInt(0, 120),
        last_promotion_date: yearsOfService > 3 ? this.formatDate(this.randomDate(hireDate, new Date())) : null,
        
        // Leave Information
        annual_leave_days: 21,
        sick_leave_days: 14,
        maternity_leave_days: gender === 'female' ? 90 : 0,
        leave_days_taken: this.randomInt(0, 21),
        leave_balance: 21 - this.randomInt(0, 21),
        
        // Additional Information
        marital_status: this.randomChoice(['Single', 'Married', 'Divorced', 'Widowed']),
        number_of_dependents: this.randomInt(0, 5),
        emergency_contact_name: `${this.generateName().first} ${this.generateName().last}`,
        emergency_contact_phone: this.generatePhoneNumber(),
        
        is_active: this.randomBoolean(0.95),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'staff',
        data: staff
      });
      
      this.logProgress(i + 1, count, 'staff');
    }
    
    return results;
  }

  private generateEnhancedQualifications(): string {
    const qualifications = [
      'Bachelor of Education (Mathematics)',
      'Bachelor of Education (English)',
      'Bachelor of Education (Science)',
      'Bachelor of Science (Biology)',
      'Bachelor of Science (Chemistry)',
      'Bachelor of Science (Physics)',
      'Bachelor of Arts (History)',
      'Bachelor of Arts (Geography)',
      'Bachelor of Arts (Literature)',
      'Bachelor of Commerce',
      'Bachelor of Business Administration',
      'Master of Education (Administration)',
      'Master of Education (Curriculum)',
      'Master of Science (Mathematics)',
      'Master of Arts (English)',
      'Diploma in Education',
      'Diploma in Business Studies',
      'Certificate in Teaching',
      'Certificate in Computer Studies',
      'PhD in Education',
      'PhD in Mathematics',
      'PhD in Science'
    ];
    
    const count = this.randomInt(1, 3);
    return this.randomChoices(qualifications, count).join(', ');
  }

  private generateSubjectsTaught(): string {
    const count = this.randomInt(1, 3);
    const subjects = this.randomChoices(this.subjects, count);
    return subjects.map(s => s.name).join(', ');
  }

  private async generatePartners(count: number): Promise<any[]> {
    const results: any[] = [];
    const partnerTypes = ['Supplier', 'Service Provider', 'Consultant', 'Contractor', 'Vendor'];
    
    console.log(`Generating ${count} partner records...`);
    
    for (let i = 0; i < count; i++) {
      const partnerType = this.randomChoice(partnerTypes);
      const companyName = this.generateCompanyName();
      
      const partner = {
        id: this.generateId('partner', i),
        name: companyName,
        type: partnerType,
        contact_person: `${this.generateName().first} ${this.generateName().last}`,
        phone: this.generatePhoneNumber(),
        email: this.generateEmail('info', companyName.split(' ')[0].toLowerCase()),
        address: this.generateAddress(),
        kra_pin: `P${this.randomInt(100000000, 999999999)}K`,
        registration_number: `C.${this.randomInt(100000, 999999)}`,
        bank_name: this.randomChoice(['KCB', 'Equity', 'Cooperative', 'NCBA', 'Absa']),
        bank_account: this.randomInt(1000000000, 9999999999).toString(),
        credit_limit: this.randomFloat(50000, 500000),
        payment_terms: this.randomChoice(['Net 30', 'Net 15', 'Cash on Delivery', 'Advance Payment']),
        rating: this.randomInt(1, 5),
        is_active: this.randomBoolean(0.9),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'partners',
        data: partner
      });
      
      this.logProgress(i + 1, count, 'partner');
    }
    
    return results;
  }

  private async generateCommunicationTemplates(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const templates = [
      {
        name: 'Fee Reminder',
        type: 'SMS',
        subject: 'Fee Payment Reminder',
        content: 'Dear Parent, this is to remind you that school fees for {student_name} are due. Amount: KES {amount}. Please pay by {due_date}.'
      },
      {
        name: 'Exam Results',
        type: 'Email',
        subject: 'Exam Results - {student_name}',
        content: 'Dear Parent, {student_name} has completed the {exam_name}. Results will be available on {date}. Please check the student portal.'
      },
      {
        name: 'Disciplinary Notice',
        type: 'Letter',
        subject: 'Disciplinary Action Notice',
        content: 'Dear Parent, we regret to inform you about a disciplinary issue involving {student_name}. Please visit the school for a meeting.'
      },
      {
        name: 'Event Invitation',
        type: 'Email',
        subject: 'School Event Invitation',
        content: 'Dear Parent, you are cordially invited to attend {event_name} on {event_date} at {event_time}. Venue: {venue}.'
      },
      {
        name: 'Medical Alert',
        type: 'SMS',
        subject: 'Medical Emergency',
        content: 'Dear Parent, {student_name} requires medical attention. Please contact the school immediately or visit the health center.'
      }
    ];
    
    console.log(`Generating ${templates.length} communication templates...`);
    
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      
      const communicationTemplate = {
        id: this.generateId('template', i),
        name: template.name,
        type: template.type,
        subject: template.subject,
        content: template.content,
        variables: this.extractVariables(template.content),
        is_active: true,
        created_by: 'system',
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'communication_templates',
        data: communicationTemplate
      });
    }
    
    return results;
  }

  private extractVariables(content: string): string {
    const matches = content.match(/{([^}]+)}/g);
    if (!matches) return '';
    
    return matches.map(match => match.slice(1, -1)).join(', ');
  }
}