#!/usr/bin/env node

// ABOUTME: Script to create a complete SQLite database file with all mock data
// ABOUTME: This script generates a standalone .db file that can be used for backup or distribution

import * as fs from 'fs';
import * as path from 'path';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

// Import mock data modules directly instead of using import.meta.glob
import * as academicsMockData from '../../modules/academics/data/mockData';
import * as administrationMockData from '../../modules/administration/data/mockData';
import * as financeMockData from '../../modules/finance/data/mockData';
import * as hrMockData from '../../modules/hr/data/mockData';
import * as inventoryMockData from '../../modules/inventory/data/mockData';
import * as libraryMockData from '../../modules/library/data/mockData';
import * as nutritionMockData from '../../modules/nutrition/data/mockData';

async function createCompleteSQLiteFile() {
  console.log('=== CREATING COMPLETE SQLITE DATABASE FILE ===');
  
  try {
    // Initialize SQLite WASM
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });
    
    console.log(`✅ SQLite WASM initialized: ${sqlite3.version.libVersion}`);
    
    // Create SQLite database file
    const dbFileName = 'schoolpilot_complete.db';
    const dbFilePath = path.join(process.cwd(), dbFileName);
    
    // Remove existing database file if it exists
    if (fs.existsSync(dbFilePath)) {
      fs.unlinkSync(dbFilePath);
      console.log(`🗑️  Removed existing database file: ${dbFileName}`);
    }
    
    // Open database in file mode
    const db = new sqlite3.oo1.DB(dbFileName, 'ct'); // 'ct' = create/write mode
    console.log(`✅ SQLite database file created: ${dbFileName}`);
    
    // Import and aggregate mock data
    console.log('\n--- Importing and Aggregating Mock Data ---');
    const mockData: any = {};
    
    // Add data from each module
    Object.entries(academicsMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    Object.entries(administrationMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    Object.entries(financeMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    Object.entries(hrMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    Object.entries(inventoryMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    Object.entries(libraryMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    Object.entries(nutritionMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    console.log(`✅ Mock data imported with ${Object.keys(mockData).length} keys`);

    // Map collection names to mock data keys
    console.log('\n--- Mapping Collections to Mock Data Keys ---');
    const collectionNameToMockDataKey = new Map<string, string>();
    
    // Define the mapping for all collections
    const collectionMappings: Record<string, string> = {
      // Core collections
      'app_settings': 'initialMockAppSettings',
      'school_details': 'initialMockSchoolDetails',
      'users': 'initialMockUsers',
      'roles': 'initialMockRoles',
      'academic_year_structures': 'initialMockAcademicYearStructures',
      'academic_period_definitions': 'initialMockAcademicPeriodDefinitions',
      'academic_years': 'initialMockAcademicYears',
      'workflows': 'initialMockWorkflows',
      'workflow_states': 'initialMockWorkflowStates',
      'education_system_configurations': 'initialMockEducationSystemConfigurations',
      'audit_logs': 'initialMockAuditLogs',
      'parents_guardians': 'initialMockParentsGuardians',
      'students': 'initialMockStudents',
      'student_guardian_relationships': 'initialMockStudentGuardianRelationships',
      'staff': 'initialMockStaff',
      'departments': 'initialMockDepartments',
      'designations': 'initialMockDesignations',
      'student_categories': 'initialMockStudentCategories',
      'dormitories': 'initialMockDormitories',
      'classes': 'initialMockClasses',
      'class_streams': 'initialMockClassStreams',
      'student_invoice_items': 'initialMockStudentInvoiceItems',
      'permissions': 'initialMockPermissions',
      'rbac_roles': 'initialMockRbacRoles',
      'user_roles': 'initialMockUserRoles',
      
      // Academics collections
      'subjects': 'initialMockSubjects',
      'subject_papers': 'initialMockSubjectPapers',
      'exam_sessions': 'initialMockExamSessions',
      'exam_schedules': 'initialMockExamSchedules',
      'result_approvals': 'initialMockResultApprovals',
      'grading_schemes': 'initialMockGradingSchemes',
      'student_exam_results': 'initialMockStudentExamResults',
      'class_subject_allocations': 'initialMockClassSubjectAllocations',
      'teacher_subject_assignments': 'initialMockTeacherSubjectAssignments',
      'student_subject_enrollments': 'initialMockStudentSubjectEnrollments',
      'timetable_period_definitions': 'initialMockTimetablePeriodDefs',
      'timetable_entries': 'initialMockTimetableEntries',
      
      // Administration collections
      'partners': 'initialMockPartners',
      'clubs': 'initialMockClubs',
      'customers': 'initialMockCustomers',
      'student_health_records': 'initialMockStudentHealthRecords',
      'student_attendance': 'initialMockStudentAttendance',
      'communication_templates': 'initialMockCommunicationTemplates',
      'message_campaigns': 'initialMockMessageCampaigns',
      'admissions_applications': 'initialMockAdmissionsApplications',
      'pre_nas_marks': 'initialMockPreNasMarks',
      'application_reviews': 'initialMockApplicationReviews',
      'application_documents': 'initialMockApplicationDocuments',
      'application_interviews': 'initialMockApplicationInterviews',
      'application_approvals': 'initialMockApplicationApprovals',
      'sms_campaigns': 'initialMockSmsCampaigns',
      'bulk_imports': 'initialMockBulkImports',
      
      // Finance collections
      'financial_years': 'initialMockFinancialYears',
      'school_periods': 'initialMockSchoolPeriods',
      'chart_of_accounts': 'initialMockChartOfAccounts',
      'expense_categories': 'initialMockExpenseCategories',
      'banks': 'initialMockBanks',
      'suppliers': 'initialMockSuppliers',
      'fee_templates': 'initialMockFeeTemplates',
      'expense_claims': 'initialMockExpenseClaims',
      'student_opening_balances': 'initialMockStudentOpeningBalances',
      'fee_adjustments': 'initialMockFeeAdjustments',
      'transport_routes': 'initialMockTransportRoutes',
      'student_transport_assignments': 'initialMockStudentTransportAssignments',
      'student_invoices': 'initialMockStudentInvoices',
      'student_payments': 'initialMockStudentPayments',
      'invoice_payment_applications': 'initialMockInvoicePaymentApplications',
      'customer_invoices': 'initialMockCustomerInvoices',
      'supplier_invoices': 'initialMockSupplierInvoices',
      'general_payments': 'initialMockGeneralPayments',
      'general_ledger_entries': 'initialMockGeneralLedgerEntries',
      
      // HR collections
      'payroll_periods': 'initialMockPayrollPeriods',
      'payroll_item_types': 'initialMockPayrollItemTypes',
      'staff_salary_settings': 'initialMockStaffSalarySettings',
      'payslips': 'initialMockPayslips',
      
      // Inventory collections
      'warehouses': 'initialMockWarehouses',
      'item_categories_inv': 'initialMockItemCategoriesInv',
      'items_inv': 'initialMockItemsInv',
      'fixed_assets': 'initialMockFixedAssets',
      'asset_depreciation_logs': 'initialMockAssetDepreciationLogs',
      'stock_levels': 'initialMockStockLevels',
      'stock_transactions': 'initialMockStockTransactions',
      'requisitions': 'initialMockRequisitions',
      'purchase_orders': 'initialMockPurchaseOrders',
      'rfqs': 'initialMockRfqs',
      'supplier_contracts': 'initialMockSupplierContracts',
      'stock_alerts': 'initialMockStockAlerts',
      
      // Library collections
      'book_categories': 'initialMockBookCategories',
      'books': 'initialMockBooks',
      'loans': 'initialMockLoans',
      'fines': 'initialMockFines',
      
      // Nutrition collections
      'meal_plans': 'initialMockMealPlans',
      'student_meal_plans': 'initialMockStudentMealPlans',
      'menus': 'initialMockMenus',
      'meal_consumption_logs': 'initialMockMealConsumptionLogs',
      'merchants': 'initialMockMerchants',
      'student_wallets': 'initialMockStudentWallets',
      'wallet_transactions': 'initialMockWalletTransactions'
    };
    
    // Populate the mapping
    for (const [collectionName, mockDataKey] of Object.entries(collectionMappings)) {
      collectionNameToMockDataKey.set(collectionName, mockDataKey);
    }
    
    console.log(`✅ Mapped ${collectionNameToMockDataKey.size} collections to mock data keys`);

    // Create tables and insert data for each collection
    console.log('\n--- Creating Tables and Inserting Data ---');
    let tablesCreated = 0;
    let dataInserted = 0;
    
    for (const [collectionName, mockDataKey] of collectionNameToMockDataKey) {
      try {
        const mockDataArray = mockData[mockDataKey];
        
        if (mockDataArray && Array.isArray(mockDataArray) && mockDataArray.length > 0) {
          console.log(`\nProcessing collection: ${collectionName} (${mockDataArray.length} records)`);
          
          // Create table schema based on first record
          const firstRecord = mockDataArray[0];
          const columns: string[] = [];
          const columnDefs: string[] = [];
          
          // Add ID column
          columns.push('id');
          columnDefs.push('id TEXT PRIMARY KEY');
          
          // Add other columns based on first record structure
          for (const [key, value] of Object.entries(firstRecord)) {
            if (key === 'id') continue; // Skip ID as we already added it
            
            columns.push(key);
            
            // Determine column type based on value
            let sqliteType = 'TEXT';
            if (typeof value === 'number') {
              sqliteType = Number.isInteger(value) ? 'INTEGER' : 'REAL';
            } else if (typeof value === 'boolean') {
              sqliteType = 'INTEGER'; // Store booleans as 0/1
            } else if (value === null) {
              sqliteType = 'TEXT'; // Default to TEXT for null values
            } else if (Array.isArray(value)) {
              sqliteType = 'TEXT'; // Store arrays as JSON strings
            } else if (typeof value === 'object') {
              sqliteType = 'TEXT'; // Store objects as JSON strings
            }
            
            columnDefs.push(`${key} ${sqliteType}`);
          }
          
          // Create table
          const createTableSQL = `CREATE TABLE IF NOT EXISTS ${collectionName} (${columnDefs.join(', ')})`;
          db.exec(createTableSQL);
          tablesCreated++;
          console.log(`  ✅ Table '${collectionName}' created`);
          
          // Insert data
          const placeholders = columns.map(() => '?').join(', ');
          const insertSQL = `INSERT INTO ${collectionName} (${columns.join(', ')}) VALUES (${placeholders})`;
          const stmt = db.prepare(insertSQL);
          
          let insertedCount = 0;
          for (const record of mockDataArray) {
            try {
              // Prepare values in the same order as columns
              const values: any[] = [];
              for (const column of columns) {
                let value = record[column];
                
                // Serialize complex types to JSON strings
                if (value !== null && value !== undefined) {
                  if (Array.isArray(value) || typeof value === 'object') {
                    value = JSON.stringify(value);
                  } else if (typeof value === 'boolean') {
                    value = value ? 1 : 0;
                  }
                }
                
                values.push(value);
              }
              
              stmt.bind(values);
              stmt.step();
              stmt.reset();
              insertedCount++;
            } catch (insertError) {
              console.error(`    ❌ Error inserting record in ${collectionName}:`, insertError.message);
            }
          }
          
          stmt.finalize();
          dataInserted += insertedCount;
          console.log(`  ✅ Inserted ${insertedCount} records into '${collectionName}'`);
          
        } else if (mockDataArray && !Array.isArray(mockDataArray) && mockDataArray !== null) {
          console.log(`\nProcessing collection: ${collectionName} (1 record)`);
          
          // Create table schema based on the single record
          const columns: string[] = [];
          const columnDefs: string[] = [];
          
          // Add ID column
          columns.push('id');
          columnDefs.push('id TEXT PRIMARY KEY');
          
          // Add other columns based on record structure
          for (const [key, value] of Object.entries(mockDataArray)) {
            if (key === 'id') continue; // Skip ID as we already added it
            
            columns.push(key);
            
            // Determine column type based on value
            let sqliteType = 'TEXT';
            if (typeof value === 'number') {
              sqliteType = Number.isInteger(value) ? 'INTEGER' : 'REAL';
            } else if (typeof value === 'boolean') {
              sqliteType = 'INTEGER'; // Store booleans as 0/1
            } else if (value === null) {
              sqliteType = 'TEXT'; // Default to TEXT for null values
            } else if (Array.isArray(value)) {
              sqliteType = 'TEXT'; // Store arrays as JSON strings
            } else if (typeof value === 'object') {
              sqliteType = 'TEXT'; // Store objects as JSON strings
            }
            
            columnDefs.push(`${key} ${sqliteType}`);
          }
          
          // Create table
          const createTableSQL = `CREATE TABLE IF NOT EXISTS ${collectionName} (${columnDefs.join(', ')})`;
          db.exec(createTableSQL);
          tablesCreated++;
          console.log(`  ✅ Table '${collectionName}' created`);
          
          // Insert data
          const placeholders = columns.map(() => '?').join(', ');
          const insertSQL = `INSERT INTO ${collectionName} (${columns.join(', ')}) VALUES (${placeholders})`;
          const stmt = db.prepare(insertSQL);
          
          try {
            // Prepare values in the same order as columns
            const values: any[] = [];
            for (const column of columns) {
              let value = mockDataArray[column];
              
              // Serialize complex types to JSON strings
              if (value !== null && value !== undefined) {
                if (Array.isArray(value) || typeof value === 'object') {
                  value = JSON.stringify(value);
                } else if (typeof value === 'boolean') {
                  value = value ? 1 : 0;
                }
              }
              
              values.push(value);
            }
            
            stmt.bind(values);
            stmt.step();
            stmt.finalize();
            dataInserted++;
            console.log(`  ✅ Inserted 1 record into '${collectionName}'`);
          } catch (insertError) {
            console.error(`    ❌ Error inserting record in ${collectionName}:`, insertError.message);
            stmt.finalize();
          }
        } else {
          // Only show this for a few key collections to avoid spam
          if (['app_settings', 'school_details', 'subjects', 'students', 'staff'].includes(collectionName)) {
            console.log(`\nSkipping collection: ${collectionName} (no records)`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing collection ${collectionName}:`, error.message);
      }
    }
    
    // Close database
    db.close();
    
    console.log(`\n✅ COMPLETE SQLITE DATABASE FILE CREATED SUCCESSFULLY ===`);
    console.log(`📁 Database file location: ${dbFilePath}`);
    console.log(`📊 Tables created: ${tablesCreated}`);
    console.log(`📊 Records inserted: ${dataInserted}`);
    console.log('You can now explore this file with any SQLite browser!');
    console.log('Recommended tools:');
    console.log('  - DB Browser for SQLite (https://sqlitebrowser.org/)');
    console.log('  - SQLiteStudio (https://sqlitestudio.pl/)');
    console.log('  - Command line: sqlite3 schoolpilot_complete.db');
    
  } catch (error) {
    console.error('❌ Database file creation failed:', error);
    throw error;
  }
}

// Run the database file creation
createCompleteSQLiteFile().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});