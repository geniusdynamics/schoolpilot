// ABOUTME: Enhanced financial data generator with complete chart of accounts, fee templates, and supplier management
// ABOUTME: Comprehensive financial system with accounting structure, transactions, budgets, and reporting

// ABOUTME: Enhanced financial data generator with complete chart of accounts, fee templates, and supplier management
// ABOUTME: Comprehensive financial system with accounting structure, transactions, budgets, and reporting

import { BaseGenerator } from './BaseGenerator';
import { DataGenerationConfig } from '../types';

export class FinancialGenerator extends BaseGenerator {
  protected targetSupplierCount: number;
  protected targetTransactionCount: number;
  protected currentAcademicYear: string;

  constructor(config: DataGenerationConfig) {
    super(config);
    this.targetSupplierCount = config.targetSupplierCount || 100;
    this.targetTransactionCount = config.targetTransactionCount || 2000;
    this.currentAcademicYear = config.currentAcademicYear || '2023-2024';
  }

  async generateData(count: number): Promise<any[]> {
    const results = await this.generate();
    return results;
  }

  async generate() {
    await this.initialize();
    const results = [];
    
    // Generate chart of accounts
    const chartOfAccounts = this.generateChartOfAccounts();
    results.push(...chartOfAccounts.map(account => ({
      table: 'chart_of_accounts',
      data: account
    })));
    
    // Generate fee templates
    const feeTemplates = this.generateFeeTemplates();
    results.push(...feeTemplates.map(template => ({
      table: 'fee_templates',
      data: template
    })));
    
    // Generate fee structures
    const feeStructures = this.generateFeeStructures(feeTemplates);
    results.push(...feeStructures.map(structure => ({
      table: 'fee_structures',
      data: structure
    })));
    
    // Generate suppliers
    const suppliers = this.generateSuppliers();
    results.push(...suppliers.map(supplier => ({
      table: 'suppliers',
      data: supplier
    })));
    
    // Generate budgets
    const budgets = this.generateBudgets(chartOfAccounts);
    results.push(...budgets.map(budget => ({
      table: 'budgets',
      data: budget
    })));
    
    // Generate transactions
    const transactions = this.generateTransactions(chartOfAccounts, suppliers, feeTemplates);
    results.push(...transactions.map(transaction => ({
      table: 'financial_transactions',
      data: transaction
    })));
    
    // Generate student fee records
    const studentFees = this.generateStudentFees(feeStructures);
    results.push(...studentFees.map(fee => ({
      table: 'student_fees',
      data: fee
    })));
    
    // Generate payment records
    const payments = this.generatePayments(studentFees);
    results.push(...payments.map(payment => ({
      table: 'payments',
      data: payment
    })));
    
    // Generate purchase orders
    const purchaseOrders = this.generatePurchaseOrders(suppliers, chartOfAccounts);
    results.push(...purchaseOrders.map(po => ({
      table: 'purchase_orders',
      data: po
    })));
    
    // Generate invoices
    const invoices = this.generateInvoices(suppliers, purchaseOrders);
    results.push(...invoices.map(invoice => ({
      table: 'invoices',
      data: invoice
    })));
    
    // Generate payroll records
    const payrollRecords = this.generatePayrollRecords(chartOfAccounts);
    results.push(...payrollRecords.map(payroll => ({
      table: 'payroll_records',
      data: payroll
    })));
    
    // Generate financial reports
    const reports = this.generateFinancialReports();
    results.push(...reports.map(report => ({
      table: 'financial_reports',
      data: report
    })));
    
    return results;
  }
  
  generateChartOfAccounts() {
    const accounts = [];
    
    // Asset Accounts (1000-1999)
    const assetAccounts = [
      { code: '1000', name: 'Cash and Cash Equivalents', type: 'Asset', subtype: 'Current Asset' },
      { code: '1010', name: 'Petty Cash', type: 'Asset', subtype: 'Current Asset' },
      { code: '1020', name: 'Bank Account - Operating', type: 'Asset', subtype: 'Current Asset' },
      { code: '1030', name: 'Bank Account - Savings', type: 'Asset', subtype: 'Current Asset' },
      { code: '1100', name: 'Accounts Receivable', type: 'Asset', subtype: 'Current Asset' },
      { code: '1110', name: 'Student Fees Receivable', type: 'Asset', subtype: 'Current Asset' },
      { code: '1120', name: 'Other Receivables', type: 'Asset', subtype: 'Current Asset' },
      { code: '1200', name: 'Inventory', type: 'Asset', subtype: 'Current Asset' },
      { code: '1210', name: 'Office Supplies', type: 'Asset', subtype: 'Current Asset' },
      { code: '1220', name: 'Teaching Materials', type: 'Asset', subtype: 'Current Asset' },
      { code: '1300', name: 'Prepaid Expenses', type: 'Asset', subtype: 'Current Asset' },
      { code: '1500', name: 'Property, Plant & Equipment', type: 'Asset', subtype: 'Fixed Asset' },
      { code: '1510', name: 'Buildings', type: 'Asset', subtype: 'Fixed Asset' },
      { code: '1520', name: 'Furniture & Fixtures', type: 'Asset', subtype: 'Fixed Asset' },
      { code: '1530', name: 'Computer Equipment', type: 'Asset', subtype: 'Fixed Asset' },
      { code: '1540', name: 'Vehicles', type: 'Asset', subtype: 'Fixed Asset' },
      { code: '1600', name: 'Accumulated Depreciation', type: 'Asset', subtype: 'Contra Asset' }
    ];
    
    // Liability Accounts (2000-2999)
    const liabilityAccounts = [
      { code: '2000', name: 'Accounts Payable', type: 'Liability', subtype: 'Current Liability' },
      { code: '2010', name: 'Supplier Payables', type: 'Liability', subtype: 'Current Liability' },
      { code: '2020', name: 'Accrued Expenses', type: 'Liability', subtype: 'Current Liability' },
      { code: '2100', name: 'Payroll Liabilities', type: 'Liability', subtype: 'Current Liability' },
      { code: '2110', name: 'Salaries Payable', type: 'Liability', subtype: 'Current Liability' },
      { code: '2120', name: 'Tax Withholdings Payable', type: 'Liability', subtype: 'Current Liability' },
      { code: '2130', name: 'Benefits Payable', type: 'Liability', subtype: 'Current Liability' },
      { code: '2200', name: 'Deferred Revenue', type: 'Liability', subtype: 'Current Liability' },
      { code: '2210', name: 'Prepaid Tuition', type: 'Liability', subtype: 'Current Liability' },
      { code: '2500', name: 'Long-term Debt', type: 'Liability', subtype: 'Long-term Liability' },
      { code: '2510', name: 'Mortgage Payable', type: 'Liability', subtype: 'Long-term Liability' }
    ];
    
    // Equity Accounts (3000-3999)
    const equityAccounts = [
      { code: '3000', name: 'Net Assets', type: 'Equity', subtype: 'Equity' },
      { code: '3100', name: 'Retained Earnings', type: 'Equity', subtype: 'Equity' },
      { code: '3200', name: 'Current Year Earnings', type: 'Equity', subtype: 'Equity' }
    ];
    
    // Revenue Accounts (4000-4999)
    const revenueAccounts = [
      { code: '4000', name: 'Tuition Revenue', type: 'Revenue', subtype: 'Operating Revenue' },
      { code: '4010', name: 'Application Fees', type: 'Revenue', subtype: 'Operating Revenue' },
      { code: '4020', name: 'Registration Fees', type: 'Revenue', subtype: 'Operating Revenue' },
      { code: '4030', name: 'Laboratory Fees', type: 'Revenue', subtype: 'Operating Revenue' },
      { code: '4040', name: 'Library Fees', type: 'Revenue', subtype: 'Operating Revenue' },
      { code: '4050', name: 'Technology Fees', type: 'Revenue', subtype: 'Operating Revenue' },
      { code: '4100', name: 'Government Grants', type: 'Revenue', subtype: 'Grant Revenue' },
      { code: '4110', name: 'Private Grants', type: 'Revenue', subtype: 'Grant Revenue' },
      { code: '4200', name: 'Donations', type: 'Revenue', subtype: 'Non-operating Revenue' },
      { code: '4300', name: 'Investment Income', type: 'Revenue', subtype: 'Non-operating Revenue' },
      { code: '4400', name: 'Other Revenue', type: 'Revenue', subtype: 'Other Revenue' }
    ];
    
    // Expense Accounts (5000-5999)
    const expenseAccounts = [
      { code: '5000', name: 'Salaries and Wages', type: 'Expense', subtype: 'Personnel Expense' },
      { code: '5010', name: 'Teaching Salaries', type: 'Expense', subtype: 'Personnel Expense' },
      { code: '5020', name: 'Administrative Salaries', type: 'Expense', subtype: 'Personnel Expense' },
      { code: '5030', name: 'Support Staff Wages', type: 'Expense', subtype: 'Personnel Expense' },
      { code: '5100', name: 'Employee Benefits', type: 'Expense', subtype: 'Personnel Expense' },
      { code: '5110', name: 'Health Insurance', type: 'Expense', subtype: 'Personnel Expense' },
      { code: '5120', name: 'Retirement Contributions', type: 'Expense', subtype: 'Personnel Expense' },
      { code: '5200', name: 'Utilities', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5210', name: 'Electricity', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5220', name: 'Water and Sewer', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5230', name: 'Internet and Phone', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5300', name: 'Supplies and Materials', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5310', name: 'Office Supplies', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5320', name: 'Teaching Supplies', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5330', name: 'Maintenance Supplies', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5400', name: 'Professional Services', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5410', name: 'Legal Fees', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5420', name: 'Accounting Fees', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5430', name: 'Consulting Fees', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5500', name: 'Maintenance and Repairs', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5600', name: 'Insurance', type: 'Expense', subtype: 'Operating Expense' },
      { code: '5700', name: 'Depreciation Expense', type: 'Expense', subtype: 'Non-cash Expense' },
      { code: '5800', name: 'Interest Expense', type: 'Expense', subtype: 'Financial Expense' }
    ];
    
    const allAccounts = [...assetAccounts, ...liabilityAccounts, ...equityAccounts, ...revenueAccounts, ...expenseAccounts];
    
    allAccounts.forEach(account => {
      accounts.push({
        id: this.generateId('ACC'),
        account_code: account.code,
        account_name: account.name,
        account_type: account.type,
        account_subtype: account.subtype,
        parent_account_id: null,
        description: `${account.name} - ${account.subtype}`,
        is_active: true,
        is_system_account: true,
        normal_balance: ['Asset', 'Expense'].includes(account.type) ? 'Debit' : 'Credit',
        current_balance: 0,
        created_at: this.faker.date.past({ years: 2 }),
            updated_at: this.faker.date.recent()
      });
    });
    
    return accounts;
  }
  
  generateFeeTemplates() {
    const templates = [];
    
    const feeTypes = [
      {
        name: 'Tuition Fee',
        description: 'Basic tuition charges for academic instruction',
        category: 'Academic',
        is_mandatory: true,
        frequency: 'Semester'
      },
      {
        name: 'Registration Fee',
        description: 'One-time registration fee for new students',
        category: 'Administrative',
        is_mandatory: true,
        frequency: 'One-time'
      },
      {
        name: 'Laboratory Fee',
        description: 'Additional fee for laboratory courses',
        category: 'Academic',
        is_mandatory: false,
        frequency: 'Semester'
      },
      {
        name: 'Library Fee',
        description: 'Fee for library services and resources',
        category: 'Services',
        is_mandatory: true,
        frequency: 'Annual'
      },
      {
        name: 'Technology Fee',
        description: 'Fee for computer and internet services',
        category: 'Technology',
        is_mandatory: true,
        frequency: 'Semester'
      },
      {
        name: 'Sports Fee',
        description: 'Fee for sports facilities and activities',
        category: 'Activities',
        is_mandatory: false,
        frequency: 'Annual'
      },
      {
        name: 'Transportation Fee',
        description: 'Fee for school bus services',
        category: 'Transportation',
        is_mandatory: false,
        frequency: 'Monthly'
      },
      {
        name: 'Examination Fee',
        description: 'Fee for examination administration',
        category: 'Academic',
        is_mandatory: true,
        frequency: 'Per Exam'
      },
      {
        name: 'Late Payment Fee',
        description: 'Penalty for late fee payments',
        category: 'Penalty',
        is_mandatory: false,
        frequency: 'As Needed'
      },
      {
        name: 'Graduation Fee',
        description: 'Fee for graduation ceremony and diploma',
        category: 'Administrative',
        is_mandatory: true,
        frequency: 'One-time'
      }
    ];
    
    feeTypes.forEach(feeType => {
      templates.push({
        id: this.generateId('FEETMPL'),
        name: feeType.name,
        description: feeType.description,
        category: feeType.category,
        is_mandatory: feeType.is_mandatory,
        frequency: feeType.frequency,
        base_amount: parseFloat(this.faker.commerce.price({ min: 50, max: 2000 })),
        tax_rate: this.faker.number.float({ min: 0, max: 0.1, precision: 0.01 }),
            discount_eligible: this.faker.datatype.boolean(0.7),
            payment_terms: this.faker.helpers.arrayElement(['Immediate', '30 Days', '60 Days', 'Semester']),
            account_code: this.faker.helpers.arrayElement(['4000', '4010', '4020', '4030', '4040', '4050']),
            is_active: true,
            effective_date: this.faker.date.past({ years: 1 }),
            expiry_date: null,
            created_at: this.faker.date.past({ years: 2 }),
            updated_at: this.faker.date.recent()
      });
    });
    
    return templates;
  }
  
  generateFeeStructures(feeTemplates) {
    const structures = [];
    const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    
    gradeLevels.forEach(grade => {
      feeTemplates.forEach(template => {
        // Not all fee templates apply to all grades
        if (this.faker.datatype.boolean(0.8)) {
          const multiplier = this.faker.number.float({ min: 0.8, max: 1.2, precision: 0.01 });
          
          structures.push({
            id: this.generateId('FEESTR'),
            template_id: template.id,
            grade_level: grade,
            academic_year: this.currentAcademicYear,
            amount: parseFloat((template.base_amount * multiplier).toFixed(2)),
            discount_percentage: this.faker.number.float({ min: 0, max: 0.2, precision: 0.01 }),
            early_payment_discount: this.faker.number.float({ min: 0, max: 0.05, precision: 0.01 }),
            late_payment_penalty: this.faker.number.float({ min: 0.01, max: 0.1, precision: 0.01 }),
            due_date_offset_days: this.faker.number.int({ min: 0, max: 90 }),
            is_active: true,
            created_at: this.faker.date.past({ years: 1 }),
            updated_at: this.faker.date.recent()
          });
        }
      });
    });
    
    return structures;
  }
  
  generateSuppliers() {
    const suppliers = [];
    
    const supplierTypes = [
      'Office Supplies', 'Educational Materials', 'Technology Equipment',
      'Maintenance Services', 'Food Services', 'Transportation',
      'Utilities', 'Professional Services', 'Furniture', 'Books and Media'
    ];
    
    for (let i = 0; i < this.targetSupplierCount; i++) {
      const companyName = this.faker.company.name();
      const supplierType = this.faker.helpers.arrayElement(supplierTypes);
      
      suppliers.push({
        id: this.generateId('SUP'),
        supplier_code: this.faker.helpers.replaceSymbols('SUP####'),
        company_name: companyName,
        contact_person: this.faker.person.fullName(),
        email: this.faker.internet.email(),
        phone: this.faker.phone.number(),
        mobile: this.faker.phone.number(),
        website: this.faker.internet.url(),
        address: this.faker.location.streetAddress(),
        city: this.faker.location.city(),
        state: this.faker.location.state(),
        postal_code: this.faker.location.zipCode(),
        country: this.faker.location.country(),
        supplier_type: supplierType,
        tax_id: this.faker.helpers.replaceSymbols('##-#######'),
        payment_terms: this.faker.helpers.arrayElement(['Net 30', 'Net 60', 'COD', '2/10 Net 30']),
        credit_limit: parseFloat(this.faker.commerce.price({ min: 1000, max: 50000 })),
        current_balance: parseFloat(this.faker.commerce.price({ min: 0, max: 10000 })),
        rating: this.faker.helpers.arrayElement(['A', 'B', 'C', 'D']),
        is_active: this.faker.datatype.boolean(0.9),
        is_preferred: this.faker.datatype.boolean(0.2),
        notes: this.faker.datatype.boolean(0.3) ? this.faker.lorem.sentence() : null,
        created_at: this.faker.date.past({ years: 3 }),
        updated_at: this.faker.date.recent()
      });
    }
    
    return suppliers;
  }
  
  generateBudgets(chartOfAccounts) {
    const budgets = [];
    const departments = ['Administration', 'Academic', 'Maintenance', 'Technology', 'Library', 'Sports'];
    
    departments.forEach(department => {
      // Create budget for each expense account
      const expenseAccounts = chartOfAccounts.filter(acc => acc.account_type === 'Expense');
      
      expenseAccounts.forEach(account => {
        if (this.faker.datatype.boolean(0.7)) { // Not all accounts have budgets
          budgets.push({
            id: this.generateId('BUD'),
            account_id: account.id,
            department: department,
            budget_year: this.currentAcademicYear,
            budget_period: 'Annual',
            budgeted_amount: parseFloat(this.faker.commerce.price({ min: 1000, max: 100000 })),
            spent_amount: 0, // Will be calculated from transactions
            remaining_amount: 0, // Will be calculated
            percentage_used: 0,
            is_approved: this.faker.datatype.boolean(0.9),
            approved_by: this.generateId('STAFF'),
            approved_date: this.faker.date.past({ months: 6 }),
            notes: this.faker.datatype.boolean(0.2) ? this.faker.lorem.sentence() : null,
            created_at: this.faker.date.past({ years: 1 }),
            updated_at: this.faker.date.recent()
          });
        }
      });
    });
    
    return budgets;
  }
  
  generateTransactions(chartOfAccounts, suppliers, feeTemplates) {
    const transactions = [];
    
    for (let i = 0; i < this.targetTransactionCount; i++) {
      const transactionType = this.faker.helpers.arrayElement(['Revenue', 'Expense', 'Transfer', 'Adjustment']);
      const account = this.faker.helpers.arrayElement(chartOfAccounts);
      
      let description, reference, supplier_id = null;
      
      if (transactionType === 'Revenue') {
        const feeTemplate = this.faker.helpers.arrayElement(feeTemplates);
        description = `${feeTemplate.name} - Student Payment`;
        reference = this.faker.helpers.replaceSymbols('PAY######');
      } else if (transactionType === 'Expense') {
        const supplier = this.faker.helpers.arrayElement(suppliers);
        supplier_id = supplier.id;
        description = `Purchase from ${supplier.company_name}`;
        reference = this.faker.helpers.replaceSymbols('INV######');
      } else {
        description = this.faker.lorem.sentence();
        reference = this.faker.helpers.replaceSymbols('TXN######');
      }
      
      const amount = parseFloat(this.faker.commerce.price({ min: 10, max: 5000 }));
      const transactionDate = this.faker.date.recent({ days: 90 });
      
      transactions.push({
        id: this.generateId('TXN'),
        transaction_number: this.faker.helpers.replaceSymbols('TXN########'),
        transaction_date: transactionDate,
        account_id: account.id,
        transaction_type: transactionType,
        description: description,
        reference_number: reference,
        debit_amount: account.normal_balance === 'Debit' ? amount : 0,
        credit_amount: account.normal_balance === 'Credit' ? amount : 0,
        supplier_id: supplier_id,
        student_id: transactionType === 'Revenue' ? this.generateId('STU') : null,
        department: this.faker.helpers.arrayElement(['Administration', 'Academic', 'Maintenance', 'Technology']),
        budget_id: null, // Would be linked to budget if applicable
        payment_method: this.faker.helpers.arrayElement(['Cash', 'Check', 'Bank Transfer', 'Credit Card', 'Online Payment']),
        status: this.faker.helpers.arrayElement(['Pending', 'Approved', 'Posted', 'Cancelled']),
        approved_by: this.faker.datatype.boolean(0.8) ? this.generateId('STAFF') : null,
        approved_date: this.faker.datatype.boolean(0.8) ? this.faker.date.recent({ days: 30 }) : null,
        notes: this.faker.datatype.boolean(0.2) ? this.faker.lorem.sentence() : null,
        created_at: transactionDate,
        updated_at: this.faker.date.recent()
      });
    }
    
    return transactions;
  }
  
  generateStudentFees(feeStructures) {
    const studentFees = [];
    const studentCount = 500; // Assuming 500 students
    
    for (let i = 0; i < studentCount; i++) {
      const studentId = this.generateId('STU');
      const gradeLevel = this.faker.helpers.arrayElement(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']);
      
      // Get applicable fee structures for this grade
      const applicableFees = feeStructures.filter(fs => fs.grade_level === gradeLevel);
      
      applicableFees.forEach(feeStructure => {
        if (this.faker.datatype.boolean(0.9)) { // 90% of students have each applicable fee
          const dueDate = this.faker.date.future({ years: 1 });
          const amount = feeStructure.amount * (1 - feeStructure.discount_percentage);
          
          studentFees.push({
            id: this.generateId('STUFEE'),
            student_id: studentId,
            fee_structure_id: feeStructure.id,
            academic_year: this.currentAcademicYear,
            semester: this.faker.helpers.arrayElement(['Fall', 'Spring', 'Summer']),
            amount_due: amount,
            amount_paid: 0, // Will be updated by payments
            amount_outstanding: amount,
            due_date: dueDate,
            discount_applied: feeStructure.discount_percentage * feeStructure.amount,
            penalty_applied: 0,
            status: 'Outstanding',
            payment_plan_id: this.faker.datatype.boolean(0.1) ? this.generateId('PLAN') : null,
            notes: this.faker.datatype.boolean(0.1) ? this.faker.lorem.sentence() : null,
            created_at: this.faker.date.past({ months: 6 }),
            updated_at: this.faker.date.recent()
          });
        }
      });
    }
    
    return studentFees;
  }
  
  generatePayments(studentFees) {
    const payments = [];
    
    // Generate payments for about 70% of student fees
    const feesToPay = this.faker.helpers.arrayElements(studentFees, Math.floor(studentFees.length * 0.7));
    
    feesToPay.forEach(studentFee => {
      const paymentCount = this.faker.number.int({ min: 1, max: 3 }); // Some fees paid in installments
      let remainingAmount = studentFee.amount_due;
      
      for (let j = 0; j < paymentCount && remainingAmount > 0; j++) {
        const paymentAmount = j === paymentCount - 1 ? remainingAmount : 
                             parseFloat((remainingAmount * this.faker.number.float({ min: 0.3, max: 0.8 })).toFixed(2));
        
        payments.push({
          id: this.generateId('PAY'),
          payment_number: this.faker.helpers.replaceSymbols('PAY########'),
          student_fee_id: studentFee.id,
          student_id: studentFee.student_id,
          payment_date: this.faker.date.between({ from: studentFee.created_at, to: new Date() }),
          amount: paymentAmount,
          payment_method: this.faker.helpers.arrayElement(['Cash', 'Check', 'Bank Transfer', 'Credit Card', 'Online Payment', 'Mobile Payment']),
          reference_number: this.faker.helpers.replaceSymbols('REF######'),
          transaction_id: this.faker.helpers.replaceSymbols('TXN########'),
          status: this.faker.helpers.arrayElement(['Pending', 'Completed', 'Failed', 'Refunded']),
          processed_by: this.generateId('STAFF'),
          receipt_number: this.faker.helpers.replaceSymbols('RCP######'),
          notes: this.faker.datatype.boolean(0.1) ? this.faker.lorem.sentence() : null,
          created_at: this.faker.date.recent({ days: 60 }),
          updated_at: this.faker.date.recent()
        });
        
        remainingAmount -= paymentAmount;
      }
    });
    
    return payments;
  }
  
  generatePurchaseOrders(suppliers, chartOfAccounts) {
    const purchaseOrders = [];
    const poCount = Math.floor(this.targetSupplierCount * 0.8); // 80% of suppliers have POs
    
    for (let i = 0; i < poCount; i++) {
      const supplier = this.faker.helpers.arrayElement(suppliers);
      const orderDate = this.faker.date.recent({ days: 90 });
      const deliveryDate = this.faker.date.future({ days: 30 });
      
      purchaseOrders.push({
        id: this.generateId('PO'),
        po_number: this.faker.helpers.replaceSymbols('PO######'),
        supplier_id: supplier.id,
        order_date: orderDate,
        expected_delivery_date: deliveryDate,
        total_amount: parseFloat(this.faker.commerce.price({ min: 100, max: 10000 })),
        tax_amount: parseFloat(this.faker.commerce.price({ min: 10, max: 800 })),
        shipping_amount: parseFloat(this.faker.commerce.price({ min: 0, max: 200 })),
        discount_amount: parseFloat(this.faker.commerce.price({ min: 0, max: 500 })),
        net_amount: 0, // Will be calculated
        currency: 'USD',
        payment_terms: supplier.payment_terms,
        status: this.faker.helpers.arrayElement(['Draft', 'Sent', 'Acknowledged', 'Delivered', 'Invoiced', 'Closed']),
        requested_by: this.generateId('STAFF'),
        approved_by: this.generateId('STAFF'),
        approved_date: this.faker.date.between({ from: orderDate, to: new Date() }),
        department: this.faker.helpers.arrayElement(['Administration', 'Academic', 'Maintenance', 'Technology']),
        delivery_address: this.faker.location.streetAddress(),
        terms_and_conditions: this.faker.lorem.paragraph(),
        notes: this.faker.datatype.boolean(0.3) ? this.faker.lorem.sentence() : null,
        created_at: orderDate,
        updated_at: this.faker.date.recent()
      });
    }
    
    return purchaseOrders;
  }
  
  generateInvoices(suppliers, purchaseOrders) {
    const invoices = [];
    
    // Generate invoices for 80% of purchase orders
    const ordersWithInvoices = this.faker.helpers.arrayElements(purchaseOrders, Math.floor(purchaseOrders.length * 0.8));
    
    ordersWithInvoices.forEach(po => {
      const invoiceDate = this.faker.date.between({ from: po.order_date, to: new Date() });
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms
      
      invoices.push({
        id: this.generateId('INV'),
        invoice_number: this.faker.helpers.replaceSymbols('INV######'),
        supplier_id: po.supplier_id,
        purchase_order_id: po.id,
        invoice_date: invoiceDate,
        due_date: dueDate,
        subtotal: po.total_amount,
        tax_amount: po.tax_amount,
        shipping_amount: po.shipping_amount,
        discount_amount: po.discount_amount,
        total_amount: po.total_amount + po.tax_amount + po.shipping_amount - po.discount_amount,
        amount_paid: 0,
        amount_outstanding: 0, // Will be calculated
        currency: 'USD',
        status: this.faker.helpers.arrayElement(['Received', 'Under Review', 'Approved', 'Paid', 'Overdue', 'Disputed']),
        payment_terms: this.faker.helpers.arrayElement(['Net 30', 'Net 60', 'COD', '2/10 Net 30']),
        received_date: this.faker.date.between({ from: invoiceDate, to: new Date() }),
        approved_by: this.faker.datatype.boolean(0.8) ? this.generateId('STAFF') : null,
        approved_date: this.faker.datatype.boolean(0.8) ? this.faker.date.recent({ days: 15 }) : null,
        paid_date: this.faker.datatype.boolean(0.6) ? this.faker.date.recent({ days: 45 }) : null,
        notes: this.faker.datatype.boolean(0.2) ? this.faker.lorem.sentence() : null,
        created_at: invoiceDate,
        updated_at: this.faker.date.recent()
      });
    });
    
    return invoices;
  }
  
  generatePayrollRecords(chartOfAccounts) {
    const payrollRecords = [];
    const staffCount = 100; // Assuming 100 staff members
    const payPeriods = 12; // Monthly payroll
    
    for (let period = 0; period < payPeriods; period++) {
      const payPeriodStart = new Date();
      payPeriodStart.setMonth(payPeriodStart.getMonth() - period);
      payPeriodStart.setDate(1);
      
      const payPeriodEnd = new Date(payPeriodStart);
      payPeriodEnd.setMonth(payPeriodEnd.getMonth() + 1);
      payPeriodEnd.setDate(0);
      
      for (let i = 0; i < staffCount; i++) {
        const staffId = this.generateId('STAFF');
        const grossSalary = parseFloat(this.faker.commerce.price({ min: 3000, max: 15000 }));
        const taxDeduction = grossSalary * 0.2;
        const benefitsDeduction = grossSalary * 0.1;
        const netSalary = grossSalary - taxDeduction - benefitsDeduction;
        
        payrollRecords.push({
          id: this.generateId('PAYROLL'),
          staff_id: staffId,
          pay_period_start: payPeriodStart,
          pay_period_end: payPeriodEnd,
          pay_date: new Date(payPeriodEnd.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days after period end
          gross_salary: grossSalary,
          basic_salary: grossSalary * 0.8,
          allowances: grossSalary * 0.2,
          overtime_amount: this.faker.datatype.boolean(0.3) ? parseFloat(this.faker.commerce.price({ min: 0, max: 1000 })) : 0,
          bonus_amount: this.faker.datatype.boolean(0.1) ? parseFloat(this.faker.commerce.price({ min: 500, max: 5000 })) : 0,
          tax_deduction: taxDeduction,
          insurance_deduction: benefitsDeduction * 0.6,
          retirement_deduction: benefitsDeduction * 0.4,
          other_deductions: this.faker.datatype.boolean(0.2) ? parseFloat(this.faker.commerce.price({ min: 0, max: 500 })) : 0,
          net_salary: netSalary,
          payment_method: this.faker.helpers.arrayElement(['Bank Transfer', 'Check', 'Cash']),
          bank_account: this.faker.finance.accountNumber(),
          status: this.faker.helpers.arrayElement(['Processed', 'Pending', 'Paid']),
          processed_by: this.generateId('STAFF'),
          notes: this.faker.datatype.boolean(0.1) ? this.faker.lorem.sentence() : null,
          created_at: payPeriodEnd,
          updated_at: this.faker.date.recent()
        });
      }
    }
    
    return payrollRecords;
  }
  
  generateFinancialReports() {
    const reports = [];
    const reportTypes = [
      'Balance Sheet', 'Income Statement', 'Cash Flow Statement',
      'Budget vs Actual', 'Accounts Receivable Aging', 'Accounts Payable Aging',
      'Fee Collection Report', 'Expense Analysis', 'Revenue Analysis'
    ];
    
    reportTypes.forEach(reportType => {
      // Generate monthly reports for the past 12 months
      for (let month = 0; month < 12; month++) {
        const reportDate = new Date();
        reportDate.setMonth(reportDate.getMonth() - month);
        
        reports.push({
          id: this.generateId('RPT'),
          report_type: reportType,
          report_name: `${reportType} - ${reportDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`,
          report_period_start: new Date(reportDate.getFullYear(), reportDate.getMonth(), 1),
          report_period_end: new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0),
          generated_date: this.faker.date.recent({ days: 30 }),
          generated_by: this.generateId('STAFF'),
          file_path: `/reports/${reportType.toLowerCase().replace(/\s+/g, '_')}_${reportDate.getFullYear()}_${(reportDate.getMonth() + 1).toString().padStart(2, '0')}.pdf`,
          file_size: this.faker.number.int({ min: 50000, max: 2000000 }), // File size in bytes
          status: this.faker.helpers.arrayElement(['Generated', 'Archived', 'Deleted']),
          access_level: this.faker.helpers.arrayElement(['Public', 'Internal', 'Confidential']),
          description: `${reportType} for ${reportDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`,
          created_at: this.faker.date.recent({ days: 30 }),
          updated_at: this.faker.date.recent()
        });
      }
    });
    
    return reports;
  }
}