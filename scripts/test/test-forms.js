import puppeteer from 'puppeteer';
import fs from 'fs';

async function testFormFunctionality() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    const results = {
        timestamp: new Date().toISOString(),
        formTests: [],
        inputTests: [],
        validationTests: [],
        errors: [],
        screenshots: [],
        summary: {
            totalForms: 0,
            totalInputs: 0,
            workingForms: 0,
            brokenForms: 0,
            validationErrors: 0,
            sectionsExplored: 0
        }
    };

    try {
        console.log('=== TESTING FORM FUNCTIONALITY ===');
        
        // Step 1: Login to access dashboard
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
        
        await page.screenshot({ path: 'forms-01-dashboard.png' });
        results.screenshots.push('forms-01-dashboard.png');
        
        // Step 2: Explore different sections for forms
        console.log('2. Exploring sections for forms...');
        
        const navigationSections = [
            'Administration',
            'Academics', 
            'Finance',
            'HR',
            'Inventory',
            'Library',
            'Nutrition',
            'Reports',
            'Settings'
        ];
        
        for (const section of navigationSections) {
            try {
                console.log(`\nExploring ${section} section...`);
                
                // Click on the section
                const sectionClicked = await page.evaluate((sectionName) => {
                    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
                    const sectionBtn = buttons.find(btn => 
                        btn.textContent.trim().toLowerCase().includes(sectionName.toLowerCase())
                    );
                    if (sectionBtn && !sectionBtn.disabled) {
                        sectionBtn.click();
                        return true;
                    }
                    return false;
                }, section);
                
                if (sectionClicked) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    results.summary.sectionsExplored++;
                    
                    // Take screenshot of the section
                    await page.screenshot({ path: `forms-${String(results.summary.sectionsExplored + 1).padStart(2, '0')}-${section.toLowerCase()}.png` });
                    results.screenshots.push(`forms-${String(results.summary.sectionsExplored + 1).padStart(2, '0')}-${section.toLowerCase()}.png`);
                    
                    // Look for forms in this section
                    const sectionForms = await page.evaluate(() => {
                        const forms = Array.from(document.querySelectorAll('form'));
                        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
                        const buttons = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], button'))
                            .filter(btn => {
                                const text = btn.textContent.toLowerCase();
                                return text.includes('save') || text.includes('submit') || text.includes('add') || 
                                       text.includes('create') || text.includes('update') || text.includes('delete') ||
                                       text.includes('edit') || text.includes('search');
                            });
                        
                        return {
                            forms: forms.map(form => ({
                                id: form.id,
                                className: form.className,
                                action: form.action,
                                method: form.method,
                                inputCount: form.querySelectorAll('input, textarea, select').length
                            })),
                            inputs: inputs.map(input => ({
                                type: input.type || input.tagName.toLowerCase(),
                                name: input.name,
                                id: input.id,
                                placeholder: input.placeholder,
                                required: input.required,
                                disabled: input.disabled,
                                value: input.value
                            })),
                            actionButtons: buttons.map(btn => ({
                                text: btn.textContent.trim(),
                                type: btn.type,
                                disabled: btn.disabled,
                                className: btn.className
                            }))
                        };
                    });
                    
                    console.log(`  Found ${sectionForms.forms.length} forms, ${sectionForms.inputs.length} inputs, ${sectionForms.actionButtons.length} action buttons`);
                    
                    results.summary.totalForms += sectionForms.forms.length;
                    results.summary.totalInputs += sectionForms.inputs.length;
                    
                    // Test each form found
                    for (let i = 0; i < sectionForms.forms.length; i++) {
                        const form = sectionForms.forms[i];
                        console.log(`  Testing form ${i + 1} in ${section}...`);
                        
                        const formTest = {
                            section: section,
                            formIndex: i,
                            formId: form.id,
                            formClass: form.className,
                            inputCount: form.inputCount,
                            tests: []
                        };
                        
                        // Test form submission without data (validation test)
                        try {
                            const validationResult = await page.evaluate((formIndex) => {
                                const forms = document.querySelectorAll('form');
                                if (forms[formIndex]) {
                                    const form = forms[formIndex];
                                    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]') ||
                                                    form.querySelector('button');
                                    
                                    if (submitBtn && !submitBtn.disabled) {
                                        submitBtn.click();
                                        return {
                                            submitted: true,
                                            hasValidationErrors: !!document.querySelector('.error, .invalid, .alert-danger, [aria-invalid="true"]'),
                                            validationMessages: Array.from(document.querySelectorAll('.error, .invalid, .alert-danger'))
                                                .map(el => el.textContent.trim())
                                        };
                                    }
                                }
                                return { submitted: false };
                            }, i);
                            
                            formTest.tests.push({
                                type: 'validation_test',
                                result: validationResult
                            });
                            
                            if (validationResult.submitted) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                            
                        } catch (error) {
                            formTest.tests.push({
                                type: 'validation_test',
                                error: error.message
                            });
                        }
                        
                        results.formTests.push(formTest);
                        
                        if (formTest.tests.some(test => test.result && test.result.submitted)) {
                            results.summary.workingForms++;
                        } else {
                            results.summary.brokenForms++;
                        }
                    }
                    
                    // Test individual inputs
                    for (let i = 0; i < Math.min(sectionForms.inputs.length, 5); i++) {
                        const input = sectionForms.inputs[i];
                        console.log(`  Testing input: ${input.type} - ${input.name || input.id || 'unnamed'}`);
                        
                        try {
                            const inputTest = await page.evaluate((inputIndex, inputData) => {
                                const inputs = document.querySelectorAll('input, textarea, select');
                                if (inputs[inputIndex]) {
                                    const input = inputs[inputIndex];
                                    
                                    // Test different input scenarios
                                    const tests = [];
                                    
                                    // Test 1: Focus and blur (validation trigger)
                                    input.focus();
                                    input.blur();
                                    tests.push({
                                        type: 'focus_blur',
                                        hasError: input.classList.contains('error') || input.classList.contains('invalid')
                                    });
                                    
                                    // Test 2: Enter test data based on type
                                    let testValue = '';
                                    switch (inputData.type) {
                                        case 'email':
                                            testValue = 'test@example.com';
                                            break;
                                        case 'password':
                                            testValue = 'testpassword123';
                                            break;
                                        case 'number':
                                            testValue = '123';
                                            break;
                                        case 'date':
                                            testValue = '2024-01-01';
                                            break;
                                        case 'tel':
                                            testValue = '1234567890';
                                            break;
                                        default:
                                            testValue = 'Test Value';
                                    }
                                    
                                    if (input.type !== 'file' && !input.disabled) {
                                        input.value = testValue;
                                        input.dispatchEvent(new Event('input', { bubbles: true }));
                                        input.dispatchEvent(new Event('change', { bubbles: true }));
                                        
                                        tests.push({
                                            type: 'value_input',
                                            testValue: testValue,
                                            actualValue: input.value,
                                            accepted: input.value === testValue
                                        });
                                    }
                                    
                                    return {
                                        inputType: inputData.type,
                                        inputName: inputData.name,
                                        tests: tests
                                    };
                                }
                                return null;
                            }, i, input);
                            
                            if (inputTest) {
                                results.inputTests.push(inputTest);
                            }
                            
                        } catch (error) {
                            results.inputTests.push({
                                inputType: input.type,
                                inputName: input.name,
                                error: error.message
                            });
                        }
                    }
                    
                    // Test action buttons
                    for (const button of sectionForms.actionButtons.slice(0, 3)) {
                        console.log(`  Testing button: ${button.text}`);
                        
                        try {
                            const buttonResult = await page.evaluate((buttonText) => {
                                const buttons = Array.from(document.querySelectorAll('button'));
                                const targetBtn = buttons.find(btn => btn.textContent.trim() === buttonText);
                                
                                if (targetBtn && !targetBtn.disabled) {
                                    targetBtn.click();
                                    return {
                                        clicked: true,
                                        text: buttonText
                                    };
                                }
                                return {
                                    clicked: false,
                                    text: buttonText,
                                    reason: targetBtn ? 'disabled' : 'not found'
                                };
                            }, button.text);
                            
                            if (buttonResult.clicked) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                
                                // Check for any modal or form that appeared
                                const modalCheck = await page.evaluate(() => {
                                    return {
                                        hasModal: !!document.querySelector('.modal, .dialog, [role="dialog"]'),
                                        hasNewForm: document.querySelectorAll('form').length,
                                        hasAlert: !!document.querySelector('.alert, .notification, .toast')
                                    };
                                });
                                
                                buttonResult.modalCheck = modalCheck;
                            }
                            
                            results.validationTests.push({
                                section: section,
                                type: 'button_test',
                                result: buttonResult
                            });
                            
                        } catch (error) {
                            results.validationTests.push({
                                section: section,
                                type: 'button_test',
                                error: error.message
                            });
                        }
                    }
                }
                
            } catch (error) {
                console.log(`  Error exploring ${section}: ${error.message}`);
                results.errors.push({
                    section: section,
                    message: error.message
                });
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
    fs.writeFileSync('form-test-results.json', JSON.stringify(results, null, 2));
    
    console.log('\n=== FORM FUNCTIONALITY TEST RESULTS ===');
    console.log(`Sections Explored: ${results.summary.sectionsExplored}`);
    console.log(`Total Forms Found: ${results.summary.totalForms}`);
    console.log(`Total Inputs Found: ${results.summary.totalInputs}`);
    console.log(`Working Forms: ${results.summary.workingForms}`);
    console.log(`Broken Forms: ${results.summary.brokenForms}`);
    console.log(`Input Tests: ${results.inputTests.length}`);
    console.log(`Validation Tests: ${results.validationTests.length}`);
    console.log(`Screenshots taken: ${results.screenshots.length}`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.summary.totalForms === 0) {
        console.log('\n⚠️  No forms found in the application');
    } else if (results.summary.brokenForms > 0) {
        console.log('\n⚠️  Some forms have issues');
    } else {
        console.log('\n✅ All forms appear to be working correctly!');
    }
    
    console.log('\nDetailed results saved to form-test-results.json');
    
    return results;
}

testFormFunctionality().catch(console.error);