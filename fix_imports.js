// Script to fix TypeScript imports for ES module compatibility
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

const files = [
  'src/services/dataGeneration/UniversalDataGenerator.ts',
  'src/services/dataGeneration/generators/InventoryGenerator.ts',
  'src/services/dataGeneration/generators/HealthGenerator.ts',
  'src/services/dataGeneration/generators/AdministrationGenerator.ts',
  'src/services/dataGeneration/adapters/MockAdapter.ts',
  'src/services/dataGeneration/generators/NutritionGenerator.ts',
  'src/services/dataGeneration/generators/DormitoryGenerator.ts',
  'src/services/dataGeneration/generators/LibraryGenerator.ts',
  'src/services/dataGeneration/generators/FinanceGenerator.ts',
  'src/services/dataGeneration/generators/CommunicationGenerator.ts',
  'src/services/dataGeneration/generators/AcademicGenerator.ts',
  'src/services/dataGeneration/demo.ts',
  'src/services/dataGeneration/adapters/PouchDBAdapter.ts',
  'src/services/dataGeneration/index.ts',
  'src/services/dataGeneration/generators/TransportGenerator.ts',
  'src/services/dataGeneration/generators/PayrollGenerator.ts',
  'src/services/dataGeneration/adapters/SQLiteOPFSAdapter.ts',
  'src/services/dataGeneration/adapters/AdapterFactory.ts',
  'src/services/dataGeneration/generators/ClubsGenerator.ts',
  'src/services/dataGeneration/generators/FinancialGenerator.ts',
  'src/services/dataGeneration/RelationshipManager.ts',
  'src/services/dataGeneration/generators/index.ts',
  'src/services/dataGeneration/generators/BaseGenerator.ts'
];

files.forEach(filePath => {
  try {
    const content = readFileSync(filePath, 'utf8');
    const updatedContent = content.replace(/from ['"](\.\.\/.*?)\.ts['"]/g, "from '$1.js'");
    
    if (content !== updatedContent) {
      writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`Fixed imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Import fixing complete!');