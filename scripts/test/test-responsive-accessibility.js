// ABOUTME: Responsive design and accessibility testing script for SchoolPilot application
// ABOUTME: Tests viewport responsiveness and basic accessibility features

import puppeteer from 'puppeteer';
import fs from 'fs';

const TARGET_URL = 'http://localhost:5202/';
const TIMEOUT = 30000;

async function testResponsiveAccessibility() {
    let browser;
    const testResults = {
        responsiveTests: [],
        accessibilityTests: [],
        screenshots: [],
        errors: [],
        summary: {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0
        }
    };

    try {
        console.log('Starting responsive design and accessibility testing...');
        
        browser = await puppeteer.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        page.setDefaultTimeout(TIMEOUT);
        
        let screenshotCounter = 1;
        
        // Helper function to take screenshot
        async function takeScreenshot(name, description) {
            try {
                const filename = `responsive-${String(screenshotCounter).padStart(2, '0')}-${name}.png`;
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
        
        // Navigate to application
        console.log('Navigating to application...');
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test 1: Responsive Design - Multiple Viewports
        console.log('\n=== Test 1: Responsive Design - Multiple Viewports ===');
        const viewports = [
            { name: 'Desktop', width: 1920, height: 1080 },
            { name: 'Laptop', width: 1366, height: 768 },
            { name: 'Tablet', width: 768, height: 1024 },
            { name: 'Mobile', width: 375, height: 667 },
            { name: 'Small Mobile', width: 320, height: 568 }
        ];
        
        for (const viewport of viewports) {
            const test = { name: `Responsive - ${viewport.name}`, success: false, details: [] };
            testResults.summary.totalTests++;
            
            try {
                console.log(`Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})...`);
                
                await page.setViewport({ width: viewport.width, height: viewport.height });
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if content is visible and properly laid out
                const bodyRect = await page.evaluate(() => {
                    const body = document.body;
                    const rect = body.getBoundingClientRect();
                    return {
                        width: rect.width,
                        height: rect.height,
                        hasHorizontalScroll: body.scrollWidth > body.clientWidth,
                        hasVerticalScroll: body.scrollHeight > body.clientHeight
                    };
                });
                
                test.details.push(`Body dimensions: ${bodyRect.width}x${bodyRect.height}`);
                test.details.push(`Horizontal scroll: ${bodyRect.hasHorizontalScroll}`);
                test.details.push(`Vertical scroll: ${bodyRect.hasVerticalScroll}`);
                
                // Check for responsive elements
                const responsiveElements = await page.evaluate(() => {
                    const elements = document.querySelectorAll('*');
                    let flexElements = 0;
                    let gridElements = 0;
                    let responsiveImages = 0;
                    
                    elements.forEach(el => {
                        const style = window.getComputedStyle(el);
                        if (style.display === 'flex') flexElements++;
                        if (style.display === 'grid') gridElements++;
                        if (el.tagName === 'IMG' && (el.style.maxWidth === '100%' || style.maxWidth === '100%')) {
                            responsiveImages++;
                        }
                    });
                    
                    return { flexElements, gridElements, responsiveImages };
                });
                
                test.details.push(`Flex elements: ${responsiveElements.flexElements}`);
                test.details.push(`Grid elements: ${responsiveElements.gridElements}`);
                test.details.push(`Responsive images: ${responsiveElements.responsiveImages}`);
                
                await takeScreenshot(`${viewport.name.toLowerCase()}-viewport`, `${viewport.name} viewport test`);
                
                test.success = true;
                testResults.summary.passedTests++;
                console.log(`✓ ${viewport.name} viewport test passed`);
                
            } catch (error) {
                test.details.push(`Error: ${error.message}`);
                testResults.summary.failedTests++;
                console.log(`✗ ${viewport.name} viewport test failed: ${error.message}`);
            }
            
            testResults.responsiveTests.push(test);
        }
        
        // Reset to standard viewport for accessibility tests
        await page.setViewport({ width: 1280, height: 720 });
        
        // Test 2: Basic Accessibility Features
        console.log('\n=== Test 2: Basic Accessibility Features ===');
        
        // Test 2a: Alt text for images
        const altTextTest = { name: 'Image Alt Text', success: false, details: [] };
        testResults.summary.totalTests++;
        
        try {
            const imageData = await page.evaluate(() => {
                const images = document.querySelectorAll('img');
                let totalImages = images.length;
                let imagesWithAlt = 0;
                let imagesWithEmptyAlt = 0;
                
                images.forEach(img => {
                    if (img.hasAttribute('alt')) {
                        if (img.alt.trim() !== '') {
                            imagesWithAlt++;
                        } else {
                            imagesWithEmptyAlt++;
                        }
                    }
                });
                
                return { totalImages, imagesWithAlt, imagesWithEmptyAlt };
            });
            
            altTextTest.details.push(`Total images: ${imageData.totalImages}`);
            altTextTest.details.push(`Images with alt text: ${imageData.imagesWithAlt}`);
            altTextTest.details.push(`Images with empty alt: ${imageData.imagesWithEmptyAlt}`);
            
            if (imageData.totalImages === 0 || imageData.imagesWithAlt > 0) {
                altTextTest.success = true;
                testResults.summary.passedTests++;
                console.log('✓ Image alt text test passed');
            } else {
                testResults.summary.failedTests++;
                console.log('✗ Image alt text test failed');
            }
        } catch (error) {
            altTextTest.details.push(`Error: ${error.message}`);
            testResults.summary.failedTests++;
            console.log(`✗ Image alt text test failed: ${error.message}`);
        }
        
        testResults.accessibilityTests.push(altTextTest);
        
        // Test 2b: Form labels
        const formLabelTest = { name: 'Form Labels', success: false, details: [] };
        testResults.summary.totalTests++;
        
        try {
            const formData = await page.evaluate(() => {
                const inputs = document.querySelectorAll('input, select, textarea');
                let totalInputs = inputs.length;
                let inputsWithLabels = 0;
                let inputsWithPlaceholders = 0;
                
                inputs.forEach(input => {
                    // Check for associated label
                    const label = document.querySelector(`label[for="${input.id}"]`) || 
                                input.closest('label');
                    if (label) inputsWithLabels++;
                    
                    // Check for placeholder
                    if (input.placeholder && input.placeholder.trim() !== '') {
                        inputsWithPlaceholders++;
                    }
                });
                
                return { totalInputs, inputsWithLabels, inputsWithPlaceholders };
            });
            
            formLabelTest.details.push(`Total form inputs: ${formData.totalInputs}`);
            formLabelTest.details.push(`Inputs with labels: ${formData.inputsWithLabels}`);
            formLabelTest.details.push(`Inputs with placeholders: ${formData.inputsWithPlaceholders}`);
            
            if (formData.totalInputs === 0 || formData.inputsWithLabels > 0 || formData.inputsWithPlaceholders > 0) {
                formLabelTest.success = true;
                testResults.summary.passedTests++;
                console.log('✓ Form labels test passed');
            } else {
                testResults.summary.failedTests++;
                console.log('✗ Form labels test failed');
            }
        } catch (error) {
            formLabelTest.details.push(`Error: ${error.message}`);
            testResults.summary.failedTests++;
            console.log(`✗ Form labels test failed: ${error.message}`);
        }
        
        testResults.accessibilityTests.push(formLabelTest);
        
        // Test 2c: Keyboard navigation
        const keyboardTest = { name: 'Keyboard Navigation', success: false, details: [] };
        testResults.summary.totalTests++;
        
        try {
            // Test Tab navigation
            console.log('Testing keyboard navigation...');
            
            const focusableElements = await page.evaluate(() => {
                const focusable = document.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                return focusable.length;
            });
            
            keyboardTest.details.push(`Focusable elements found: ${focusableElements}`);
            
            if (focusableElements > 0) {
                // Test Tab key
                await page.keyboard.press('Tab');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const activeElement = await page.evaluate(() => {
                    const active = document.activeElement;
                    return {
                        tagName: active.tagName,
                        type: active.type || 'N/A',
                        hasVisibleFocus: window.getComputedStyle(active).outline !== 'none'
                    };
                });
                
                keyboardTest.details.push(`First tab focus: ${activeElement.tagName} (${activeElement.type})`);
                keyboardTest.details.push(`Visible focus indicator: ${activeElement.hasVisibleFocus}`);
                
                await takeScreenshot('keyboard-focus', 'Keyboard focus test');
                
                keyboardTest.success = true;
                testResults.summary.passedTests++;
                console.log('✓ Keyboard navigation test passed');
            } else {
                keyboardTest.details.push('No focusable elements found');
                testResults.summary.failedTests++;
                console.log('✗ Keyboard navigation test failed');
            }
        } catch (error) {
            keyboardTest.details.push(`Error: ${error.message}`);
            testResults.summary.failedTests++;
            console.log(`✗ Keyboard navigation test failed: ${error.message}`);
        }
        
        testResults.accessibilityTests.push(keyboardTest);
        
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
    console.log('\n=== RESPONSIVE & ACCESSIBILITY TEST SUMMARY ===');
    console.log(`Total tests: ${testResults.summary.totalTests}`);
    console.log(`Passed tests: ${testResults.summary.passedTests}`);
    console.log(`Failed tests: ${testResults.summary.failedTests}`);
    console.log(`Screenshots taken: ${testResults.screenshots.length}`);
    console.log(`Errors encountered: ${testResults.errors.length}`);
    
    // Save results
    fs.writeFileSync('responsive-accessibility-results.json', JSON.stringify(testResults, null, 2));
    console.log('\nDetailed results saved to responsive-accessibility-results.json');
    
    return testResults;
}

testResponsiveAccessibility().catch(console.error);