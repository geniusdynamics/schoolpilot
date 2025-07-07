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

// Analyze nutrition module specifically
const nutritionPath = 'src/modules/nutrition';
const pagesDir = path.join(nutritionPath, 'pages');

console.log('🔍 Analyzing nutrition module translation keys...\n');

if (fs.existsSync(pagesDir)) {
  const codeFiles = findCodeFiles(pagesDir);
  const allUsedKeys = new Set();
  
  codeFiles.forEach(file => {
    const keys = extractTranslationKeys(file);
    const fileName = path.basename(file);
    
    if (keys.length > 0) {
      console.log(`📄 ${fileName}:`);
      keys.forEach(key => {
        allUsedKeys.add(key);
        console.log(`   - ${key}`);
      });
      console.log('');
    }
  });
  
  console.log(`\n📊 Total unique keys used: ${allUsedKeys.size}`);
  console.log('\n🔑 All unique keys:');
  Array.from(allUsedKeys).sort().forEach(key => {
    console.log(`   ${key}`);
  });
}