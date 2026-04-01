#!/usr/bin/env node

/**
 * ABOUTME: Self-hosting deployment setup script for SchoolPilot3
 * ABOUTME: Configures environment variables and validates system requirements
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env');
const ENV_EXAMPLE = path.join(__dirname, '..', '.env.example');

const SELF_HOSTING_CONFIG = {
  VITE_PORT: '5200',
  VITE_HOST: '0.0.0.0',
  VITE_STRICT_PORT: 'false',
  VITE_DB_PROVIDER: 'sqlite-wasm',
  VITE_DB_MODE: 'production',
  VITE_DEPLOYMENT_ENV: 'production',
  VITE_SQLITE_WAL_MODE: 'true',
  VITE_SQLITE_FOREIGN_KEYS: 'true',
  VITE_SQLITE_CACHE_SIZE: '20000',
  VITE_SQLITE_SYNCHRONOUS: '1',
  VITE_LIVESTORE_ENABLED: 'false',
  VITE_LIVESTORE_ADAPTER: 'opfs',
  VITE_BACKEND_API_URL: '',
  VITE_BACKEND_API_KEY: '',
  VITE_ERPNEXT_URL: '',
  VITE_ERPNEXT_API_KEY: '',
  VITE_ERPNEXT_API_SECRET: '',
  VITE_ENABLE_HTTPS: 'false',
  VITE_SESSION_TIMEOUT: '60',
  VITE_ENABLE_AUDIT_LOG: 'true',
  VITE_ENABLE_QUERY_CACHE: 'true',
  VITE_QUERY_CACHE_TTL: '300',
  VITE_MAX_CONCURRENT_CONNECTIONS: '10',
};

function checkSystemRequirements() {
  console.log('🔍 Checking system requirements...');
  
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  
  if (majorVersion < 18) {
    console.error(`❌ Node.js version 18+ required (current: ${nodeVersion})`);
    process.exit(1);
  }
  
  console.log(`✅ Node.js ${nodeVersion}`);
  
  const requiredPackages = ['@sqlite.org/sqlite-wasm'];
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  for (const pkg of requiredPackages) {
    if (allDeps[pkg]) {
      console.log(`✅ ${pkg} installed`);
    } else {
      console.warn(`⚠️  ${pkg} not found in dependencies`);
    }
  }
  
  console.log('');
}

function createEnvFile() {
  console.log('📝 Creating .env file for self-hosting...');
  
  if (fs.existsSync(ENV_FILE)) {
    console.log('⚠️  .env file already exists');
    
    const existingContent = fs.readFileSync(ENV_FILE, 'utf8');
    const hasSelfHostingConfig = existingContent.includes('VITE_DB_PROVIDER');
    
    if (hasSelfHostingConfig) {
      console.log('✅ Self-hosting configuration already present');
      return;
    }
    
    console.log('📝 Appending self-hosting configuration to existing .env file');
    const selfHostingSection = '\n# Self-Hosting Configuration\n' + 
      Object.entries(SELF_HOSTING_CONFIG)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    fs.appendFileSync(ENV_FILE, selfHostingSection);
    console.log('✅ Self-hosting configuration appended');
  } else {
    console.log('📝 Creating new .env file from .env.example');
    
    if (fs.existsSync(ENV_EXAMPLE)) {
      fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
      console.log('✅ .env file created from .env.example');
    } else {
      const envContent = Object.entries(SELF_HOSTING_CONFIG)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      fs.writeFileSync(ENV_FILE, envContent);
      console.log('✅ .env file created with self-hosting defaults');
    }
  }
  
  console.log('');
}

function validateConfiguration() {
  console.log('🔍 Validating configuration...');
  
  if (!fs.existsSync(ENV_FILE)) {
    console.error('❌ .env file not found');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  const envVars = {};
  
  for (const line of envLines) {
    const [key, ...valueParts] = line.split('=');
    envVars[key.trim()] = valueParts.join('=').trim();
  }
  
  const requiredVars = ['VITE_PORT', 'VITE_HOST', 'VITE_DB_PROVIDER', 'VITE_DB_MODE'];
  let allValid = true;
  
  for (const varName of requiredVars) {
    if (envVars[varName]) {
      console.log(`✅ ${varName}=${envVars[varName]}`);
    } else {
      console.warn(`⚠️  ${varName} not set (will use default)`);
      allValid = false;
    }
  }
  
  console.log('');
  
  if (allValid) {
    console.log('✅ Configuration validation passed');
  } else {
    console.log('⚠️  Some configuration values are missing, defaults will be used');
  }
  
  console.log('');
}

function printNextSteps() {
  console.log('📋 Next Steps:');
  console.log('');
  console.log('1. Start the development server:');
  console.log('   npm run dev');
  console.log('');
  console.log('2. Access the application:');
  console.log('   - Local: http://localhost:5200');
  console.log('   - Network: http://<your-ip>:5200');
  console.log('');
  console.log('3. Find your IP address:');
  console.log('   - Windows: ipconfig');
  console.log('   - Linux: ip addr or ifconfig');
  console.log('   - macOS: ifconfig');
  console.log('');
  console.log('4. Configure firewall (if needed):');
  console.log('   - Windows: Allow port 5200 in Windows Defender Firewall');
  console.log('   - Linux (UFW): sudo ufw allow 5200/tcp');
  console.log('   - Linux (firewalld): sudo firewall-cmd --add-port=5200/tcp --permanent');
  console.log('');
  console.log('5. For production deployment, see:');
  console.log('   docs/SELF_HOSTING_DEPLOYMENT.md');
  console.log('');
}

function main() {
  console.log('🚀 SchoolPilot3 Self-Hosting Setup');
  console.log('===================================\n');
  
  checkSystemRequirements();
  createEnvFile();
  validateConfiguration();
  printNextSteps();
  
  console.log('✅ Setup complete!');
}

main();
