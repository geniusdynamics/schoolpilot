// Node.js script to update useAppData imports
const fs = require('fs');
const path = require('path');

function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Pattern 1: Simple useAppData import from @/contexts/AppDataContext
    if (content.includes("import { useAppData } from '@/contexts/AppDataContext'")) {
      content = content.replace(
        /import \{ useAppData \} from '@\/contexts\/AppDataContext';/g,
        "import { useAppData } from '@/hooks/useAppData';"
      );
      updated = true;
    }
    
    // Pattern 2: Relative path imports
    if (content.includes("import { useAppData } from '../contexts/AppDataContext'")) {
      content = content.replace(
        /import \{ useAppData \} from '\.\.\/contexts\/AppDataContext';/g,
        "import { useAppData } from '../hooks/useAppData';"
      );
      updated = true;
    }
    
    // Pattern 3: Deep relative path imports
    if (content.includes("import { useAppData } from '../../../contexts/AppDataContext'")) {
      content = content.replace(
        /import \{ useAppData \} from '\.\.\/\.\.\/\.\.\/contexts\/AppDataContext';/g,
        "import { useAppData } from '../../../hooks/useAppData';"
      );
      updated = true;
    }
    
    // Pattern 4: useAppDataInternal imports
    if (content.includes("import { useAppDataInternal } from '../contexts/AppDataContext'")) {
      content = content.replace(
        /import \{ useAppDataInternal \} from '\.\.\/contexts\/AppDataContext';/g,
        "import { useAppDataInternal } from '../hooks/useAppData';"
      );
      updated = true;
    }
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      // Skip the AppDataContext.tsx file itself
      if (!file.includes('AppDataContext.tsx')) {
        updateImportsInFile(fullPath);
      }
    }
  }
}

const srcDir = path.join(__dirname, 'src');
console.log('Starting import updates...');
walkDirectory(srcDir);
console.log('Import updates completed!');