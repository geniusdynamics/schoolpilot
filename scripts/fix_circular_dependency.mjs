#!/usr/bin/env node

/**
 * Fix Circular Dependency Script
 * 
 * This script fixes circular dependencies in module hooks by making them self-contained
 * instead of depending on AppDataContext.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  modulesDir: 'src/modules',
  backupDir: 'backup_circular_fix_' + new Date().toISOString().replace(/[:.]/g, '-'),
  logFile: 'circular_fix.log'
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
    
    // Check if it imports from AppDataContext
    if (content.includes('useAppData') || content.includes('AppDataContext')) {
      log(`Fixing circular dependency in: ${filePath}`);
      
      // Get the hook name from filename
      const fileName = path.basename(filePath, '.ts');
      const hookName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
      
      // Determine the data type from the hook name
      const dataTypeMap = {
        'useAcademicYearData': 'AcademicYear',
        'useAcademicPeriodDefinitionData': 'AcademicPeriodDefinition',
        'useAcademicYearStructureData': 'AcademicYearStructure',
        'useSchoolPeriodData': 'SchoolPeriod',
        'useSubjectData': 'Subject',
        'useSubjectPaperData': 'SubjectPaper',
        'useExamSessionData': 'ExamSession',
        'useExamPaperSettingData': 'ExamPaperSetting',
        'useGradingSchemeData': 'GradingScheme',
        'useGradingSchemeLevelData': 'GradingSchemeLevel',
        'useStudentExamResultData': 'StudentExamResult',
        'useStudentPaperMarkData': 'StudentPaperMark',
        'useClassSubjectAllocationData': 'ClassSubjectAllocation',
        'useTeacherSubjectAssignmentData': 'TeacherSubjectAssignment',
        'useStudentSubjectEnrollmentData': 'StudentSubjectEnrollment',
        'useTimetablePeriodDefData': 'TimetablePeriodDef',
        'useTimetableEntryData': 'TimetableEntry',
        'useUserData': 'User',
        'useRoleData': 'Role',
        'useDepartmentData': 'Department',
        'useDesignationData': 'Designation',
        'useStudentCategoryData': 'StudentCategory',
        'useDormitoryData': 'Dormitory',
        'useClassData': 'Class',
        'useClassStreamData': 'ClassStream',
        'useStudentData': 'Student',
        'useParentsGuardianData': 'ParentsGuardian',
        'useSchoolDetailsData': 'SchoolDetails',
        'useStaffData': 'Staff',
        'useFinancialYearData': 'FinancialYear',
        'usePartnerData': 'Partner',
        'useClubData': 'Club',
        'useCustomerData': 'Customer',
        'useStudentHealthRecordData': 'StudentHealthRecord',
        'useStudentAttendanceData': 'StudentAttendance',
        'useTemplateCommData': 'TemplateComm',
        'useCampaignData': 'Campaign',
        'useBankData': 'Bank',
        'useChartOfAccountData': 'ChartOfAccount',
        'useCustomerInvoiceData': 'CustomerInvoice',
        'useCustomerInvoiceItemData': 'CustomerInvoiceItem',
        'useCustomerPaymentData': 'CustomerPayment',
        'useCustomerPaymentItemData': 'CustomerPaymentItem',
        'useSupplierData': 'Supplier',
        'useSupplierInvoiceData': 'SupplierInvoice',
        'useSupplierInvoiceItemData': 'SupplierInvoiceItem',
        'useSupplierPaymentData': 'SupplierPayment',
        'useSupplierPaymentItemData': 'SupplierPaymentItem',
        'usePayrollItemTypeData': 'PayrollItemType',
        'usePayrollPeriodData': 'PayrollPeriod',
        'useItemCategoryData': 'ItemCategory',
        'useItemData': 'Item',
        'useItemMovementData': 'ItemMovement',
        'useFixedAssetData': 'FixedAsset',
        'useRequisitionData': 'Requisition',
        'useBookCategoryData': 'BookCategory',
        'useBookData': 'Book',
        'useBookLoanData': 'BookLoan',
        'useMealPlanData': 'MealPlan',
        'useMenuData': 'Menu',
        'useMealConsumptionLogData': 'MealConsumptionLog'
      };
      
      const dataType = dataTypeMap[hookName] || 'any';
      const mockDataName = `initialMock${dataType.replace(/([A-Z])/g, '$1').replace(/^./, str => str.toLowerCase())}s`;
      
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
    log('Starting circular dependency fix...');
    
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
    
    log(`Fixed ${fixedCount} hook files with circular dependencies`);
    log('Circular dependency fix completed successfully!');
    
  } catch (error) {
    log(`Error in main execution: ${error.message}`, 'ERROR');
    process.exit(1);
  }
};

// Run the script
main(); 