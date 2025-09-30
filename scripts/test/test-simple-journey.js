// ABOUTME: Simplified user journey testing script for SchoolPilot application
// ABOUTME: Tests basic navigation and functionality with better error handling

import puppeteer from 'puppeteer';
import fs from 'fs';

const TARGET_URL = 'http://localhost:5202/';
const TIMEOUT = 60000;

async function testSimpleJourney() {
    let browser;
    const testResults = {
        tests: [],
        screenshots: [],
        errors: [],
        summary: {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0
        }
    };

    try {
        console.log('Starting simplified user journey testing...');
        
        // Launch browser with more permissive settings
        browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: { width: 1280, height: 720 },
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ],
            timeout: TIMEOUT
        });
        
        const page = await browser.newPage();
        
        // Set longer timeouts
        page.setDefaultTimeout(TIMEOUT);
        page.setDefaultNavigationTimeout(TIMEOUT);
        
        let screenshotCounter = 1;
        
        // Helper function to take screenshot
        async function takeScreenshot(name, description) {
            try {
                const filename = `simple-journey-${String(screenshotCounter).padStart(2, '0')}-${name}.png`;
                await page.screenshot({ path: filename, fullPage: false });
                testResults.screenshots.push({ filename, description, timestamp: new Date().toISOString() });
                screenshotCounter++;
                console.log(`✓ Screenshot taken: ${filename}`);
                return true;
            } catch (error) {
                console.log(`✗ Screenshot failed: ${error.message}`);
                return false;
            }
        }
        
        // Test 1: Basic Navigation
        console.log('\n=== Test 1: Basic Navigation ===');
        const test1 = { name: 'Basic Navigation', success: false, details: [] };
        testResults.summary.totalTests++;
        
        try {
            console.log('Attempting to navigate to application...');
            
            // Try multiple navigation strategies
            let navigationSuccess = false;
            const strategies = [
                { waitUntil: 'domcontentloaded' },
                { waitUntil: 'load' },
                { waitUntil: 'networkidle0' },
                { waitUntil: 'networkidle2' }
            ];
            
            for (const strategy of strategies) {
                try {
                    console.log(`Trying navigation with waitUntil: ${strategy.waitUntil}`);
                    await page.goto(TARGET_URL, { ...strategy, timeout: 30000 });
                    navigationSuccess = true;
                    test1.details.push(`Navigation successful with ${strategy.waitUntil}`);
                    break;
                } catch (navError) {
                    console.log(`Navigation failed with ${strategy.waitUntil}: ${navError.message}`);
                    test1.details.push(`Navigation failed with ${strategy.waitUntil}`);
                }
            }
            
            if (navigationSuccess) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                await takeScreenshot('initial-load', 'Application loaded');
                
                // Check if page has content
                const title = await page.title();
                const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 100));
                
                test1.details.push(`Page title: ${title}`);
                test1.details.push(`Body content preview: ${bodyText}`);
                test1.success = true;
                testResults.summary.passedTests++;
                console.log('✓ Basic navigation test passed');
            } else {
                test1.details.push('All navigation strategies failed');
                testResults.summary.failedTests++;
                console.log('✗ Basic navigation test failed');
            }
        } catch (error) {
            test1.details.push(`Error: ${error.message}`);
            testResults.summary.failedTests++;
            console.log(`✗ Basic navigation test failed: ${error.message}`);
        }
        
        testResults.tests.push(test1);
        
        // Test 2: Page Elements Detection
        if (test1.success) {
            console.log('\n=== Test 2: Page Elements Detection ===');
            const test2 = { name: 'Page Elements Detection', success: false, details: [] };
            testResults.summary.totalTests++;
            
            try {
                // Look for common elements
                const elements = {
                    buttons: await page.$$('button'),
                    links: await page.$$('a'),
                    inputs: await page.$$('input'),
                    forms: await page.$$('form'),
                    divs: await page.$$('div')
                };
                
                for (const [type, elementList] of Object.entries(elements)) {
                    test2.details.push(`Found ${elementList.length} ${type}`);
                }
                
                // Check for role-specific buttons
                const roleButtons = await page.$$('[data-role]');
                test2.details.push(`Found ${roleButtons.length} role buttons`);
                
                if (roleButtons.length > 0) {
                    for (const button of roleButtons) {
                        const role = await button.evaluate(el => el.getAttribute('data-role'));
                        test2.details.push(`Role button found: ${role}`);
                    }
                }
                
                await takeScreenshot('elements-detected', 'Page elements detected');
                test2.success = true;
                testResults.summary.passedTests++;
                console.log('✓ Page elements detection test passed');
            } catch (error) {
                test2.details.push(`Error: ${error.message}`);
                testResults.summary.failedTests++;
                console.log(`✗ Page elements detection test failed: ${error.message}`);
            }
            
            testResults.tests.push(test2);
        }
        
        // Test 3: Interactive Elements Test
        if (test1.success) {
            console.log('\n=== Test 3: Interactive Elements Test ===');
            const test3 = { name: 'Interactive Elements Test', success: false, details: [] };
            testResults.summary.totalTests++;
            
            try {
                // Try to interact with role buttons if they exist
                const adminButton = await page.$('[data-role="admin"]');
                if (adminButton) {
                    console.log('Found admin button, attempting to click...');
                    await adminButton.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await takeScreenshot('admin-clicked', 'After admin button click');
                    test3.details.push('Admin button clicked successfully');
                    test3.success = true;
                } else {
                    // Try clicking any button
                    const buttons = await page.$$('button');
                    if (buttons.length > 0) {
                        console.log(`Found ${buttons.length} buttons, testing first one...`);
                        await buttons[0].click();
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await takeScreenshot('button-clicked', 'After button click');
                        test3.details.push('Button interaction test completed');
                        test3.success = true;
                    } else {
                        test3.details.push('No interactive buttons found');
                    }
                }
                
                if (test3.success) {
                    testResults.summary.passedTests++;
                    console.log('✓ Interactive elements test passed');
                } else {
                    testResults.summary.failedTests++;
                    console.log('✗ Interactive elements test failed');
                }
            } catch (error) {
                test3.details.push(`Error: ${error.message}`);
                testResults.summary.failedTests++;
                console.log(`✗ Interactive elements test failed: ${error.message}`);
            }
            
            testResults.tests.push(test3);
        }
        
    } catch (error) {
        console.error('Critical error during testing:', error);
        testResults.errors.push({
            type: 'Critical Error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    // Generate report
    console.log('\n=== SIMPLE JOURNEY TEST SUMMARY ===');
    console.log(`Total tests: ${testResults.summary.totalTests}`);
    console.log(`Passed tests: ${testResults.summary.passedTests}`);
    console.log(`Failed tests: ${testResults.summary.failedTests}`);
    console.log(`Screenshots taken: ${testResults.screenshots.length}`);
    console.log(`Errors encountered: ${testResults.errors.length}`);
    
    // Save results
    fs.writeFileSync('simple-journey-results.json', JSON.stringify(testResults, null, 2));
    console.log('\nDetailed results saved to simple-journey-results.json');
    
    return testResults;
}

testSimpleJourney().catch(console.error);