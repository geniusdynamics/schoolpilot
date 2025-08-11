// ABOUTME: Script to count total collections in RxDB collectionsDefinition
// ABOUTME: This helps identify how many collections exceed the 16 limit

const fs = require('fs');
const path = require('path');

// Read the rxdbService.ts file
const rxdbServicePath = path.join(__dirname, 'src', 'services', 'rxdbService.ts');
const content = fs.readFileSync(rxdbServicePath, 'utf8');

// Extract the collectionsDefinition object
const collectionsDefMatch = content.match(/export const collectionsDefinition[\s\S]*?\};/);
if (!collectionsDefMatch) {
  console.error('Could not find collectionsDefinition in rxdbService.ts');
  process.exit(1);
}

const collectionsDefContent = collectionsDefMatch[0];
console.log('Found collectionsDefinition:');
console.log(collectionsDefContent);

// Count core collections (before module spreads)
const coreCollections = [
  'app_settings',
  'school_details', 
  'users',
  'roles',
  'academic_year_structures',
  'academic_period_definitions',
  'academic_years',
  'workflows',
  'workflow_states',
  'education_system_configurations',
  'audit_logs',
  'parents_guardians',
  'students',
  'student_guardian_relationships',
  'staff',
  'departments',
  'designations',
  'student_categories',
  'dormitories',
  'classes',
  'class_streams',
  'student_invoice_items',
  'permissions',
  'rbac_roles',
  'user_roles'
];

console.log('\n=== COLLECTION COUNT ANALYSIS ===');
console.log(`Core collections: ${coreCollections.length}`);
coreCollections.forEach((col, index) => {
  console.log(`  ${index + 1}. ${col}`);
});

// Now we need to count module collections from the SchoolDatabaseCollections type
const typeDefMatch = content.match(/export type SchoolDatabaseCollections = \{[\s\S]*?\};/);
if (typeDefMatch) {
  const typeContent = typeDefMatch[0];
  // Extract all collection names from the type definition
  const collectionMatches = typeContent.match(/\s+(\w+):\s+RxCollection/g);
  if (collectionMatches) {
    const allCollections = collectionMatches.map(match => match.trim().split(':')[0]);
    console.log(`\nTotal collections from type definition: ${allCollections.length}`);
    
    // Group by module
    const moduleCollections = {
      core: [],
      academics: [],
      administration: [],
      finance: [],
      hr: [],
      inventory: [],
      library: [],
      nutrition: [],
      rbac: []
    };
    
    allCollections.forEach(col => {
      if (coreCollections.includes(col)) {
        moduleCollections.core.push(col);
      } else if (col.includes('subject') || col.includes('exam') || col.includes('grading') || col.includes('timetable')) {
        moduleCollections.academics.push(col);
      } else if (col.includes('partner') || col.includes('club') || col.includes('customer') || col.includes('health') || col.includes('attendance') || col.includes('communication') || col.includes('campaign')) {
        moduleCollections.administration.push(col);
      } else if (col.includes('chart') || col.includes('expense') || col.includes('bank') || col.includes('supplier') || col.includes('fee') || col.includes('transport') || col.includes('invoice') || col.includes('payment') || col.includes('ledger') || col.includes('financial')) {
        moduleCollections.finance.push(col);
      } else if (col.includes('payroll') || col.includes('salary') || col.includes('payslip')) {
        moduleCollections.hr.push(col);
      } else if (col.includes('warehouse') || col.includes('item') || col.includes('asset') || col.includes('stock') || col.includes('requisition') || col.includes('purchase') || col.includes('rfq')) {
        moduleCollections.inventory.push(col);
      } else if (col.includes('book') || col.includes('loan') || col.includes('fine')) {
        moduleCollections.library.push(col);
      } else if (col.includes('meal') || col.includes('menu') || col.includes('merchant') || col.includes('wallet')) {
        moduleCollections.nutrition.push(col);
      } else if (col.includes('permission') || col.includes('role')) {
        moduleCollections.rbac.push(col);
      }
    });
    
    console.log('\n=== COLLECTIONS BY MODULE ===');
    Object.entries(moduleCollections).forEach(([module, collections]) => {
      if (collections.length > 0) {
        console.log(`\n${module.toUpperCase()} (${collections.length} collections):`);
        collections.forEach((col, index) => {
          console.log(`  ${index + 1}. ${col}`);
        });
      }
    });
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total collections: ${allCollections.length}`);
    console.log(`RxDB open-source limit: 16`);
    console.log(`Collections over limit: ${allCollections.length - 16}`);
    
    if (allCollections.length > 16) {
      console.log('\n🚨 EXCEEDING RXDB COLLECTION LIMIT!');
      console.log('Need to reduce collections by:', allCollections.length - 16);
    } else {
      console.log('\n✅ Within RxDB collection limit');
    }
  }
}