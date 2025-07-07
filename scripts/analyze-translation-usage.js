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

// Function to analyze translation usage for a specific module
function analyzeModuleTranslations(modulePath, moduleName) {
  console.log(`\n🔍 Analyzing ${moduleName} module...`);
  
  const pagesDir = path.join(modulePath, 'pages');
  if (!fs.existsSync(pagesDir)) {
    console.log(`   No pages directory found`);
    return { module: moduleName, usedKeys: [] };
  }
  
  const codeFiles = findCodeFiles(pagesDir);
  const allUsedKeys = new Set();
  
  codeFiles.forEach(file => {
    const keys = extractTranslationKeys(file);
    const fileName = path.basename(file);
    
    if (keys.length > 0) {
      console.log(`   📄 ${fileName}: ${keys.length} translation keys`);
      keys.forEach(key => {
        // Only include keys that belong to this module's namespace
        if (key.startsWith(moduleName) || !key.includes(':')) {
          allUsedKeys.add(key);
          console.log(`      - ${key}`);
        }
      });
    }
  });
  
  return { module: moduleName, usedKeys: Array.from(allUsedKeys) };
}

// Main function
function analyzeAllModules() {
  const modulesPath = 'src/modules';
  
  if (!fs.existsSync(modulesPath)) {
    console.log('❌ Modules directory not found');
    return;
  }
  
  const modules = fs.readdirSync(modulesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log('🔍 Analyzing translation key usage in code...');
  
  const results = [];
  
  modules.forEach(module => {
    const modulePath = path.join(modulesPath, module);
    const result = analyzeModuleTranslations(modulePath, module);
    results.push(result);
  });
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    if (result.usedKeys.length > 0) {
      console.log(`${result.module}: ${result.usedKeys.length} keys used in code`);
    }
  });
  
  return results;
}

// Run the analysis
analyzeAllModules();