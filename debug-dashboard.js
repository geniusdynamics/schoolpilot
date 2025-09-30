// Simple test to check dashboard module registration
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if core module definition exists
const coreModulePath = path.join(__dirname, 'src', 'modules', 'core', 'moduleDefinition.tsx');
const dashboardPagePath = path.join(__dirname, 'src', 'modules', 'dashboard', 'pages', 'DashboardPage.tsx');

console.log('🔍 Checking file existence:');
console.log('Core module definition:', fs.existsSync(coreModulePath) ? '✅ EXISTS' : '❌ MISSING');
console.log('Dashboard page:', fs.existsSync(dashboardPagePath) ? '✅ EXISTS' : '❌ MISSING');

if (fs.existsSync(coreModulePath)) {
  try {
    const content = fs.readFileSync(coreModulePath, 'utf8');
    console.log('\n📄 Core module file content preview:');
    console.log(content.substring(0, 500) + '...');
  } catch (error) {
    console.log('❌ Error reading core module file:', error.message);
  }
}

if (fs.existsSync(dashboardPagePath)) {
  try {
    const content = fs.readFileSync(dashboardPagePath, 'utf8');
    console.log('\n📄 Dashboard page file exists and is readable');
  } catch (error) {
    console.log('❌ Error reading dashboard page file:', error.message);
  }
}