import puppeteer from 'puppeteer';
import fs from 'fs';

async function testNavigationLinks() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    const results = {
        timestamp: new Date().toISOString(),
        navigationTests: [],
        linkTests: [],
        errors: [],
        screenshots: [],
        summary: {
            totalLinks: 0,
            workingLinks: 0,
            brokenLinks: 0,
            navigationItems: 0,
            workingNavigation: 0,
            brokenNavigation: 0
        }
    };

    try {
        console.log('=== TESTING NAVIGATION LINKS ===');
        
        // Step 1: Login to get to dashboard
        console.log('1. Logging in to access dashboard...');
        await page.goto('http://localhost:5201/', { waitUntil: 'networkidle2' });
        
        // Click admin role to login
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const adminBtn = buttons.find(btn => btn.textContent.includes('admin'));
            if (adminBtn) {
                adminBtn.click();
            }
        });
        
        // Wait for dashboard to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await page.screenshot({ path: 'nav-links-01-dashboard.png' });
        results.screenshots.push('nav-links-01-dashboard.png');
        
        // Step 2: Get all navigation items
        console.log('2. Identifying navigation items...');
        
        const navigationItems = await page.evaluate(() => {
            // Look for navigation buttons and links
            const navButtons = Array.from(document.querySelectorAll('button'))
                .filter(btn => {
                    const text = btn.textContent.trim();
                    const navItems = ['Dashboard', 'Administration', 'Academics', 'Finance', 'HR', 'Inventory', 'Library', 'Nutrition', 'Reports', 'Settings'];
                    return navItems.some(item => text.includes(item));
                })
                .map(btn => ({
                    type: 'button',
                    text: btn.textContent.trim(),
                    className: btn.className,
                    disabled: btn.disabled
                }));
            
            const navLinks = Array.from(document.querySelectorAll('a'))
                .filter(link => link.href && !link.href.includes('javascript:'))
                .map(link => ({
                    type: 'link',
                    text: link.textContent.trim(),
                    href: link.href,
                    target: link.target
                }));
            
            return { buttons: navButtons, links: navLinks };
        });
        
        console.log(`Found ${navigationItems.buttons.length} navigation buttons and ${navigationItems.links.length} links`);
        results.summary.navigationItems = navigationItems.buttons.length;
        results.summary.totalLinks = navigationItems.links.length;
        
        // Step 3: Test navigation buttons
        console.log('3. Testing navigation buttons...');
        
        for (let i = 0; i < navigationItems.buttons.length; i++) {
            const navItem = navigationItems.buttons[i];
            console.log(`Testing navigation: ${navItem.text}`);
            
            try {
                // Click the navigation item
                const clicked = await page.evaluate((itemText) => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const targetBtn = buttons.find(btn => btn.textContent.trim().includes(itemText));
                    if (targetBtn && !targetBtn.disabled) {
                        targetBtn.click();
                        return true;
                    }
                    return false;
                }, navItem.text);
                
                if (clicked) {
                    // Wait for navigation/content change
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Check the result
                    const navigationResult = await page.evaluate(() => {
                        return {
                            url: window.location.href,
                            title: document.title,
                            hasError: !!document.querySelector('.error, .alert-danger, [role="alert"], .text-red, .text-danger'),
                            contentChanged: document.body.innerText.length > 100,
                            hasContent: !document.body.innerText.toLowerCase().includes('404') && 
                                       !document.body.innerText.toLowerCase().includes('not found') &&
                                       !document.body.innerText.toLowerCase().includes('page not found'),
                            bodyPreview: document.body.innerText.substring(0, 200)
                        };
                    });
                    
                    const testResult = {
                        name: navItem.text,
                        type: 'navigation_button',
                        clicked: true,
                        url: navigationResult.url,
                        title: navigationResult.title,
                        hasError: navigationResult.hasError,
                        hasContent: navigationResult.hasContent,
                        contentChanged: navigationResult.contentChanged,
                        passed: navigationResult.hasContent && !navigationResult.hasError,
                        bodyPreview: navigationResult.bodyPreview
                    };
                    
                    results.navigationTests.push(testResult);
                    
                    if (testResult.passed) {
                        results.summary.workingNavigation++;
                        console.log(`  ✓ ${navItem.text} - Working`);
                    } else {
                        results.summary.brokenNavigation++;
                        console.log(`  ✗ ${navItem.text} - Issue detected`);
                    }
                    
                    // Take screenshot of the page
                    await page.screenshot({ path: `nav-links-${String(i + 2).padStart(2, '0')}-${navItem.text.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png` });
                    results.screenshots.push(`nav-links-${String(i + 2).padStart(2, '0')}-${navItem.text.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`);
                    
                } else {
                    results.navigationTests.push({
                        name: navItem.text,
                        type: 'navigation_button',
                        clicked: false,
                        passed: false,
                        error: 'Could not click navigation item'
                    });
                    results.summary.brokenNavigation++;
                    console.log(`  ✗ ${navItem.text} - Could not click`);
                }
                
            } catch (error) {
                results.navigationTests.push({
                    name: navItem.text,
                    type: 'navigation_button',
                    clicked: false,
                    passed: false,
                    error: error.message
                });
                results.summary.brokenNavigation++;
                console.log(`  ✗ ${navItem.text} - Error: ${error.message}`);
            }
        }
        
        // Step 4: Test regular links
        console.log('4. Testing regular links...');
        
        for (let i = 0; i < navigationItems.links.length; i++) {
            const link = navigationItems.links[i];
            console.log(`Testing link: ${link.text} -> ${link.href}`);
            
            try {
                // Navigate to the link
                const response = await page.goto(link.href, { 
                    waitUntil: 'networkidle2',
                    timeout: 10000
                });
                
                const linkResult = {
                    name: link.text || 'Unnamed Link',
                    type: 'regular_link',
                    href: link.href,
                    statusCode: response ? response.status() : null,
                    passed: response && response.status() < 400,
                    url: page.url(),
                    title: await page.title()
                };
                
                results.linkTests.push(linkResult);
                
                if (linkResult.passed) {
                    results.summary.workingLinks++;
                    console.log(`  ✓ ${link.text} - Status: ${linkResult.statusCode}`);
                } else {
                    results.summary.brokenLinks++;
                    console.log(`  ✗ ${link.text} - Status: ${linkResult.statusCode}`);
                }
                
                // Take screenshot
                await page.screenshot({ path: `link-test-${String(i + 1).padStart(2, '0')}.png` });
                results.screenshots.push(`link-test-${String(i + 1).padStart(2, '0')}.png`);
                
            } catch (error) {
                results.linkTests.push({
                    name: link.text || 'Unnamed Link',
                    type: 'regular_link',
                    href: link.href,
                    passed: false,
                    error: error.message
                });
                results.summary.brokenLinks++;
                console.log(`  ✗ ${link.text} - Error: ${error.message}`);
            }
        }
        
        // Step 5: Test for common 404 patterns
        console.log('5. Testing common routes for 404 errors...');
        
        const commonRoutes = [
            '/dashboard',
            '/admin',
            '/users',
            '/students',
            '/teachers',
            '/classes',
            '/subjects',
            '/grades',
            '/attendance',
            '/reports',
            '/settings'
        ];
        
        for (const route of commonRoutes) {
            try {
                const fullUrl = `http://localhost:5201${route}`;
                console.log(`Testing route: ${fullUrl}`);
                
                const response = await page.goto(fullUrl, { 
                    waitUntil: 'networkidle2',
                    timeout: 5000
                });
                
                const routeResult = {
                    name: route,
                    type: 'route_test',
                    url: fullUrl,
                    statusCode: response ? response.status() : null,
                    passed: response && response.status() < 400,
                    title: await page.title()
                };
                
                results.linkTests.push(routeResult);
                
                if (routeResult.passed) {
                    console.log(`  ✓ ${route} - Status: ${routeResult.statusCode}`);
                } else {
                    console.log(`  ✗ ${route} - Status: ${routeResult.statusCode}`);
                }
                
            } catch (error) {
                results.linkTests.push({
                    name: route,
                    type: 'route_test',
                    url: `http://localhost:5201${route}`,
                    passed: false,
                    error: error.message
                });
                console.log(`  ✗ ${route} - Error: ${error.message}`);
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
    fs.writeFileSync('navigation-links-results.json', JSON.stringify(results, null, 2));
    
    console.log('\n=== NAVIGATION LINKS TEST RESULTS ===');
    console.log(`Navigation Items: ${results.summary.workingNavigation}/${results.summary.navigationItems} working`);
    console.log(`Regular Links: ${results.summary.workingLinks}/${results.summary.totalLinks} working`);
    console.log(`Broken Links: ${results.summary.brokenLinks}`);
    console.log(`Broken Navigation: ${results.summary.brokenNavigation}`);
    console.log(`Screenshots taken: ${results.screenshots.length}`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.summary.brokenLinks > 0 || results.summary.brokenNavigation > 0) {
        console.log('\n⚠️  Issues found:');
        results.navigationTests.filter(test => !test.passed).forEach(test => {
            console.log(`  - ${test.name}: ${test.error || 'Navigation failed'}`);
        });
        results.linkTests.filter(test => !test.passed).forEach(test => {
            console.log(`  - ${test.name}: ${test.error || `Status ${test.statusCode}`}`);
        });
    } else {
        console.log('\n✅ All navigation and links working correctly!');
    }
    
    console.log('\nDetailed results saved to navigation-links-results.json');
    
    return results;
}

testNavigationLinks().catch(console.error);