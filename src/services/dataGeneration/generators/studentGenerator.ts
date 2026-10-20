// ABOUTME: Comprehensive student data generator with realistic family relationship scenarios
// ABOUTME: Implements distribution: 60% two-parent, 15% single-mother, 10% single-father, 8% grandparent, 5% other guardian, 2% institutional

import type { Student, ParentsGuardian, StudentGuardianRelationship } from '@/core/types';
import { PersonGender, StudentStatus } from '@/core/types';
import { FIRST_NAMES, LAST_NAMES, getRandomItem, getRandomInt, generateId, generateAdmissionNo, generateDateOfBirth, generateKenyanPhone, generateEmail, generateAddress, generateGuardianForStudent, weightedRandom } from './dataUtils';

// Family distribution as per specification
const FAMILY_DISTRIBUTION = [
  { type: 'twoParents', weight: 0.60, guardians: ['Father', 'Mother'] },
  { type: 'singleMother', weight: 0.15, guardians: ['Mother'] },
  { type: 'singleFather', weight: 0.10, guardians: ['Father'] },
  { type: 'grandparentGuardian', weight: 0.08, guardians: ['Grandmother', 'Grandfather'] },
  { type: 'otherGuardian', weight: 0.05, guardians: ['Aunt', 'Uncle', 'Guardian', 'Family Friend'] },
  { type: 'institutional', weight: 0.02, guardians: ['Guardian'] }
];

// Student categories distribution
const STUDENT_CATEGORY_WEIGHTS = [
  { category: 'Boarder', weight: 0.40 },
  { category: 'Day Scholar', weight: 0.55 },
  { category: 'Special', weight: 0.05 }
];

// Student status distribution
const STUDENT_STATUS_WEIGHTS = [
  { status: StudentStatus.ACTIVE, weight: 0.92 },
  { status: StudentStatus.SUSPENDED, weight: 0.03 },
  { status: StudentStatus.ALUMNI, weight: 0.04 },
  { status: StudentStatus.WITHDRAWN, weight: 0.01 }
];

export interface GeneratedStudentData {
  students: Student[];
  guardians: ParentsGuardian[];
  relationships: StudentGuardianRelationship[];
}

export interface StudentGenerationOptions {
  count: number;
  startIndex?: number;
  classStreamIds: number[];
  academicYearId: number;
  dormitoryIds?: number[];
  includeSiblings?: boolean;
  siblingProbability?: number;
}

/**
 * Generates comprehensive student data with realistic family relationship scenarios
 */
export function generateStudentData(options: StudentGenerationOptions): GeneratedStudentData {
  const {
    count,
    startIndex = 1,
    classStreamIds,
    academicYearId,
    dormitoryIds = [],
    includeSiblings = true,
    siblingProbability = 0.15
  } = options;

  const students: Student[] = [];
  const guardians: ParentsGuardian[] = [];
  const relationships: StudentGuardianRelationship[] = [];

  // Track families for sibling generation
  const families = new Map<string, { surname: string; guardians: ParentsGuardian[] }>();

  for (let i = 0; i < count; i++) {
    const studentIndex = startIndex + i;
    
    // Determine family structure
    const familyType = weightedRandom(FAMILY_DISTRIBUTION.map(f => ({ item: f, weight: f.weight })));
    
    // Check if this should be a sibling (15% probability if includeSiblings)
    let isSibling = false;
    let familyKey = '';
    
    if (includeSiblings && Math.random() < siblingProbability && families.size > 0) {
      // Make this student a sibling of an existing family
      const existingFamilies = Array.from(families.entries());
      const randomFamily = getRandomItem(existingFamilies);
      familyKey = randomFamily[0];
      isSibling = true;
    }

    // Generate student
    const gender = Math.random() < 0.52 ? PersonGender.MALE : PersonGender.FEMALE; // Slightly more male in schools
    const firstName = getRandomItem(gender === PersonGender.MALE ? FIRST_NAMES.male : FIRST_NAMES.female);
    const lastName = isSibling ? families.get(familyKey)!.surname : getRandomItem(LAST_NAMES);
    
    if (!isSibling) {
      familyKey = `family_${studentIndex}`;
      families.set(familyKey, { surname: lastName, guardians: [] });
    }

    const studentCategory = weightedRandom(STUDENT_CATEGORY_WEIGHTS.map(w => ({ item: w.category, weight: w.weight })));
    const status = weightedRandom(STUDENT_STATUS_WEIGHTS.map(w => ({ item: w.status, weight: w.weight })));
    
    // Dormitory assignment for boarders
    const dormitoryId = studentCategory === 'Boarder' && dormitoryIds.length > 0
      ? getRandomItem(dormitoryIds)
      : null;

    const student: Student = {
      id: generateId('STU'),
      admission_no: generateAdmissionNo(studentIndex),
      first_name: firstName,
      last_name: lastName,
      gender,
      date_of_birth: generateDateOfBirth(12, 20),
      current_class_stream_id: getRandomItem(classStreamIds),
      student_category_id: studentCategory === 'Boarder' ? 1 : studentCategory === 'Day Scholar' ? 2 : 3,
      student_category_name: studentCategory,
      dormitory_id: dormitoryId,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_name: `${firstName} ${lastName}`,
      email: generateEmail(firstName, lastName),
      phone: Math.random() < 0.3 ? generateKenyanPhone() : undefined // 30% have phones
    };

    students.push(student);

    // Generate guardians for this student
    if (isSibling && families.get(familyKey)?.guardians.length) {
      // Reuse existing guardians for siblings
      const existingGuardians = families.get(familyKey)!.guardians;
      
      existingGuardians.forEach((guardian, idx) => {
        relationships.push({
          id: generateId('SGR'),
          student_id: student.id,
          guardian_id: guardian.id,
          is_primary: idx === 0,
          relationship_type: guardian.relationship_type,
          can_pickup: idx === 0 || Math.random() < 0.5,
          receives_communication: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });
    } else {
      // Generate new guardians
      const familyGuardians: ParentsGuardian[] = [];
      
      // Determine number of guardians based on family type
      let guardianRelationships: string[];
      if (familyType.type === 'twoParents') {
        // 70% have both parents, 30% have one parent + step-parent
        if (Math.random() < 0.7) {
          guardianRelationships = ['Father', 'Mother'];
        } else {
          const hasStepMother = Math.random() < 0.5;
          guardianRelationships = hasStepMother ? ['Father', 'Step-Mother'] : ['Mother', 'Step-Father'];
        }
      } else if (familyType.type === 'singleMother' || familyType.type === 'singleFather') {
        // Single parent - but might have backup guardian
        guardianRelationships = familyType.guardians.slice(0, 1);
        if (Math.random() < 0.3) {
          guardianRelationships.push('Guardian'); // 30% have a guardian backup
        }
      } else {
        guardianRelationships = familyType.guardians;
      }

      // Generate each guardian
      guardianRelationships.forEach((relationship, idx) => {
        const guardianData = generateGuardianForStudent(student.first_name, lastName, relationship);
        
        const guardian: ParentsGuardian = {
          id: generateId('PG'),
          name: `${guardianData.firstName} ${guardianData.lastName}`,
          phone: guardianData.phone,
          email: guardianData.email,
          relationship_type: guardianData.relationship,
          address: `${generateAddress().street}, ${generateAddress().town}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        guardians.push(guardian);
        familyGuardians.push(guardian);

        // Create relationship record
        relationships.push({
          id: generateId('SGR'),
          student_id: student.id,
          guardian_id: guardian.id,
          is_primary: idx === 0,
          relationship_type: guardianData.relationship,
          can_pickup: idx === 0 || Math.random() < 0.5,
          receives_communication: Math.random() < 0.9, // 90% receive communications
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });

      // Update family record
      families.set(familyKey, { surname: lastName, guardians: familyGuardians });
    }
  }

  return { students, guardians, relationships };
}

/**
 * Generates health records for students (allergies, conditions, etc.)
 */
export function generateHealthRecords(studentIds: string[]) {
  const conditions = [
    { name: 'Asthma', probability: 0.03 },
    { name: 'Diabetes', probability: 0.01 },
    { name: 'Epilepsy', probability: 0.005 },
    { name: 'Sickle Cell', probability: 0.02 },
    { name: 'Allergies - Pollen', probability: 0.05 },
    { name: 'Allergies - Food', probability: 0.04 },
    { name: 'Allergies - Medication', probability: 0.02 },
    { name: 'Vision Impairment', probability: 0.08 },
    { name: 'Hearing Impairment', probability: 0.02 },
    { name: 'Physical Disability', probability: 0.01 }
  ];

  const healthRecords: any[] = [];

  studentIds.forEach(studentId => {
    // 20% of students have some health record
    if (Math.random() < 0.2) {
      // Some students have multiple conditions
      const numConditions = Math.random() < 0.7 ? 1 : getRandomInt(1, 3);
      
      for (let i = 0; i < numConditions; i++) {
        const condition = weightedRandom(conditions.map(c => ({ item: c, weight: c.probability })));
        
        healthRecords.push({
          id: generateId('SHR'),
          student_id: studentId,
          condition_name: condition.name,
          severity: weightedRandom([
            { item: 'Mild', weight: 0.6 },
            { item: 'Moderate', weight: 0.3 },
            { item: 'Severe', weight: 0.1 }
          ]),
          requires_medication: Math.random() < 0.4,
          notes: `Student has ${condition.name.toLowerCase()}.`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
  });

  return healthRecords;
}

/**
 * Generates student attendance records
 */
export function generateAttendanceRecords(
  studentIds: string[],
  schoolPeriodId: number,
  daysToGenerate: number = 90
) {
  const attendanceRecords: any[] = [];
  const today = new Date();
  
  studentIds.forEach(studentId => {
    // Generate attendance for past N days
    for (let i = 0; i < daysToGenerate; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // 92% present, 5% absent, 3% late
      const status = weightedRandom([
        { item: 'Present', weight: 0.92 },
        { item: 'Absent', weight: 0.05 },
        { item: 'Late', weight: 0.03 }
      ]);

      if (status === 'Absent' || status === 'Late') {
        attendanceRecords.push({
          id: generateId('ATT'),
          student_id: studentId,
          school_period_id: schoolPeriodId,
          date: date.toISOString().split('T')[0],
          status,
          reason: status === 'Absent' ? getRandomItem(['Sick', 'Family Emergency', 'Transport Issues', '']) : 'Late arrival',
          created_at: new Date().toISOString()
        });
      }
    }
  });

  return attendanceRecords;
}
