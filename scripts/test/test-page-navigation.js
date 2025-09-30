import puppeteer from 'puppeteer';
import fs from 'fs';

async function testPageNavigation() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    const results = {
        timestamp: new Date().toISOString(),
        navigationFlow: [],
        errors: [],
        screenshots: []
    };

    try {
        console.log('=== TESTING PAGE NAVIGATION FLOW ===');
        
        // Step 1: Initial page load
        console.log('1. Loading initial page...');
        await page.goto('http://localhost:5201/', { waitUntil: 'networkidle2' });
        
        const initialState = {
            step: 'initial_load',
            url: page.url(),
            title: await page.title(),
            pageContent: await page.evaluate(() => {
                return {
                    bodyText: document.body.innerText.substring(0, 500),
                    buttonCount: document.querySelectorAll('button').length,
                    inputCount: document.querySelectorAll('input').length,
                    linkCount: document.querySelectorAll('a').length,
                    hasSignInButton: !!Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Sign In'))
                };
            })
        };
        
        await page.screenshot({ path: 'nav-01-initial.png' });
        results.screenshots.push('nav-01-initial.png');
        results.navigationFlow.push(initialState);
        
        console.log('Initial state:', initialState);
        
        // Step 2: Click admin role and capture immediate changes
        console.log('2. Clicking admin role...');
        
        // Set up navigation listener
        let navigationOccurred = false;
        page.on('framenavigated', () => {
            navigationOccurred = true;
            console.log('Navigation detected!');
        });
        
        const adminClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const adminBtn = buttons.find(btn => btn.textContent.includes('admin'));
            if (adminBtn) {
                console.log('Clicking admin button:', adminBtn.textContent);
                adminBtn.click();
                return true;
            }
            return false;
        });
        
        if (adminClicked) {
            // Wait for any navigation or DOM changes
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const postAdminState = {
                step: 'after_admin_click',
                url: page.url(),
                title: await page.title(),
                navigationOccurred,
                pageContent: await page.evaluate(() => {
                    return {
                        bodyText: document.body.innerText.substring(0, 500),
                        buttonCount: document.querySelectorAll('button').length,
                        inputCount: document.querySelectorAll('input').length,
                        linkCount: document.querySelectorAll('a').length,
                        hasSignInButton: !!Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Sign In')),
                        visibleButtons: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent.trim()).filter(text => text),
                        visibleInputs: Array.from(document.querySelectorAll('input')).map(input => ({
                            type: input.type,
                            placeholder: input.placeholder,
                            name: input.name
                        }))
                    };
                })
            };
            
            await page.screenshot({ path: 'nav-02-after-admin.png' });
            results.screenshots.push('nav-02-after-admin.png');
            results.navigationFlow.push(postAdminState);
            
            console.log('Post-admin state:', postAdminState);
            
            // Step 3: Check if we're on a login form now
            if (postAdminState.pageContent.visibleInputs.length > 1) {
                console.log('3. Found login form, testing credential input...');
                
                // Try to find and fill username/email field
                const usernameInput = postAdminState.pageContent.visibleInputs.find(input => 
                    input.type === 'text' || input.type === 'email' ||
                    input.placeholder?.toLowerCase().includes('username') ||
                    input.placeholder?.toLowerCase().includes('email') ||
                    input.name?.toLowerCase().includes('username') ||
                    input.name?.toLowerCase().includes('email')
                );
                
                // Try to find password field
                const passwordInput = postAdminState.pageContent.visibleInputs.find(input => 
                    input.type === 'password'
                );
                
                if (usernameInput || passwordInput) {
                    console.log('Found login fields:', { usernameInput, passwordInput });
                    
                    // Fill username if found
                    if (usernameInput) {
                        await page.evaluate((inputType) => {
                            const input = document.querySelector(`input[type="${inputType}"]`) || 
                                         document.querySelector('input[placeholder*="username" i]') ||
                                         document.querySelector('input[placeholder*="email" i]');
                            if (input) {
                                input.focus();
                                input.value = 'admin';
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }, usernameInput.type);
                    }
                    
                    // Fill password if found
                    if (passwordInput) {
                        await page.evaluate(() => {
                            const input = document.querySelector('input[type="password"]');
                            if (input) {
                                input.focus();
                                input.value = 'admin';
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        });
                    }
                    
                    // Wait for validation
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    const postCredentialsState = {
                        step: 'after_credentials',
                        url: page.url(),
                        title: await page.title(),
                        pageContent: await page.evaluate(() => {
                            return {
                                bodyText: document.body.innerText.substring(0, 500),
                                buttonCount: document.querySelectorAll('button').length,
                                hasSignInButton: !!Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Sign In')),
                                signInButtonEnabled: (() => {
                                    const btn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Sign In'));
                                    return btn ? !btn.disabled : false;
                                })()
                            };
                        })
                    };
                    
                    await page.screenshot({ path: 'nav-03-credentials-filled.png' });
                    results.screenshots.push('nav-03-credentials-filled.png');
                    results.navigationFlow.push(postCredentialsState);
                    
                    console.log('Post-credentials state:', postCredentialsState);
                    
                    // Step 4: Try to sign in if button is enabled
                    if (postCredentialsState.pageContent.signInButtonEnabled) {
                        console.log('4. Sign In button enabled, attempting login...');
                        
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
                            // Wait for login response
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            
                            const postLoginState = {
                                step: 'after_login_attempt',
                                url: page.url(),
                                title: await page.title(),
                                pageContent: await page.evaluate(() => {
                                    return {
                                        bodyText: document.body.innerText.substring(0, 500),
                                        hasErrorMessage: !!document.querySelector('.error, .alert-danger, [role="alert"], .text-red, .text-danger'),
                                        currentPageIndicators: {
                                            hasDashboard: document.body.innerText.toLowerCase().includes('dashboard'),
                                            hasWelcome: document.body.innerText.toLowerCase().includes('welcome'),
                                            hasLogout: !!Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.toLowerCase().includes('logout')),
                                            hasNavigation: document.querySelectorAll('nav').length > 0
                                        }
                                    };
                                })
                            };
                            
                            await page.screenshot({ path: 'nav-04-after-login.png' });
                            results.screenshots.push('nav-04-after-login.png');
                            results.navigationFlow.push(postLoginState);
                            
                            console.log('Post-login state:', postLoginState);
                        }
                    } else {
                        console.log('Sign In button not enabled after filling credentials');
                    }
                } else {
                    console.log('No recognizable login fields found');
                }
            } else {
                console.log('No login form detected after admin selection');
            }
        }
        
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
    fs.writeFileSync('navigation-test-results.json', JSON.stringify(results, null, 2));
    
    console.log('\n=== NAVIGATION TEST RESULTS ===');
    console.log(`Steps captured: ${results.navigationFlow.length}`);
    console.log(`Screenshots taken: ${results.screenshots.length}`);
    console.log(`Errors: ${results.errors.length}`);
    
    results.navigationFlow.forEach((step, index) => {
        console.log(`\nStep ${index + 1}: ${step.step}`);
        console.log(`  URL: ${step.url}`);
        console.log(`  Title: ${step.title}`);
        if (step.pageContent) {
            console.log(`  Buttons: ${step.pageContent.buttonCount}`);
            console.log(`  Inputs: ${step.pageContent.inputCount}`);
            console.log(`  Has Sign In: ${step.pageContent.hasSignInButton}`);
        }
    });
    
    console.log('\nDetailed results saved to navigation-test-results.json');
    
    return results;
}

testPageNavigation().catch(console.error);