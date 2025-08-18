// ABOUTME: Script to check application status using Puppeteer
// ABOUTME: Monitors console errors and checks for infinite reload loops

import puppeteer from 'puppeteer';

async function checkAppStatus() {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless mode
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
  });
  
  // Collect page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });
  
  // Track navigation events to detect infinite reloads
  const navigationEvents = [];
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      navigationEvents.push({
        url: frame.url(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  try {
    console.log('Navigating to http://localhost:5202...');
    await page.goto('http://localhost:5202', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('Page loaded successfully!');
    
    // Wait a bit to observe any immediate reloads
    console.log('Waiting 10 seconds to observe behavior...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check for infinite reload patterns
    const recentNavigations = navigationEvents.filter(event => {
      const eventTime = new Date(event.timestamp);
      const now = new Date();
      return (now - eventTime) < 10000; // Last 10 seconds
    });
    
    console.log('\n=== NAVIGATION EVENTS ===');
    console.log(`Total navigations in last 10 seconds: ${recentNavigations.length}`);
    recentNavigations.forEach(nav => {
      console.log(`${nav.timestamp}: ${nav.url}`);
    });
    
    console.log('\n=== CONSOLE MESSAGES ===');
    const errorMessages = consoleMessages.filter(msg => msg.type === 'error');
    const warningMessages = consoleMessages.filter(msg => msg.type === 'warning');
    
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errorMessages.length}`);
    console.log(`Warnings: ${warningMessages.length}`);
    
    if (errorMessages.length > 0) {
      console.log('\nERROR MESSAGES:');
      errorMessages.forEach(msg => {
        console.log(`${msg.timestamp}: ${msg.text}`);
      });
    }
    
    if (warningMessages.length > 0) {
      console.log('\nWARNING MESSAGES:');
      warningMessages.forEach(msg => {
        console.log(`${msg.timestamp}: ${msg.text}`);
      });
    }
    
    console.log('\n=== PAGE ERRORS ===');
    if (pageErrors.length > 0) {
      pageErrors.forEach(error => {
        console.log(`${error.timestamp}: ${error.message}`);
        if (error.stack) {
          console.log(`Stack: ${error.stack}`);
        }
      });
    } else {
      console.log('No page errors detected.');
    }
    
    // Check if infinite reload is happening
    if (recentNavigations.length > 3) {
      console.log('\n⚠️  WARNING: Possible infinite reload detected!');
      console.log(`${recentNavigations.length} navigations in 10 seconds suggests reload loop.`);
    } else {
      console.log('\n✅ No infinite reload detected.');
    }
    
    // Get page title and URL
    const title = await page.title();
    const url = page.url();
    console.log(`\nPage Title: ${title}`);
    console.log(`Current URL: ${url}`);
    
  } catch (error) {
    console.error('Error during page navigation:', error.message);
  } finally {
    await browser.close();
  }
}

checkAppStatus().catch(console.error);