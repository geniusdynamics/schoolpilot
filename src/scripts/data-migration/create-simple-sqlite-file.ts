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
      status TEXT,
      email TEXT,
      phone TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
    console.log('✅ Students table created');
    
    // Insert sample students
    const studentStmt = db.prepare(`INSERT INTO students 
      (id, admission_no, first_name, last_name, gender, current_class_stream_id, 
       student_category_id, dormitory_id, status, email, phone, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      
    const sampleStudents = [
      { id: 'STU001', admission_no: 'ADM001', first_name: 'Jim', last_name: 'Halpert', gender: 'Male', current_class_stream_id: 'CS001', student_category_id: 'SC001', dormitory_id: 'D001', status: 'Active', email: 'j.halpert@example.com', phone: '0700111222', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STU002', admission_no: 'ADM002', first_name: 'Michael', last_name: 'Scofield', gender: 'Male', current_class_stream_id: 'CS001', student_category_id: 'SC002', dormitory_id: null, status: 'Active', email: 'm.scofield@example.com', phone: '0700333444', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STU003', admission_no: 'ADM003', first_name: 'Sara', last_name: 'Tancredi', gender: 'Female', current_class_stream_id: 'CS002', student_category_id: 'SC001', dormitory_id: null, status: 'Active', email: 's.tancredi@example.com', phone: '0700555666', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STU004', admission_no: 'ADM004', first_name: 'Lincoln', last_name: 'Burrows', gender: 'Male', current_class_stream_id: 'CS002', student_category_id: 'SC001', dormitory_id: 'D002', status: 'Active', email: 'l.burrows@example.com', phone: '0700777888', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STU005', admission_no: 'ADM005', first_name: 'Theodore', last_name: 'Bagwell', gender: 'Male', current_class_stream_id: 'CS003', student_category_id: 'SC002', dormitory_id: null, status: 'Active', email: 't.bagwell@example.com', phone: '0700999000', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
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
        student.status,
        student.email,
        student.phone,
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
      created_at TEXT,
      updated_at TEXT
    )`);
    console.log('✅ Subjects table created');
    
    // Insert sample subjects
    const subjectStmt = db.prepare(`INSERT INTO subjects 
      (id, subject_code, abbreviation, name, department_id, is_compulsory, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      
    const sampleSubjects = [
      { id: 'SUBJ001', subject_code: '101', abbreviation: 'ENG', name: 'English', department_id: 'DEPT001', is_compulsory: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ002', subject_code: '102', abbreviation: 'KIS', name: 'Kiswahili', department_id: 'DEPT001', is_compulsory: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ003', subject_code: '121', abbreviation: 'MAT', name: 'Mathematics', department_id: 'DEPT002', is_compulsory: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ004', subject_code: '231', abbreviation: 'BIO', name: 'Biology', department_id: 'DEPT003', is_compulsory: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ005', subject_code: '232', abbreviation: 'PHY', name: 'Physics', department_id: 'DEPT003', is_compulsory: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ006', subject_code: '233', abbreviation: 'CHEM', name: 'Chemistry', department_id: 'DEPT003', is_compulsory: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ007', subject_code: '311', abbreviation: 'HIS', name: 'History', department_id: 'DEPT004', is_compulsory: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ008', subject_code: '312', abbreviation: 'GEO', name: 'Geography', department_id: 'DEPT004', is_compulsory: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ009', subject_code: '313', abbreviation: 'CRE', name: 'Christian Religious Education', department_id: 'DEPT004', is_compulsory: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ010', subject_code: '441', abbreviation: 'BST', name: 'Business Studies', department_id: 'DEPT005', is_compulsory: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ011', subject_code: '442', abbreviation: 'COMP', name: 'Computer Studies', department_id: 'DEPT005', is_compulsory: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ012', subject_code: '443', abbreviation: 'AGR', name: 'Agriculture', department_id: 'DEPT006', is_compulsory: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ013', subject_code: '501', abbreviation: 'FRE', name: 'French', department_id: 'DEPT001', is_compulsory: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ014', subject_code: '502', abbreviation: 'GER', name: 'German', department_id: 'DEPT001', is_compulsory: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ015', subject_code: '565', abbreviation: 'ARA', name: 'Arabic', department_id: 'DEPT001', is_compulsory: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ016', subject_code: '601', abbreviation: 'MUS', name: 'Music', department_id: 'DEPT007', is_compulsory: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ017', subject_code: '602', abbreviation: 'ART', name: 'Art & Design', department_id: 'DEPT007', is_compulsory: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'SUBJ018', subject_code: '603', abbreviation: 'HME', name: 'Home Science', department_id: 'DEPT007', is_compulsory: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];
    
    for (const subject of sampleSubjects) {
      subjectStmt.bind([
        subject.id,
        subject.subject_code,
        subject.abbreviation,
        subject.name,
        subject.department_id,
        subject.is_compulsory,
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
      department_id TEXT,
      designation_id TEXT,
      email TEXT,
      phone TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
    console.log('✅ Staff table created');
    
    // Insert sample staff
    const staffStmt = db.prepare(`INSERT INTO staff 
      (id, staff_no, first_name, last_name, is_active, department_id, designation_id, email, phone, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      
    const sampleStaff = [
      { id: 'STF001', staff_no: 'EMP001', first_name: 'Michael', last_name: 'Scott', is_active: 1, department_id: 'DEPT008', designation_id: 'DES001', email: 'm.scott@example.com', phone: '0722000001', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STF002', staff_no: 'EMP002', first_name: 'Dwight', last_name: 'Schrute', is_active: 1, department_id: 'DEPT003', designation_id: 'DES004', email: 'd.schrute@example.com', phone: '0722000002', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STF003', staff_no: 'EMP003', first_name: 'Pam', last_name: 'Beesly', is_active: 1, department_id: 'DEPT008', designation_id: 'DES006', email: 'p.beesly@example.com', phone: '0722000003', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STF004', staff_no: 'EMP004', first_name: 'Jim', last_name: 'Halpert', is_active: 1, department_id: 'DEPT003', designation_id: 'DES005', email: 'j.halpert@example.com', phone: '0722000004', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STF005', staff_no: 'EMP005', first_name: 'Angela', last_name: 'Martin', is_active: 1, department_id: 'DEPT009', designation_id: 'DES007', email: 'a.martin@example.com', phone: '0722000005', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STF006', staff_no: 'EMP006', first_name: 'Kevin', last_name: 'Malone', is_active: 1, department_id: 'DEPT009', designation_id: 'DES008', email: 'k.malone@example.com', phone: '0722000006', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STF007', staff_no: 'EMP007', first_name: 'Oscar', last_name: 'Martinez', is_active: 1, department_id: 'DEPT009', designation_id: 'DES009', email: 'o.martinez@example.com', phone: '0722000007', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STF008', staff_no: 'EMP008', first_name: 'Creed', last_name: 'Bratton', is_active: 1, department_id: 'DEPT010', designation_id: 'DES010', email: 'c.bratton@example.com', phone: '0722000008', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STF009', staff_no: 'EMP009', first_name: 'Ryan', last_name: 'Howard', is_active: 1, department_id: 'DEPT011', designation_id: 'DES011', email: 'r.howard@example.com', phone: '0722000009', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'STF010', staff_no: 'EMP010', first_name: 'Kelly', last_name: 'Kapoor', is_active: 1, department_id: 'DEPT012', designation_id: 'DES012', email: 'k.kapoor@example.com', phone: '0722000010', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];
    
    for (const staff of sampleStaff) {
      staffStmt.bind([
        staff.id,
        staff.staff_no,
        staff.first_name,
        staff.last_name,
        staff.is_active,
        staff.department_id,
        staff.designation_id,
        staff.email,
        staff.phone,
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