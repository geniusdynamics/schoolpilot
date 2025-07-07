import fs from 'fs';
import path from 'path';

// Function to extract translation keys from a file
function extractTranslationKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /t\(['"`]([^'"`]+)['"`]\)/g;
  const keys = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    keys.push(match[1]);
  }
  
  return keys;
}

// Function to find all TypeScript/JavaScript files in a directory
function findCodeFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
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

// Function to load translation keys from JSON files
function loadTranslationKeys(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const translations = JSON.parse(content);
    
    function flattenKeys(obj, prefix = '') {
      const keys = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          keys.push(...flattenKeys(value, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }
    
    return flattenKeys(translations);
  } catch (error) {
    return [];
  }
}

// Function to analyze a specific module
function analyzeModule(moduleName) {
  console.log(`\n🔍 Analyzing ${moduleName} module...`);
  
  const modulePath = path.join('src/modules', moduleName);
  const pagesDir = path.join(modulePath, 'pages');
  const i18nDir = path.join(modulePath, 'i18n');
  
  if (!fs.existsSync(pagesDir)) {
    console.log(`   ❌ No pages directory found`);
    return;
  }
  
  // Load translation keys
  const enTranslationFile = path.join(i18nDir, 'en.json');
  const frTranslationFile = path.join(i18nDir, 'fr.json');
  
  const availableEnKeys = loadTranslationKeys(enTranslationFile);
  const availableFrKeys = loadTranslationKeys(frTranslationFile);
  
  console.log(`   📚 Available EN keys: ${availableEnKeys.length}`);
  console.log(`   📚 Available FR keys: ${availableFrKeys.length}`);
  
  // Find used keys in code
  const codeFiles = findCodeFiles(pagesDir);
  const usedKeys = new Set();
  const hardcodedStrings = new Set();
  
  codeFiles.forEach(file => {
    const keys = extractTranslationKeys(file);
    const fileName = path.basename(file);
    
    keys.forEach(key => {
      // Check if it looks like a translation key (contains dots) or hardcoded string
      if (key.includes('.') && !key.includes(' ') && !key.includes('!') && !key.includes('?')) {
        usedKeys.add(key);
      } else {
        hardcodedStrings.add(key);
      }
    });
  });
  
  console.log(`   🔑 Used translation keys: ${usedKeys.size}`);
  console.log(`   ⚠️  Hardcoded strings: ${hardcodedStrings.size}`);
  
  // Check for missing keys
  const missingInEn = Array.from(usedKeys).filter(key => !availableEnKeys.includes(key));
  const missingInFr = Array.from(usedKeys).filter(key => !availableFrKeys.includes(key));
  
  if (missingInEn.length > 0) {
    console.log(`   ❌ Missing in EN: ${missingInEn.length} keys`);
    missingInEn.slice(0, 5).forEach(key => console.log(`      - ${key}`));
    if (missingInEn.length > 5) console.log(`      ... and ${missingInEn.length - 5} more`);
  }
  
  if (missingInFr.length > 0) {
    console.log(`   ❌ Missing in FR: ${missingInFr.length} keys`);
    missingInFr.slice(0, 5).forEach(key => console.log(`      - ${key}`));
    if (missingInFr.length > 5) console.log(`      ... and ${missingInFr.length - 5} more`);
  }
  
  if (hardcodedStrings.size > 0) {
    console.log(`   ⚠️  Hardcoded strings found:`);
    Array.from(hardcodedStrings).slice(0, 5).forEach(str => console.log(`      - "${str}"`));
    if (hardcodedStrings.size > 5) console.log(`      ... and ${hardcodedStrings.size - 5} more`);
  }
  
  return {
    module: moduleName,
    usedKeys: Array.from(usedKeys),
    hardcodedStrings: Array.from(hardcodedStrings),
    missingInEn,
    missingInFr,
    availableEnKeys: availableEnKeys.length,
    availableFrKeys: availableFrKeys.length
  };
}

// Main function
function main() {
  const modulesPath = 'src/modules';
  
  if (!fs.existsSync(modulesPath)) {
    console.log('❌ Modules directory not found');
    return;
  }
  
  const modules = fs.readdirSync(modulesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log('🔍 Analyzing translation key usage vs availability...');
  
  const results = [];
  const problemModules = ['academics', 'administration', 'inventory', 'reports'];
  
  problemModules.forEach(module => {
    if (modules.includes(module)) {
      const result = analyzeModule(module);
      if (result) results.push(result);
    }
  });
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    const issues = result.missingInEn.length + result.missingInFr.length + result.hardcodedStrings.length;
    const status = issues === 0 ? '✅' : '⚠️';
    console.log(`${status} ${result.module}: ${issues} issues (${result.hardcodedStrings.length} hardcoded, ${result.missingInEn.length} missing EN, ${result.missingInFr.length} missing FR)`);
  });
}

main();