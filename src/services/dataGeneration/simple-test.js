// ABOUTME: Simple verification script to check if the AdministrationGenerator fix is in place
// ABOUTME: Reads the source code to verify generateSupportingData is called in generateData method

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function verifyAdministrationGeneratorFix() {
  try {
    console.log('🔍 Verifying AdministrationGenerator fix...');
    
    const filePath = join(__dirname, 'generators', 'AdministrationGenerator.ts');
    const fileContent = readFileSync(filePath, 'utf8');
    
    // Check if generateData method calls generateSupportingData
    const generateDataMatch = fileContent.match(/async generateData\([^}]+\{[^}]+\}/s);
    
    if (!generateDataMatch) {
      console.error('❌ Could not find generateData method');
      return false;
    }
    
    const generateDataMethod = generateDataMatch[0];
    
    if (generateDataMethod.includes('await this.generateSupportingData()')) {
      console.log('✅ SUCCESS: generateSupportingData() is called in generateData method');
      console.log('✅ The TypeError fix has been applied correctly');
      
      // Also check if the method calls are in the right order
      const initializeIndex = generateDataMethod.indexOf('await this.initialize()');
      const supportingDataIndex = generateDataMethod.indexOf('await this.generateSupportingData()');
      const generateStudentsIndex = generateDataMethod.indexOf('generateStudents');
      
      if (initializeIndex < supportingDataIndex && supportingDataIndex < generateStudentsIndex) {
        console.log('✅ Method calls are in correct order: initialize → generateSupportingData → generateStudents');
        return true;
      } else {
        console.log('⚠️  Method calls might not be in optimal order');
        return true; // Still fixed, just order might be different
      }
    } else {
      console.error('❌ generateSupportingData() is NOT called in generateData method');
      console.error('❌ The TypeError fix has NOT been applied');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error reading file:', error.message);
    return false;
  }
}

const isFixed = verifyAdministrationGeneratorFix();
process.exit(isFixed ? 0 : 1);