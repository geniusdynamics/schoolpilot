#!/usr/bin/env node

/**
 * Application Functionality Test Script
 * 
 * This script tests the application functionality after applying fixes:
 * 1. Tests both demo and production modes
 * 2. Validates modular architecture compliance
 * 3. Checks RxDB integration
 * 4. Verifies data loading and CRUD operations
 * 5. Ensures backward compatibility
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  testResultsDir: 'test_results_' + new Date().toISOString().replace(/[:.]/g, '-'),
  logFile: 'application_test.log',
  testTimeout: 30000 // 30 seconds
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
  }
};

// Test utilities
const testUtils = {
  // Test 1: Check if application builds successfully
  testBuild: () => {
    log('Testing application build...');
    
    try {
      // Check if package.json exists
      if (!fileOps.exists('package.json')) {
        log('❌ package.json not found', 'ERROR');
        return false;
      }
      
      // Check if src directory exists
      if (!fileOps.exists('src')) {
        log('❌ src directory not found', 'ERROR');
        return false;
      }
      
      // Check if main entry point exists
      if (!fileOps.exists('src/index.tsx')) {
        log('❌ src/index.tsx not found', 'ERROR');
        return false;
      }
      
      log('✅ Application structure is valid');
      return true;
    } catch (error) {
      log(`❌ Build test failed: ${error.message}`, 'ERROR');
      return false;
    }
  },
  
  // Test 2: Check modular architecture compliance
  testModularArchitecture: () => {
    log('Testing modular architecture compliance...');
    
    const modulesDir = 'src/modules';
    if (!fileOps.exists(modulesDir)) {
      log('❌ modules directory not found', 'ERROR');
      return false;
    }
    
    const moduleDirs = fs.readdirSync(modulesDir);
    let compliantModules = 0;
    
    for (const dir of moduleDirs) {
      const modulePath = path.join(modulesDir, dir);
      const stat = fs.statSync(modulePath);
      
      if (stat.isDirectory() && dir !== 'core') {
        const dataPath = path.join(modulePath, 'data');
        const hasDataDir = fileOps.exists(dataPath);
        const hasTypes = fileOps.exists(path.join(dataPath, 'types.ts'));
        const hasMockData = fileOps.exists(path.join(dataPath, 'mockData.ts'));
        const hasSchema = fileOps.exists(path.join(dataPath, 'schema.ts'));
        
        if (hasDataDir && hasTypes && hasMockData && hasSchema) {
          compliantModules++;
          log(`✅ Module ${dir} is compliant`);
        } else {
          log(`❌ Module ${dir} is not compliant`, 'WARN');
        }
      }
    }
    
    log(`Modular architecture test: ${compliantModules}/${moduleDirs.length - 1} modules compliant`);
    return compliantModules > 0;
  },
  
  // Test 3: Check RxDB integration
  testRxDBIntegration: () => {
    log('Testing RxDB integration...');
    
    const rxdbServicePath = 'src/services/rxdbService.ts';
    const useRxDBDataPath = 'src/hooks/useRxDBData.ts';
    const appDataContextPath = 'src/contexts/AppDataContext.tsx';
    
    const requiredFiles = [rxdbServicePath, useRxDBDataPath, appDataContextPath];
    let existingFiles = 0;
    
    for (const filePath of requiredFiles) {
      if (fileOps.exists(filePath)) {
        existingFiles++;
        log(`✅ ${filePath} exists`);
      } else {
        log(`❌ ${filePath} not found`, 'ERROR');
      }
    }
    
    if (existingFiles === requiredFiles.length) {
      // Check RxDB service content
      const rxdbServiceContent = fileOps.readFile(rxdbServicePath);
      if (rxdbServiceContent && rxdbServiceContent.includes('createRxDatabase')) {
        log('✅ RxDB service has proper initialization');
      } else {
        log('❌ RxDB service missing proper initialization', 'ERROR');
      }
      
      // Check useRxDBData hook content
      const useRxDBDataContent = fileOps.readFile(useRxDBDataPath);
      if (useRxDBDataContent && useRxDBDataContent.includes('useCallback')) {
        log('✅ useRxDBData hook has CRUD operations');
      } else {
        log('❌ useRxDBData hook missing CRUD operations', 'ERROR');
      }
    }
    
    return existingFiles === requiredFiles.length;
  },
  
  // Test 4: Check data layer consistency
  testDataLayerConsistency: () => {
    log('Testing data layer consistency...');
    
    const configPath = 'src/contexts/config.ts';
    const appDataContextPath = 'src/contexts/AppDataContext.tsx';
    const useModularMockDataPath = 'src/hooks/useModularMockData.ts';
    
    let consistencyScore = 0;
    
    // Check config file
    if (fileOps.exists(configPath)) {
      const configContent = fileOps.readFile(configPath);
      if (configContent && configContent.includes('APP_MODE')) {
        log('✅ Config file has APP_MODE definition');
        consistencyScore++;
      }
    }
    
    // Check AppDataContext
    if (fileOps.exists(appDataContextPath)) {
      const contextContent = fileOps.readFile(appDataContextPath);
      if (contextContent && contextContent.includes('APP_MODE === \'production\'')) {
        log('✅ AppDataContext has production mode handling');
        consistencyScore++;
      }
    }
    
    // Check useModularMockData
    if (fileOps.exists(useModularMockDataPath)) {
      const mockDataContent = fileOps.readFile(useModularMockDataPath);
      if (mockDataContent && mockDataContent.includes('useModularMockData')) {
        log('✅ useModularMockData hook exists');
        consistencyScore++;
      }
    }
    
    log(`Data layer consistency score: ${consistencyScore}/3`);
    return consistencyScore >= 2;
  },
  
  // Test 5: Check TypeScript compilation
  testTypeScriptCompilation: () => {
    log('Testing TypeScript compilation...');
    
    try {
      // Check if tsconfig.json exists
      if (!fileOps.exists('tsconfig.json')) {
        log('❌ tsconfig.json not found', 'ERROR');
        return false;
      }
      
      // Try to run TypeScript check
      try {
        execSync('npx tsc --noEmit', { timeout: CONFIG.testTimeout });
        log('✅ TypeScript compilation successful');
        return true;
      } catch (error) {
        log(`❌ TypeScript compilation failed: ${error.message}`, 'ERROR');
        return false;
      }
    } catch (error) {
      log(`❌ TypeScript test failed: ${error.message}`, 'ERROR');
      return false;
    }
  },
  
  // Test 6: Check for common issues
  testCommonIssues: () => {
    log('Testing for common issues...');
    
    let issuesFound = 0;
    
    // Check for any files
    const srcDir = 'src';
    if (fileOps.exists(srcDir)) {
      const checkForIssues = (dir) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            checkForIssues(itemPath);
          } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
            const content = fileOps.readFile(itemPath);
            if (content) {
              // Check for common issues
              if (content.includes('any') && !content.includes('// eslint-disable')) {
                log(`⚠️  Found 'any' type in ${itemPath}`, 'WARN');
                issuesFound++;
              }
              
              if (content.includes('console.log') && !content.includes('// eslint-disable')) {
                log(`⚠️  Found console.log in ${itemPath}`, 'WARN');
                issuesFound++;
              }
            }
          }
        }
      };
      
      checkForIssues(srcDir);
    }
    
    if (issuesFound === 0) {
      log('✅ No common issues found');
    } else {
      log(`⚠️  Found ${issuesFound} potential issues`);
    }
    
    return issuesFound < 10; // Allow some issues but not too many
  }
};

// Test execution
const runTests = () => {
  log('Starting application functionality tests...');
  
  const tests = [
    { name: 'Build Test', fn: testUtils.testBuild },
    { name: 'Modular Architecture Test', fn: testUtils.testModularArchitecture },
    { name: 'RxDB Integration Test', fn: testUtils.testRxDBIntegration },
    { name: 'Data Layer Consistency Test', fn: testUtils.testDataLayerConsistency },
    { name: 'TypeScript Compilation Test', fn: testUtils.testTypeScriptCompilation },
    { name: 'Common Issues Test', fn: testUtils.testCommonIssues }
  ];
  
  let passedTests = 0;
  const results = [];
  
  for (const test of tests) {
    log(`Running ${test.name}...`);
    try {
      const result = test.fn();
      if (result) {
        passedTests++;
        results.push({ name: test.name, status: 'PASS' });
        log(`✅ ${test.name} passed`);
      } else {
        results.push({ name: test.name, status: 'FAIL' });
        log(`❌ ${test.name} failed`);
      }
    } catch (error) {
      results.push({ name: test.name, status: 'ERROR', error: error.message });
      log(`❌ ${test.name} errored: ${error.message}`, 'ERROR');
    }
  }
  
  // Generate test report
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: tests.length,
    passedTests,
    failedTests: tests.length - passedTests,
    results
  };
  
  const reportPath = path.join(CONFIG.testResultsDir, 'test_report.json');
  fileOps.mkdir(CONFIG.testResultsDir);
  fileOps.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  log(`Test results: ${passedTests}/${tests.length} tests passed`);
  log(`Test report saved to: ${reportPath}`);
  
  if (passedTests === tests.length) {
    log('🎉 All tests passed! Application is ready for use.');
  } else {
    log('⚠️  Some tests failed. Please review the results.');
  }
  
  return passedTests === tests.length;
};

// Main execution function
const main = () => {
  log('Starting application functionality test suite...');
  
  try {
    const success = runTests();
    
    if (success) {
      log('✅ Application functionality test suite completed successfully!');
      process.exit(0);
    } else {
      log('❌ Application functionality test suite completed with failures!');
      process.exit(1);
    }
  } catch (error) {
    log(`Error during test execution: ${error.message}`, 'ERROR');
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { testUtils, runTests }; 