// ABOUTME: Comprehensive interactive element testing script
import puppeteer from 'puppeteer';
import fs from 'fs';

async function testInteractiveElements() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    errors: [],
    screenshots: []
  };
  
  // Enable console logging
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
    testResults.errors.push({
      type: 'page_error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  });
  
  try {
    console.log('\n=== STARTING INTERACTIVE ELEMENT TESTING ===\n');
    
    // Navigate to application
    await page.goto('http://localhost:5201/', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'test-01-initial.png', fullPage: true });
    testResults.screenshots.push('test-01-initial.png');
    
    // Test 1: Click admin role button
    console.log('Test 1: Testing admin role button...');
    try {
      // Find admin button by text content
      const adminButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.includes('admin'));
      });
      
      if (adminButton.asElement()) {
        await adminButton.asElement().click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.screenshot({ path: 'test-02-admin-selected.png', fullPage: true });
        testResults.screenshots.push('test-02-admin-selected.png');
        
        // Check if Sign In button is now enabled
        const signInEnabled = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const signInBtn = buttons.find(btn => btn.textContent.includes('Sign In'));
          return signInBtn ? !signInBtn.disabled : false;
        });
        
        testResults.tests.push({
          name: 'Admin role selection enables Sign In',
          passed: signInEnabled,
          details: `Sign In button enabled: ${signInEnabled}`
        });
        console.log(`✓ Admin role selected, Sign In enabled: ${signInEnabled}`);
      } else {
        throw new Error('Admin button not found');
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Admin role selection',
        passed: false,
        error: error.message
      });
      console.log(`✗ Admin role test failed: ${error.message}`);
    }
    
    // Test 2: Try to sign in as admin
    console.log('\nTest 2: Testing Sign In functionality...');
    try {
      // Find and click Sign In button
      const signInButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.includes('Sign In'));
      });
      
      if (signInButton.asElement()) {
        await signInButton.asElement().click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const currentUrl = page.url();
        await page.screenshot({ path: 'test-03-after-signin.png', fullPage: true });
        testResults.screenshots.push('test-03-after-signin.png');
        
        testResults.tests.push({
          name: 'Sign In navigation',
          passed: currentUrl !== 'http://localhost:5201/',
          details: `URL after sign in: ${currentUrl}`
        });
        console.log(`✓ Sign In clicked, new URL: ${currentUrl}`);
      } else {
        throw new Error('Sign In button not found');
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Sign In functionality',
        passed: false,
        error: error.message
      });
      console.log(`✗ Sign In test failed: ${error.message}`);
    }
    
    // Test 3: Check for navigation elements in dashboard
    console.log('\nTest 3: Testing dashboard navigation elements...');
    try {
      await page.waitForTimeout(2000);
      
      // Look for common navigation elements
      const navElements = await page.$$eval('nav a, [role="navigation"] a, .sidebar a, .menu a', links => 
        links.map(link => ({
          text: link.textContent.trim(),
          href: link.href,
          visible: link.offsetParent !== null
        }))
      );
      
      testResults.tests.push({
        name: 'Dashboard navigation elements',
        passed: navElements.length > 0,
        details: `Found ${navElements.length} navigation links`,
        data: navElements
      });
      console.log(`✓ Found ${navElements.length} navigation elements`);
    } catch (error) {
      testResults.tests.push({
        name: 'Dashboard navigation check',
        passed: false,
        error: error.message
      });
      console.log(`✗ Navigation check failed: ${error.message}`);
    }
    
    // Test 4: Test different role selections
    console.log('\nTest 4: Testing other role selections...');
    const roles = ['teacher', 'finance', 'student'];
    
    for (const role of roles) {
      try {
        // Go back to login page
        await page.goto('http://localhost:5201/', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Click role button
        const roleButton = await page.evaluateHandle((roleName) => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => btn.textContent.includes(roleName));
        }, role);
        
        if (roleButton.asElement()) {
          await roleButton.asElement().click();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Check if Sign In is enabled
        const signInEnabled = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const signInBtn = buttons.find(btn => btn.textContent.includes('Sign In'));
          return signInBtn ? !signInBtn.disabled : false;
        });
        
        // Try to sign in
        if (signInEnabled) {
          const signInButton = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(btn => btn.textContent.includes('Sign In'));
          });
          
          if (signInButton.asElement()) {
            await signInButton.asElement().click();
            await page.waitForTimeout(2000);
          }
          const newUrl = page.url();
          
          await page.screenshot({ path: `test-04-${role}-dashboard.png`, fullPage: true });
          testResults.screenshots.push(`test-04-${role}-dashboard.png`);
          
          testResults.tests.push({
            name: `${role} role login flow`,
            passed: newUrl !== 'http://localhost:5201/',
            details: `${role} login successful, URL: ${newUrl}`
          });
          console.log(`✓ ${role} role test passed, URL: ${newUrl}`);
        } else {
          testResults.tests.push({
            name: `${role} role selection`,
            passed: false,
            details: 'Sign In button not enabled after role selection'
          });
          console.log(`✗ ${role} role test failed: Sign In not enabled`);
        }
      } catch (error) {
        testResults.tests.push({
          name: `${role} role test`,
          passed: false,
          error: error.message
        });
        console.log(`✗ ${role} role test failed: ${error.message}`);
      }
    }
    
    // Test 5: Check for forms and modals
    console.log('\nTest 5: Checking for forms and modals...');
    try {
      // Go to admin dashboard
      await page.goto('http://localhost:5201/', { waitUntil: 'networkidle2' });
      
      // Click admin button
      const adminBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.includes('admin'));
      });
      
      if (adminBtn.asElement()) {
        await adminBtn.asElement().click();
        await page.waitForTimeout(500);
        
        // Click Sign In
        const signInBtn = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => btn.textContent.includes('Sign In'));
        });
        
        if (signInBtn.asElement()) {
          await signInBtn.asElement().click();
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // Look for forms
      const forms = await page.$$eval('form', forms => forms.length);
      
      // Look for modal triggers
      const modalTriggers = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const modalButtons = buttons.filter(btn => {
          const text = btn.textContent.toLowerCase();
          return text.includes('add') || text.includes('create') || text.includes('new') || 
                 btn.hasAttribute('data-testid') && btn.getAttribute('data-testid').includes('modal') ||
                 btn.hasAttribute('aria-label') && btn.getAttribute('aria-label').includes('modal');
        });
        return modalButtons.map(btn => ({
          text: btn.textContent.trim(),
          visible: btn.offsetParent !== null
        }));
      });
      
      testResults.tests.push({
        name: 'Forms and modals detection',
        passed: forms > 0 || modalTriggers.length > 0,
        details: `Found ${forms} forms and ${modalTriggers.length} potential modal triggers`,
        data: { forms, modalTriggers }
      });
      console.log(`✓ Found ${forms} forms and ${modalTriggers.length} modal triggers`);
    } catch (error) {
      testResults.tests.push({
        name: 'Forms and modals check',
        passed: false,
        error: error.message
      });
      console.log(`✗ Forms/modals check failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Critical test failure:', error);
    testResults.errors.push({
      type: 'critical_error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    await browser.close();
  }
  
  // Save comprehensive results
  fs.writeFileSync('interactive-test-results.json', JSON.stringify(testResults, null, 2));
  
  // Print summary
  console.log('\n=== TEST SUMMARY ===');
  const passed = testResults.tests.filter(t => t.passed).length;
  const total = testResults.tests.length;
  console.log(`Tests passed: ${passed}/${total}`);
  console.log(`Errors encountered: ${testResults.errors.length}`);
  console.log(`Screenshots taken: ${testResults.screenshots.length}`);
  console.log('\nDetailed results saved to: interactive-test-results.json');
  
  return testResults;
}

testInteractiveElements().catch(console.error);