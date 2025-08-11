#!/usr/bin/env node

/**
 * Fix Import Paths Script
 * 
 * This script fixes the import paths so that each hook imports from the correct module
 * where the data actually exists.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  modulesDir: 'src/modules',
  backupDir: 'backup_import_paths_fix_' + new Date().toISOString().replace(/[:.]/g, '-'),
  logFile: 'import_paths_fix.log'
};

// Logging utility
const log = (message, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
};

// Create backup directory
const createBackup = () => {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    log(`Created backup directory: ${CONFIG.backupDir}`);
  }
};

// Backup a file
const backupFile = (filePath) => {
  const relativePath = path.relative('.', filePath);
  const backupPath = path.join(CONFIG.backupDir, relativePath);
  const backupDir = path.dirname(backupPath);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    log(`Backed up: ${filePath} -> ${backupPath}`);
  }
};

// Get all module hook files
const getModuleHookFiles = () => {
  const hookFiles = [];
  
  const modules = fs.readdirSync(CONFIG.modulesDir);
  
  for (const module of modules) {
    const modulePath = path.join(CONFIG.modulesDir, module);
    if (fs.statSync(modulePath).isDirectory()) {
      const dataPath = path.join(modulePath, 'data');
      if (fs.existsSync(dataPath)) {
        const files = fs.readdirSync(dataPath);
        for (const file of files) {
          if (file.startsWith('use') && file.endsWith('Data.ts')) {
            hookFiles.push(path.join(dataPath, file));
          }
        }
      }
    }
  }
  
  return hookFiles;
};

// Fix a single hook file
const fixHookFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it imports from administration but should import from its own module
    if (content.includes('../../administration/data/mockData')) {
      log(`Fixing import path in: ${filePath}`);
      
      // Get the hook name from filename
      const fileName = path.basename(filePath, '.ts');
      const hookName = fileName.charAt(0).toLowerCase() + fileName.slice(1);
      
      // Determine the correct import path based on the hook name
      const importPathMap = {
        'useAcademicYearData': { path: '../../administration/data/mockData', data: 'initialMockAcademicYears' },
        'useAcademicPeriodDefinitionData': { path: '../../administration/data/mockData', data: 'initialMockAcademicPeriodDefinitions' },
        'useAcademicYearStructureData': { path: '../../administration/data/mockData', data: 'initialMockAcademicYearStructures' },
        'useSchoolPeriodData': { path: '../../administration/data/mockData', data: 'initialMockSchoolPeriods' },
        'useSubjectData': { path: './mockData', data: 'initialMockSubjects' },
        'useSubjectPaperData': { path: './mockData', data: 'initialMockSubjectPapers' },
        'useExamSessionData': { path: './mockData', data: 'initialMockExamSessions' },
        'useExamPaperSettingData': { path: './mockData', data: 'initialMockExamPaperSettings' },
        'useGradingSchemeData': { path: './mockData', data: 'initialMockGradingSchemes' },
        'useGradingSchemeLevelData': { path: './mockData', data: 'initialMockGradingSchemeLevels' },
        'useStudentExamResultData': { path: './mockData', data: 'initialMockStudentExamResults' },
        'useStudentPaperMarkData': { path: './mockData', data: 'initialMockStudentPaperMarks' },
        'useClassSubjectAllocationData': { path: './mockData', data: 'initialMockClassSubjectAllocations' },
        'useTeacherSubjectAssignmentData': { path: './mockData', data: 'initialMockTeacherSubjectAssignments' },
        'useStudentSubjectEnrollmentData': { path: './mockData', data: 'initialMockStudentSubjectEnrollments' },
        'useTimetablePeriodDefData': { path: './mockData', data: 'initialMockTimetablePeriodDefs' },
        'useTimetableEntryData': { path: './mockData', data: 'initialMockTimetableEntries' },
        'useUserData': { path: '../../administration/data/mockData', data: 'initialMockUsers' },
        'useRoleData': { path: '../../administration/data/mockData', data: 'initialMockRoles' },
        'useDepartmentData': { path: '../../administration/data/mockData', data: 'initialMockDepartments' },
        'useDesignationData': { path: '../../administration/data/mockData', data: 'initialMockDesignations' },
        'useStudentCategoryData': { path: '../../administration/data/mockData', data: 'initialMockStudentCategories' },
        'useDormitoryData': { path: '../../administration/data/mockData', data: 'initialMockDormitories' },
        'useClassData': { path: '../../administration/data/mockData', data: 'initialMockClasses' },
        'useClassStreamData': { path: '../../administration/data/mockData', data: 'initialMockClassStreams' },
        'useStudentData': { path: '../../administration/data/mockData', data: 'initialMockStudents' },
        'useParentsGuardianData': { path: '../../administration/data/mockData', data: 'initialMockParentsGuardians' },
        'useSchoolDetailsData': { path: '../../administration/data/mockData', data: 'initialMockSchoolDetails' },
        'useStaffData': { path: '../../administration/data/mockData', data: 'initialMockStaff' },
        'useFinancialYearData': { path: '../../finance/data/mockData', data: 'initialMockFinancialYears' },
        'usePartnerData': { path: '../../administration/data/mockData', data: 'initialMockPartners' },
        'useClubData': { path: '../../administration/data/mockData', data: 'initialMockClubs' },
        'useCustomerData': { path: '../../administration/data/mockData', data: 'initialMockCustomers' },
        'useStudentHealthRecordData': { path: '../../administration/data/mockData', data: 'initialMockStudentHealthRecords' },
        'useStudentAttendanceData': { path: '../../administration/data/mockData', data: 'initialMockStudentAttendance' },
        'useTemplateCommData': { path: '../../administration/data/mockData', data: 'initialMockTemplateComms' },
        'useCampaignData': { path: '../../administration/data/mockData', data: 'initialMockCampaigns' },
        'useBankData': { path: '../../finance/data/mockData', data: 'initialMockBanks' },
        'useChartOfAccountData': { path: '../../finance/data/mockData', data: 'initialMockChartOfAccounts' },
        'useCustomerInvoiceData': { path: '../../finance/data/mockData', data: 'initialMockCustomerInvoices' },
        'useCustomerInvoiceItemData': { path: '../../finance/data/mockData', data: 'initialMockCustomerInvoiceItems' },
        'useCustomerPaymentData': { path: '../../finance/data/mockData', data: 'initialMockCustomerPayments' },
        'useCustomerPaymentItemData': { path: '../../finance/data/mockData', data: 'initialMockCustomerPaymentItems' },
        'useSupplierData': { path: '../../finance/data/mockData', data: 'initialMockSuppliers' },
        'useSupplierInvoiceData': { path: '../../finance/data/mockData', data: 'initialMockSupplierInvoices' },
        'useSupplierInvoiceItemData': { path: '../../finance/data/mockData', data: 'initialMockSupplierInvoiceItems' },
        'useSupplierPaymentData': { path: '../../finance/data/mockData', data: 'initialMockSupplierPayments' },
        'useSupplierPaymentItemData': { path: '../../finance/data/mockData', data: 'initialMockSupplierPaymentItems' },
        'usePayrollItemTypeData': { path: '../../hr/data/mockData', data: 'initialMockPayrollItemTypes' },
        'usePayrollPeriodData': { path: '../../hr/data/mockData', data: 'initialMockPayrollPeriods' },
        'useItemCategoryData': { path: '../../inventory/data/mockData', data: 'initialMockItemCategories' },
        'useItemData': { path: '../../inventory/data/mockData', data: 'initialMockItems' },
        'useItemMovementData': { path: '../../inventory/data/mockData', data: 'initialMockItemMovements' },
        'useFixedAssetData': { path: '../../inventory/data/mockData', data: 'initialMockFixedAssets' },
        'useRequisitionData': { path: '../../inventory/data/mockData', data: 'initialMockRequisitions' },
        'useBookCategoryData': { path: '../../library/data/mockData', data: 'initialMockBookCategories' },
        'useBookData': { path: '../../library/data/mockData', data: 'initialMockBooks' },
        'useBookLoanData': { path: '../../library/data/mockData', data: 'initialMockBookLoans' },
        'useMealPlanData': { path: '../../nutrition/data/mockData', data: 'initialMockMealPlans' },
        'useMenuData': { path: '../../nutrition/data/mockData', data: 'initialMockMenus' },
        'useMealConsumptionLogData': { path: '../../nutrition/data/mockData', data: 'initialMockMealConsumptionLogs' }
      };
      
      const mapping = importPathMap[hookName];
      if (!mapping) {
        log(`No mapping found for ${hookName}, skipping`, 'WARN');
        return false;
      }
      
      const { path: importPath, data: mockDataName } = mapping;
      
      // Replace the import statement
      const newContent = content.replace(
        /import \{ [^}]+ \} from '\.\.\/\.\.\/administration\/data\/mockData';/,
        `import { ${mockDataName} } from '${importPath}';`
      );
      
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        log(`Fixed: ${filePath}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    log(`Error fixing ${filePath}: ${error.message}`, 'ERROR');
    return false;
  }
};

// Main execution
const main = async () => {
  try {
    log('Starting import paths fix...');
    
    // Create backup
    createBackup();
    
    // Get all hook files
    const hookFiles = getModuleHookFiles();
    log(`Found ${hookFiles.length} hook files to check`);
    
    let fixedCount = 0;
    
    // Fix each hook file
    for (const filePath of hookFiles) {
      backupFile(filePath);
      if (fixHookFile(filePath)) {
        fixedCount++;
      }
    }
    
    log(`Fixed ${fixedCount} hook files with incorrect import paths`);
    log('Import paths fix completed successfully!');
    
  } catch (error) {
    log(`Error in main execution: ${error.message}`, 'ERROR');
    process.exit(1);
  }
};

// Run the script
main(); 