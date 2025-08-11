#!/usr/bin/env node

/**
 * Fix Broken Hooks Script
 * 
 * This script fixes the broken hooks that were created by the circular dependency fix
 * with incorrect data type mappings.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  modulesDir: 'src/modules',
  backupDir: 'backup_broken_hooks_fix_' + new Date().toISOString().replace(/[:.]/g, '-'),
  logFile: 'broken_hooks_fix.log'
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
    
    // Check if it has the broken pattern
    if (content.includes('initialMockanys') || content.includes('UseAcademicYearData')) {
      log(`Fixing broken hook: ${filePath}`);
      
      // Get the hook name from filename
      const fileName = path.basename(filePath, '.ts');
      const hookName = fileName.charAt(0).toLowerCase() + fileName.slice(1);
      
      // Determine the data type and mock data name from the hook name
      const dataTypeMap = {
        'useAcademicYearData': { type: 'AcademicYear', mockData: 'initialMockAcademicYears' },
        'useAcademicPeriodDefinitionData': { type: 'AcademicPeriodDefinition', mockData: 'initialMockAcademicPeriodDefinitions' },
        'useAcademicYearStructureData': { type: 'AcademicYearStructure', mockData: 'initialMockAcademicYearStructures' },
        'useSchoolPeriodData': { type: 'SchoolPeriod', mockData: 'initialMockSchoolPeriods' },
        'useSubjectData': { type: 'Subject', mockData: 'initialMockSubjects' },
        'useSubjectPaperData': { type: 'SubjectPaper', mockData: 'initialMockSubjectPapers' },
        'useExamSessionData': { type: 'ExamSession', mockData: 'initialMockExamSessions' },
        'useExamPaperSettingData': { type: 'ExamPaperSetting', mockData: 'initialMockExamPaperSettings' },
        'useGradingSchemeData': { type: 'GradingScheme', mockData: 'initialMockGradingSchemes' },
        'useGradingSchemeLevelData': { type: 'GradingSchemeLevel', mockData: 'initialMockGradingSchemeLevels' },
        'useStudentExamResultData': { type: 'StudentExamResult', mockData: 'initialMockStudentExamResults' },
        'useStudentPaperMarkData': { type: 'StudentPaperMark', mockData: 'initialMockStudentPaperMarks' },
        'useClassSubjectAllocationData': { type: 'ClassSubjectAllocation', mockData: 'initialMockClassSubjectAllocations' },
        'useTeacherSubjectAssignmentData': { type: 'TeacherSubjectAssignment', mockData: 'initialMockTeacherSubjectAssignments' },
        'useStudentSubjectEnrollmentData': { type: 'StudentSubjectEnrollment', mockData: 'initialMockStudentSubjectEnrollments' },
        'useTimetablePeriodDefData': { type: 'TimetablePeriodDef', mockData: 'initialMockTimetablePeriodDefs' },
        'useTimetableEntryData': { type: 'TimetableEntry', mockData: 'initialMockTimetableEntries' },
        'useUserData': { type: 'User', mockData: 'initialMockUsers' },
        'useRoleData': { type: 'Role', mockData: 'initialMockRoles' },
        'useDepartmentData': { type: 'Department', mockData: 'initialMockDepartments' },
        'useDesignationData': { type: 'Designation', mockData: 'initialMockDesignations' },
        'useStudentCategoryData': { type: 'StudentCategory', mockData: 'initialMockStudentCategories' },
        'useDormitoryData': { type: 'Dormitory', mockData: 'initialMockDormitories' },
        'useClassData': { type: 'Class', mockData: 'initialMockClasses' },
        'useClassStreamData': { type: 'ClassStream', mockData: 'initialMockClassStreams' },
        'useStudentData': { type: 'Student', mockData: 'initialMockStudents' },
        'useParentsGuardianData': { type: 'ParentsGuardian', mockData: 'initialMockParentsGuardians' },
        'useSchoolDetailsData': { type: 'SchoolDetails', mockData: 'initialMockSchoolDetails' },
        'useStaffData': { type: 'Staff', mockData: 'initialMockStaff' },
        'useFinancialYearData': { type: 'FinancialYear', mockData: 'initialMockFinancialYears' },
        'usePartnerData': { type: 'Partner', mockData: 'initialMockPartners' },
        'useClubData': { type: 'Club', mockData: 'initialMockClubs' },
        'useCustomerData': { type: 'Customer', mockData: 'initialMockCustomers' },
        'useStudentHealthRecordData': { type: 'StudentHealthRecord', mockData: 'initialMockStudentHealthRecords' },
        'useStudentAttendanceData': { type: 'StudentAttendance', mockData: 'initialMockStudentAttendance' },
        'useTemplateCommData': { type: 'TemplateComm', mockData: 'initialMockTemplateComms' },
        'useCampaignData': { type: 'Campaign', mockData: 'initialMockCampaigns' },
        'useBankData': { type: 'Bank', mockData: 'initialMockBanks' },
        'useChartOfAccountData': { type: 'ChartOfAccount', mockData: 'initialMockChartOfAccounts' },
        'useCustomerInvoiceData': { type: 'CustomerInvoice', mockData: 'initialMockCustomerInvoices' },
        'useCustomerInvoiceItemData': { type: 'CustomerInvoiceItem', mockData: 'initialMockCustomerInvoiceItems' },
        'useCustomerPaymentData': { type: 'CustomerPayment', mockData: 'initialMockCustomerPayments' },
        'useCustomerPaymentItemData': { type: 'CustomerPaymentItem', mockData: 'initialMockCustomerPaymentItems' },
        'useSupplierData': { type: 'Supplier', mockData: 'initialMockSuppliers' },
        'useSupplierInvoiceData': { type: 'SupplierInvoice', mockData: 'initialMockSupplierInvoices' },
        'useSupplierInvoiceItemData': { type: 'SupplierInvoiceItem', mockData: 'initialMockSupplierInvoiceItems' },
        'useSupplierPaymentData': { type: 'SupplierPayment', mockData: 'initialMockSupplierPayments' },
        'useSupplierPaymentItemData': { type: 'SupplierPaymentItem', mockData: 'initialMockSupplierPaymentItems' },
        'usePayrollItemTypeData': { type: 'PayrollItemType', mockData: 'initialMockPayrollItemTypes' },
        'usePayrollPeriodData': { type: 'PayrollPeriod', mockData: 'initialMockPayrollPeriods' },
        'useItemCategoryData': { type: 'ItemCategory', mockData: 'initialMockItemCategories' },
        'useItemData': { type: 'Item', mockData: 'initialMockItems' },
        'useItemMovementData': { type: 'ItemMovement', mockData: 'initialMockItemMovements' },
        'useFixedAssetData': { type: 'FixedAsset', mockData: 'initialMockFixedAssets' },
        'useRequisitionData': { type: 'Requisition', mockData: 'initialMockRequisitions' },
        'useBookCategoryData': { type: 'BookCategory', mockData: 'initialMockBookCategories' },
        'useBookData': { type: 'Book', mockData: 'initialMockBooks' },
        'useBookLoanData': { type: 'BookLoan', mockData: 'initialMockBookLoans' },
        'useMealPlanData': { type: 'MealPlan', mockData: 'initialMockMealPlans' },
        'useMenuData': { type: 'Menu', mockData: 'initialMockMenus' },
        'useMealConsumptionLogData': { type: 'MealConsumptionLog', mockData: 'initialMockMealConsumptionLogs' }
      };
      
      const mapping = dataTypeMap[hookName];
      if (!mapping) {
        log(`No mapping found for ${hookName}, skipping`, 'WARN');
        return false;
      }
      
      const { type: dataType, mockData: mockDataName } = mapping;
      
      // Create the new hook content
      const newContent = `// ABOUTME: Self-contained hook for ${dataType.toLowerCase()} data management
// ABOUTME: Provides CRUD operations for ${dataType.toLowerCase()} without depending on AppDataContext

import { useState, useEffect } from 'react';
import { ${mockDataName} } from '../../administration/data/mockData';
import { ${dataType} } from '../../../core/types';

export const ${hookName} = () => {
  const [data, setData] = useState<${dataType}[]>(${mockDataName});

  const create = async (newItem: Partial<${dataType}>) => {
    const newDataItem: ${dataType} = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ${dataType};
    setData((prev: ${dataType}[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<${dataType}>) => {
    setData((prev: ${dataType}[]) => prev.map((item: ${dataType}) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: ${dataType}[]) => prev.filter((item: ${dataType}) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
`;
      
      fs.writeFileSync(filePath, newContent);
      log(`Fixed: ${filePath}`);
      return true;
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
    log('Starting broken hooks fix...');
    
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
    
    log(`Fixed ${fixedCount} broken hook files`);
    log('Broken hooks fix completed successfully!');
    
  } catch (error) {
    log(`Error in main execution: ${error.message}`, 'ERROR');
    process.exit(1);
  }
};

// Run the script
main(); 