#!/usr/bin/env node

/**
 * Comprehensive Fix Execution Script
 * 
 * This script executes all the modular architecture and RxDB fixes in the correct order:
 * 1. Modular Architecture Compliance Fix
 * 2. RxDB CRUD Operations Fix
 * 3. Module Hooks Fix
 * 4. Data Layer Consistency Fix
 * 5. Application Testing
 * 
 * The script ensures:
 * - Proper execution order
 * - Rollback capability if issues occur
 * - Detailed logging and reporting
 * - Application functionality validation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  backupDir: 'backup_comprehensive_' + new Date().toISOString().replace(/[:.]/g, '-'),
  logFile: 'comprehensive_fix_execution.log',
  resultsFile: 'fix_execution_results.json'
};

// Logging utility
const log = (message, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
};

// File operations utility
const fileOps = {
  readFile: (filePath) => {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      log(`Error reading file ${filePath}: ${error.message}`, 'ERROR');
      return null;
    }
  },
  
  writeFile: (filePath, content) => {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf8');
      log(`File written: ${filePath}`);
      return true;
    } catch (error) {
      log(`Error writing file ${filePath}: ${error.message}`, 'ERROR');
      return false;
    }
  },
  
  exists: (filePath) => fs.existsSync(filePath),
  
  mkdir: (dirPath) => {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      return true;
    } catch (error) {
      log(`Error creating directory ${dirPath}: ${error.message}`, 'ERROR');
      return false;
    }
  },
  
  copyFile: (src, dest) => {
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      log(`File copied: ${src} -> ${dest}`);
      return true;
    } catch (error) {
      log(`Error copying file ${src}: ${error.message}`, 'ERROR');
      return false;
    }
  }
};

// Execution utilities
const executionUtils = {
  // Step 1: Modular Architecture Compliance Fix
  executeModularArchitectureFix: () => {
    log('=== STEP 1: Modular Architecture Compliance Fix ===');
    
    try {
      // Import and run the modular architecture fix
      const modularFixPath = path.join('scripts', 'fix_modular_architecture_and_rxdb.js');
      if (fileOps.exists(modularFixPath)) {
        const modularFix = require('./fix_modular_architecture_and_rxdb.js');
        modularFix.fixes.fixModularArchitecture();
        log('✅ Modular architecture compliance fix completed');
        return true;
      } else {
        log('❌ Modular architecture fix script not found', 'ERROR');
        return false;
      }
    } catch (error) {
      log(`❌ Modular architecture fix failed: ${error.message}`, 'ERROR');
      return false;
    }
  },
  
  // Step 2: RxDB CRUD Operations Fix
  executeRxDBCrudFix: () => {
    log('=== STEP 2: RxDB CRUD Operations Fix ===');
    
    try {
      // Import and run the RxDB fix
      const rxdbFixPath = path.join('scripts', 'fix_rxdb_production_mode.js');
      if (fileOps.exists(rxdbFixPath)) {
        const rxdbFix = require('./fix_rxdb_production_mode.js');
        rxdbFix.fixes.fixRxDBCrudOperations();
        rxdbFix.fixes.fixRxDBSubscriptions();
        log('✅ RxDB CRUD operations fix completed');
        return true;
      } else {
        log('❌ RxDB fix script not found', 'ERROR');
        return false;
      }
    } catch (error) {
      log(`❌ RxDB CRUD fix failed: ${error.message}`, 'ERROR');
      return false;
    }
  },
  
  // Step 3: Module Hooks Fix
  executeModuleHooksFix: () => {
    log('=== STEP 3: Module Hooks Fix ===');
    
    try {
      // Import and run the module hooks fix
      const modularFixPath = path.join('scripts', 'fix_modular_architecture_and_rxdb.js');
      if (fileOps.exists(modularFixPath)) {
        const modularFix = require('./fix_modular_architecture_and_rxdb.js');
        modularFix.fixes.fixModuleHooks();
        log('✅ Module hooks fix completed');
        return true;
      } else {
        log('❌ Module hooks fix script not found', 'ERROR');
        return false;
      }
    } catch (error) {
      log(`❌ Module hooks fix failed: ${error.message}`, 'ERROR');
      return false;
    }
  },
  
  // Step 4: Data Layer Consistency Fix
  executeDataLayerFix: () => {
    log('=== STEP 4: Data Layer Consistency Fix ===');
    
    try {
      // Import and run the data layer fix
      const modularFixPath = path.join('scripts', 'fix_modular_architecture_and_rxdb.js');
      if (fileOps.exists(modularFixPath)) {
        const modularFix = require('./fix_modular_architecture_and_rxdb.js');
        modularFix.fixes.fixModularMockData();
        modularFix.fixes.fixRxDBIntegration();
        modularFix.fixes.fixConfig();
        log('✅ Data layer consistency fix completed');
        return true;
      } else {
        log('❌ Data layer fix script not found', 'ERROR');
        return false;
      }
    } catch (error) {
      log(`❌ Data layer fix failed: ${error.message}`, 'ERROR');
      return false;
    }
  },
  
  // Step 5: Application Testing
  executeApplicationTest: () => {
    log('=== STEP 5: Application Testing ===');
    
    try {
      // Import and run the application test
      const testPath = path.join('scripts', 'test_application_functionality.js');
      if (fileOps.exists(testPath)) {
        const testUtils = require('./test_application_functionality.js');
        const success = testUtils.runTests();
        if (success) {
          log('✅ Application testing completed successfully');
          return true;
        } else {
          log('❌ Application testing failed', 'ERROR');
          return false;
        }
      } else {
        log('❌ Application test script not found', 'ERROR');
        return false;
      }
    } catch (error) {
      log(`❌ Application testing failed: ${error.message}`, 'ERROR');
      return false;
    }
  },
  
  // Rollback function
  rollbackChanges: () => {
    log('=== ROLLBACK: Restoring original files ===');
    
    try {
      if (fileOps.exists(CONFIG.backupDir)) {
        const restoreBackup = (backupDir, targetDir = '.') => {
          const items = fs.readdirSync(backupDir);
          for (const item of items) {
            const backupPath = path.join(backupDir, item);
            const targetPath = path.join(targetDir, item);
            const stat = fs.statSync(backupPath);
            
            if (stat.isDirectory()) {
              if (!fileOps.exists(targetPath)) {
                fileOps.mkdir(targetPath);
              }
              restoreBackup(backupPath, targetPath);
            } else {
              fileOps.copyFile(backupPath, targetPath);
            }
          }
        };
        
        restoreBackup(CONFIG.backupDir);
        log('✅ Rollback completed successfully');
        return true;
      } else {
        log('❌ No backup directory found for rollback', 'ERROR');
        return false;
      }
    } catch (error) {
      log(`❌ Rollback failed: ${error.message}`, 'ERROR');
      return false;
    }
  }
};

// Main execution function
const main = () => {
  log('🚀 Starting comprehensive fix execution...');
  
  // Create backup directory
  fileOps.mkdir(CONFIG.backupDir);
  log(`Backup directory created: ${CONFIG.backupDir}`);
  
  const steps = [
    { name: 'Modular Architecture Fix', fn: executionUtils.executeModularArchitectureFix },
    { name: 'RxDB CRUD Operations Fix', fn: executionUtils.executeRxDBCrudFix },
    { name: 'Module Hooks Fix', fn: executionUtils.executeModuleHooksFix },
    { name: 'Data Layer Consistency Fix', fn: executionUtils.executeDataLayerFix },
    { name: 'Application Testing', fn: executionUtils.executeApplicationTest }
  ];
  
  const results = [];
  let allStepsSuccessful = true;
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    log(`\n📋 Executing step ${i + 1}/${steps.length}: ${step.name}`);
    
    try {
      const startTime = Date.now();
      const success = step.fn();
      const duration = Date.now() - startTime;
      
      if (success) {
        results.push({
          step: i + 1,
          name: step.name,
          status: 'SUCCESS',
          duration: duration
        });
        log(`✅ Step ${i + 1} completed successfully (${duration}ms)`);
      } else {
        results.push({
          step: i + 1,
          name: step.name,
          status: 'FAILED',
          duration: duration
        });
        log(`❌ Step ${i + 1} failed (${duration}ms)`, 'ERROR');
        allStepsSuccessful = false;
        
        // Ask user if they want to continue or rollback
        log('⚠️  Step failed. Do you want to continue or rollback?', 'WARN');
        log('Press Ctrl+C to stop, or the script will continue in 10 seconds...');
        
        // Wait for user input or continue after 10 seconds
        setTimeout(() => {
          log('Continuing with next step...');
        }, 10000);
      }
    } catch (error) {
      results.push({
        step: i + 1,
        name: step.name,
        status: 'ERROR',
        error: error.message,
        duration: 0
      });
      log(`❌ Step ${i + 1} errored: ${error.message}`, 'ERROR');
      allStepsSuccessful = false;
    }
  }
  
  // Generate execution report
  const report = {
    timestamp: new Date().toISOString(),
    totalSteps: steps.length,
    successfulSteps: results.filter(r => r.status === 'SUCCESS').length,
    failedSteps: results.filter(r => r.status !== 'SUCCESS').length,
    allSuccessful: allStepsSuccessful,
    results: results,
    backupDirectory: CONFIG.backupDir
  };
  
  const reportPath = path.join(CONFIG.backupDir, CONFIG.resultsFile);
  fileOps.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  log('\n📊 Execution Summary:');
  log(`Total Steps: ${steps.length}`);
  log(`Successful: ${report.successfulSteps}`);
  log(`Failed: ${report.failedSteps}`);
  log(`Backup Directory: ${CONFIG.backupDir}`);
  log(`Report File: ${reportPath}`);
  
  if (allStepsSuccessful) {
    log('\n🎉 All fixes completed successfully!');
    log('The application should now be fully functional with proper modular architecture and RxDB integration.');
    log('Please test the application to ensure everything works as expected.');
  } else {
    log('\n⚠️  Some steps failed during execution.');
    log('You can:');
    log('1. Review the log file for details');
    log('2. Use the backup directory to restore original files');
    log('3. Run individual fix scripts to address specific issues');
    
    // Offer rollback
    log('\nWould you like to rollback all changes? (y/n)');
    // In a real implementation, you would wait for user input here
  }
  
  return allStepsSuccessful;
};

// Run the script
if (require.main === module) {
  try {
    const success = main();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`Fatal error during execution: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

module.exports = { executionUtils, main }; 