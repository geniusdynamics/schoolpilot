import fs from 'fs';
import path from 'path';

// Function to recursively get all keys from a nested object
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys = keys.concat(getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  return keys;
}

// Function to check translation completeness for a module
function checkModuleTranslations(modulePath, moduleName) {
  const enPath = path.join(modulePath, 'i18n', 'en.json');
  const frPath = path.join(modulePath, 'i18n', 'fr.json');
  
  if (!fs.existsSync(enPath) || !fs.existsSync(frPath)) {
    console.log(`❌ ${moduleName}: Missing translation files`);
    return { module: moduleName, status: 'missing_files', issues: [] };
  }

  try {
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const frContent = JSON.parse(fs.readFileSync(frPath, 'utf8'));
    
    const enKeys = getAllKeys(enContent);
    const frKeys = getAllKeys(frContent);
    
    const missingInFrench = enKeys.filter(key => !frKeys.includes(key));
    const extraInFrench = frKeys.filter(key => !enKeys.includes(key));
    
    const issues = [];
    if (missingInFrench.length > 0) {
      issues.push(`Missing in French: ${missingInFrench.join(', ')}`);
    }
    if (extraInFrench.length > 0) {
      issues.push(`Extra in French: ${extraInFrench.join(', ')}`);
    }
    
    const status = issues.length === 0 ? 'complete' : 'incomplete';
    const statusIcon = status === 'complete' ? '✅' : '⚠️';
    
    console.log(`${statusIcon} ${moduleName}: ${enKeys.length} keys total`);
    if (issues.length > 0) {
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    return {
      module: moduleName,
      status,
      totalKeys: enKeys.length,
      missingInFrench: missingInFrench.length,
      extraInFrench: extraInFrench.length,
      issues
    };
  } catch (error) {
    console.log(`❌ ${moduleName}: Error parsing JSON files - ${error.message}`);
    return { module: moduleName, status: 'error', issues: [error.message] };
  }
}

// Main function to check all modules
function checkAllTranslations() {
  const modulesPath = 'src/modules';
  const results = [];
  
  console.log('🔍 Checking translation completeness across all modules...\n');
  
  if (!fs.existsSync(modulesPath)) {
    console.log('❌ Modules directory not found');
    return;
  }
  
  const modules = fs.readdirSync(modulesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  modules.forEach(module => {
    const modulePath = path.join(modulesPath, module);
    const result = checkModuleTranslations(modulePath, module);
    results.push(result);
  });
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(50));
  
  const complete = results.filter(r => r.status === 'complete');
  const incomplete = results.filter(r => r.status === 'incomplete');
  const errors = results.filter(r => r.status === 'error');
  const missing = results.filter(r => r.status === 'missing_files');
  
  console.log(`✅ Complete modules: ${complete.length}`);
  console.log(`⚠️  Incomplete modules: ${incomplete.length}`);
  console.log(`❌ Error modules: ${errors.length}`);
  console.log(`📁 Missing files: ${missing.length}`);
  
  if (incomplete.length > 0) {
    console.log('\n⚠️  MODULES WITH MISSING TRANSLATIONS:');
    incomplete.forEach(result => {
      console.log(`   ${result.module}: ${result.missingInFrench} missing keys`);
    });
  }
  
  if (errors.length > 0) {
    console.log('\n❌ MODULES WITH ERRORS:');
    errors.forEach(result => {
      console.log(`   ${result.module}: ${result.issues.join(', ')}`);
    });
  }
  
  if (missing.length > 0) {
    console.log('\n📁 MODULES WITH MISSING FILES:');
    missing.forEach(result => {
      console.log(`   ${result.module}`);
    });
  }
  
  return results;
}

// Run the check
checkAllTranslations();