// Test module loading and registration
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if core module definition exists
const coreModulePath = join(__dirname, 'src', 'modules', 'core', 'moduleDefinition.tsx');
const dashboardPagePath = join(__dirname, 'src', 'modules', 'dashboard', 'pages', 'DashboardPage.tsx');

console.log('🔍 Checking file existence:');
console.log('Core module definition:', fs.existsSync(coreModulePath) ? '✅ EXISTS' : '❌ MISSING');
console.log('Dashboard page:', fs.existsSync(dashboardPagePath) ? '✅ EXISTS' : '❌ MISSING');

if (fs.existsSync(coreModulePath)) {
  console.log('\n📄 Core module definition content:');
  const content = fs.readFileSync(coreModulePath, 'utf8');
  
  // Check if dashboard module is defined
  if (content.includes('dashboardModule')) {
    console.log('✅ Dashboard module definition found');
  } else {
    console.log('❌ Dashboard module definition NOT found');
  }
  
  // Check if it's exported
  if (content.includes('dashboardModule') && content.includes('export')) {
    console.log('✅ Dashboard module is exported');
  } else {
    console.log('❌ Dashboard module export issue');
  }
}

console.log('\n🔍 Checking module discovery pattern:');
const modulesDir = join(__dirname, 'src', 'modules');
if (fs.existsSync(modulesDir)) {
  const moduleSubdirs = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log('Available module directories:', moduleSubdirs);
  
  // Check for moduleDefinition.tsx files
  moduleSubdirs.forEach(dir => {
    const moduleDefPath = join(modulesDir, dir, 'moduleDefinition.tsx');
    if (fs.existsSync(moduleDefPath)) {
      console.log(`✅ ${dir}/moduleDefinition.tsx exists`);
    } else {
      console.log(`❌ ${dir}/moduleDefinition.tsx missing`);
    }
  });
}