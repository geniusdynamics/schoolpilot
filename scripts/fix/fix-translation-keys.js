import fs from 'fs';
import path from 'path';

// Function to extract translation keys from a file
function extractTranslationKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /t\(['"`]([^'"`]+)['"`]\)/g;
  const keys = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    // Only include keys that look like proper translation keys (contain dots, no spaces/punctuation)
    if (match[1].includes('.') && !match[1].includes(' ') && !match[1].includes('!') && !match[1].includes('?')) {
      keys.push(match[1]);
    }
  }
  
  return [...new Set(keys)]; // Remove duplicates
}

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

// Function to generate missing translation keys with reasonable default values
function generateMissingKeys(keys) {
  const translations = {};
  
  keys.forEach(key => {
    const parts = key.split('.');
    let current = translations;
    
    // Build nested structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      } else if (typeof current[part] !== 'object' || Array.isArray(current[part])) {
        // If the current value is not an object, we need to convert it
        console.log(`   ⚠️  Converting non-object value at ${parts.slice(0, i + 1).join('.')} to object`);
        current[part] = {};
      }
      current = current[part];
    }
    
    const lastPart = parts[parts.length - 1];
    
    // Only add if the key doesn't already exist
    if (!current.hasOwnProperty(lastPart)) {
      // Generate reasonable default values based on key names
      let defaultValue = lastPart;
      
      // Convert camelCase to readable text
      defaultValue = defaultValue.replace(/([A-Z])/g, ' $1').trim();
      defaultValue = defaultValue.charAt(0).toUpperCase() + defaultValue.slice(1);
      
      // Handle common patterns
      if (lastPart.includes('Title')) defaultValue = defaultValue.replace(' Title', '');
      if (lastPart.includes('Label')) defaultValue = defaultValue.replace(' Label', '');
      if (lastPart.includes('Button')) defaultValue = defaultValue.replace(' Button', '');
      if (lastPart.includes('Description')) defaultValue = 'Manage and configure ' + parts[0];
      if (lastPart === 'cancel') defaultValue = 'Cancel';
      if (lastPart === 'save') defaultValue = 'Save';
      if (lastPart === 'saveChanges') defaultValue = 'Save Changes';
      if (lastPart === 'addButton') defaultValue = 'Add';
      if (lastPart === 'editButton') defaultValue = 'Edit';
      if (lastPart === 'deleteButton') defaultValue = 'Delete';
      if (lastPart.includes('Placeholder')) defaultValue = 'Enter ' + defaultValue.replace(' Placeholder', '').toLowerCase();
      if (lastPart.includes('Option')) defaultValue = 'Select ' + defaultValue.replace(' Option', '').toLowerCase();
      
      current[lastPart] = defaultValue;
    }
  });
  
  return translations;
}

// Function to merge translations while preserving existing structure
function mergeTranslations(existing, newKeys) {
  const result = JSON.parse(JSON.stringify(existing)); // Deep clone
  
  function merge(target, source) {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (!target[key]) {
          target[key] = {};
        } else if (typeof target[key] !== 'object' || Array.isArray(target[key])) {
          // Convert non-object to object
          console.log(`   ⚠️  Converting existing non-object value at ${key} to object`);
          target[key] = {};
        }
        merge(target[key], value);
      } else {
        if (!target.hasOwnProperty(key)) { // Only add if key doesn't exist
          target[key] = value;
        }
      }
    }
  }
  
  merge(result, newKeys);
  return result;
}

// Function to fix a specific module
function fixModule(moduleName) {
  console.log(`\n🔧 Fixing ${moduleName} module...`);
  
  const modulePath = path.join('src/modules', moduleName);
  const pagesDir = path.join(modulePath, 'pages');
  const i18nDir = path.join(modulePath, 'i18n');
  
  if (!fs.existsSync(pagesDir)) {
    console.log(`   ❌ No pages directory found`);
    return;
  }
  
  // Find all used translation keys in code
  const codeFiles = findCodeFiles(pagesDir);
  const usedKeys = new Set();
  
  codeFiles.forEach(file => {
    const keys = extractTranslationKeys(file);
    keys.forEach(key => usedKeys.add(key));
  });
  
  console.log(`   🔑 Found ${usedKeys.size} translation keys used in code`);
  
  // Load existing translations
  const enFile = path.join(i18nDir, 'en.json');
  const frFile = path.join(i18nDir, 'fr.json');
  
  let existingEn = {};
  let existingFr = {};
  
  try {
    existingEn = JSON.parse(fs.readFileSync(enFile, 'utf8'));
  } catch (error) {
    console.log(`   ⚠️  Could not load existing EN translations`);
  }
  
  try {
    existingFr = JSON.parse(fs.readFileSync(frFile, 'utf8'));
  } catch (error) {
    console.log(`   ⚠️  Could not load existing FR translations`);
  }
  
  // Generate missing keys
  const missingKeys = generateMissingKeys(Array.from(usedKeys));
  
  // Merge with existing translations
  const updatedEn = mergeTranslations(existingEn, missingKeys);
  const updatedFr = mergeTranslations(existingFr, missingKeys);
  
  // Write updated files
  fs.writeFileSync(enFile, JSON.stringify(updatedEn, null, 2), 'utf8');
  fs.writeFileSync(frFile, JSON.stringify(updatedFr, null, 2), 'utf8');
  
  console.log(`   ✅ Updated translation files with missing keys`);
  
  return {
    module: moduleName,
    totalKeys: usedKeys.size
  };
}

// Main function
function main() {
  console.log('🔧 Fixing translation files to match code usage...');
  
  const problemModules = ['academics', 'administration', 'inventory', 'reports'];
  const results = [];
  
  problemModules.forEach(module => {
    const result = fixModule(module);
    if (result) results.push(result);
  });
  
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    console.log(`✅ ${result.module}: Updated translation files for ${result.totalKeys} total translation keys`);
  });
  
  console.log('\n🎉 Translation files have been updated!');
  console.log('💡 Note: French translations are currently copies of English. You may want to translate them properly.');
}

main();