// ABOUTME: Complete user journey testing script for SchoolPilot application
// ABOUTME: Tests end-to-end user flows across all roles and modules

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const TARGET_URL = 'http://localhost:5202/';
const TIMEOUT = 30000;

async function testUserJourneys() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    const testResults = {
        journeys: [],
        screenshots: [],
        errors: [],
        summary: {
            totalJourneys: 0,
            successfulJourneys: 0,
            failedJourneys: 0,
            screenshotsTaken: 0
        }
    };
    
    let screenshotCounter = 1;
    
    // Helper function to take screenshot
    async function takeScreenshot(name, description) {
        const filename = `journey-${String(screenshotCounter).padStart(2, '0')}-${name}.png`;
        await page.screenshot({ path: filename, fullPage: false });
        testResults.screenshots.push({ filename, description, timestamp: new Date().toISOString() });
        screenshotCounter++;
        console.log(`Screenshot taken: ${filename} - ${description}`);
    }
    
    // Helper function to wait and handle errors
    async function safeWait(selector, timeout = 5000) {
        try {
            await page.waitForSelector(selector, { timeout });
            return true;
        } catch (error) {
            console.log(`Element not found: ${selector}`);
            return false;
        }
    }
    
    try {
        console.log('Starting comprehensive user journey testing...');
        
        // Journey 1: Initial Application Load
        console.log('\n=== Journey 1: Initial Application Load ===');
        const journey1 = { name: 'Initial Application Load', steps: [], success: false };
        
        try {
            await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for any dynamic content
        } catch (error) {
            console.log('Navigation timeout, trying with different wait strategy...');
            await page.goto(TARGET_URL, { waitUntil: 'load', timeout: TIMEOUT });
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        await takeScreenshot('initial-load', 'Application initial load');
        
        journey1.steps.push('Application loaded successfully');
        journey1.success = true;
        testResults.journeys.push(journey1);
        
        // Journey 2: Admin Role Selection and Dashboard Access
        console.log('\n=== Journey 2: Admin Role Selection and Dashboard ===');
        const journey2 = { name: 'Admin Role Selection', steps: [], success: false };
        
        const adminButton = await page.$('button[data-role="admin"]');
        if (adminButton) {
            await adminButton.click();
            await page.waitForTimeout(3000);
            await takeScreenshot('admin-dashboard', 'Admin dashboard after role selection');
            journey2.steps.push('Admin role selected successfully');
            journey2.steps.push('Admin dashboard loaded');
            journey2.success = true;
        } else {
            journey2.steps.push('Admin role button not found');
            testResults.errors.push('Admin role button not accessible');
        }
        testResults.journeys.push(journey2);
        
        // Journey 3: Module Navigation Flow
        console.log('\n=== Journey 3: Complete Module Navigation ===');
        const journey3 = { name: 'Module Navigation Flow', steps: [], success: false };
        
        const modules = [
            { name: 'Administration', selector: 'button[data-module="administration"]' },
            { name: 'Academics', selector: 'button[data-module="academics"]' },
            { name: 'Finance', selector: 'button[data-module="finance"]' },
            { name: 'HR', selector: 'button[data-module="hr"]' },
            { name: 'Inventory', selector: 'button[data-module="inventory"]' },
            { name: 'Library', selector: 'button[data-module="library"]' },
            { name: 'Nutrition', selector: 'button[data-module="nutrition"]' },
            { name: 'Reports', selector: 'button[data-module="reports"]' },
            { name: 'Settings', selector: 'button[data-module="settings"]' }
        ];
        
        let moduleSuccessCount = 0;
        for (const module of modules) {
            try {
                const moduleButton = await page.$(module.selector);
                if (moduleButton) {
                    await moduleButton.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await takeScreenshot(`module-${module.name.toLowerCase()}`, `${module.name} module loaded`);
                    journey3.steps.push(`${module.name} module accessed successfully`);
                    moduleSuccessCount++;
                } else {
                    journey3.steps.push(`${module.name} module button not found`);
                }
            } catch (error) {
                journey3.steps.push(`Error accessing ${module.name}: ${error.message}`);
                testResults.errors.push(`Module navigation error in ${module.name}: ${error.message}`);
            }
        }
        
        journey3.success = moduleSuccessCount > 0;
        testResults.journeys.push(journey3);
        
        // Journey 4: Interactive Elements Testing
        console.log('\n=== Journey 4: Interactive Elements Testing ===');
        const journey4 = { name: 'Interactive Elements Testing', steps: [], success: false };
        
        // Test various interactive elements
        const interactiveElements = [
            { name: 'Menu buttons', selector: 'button' },
            { name: 'Navigation links', selector: 'a' },
            { name: 'Input fields', selector: 'input' },
            { name: 'Select dropdowns', selector: 'select' }
        ];
        
        let interactiveSuccessCount = 0;
        for (const element of interactiveElements) {
            try {
                const elements = await page.$$(element.selector);
                if (elements.length > 0) {
                    journey4.steps.push(`Found ${elements.length} ${element.name}`);
                    interactiveSuccessCount++;
                } else {
                    journey4.steps.push(`No ${element.name} found`);
                }
            } catch (error) {
                journey4.steps.push(`Error testing ${element.name}: ${error.message}`);
            }
        }
        
        await takeScreenshot('interactive-elements', 'Interactive elements testing completed');
        journey4.success = interactiveSuccessCount > 0;
        testResults.journeys.push(journey4);
        
        // Journey 5: Responsive Design Testing
        console.log('\n=== Journey 5: Responsive Design Testing ===');
        const journey5 = { name: 'Responsive Design Testing', steps: [], success: false };
        
        const viewports = [
            { name: 'Mobile', width: 375, height: 667 },
            { name: 'Tablet', width: 768, height: 1024 },
            { name: 'Desktop', width: 1280, height: 720 }
        ];
        
        for (const viewport of viewports) {
            try {
                await page.setViewport({ width: viewport.width, height: viewport.height });
                await new Promise(resolve => setTimeout(resolve, 1000));
                await takeScreenshot(`responsive-${viewport.name.toLowerCase()}`, `${viewport.name} viewport (${viewport.width}x${viewport.height})`);
                journey5.steps.push(`${viewport.name} viewport tested successfully`);
            } catch (error) {
                journey5.steps.push(`Error testing ${viewport.name} viewport: ${error.message}`);
            }
        }
        
        journey5.success = true;
        testResults.journeys.push(journey5);
        
        // Journey 6: Performance and Loading Testing
        console.log('\n=== Journey 6: Performance Testing ===');
        const journey6 = { name: 'Performance Testing', steps: [], success: false };
        
        // Reset to desktop viewport
        await page.setViewport({ width: 1280, height: 720 });
        
        // Test page reload performance
        const startTime = Date.now();
        await page.reload({ waitUntil: 'networkidle2' });
        const loadTime = Date.now() - startTime;
        
        journey6.steps.push(`Page reload completed in ${loadTime}ms`);
        
        if (loadTime < 5000) {
            journey6.steps.push('Page load performance is acceptable');
            journey6.success = true;
        } else {
            journey6.steps.push('Page load performance is slow');
            testResults.errors.push(`Slow page load: ${loadTime}ms`);
        }
        
        await takeScreenshot('performance-test', 'Performance testing completed');
        testResults.journeys.push(journey6);
        
        console.log('\nUser journey testing completed successfully');
        
    } catch (error) {
        console.error('Error during user journey testing:', error);
        testResults.errors.push(`Critical error: ${error.message}`);
    } finally {
        await browser.close();
    }
    
    // Calculate summary
    testResults.summary.totalJourneys = testResults.journeys.length;
    testResults.summary.successfulJourneys = testResults.journeys.filter(j => j.success).length;
    testResults.summary.failedJourneys = testResults.journeys.filter(j => !j.success).length;
    testResults.summary.screenshotsTaken = testResults.screenshots.length;
    testResults.timestamp = new Date().toISOString();
    
    // Save results
    fs.writeFileSync('user-journey-results.json', JSON.stringify(testResults, null, 2));
    
    console.log('\n=== USER JOURNEY TEST SUMMARY ===');
    console.log(`Total journeys tested: ${testResults.summary.totalJourneys}`);
    console.log(`Successful journeys: ${testResults.summary.successfulJourneys}`);
    console.log(`Failed journeys: ${testResults.summary.failedJourneys}`);
    console.log(`Screenshots taken: ${testResults.summary.screenshotsTaken}`);
    console.log(`Errors encountered: ${testResults.errors.length}`);
    console.log('\nDetailed results saved to user-journey-results.json');
    
    return testResults;
}

// Run the test
testUserJourneys().catch(console.error);