// ABOUTME: Generates comprehensive finance data including chart of accounts, voteheads, suppliers, and financial transactions
// ABOUTME: Creates realistic financial structures with proper accounting relationships and procurement lifecycle

import { BaseGenerator } from './BaseGenerator';
import { DataGenerationConfig } from '../types';

export class FinanceGenerator extends BaseGenerator {
  private voteheads: any[] = [];
  private suppliers: any[] = [];
  private students: any[] = [];
  private feeTemplates: any[] = [];

  constructor(config: DataGenerationConfig) {
    super(config);
  }

  async generateData(count: number): Promise<any[]> {
    await this.initialize();
    
    const results: any[] = [];
    
    // Generate chart of accounts with voteheads
    const chartData = await this.generateChartOfAccounts(50);
    results.push(...chartData);
    
    // Generate voteheads
    const voteheadData = await this.generateVoteheads(30);
    results.push(...voteheadData);
    
    // Generate suppliers
    const supplierData = await this.generateSuppliers(100);
    results.push(...supplierData);
    
    // Generate fee templates
    const feeTemplateData = await this.generateFeeTemplates(15);
    results.push(...feeTemplateData);
    
    // Generate fee template items
    const feeItemData = await this.generateFeeTemplateItems(75);
    results.push(...feeItemData);
    
    // Generate student wallet transactions
    const walletData = await this.generateStudentWalletTransactions(1000);
    results.push(...walletData);
    
    // Generate procurement records
    const procurementData = await this.generateProcurementRecords(200);
    results.push(...procurementData);
    
    // Generate payment vouchers
    const voucherData = await this.generatePaymentVouchers(150);
    results.push(...voucherData);
    
    return results;
  }

  private async generateChartOfAccounts(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const accountTypes = [
      { type: 'Asset', code: '1000', description: 'Current and fixed assets' },
      { type: 'Liability', code: '2000', description: 'Current and long-term liabilities' },
      { type: 'Equity', code: '3000', description: 'Owner equity and retained earnings' },
      { type: 'Revenue', code: '4000', description: 'Income and revenue accounts' },
      { type: 'Expense', code: '5000', description: 'Operating and administrative expenses' }
    ];
    
    const accounts = [
      // Assets
      { name: 'Cash at Bank', code: '1001', type: 'Asset', parent_code: '1000' },
      { name: 'Cash at Hand', code: '1002', type: 'Asset', parent_code: '1000' },
      { name: 'Accounts Receivable', code: '1100', type: 'Asset', parent_code: '1000' },
      { name: 'Student Fees Receivable', code: '1101', type: 'Asset', parent_code: '1100' },
      { name: 'Inventory', code: '1200', type: 'Asset', parent_code: '1000' },
      { name: 'Prepaid Expenses', code: '1300', type: 'Asset', parent_code: '1000' },
      { name: 'Fixed Assets', code: '1400', type: 'Asset', parent_code: '1000' },
      { name: 'Buildings', code: '1401', type: 'Asset', parent_code: '1400' },
      { name: 'Equipment', code: '1402', type: 'Asset', parent_code: '1400' },
      { name: 'Furniture & Fixtures', code: '1403', type: 'Asset', parent_code: '1400' },
      
      // Liabilities
      { name: 'Accounts Payable', code: '2001', type: 'Liability', parent_code: '2000' },
      { name: 'Accrued Expenses', code: '2002', type: 'Liability', parent_code: '2000' },
      { name: 'Student Deposits', code: '2100', type: 'Liability', parent_code: '2000' },
      { name: 'Loans Payable', code: '2200', type: 'Liability', parent_code: '2000' },
      { name: 'Tax Payable', code: '2300', type: 'Liability', parent_code: '2000' },
      
      // Equity
      { name: 'Capital', code: '3001', type: 'Equity', parent_code: '3000' },
      { name: 'Retained Earnings', code: '3002', type: 'Equity', parent_code: '3000' },
      { name: 'Current Year Earnings', code: '3003', type: 'Equity', parent_code: '3000' },
      
      // Revenue
      { name: 'Tuition Fees', code: '4001', type: 'Revenue', parent_code: '4000' },
      { name: 'Boarding Fees', code: '4002', type: 'Revenue', parent_code: '4000' },
      { name: 'Transport Fees', code: '4003', type: 'Revenue', parent_code: '4000' },
      { name: 'Examination Fees', code: '4004', type: 'Revenue', parent_code: '4000' },
      { name: 'Activity Fees', code: '4005', type: 'Revenue', parent_code: '4000' },
      { name: 'Government Grants', code: '4100', type: 'Revenue', parent_code: '4000' },
      { name: 'Donations', code: '4200', type: 'Revenue', parent_code: '4000' },
      { name: 'Other Income', code: '4900', type: 'Revenue', parent_code: '4000' },
      
      // Expenses
      { name: 'Salaries & Wages', code: '5001', type: 'Expense', parent_code: '5000' },
      { name: 'Teaching Staff Salaries', code: '5002', type: 'Expense', parent_code: '5001' },
      { name: 'Non-Teaching Staff Salaries', code: '5003', type: 'Expense', parent_code: '5001' },
      { name: 'Utilities', code: '5100', type: 'Expense', parent_code: '5000' },
      { name: 'Electricity', code: '5101', type: 'Expense', parent_code: '5100' },
      { name: 'Water', code: '5102', type: 'Expense', parent_code: '5100' },
      { name: 'Internet', code: '5103', type: 'Expense', parent_code: '5100' },
      { name: 'Maintenance', code: '5200', type: 'Expense', parent_code: '5000' },
      { name: 'Office Supplies', code: '5300', type: 'Expense', parent_code: '5000' },
      { name: 'Teaching Materials', code: '5400', type: 'Expense', parent_code: '5000' },
      { name: 'Transport Expenses', code: '5500', type: 'Expense', parent_code: '5000' },
      { name: 'Insurance', code: '5600', type: 'Expense', parent_code: '5000' },
      { name: 'Professional Fees', code: '5700', type: 'Expense', parent_code: '5000' },
      { name: 'Depreciation', code: '5800', type: 'Expense', parent_code: '5000' },
      
      // Additional Asset Accounts
      { name: 'Petty Cash', code: '1003', type: 'Asset', parent_code: '1000' },
      { name: 'Short-term Investments', code: '1004', type: 'Asset', parent_code: '1000' },
      { name: 'Library Books', code: '1404', type: 'Asset', parent_code: '1400' },
      { name: 'Computer Equipment', code: '1405', type: 'Asset', parent_code: '1400' },
      { name: 'Laboratory Equipment', code: '1406', type: 'Asset', parent_code: '1400' },
      
      // Additional Liability Accounts
      { name: 'Staff Advances', code: '2004', type: 'Liability', parent_code: '2000' },
      { name: 'Pension Contributions', code: '2301', type: 'Liability', parent_code: '2300' },
      { name: 'NHIF Contributions', code: '2302', type: 'Liability', parent_code: '2300' },
      
      // Additional Revenue Accounts
      { name: 'Library Fines', code: '4006', type: 'Revenue', parent_code: '4000' },
      { name: 'Uniform Sales', code: '4007', type: 'Revenue', parent_code: '4000' },
      { name: 'Cafeteria Sales', code: '4008', type: 'Revenue', parent_code: '4000' },
      
      // Additional Expense Accounts
      { name: 'Stationery', code: '5301', type: 'Expense', parent_code: '5300' },
      { name: 'Printing & Photocopying', code: '5302', type: 'Expense', parent_code: '5300' },
      { name: 'Fuel & Lubricants', code: '5501', type: 'Expense', parent_code: '5500' },
      { name: 'Vehicle Maintenance', code: '5502', type: 'Expense', parent_code: '5500' }
    ];
    
    console.log(`Generating ${accounts.length} chart of accounts entries...`);
    
    // First create account types
    for (const accountType of accountTypes) {
      const account = {
        id: this.generateId('account', accountType.code),
        account_code: accountType.code,
        account_name: accountType.type,
        account_type: accountType.type,
        parent_account_code: null,
        description: accountType.description,
        is_active: true,
        is_header: true,
        balance: 0,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'chart_of_accounts',
        data: account
      });
    }
    
    // Then create detailed accounts
    for (let i = 0; i < accounts.length; i++) {
      const acc = accounts[i];
      
      const account = {
        id: this.generateId('account', acc.code),
        account_code: acc.code,
        account_name: acc.name,
        account_type: acc.type,
        parent_account_code: acc.parent_code,
        description: `${acc.name} account`,
        is_active: true,
        is_header: false,
        balance: this.generateAccountBalance(acc.type),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'chart_of_accounts',
        data: account
      });
      
      this.logProgress(i + 1, accounts.length, 'account');
    }
    
    return results;
  }

  private generateAccountBalance(accountType: string): number {
    switch (accountType) {
      case 'Asset':
        return this.randomFloat(10000, 500000);
      case 'Liability':
        return this.randomFloat(5000, 200000);
      case 'Equity':
        return this.randomFloat(100000, 1000000);
      case 'Revenue':
        return this.randomFloat(50000, 800000);
      case 'Expense':
        return this.randomFloat(20000, 300000);
      default:
        return 0;
    }
  }

  private async generateVoteheads(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const voteheadData = [
      { name: 'Personnel Emoluments', code: 'PE', description: 'Staff salaries and benefits', category: 'Recurrent' },
      { name: 'Operations & Maintenance', code: 'OM', description: 'Day-to-day operational expenses', category: 'Recurrent' },
      { name: 'Development Expenditure', code: 'DE', description: 'Capital development projects', category: 'Development' },
      { name: 'Utilities', code: 'UT', description: 'Electricity, water, and communication', category: 'Recurrent' },
      { name: 'Transport & Travel', code: 'TT', description: 'Transport and travel expenses', category: 'Recurrent' },
      { name: 'Training & Capacity Building', code: 'TCB', description: 'Staff training and development', category: 'Recurrent' },
      { name: 'ICT Equipment', code: 'ICT', description: 'Information technology equipment', category: 'Development' },
      { name: 'Furniture & Equipment', code: 'FE', description: 'Office furniture and equipment', category: 'Development' },
      { name: 'Building & Construction', code: 'BC', description: 'Construction and renovation', category: 'Development' },
      { name: 'Library Resources', code: 'LR', description: 'Books and library materials', category: 'Recurrent' },
      { name: 'Laboratory Equipment', code: 'LE', description: 'Science laboratory equipment', category: 'Development' },
      { name: 'Sports & Recreation', code: 'SR', description: 'Sports equipment and activities', category: 'Recurrent' },
      { name: 'Medical Supplies', code: 'MS', description: 'Health center supplies', category: 'Recurrent' },
      { name: 'Security Services', code: 'SS', description: 'Security and safety services', category: 'Recurrent' },
      { name: 'Catering Services', code: 'CS', description: 'Food and catering services', category: 'Recurrent' }
    ];
    
    console.log(`Generating ${voteheadData.length} votehead records...`);
    
    for (let i = 0; i < voteheadData.length; i++) {
      const votehead = voteheadData[i];
      
      const voteheadRecord = {
        id: this.generateId('votehead', i),
        name: votehead.name,
        code: votehead.code,
        description: votehead.description,
        category: votehead.category,
        budget_allocation: this.randomFloat(100000, 2000000),
        spent_amount: 0,
        remaining_amount: 0,
        financial_year: new Date().getFullYear().toString(),
        is_active: true,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      // Calculate spent and remaining amounts
      voteheadRecord.spent_amount = this.randomFloat(0, voteheadRecord.budget_allocation * 0.8);
      voteheadRecord.remaining_amount = voteheadRecord.budget_allocation - voteheadRecord.spent_amount;
      
      this.voteheads.push(voteheadRecord);
      
      results.push({
        table: 'voteheads',
        data: voteheadRecord
      });
      
      this.logProgress(i + 1, voteheadData.length, 'votehead');
    }
    
    return results;
  }

  private async generateSuppliers(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const supplierCategories = [
      'Office Supplies', 'ICT Equipment', 'Laboratory Supplies', 'Furniture',
      'Construction Materials', 'Food & Catering', 'Transport Services',
      'Professional Services', 'Utilities', 'Security Services',
      'Cleaning Services', 'Medical Supplies', 'Sports Equipment',
      'Books & Stationery', 'Maintenance Services'
    ];
    
    console.log(`Generating ${count} supplier records...`);
    
    for (let i = 0; i < count; i++) {
      const companyName = this.generateCompanyName();
      const category = this.randomChoice(supplierCategories);
      
      const supplier = {
        id: this.generateId('supplier', i),
        supplier_code: `SUP${(i + 1).toString().padStart(4, '0')}`,
        name: companyName,
        category,
        contact_person: `${this.generateName().first} ${this.generateName().last}`,
        phone: this.generatePhoneNumber(),
        email: this.generateEmail('info', companyName.split(' ')[0].toLowerCase()),
        address: this.generateAddress(),
        postal_address: `P.O. Box ${this.randomInt(1000, 99999)}, Nairobi`,
        kra_pin: `P${this.randomInt(100000000, 999999999)}K`,
        vat_number: `VAT${this.randomInt(100000000, 999999999)}`,
        registration_number: `C.${this.randomInt(100000, 999999)}`,
        bank_name: this.randomChoice(['KCB', 'Equity', 'Cooperative', 'NCBA', 'Absa', 'Standard Chartered']),
        bank_branch: this.randomChoice(['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret']),
        bank_account: this.randomInt(1000000000, 9999999999).toString(),
        credit_limit: this.randomFloat(50000, 1000000),
        credit_days: this.randomChoice([7, 14, 30, 45, 60]),
        payment_terms: this.randomChoice(['Net 30', 'Net 15', 'Cash on Delivery', 'Advance Payment', '2/10 Net 30']),
        discount_percentage: this.randomFloat(0, 10),
        rating: this.randomInt(1, 5),
        is_approved: this.randomBoolean(0.85),
        is_active: this.randomBoolean(0.9),
        registration_date: this.formatDate(this.randomDate(
          new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000),
          new Date()
        )),
        last_transaction_date: this.formatDate(this.randomDate(
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          new Date()
        )),
        total_transactions: this.randomInt(1, 50),
        total_amount: this.randomFloat(10000, 500000),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      this.suppliers.push(supplier);
      
      results.push({
        table: 'suppliers',
        data: supplier
      });
      
      this.logProgress(i + 1, count, 'supplier');
    }
    
    return results;
  }

  private async generateFeeTemplates(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const feeTemplateData = [
      { name: 'Form 1 Day Scholar', description: 'Fee structure for Form 1 day scholars', category: 'Day Scholar', form: 'Form 1' },
      { name: 'Form 1 Boarder', description: 'Fee structure for Form 1 boarders', category: 'Boarder', form: 'Form 1' },
      { name: 'Form 2 Day Scholar', description: 'Fee structure for Form 2 day scholars', category: 'Day Scholar', form: 'Form 2' },
      { name: 'Form 2 Boarder', description: 'Fee structure for Form 2 boarders', category: 'Boarder', form: 'Form 2' },
      { name: 'Form 3 Day Scholar', description: 'Fee structure for Form 3 day scholars', category: 'Day Scholar', form: 'Form 3' },
      { name: 'Form 3 Boarder', description: 'Fee structure for Form 3 boarders', category: 'Boarder', form: 'Form 3' },
      { name: 'Form 4 Day Scholar', description: 'Fee structure for Form 4 day scholars', category: 'Day Scholar', form: 'Form 4' },
      { name: 'Form 4 Boarder', description: 'Fee structure for Form 4 boarders', category: 'Boarder', form: 'Form 4' },
      { name: 'New Student Registration', description: 'One-time registration fees for new students', category: 'Registration', form: 'All' },
      { name: 'Examination Fees', description: 'Fees for internal and external examinations', category: 'Examination', form: 'All' },
      { name: 'Activity Fees', description: 'Fees for co-curricular activities', category: 'Activities', form: 'All' },
      { name: 'Transport Fees', description: 'Transport service fees', category: 'Transport', form: 'All' },
      { name: 'Medical Fees', description: 'Health center and medical services', category: 'Medical', form: 'All' },
      { name: 'Library Fees', description: 'Library services and resources', category: 'Library', form: 'All' },
      { name: 'ICT Fees', description: 'Computer lab and ICT services', category: 'ICT', form: 'All' }
    ];
    
    console.log(`Generating ${feeTemplateData.length} fee template records...`);
    
    for (let i = 0; i < feeTemplateData.length; i++) {
      const template = feeTemplateData[i];
      
      const feeTemplate = {
        id: this.generateId('feetemplate', i),
        name: template.name,
        description: template.description,
        category: template.category,
        applicable_form: template.form,
        academic_year: new Date().getFullYear().toString(),
        term: this.randomChoice(['All', 'Term 1', 'Term 2', 'Term 3']),
        total_amount: 0, // Will be calculated from items
        is_mandatory: template.category === 'Registration' || template.form !== 'All',
        due_date: this.formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        late_fee_percentage: this.randomFloat(5, 15),
        is_active: true,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      this.feeTemplates.push(feeTemplate);
      
      results.push({
        table: 'fee_templates',
        data: feeTemplate
      });
      
      this.logProgress(i + 1, feeTemplateData.length, 'fee template');
    }
    
    return results;
  }

  private async generateFeeTemplateItems(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const feeItems = [
      { name: 'Tuition Fee', description: 'Basic tuition charges', amount_range: [15000, 25000] },
      { name: 'Boarding Fee', description: 'Accommodation charges', amount_range: [20000, 35000] },
      { name: 'Meals Fee', description: 'Food and catering charges', amount_range: [8000, 15000] },
      { name: 'Transport Fee', description: 'School transport charges', amount_range: [3000, 8000] },
      { name: 'Activity Fee', description: 'Co-curricular activities', amount_range: [2000, 5000] },
      { name: 'Examination Fee', description: 'Internal and external exams', amount_range: [1500, 4000] },
      { name: 'Library Fee', description: 'Library services', amount_range: [500, 1500] },
      { name: 'ICT Fee', description: 'Computer lab usage', amount_range: [1000, 3000] },
      { name: 'Medical Fee', description: 'Health center services', amount_range: [1000, 2500] },
      { name: 'Registration Fee', description: 'One-time registration', amount_range: [5000, 10000] },
      { name: 'Uniform Fee', description: 'School uniform charges', amount_range: [3000, 6000] },
      { name: 'Books Fee', description: 'Textbooks and materials', amount_range: [4000, 8000] },
      { name: 'Laboratory Fee', description: 'Science lab usage', amount_range: [2000, 4000] },
      { name: 'Sports Fee', description: 'Sports equipment and activities', amount_range: [1000, 3000] },
      { name: 'Insurance Fee', description: 'Student insurance cover', amount_range: [500, 1500] }
    ];
    
    console.log(`Generating ${count} fee template item records...`);
    
    for (let i = 0; i < count; i++) {
      const template = this.randomChoice(this.feeTemplates);
      const item = this.randomChoice(feeItems);
      
      const feeTemplateItem = {
        id: this.generateId('feetemplateitem', i),
        fee_template_id: template.id,
        name: item.name,
        description: item.description,
        amount: this.randomFloat(item.amount_range[0], item.amount_range[1]),
        is_mandatory: this.randomBoolean(0.7),
        order_index: i + 1,
        account_code: this.generateAccountCode(item.name),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'fee_template_items',
        data: feeTemplateItem
      });
      
      this.logProgress(i + 1, count, 'fee template item');
    }
    
    return results;
  }

  private generateAccountCode(itemName: string): string {
    const accountMap: { [key: string]: string } = {
      'Tuition Fee': '4001',
      'Boarding Fee': '4002',
      'Transport Fee': '4003',
      'Examination Fee': '4004',
      'Activity Fee': '4005',
      'Library Fee': '4006',
      'ICT Fee': '4007',
      'Medical Fee': '4008',
      'Registration Fee': '4009',
      'Uniform Fee': '4010',
      'Books Fee': '4011',
      'Laboratory Fee': '4012',
      'Sports Fee': '4013',
      'Insurance Fee': '4014',
      'Meals Fee': '4015'
    };
    
    return accountMap[itemName] || '4900';
  }

  private async generateStudentWalletTransactions(count: number): Promise<any[]> {
    const results: any[] = [];
    
    // Generate mock student IDs
    for (let i = 0; i < 100; i++) {
      this.students.push({ id: this.generateId('student', i) });
    }
    
    const transactionTypes = ['Payment', 'Refund', 'Adjustment', 'Transfer', 'Fee Charge'];
    const paymentMethods = ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque', 'Card'];
    
    console.log(`Generating ${count} student wallet transaction records...`);
    
    for (let i = 0; i < count; i++) {
      const student = this.randomChoice(this.students);
      const transactionType = this.randomChoice(transactionTypes);
      const isCredit = transactionType === 'Payment' || transactionType === 'Refund';
      
      const transaction = {
        id: this.generateId('transaction', i),
        student_id: student.id,
        transaction_type: transactionType,
        amount: this.randomFloat(500, 50000),
        is_credit: isCredit,
        description: this.generateTransactionDescription(transactionType),
        payment_method: this.randomChoice(paymentMethods),
        reference_number: this.generateReferenceNumber(),
        transaction_date: this.formatDate(this.randomDate(
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          new Date()
        )),
        processed_by: `${this.generateName().first} ${this.generateName().last}`,
        status: this.randomChoice(['Completed', 'Pending', 'Failed', 'Cancelled']),
        balance_before: this.randomFloat(0, 100000),
        balance_after: 0, // Will be calculated
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      // Calculate balance after transaction
      transaction.balance_after = isCredit 
        ? transaction.balance_before + transaction.amount
        : transaction.balance_before - transaction.amount;
      
      results.push({
        table: 'student_wallet_transactions',
        data: transaction
      });
      
      this.logProgress(i + 1, count, 'wallet transaction');
    }
    
    return results;
  }

  private generateTransactionDescription(type: string): string {
    const descriptions: { [key: string]: string[] } = {
      'Payment': ['School fees payment', 'Boarding fees payment', 'Transport fees payment', 'Examination fees payment'],
      'Refund': ['Overpayment refund', 'Cancelled service refund', 'Deposit refund'],
      'Adjustment': ['Fee adjustment', 'Discount application', 'Correction entry'],
      'Transfer': ['Account transfer', 'Balance transfer'],
      'Fee Charge': ['Tuition fee charge', 'Boarding fee charge', 'Late payment charge']
    };
    
    const options = descriptions[type] || ['General transaction'];
    return this.randomChoice(options);
  }

  private generateReferenceNumber(): string {
    const prefix = this.randomChoice(['PAY', 'REF', 'TXN', 'ADJ']);
    const number = this.randomInt(100000, 999999);
    return `${prefix}${number}`;
  }

  private async generateProcurementRecords(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const procurementTypes = ['Goods', 'Services', 'Works', 'Consultancy'];
    const procurementMethods = ['Open Tender', 'Restricted Tender', 'Direct Procurement', 'Request for Quotation'];
    const statuses = ['Planning', 'Tendering', 'Evaluation', 'Award', 'Contract', 'Delivery', 'Completed', 'Cancelled'];
    
    console.log(`Generating ${count} procurement records...`);
    
    for (let i = 0; i < count; i++) {
      const supplier = this.randomChoice(this.suppliers);
      const votehead = this.randomChoice(this.voteheads);
      
      const procurement = {
        id: this.generateId('procurement', i),
        procurement_number: `PROC/${new Date().getFullYear()}/${(i + 1).toString().padStart(4, '0')}`,
        title: this.generateProcurementTitle(),
        description: this.generateText(10, 20),
        procurement_type: this.randomChoice(procurementTypes),
        procurement_method: this.randomChoice(procurementMethods),
        estimated_value: this.randomFloat(50000, 2000000),
        actual_value: 0, // Will be set based on status
        votehead_id: votehead.id,
        supplier_id: this.randomBoolean(0.7) ? supplier.id : null,
        status: this.randomChoice(statuses),
        requisition_date: this.formatDate(this.randomDate(
          new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          new Date()
        )),
        tender_opening_date: null,
        award_date: null,
        contract_start_date: null,
        contract_end_date: null,
        delivery_date: null,
        requested_by: `${this.generateName().first} ${this.generateName().last}`,
        approved_by: this.randomBoolean(0.8) ? `${this.generateName().first} ${this.generateName().last}` : null,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      // Set dates and values based on status
      this.setProcurementDatesAndValues(procurement);
      
      results.push({
        table: 'procurement_records',
        data: procurement
      });
      
      this.logProgress(i + 1, count, 'procurement record');
    }
    
    return results;
  }

  private generateProcurementTitle(): string {
    const titles = [
      'Supply of Office Stationery',
      'ICT Equipment Procurement',
      'Laboratory Equipment Supply',
      'Furniture and Fixtures',
      'Building Maintenance Services',
      'Catering Services Contract',
      'Transport Services',
      'Security Services Contract',
      'Cleaning Services',
      'Library Books Supply',
      'Sports Equipment Purchase',
      'Medical Supplies',
      'Electrical Installation',
      'Plumbing Services',
      'Landscaping Services'
    ];
    
    return this.randomChoice(titles);
  }

  private setProcurementDatesAndValues(procurement: any): void {
    const reqDate = new Date(procurement.requisition_date);
    
    switch (procurement.status) {
      case 'Tendering':
        procurement.tender_opening_date = this.formatDate(new Date(reqDate.getTime() + 14 * 24 * 60 * 60 * 1000));
        break;
      case 'Evaluation':
      case 'Award':
        procurement.tender_opening_date = this.formatDate(new Date(reqDate.getTime() + 14 * 24 * 60 * 60 * 1000));
        if (procurement.status === 'Award') {
          procurement.award_date = this.formatDate(new Date(reqDate.getTime() + 30 * 24 * 60 * 60 * 1000));
        }
        break;
      case 'Contract':
      case 'Delivery':
      case 'Completed':
        procurement.tender_opening_date = this.formatDate(new Date(reqDate.getTime() + 14 * 24 * 60 * 60 * 1000));
        procurement.award_date = this.formatDate(new Date(reqDate.getTime() + 30 * 24 * 60 * 60 * 1000));
        procurement.contract_start_date = this.formatDate(new Date(reqDate.getTime() + 45 * 24 * 60 * 60 * 1000));
        procurement.contract_end_date = this.formatDate(new Date(reqDate.getTime() + 120 * 24 * 60 * 60 * 1000));
        
        if (procurement.status === 'Delivery' || procurement.status === 'Completed') {
          procurement.delivery_date = this.formatDate(new Date(reqDate.getTime() + 90 * 24 * 60 * 60 * 1000));
          procurement.actual_value = procurement.estimated_value * this.randomFloat(0.8, 1.2);
        }
        break;
    }
  }

  private async generatePaymentVouchers(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const voucherTypes = ['Payment', 'Advance', 'Refund', 'Petty Cash'];
    const paymentMethods = ['Cheque', 'Bank Transfer', 'Cash', 'Mobile Money'];
    const statuses = ['Draft', 'Pending Approval', 'Approved', 'Paid', 'Cancelled'];
    
    console.log(`Generating ${count} payment voucher records...`);
    
    for (let i = 0; i < count; i++) {
      const supplier = this.randomChoice(this.suppliers);
      const votehead = this.randomChoice(this.voteheads);
      
      const voucher = {
        id: this.generateId('voucher', i),
        voucher_number: `PV/${new Date().getFullYear()}/${(i + 1).toString().padStart(4, '0')}`,
        voucher_type: this.randomChoice(voucherTypes),
        payee_name: supplier.name,
        payee_id: supplier.id,
        amount: this.randomFloat(5000, 500000),
        description: this.generateVoucherDescription(),
        votehead_id: votehead.id,
        account_code: this.randomChoice(['5001', '5100', '5200', '5300', '5400']),
        payment_method: this.randomChoice(paymentMethods),
        cheque_number: this.randomChoice(paymentMethods) === 'Cheque' ? `CHQ${this.randomInt(100000, 999999)}` : null,
        bank_reference: this.randomChoice(paymentMethods) === 'Bank Transfer' ? `TXN${this.randomInt(100000000, 999999999)}` : null,
        status: this.randomChoice(statuses),
        voucher_date: this.formatDate(this.randomDate(
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          new Date()
        )),
        payment_date: null,
        prepared_by: `${this.generateName().first} ${this.generateName().last}`,
        approved_by: this.randomBoolean(0.8) ? `${this.generateName().first} ${this.generateName().last}` : null,
        paid_by: null,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      // Set payment date if status is 'Paid'
      if (voucher.status === 'Paid') {
        const voucherDate = new Date(voucher.voucher_date);
        voucher.payment_date = this.formatDate(new Date(voucherDate.getTime() + this.randomInt(1, 30) * 24 * 60 * 60 * 1000));
        voucher.paid_by = `${this.generateName().first} ${this.generateName().last}`;
      }
      
      results.push({
        table: 'payment_vouchers',
        data: voucher
      });
      
      this.logProgress(i + 1, count, 'payment voucher');
    }
    
    return results;
  }

  private generateVoucherDescription(): string {
    const descriptions = [
      'Payment for office supplies',
      'ICT equipment purchase',
      'Maintenance services',
      'Utility bills payment',
      'Professional services',
      'Transport expenses',
      'Catering services',
      'Security services',
      'Cleaning services',
      'Laboratory supplies',
      'Library resources',
      'Sports equipment',
      'Medical supplies',
      'Staff training expenses',
      'Building repairs'
    ];
    
    return this.randomChoice(descriptions);
  }
}