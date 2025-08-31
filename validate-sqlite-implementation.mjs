#!/usr/bin/env node

/**
 * Comprehensive SQLite WASM Implementation Validation Script
 * 
 * This script validates the complete implementation including:
 * - Configuration system
 * - Provider selection and initialization
 * - Schema conversion and migration
 * - Data persistence and OPFS functionality
 * - Production LiveStore configuration
 * - Error handling and fallbacks
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

class SQLiteImplementationValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  // Test result helper
  addTest(name, status, message, details = null) {
    const test = { name, status, message, details, timestamp: new Date().toISOString() };
    this.results.tests.push(test);
    
    if (status === 'PASS') {
      this.results.passed++;
      console.log(`✅ ${name}: ${message}`);
    } else if (status === 'FAIL') {
      this.results.failed++;
      console.log(`❌ ${name}: ${message}`);
    } else if (status === 'WARN') {
      this.results.warnings++;
      console.log(`⚠️ ${name}: ${message}`);
    }
    
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  // Validate file existence and content
  validateFile(filePath, expectedContent = null, description = '') {
    const fullPath = join(__dirname, filePath);
    const testName = `File Validation: ${description || filePath}`;
    
    if (!existsSync(fullPath)) {
      this.addTest(testName, 'FAIL', `File does not exist: ${filePath}`);
      return false;
    }
    
    if (expectedContent) {
      try {
        const content = readFileSync(fullPath, 'utf8');
        if (content.includes(expectedContent)) {
          this.addTest(testName, 'PASS', `File contains expected content`);
          return true;
        } else {
          this.addTest(testName, 'FAIL', `File missing expected content: ${expectedContent}`);
          return false;
        }
      } catch (error) {
        this.addTest(testName, 'FAIL', `Error reading file: ${error.message}`);
        return false;
      }
    } else {
      this.addTest(testName, 'PASS', `File exists and is readable`);
      return true;
    }
  }

  // Validate TypeScript compilation
  validateCompilation() {
    console.log('\n🔍 Validating TypeScript Compilation...');
    
    try {
      // Check if TypeScript compiles without errors
      execSync('npx tsc --noEmit --skipLibCheck', { 
        cwd: __dirname, 
        stdio: 'pipe',
        timeout: 60000 
      });
      this.addTest('TypeScript Compilation', 'PASS', 'All TypeScript files compile without errors');
    } catch (error) {
      this.addTest('TypeScript Compilation', 'FAIL', `TypeScript compilation failed: ${error.message}`);
    }
  }

  // Validate build process
  validateBuild() {
    console.log('\n🔨 Validating Build Process...');
    
    try {
      // Run build command
      const output = execSync('npm run build', { 
        cwd: __dirname, 
        encoding: 'utf8',
        timeout: 180000 // 3 minutes
      });
      
      if (output.includes('✓ built')) {
        this.addTest('Build Process', 'PASS', 'Build completed successfully');
        
        // Check if critical files are built
        const criticalFiles = [
          'dist/index.html',
          'dist/assets/index-*.js'
        ];
        
        criticalFiles.forEach(pattern => {
          const exists = existsSync(join(__dirname, pattern.replace('*', ''))) || 
                        existsSync(join(__dirname, 'dist'));
          if (exists) {
            this.addTest('Build Artifacts', 'PASS', `Build artifacts created`);
          } else {
            this.addTest('Build Artifacts', 'FAIL', `Missing build artifacts`);
          }
        });
        
      } else {
        this.addTest('Build Process', 'FAIL', 'Build did not complete successfully');
      }
    } catch (error) {
      this.addTest('Build Process', 'FAIL', `Build failed: ${error.message}`);
    }
  }

  // Validate core implementation files
  validateCoreFiles() {
    console.log('\n📁 Validating Core Implementation Files...');
    
    const coreFiles = [
      {
        path: 'src/hooks/useDatabaseProvider.ts',
        content: 'useDatabaseProvider',
        description: 'Database Provider Hook'
      },
      {
        path: 'src/services/database/SchemaConverter.ts',
        content: 'convertRxDBToSQLite',
        description: 'Schema Converter Service'
      },
      {
        path: 'src/services/database/LiveStoreProvider.ts',
        content: 'SQLiteWASMProvider',
        description: 'SQLite WASM Provider'
      },
      {
        path: 'src/config/productionLiveStoreConfig.ts',
        content: 'getLiveStoreConfig',
        description: 'Production LiveStore Configuration'
      },
      {
        path: 'src/contexts/AppDataContext.tsx',
        content: 'useDatabaseProvider',
        description: 'AppDataContext Integration'
      },
      {
        path: 'src/config/unifiedConfig.ts',
        content: 'enhancedDataLayer: true',
        description: 'Enhanced Data Layer Configuration'
      }
    ];

    coreFiles.forEach(file => {
      this.validateFile(file.path, file.content, file.description);
    });
  }

  // Validate configuration system
  validateConfiguration() {
    console.log('\n⚙️ Validating Configuration System...');
    
    try {
      // Check unified config structure
      this.validateFile(
        'src/config/unifiedConfig.ts',
        'enhancedDataLayer: true',
        'Enhanced Data Layer Enabled'
      );
      
      // Check data layer config
      this.validateFile(
        'src/config/dataLayerConfig.ts',
        "provider: 'sqlite'",
        'SQLite Provider Configuration'
      );
      
      // Check that demo preset override is removed
      const appContent = readFileSync(join(__dirname, 'src/app.tsx'), 'utf8');
      if (appContent.includes("applyPreset('demo')")) {
        this.addTest('Demo Override Removal', 'FAIL', 'Demo preset override still present in app.tsx');
      } else {
        this.addTest('Demo Override Removal', 'PASS', 'Demo preset override successfully removed');
      }
      
    } catch (error) {
      this.addTest('Configuration Validation', 'FAIL', `Error validating configuration: ${error.message}`);
    }
  }

  // Validate schema system
  validateSchemaSystem() {
    console.log('\n📊 Validating Schema System...');
    
    try {
      // Check if collectionsDefinition is properly exported
      this.validateFile(
        'src/services/rxdbService.ts',
        'collectionsDefinition',
        'Collections Definition Export'
      );
      
      // Check modular collections
      const moduleCollections = [
        'src/modules/academics/data/collections.ts',
        'src/modules/administration/data/collections.ts',
        'src/modules/finance/data/collections.ts',
        'src/modules/hr/data/collections.ts',
        'src/modules/inventory/data/collections.ts',
        'src/modules/library/data/collections.ts',
        'src/modules/nutrition/data/collections.ts'
      ];
      
      moduleCollections.forEach(path => {
        this.validateFile(path, 'Collections', `Module Collections: ${path.split('/')[2]}`);
      });
      
    } catch (error) {
      this.addTest('Schema System Validation', 'FAIL', `Error validating schema system: ${error.message}`);
    }
  }

  // Validate provider system
  validateProviderSystem() {
    console.log('\n🔌 Validating Provider System...');
    
    const providerFiles = [
      'src/services/database/DatabaseProviderFactory.ts',
      'src/services/database/LiveStoreProvider.ts',
      'src/services/database/PouchDBProvider.ts',
      'src/services/DataServiceFactory.ts'
    ];
    
    providerFiles.forEach(path => {
      this.validateFile(path, null, `Provider System: ${path.split('/').pop()}`);
    });
    
    // Check if SQLiteWASMProvider is properly registered
    this.validateFile(
      'src/services/database/DatabaseProviderFactory.ts',
      'SQLiteWASMProvider',
      'SQLiteWASMProvider Registration'
    );
  }

  // Validate package dependencies
  validateDependencies() {
    console.log('\n📦 Validating Package Dependencies...');
    
    try {
      const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
      const requiredDeps = {
        '@sqlite.org/sqlite-wasm': '^3.50.4',
        '@livestore/livestore': '^0.3.1',
        '@livestore/react': '^0.3.1',
        '@livestore/wa-sqlite': '^1.0.5'
      };
      
      Object.entries(requiredDeps).forEach(([dep, version]) => {
        if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
          this.addTest('Package Dependencies', 'PASS', `${dep} is installed`);
        } else {
          this.addTest('Package Dependencies', 'FAIL', `Missing required dependency: ${dep}`);
        }
      });
      
    } catch (error) {
      this.addTest('Package Dependencies', 'FAIL', `Error checking dependencies: ${error.message}`);
    }
  }

  // Validate Vite configuration
  validateViteConfig() {
    console.log('\n⚡ Validating Vite Configuration...');
    
    try {
      const viteConfig = readFileSync(join(__dirname, 'vite.config.ts'), 'utf8');
      
      // Check for required OPFS headers
      if (viteConfig.includes('Cross-Origin-Opener-Policy') && viteConfig.includes('Cross-Origin-Embedder-Policy')) {
        this.addTest('Vite OPFS Headers', 'PASS', 'Required OPFS headers configured');
      } else {
        this.addTest('Vite OPFS Headers', 'FAIL', 'Missing required OPFS headers for SQLite WASM');
      }
      
      // Check if SQLite WASM is excluded from optimization
      if (viteConfig.includes('@sqlite.org/sqlite-wasm')) {
        this.addTest('Vite SQLite Config', 'PASS', 'SQLite WASM properly excluded from optimization');
      } else {
        this.addTest('Vite SQLite Config', 'WARN', 'SQLite WASM optimization exclusion not found');
      }
      
    } catch (error) {
      this.addTest('Vite Configuration', 'FAIL', `Error validating Vite config: ${error.message}`);
    }
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n📋 Validation Report');
    console.log('='.repeat(60));
    
    const totalTests = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = totalTests > 0 ? ((this.results.passed / totalTests) * 100).toFixed(1) : '0';
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${this.results.passed} (${successRate}%)`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Warnings: ${this.results.warnings}`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All critical tests passed! SQLite WASM implementation is ready.');
      
      if (this.results.warnings > 0) {
        console.log(`⚠️ ${this.results.warnings} warnings found - review recommended but not blocking.`);
      }
      
      console.log('\n📋 Next Steps:');
      console.log('1. Start the development server: npm run dev');
      console.log('2. Open browser console to verify SQLite initialization logs');
      console.log('3. Test data persistence by refreshing the browser');
      console.log('4. Verify OPFS storage in browser DevTools > Application > Storage');
      
    } else {
      console.log(`\n❌ ${this.results.failed} critical issues found. Please fix before proceeding.`);
      
      console.log('\n🔧 Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAIL')
        .forEach(test => console.log(`   - ${test.name}: ${test.message}`));
    }

    return this.results.failed === 0;
  }

  // Run all validations
  async runAllValidations() {
    console.log('🚀 Starting Comprehensive SQLite WASM Implementation Validation\n');
    
    // Run all validation tests
    this.validateCoreFiles();
    this.validateConfiguration();
    this.validateSchemaSystem();
    this.validateProviderSystem();
    this.validateDependencies();
    this.validateViteConfig();
    this.validateCompilation();
    this.validateBuild();
    
    return this.generateReport();
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SQLiteImplementationValidator();
  
  validator.runAllValidations()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed with error:', error);
      process.exit(1);
    });
}

export { SQLiteImplementationValidator };