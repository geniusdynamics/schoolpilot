#!/usr/bin/env tsx
/**
 * Detect Cross-Module Imports
 * 
 * This script identifies imports that violate module independence principles.
 * It scans all module files and reports cross-module data imports.
 * 
 * Usage:
 *   npx tsx scripts/detect-cross-module-imports.ts
 *   npx tsx scripts/detect-cross-module-imports.ts --json
 * 
 * Exit codes:
 *   0 - No violations found
 *   1 - Violations found
 *   2 - Script error
 */

import { glob } from 'glob';
import { readFile } from 'fs/promises';

interface Violation {
  file: string;
  line: number;
  import: string;
  fromModule: string;
  toModule: string;
  severity: 'error' | 'warning';
}

const MODULES_PATH = 'src/modules';

async function detectViolations(): Promise<Violation[]> {
  const violations: Violation[] = [];
  
  // Find all TypeScript files in modules
  const files = await glob(`${MODULES_PATH}/**/*.ts`, {
    ignore: ['**/*.d.ts', '**/node_modules/**']
  });
  
  // Also check TSX files
  const tsxFiles = await glob(`${MODULES_PATH}/**/*.tsx`, {
    ignore: ['**/*.d.ts', '**/node_modules/**']
  });
  
  const allFiles = [...files, ...tsxFiles];
  
  for (const file of allFiles) {
    const content = await readFile(file, 'utf-8');
    const lines = content.split('\n');
    
    // Extract module name from path - handle both / and \
    const normalizedPath = file.replace(/\\/g, '/');
    const moduleMatch = normalizedPath.match(/modules\/([^/]+)/);
    if (!moduleMatch) continue;
    const fromModule = moduleMatch[1];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Skip comments
      if (line.trim().startsWith('//')) continue;
      
      // Match: from '../../moduleName/data/...'
      // This regex handles both single and double quotes
      const match = line.match(/from\s+['"]\.\.\/\.\.\/([^/]+)\/data\//);
      if (match) {
        const toModule = match[1];
        
        // Skip if importing from same module
        if (toModule === fromModule) continue;
        
        violations.push({
          file: normalizedPath,
          line: lineNumber,
          import: line.trim(),
          fromModule,
          toModule,
          severity: 'error'
        });
      }
    }
  }
  
  return violations;
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const jsonOutput = args.includes('--json');
    
    if (!jsonOutput) {
      console.log('🔍 Scanning for cross-module import violations...\n');
    }
    
    const violations = await detectViolations();
    
    if (jsonOutput) {
      console.log(JSON.stringify({ violations }, null, 2));
    } else {
      if (violations.length === 0) {
        console.log('✅ No cross-module import violations found!');
      } else {
        console.log(`❌ Found ${violations.length} cross-module import violations:\n`);
        
        // Group by source module
        const byModule: Record<string, Violation[]> = {};
        for (const v of violations) {
          byModule[v.fromModule] = byModule[v.fromModule] || [];
          byModule[v.fromModule].push(v);
        }
        
        for (const [moduleName, moduleViolations] of Object.entries(byModule)) {
          console.log(`📦 ${moduleName} (${moduleViolations.length} violations):`);
          for (const v of moduleViolations) {
            console.log(`  ${v.file}:${v.line}`);
            console.log(`    → imports from "${v.toModule}"`);
          }
          console.log('');
        }
        
        console.log('💡 To fix: Use useSharedData() hook instead of direct imports\n');
      }
    }
    
    process.exit(violations.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(2);
  }
}

main();
