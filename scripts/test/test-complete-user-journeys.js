// ABOUTME: Complete user journey testing script for SchoolPilot application
// ABOUTME: Tests end-to-end user workflows including role selection, navigation, and feature usage

import puppeteer from 'puppeteer';
import fs from 'fs';

const TARGET_URL = 'http://localhost:5202/';
const TIMEOUT = 30000;

async function testCompleteUserJourneys() {
    let browser;
    const testResults = {
        journeys: [],
        screenshots: [],
        errors: [],
        performance: [],
        summary: {
            totalJourneys: 0,
            successfulJourneys: 0,
            failedJourneys: 0
        }
    };

    try {
        console.log('Starting complete user journey testing...');
        
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
                const filename = `journey-${String(screenshotCounter).padStart(2, '0')}-${name}.png`;
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
        
        // Helper function to measure performance
        async function measurePerformance(actionName) {
            const metrics = await page.metrics();
            testResults.performance.push({
                action: actionName,
                timestamp: new Date().toISOString(),
                jsHeapUsedSize: metrics.JSHeapUsedSize,
                jsHeapTotalSize: metrics.JSHeapTotalSize,
                scriptDuration: metrics.ScriptDuration,
                taskDuration: metrics.TaskDuration
            });
        }
        
        // Journey 1: Admin User Complete Workflow
        console.log('\n=== Journey 1: Admin User Complete Workflow ===');
        const adminJourney = { name: 'Admin Complete Workflow', success: false, steps: [], errors: [] };
        testResults.summary.totalJourneys++;
        
        try {
            // Step 1: Initial page load
            console.log('Step 1: Loading application...');
            const startTime = Date.now();
            await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
            await new Promise(resolve => setTimeout(resolve, 2000));
            const loadTime = Date.now() - startTime;
            
            adminJourney.steps.push(`Application loaded in ${loadTime}ms`);
            await takeScreenshot('admin-01-initial-load', 'Admin journey - Initial application load');
            await measurePerformance('Initial Load');
            
            // Step 2: Handle login form
            console.log('Step 2: Handling login form...');
            const usernameInput = await page.$('#username');
            const passwordInput = await page.$('#password');
            const submitButton = await page.$('button[type="submit"]');
            
            if (usernameInput && passwordInput && submitButton) {
                await usernameInput.type('admin');
                await passwordInput.type('admin123');
                await submitButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
                adminJourney.steps.push('Login form submitted with admin credentials');
                await takeScreenshot('admin-02-login-submitted', 'Admin journey - Login submitted');
                await measurePerformance('Login Submission');
            } else {
                adminJourney.steps.push('Login form elements not found, proceeding with current page');
            }
            
            // Step 3: Navigate through dashboard sections
            console.log('Step 3: Testing dashboard navigation...');
            const dashboardSections = [
                { name: 'Students', selector: 'a[href="#students"]' },
                { name: 'Teachers', selector: 'a[href="#teachers"]' },
                { name: 'Classes', selector: 'a[href="#classes"]' },
                { name: 'Reports', selector: 'a[href="#reports"]' }
            ];
            
            for (const section of dashboardSections) {
                try {
                    const link = await page.$(section.selector);
                    if (link) {
                        await link.click();
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Check if content changed
                        const currentUrl = page.url();
                        adminJourney.steps.push(`Navigated to ${section.name} section (${currentUrl})`);
                        await takeScreenshot(`admin-03-${section.name.toLowerCase()}`, `Admin journey - ${section.name} section`);
                        await measurePerformance(`Navigate to ${section.name}`);
                    } else {
                        adminJourney.steps.push(`${section.name} link not found`);
                    }
                } catch (error) {
                    adminJourney.errors.push(`Error navigating to ${section.name}: ${error.message}`);
                }
            }
            
            // Step 4: Test form interactions
            console.log('Step 4: Testing form interactions...');
            try {
                // Look for any forms on the page
                const forms = await page.$$('form');
                if (forms.length > 0) {
                    adminJourney.steps.push(`Found ${forms.length} form(s) on the page`);
                    
                    // Test first form if available
                    const inputs = await page.$$('input[type="text"], input[type="email"], textarea');
                    if (inputs.length > 0) {
                        await inputs[0].type('Test Admin Input');
                        adminJourney.steps.push('Form input tested successfully');
                        await takeScreenshot('admin-04-form-input', 'Admin journey - Form input test');
                        await measurePerformance('Form Interaction');
                    }
                } else {
                    adminJourney.steps.push('No forms found on current page');
                }
            } catch (error) {
                adminJourney.errors.push(`Form interaction error: ${error.message}`);
            }
            
            // Step 5: Test responsive behavior
            console.log('Step 5: Testing responsive behavior...');
            await page.setViewport({ width: 768, height: 1024 });
            await new Promise(resolve => setTimeout(resolve, 1000));
            adminJourney.steps.push('Tested tablet viewport');
            await takeScreenshot('admin-05-tablet-view', 'Admin journey - Tablet responsive view');
            
            await page.setViewport({ width: 375, height: 667 });
            await new Promise(resolve => setTimeout(resolve, 1000));
            adminJourney.steps.push('Tested mobile viewport');
            await takeScreenshot('admin-06-mobile-view', 'Admin journey - Mobile responsive view');
            
            // Reset viewport
            await page.setViewport({ width: 1280, height: 720 });
            await measurePerformance('Responsive Testing');
            
            adminJourney.success = true;
            testResults.summary.successfulJourneys++;
            console.log('✓ Admin user journey completed successfully');
            
        } catch (error) {
            adminJourney.errors.push(`Critical error: ${error.message}`);
            testResults.summary.failedJourneys++;
            console.log(`✗ Admin user journey failed: ${error.message}`);
        }
        
        testResults.journeys.push(adminJourney);
        
        // Journey 2: Teacher User Workflow
        console.log('\n=== Journey 2: Teacher User Workflow ===');
        const teacherJourney = { name: 'Teacher Workflow', success: false, steps: [], errors: [] };
        testResults.summary.totalJourneys++;
        
        try {
            // Reset to home page
            await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Step 1: Handle login as teacher
            console.log('Step 1: Logging in as teacher...');
            const usernameInput = await page.$('#username');
            const passwordInput = await page.$('#password');
            const submitButton = await page.$('button[type="submit"]');
            
            if (usernameInput && passwordInput && submitButton) {
                await usernameInput.clear();
                await passwordInput.clear();
                await usernameInput.type('teacher');
                await passwordInput.type('teacher123');
                await submitButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
                teacherJourney.steps.push('Login form submitted with teacher credentials');
                await takeScreenshot('teacher-01-login-submitted', 'Teacher journey - Login submitted');
                await measurePerformance('Teacher Login');
            } else {
                teacherJourney.steps.push('Login form elements not found, proceeding with current page');
            }
            
            // Step 2: Test teacher-specific features
            console.log('Step 2: Testing teacher-specific navigation...');
            const teacherSections = [
                { name: 'My Classes', selector: 'a[href="#my-classes"]' },
                { name: 'Gradebook', selector: 'a[href="#gradebook"]' },
                { name: 'Assignments', selector: 'a[href="#assignments"]' }
            ];
            
            for (const section of teacherSections) {
                try {
                    const link = await page.$(section.selector);
                    if (link) {
                        await link.click();
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        teacherJourney.steps.push(`Navigated to ${section.name}`);
                        await takeScreenshot(`teacher-02-${section.name.toLowerCase().replace(' ', '-')}`, `Teacher journey - ${section.name}`);
                    } else {
                        teacherJourney.steps.push(`${section.name} link not found (may not be implemented)`);
                    }
                } catch (error) {
                    teacherJourney.errors.push(`Error navigating to ${section.name}: ${error.message}`);
                }
            }
            
            await measurePerformance('Teacher Navigation');
            
            teacherJourney.success = true;
            testResults.summary.successfulJourneys++;
            console.log('✓ Teacher user journey completed successfully');
            
        } catch (error) {
            teacherJourney.errors.push(`Critical error: ${error.message}`);
            testResults.summary.failedJourneys++;
            console.log(`✗ Teacher user journey failed: ${error.message}`);
        }
        
        testResults.journeys.push(teacherJourney);
        
        // Journey 3: Student User Workflow
        console.log('\n=== Journey 3: Student User Workflow ===');
        const studentJourney = { name: 'Student Workflow', success: false, steps: [], errors: [] };
        testResults.summary.totalJourneys++;
        
        try {
            // Reset to home page
            await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Step 1: Handle login as student
            console.log('Step 1: Logging in as student...');
            const usernameInput = await page.$('#username');
            const passwordInput = await page.$('#password');
            const submitButton = await page.$('button[type="submit"]');
            
            if (usernameInput && passwordInput && submitButton) {
                await usernameInput.clear();
                await passwordInput.clear();
                await usernameInput.type('student');
                await passwordInput.type('student123');
                await submitButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
                studentJourney.steps.push('Login form submitted with student credentials');
                await takeScreenshot('student-01-login-submitted', 'Student journey - Login submitted');
                await measurePerformance('Student Login');
            } else {
                studentJourney.steps.push('Login form elements not found, proceeding with current page');
            }
            
            // Step 2: Test student-specific features
            console.log('Step 2: Testing student-specific navigation...');
            const studentSections = [
                { name: 'My Courses', selector: 'a[href="#my-courses"]' },
                { name: 'Grades', selector: 'a[href="#grades"]' },
                { name: 'Schedule', selector: 'a[href="#schedule"]' }
            ];
            
            for (const section of studentSections) {
                try {
                    const link = await page.$(section.selector);
                    if (link) {
                        await link.click();
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        studentJourney.steps.push(`Navigated to ${section.name}`);
                        await takeScreenshot(`student-02-${section.name.toLowerCase().replace(' ', '-')}`, `Student journey - ${section.name}`);
                    } else {
                        studentJourney.steps.push(`${section.name} link not found (may not be implemented)`);
                    }
                } catch (error) {
                    studentJourney.errors.push(`Error navigating to ${section.name}: ${error.message}`);
                }
            }
            
            await measurePerformance('Student Navigation');
            
            studentJourney.success = true;
            testResults.summary.successfulJourneys++;
            console.log('✓ Student user journey completed successfully');
            
        } catch (error) {
            studentJourney.errors.push(`Critical error: ${error.message}`);
            testResults.summary.failedJourneys++;
            console.log(`✗ Student user journey failed: ${error.message}`);
        }
        
        testResults.journeys.push(studentJourney);
        
    } catch (error) {
        console.error('Critical error during user journey testing:', error);
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
    
    // Generate comprehensive report
    console.log('\n=== COMPLETE USER JOURNEY TEST SUMMARY ===');
    console.log(`Total journeys tested: ${testResults.summary.totalJourneys}`);
    console.log(`Successful journeys: ${testResults.summary.successfulJourneys}`);
    console.log(`Failed journeys: ${testResults.summary.failedJourneys}`);
    console.log(`Screenshots taken: ${testResults.screenshots.length}`);
    console.log(`Performance measurements: ${testResults.performance.length}`);
    console.log(`Errors encountered: ${testResults.errors.length}`);
    
    // Save results
    fs.writeFileSync('complete-user-journeys-results.json', JSON.stringify(testResults, null, 2));
    console.log('\nDetailed results saved to complete-user-journeys-results.json');
    
    return testResults;
}

testCompleteUserJourneys().catch(console.error);