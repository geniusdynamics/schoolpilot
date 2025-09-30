// ABOUTME: Direct navigation testing script using fetch to check application endpoints
// ABOUTME: Tests module loading and navigation without browser automation

const http = require('http');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:5202';
const TEST_RESULTS = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  }
};

// Test endpoints to check
const ENDPOINTS_TO_TEST = [
  '/',
  '/login',
  '/dashboard',
  '/dashboard/academics',
  '/dashboard/administration',
  '/dashboard/admissions',
  '/dashboard/finance',
  '/dashboard/hr',
  '/dashboard/inventory',
  '/dashboard/library',
  '/dashboard/nutrition',
  '/dashboard/reports',
  '/dashboard/settings'
];

// Function to make HTTP request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: data,
          url: url
        });
      });
    });
    
    request.on('error', (error) => {
      reject({
        error: error.message,
        url: url
      });
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      reject({
        error: 'Request timeout',
        url: url
      });
    });
  });
}

// Function to test an endpoint
async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const testResult = {
    endpoint: endpoint,
    url: url,
    timestamp: new Date().toISOString(),
    status: 'unknown',
    statusCode: null,
    error: null,
    responseTime: 0,
    hasContent: false,
    contentLength: 0
  };
  
  const startTime = Date.now();
  
  try {
    console.log(`Testing endpoint: ${endpoint}`);
    const response = await makeRequest(url);
    
    testResult.responseTime = Date.now() - startTime;
    testResult.statusCode = response.statusCode;
    testResult.contentLength = response.body.length;
    testResult.hasContent = response.body.length > 0;
    
    if (response.statusCode === 200) {
      testResult.status = 'passed';
      console.log(`✓ ${endpoint} - OK (${response.statusCode})`);
    } else if (response.statusCode === 302 || response.statusCode === 301) {
      testResult.status = 'redirect';
      console.log(`→ ${endpoint} - Redirect (${response.statusCode})`);
    } else {
      testResult.status = 'failed';
      testResult.error = `HTTP ${response.statusCode}`;
      console.log(`✗ ${endpoint} - Failed (${response.statusCode})`);
    }
    
  } catch (error) {
    testResult.responseTime = Date.now() - startTime;
    testResult.status = 'error';
    testResult.error = error.error || error.message;
    console.log(`✗ ${endpoint} - Error: ${testResult.error}`);
  }
  
  return testResult;
}

// Function to check if server is running
async function checkServerStatus() {
  try {
    const response = await makeRequest(BASE_URL);
    console.log(`Server is running on ${BASE_URL} (Status: ${response.statusCode})`);
    return true;
  } catch (error) {
    console.log(`Server is not accessible on ${BASE_URL}: ${error.error}`);
    return false;
  }
}

// Main testing function
async function runNavigationTests() {
  console.log('='.repeat(60));
  console.log('SCHOOLPILOT NAVIGATION TESTING');
  console.log('='.repeat(60));
  console.log(`Testing application at: ${BASE_URL}`);
  console.log(`Test started at: ${TEST_RESULTS.timestamp}`);
  console.log('');
  
  // Check if server is running
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log('❌ Cannot proceed with tests - server is not running');
    TEST_RESULTS.summary.errors.push('Server is not accessible');
    return;
  }
  
  console.log('\n🔍 Testing navigation endpoints...');
  console.log('-'.repeat(40));
  
  // Test each endpoint
  for (const endpoint of ENDPOINTS_TO_TEST) {
    const result = await testEndpoint(endpoint);
    TEST_RESULTS.tests.push(result);
    TEST_RESULTS.summary.total++;
    
    if (result.status === 'passed' || result.status === 'redirect') {
      TEST_RESULTS.summary.passed++;
    } else {
      TEST_RESULTS.summary.failed++;
      if (result.error) {
        TEST_RESULTS.summary.errors.push(`${endpoint}: ${result.error}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Generate summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total endpoints tested: ${TEST_RESULTS.summary.total}`);
  console.log(`Passed: ${TEST_RESULTS.summary.passed}`);
  console.log(`Failed: ${TEST_RESULTS.summary.failed}`);
  console.log(`Success rate: ${((TEST_RESULTS.summary.passed / TEST_RESULTS.summary.total) * 100).toFixed(1)}%`);
  
  if (TEST_RESULTS.summary.errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    TEST_RESULTS.summary.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
  }
  
  // Save results to file
  const resultsFile = path.join(__dirname, 'navigation-test-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(TEST_RESULTS, null, 2));
  console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
  
  console.log('\n✅ Navigation testing completed!');
}

// Run the tests
if (require.main === module) {
  runNavigationTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runNavigationTests, testEndpoint, checkServerStatus };