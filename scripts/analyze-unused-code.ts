#!/usr/bin/env tsx
/**
 * Comprehensive Code Analysis Script
 * 
 * Analyzes the codebase for:
 * 1. Unused imports - Import statements that are declared but never referenced
 * 2. Unused types - Type definitions, interfaces, classes, or type aliases that are not used
 * 3. Incorrect imports - Imports that reference non-existent files/functions/modules
 * 
 * Usage:
 *   npx tsx scripts/analyze-unused-code.ts
 *   npx tsx scripts/analyze-unused-code.ts --report <format>
 * 
 * Report formats: json, markdown, console (default)
 */

import { glob } from 'glob';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { dirname, join } from 'path';

interface AnalysisResult {
  file: string;
  line: number;
  column?: number;
  type: 'unused-import' | 'unused-type' | 'incorrect-import' | 'incorrect-path';
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  suggestion?: string;
}

interface ImportInfo {
  importStatement: string;
  importedModule: string;
  importedNames: string[];
  line: number;
  column: number;
}

const SRC_PATH = 'src';
const EXCLUDED_PATTERNS = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/__tests__/**',
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
];

async function analyzeCodebase(): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];
  
  console.log('🔍 Scanning for unused imports, types, and incorrect imports...\n');
  
  // Find all TypeScript files
  const files = await glob(`${SRC_PATH}/**/*.{ts,tsx}`, {
    ignore: EXCLUDED_PATTERNS
  });
  
  console.log(`Found ${files.length} TypeScript files to analyze\n`);
  
  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n');
      const normalizedPath = file.replace(/\\/g, '/');
      
      // Analyze imports
      const imports = extractImports(lines);
      
      // Check for unused imports
      const unusedImports = await checkUnusedImports(lines, imports, normalizedPath);
      results.push(...unusedImports);
      
      // Check for incorrect imports
      const incorrectImports = await checkIncorrectImports(lines, imports, normalizedPath);
      results.push(...incorrectImports);
      
      // Check for unused types (basic pattern matching)
      const unusedTypes = checkUnusedTypes(lines, normalizedPath);
      results.push(...unusedTypes);
      
    } catch (error) {
      console.error(`Error analyzing ${file}:`, error);
    }
  }
  
  return results;
}

function extractImports(lines: string[]): ImportInfo[] {
  const imports: ImportInfo[] = [];
  let importBuffer: string[] = [];
  let importStartLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip comments and empty lines
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || line === '') {
      continue;
    }
    
    // Check if this is an import line
    if (line.startsWith('import ') || (importBuffer.length > 0 && line.includes('from '))) {
      importBuffer.push(line);
      
      if (importStartLine === 0) {
        importStartLine = i + 1;
      }
      
      // Check if this is the end of the import statement
      if (line.includes(';') || line.includes('}')) {
        const importStatement = importBuffer.join(' ');
        const importInfo = parseImportStatement(importStatement, importStartLine);
        if (importInfo) {
          imports.push(importInfo);
        }
        importBuffer = [];
        importStartLine = 0;
      }
    } else if (importBuffer.length > 0) {
      // Continue building multi-line import
      importBuffer.push(line);
      if (line.includes(';') || line.includes('}')) {
        const importStatement = importBuffer.join(' ');
        const importInfo = parseImportStatement(importStatement, importStartLine);
        if (importInfo) {
          imports.push(importInfo);
        }
        importBuffer = [];
        importStartLine = 0;
      }
    }
  }
  
  return imports;
}

function parseImportStatement(statement: string, line: number): ImportInfo | null {
  try {
    // Match import patterns
    const patterns = [
      /import\s+(?:\*\s+as\s+(\w+)|\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/,
      /import\s+['"]([^'"]+)['"]/,
    ];
    
    for (const pattern of patterns) {
      const match = statement.match(pattern);
      if (match) {
        const importedModule = match[4] || match[1];
        let importedNames: string[] = [];
        
        if (match[2]) {
          // Named imports: import { a, b } from 'module'
          importedNames = match[2].split(',').map(n => n.trim().split(' as ')[0].trim());
        } else if (match[1]) {
          // Namespace import: import * as name from 'module'
          importedNames = [match[1]];
        } else if (match[3]) {
          // Default import: import Name from 'module'
          importedNames = [match[3]];
        }
        
        return {
          importStatement: statement,
          importedModule,
          importedNames,
          line,
          column: 1
        };
      }
    }
  } catch (error) {
    console.error('Error parsing import statement:', statement, error);
  }
  
  return null;
}

async function checkUnusedImports(
  lines: string[],
  imports: ImportInfo[],
  filePath: string
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];
  const content = lines.join('\n');
  
  for (const importInfo of imports) {
    // Skip type-only imports (they're removed at compile time)
    if (importInfo.importStatement.includes('import type ')) {
      continue;
    }
    
    // Check if any imported name is used in the file
    let isUsed = false;
    
    for (const importedName of importInfo.importedNames) {
      if (importedName === '*' || importedName === 'default') {
        // For namespace or default imports, check the module path usage
        const moduleName = importInfo.importedModule.replace(/['"]/g, '');
        const regex = new RegExp(`\\b${moduleName}\\b`, 'g');
        if (regex.test(content)) {
          isUsed = true;
          break;
        }
      } else {
        // For named imports, check if the name is used
        const regex = new RegExp(`\\b${importedName}\\b`, 'g');
        if (regex.test(content)) {
          isUsed = true;
          break;
        }
      }
    }
    
    if (!isUsed) {
      results.push({
        file: filePath,
        line: importInfo.line,
        type: 'unused-import',
        severity: 'warning',
        message: `Import "${importInfo.importedNames.join(', ')}" from "${importInfo.importedModule}" is not used`,
        code: importInfo.importStatement,
        suggestion: `Remove this import statement or use the imported items`
      });
    }
  }
  
  return results;
}

async function checkIncorrectImports(
  _lines: string[],
  imports: ImportInfo[],
  filePath: string
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];
  const fileDir = dirname(filePath);
  
  for (const importInfo of imports) {
    const importedModule = importInfo.importedModule.replace(/['"]/g, '');
    
    // Skip node_modules and external packages
    if (importedModule.startsWith('.') || importedModule.startsWith('@/')) {
      let resolvedPath: string;
      
      if (importedModule.startsWith('@/')) {
        // Resolve @/ alias
        resolvedPath = importedModule.replace('@/', 'src/');
      } else {
        // Resolve relative path
        resolvedPath = join(fileDir, importedModule);
      }
      
      // Normalize path
      resolvedPath = resolvedPath.replace(/\\/g, '/');
      
      // Check if the file exists
      const fileExists = await checkFileExists(resolvedPath);
      
      if (!fileExists) {
        // Try common extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
        let found = false;
        
        for (const ext of extensions) {
          if (await checkFileExists(resolvedPath + ext)) {
            found = true;
            break;
          }
        }
        
        if (!found) {
          results.push({
            file: filePath,
            line: importInfo.line,
            type: 'incorrect-import',
            severity: 'error',
            message: `Import path "${importedModule}" does not exist`,
            code: importInfo.importStatement,
            suggestion: `Check the import path or ensure the file exists`
          });
        }
      }
    }
  }
  
  return results;
}

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function checkUnusedTypes(lines: string[], filePath: string): AnalysisResult[] {
  const results: AnalysisResult[] = [];
  const content = lines.join('\n');
  
  // Pattern for type definitions
  const typePatterns = [
    /export\s+(?:type|interface|class|enum)\s+(\w+)/g,
    /type\s+(\w+)\s*=/g,
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const pattern of typePatterns) {
      const match = line.match(pattern);
      if (match) {
        // Extract type name
        const typeNameMatch = line.match(/(?:type|interface|class|enum)\s+(\w+)/);
        if (typeNameMatch) {
          const typeName = typeNameMatch[1];
          
          // Check if this type is used elsewhere in the file
          // Look for usage patterns: type extends, implements, variable declarations, etc.
          const usagePatterns = [
            new RegExp(`\\bextends\\s+${typeName}\\b`),
            new RegExp(`\\bimplements\\s+${typeName}\\b`),
            new RegExp(`:\\s*${typeName}\\b`),
            new RegExp(`:\\s*${typeName}\\[`),
            new RegExp(`\\b${typeName}\\s*<`),
            new RegExp(`\\b${typeName}\\s*\\|`),
            new RegExp(`\\|\\s*${typeName}\\b`),
            new RegExp(`\\b${typeName}\\s*&`),
            new RegExp(`&\\s*${typeName}\\b`),
          ];
          
          let isUsed = false;
          for (const usagePattern of usagePatterns) {
            if (usagePattern.test(content)) {
              isUsed = true;
              break;
            }
          }
          
          // Also check for function return types and parameter types
          const functionPattern = new RegExp(`\\)\\s*:\\s*${typeName}\\b`);
          if (functionPattern.test(content)) {
            isUsed = true;
          }
          
          if (!isUsed) {
            // Check if it's a commonly exported type that might be used elsewhere
            // For now, we'll flag it as a potential unused type
            results.push({
              file: filePath,
              line: i + 1,
              type: 'unused-type',
              severity: 'info',
              message: `Type "${typeName}" may not be used in this file`,
              code: line.trim(),
              suggestion: `Check if this type is exported and used in other files, or remove if unused`
            });
          }
        }
      }
    }
  }
  
  return results;
}

function formatResults(results: AnalysisResult[], format: string): string {
  if (format === 'json') {
    return JSON.stringify({ results }, null, 2);
  }
  
  if (format === 'markdown') {
    let markdown = '# Code Analysis Report\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    
    const byType: Record<string, AnalysisResult[]> = {};
    for (const result of results) {
      if (!byType[result.type]) {
        byType[result.type] = [];
      }
      byType[result.type].push(result);
    }
    
    for (const [type, typeResults] of Object.entries(byType)) {
      markdown += `## ${type.replace('-', ' ').toUpperCase()}\n`;
      markdown += `**Count:** ${typeResults.length}\n\n`;
      
      for (const result of typeResults) {
        markdown += `### ${result.severity.toUpperCase()}: ${result.message}\n`;
        markdown += `- **File:** ${result.file}\n`;
        markdown += `- **Line:** ${result.line}\n`;
        markdown += `- **Code:** \`${result.code}\`\n`;
        if (result.suggestion) {
          markdown += `- **Suggestion:** ${result.suggestion}\n`;
        }
        markdown += '\n';
      }
    }
    
    return markdown;
  }
  
  // Console format
  let output = '';
  
  const byType: Record<string, AnalysisResult[]> = {};
  for (const result of results) {
    if (!byType[result.type]) {
      byType[result.type] = [];
    }
    byType[result.type].push(result);
  }
  
  for (const [type, typeResults] of Object.entries(byType)) {
    const severityColors = {
      error: '\x1b[31m',
      warning: '\x1b[33m',
      info: '\x1b[36m',
    };
    
    output += `\n${severityColors.warning}${type.toUpperCase()}: ${typeResults.length} found\x1b[0m\n`;
    output += `${'='.repeat(60)}\n`;
    
    for (const result of typeResults.slice(0, 50)) { // Limit output
      const color = severityColors[result.severity] || '\x1b[0m';
      output += `${color}[${result.severity.toUpperCase()}]\x1b[0m ${result.file}:${result.line}\n`;
      output += `  ${result.message}\n`;
      if (result.suggestion) {
        output += `  💡 ${result.suggestion}\n`;
      }
      output += '\n';
    }
    
    if (typeResults.length > 50) {
      output += `  ... and ${typeResults.length - 50} more\n\n`;
    }
  }
  
  return output;
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const reportFormat = args.includes('--report') ? args[args.indexOf('--report') + 1] : 'console';
    
    const results = await analyzeCodebase();
    
    console.log('\n' + '='.repeat(60));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total issues found: ${results.length}`);
    
    // Group by severity
    const errors = results.filter(r => r.severity === 'error').length;
    const warnings = results.filter(r => r.severity === 'warning').length;
    const infos = results.filter(r => r.severity === 'info').length;
    
    console.log(`  Errors: ${errors}`);
    console.log(`  Warnings: ${warnings}`);
    console.log(`  Info: ${infos}`);
    
    // Output report
    const report = formatResults(results, reportFormat);
    
    if (reportFormat === 'json') {
      console.log(report);
    } else if (reportFormat === 'markdown') {
      // Write to file
      const fs = await import('fs');
      await fs.promises.writeFile('code-analysis-report.md', report);
      console.log('\nReport saved to: code-analysis-report.md');
    } else {
      console.log(report);
    }
    
    // Exit with appropriate code
    process.exit(errors > 0 ? 1 : warnings > 0 ? 2 : 0);
    
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(3);
  }
}

main();
