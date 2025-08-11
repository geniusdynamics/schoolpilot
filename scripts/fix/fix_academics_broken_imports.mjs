#!/usr/bin/env node

/**
 * Fix Academics Broken Imports Script
 *
 * Scans all hooks in src/modules/academics/data/, checks if imported mock data exists in mockData.ts,
 * and if not, defines it locally in the hook file if it can be derived. Otherwise, logs a warning.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOOKS_DIR = 'src/modules/academics/data';
const MOCKDATA_PATH = path.join(HOOKS_DIR, 'mockData.ts');
const LOG_FILE = 'fix_academics_broken_imports.log';

const log = (msg, type = 'INFO') => {
  const line = `[${new Date().toISOString()}] [${type}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
};

// Read all exports from mockData.ts
const getMockDataExports = () => {
  const content = fs.readFileSync(MOCKDATA_PATH, 'utf8');
  const matches = content.matchAll(/export\s+const\s+(\w+)/g);
  return Array.from(matches).map(m => m[1]);
};

// Known derived mock data
const derivedMockData = {
  'initialMockGradingSchemeLevels': {
    import: 'initialMockGradingSchemes',
    code: `// Flatten all levels from all grading schemes\nconst initialMockGradingSchemeLevels: GradingSchemeLevel[] = initialMockGradingSchemes.flatMap(s => s.levels ?? []).filter((l): l is GradingSchemeLevel => !!l);`
  }
  // Add more derived mock data here if needed
};

const main = () => {
  log('Starting fix for academics broken imports...');
  const mockDataExports = getMockDataExports();
  const files = fs.readdirSync(HOOKS_DIR).filter(f => f.startsWith('use') && f.endsWith('Data.ts'));
  let fixedCount = 0;
  for (const file of files) {
    const filePath = path.join(HOOKS_DIR, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const importMatch = content.match(/import \{ ([^}]+) \} from '\.\/mockData';/);
    if (!importMatch) continue;
    const imported = importMatch[1].trim();
    if (mockDataExports.includes(imported)) continue; // All good
    if (derivedMockData[imported]) {
      // Remove the broken import
      content = content.replace(/import \{ [^}]+ \} from '\.\/mockData';\n/, `import { ${derivedMockData[imported].import} } from './mockData';\n`);
      // Insert the derived code after imports
      const importEnd = content.indexOf(';', content.indexOf('from')) + 1;
      content = content.slice(0, importEnd) + '\n' + derivedMockData[imported].code + '\n' + content.slice(importEnd + 1);
      fs.writeFileSync(filePath, content);
      log(`Fixed derived import in ${file}`);
      fixedCount++;
    } else {
      log(`Missing mock data for ${imported} in ${file}`, 'WARN');
    }
  }
  log(`Fixed ${fixedCount} broken imports.`);
  log('Done.');
};

main(); 