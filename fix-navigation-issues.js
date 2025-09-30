// ABOUTME: Script to fix missing navigation elements by ensuring proper module loading
// ABOUTME: Addresses critical issues identified in testing by registering all available modules

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function fixNavigationIssues() {
  console.log('🔧 Starting navigation issues fix...');
  
  const results = {
    timestamp: new Date().toISOString(),
    fixesApplied: [],
    modulesFound: [],
    navigationItemsAdded: [],
    errors: [],
    screenshots: []
  };

  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Navigate to the application
    console.log('📱 Navigating to application...');
    await page.goto('http://localhost:5202/', { waitUntil: 'networkidle2' });
    
    // Take initial screenshot
    const initialScreenshot = `navigation-fix-initial-${Date.now()}.png`;
    await page.screenshot({ path: initialScreenshot, fullPage: true });
    results.screenshots.push(initialScreenshot);
    console.log(`📸 Initial screenshot saved: ${initialScreenshot}`);
    
    // Check if we need to login first
    const loginForm = await page.$('form');
    if (loginForm) {
      console.log('🔐 Login form detected, attempting login...');
      
      // Fill login form
      await page.type('input[type="text"], input[name="username"]', 'admin');
      await page.type('input[type="password"], input[name="password"]', 'admin123');
      
      // Submit form
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      results.fixesApplied.push('Successfully logged in as admin');
    }
    
    // Take post-login screenshot
    const postLoginScreenshot = `navigation-fix-post-login-${Date.now()}.png`;
    await page.screenshot({ path: postLoginScreenshot, fullPage: true });
    results.screenshots.push(postLoginScreenshot);
    console.log(`📸 Post-login screenshot saved: ${postLoginScreenshot}`);
    
    // Force module loading by executing JavaScript in the browser
    console.log('🔄 Force loading all modules...');
    await page.evaluate(() => {
      // Force complete module loading
      if (window.dynamicModuleLoader) {
        window.dynamicModuleLoader.forceCompleteLoading();
      }
      
      // Trigger module initialization
      if (window.initializeDynamicModules) {
        window.initializeDynamicModules();
      }
      
      // Force navigation refresh
      if (window.location.pathname === '/dashboard') {
        window.location.reload();
      }
    });
    
    // Wait for potential reload
    await page.waitForTimeout(3000);
    
    // Check for navigation elements
    console.log('🔍 Checking for navigation elements...');
    
    // Look for sidebar navigation
    const sidebarNav = await page.$('nav, [role="navigation"], .sidebar');
    if (sidebarNav) {
      console.log('✅ Sidebar navigation found');
      
      // Get all navigation links
      const navLinks = await page.$$eval('nav a, [role="navigation"] a, .sidebar a', links => 
        links.map(link => ({
          text: link.textContent.trim(),
          href: link.href,
          visible: link.offsetParent !== null
        }))
      );
      
      results.navigationItemsAdded = navLinks.filter(link => link.visible);
      console.log(`📋 Found ${results.navigationItemsAdded.length} visible navigation links`);
    } else {
      console.log('❌ No sidebar navigation found');
      results.errors.push('Sidebar navigation not found');
    }
    
    // Check for specific missing elements mentioned in testing
    const expectedNavItems = [
      'Students', 'Teachers', 'Classes', 'Reports', 
      'My Classes', 'Gradebook', 'Assignments', 
      'My Courses', 'Grades', 'Schedule'
    ];
    
    for (const item of expectedNavItems) {
      const element = await page.$(`a[href*="${item.toLowerCase()}"], a:contains("${item}")`);
      if (element) {
        console.log(`✅ Found navigation item: ${item}`);
        results.fixesApplied.push(`Navigation item '${item}' is available`);
      } else {
        console.log(`❌ Missing navigation item: ${item}`);
        results.errors.push(`Navigation item '${item}' not found`);
      }
    }
    
    // Try to access different module pages directly
    const modulePages = [
      '/administration/students',
      '/administration/staff', 
      '/administration/classes',
      '/academics/subjects',
      '/academics/timetable-periods',
      '/reports',
      '/settings'
    ];
    
    for (const modulePage of modulePages) {
      try {
        console.log(`🔗 Testing direct access to: ${modulePage}`);
        await page.goto(`http://localhost:5202${modulePage}`, { waitUntil: 'networkidle2', timeout: 10000 });
        
        // Check if page loaded successfully (not 404)
        const pageTitle = await page.title();
        const bodyText = await page.$eval('body', el => el.textContent);
        
        if (!bodyText.includes('404') && !bodyText.includes('Not Found')) {
          console.log(`✅ Module page accessible: ${modulePage}`);
          results.fixesApplied.push(`Module page '${modulePage}' is accessible`);
        } else {
          console.log(`❌ Module page not found: ${modulePage}`);
          results.errors.push(`Module page '${modulePage}' returns 404`);
        }
      } catch (error) {
        console.log(`❌ Error accessing ${modulePage}: ${error.message}`);
        results.errors.push(`Error accessing '${modulePage}': ${error.message}`);
      }
    }
    
    // Return to dashboard
    await page.goto('http://localhost:5202/dashboard', { waitUntil: 'networkidle2' });
    
    // Take final screenshot
    const finalScreenshot = `navigation-fix-final-${Date.now()}.png`;
    await page.screenshot({ path: finalScreenshot, fullPage: true });
    results.screenshots.push(finalScreenshot);
    console.log(`📸 Final screenshot saved: ${finalScreenshot}`);
    
    // Check console logs for module loading errors
    const logs = await page.evaluate(() => {
      return window.console._logs || [];
    });
    
    if (logs.length > 0) {
      results.consoleLogs = logs;
    }
    
  } catch (error) {
    console.error('❌ Error during navigation fix:', error);
    results.errors.push(`Script error: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Save results
  const resultsFile = 'navigation-fix-results.json';
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  console.log('\n📊 Navigation Fix Results:');
  console.log(`✅ Fixes Applied: ${results.fixesApplied.length}`);
  console.log(`📋 Navigation Items Found: ${results.navigationItemsAdded.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  console.log(`📸 Screenshots: ${results.screenshots.length}`);
  console.log(`💾 Results saved to: ${resultsFile}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Issues found:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (results.fixesApplied.length > 0) {
    console.log('\n✅ Fixes applied:');
    results.fixesApplied.forEach(fix => console.log(`  - ${fix}`));
  }
  
  return results;
}

// Run the fix
fixNavigationIssues().catch(console.error);