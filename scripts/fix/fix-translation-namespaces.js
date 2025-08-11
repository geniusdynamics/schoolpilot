#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Module to namespace mapping
const moduleNamespaces = {
  'academics': 'academics',
  'administration': 'administration',
  'finance': 'finance',
  'hr': 'hr',
  'inventory': 'inventory',
  'library': 'library',
  'nutrition': 'nutrition',
  'reports': 'reports',
  'settings': 'settings',
  'dashboard': 'dashboard'
};

function findCodeFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function fixNamespaceInFile(filePath, namespace) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file uses useTranslation() without namespace
  const useTranslationRegex = /const\s+{\s*t\s*}\s*=\s*useTranslation\(\s*\);/g;
  
  if (useTranslationRegex.test(content)) {
    console.log(`   🔧 Fixing namespace in: ${path.relative(process.cwd(), filePath)}`);
    
    const fixedContent = content.replace(
      useTranslationRegex,
      `const { t } = useTranslation('${namespace}');`
    );
    
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    return true;
  }
  
  return false;
}

function fixModule(moduleName) {
  const moduleDir = `src/modules/${moduleName}`;
  const namespace = moduleNamespaces[moduleName];
  
  if (!fs.existsSync(moduleDir)) {
    console.log(`⚠️  Module directory not found: ${moduleDir}`);
    return;
  }
  
  console.log(`🔧 Fixing ${moduleName} module namespace issues...`);
  
  const files = findCodeFiles(moduleDir);
  let fixedCount = 0;
  
  for (const file of files) {
    if (fixNamespaceInFile(file, namespace)) {
      fixedCount++;
    }
  }
  
  console.log(`   ✅ Fixed ${fixedCount} files in ${moduleName} module`);
}

function main() {
  console.log('🔧 Fixing useTranslation namespace issues across all modules...\n');
  
  let totalFixed = 0;
  
  for (const moduleName of Object.keys(moduleNamespaces)) {
    fixModule(moduleName);
    totalFixed++;
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('==================================================');
  console.log(`✅ Processed ${totalFixed} modules`);
  console.log('🎉 All useTranslation hooks now use correct namespaces!');
  console.log('\n💡 Note: You may need to restart your development server for changes to take effect.');
}

main();