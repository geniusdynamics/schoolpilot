import fs from 'fs';
import path from 'path';

// Common hardcoded strings and their suggested translation keys
const commonReplacements = {
  // Validation messages
  '"Class Stream, Subject, and Academic Year are required."': 'validation.classStreamSubjectAcademicYearRequired',
  '"This subject is already allocated to this class stream for the selected academic year."': 'validation.subjectAlreadyAllocated',
  '"Name, Structure, and a valid positive Sequence Order are required."': 'validation.nameStructureSequenceRequired',
  '"Structure name is required."': 'validation.structureNameRequired',
  '"All fields are required."': 'validation.allFieldsRequired',
  '"End date must be after start date."': 'validation.endDateAfterStartDate',
  '"Please select a class first to manage its streams."': 'validation.selectClassFirst',
  '"Item and Asset Tag are required."': 'validation.itemAssetTagRequired',
  '"Category name is required."': 'validation.categoryNameRequired',
  '"Item Name, Unit of Measure, and Item Type are required."': 'validation.itemNameUnitTypeRequired',
  '"Supplier, Order Date, and Status are required."': 'validation.supplierOrderDateStatusRequired',
  '"Please select a GL Account."': 'validation.selectGLAccount',
  '"No data to export."': 'messages.noDataToExport',
  '"CSV Export to be implemented"': 'messages.csvExportToBeDeveloped',
  
  // Common actions
  '"common:cancel"': 'common.cancel',
  '"common:save"': 'common.save',
  
  // Status messages
  '"Print functionality to be implemented."': 'messages.printToBeDeveloped',
  '"Export to CSV functionality to be implemented."': 'messages.exportToBeDeveloped',
  '"Update workflow functionality not yet implemented"': 'messages.updateWorkflowToBeDeveloped',
  '"Add workflow functionality not yet implemented"': 'messages.addWorkflowToBeDeveloped',
  '"Workflow state management not yet implemented"': 'messages.workflowStateToBeDeveloped',
  '"Delete workflow functionality not yet implemented"': 'messages.deleteWorkflowToBeDeveloped',
  '"Delete workflow state functionality not yet implemented"': 'messages.deleteWorkflowStateToBeDeveloped',
  
  // Single character strings (likely errors)
  '"T"': 'common.true',
  '"a"': 'common.active',
};

// Function to find all TypeScript/JavaScript files in a directory
function findCodeFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      
      if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
        traverse(fullPath);
      } else if (item.isFile() && /\.(tsx?|jsx?)$/.test(item.name)) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Function to replace hardcoded strings in a file
function replaceHardcodedStrings(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let replacements = 0;
  
  // Replace hardcoded strings with translation keys
  for (const [hardcoded, translationKey] of Object.entries(commonReplacements)) {
    const regex = new RegExp(hardcoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const replacement = `t('${translationKey}')`;
    
    if (content.includes(hardcoded)) {
      content = content.replace(regex, replacement);
      replacements++;
    }
  }
  
  // Also look for alert() calls with hardcoded strings and replace with proper error handling
  const alertRegex = /alert\(([^)]+)\)/g;
  content = content.replace(alertRegex, (match, alertContent) => {
    // If it's already a translation call, leave it alone
    if (alertContent.includes("t('") || alertContent.includes('t("')) {
      return match;
    }
    
    // If it's a simple string, convert to translation
    if (alertContent.startsWith('"') && alertContent.endsWith('"')) {
      const stringContent = alertContent.slice(1, -1);
      const translationKey = generateTranslationKey(stringContent);
      replacements++;
      return `alert(t('${translationKey}'))`;
    }
    
    return match;
  });
  
  if (replacements > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return replacements;
}

// Function to generate a translation key from a string
function generateTranslationKey(str) {
  // Convert string to camelCase translation key
  let key = str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
    .split(' ')
    .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  // Add appropriate prefix based on content
  if (str.includes('required') || str.includes('must') || str.includes('select')) {
    return `validation.${key}`;
  } else if (str.includes('implemented') || str.includes('to be')) {
    return `messages.${key}`;
  } else {
    return `messages.${key}`;
  }
}

// Function to add missing translation keys to translation files
function addTranslationKeys(moduleName, keys) {
  const i18nDir = path.join('src/modules', moduleName, 'i18n');
  const enFile = path.join(i18nDir, 'en.json');
  const frFile = path.join(i18nDir, 'fr.json');
  
  if (!fs.existsSync(enFile) || !fs.existsSync(frFile)) {
    return;
  }
  
  let enTranslations = JSON.parse(fs.readFileSync(enFile, 'utf8'));
  let frTranslations = JSON.parse(fs.readFileSync(frFile, 'utf8'));
  
  // Add missing keys
  keys.forEach(({ key, value }) => {
    const parts = key.split('.');
    let enCurrent = enTranslations;
    let frCurrent = frTranslations;
    
    // Create nested structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!enCurrent[part]) enCurrent[part] = {};
      if (!frCurrent[part]) frCurrent[part] = {};
      enCurrent = enCurrent[part];
      frCurrent = frCurrent[part];
    }
    
    const lastPart = parts[parts.length - 1];
    if (!enCurrent[lastPart]) {
      enCurrent[lastPart] = value;
      frCurrent[lastPart] = value; // Use English as placeholder for French
    }
  });
  
  fs.writeFileSync(enFile, JSON.stringify(enTranslations, null, 2), 'utf8');
  fs.writeFileSync(frFile, JSON.stringify(frTranslations, null, 2), 'utf8');
}

// Function to fix a specific module
function fixModule(moduleName) {
  console.log(`\n🔧 Fixing hardcoded strings in ${moduleName} module...`);
  
  const modulePath = path.join('src/modules', moduleName);
  const pagesDir = path.join(modulePath, 'pages');
  
  if (!fs.existsSync(pagesDir)) {
    console.log(`   ❌ No pages directory found`);
    return;
  }
  
  const codeFiles = findCodeFiles(pagesDir);
  let totalReplacements = 0;
  const newTranslationKeys = [];
  
  codeFiles.forEach(file => {
    const replacements = replaceHardcodedStrings(file);
    totalReplacements += replacements;
    
    if (replacements > 0) {
      console.log(`   📝 ${path.basename(file)}: ${replacements} replacements`);
    }
  });
  
  // Add translation keys for common replacements
  Object.entries(commonReplacements).forEach(([hardcoded, translationKey]) => {
    const value = hardcoded.slice(1, -1); // Remove quotes
    newTranslationKeys.push({ key: translationKey, value });
  });
  
  if (newTranslationKeys.length > 0) {
    addTranslationKeys(moduleName, newTranslationKeys);
  }
  
  console.log(`   ✅ Total replacements: ${totalReplacements}`);
  
  return {
    module: moduleName,
    replacements: totalReplacements
  };
}

// Main function
function main() {
  console.log('🔧 Fixing hardcoded strings in translation files...');
  
  const problemModules = ['academics', 'administration', 'inventory', 'reports'];
  const results = [];
  
  problemModules.forEach(module => {
    const result = fixModule(module);
    if (result) results.push(result);
  });
  
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    console.log(`✅ ${result.module}: ${result.replacements} hardcoded strings replaced`);
  });
  
  console.log('\n🎉 Hardcoded strings have been replaced with translation keys!');
  console.log('💡 Note: Please review the changes and test the application.');
}

main();