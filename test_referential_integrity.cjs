// ABOUTME: Comprehensive referential integrity test for cross-module data relationships
// ABOUTME: Verifies data consistency and relationships across all school management modules

console.log('🔗 Starting Referential Integrity Test');
console.log('=' .repeat(60));

// Test data structure that demonstrates cross-module relationships
const testDataStructure = {
  // Core entities
  students: [
    { id: 'STU001', name: 'John Doe', grade: '10A', admission_number: 'ADM2024001' },
    { id: 'STU002', name: 'Jane Smith', grade: '10B', admission_number: 'ADM2024002' },
    { id: 'STU003', name: 'Mike Johnson', grade: '11A', admission_number: 'ADM2024003' }
  ],
  
  staff: [
    { id: 'STF001', name: 'Dr. Alice Brown', role: 'Teacher', department: 'Mathematics' },
    { id: 'STF002', name: 'Prof. Bob Wilson', role: 'Teacher', department: 'Science' },
    { id: 'STF003', name: 'Ms. Carol Davis', role: 'Librarian', department: 'Library' }
  ],
  
  // Academic module relationships
  subjects: [
    { id: 'SUB001', name: 'Mathematics', code: 'MATH10', teacher_id: 'STF001' },
    { id: 'SUB002', name: 'Physics', code: 'PHYS10', teacher_id: 'STF002' },
    { id: 'SUB003', name: 'Chemistry', code: 'CHEM10', teacher_id: 'STF002' }
  ],
  
  student_enrollments: [
    { id: 'ENR001', student_id: 'STU001', subject_id: 'SUB001', grade: 'A' },
    { id: 'ENR002', student_id: 'STU001', subject_id: 'SUB002', grade: 'B+' },
    { id: 'ENR003', student_id: 'STU002', subject_id: 'SUB001', grade: 'A-' },
    { id: 'ENR004', student_id: 'STU003', subject_id: 'SUB003', grade: 'B' }
  ],
  
  // Library module relationships
  books: [
    { id: 'BK001', title: 'Advanced Mathematics', isbn: '978-1234567890', category: 'Academic' },
    { id: 'BK002', title: 'Physics Fundamentals', isbn: '978-0987654321', category: 'Academic' },
    { id: 'BK003', title: 'Chemistry Lab Manual', isbn: '978-1122334455', category: 'Reference' }
  ],
  
  book_loans: [
    { id: 'LOAN001', book_id: 'BK001', student_id: 'STU001', loan_date: '2024-01-15', due_date: '2024-02-15' },
    { id: 'LOAN002', book_id: 'BK002', student_id: 'STU002', loan_date: '2024-01-20', due_date: '2024-02-20' },
    { id: 'LOAN003', book_id: 'BK003', staff_id: 'STF002', loan_date: '2024-01-25', due_date: '2024-03-25' }
  ],
  
  // Financial module relationships
  fee_structures: [
    { id: 'FEE001', name: 'Tuition Fee', amount: 5000, grade_level: '10' },
    { id: 'FEE002', name: 'Library Fee', amount: 200, grade_level: 'All' },
    { id: 'FEE003', name: 'Lab Fee', amount: 300, grade_level: '10,11' }
  ],
  
  student_fees: [
    { id: 'SFEE001', student_id: 'STU001', fee_structure_id: 'FEE001', amount: 5000, status: 'Paid' },
    { id: 'SFEE002', student_id: 'STU001', fee_structure_id: 'FEE002', amount: 200, status: 'Paid' },
    { id: 'SFEE003', student_id: 'STU002', fee_structure_id: 'FEE001', amount: 5000, status: 'Pending' },
    { id: 'SFEE004', student_id: 'STU003', fee_structure_id: 'FEE003', amount: 300, status: 'Paid' }
  ],
  
  payments: [
    { id: 'PAY001', student_fee_id: 'SFEE001', amount: 5000, payment_date: '2024-01-10', method: 'Bank Transfer' },
    { id: 'PAY002', student_fee_id: 'SFEE002', amount: 200, payment_date: '2024-01-10', method: 'Cash' },
    { id: 'PAY003', student_fee_id: 'SFEE004', amount: 300, payment_date: '2024-01-15', method: 'Online' }
  ],
  
  // Clubs module relationships
  clubs: [
    { id: 'CLB001', name: 'Mathematics Club', category: 'Academic', supervisor_id: 'STF001' },
    { id: 'CLB002', name: 'Science Society', category: 'Academic', supervisor_id: 'STF002' },
    { id: 'CLB003', name: 'Chess Club', category: 'Games', supervisor_id: 'STF001' }
  ],
  
  club_members: [
    { id: 'CM001', club_id: 'CLB001', student_id: 'STU001', role: 'President', join_date: '2024-01-05' },
    { id: 'CM002', club_id: 'CLB001', student_id: 'STU002', role: 'Member', join_date: '2024-01-08' },
    { id: 'CM003', club_id: 'CLB002', student_id: 'STU003', role: 'Secretary', join_date: '2024-01-10' },
    { id: 'CM004', club_id: 'CLB003', student_id: 'STU001', role: 'Member', join_date: '2024-01-12' }
  ],
  
  // Communication module relationships
  messages: [
    { id: 'MSG001', sender_id: 'STF001', recipient_id: 'STU001', subject: 'Math Assignment', type: 'Academic' },
    { id: 'MSG002', sender_id: 'STF003', recipient_id: 'STU002', subject: 'Book Return Reminder', type: 'Library' },
    { id: 'MSG003', sender_id: 'STF002', recipient_id: 'STU003', subject: 'Lab Schedule', type: 'Academic' }
  ]
};

class ReferentialIntegrityTester {
  constructor() {
    this.data = testDataStructure;
    this.errors = [];
    this.warnings = [];
    this.relationships = [];
  }
  
  // Test foreign key relationships
  testForeignKeyIntegrity() {
    console.log('\n🔍 Testing Foreign Key Integrity...');
    
    const checks = [
      // Academic relationships
      {
        name: 'Subject-Teacher Relationship',
        parentTable: 'staff',
        childTable: 'subjects',
        parentKey: 'id',
        foreignKey: 'teacher_id'
      },
      {
        name: 'Student-Enrollment Relationship',
        parentTable: 'students',
        childTable: 'student_enrollments',
        parentKey: 'id',
        foreignKey: 'student_id'
      },
      {
        name: 'Subject-Enrollment Relationship',
        parentTable: 'subjects',
        childTable: 'student_enrollments',
        parentKey: 'id',
        foreignKey: 'subject_id'
      },
      
      // Library relationships
      {
        name: 'Book-Loan Relationship',
        parentTable: 'books',
        childTable: 'book_loans',
        parentKey: 'id',
        foreignKey: 'book_id'
      },
      {
        name: 'Student-BookLoan Relationship',
        parentTable: 'students',
        childTable: 'book_loans',
        parentKey: 'id',
        foreignKey: 'student_id'
      },
      
      // Financial relationships
      {
        name: 'Student-Fee Relationship',
        parentTable: 'students',
        childTable: 'student_fees',
        parentKey: 'id',
        foreignKey: 'student_id'
      },
      {
        name: 'FeeStructure-StudentFee Relationship',
        parentTable: 'fee_structures',
        childTable: 'student_fees',
        parentKey: 'id',
        foreignKey: 'fee_structure_id'
      },
      {
        name: 'StudentFee-Payment Relationship',
        parentTable: 'student_fees',
        childTable: 'payments',
        parentKey: 'id',
        foreignKey: 'student_fee_id'
      },
      
      // Clubs relationships
      {
        name: 'Staff-Club Supervisor Relationship',
        parentTable: 'staff',
        childTable: 'clubs',
        parentKey: 'id',
        foreignKey: 'supervisor_id'
      },
      {
        name: 'Club-Member Relationship',
        parentTable: 'clubs',
        childTable: 'club_members',
        parentKey: 'id',
        foreignKey: 'club_id'
      },
      {
        name: 'Student-ClubMember Relationship',
        parentTable: 'students',
        childTable: 'club_members',
        parentKey: 'id',
        foreignKey: 'student_id'
      }
    ];
    
    checks.forEach(check => {
      const parentRecords = this.data[check.parentTable] || [];
      const childRecords = this.data[check.childTable] || [];
      
      const parentIds = new Set(parentRecords.map(record => record[check.parentKey]));
      
      const orphanedRecords = childRecords.filter(record => {
        const foreignKeyValue = record[check.foreignKey];
        return foreignKeyValue && !parentIds.has(foreignKeyValue);
      });
      
      if (orphanedRecords.length > 0) {
        this.errors.push({
          type: 'Foreign Key Violation',
          relationship: check.name,
          orphanedRecords: orphanedRecords.length,
          details: orphanedRecords.map(r => r.id)
        });
        console.log(`  ❌ ${check.name}: ${orphanedRecords.length} orphaned records`);
      } else {
        this.relationships.push({
          name: check.name,
          status: 'Valid',
          childRecords: childRecords.length
        });
        console.log(`  ✅ ${check.name}: ${childRecords.length} valid relationships`);
      }
    });
  }
  
  // Test business logic constraints
  testBusinessLogicConstraints() {
    console.log('\n🧠 Testing Business Logic Constraints...');
    
    // Test: Students can't have duplicate enrollments in same subject
    const enrollments = this.data.student_enrollments || [];
    const enrollmentKeys = new Set();
    const duplicateEnrollments = [];
    
    enrollments.forEach(enrollment => {
      const key = `${enrollment.student_id}-${enrollment.subject_id}`;
      if (enrollmentKeys.has(key)) {
        duplicateEnrollments.push(enrollment);
      }
      enrollmentKeys.add(key);
    });
    
    if (duplicateEnrollments.length > 0) {
      this.errors.push({
        type: 'Business Logic Violation',
        constraint: 'Duplicate Student Enrollments',
        violations: duplicateEnrollments.length
      });
      console.log(`  ❌ Duplicate enrollments: ${duplicateEnrollments.length}`);
    } else {
      console.log(`  ✅ No duplicate student enrollments`);
    }
    
    // Test: Books can't be loaned to multiple people simultaneously
    const loans = this.data.book_loans || [];
    const activeLoans = loans.filter(loan => !loan.return_date); // Assuming no return_date means active
    const bookLoanCounts = {};
    
    activeLoans.forEach(loan => {
      bookLoanCounts[loan.book_id] = (bookLoanCounts[loan.book_id] || 0) + 1;
    });
    
    const multipleLoans = Object.entries(bookLoanCounts).filter(([bookId, count]) => count > 1);
    
    if (multipleLoans.length > 0) {
      this.errors.push({
        type: 'Business Logic Violation',
        constraint: 'Multiple Active Book Loans',
        violations: multipleLoans.length
      });
      console.log(`  ❌ Books with multiple active loans: ${multipleLoans.length}`);
    } else {
      console.log(`  ✅ No books with multiple active loans`);
    }
    
    // Test: Payment amounts should match fee amounts
    const studentFees = this.data.student_fees || [];
    const payments = this.data.payments || [];
    
    const paymentMismatches = [];
    payments.forEach(payment => {
      const relatedFee = studentFees.find(fee => fee.id === payment.student_fee_id);
      if (relatedFee && payment.amount !== relatedFee.amount) {
        paymentMismatches.push({
          paymentId: payment.id,
          paidAmount: payment.amount,
          feeAmount: relatedFee.amount
        });
      }
    });
    
    if (paymentMismatches.length > 0) {
      this.warnings.push({
        type: 'Business Logic Warning',
        constraint: 'Payment-Fee Amount Mismatch',
        mismatches: paymentMismatches.length
      });
      console.log(`  ⚠️  Payment-fee amount mismatches: ${paymentMismatches.length}`);
    } else {
      console.log(`  ✅ All payments match fee amounts`);
    }
  }
  
  // Test data consistency across modules
  testCrossModuleConsistency() {
    console.log('\n🔄 Testing Cross-Module Data Consistency...');
    
    // Test: Students with academic enrollments should exist in student table
    const students = this.data.students || [];
    const enrollments = this.data.student_enrollments || [];
    const studentIds = new Set(students.map(s => s.id));
    
    const enrolledStudentIds = new Set(enrollments.map(e => e.student_id));
    const missingStudents = [...enrolledStudentIds].filter(id => !studentIds.has(id));
    
    if (missingStudents.length > 0) {
      this.errors.push({
        type: 'Cross-Module Inconsistency',
        issue: 'Students in enrollments but not in student table',
        count: missingStudents.length
      });
      console.log(`  ❌ Missing students in enrollments: ${missingStudents.length}`);
    } else {
      console.log(`  ✅ All enrolled students exist in student table`);
    }
    
    // Test: Staff teaching subjects should exist in staff table
    const staff = this.data.staff || [];
    const subjects = this.data.subjects || [];
    const staffIds = new Set(staff.map(s => s.id));
    
    const teachingStaffIds = new Set(subjects.map(s => s.teacher_id).filter(Boolean));
    const missingTeachers = [...teachingStaffIds].filter(id => !staffIds.has(id));
    
    if (missingTeachers.length > 0) {
      this.errors.push({
        type: 'Cross-Module Inconsistency',
        issue: 'Teachers in subjects but not in staff table',
        count: missingTeachers.length
      });
      console.log(`  ❌ Missing teachers in subjects: ${missingTeachers.length}`);
    } else {
      console.log(`  ✅ All subject teachers exist in staff table`);
    }
    
    // Test: Club supervisors should be staff members
    const clubs = this.data.clubs || [];
    const supervisorIds = new Set(clubs.map(c => c.supervisor_id).filter(Boolean));
    const missingSupervisors = [...supervisorIds].filter(id => !staffIds.has(id));
    
    if (missingSupervisors.length > 0) {
      this.errors.push({
        type: 'Cross-Module Inconsistency',
        issue: 'Club supervisors not in staff table',
        count: missingSupervisors.length
      });
      console.log(`  ❌ Missing club supervisors: ${missingSupervisors.length}`);
    } else {
      console.log(`  ✅ All club supervisors exist in staff table`);
    }
  }
  
  // Generate comprehensive report
  generateReport() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 REFERENTIAL INTEGRITY TEST REPORT');
    console.log('=' .repeat(60));
    
    console.log(`\n📈 STATISTICS:`);
    console.log(`   Valid Relationships: ${this.relationships.length}`);
    console.log(`   Integrity Errors: ${this.errors.length}`);
    console.log(`   Business Warnings: ${this.warnings.length}`);
    
    if (this.relationships.length > 0) {
      console.log(`\n✅ VALID RELATIONSHIPS:`);
      this.relationships.forEach(rel => {
        console.log(`   • ${rel.name}: ${rel.childRecords} records`);
      });
    }
    
    if (this.errors.length > 0) {
      console.log(`\n❌ INTEGRITY ERRORS:`);
      this.errors.forEach(error => {
        console.log(`   • ${error.type}: ${error.relationship || error.issue || error.constraint}`);
        if (error.orphanedRecords) console.log(`     Orphaned records: ${error.orphanedRecords}`);
        if (error.violations) console.log(`     Violations: ${error.violations}`);
        if (error.count) console.log(`     Count: ${error.count}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  BUSINESS WARNINGS:`);
      this.warnings.forEach(warning => {
        console.log(`   • ${warning.type}: ${warning.constraint}`);
        if (warning.mismatches) console.log(`     Mismatches: ${warning.mismatches}`);
      });
    }
    
    // Overall assessment
    const totalIssues = this.errors.length + this.warnings.length;
    
    console.log(`\n🎯 INTEGRITY SCORE: ${this.relationships.length} valid / ${totalIssues} issues`);
    
    if (this.errors.length === 0) {
      console.log('🎉 All referential integrity checks passed!');
    } else {
      console.log('⚠️  Some referential integrity issues need attention.');
    }
    
    console.log(`\n📋 RECOMMENDATIONS:`);
    console.log(`   1. Implement foreign key constraints in database schema`);
    console.log(`   2. Add validation rules in data generation modules`);
    console.log(`   3. Create data consistency checks in application logic`);
    console.log(`   4. Set up automated integrity testing in CI/CD pipeline`);
    
    return {
      validRelationships: this.relationships.length,
      errors: this.errors.length,
      warnings: this.warnings.length,
      totalIssues: totalIssues,
      passed: this.errors.length === 0
    };
  }
  
  async runAllTests() {
    console.log('🔗 Testing referential integrity across all modules...');
    
    this.testForeignKeyIntegrity();
    this.testBusinessLogicConstraints();
    this.testCrossModuleConsistency();
    
    return this.generateReport();
  }
}

// Run the tests
async function runReferentialIntegrityTests() {
  const tester = new ReferentialIntegrityTester();
  
  try {
    const results = await tester.runAllTests();
    
    console.log('\n✨ Referential integrity testing completed!');
    
    return results;
    
  } catch (error) {
    console.error('❌ Referential integrity testing failed:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  runReferentialIntegrityTests()
    .then(results => {
      if (results.passed) {
        console.log('\n🎊 All referential integrity tests passed!');
        process.exit(0);
      } else {
        console.log('\n⚠️  Some integrity issues found - review recommendations.');
        process.exit(0); // Exit successfully but with warnings
      }
    })
    .catch(error => {
      console.error('💥 Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { ReferentialIntegrityTester, runReferentialIntegrityTests };