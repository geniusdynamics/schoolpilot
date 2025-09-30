// ABOUTME: Quick inspection script to examine page elements and their selectors
// ABOUTME: Helps identify correct selectors for user journey testing

import puppeteer from 'puppeteer';

const TARGET_URL = 'http://localhost:5202/';

async function inspectPageElements() {
    let browser;
    
    try {
        console.log('Inspecting page elements...');
        
        browser = await puppeteer.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        page.setDefaultTimeout(30000);
        
        // Navigate to application
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Take screenshot
        await page.screenshot({ path: 'page-inspection.png', fullPage: false });
        console.log('✓ Screenshot taken: page-inspection.png');
        
        // Get all buttons and their attributes
        const buttons = await page.evaluate(() => {
            const buttonElements = document.querySelectorAll('button');
            return Array.from(buttonElements).map(button => ({
                text: button.textContent.trim(),
                onclick: button.getAttribute('onclick'),
                id: button.id,
                className: button.className,
                outerHTML: button.outerHTML
            }));
        });
        
        console.log('\n=== BUTTONS FOUND ===');
        buttons.forEach((button, index) => {
            console.log(`Button ${index + 1}:`);
            console.log(`  Text: "${button.text}"`);
            console.log(`  onclick: ${button.onclick}`);
            console.log(`  id: ${button.id}`);
            console.log(`  className: ${button.className}`);
            console.log(`  HTML: ${button.outerHTML}`);
            console.log('---');
        });
        
        // Get all links
        const links = await page.evaluate(() => {
            const linkElements = document.querySelectorAll('a');
            return Array.from(linkElements).map(link => ({
                text: link.textContent.trim(),
                href: link.getAttribute('href'),
                id: link.id,
                className: link.className
            }));
        });
        
        console.log('\n=== LINKS FOUND ===');
        links.forEach((link, index) => {
            console.log(`Link ${index + 1}:`);
            console.log(`  Text: "${link.text}"`);
            console.log(`  href: ${link.href}`);
            console.log(`  id: ${link.id}`);
            console.log(`  className: ${link.className}`);
            console.log('---');
        });
        
        // Get all forms and inputs
        const forms = await page.evaluate(() => {
            const formElements = document.querySelectorAll('form');
            const inputElements = document.querySelectorAll('input, select, textarea');
            
            return {
                forms: Array.from(formElements).map(form => ({
                    id: form.id,
                    className: form.className,
                    action: form.action,
                    method: form.method
                })),
                inputs: Array.from(inputElements).map(input => ({
                    type: input.type,
                    name: input.name,
                    id: input.id,
                    placeholder: input.placeholder,
                    className: input.className
                }))
            };
        });
        
        console.log('\n=== FORMS FOUND ===');
        forms.forms.forEach((form, index) => {
            console.log(`Form ${index + 1}:`);
            console.log(`  id: ${form.id}`);
            console.log(`  className: ${form.className}`);
            console.log(`  action: ${form.action}`);
            console.log(`  method: ${form.method}`);
            console.log('---');
        });
        
        console.log('\n=== INPUTS FOUND ===');
        forms.inputs.forEach((input, index) => {
            console.log(`Input ${index + 1}:`);
            console.log(`  type: ${input.type}`);
            console.log(`  name: ${input.name}`);
            console.log(`  id: ${input.id}`);
            console.log(`  placeholder: ${input.placeholder}`);
            console.log(`  className: ${input.className}`);
            console.log('---');
        });
        
    } catch (error) {
        console.error('Error during inspection:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

inspectPageElements().catch(console.error);