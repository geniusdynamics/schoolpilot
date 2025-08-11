#!/usr/bin/env node

/**
 * Fix Remaining Imports Script
 * 
 * This script fixes all remaining import issues by checking what's actually
 * available in each module and fixing the imports accordingly.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  modulesDir: 'src/modules',
  backupDir: 'backup_remaining_imports_fix_' + new Date().toISOString().replace(/[:.]/g, '-'),
  logFile: 'remaining_imports_fix.log'
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

// Check what exports are available in a mockData file
const getAvailableExports = (mockDataPath) => {
  try {
    const content = fs.readFileSync(mockDataPath, 'utf8');
    const exportMatches = content.match(/export\s+(?:const|function|class)\s+(\w+)/g);
    if (exportMatches) {
      return exportMatches.map(match => {
        const nameMatch = match.match(/export\s+(?:const|function|class)\s+(\w+)/);
        return nameMatch ? nameMatch[1] : null;
      }).filter(Boolean);
    }
  } catch (error) {
    log(`Error reading ${mockDataPath}: ${error.message}`, 'ERROR');
  }
  return [];
};

// Fix a single hook file
const fixHookFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it has import issues
    const importMatch = content.match(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/);
    if (!importMatch) {
      return false;
    }
    
    const importedItems = importMatch[1].split(',').map(item => item.trim());
    const importPath = importMatch[2];
    
    // Check if the import path exists
    const fullImportPath = path.resolve(importPath.replace(/^\./, path.dirname(filePath)));
    if (!fs.existsSync(fullImportPath)) {
      log(`Import path does not exist: ${fullImportPath}`, 'WARN');
      return false;
    }
    
    // Get available exports from the mockData file
    const availableExports = getAvailableExports(fullImportPath);
    
    // Check which imports are missing
    const missingImports = importedItems.filter(item => !availableExports.includes(item));
    
    if (missingImports.length > 0) {
      log(`Missing imports in ${filePath}: ${missingImports.join(', ')}`, 'WARN');
      
      // Try to fix by importing from the correct module
      const fileName = path.basename(filePath, '.ts');
      const hookName = fileName.charAt(0).toLowerCase() + fileName.slice(1);
      
      // Define correct import mappings
      const importMappings = {
        'useGradingSchemeLevelData': {
          path: './mockData',
          imports: ['initialMockGradingSchemes'],
          code: `
// Flatten all levels from all grading schemes
const initialMockGradingSchemeLevels: GradingSchemeLevel[] = initialMockGradingSchemes.flatMap(s => s.levels ?? []).filter((l): l is GradingSchemeLevel => !!l);
`
        }
      };
      
      const mapping = importMappings[hookName];
      if (mapping) {
        // Replace the import
        const newImport = `import { ${mapping.imports.join(', ')} } from '${mapping.path}';`;
        const newContent = content.replace(/import\s+\{\s*[^}]+\s*\}\s+from\s+['"][^'"]+['"];/, newImport);
        
        // Add the derived data code if needed
        if (mapping.code) {
          const afterImportIndex = newContent.indexOf('import');
          const afterImportEnd = newContent.indexOf(';', afterImportIndex) + 1;
          const beforeHook = newContent.indexOf('export const');
          
          const finalContent = 
            newContent.substring(0, afterImportEnd) + 
            mapping.code + 
            newContent.substring(beforeHook);
          
          fs.writeFileSync(filePath, finalContent);
          log(`Fixed: ${filePath}`);
          return true;
        }
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
    log('Starting remaining imports fix...');
    
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
    
    log(`Fixed ${fixedCount} hook files with remaining import issues`);
    log('Remaining imports fix completed successfully!');
    
  } catch (error) {
    log(`Error in main execution: ${error.message}`, 'ERROR');
    process.exit(1);
  }
};

// Run the script
main(); 