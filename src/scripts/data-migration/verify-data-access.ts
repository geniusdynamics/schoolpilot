#!/usr/bin/env node

// ABOUTME: Script to verify that we can access data through the SQLite service
// ABOUTME: This script connects to the SQLite database and verifies data access

import { SQLiteOPFSService } from '../../services/sqlite/SQLiteOPFSService';

async function verifyDataAccess() {
  console.log('=== VERIFYING DATA ACCESS ===');
  
  try {
    // Create SQLite service
    const sqliteService = new SQLiteOPFSService();
    await sqliteService.initialize('schoolpilot_dev.db');
    console.log('✅ SQLite service initialized');

    // Get some collections and verify data access
    console.log('\n--- Verifying Data Access ---');
    
    // Check users collection
    const usersCollection = sqliteService.getCollection('users');
    if (usersCollection) {
      try {
        const usersCount = await usersCollection.count();
        console.log(`✅ Users collection accessible: ${usersCount} records`);
        
        if (usersCount > 0) {
          const sampleUsers = await usersCollection.find({ limit: 3 });
          console.log(`Sample users:`);
          sampleUsers.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.username} (${user.email})`);
          });
        }
      } catch (error) {
        console.error(`❌ Error accessing users collection:`, error.message);
      }
    } else {
      console.log('❌ Users collection not found');
    }
    
    // Check students collection
    const studentsCollection = sqliteService.getCollection('students');
    if (studentsCollection) {
      try {
        const studentsCount = await studentsCollection.count();
        console.log(`✅ Students collection accessible: ${studentsCount} records`);
        
        if (studentsCount > 0) {
          const sampleStudents = await studentsCollection.find({ limit: 3 });
          console.log(`Sample students:`);
          sampleStudents.forEach((student, index) => {
            console.log(`  ${index + 1}. ${student.first_name} ${student.last_name} (${student.admission_no})`);
          });
        }
      } catch (error) {
        console.error(`❌ Error accessing students collection:`, error.message);
      }
    } else {
      console.log('❌ Students collection not found');
    }
    
    // Check subjects collection
    const subjectsCollection = sqliteService.getCollection('subjects');
    if (subjectsCollection) {
      try {
        const subjectsCount = await subjectsCollection.count();
        console.log(`✅ Subjects collection accessible: ${subjectsCount} records`);
        
        if (subjectsCount > 0) {
          const sampleSubjects = await subjectsCollection.find({ limit: 3 });
          console.log(`Sample subjects:`);
          sampleSubjects.forEach((subject, index) => {
            console.log(`  ${index + 1}. ${subject.name} (${subject.subject_code})`);
          });
        }
      } catch (error) {
        console.error(`❌ Error accessing subjects collection:`, error.message);
      }
    } else {
      console.log('❌ Subjects collection not found');
    }
    
    // Check staff collection
    const staffCollection = sqliteService.getCollection('staff');
    if (staffCollection) {
      try {
        const staffCount = await staffCollection.count();
        console.log(`✅ Staff collection accessible: ${staffCount} records`);
        
        if (staffCount > 0) {
          const sampleStaff = await staffCollection.find({ limit: 3 });
          console.log(`Sample staff:`);
          sampleStaff.forEach((staff, index) => {
            console.log(`  ${index + 1}. ${staff.first_name} ${staff.last_name} (${staff.staff_no})`);
          });
        }
      } catch (error) {
        console.error(`❌ Error accessing staff collection:`, error.message);
      }
    } else {
      console.log('❌ Staff collection not found');
    }
    
    // Create a backup to verify we can export data
    console.log('\n--- Creating Backup ---');
    try {
      const backupData = await sqliteService.backup();
      const backup = JSON.parse(backupData);
      console.log(`✅ Backup created with ${Object.keys(backup.collections).length} collections`);
      
      // Write backup to file
      const fs = await import('fs');
      const path = await import('path');
      const backupFilePath = path.join(process.cwd(), 'schoolpilot_data_backup.json');
      fs.writeFileSync(backupFilePath, backupData, 'utf8');
      console.log(`✅ Backup written to: ${backupFilePath}`);
    } catch (backupError) {
      console.error('❌ Failed to create backup:', backupError.message);
    }
    
    console.log('\n✅ DATA ACCESS VERIFICATION COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Data access verification failed:', error);
    throw error;
  }
}

// Run the verification
verifyDataAccess().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});