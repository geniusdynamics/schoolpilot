// ABOUTME: Puppeteer test script for comprehensive application testing
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function testApplication() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  try {
    console.log('Navigating to application...');
    await page.goto('http://localhost:5201/', { waitUntil: 'networkidle2' });
    
    // Take initial screenshot
    await page.screenshot({ path: 'initial-state.png', fullPage: true });
    console.log('Initial screenshot taken: initial-state.png');
    
    // Get page title and URL
    const title = await page.title();
    const url = await page.url();
    console.log(`Page Title: ${title}`);
    console.log(`Current URL: ${url}`);
    
    // Check for any visible errors on page
    const errorElements = await page.$$eval('[class*="error"], .error, [data-testid*="error"]', elements => 
      elements.map(el => el.textContent)
    );
    
    if (errorElements.length > 0) {
      console.log('Visible errors found:', errorElements);
    }
    
    // Get all links on the page
    const links = await page.$$eval('a[href]', links => 
      links.map(link => ({
        text: link.textContent.trim(),
        href: link.href,
        visible: link.offsetParent !== null
      }))
    );
    
    console.log(`Found ${links.length} links on the page`);
    
    // Get all buttons
    const buttons = await page.$$eval('button, [role="button"]', buttons => 
      buttons.map(btn => ({
        text: btn.textContent.trim(),
        disabled: btn.disabled,
        visible: btn.offsetParent !== null
      }))
    );
    
    console.log(`Found ${buttons.length} buttons on the page`);
    
    // Save results to file
    const results = {
      timestamp: new Date().toISOString(),
      title,
      url,
      errors: errorElements,
      links: links.filter(link => link.visible),
      buttons: buttons.filter(btn => btn.visible)
    };
    
    fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
    console.log('Test results saved to test-results.json');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testApplication().catch(console.error);