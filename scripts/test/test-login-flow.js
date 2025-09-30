import puppeteer from 'puppeteer';
import fs from 'fs';

async function testLoginFlow() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    const results = {
        timestamp: new Date().toISOString(),
        tests: [],
        pageInfo: {},
        errors: [],
        screenshots: []
    };

    try {
        console.log('Navigating to application...');
        await page.goto('http://localhost:5201/', { waitUntil: 'networkidle2' });
        
        // Take initial screenshot
        await page.screenshot({ path: 'login-flow-01-initial.png' });
        results.screenshots.push('login-flow-01-initial.png');
        
        // Get page info
        results.pageInfo = {
            title: await page.title(),
            url: page.url()
        };
        
        console.log(`Page loaded: ${results.pageInfo.title}`);
        
        // Check initial state of Sign In button
        const initialSignInState = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const signInBtn = buttons.find(btn => btn.textContent.includes('Sign In'));
            return {
                found: !!signInBtn,
                disabled: signInBtn ? signInBtn.disabled : null,
                textContent: signInBtn ? signInBtn.textContent.trim() : null,
                className: signInBtn ? signInBtn.className : null
            };
        });
        
        results.tests.push({
            name: 'Initial Sign In button state',
            passed: initialSignInState.found,
            details: initialSignInState
        });
        
        console.log('Initial Sign In button state:', initialSignInState);
        
        // Get all role buttons
        const roleButtons = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.map(btn => ({
                text: btn.textContent.trim(),
                disabled: btn.disabled,
                className: btn.className,
                id: btn.id
            })).filter(btn => btn.text && !btn.text.includes('Sign In'));
        });
        
        console.log('Found role buttons:', roleButtons);
        
        // Test clicking admin role
        console.log('Testing admin role selection...');
        const adminClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const adminBtn = buttons.find(btn => btn.textContent.includes('admin'));
            if (adminBtn) {
                adminBtn.click();
                return true;
            }
            return false;
        });
        
        if (adminClicked) {
            // Wait a moment for any state changes
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Take screenshot after admin selection
            await page.screenshot({ path: 'login-flow-02-admin-selected.png' });
            results.screenshots.push('login-flow-02-admin-selected.png');
            
            // Check Sign In button state after admin selection
            const postAdminSignInState = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const signInBtn = buttons.find(btn => btn.textContent.includes('Sign In'));
                return {
                    found: !!signInBtn,
                    disabled: signInBtn ? signInBtn.disabled : null,
                    textContent: signInBtn ? signInBtn.textContent.trim() : null,
                    className: signInBtn ? signInBtn.className : null
                };
            });
            
            results.tests.push({
                name: 'Sign In button after admin selection',
                passed: postAdminSignInState.found && !postAdminSignInState.disabled,
                details: postAdminSignInState
            });
            
            console.log('Sign In button after admin selection:', postAdminSignInState);
            
            // Check if there are any input fields that might need to be filled
            const inputFields = await page.evaluate(() => {
                const inputs = Array.from(document.querySelectorAll('input'));
                return inputs.map(input => ({
                    type: input.type,
                    placeholder: input.placeholder,
                    required: input.required,
                    value: input.value,
                    name: input.name,
                    id: input.id
                }));
            });
            
            console.log('Found input fields:', inputFields);
            results.pageInfo.inputFields = inputFields;
            
            // If Sign In button is still disabled, check if we need credentials
            if (postAdminSignInState.disabled && inputFields.length > 0) {
                console.log('Trying to fill credentials...');
                
                // Try to fill username/email field
                const usernameField = inputFields.find(field => 
                    field.type === 'text' || field.type === 'email' || 
                    field.placeholder?.toLowerCase().includes('username') ||
                    field.placeholder?.toLowerCase().includes('email')
                );
                
                // Try to fill password field
                const passwordField = inputFields.find(field => field.type === 'password');
                
                if (usernameField) {
                    await page.evaluate((fieldInfo) => {
                        const input = document.querySelector(`input[type="${fieldInfo.type}"]`);
                        if (input) {
                            input.value = 'admin';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }, usernameField);
                }
                
                if (passwordField) {
                    await page.evaluate(() => {
                        const input = document.querySelector('input[type="password"]');
                        if (input) {
                            input.value = 'admin';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                }
                
                // Wait for any validation
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check Sign In button state after filling credentials
                const postCredentialsSignInState = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const signInBtn = buttons.find(btn => btn.textContent.includes('Sign In'));
                    return {
                        found: !!signInBtn,
                        disabled: signInBtn ? signInBtn.disabled : null,
                        textContent: signInBtn ? signInBtn.textContent.trim() : null,
                        className: signInBtn ? signInBtn.className : null
                    };
                });
                
                results.tests.push({
                    name: 'Sign In button after credentials',
                    passed: postCredentialsSignInState.found && !postCredentialsSignInState.disabled,
                    details: postCredentialsSignInState
                });
                
                console.log('Sign In button after credentials:', postCredentialsSignInState);
                
                // Take screenshot after filling credentials
                await page.screenshot({ path: 'login-flow-03-credentials-filled.png' });
                results.screenshots.push('login-flow-03-credentials-filled.png');
                
                // Try to click Sign In if enabled
                if (!postCredentialsSignInState.disabled) {
                    console.log('Attempting to sign in...');
                    
                    const signInClicked = await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const signInBtn = buttons.find(btn => btn.textContent.includes('Sign In'));
                        if (signInBtn && !signInBtn.disabled) {
                            signInBtn.click();
                            return true;
                        }
                        return false;
                    });
                    
                    if (signInClicked) {
                        // Wait for navigation or response
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        // Take screenshot after sign in attempt
                        await page.screenshot({ path: 'login-flow-04-after-signin.png' });
                        results.screenshots.push('login-flow-04-after-signin.png');
                        
                        // Check if we're on a different page or if there are errors
                        const postSignInInfo = {
                            title: await page.title(),
                            url: page.url(),
                            hasErrorMessages: await page.evaluate(() => {
                                const errorSelectors = ['.error', '.alert-danger', '[role="alert"]', '.text-red', '.text-danger'];
                                return errorSelectors.some(selector => document.querySelector(selector));
                            })
                        };
                        
                        results.tests.push({
                            name: 'Sign in attempt result',
                            passed: postSignInInfo.url !== 'http://localhost:5201/' || postSignInInfo.title !== results.pageInfo.title,
                            details: postSignInInfo
                        });
                        
                        console.log('Post sign-in info:', postSignInInfo);
                    }
                }
            }
        }
        
        // Get console logs
        const logs = await page.evaluate(() => {
            return window.console._logs || [];
        });
        
        results.pageInfo.consoleLogs = logs;
        
    } catch (error) {
        console.error('Test error:', error);
        results.errors.push({
            message: error.message,
            stack: error.stack
        });
    } finally {
        await browser.close();
    }
    
    // Save results
    fs.writeFileSync('login-flow-results.json', JSON.stringify(results, null, 2));
    console.log('\n=== LOGIN FLOW TEST RESULTS ===');
    console.log(`Tests run: ${results.tests.length}`);
    console.log(`Tests passed: ${results.tests.filter(t => t.passed).length}`);
    console.log(`Screenshots taken: ${results.screenshots.length}`);
    console.log('Detailed results saved to login-flow-results.json');
    
    return results;
}

testLoginFlow().catch(console.error);