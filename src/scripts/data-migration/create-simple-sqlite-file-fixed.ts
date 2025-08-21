#!/usr/bin/env node

// ABOUTME: Simplified script to create a SQLite database file with key collections
// ABOUTME: This script creates a standalone .db file with sample data for verification

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import * as fs from 'fs';
import * as path from 'path';

async function createSimpleSQLiteFile() {
  console.log('=== CREATING SIMPLE SQLITE DATABASE FILE ===');
  
  try {
    // Initialize SQLite WASM
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });
    
    console.log(`✅ SQLite WASM initialized: ${sqlite3.version.libVersion}`);
    
    // Create SQLite database file in the project directory
    const dbFileName = 'schoolpilot_simple.db';
    const dbFilePath = path.join(process.cwd(), dbFileName);
    
    // Remove existing database file if it exists
    if (fs.existsSync(dbFilePath)) {
      fs.unlinkSync(dbFilePath);
      console.log(`🗑️  Removed existing database file: ${dbFileName}`);
    }
    
    // Open database in file mode
    const db = new sqlite3.oo1.DB(dbFilePath, 'ct'); // 'ct' = create/write mode
    console.log(`✅ SQLite database file created: ${dbFileName}`);
    console.log(`📁 Database file location: ${dbFilePath}`);
    
    // Create a few key tables with sample data
    console.log('\n--- Creating Sample Tables ---');
    
    // Create users table
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT,
      role_id TEXT,
      is_active INTEGER,
      created_at TEXT,
      updated_at TEXT
    )`);
    console.log('✅ Users table created');
    
    // Insert sample users
    const userStmt = db.prepare(`INSERT INTO users 
      (id, username, email, role_id, is_active, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
      
    const sampleUsers = [
      { id: 'USR001', username: 'admin', email: 'admin@example.com', role_id: 'ROLE001', is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'USR002', username: 'teacher1', email: 'teacher1@example.com', role_id: 'ROLE002', is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'USR003', username: 'teacher2', email: 'teacher2@example.com', role_id: 'ROLE002', is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'USR004', username: 'accountant', email: 'accountant@example.com', role_id: 'ROLE003', is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'USR005', username: 'student1', email: 'student1@example.com', role_id: 'ROLE004', is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'USR006', username: 'student2', email: 'student2@example.com', role_id: 'ROLE004', is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'USR007', username: 'parent1', email: 'parent1@example.com', role_id: 'ROLE005', is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'USR008', username: 'librarian', email: 'librarian@example.com', role_id: 'ROLE006', is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'USR009', username: 'hr_manager', email: 'hr@example.com', role_id: 'ROLE007', is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'USR010', username: 'inventory_mgr', email: 'inventory@example.com', role_id: 'ROLE008', is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];
    
    for (const user of sampleUsers) {
      userStmt.bind([
        user.id,
        user.username,
        user.email,
        user.role_id,
        user.is_active,
        user.created_at,
        user.updated_at
      ]);
      userStmt.step();
      userStmt.reset();
    }
    userStmt.finalize();
    console.log(`✅ Inserted ${sampleUsers.length} users`);
    
    // Create students table
    db.exec(`CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      admission_no TEXT,
      first_name TEXT,
      last_name TEXT,
      gender TEXT,
      current_class_stream_id TEXT,
      student_category_id TEXT,
      dormitory_id TEXT,
      admission_date TEXT,
      status TEXT,
      deleted_at TEXT,
      current_class_name TEXT,
      current_class_stream_name TEXT,
      student_category_name TEXT,
      dormitory_name TEXT,
      primary_guardian TEXT,
      exam_result_summary TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      remarks TEXT,
      religion TEXT,
      county TEXT,
      district TEXT,
      student_type TEXT,
      primary_school TEXT,
      marks_attained_primary TEXT,
      class_admitted TEXT,
      stream_admitted TEXT,
      user_id TEXT,
      display_name TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
    console.log('✅ Students table created');
    
    // Insert sample students
    const studentStmt = db.prepare(`INSERT INTO students 
      (id, admission_no, first_name, last_name, gender, current_class_stream_id, 
       student_category_id, dormitory_id, admission_date, status, deleted_at, 
       current_class_name, current_class_stream_name, student_category_name, dormitory_name, 
       primary_guardian, exam_result_summary, email, phone, address, remarks, religion, 
       county, district, student_type, primary_school, marks_attained_primary, 
       class_admitted, stream_admitted, user_id, display_name, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      
    const sampleStudents = [
      { id: 'S001', admission_no: 'ADM001', first_name: 'Jim', last_name: 'Halpert', gender: 'Male', current_class_stream_id: '1', student_category_id: '1', dormitory_id: '1', admission_date: null, status: 'Active', deleted_at: null, current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_name: 'Boarder', dormitory_name: 'Simba House', primary_guardian: '{"id":"PG001","name":"William Halpert","phone":"0711223344","relationship_type":"Father","created_at":"2025-08-19T14:24:19.693Z","updated_at":"2025-08-19T14:24:19.693Z","user_id":"PAR001_USR","email":"w.halpert@email.com"}', exam_result_summary: null, email: 'j.halpert.stu@example.com', phone: null, address: null, remarks: null, religion: null, county: null, district: null, student_type: null, primary_school: null, marks_attained_primary: null, class_admitted: null, stream_admitted: null, user_id: 'STU001_USR', display_name: 'Jim Halpert', created_at: '2025-08-19T14:24:19.693Z', updated_at: '2025-08-19T14:24:19.693Z' },
      { id: 'S002', admission_no: 'ADM002', first_name: 'Michael', last_name: 'Scofield', gender: 'Male', current_class_stream_id: '2', student_category_id: '2', dormitory_id: null, admission_date: null, status: 'Active', deleted_at: null, current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_name: 'Day Scholar', dormitory_name: null, primary_guardian: '{"id":"PG003","name":"Christina Scofield","phone":"0799887766","relationship_type":"Mother","created_at":"2025-08-19T14:24:19.693Z","updated_at":"2025-08-19T14:24:19.693Z","email":"c.scofield@email.com"}', exam_result_summary: null, email: null, phone: null, address: null, remarks: null, religion: null, county: null, district: null, student_type: null, primary_school: null, marks_attained_primary: null, class_admitted: null, stream_admitted: null, user_id: null, display_name: 'Michael Scofield', created_at: '2025-08-19T14:24:19.693Z', updated_at: '2025-08-19T14:24:19.693Z' },
      { id: 'S003', admission_no: 'ADM003', first_name: 'Sara', last_name: 'Tancredi', gender: 'Female', current_class_stream_id: '3', student_category_id: '1', dormitory_id: null, admission_date: null, status: 'Active', deleted_at: null, current_class_name: 'Form 2', current_class_stream_name: 'A', student_category_name: 'Boarder', dormitory_name: null, primary_guardian: '{"id":"PG004","name":"Frank Tancredi","phone":"0722334455","relationship_type":"Father","created_at":"2025-08-19T14:24:19.693Z","updated_at":"2025-08-19T14:24:19.693Z","email":"f.tancredi@email.com"}', exam_result_summary: null, email: null, phone: null, address: null, remarks: null, religion: null, county: null, district: null, student_type: null, primary_school: null, marks_attained_primary: null, class_admitted: null, stream_admitted: null, user_id: null, display_name: 'Sara Tancredi', created_at: '2025-08-19T14:24:19.693Z', updated_at: '2025-08-19T14:24:19.693Z' }
    ];
    
    for (const student of sampleStudents) {
      studentStmt.bind([
        student.id,
        student.admission_no,
        student.first_name,
        student.last_name,
        student.gender,
        student.current_class_stream_id,
        student.student_category_id,
        student.dormitory_id,
        student.admission_date,
        student.status,
        student.deleted_at,
        student.current_class_name,
        student.current_class_stream_name,
        student.student_category_name,
        student.dormitory_name,
        student.primary_guardian,
        student.exam_result_summary,
        student.email,
        student.phone,
        student.address,
        student.remarks,
        student.religion,
        student.county,
        student.district,
        student.student_type,
        student.primary_school,
        student.marks_attained_primary,
        student.class_admitted,
        student.stream_admitted,
        student.user_id,
        student.display_name,
        student.created_at,
        student.updated_at
      ]);
      studentStmt.step();
      studentStmt.reset();
    }
    studentStmt.finalize();
    console.log(`✅ Inserted ${sampleStudents.length} students`);
    
    // Create subjects table
    db.exec(`CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      subject_code TEXT,
      abbreviation TEXT,
      name TEXT,
      department_id TEXT,
      is_compulsory INTEGER,
      grouping TEXT,
      department_name TEXT,
      papers TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
    console.log('✅ Subjects table created');
    
    // Insert sample subjects
    const subjectStmt = db.prepare(`INSERT INTO subjects 
      (id, subject_code, abbreviation, name, department_id, is_compulsory, grouping, department_name, papers, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      
    const sampleSubjects = [
      { id: '1', subject_code: '101', abbreviation: 'ENG', name: 'English', department_id: 'DEPT005', is_compulsory: 1, grouping: 'Group 1 (Compulsory)', department_name: 'Languages & Literature', papers: '[{"id":1,"subject_id":1,"name":"English Paper 1 (Grammar)","created_at":"2025-08-19T14:24:19.688Z","updated_at":"2025-08-19T14:24:19.691Z","subject_name":"English"},{"id":2,"subject_id":1,"name":"English Paper 2 (Literature)","created_at":"2025-08-19T14:24:19.691Z","updated_at":"2025-08-19T14:24:19.691Z","subject_name":"English"},{"id":3,"subject_id":1,"name":"English Paper 3 (Creative Writing)","created_at":"2025-08-19T14:24:19.691Z","updated_at":"2025-08-19T14:24:19.691Z","subject_name":"English"}]', created_at: '2025-08-19T14:24:20.212Z', updated_at: '2025-08-19T14:24:20.212Z' },
      { id: '2', subject_code: '102', abbreviation: 'KIS', name: 'Kiswahili', department_id: 'DEPT005', is_compulsory: 1, grouping: 'Group 1 (Compulsory)', department_name: 'Languages & Literature', papers: '[{"id":4,"subject_id":2,"name":"Kiswahili Paper 1 (Grammar)","created_at":"2025-08-19T14:24:19.691Z","updated_at":"2025-08-19T14:24:19.691Z","subject_name":"Kiswahili"},{"id":5,"subject_id":2,"name":"Kiswahili Paper 2 (Literature)","created_at":"2025-08-19T14:24:19.691Z","updated_at":"2025-08-19T14:24:19.691Z","subject_name":"Kiswahili"},{"id":6,"subject_id":2,"name":"Kiswahili Paper 3 (Creative Writing)","created_at":"2025-08-19T14:24:19.691Z","updated_at":"2025-08-19T14:24:19.691Z","subject_name":"Kiswahili"}]', created_at: '2025-08-19T14:24:20.212Z', updated_at: '2025-08-19T14:24:20.212Z' },
      { id: '3', subject_code: '121', abbreviation: 'MAT', name: 'Mathematics', department_id: 'DEPT001', is_compulsory: 1, grouping: 'Group 1 (Compulsory)', department_name: 'Mathematics', papers: '[{"id":7,"subject_id":3,"name":"Mathematics Paper 1 (Pure)","created_at":"2025-08-19T14:24:19.691Z","updated_at":"2025-08-19T14:24:19.691Z","subject_name":"Mathematics"},{"id":8,"subject_id":3,"name":"Mathematics Paper 2 (Applied)","created_at":"2025-08-19T14:24:19.691Z","updated_at":"2025-08-19T14:24:19.691Z","subject_name":"Mathematics"}]', created_at: '2025-08-19T14:24:20.212Z', updated_at: '2025-08-19T14:24:20.212Z' }
    ];
    
    for (const subject of sampleSubjects) {
      subjectStmt.bind([
        subject.id,
        subject.subject_code,
        subject.abbreviation,
        subject.name,
        subject.department_id,
        subject.is_compulsory,
        subject.grouping,
        subject.department_name,
        subject.papers,
        subject.created_at,
        subject.updated_at
      ]);
      subjectStmt.step();
      subjectStmt.reset();
    }
    subjectStmt.finalize();
    console.log(`✅ Inserted ${sampleSubjects.length} subjects`);
    
    // Create staff table
    db.exec(`CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      staff_no TEXT,
      first_name TEXT,
      last_name TEXT,
      is_active INTEGER,
      user_id TEXT,
      phone TEXT,
      email TEXT,
      department_id TEXT,
      designation_id TEXT,
      hod_of_department_id TEXT,
      date_of_employment TEXT,
      contract_expiry_date TEXT,
      deleted_at TEXT,
      department_name TEXT,
      designation_title TEXT,
      hod_of_department_name TEXT,
      user_username TEXT,
      display_name TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
    console.log('✅ Staff table created');
    
    // Insert sample staff
    const staffStmt = db.prepare(`INSERT INTO staff 
      (id, staff_no, first_name, last_name, is_active, user_id, phone, email, department_id, 
       designation_id, hod_of_department_id, date_of_employment, contract_expiry_date, 
       deleted_at, department_name, designation_title, hod_of_department_name, user_username, 
       display_name, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      
    const sampleStaff = [
      { id: 'STF001', staff_no: 'EMP001', first_name: 'Michael', last_name: 'Scott', is_active: 1, user_id: 'STF001_USR', phone: '0722000001', email: 'm.scott@example.com', department_id: 'DEPT002', designation_id: '1', hod_of_department_id: null, date_of_employment: null, contract_expiry_date: null, deleted_at: null, department_name: 'Administration', designation_title: 'Principal', hod_of_department_name: null, user_username: null, display_name: 'Michael Scott', created_at: '2023-01-02T08:00:00Z', updated_at: '2023-01-02T08:00:00Z' },
      { id: 'STF002', staff_no: 'EMP002', first_name: 'Dwight', last_name: 'Schrute', is_active: 1, user_id: 'STF002_USR', phone: '0722000002', email: 'd.schrute@example.com', department_id: 'DEPT003', designation_id: '4', hod_of_department_id: 'DEPT003', date_of_employment: null, contract_expiry_date: null, deleted_at: null, department_name: 'Sciences', designation_title: 'Head of Department (HOD)', hod_of_department_name: 'Sciences', user_username: null, display_name: 'Dwight Schrute', created_at: '2023-01-03T08:00:00Z', updated_at: '2023-01-03T08:00:00Z' },
      { id: 'STF003', staff_no: 'EMP003', first_name: 'Pam', last_name: 'Beesly', is_active: 1, user_id: 'STF003_USR', phone: '0722000003', email: 'p.beesly@example.com', department_id: 'DEPT002', designation_id: '6', hod_of_department_id: null, date_of_employment: null, contract_expiry_date: null, deleted_at: null, department_name: 'Administration', designation_title: 'Secretary', hod_of_department_name: null, user_username: null, display_name: 'Pam Beesly', created_at: '2023-01-04T08:00:00Z', updated_at: '2023-01-04T08:00:00Z' }
    ];
    
    for (const staff of sampleStaff) {
      staffStmt.bind([
        staff.id,
        staff.staff_no,
        staff.first_name,
        staff.last_name,
        staff.is_active,
        staff.user_id,
        staff.phone,
        staff.email,
        staff.department_id,
        staff.designation_id,
        staff.hod_of_department_id,
        staff.date_of_employment,
        staff.contract_expiry_date,
        staff.deleted_at,
        staff.department_name,
        staff.designation_title,
        staff.hod_of_department_name,
        staff.user_username,
        staff.display_name,
        staff.created_at,
        staff.updated_at
      ]);
      staffStmt.step();
      staffStmt.reset();
    }
    staffStmt.finalize();
    console.log(`✅ Inserted ${sampleStaff.length} staff members`);
    
    // Close database
    db.close();
    
    console.log(`\n✅ SIMPLE SQLITE DATABASE FILE CREATED SUCCESSFULLY ===`);
    console.log(`📁 Database file location: ${dbFilePath}`);
    console.log('You can now explore this file with any SQLite browser!');
    console.log('Recommended tools:');
    console.log('  - DB Browser for SQLite (https://sqlitebrowser.org/)');
    console.log('  - SQLiteStudio (https://sqlitestudio.pl/)');
    console.log('  - Command line: sqlite3 schoolpilot_simple.db');
    
  } catch (error) {
    console.error('❌ Database file creation failed:', error);
    throw error;
  }
}

// Run the database file creation
createSimpleSQLiteFile().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});