#!/usr/bin/env tsx
/**
 * Detect Cross-Module Imports and Architectural Violations
 * 
 * This script identifies imports that violate module independence principles.
 * It scans all files and reports:
 * 1. Core importing from modules
 * 2. Importing from old context locations
 * 3. Importing from old hook locations
 * 4. Cross-module data imports within modules
 * 5. Core importing from module schemas/collections
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
  type: 'core-imports-module' | 'old-context-import' | 'old-hook-import' | 'cross-module-data' | 'core-imports-schema';
  fromModule?: string;
  toModule?: string;
  severity: 'error' | 'warning';
}

const SRC_PATH = 'src';
const MODULES_PATH = 'src/modules';
const CORE_PATH = 'src/core';

async function detectViolations(): Promise<Violation[]> {
  const violations: Violation[] = [];
  
  // Find all TypeScript files in src
  const files = await glob(`${SRC_PATH}/**/*.{ts,tsx}`, {
    ignore: ['**/*.d.ts', '**/node_modules/**', '**/dist/**']
  });
  
  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const lines = content.split('\n');
    const normalizedPath = file.replace(/\\/g, '/');
    
    // Extract module name from path if in modules directory
    const moduleMatch = normalizedPath.match(/modules\/([^/]+)/);
    const fromModule = moduleMatch ? moduleMatch[1] : null;
    const isCoreFile = normalizedPath.includes('/core/');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Skip comments
      if (line.trim().startsWith('//')) continue;
      
      // 1. Core importing from modules (ERROR) - exclude moduleRegistration.ts
      if (isCoreFile && !normalizedPath.includes('moduleRegistration.ts')) {
        const moduleImportMatch = line.match(/from\s+['"]@\/modules\/([^'"]+)/);
        if (moduleImportMatch) {
          violations.push({
            file: normalizedPath,
            line: lineNumber,
            import: line.trim(),
            type: 'core-imports-module',
            toModule: moduleImportMatch[1],
            severity: 'error'
          });
        }
      }
      
      // 2. Core importing from module schemas/collections (ERROR)
      if (isCoreFile) {
        const schemaMatch = line.match(/from\s+['"]@\/modules\/([^'"]+)\/data\/schema/);
        if (schemaMatch) {
          violations.push({
            file: normalizedPath,
            line: lineNumber,
            import: line.trim(),
            type: 'core-imports-schema',
            toModule: schemaMatch[1],
            severity: 'error'
          });
        }
        const collectionsMatch = line.match(/from\s+['"]@\/modules\/([^'"]+)\/data\/collections/);
        if (collectionsMatch) {
          violations.push({
            file: normalizedPath,
            line: lineNumber,
            import: line.trim(),
            type: 'core-imports-schema',
            toModule: collectionsMatch[1],
            severity: 'error'
          });
        }
      }
      
      // 3. Importing from old context locations (ERROR)
      const oldContextMatch = line.match(/from\s+['"]@\/contexts\/data\/([^'"]+)/);
      if (oldContextMatch) {
        violations.push({
          file: normalizedPath,
          line: lineNumber,
          import: line.trim(),
          type: 'old-context-import',
          severity: 'error'
        });
      }
      // 4. Importing from old hook locations (ERROR)
      const oldHookMatch = line.match(/from\s+['"]@\/hooks\/data\/use[FBHAI][^'"]+/);
      if (oldHookMatch) {
        violations.push({
          file: normalizedPath,
          line: lineNumber,
          import: line.trim(),
          type: 'old-hook-import',
          severity: 'error'
        });
      }
      
      // 5. Cross-module data imports within modules (ERROR)
      if (fromModule) {
        const relativeModuleMatch = line.match(/from\s+['"]\.\.\/\.\.\/([^/]+)\/data\//);
        if (relativeModuleMatch) {
          const toModule = relativeModuleMatch[1];
          
          // Skip if importing from same module
          if (toModule !== fromModule) {
            violations.push({
              file: normalizedPath,
              line: lineNumber,
              import: line.trim(),
              type: 'cross-module-data',
              fromModule,
              toModule,
              severity: 'error'
            });
          }
        }
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
